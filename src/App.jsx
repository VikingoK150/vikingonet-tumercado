import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useInventory } from './hooks/useInventory';
import { ProductTile } from './components/ProductTile';
import { BottomToolbar } from './components/BottomToolbar';
import { PendingApprovalModal } from './components/Modals/PendingApprovalModal';
import { ProductEditModal } from './components/Modals/ProductEditModal';
import { AIQueryModal } from './components/Modals/AIQueryModal';
import { ShareModal } from './components/Modals/ShareModal';
import { LastPurchaseModal } from './components/Modals/LastPurchaseModal';
import { CheckoutSaldoModal } from './components/Modals/CheckoutSaldoModal';
import { ItemPriceTapModal } from './components/Modals/ItemPriceTapModal';
import { ShoppingBasket, Bell, LogIn, LogOut, Loader2, Share2, ShoppingCart, ClipboardList, Search, X } from 'lucide-react';
import { useHaptic } from './hooks/useHaptic';
import { normalizeText } from './utils/stringUtils';
import { fetchExchangeRates, fetchRatesForDate } from './services/exchangeService';

const PROCESS_INPUT_URL = import.meta.env.VITE_SALDO_FUNCTIONS_URL || '/.netlify/functions/process-input';

export default function App() {
  const { triggerHaptic } = useHaptic();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Estados de interfaz y modales
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Estado del Reporte de Última Compra
  const [showLastPurchaseModal, setShowLastPurchaseModal] = useState(false);
  const [lastPurchaseData, setLastPurchaseData] = useState(null);

  // Estado del Modal de Cierre de Compra & Precios (Integración con SaldoVikingo)
  const [showCheckoutSaldoModal, setShowCheckoutSaldoModal] = useState(false);
  const [checkoutPurchasedList, setCheckoutPurchasedList] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Estados del Modo Supermercado Incremental (Contador de Carrito por Tile y Precios al Tap)
  const [isShoppingMode, setIsShoppingMode] = useState(false);
  const [shoppingQtyMap, setShoppingQtyMap] = useState({});
  const [itemPriceMap, setItemPriceMap] = useState({}); // { [itemId]: { amount, currency, priceMode, rawAmount } }
  const [activeTapItem, setActiveTapItem] = useState(null);
  const [shoppingFilterMode, setShoppingFilterMode] = useState('all'); // 'all' | 'alerts'

  // Cargar datos de la última compra almacenada en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tu_mercado_last_purchase');
      if (saved) {
        setLastPurchaseData(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Error cargando última compra:", e);
    }
  }, []);

  // Verificar sesión actual de Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id;
  const {
    activeItems,
    pendingItems,
    loading: invLoading,
    updateQuantity,
    linkPendingItem,
    approvePendingAsNewTile,
    discardPendingItem,
    addItem,
    editItem,
    deleteItem,
    refresh
  } = useInventory(userId);

  // Login simple para sesión Supabase
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message || 'Error iniciando sesión');
    }
  };

  // Cerrar sesión de Supabase
  const handleLogout = async () => {
    triggerHaptic(40);
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // Calcular items con bajo stock / por comprar
  const lowStockCount = useMemo(() => {
    return activeItems.filter(i => parseFloat(i.quantity || 0) <= parseFloat(i.min_threshold || 1)).length;
  }, [activeItems]);

  // Estado de Búsqueda Rápida Instantánea (Filtro por texto)
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar tiles activos según categoría, modo supermercado y búsqueda rápida
  const filteredItems = useMemo(() => {
    let list = activeItems;

    if (isShoppingMode) {
      if (shoppingFilterMode === 'alerts') {
        list = activeItems.filter(i => 
          parseFloat(i.quantity || 0) <= parseFloat(i.min_threshold || 1) || (shoppingQtyMap[i.id] || 0) > 0
        );
      }
      // Si shoppingFilterMode === 'all', muestra TODOS los productos en Modo Compra
    } else if (activeCategory === 'Por Comprar') {
      list = activeItems.filter(i => parseFloat(i.quantity || 0) <= parseFloat(i.min_threshold || 1));
    } else if (activeCategory !== 'Todos') {
      list = activeItems.filter(i => (i.category || 'General') === activeCategory);
    }

    // Filtrar instantáneamente por término de búsqueda si el usuario escribe
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      list = list.filter(item => {
        const nameNorm = normalizeText(item.name);
        const catNorm = normalizeText(item.category);
        const aliasNorm = (item.aliases || []).map(normalizeText).join(' ');
        return nameNorm.includes(q) || catNorm.includes(q) || aliasNorm.includes(q);
      });
    }

    return list;
  }, [activeItems, activeCategory, isShoppingMode, shoppingQtyMap, searchQuery]);

  // Lógica del Modo Supermercado Incremental: Ajustar cantidad agregada en el carrito por tile
  const handleIncrementCartQty = (itemId, delta) => {
    triggerHaptic(30);
    setShoppingQtyMap(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      // Redondear decimales para kg/L (hasta 3 decimales para gramos como 0.650)
      const rounded = Math.round(next * 1000) / 1000;
      return {
        ...prev,
        [itemId]: rounded
      };
    });
  };

  // Lógica de Inicio de Cierre de Mercado: Abre el modal de precios e integración con SaldoVikingo
  const handleFinishShopping = () => {
    const purchasedItemIds = Object.keys(shoppingQtyMap).filter(id => shoppingQtyMap[id] > 0);
    if (purchasedItemIds.length === 0) {
      setIsShoppingMode(false);
      return;
    }

    triggerHaptic(50);
    const purchasedList = [];

    for (const id of purchasedItemIds) {
      const item = activeItems.find(i => i.id === id);
      const addedQty = shoppingQtyMap[id];
      const pInfo = itemPriceMap[id];
      if (item && addedQty > 0) {
        purchasedList.push({
          id: item.id,
          name: item.name,
          emoji: item.emoji || '🛒',
          unit: item.unit || 'unid',
          category: item.category || 'General',
          addedQty: addedQty,
          amount: pInfo?.amount !== undefined ? pInfo.amount : '',
          currency: pInfo?.currency || 'VES'
        });
      }
    }

    setCheckoutPurchasedList(purchasedList);
    setShowCheckoutSaldoModal(true);
  };

  // Save price and updated quantity from ItemPriceTapModal
  const handleSaveTapPrice = (id, { amount, currency, priceMode, addedQty }) => {
    setItemPriceMap(prev => ({
      ...prev,
      [id]: { amount, currency, priceMode }
    }));
    if (addedQty !== undefined && addedQty !== null && parseFloat(addedQty) > 0) {
      const roundedQty = Math.round(parseFloat(addedQty) * 1000) / 1000;
      setShoppingQtyMap(prev => ({
        ...prev,
        [id]: roundedQty
      }));
    }
  };

  // Confirmación Final de Cierre de Mercado (TuMercado -> SaldoVikingo)
  const handleConfirmCheckout = async ({ items, registerInSaldo, commerceConcept, purchaseDate, rates: passedRates, multiCurrencySummary }) => {
    setCheckoutLoading(true);
    try {
      // 1. Incrementar stock en TuMercado
      const purchasedList = [];
      for (const item of items) {
        await updateQuantity(item.id, item.addedQty);
        purchasedList.push({
          id: item.id,
          name: item.name,
          emoji: item.emoji || '🛒',
          unit: item.unit || 'unid',
          category: item.category || 'General',
          addedQty: item.addedQty,
          amount: item.amount,
          currency: item.currency
        });
      }

      // 2. Registrar transacción desglosada en SaldoVikingo si la opción está activada
      if (registerInSaldo && user?.id) {
        let bcvRate = passedRates?.bcv || 60.0;
        let usdtRate = passedRates?.usdt || 65.0;

        if (!passedRates) {
          try {
            const rateRes = await fetch('https://ve.dolarapi.com/v1/dolares');
            const rateData = await rateRes.json();
            const bcvObj = rateData.find(d => d.fuente === 'oficial' || d.codigo === 'oficial');
            const p2pObj = rateData.find(d => d.fuente === 'paralelo' || d.codigo === 'paralelo');
            if (bcvObj && bcvObj.promedio) bcvRate = bcvObj.promedio;
            if (p2pObj && p2pObj.promedio) usdtRate = p2pObj.promedio;
          } catch(e) {
            console.warn("No se pudieron obtener las tasas del día:", e);
          }
        }

        const conceptName = (commerceConcept || '').trim() || 'TuMercado';

        const breakdownItems = items.map(it => ({
          description: `${it.addedQty} ${it.unit} ${it.name}`.trim(),
          amount: parseFloat(it.amount) || 0,
          currency: it.currency || 'VES'
        }));

        // Calcular total general equivalente en Bolívares usando las tasas exactas
        const mainTotalOriginal = multiCurrencySummary?.ves !== undefined
          ? parseFloat(multiCurrencySummary.ves.toFixed(2))
          : breakdownItems.reduce((acc, it) => acc + (it.currency === 'VES' ? it.amount : it.amount * bcvRate), 0);

        const finalDesc = JSON.stringify({
          isBreakdown: true,
          mainDescription: conceptName,
          items: breakdownItems
        });

        const amountUsdBcv = parseFloat((mainTotalOriginal / bcvRate).toFixed(2));
        const amountUsdP2p = parseFloat((mainTotalOriginal / usdtRate).toFixed(2));

        let registeredViaE2EE = false;
        try {
          const resp = await fetch(PROCESS_INPUT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'register_direct',
              userId: user.id,
              rates: { bcv: bcvRate, usdt: usdtRate },
              transaction: {
                date: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
                type: 'expense',
                mainDescription: conceptName,
                description: finalDesc,
                category: 'Alimentos/Automercado',
                amount_original: mainTotalOriginal,
                currency_original: 'VES',
                rate_preference: 'auto',
                breakdown: breakdownItems
              }
            })
          });
          if (resp.ok) {
            const resData = await resp.json();
            if (resData && resData.success) {
              registeredViaE2EE = true;
              console.log("✅ Compra de TuMercado registrada exitosamente vía Netlify E2EE en SaldoVikingo");
            }
          }
        } catch (e2eErr) {
          console.warn("No se pudo conectar con el endpoint E2EE de SaldoVikingo, realizando inserción directa en Supabase:", e2eErr);
        }

        if (!registeredViaE2EE) {
          const { error: txError } = await supabase
            .from('transactions')
            .insert([{
              user_id: user.id,
              date: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
              type: 'expense',
              description: finalDesc,
              category: 'Alimentos/Automercado',
              amount_original: mainTotalOriginal,
              currency_original: 'VES',
              rate_bcv: bcvRate,
              rate_p2p: usdtRate,
              amount_usd_bcv: amountUsdBcv,
              amount_usd_p2p: amountUsdP2p,
              rate_preference: 'auto'
            }]);

          if (txError) {
            console.error("Error registrando gasto en SaldoVikingo:", txError);
          }
        }
      }

      // 3. Guardar en localStorage y mostrar modal de última compra
      const newPurchaseData = {
        date: purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString(),
        items: purchasedList
      };
      try {
        localStorage.setItem('tu_mercado_last_purchase', JSON.stringify(newPurchaseData));
      } catch (e) {
        console.warn("Error guardando compra en localStorage:", e);
      }
      setLastPurchaseData(newPurchaseData);

      setShoppingQtyMap({});
      setItemPriceMap({});
      setIsShoppingMode(false);
      setShowCheckoutSaldoModal(false);
      setShowLastPurchaseModal(true);
    } catch (err) {
      console.error("Error al confirmar el mercado:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Manejar creación/edición de tiles
  const handleSaveItem = async (formData) => {
    if (formData.id) {
      await editItem(formData.id, formData);
    } else {
      await addItem(formData);
    }
  };

  // Procesar acciones ejecutables del Asistente IA sobre Supabase
  const handleAIResult = async (actions) => {
    if (!actions || !Array.isArray(actions)) return;

    for (const act of actions) {
      try {
        if (act.type === 'update_threshold') {
          const newThreshold = parseFloat(act.min_threshold !== undefined ? act.min_threshold : 0);
          if (act.target_all) {
            for (const item of activeItems) {
              await editItem(item.id, { min_threshold: newThreshold });
            }
          } else if (act.target_id) {
            await editItem(act.target_id, { min_threshold: newThreshold });
          } else if (act.target_name) {
            const item = activeItems.find(i => (i.name || '').toLowerCase().trim() === act.target_name.toLowerCase().trim());
            if (item) await editItem(item.id, { min_threshold: newThreshold });
          }
        } 
        else if (act.type === 'create' || act.type === 'add') {
          await addItem({
            name: act.name || 'Producto',
            emoji: act.emoji || '🛒',
            category: act.category || 'Alimentos',
            quantity: act.quantity !== undefined ? parseFloat(act.quantity) : 1,
            unit: act.unit || 'unid',
            min_threshold: act.min_threshold !== undefined ? parseFloat(act.min_threshold) : 1
          });
        }
        else if (act.type === 'update_stock') {
          let targetId = act.target_id;
          if (!targetId && act.target_name) {
            const item = activeItems.find(i => (i.name || '').toLowerCase().trim() === act.target_name.toLowerCase().trim());
            if (item) targetId = item.id;
          }
          if (targetId) {
            const item = activeItems.find(i => i.id === targetId);
            if (item) {
              const qty = parseFloat(act.quantity || 0);
              const newQty = act.mode === 'set' ? qty : (parseFloat(item.quantity || 0) + qty);
              await editItem(targetId, { quantity: Math.max(0, newQty) });
            }
          }
        }
        else if (act.type === 'update_item') {
          if (act.target_all && act.fields) {
            for (const item of activeItems) {
              await editItem(item.id, act.fields);
            }
          } else if (act.target_id && act.fields) {
            await editItem(act.target_id, act.fields);
          } else if (act.target_name && act.fields) {
            const item = activeItems.find(i => (i.name || '').toLowerCase().trim() === act.target_name.toLowerCase().trim());
            if (item) await editItem(item.id, act.fields);
          }
        }
        else if (act.type === 'register_saldo_transaction') {
          let targetUserId = user?.id;
          if (!targetUserId) {
            try {
              const { data: authData } = await supabase.auth.getUser();
              targetUserId = authData?.user?.id;
            } catch(e) {}
          }
          if (!targetUserId) {
            try {
              const { data: sample } = await supabase.from('market_inventory').select('user_id').limit(1);
              if (sample && sample[0]?.user_id) {
                targetUserId = sample[0].user_id;
              }
            } catch(e) {}
          }

          let bcvRate = 60.0;
          let usdtRate = 65.0;
          try {
            const fetched = await fetchRatesForDate(act.date || new Date().toISOString().substring(0, 10));
            if (fetched) {
              bcvRate = fetched.bcv || 60.0;
              usdtRate = fetched.usdt || 65.0;
            }
          } catch(e) {
            console.warn("Error buscando tasas para transacción de IA:", e);
          }

          const breakdownItems = (act.breakdown || []).map(it => ({
            description: (it.description || it.name || '').trim(),
            amount: parseFloat(it.amount || 0),
            currency: act.currency_original || 'VES'
          }));

          let conceptName = (act.mainDescription || '').trim();
          if (!conceptName || conceptName.toLowerCase() === 'mercado') {
            conceptName = 'TuMercado';
          } else if (!conceptName.toLowerCase().startsWith('tumercado')) {
            conceptName = `TuMercado / ${conceptName}`;
          }

          const finalDesc = JSON.stringify({
            isBreakdown: true,
            mainDescription: conceptName,
            items: breakdownItems
          });

          const amountUsdBcv = parseFloat((mainTotal / bcvRate).toFixed(2));
          const amountUsdP2p = parseFloat((mainTotal / usdtRate).toFixed(2));

          if (targetUserId) {
            let insertedOk = false;
            try {
              // Intentar registrar a través de la función Netlify E2EE-aware de SaldoVikingo
              const resp = await fetch(PROCESS_INPUT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'register_direct',
                  userId: targetUserId,
                  transaction: {
                    date: act.date ? new Date(act.date).toISOString() : new Date().toISOString(),
                    type: 'expense',
                    mainDescription: conceptName,
                    description: finalDesc,
                    category: act.category || 'Alimentos/Automercado',
                    amount_original: mainTotal,
                    currency_original: act.currency_original || 'VES',
                    rate_preference: 'auto',
                    breakdown: breakdownItems
                  }
                })
              });
              if (resp.ok) {
                const resData = await resp.json();
                if (resData.success) {
                  insertedOk = true;
                  console.log("✅ Transacción de IA registrada exitosamente vía Netlify E2EE en SaldoVikingo:", targetUserId);
                }
              }
            } catch(err) {
              console.warn("No se pudo conectar con el endpoint E2EE de Netlify, usando inserción directa Supabase:", err);
            }

            if (!insertedOk) {
              const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                  user_id: targetUserId,
                  date: act.date ? new Date(act.date).toISOString() : new Date().toISOString(),
                  type: 'expense',
                  description: finalDesc,
                  category: act.category || 'Alimentos/Automercado',
                  amount_original: mainTotal.toString(),
                  currency_original: act.currency_original || 'VES',
                  rate_bcv: bcvRate,
                  rate_p2p: usdtRate,
                  amount_usd_bcv: amountUsdBcv.toString(),
                  amount_usd_p2p: amountUsdP2p.toString(),
                  rate_preference: 'auto'
                }]);

              if (txError) {
                console.error("Error guardando movimiento de IA en SaldoVikingo:", txError);
              } else {
                console.log("✅ Transacción de IA registrada exitosamente en SaldoVikingo (fallback):", targetUserId);
              }
            }
          } else {
            console.warn("⚠️ No se encontró targetUserId para guardar la transacción en SaldoVikingo");
          }

          // Guardar reporte de última compra en localStorage y estado
          const newPurchaseData = {
            date: act.date ? new Date(act.date).toISOString() : new Date().toISOString(),
            items: breakdownItems.map((it, idx) => ({
              id: `ai_${idx}`,
              name: it.description,
              emoji: '🛒',
              unit: 'unid',
              category: 'Alimentos',
              addedQty: 1,
              amount: it.amount,
              currency: act.currency_original || 'VES'
            }))
          };
          try {
            localStorage.setItem('tu_mercado_last_purchase', JSON.stringify(newPurchaseData));
          } catch (e) {
            console.warn("Error guardando última compra de IA en localStorage:", e);
          }
          setLastPurchaseData(newPurchaseData);
        }
        else if (act.type === 'delete') {
          let targetId = act.target_id;
          if (!targetId && act.target_name) {
            const item = activeItems.find(i => (i.name || '').toLowerCase().trim() === act.target_name.toLowerCase().trim());
            if (item) targetId = item.id;
          }
          if (targetId) await deleteItem(targetId);
        }
      } catch (err) {
        console.error("Error aplicando acción de IA:", err, act);
      }
    }
    await refresh();
  };

  const shoppingCheckedCount = useMemo(() => {
    return Object.values(shoppingQtyMap).filter(qty => qty > 0).length;
  }, [shoppingQtyMap]);

  if (authLoading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-terracota)' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', padding: '24px' }}>
        <div className="modal-card" style={{ boxShadow: 'none', border: '1px solid #EAE5D9' }}>
          <div className="brand-wrapper" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            <span className="brand-icon">🛒</span>
            <div>
              <h1 className="brand-title">TuMercadoVikingo</h1>
              <p className="brand-subtitle">Inventario Inteligente de Despensa</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="edit-form">
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                className="form-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {authError && (
              <p style={{ color: 'var(--color-danger)', fontSize: '12px', textAlign: 'center' }}>
                {authError}
              </p>
            )}

            <button type="submit" className="btn-modal btn-primary" style={{ marginTop: '8px' }}>
              <LogIn size={16} />
              <span>Iniciar Sesión</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header Compacto */}
      <header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '10px 12px' }}>
        <div className="brand-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="brand-icon" style={{ fontSize: '22px' }}>🛒</span>
          <div>
            <h1 className="brand-title" style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
              TuMercado<span style={{ color: '#D35400' }}>Vikingo</span>
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Botón de Última Compra (Siempre visible) */}
          <button 
            type="button"
            className="header-badge-btn" 
            onClick={() => setShowLastPurchaseModal(true)}
            style={{ 
              backgroundColor: lastPurchaseData ? '#E8F8F0' : '#F5F2EC', 
              color: lastPurchaseData ? '#27AE60' : 'var(--text-secondary)', 
              borderColor: lastPurchaseData ? 'rgba(39, 174, 96, 0.3)' : '#E5E0D5', 
              padding: '4px 8px', 
              fontSize: '11px', 
              fontWeight: '700' 
            }}
            title="Ver Reporte de Última Compra"
          >
            <ClipboardList size={13} />
            <span>Última Compra</span>
          </button>

          {/* Botón de Compartir Lista */}
          <button 
            type="button"
            className="header-badge-btn" 
            onClick={() => setShowShareModal(true)}
            style={{ backgroundColor: '#FDEEEB', color: 'var(--color-terracota)', borderColor: 'rgba(224, 86, 56, 0.3)', padding: '4px 8px', fontSize: '11px', fontWeight: '700' }}
            title="Compartir en WhatsApp o Telegram"
          >
            <Share2 size={13} />
            <span>Compartir</span>
          </button>

          {/* Badge Flotante para Productos Pendientes por Aprobar */}
          {pendingItems.length > 0 && (
            <button 
              type="button"
              className="header-badge-btn" 
              onClick={() => setShowPendingModal(true)}
              style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '700' }}
            >
              <Bell size={13} />
              <span>{pendingItems.length} por revisar</span>
            </button>
          )}

          {/* Botón de Cerrar Sesión */}
          <button 
            type="button"
            className="header-badge-btn" 
            onClick={handleLogout}
            style={{ backgroundColor: '#FDF2F2', color: '#E74C3C', borderColor: 'rgba(231, 76, 60, 0.3)', padding: '4px 8px', fontSize: '11px', fontWeight: '700' }}
            title="Cerrar Sesión"
          >
            <LogOut size={13} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Área Central Principal Zero-Scroll */}
      <main className="main-content">
        {/* Barra de Búsqueda Rápida Instantánea (Sticky) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'var(--bg-primary, #F9F8F6)', paddingTop: '4px', paddingBottom: '6px', marginBottom: '10px' }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: '#FFFFFF',
              border: searchQuery ? '1.5px solid var(--color-terracota)' : '1px solid #E5E0D5',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.15s ease'
            }}
          >
            <Search size={16} color={searchQuery ? "var(--color-terracota)" : "var(--text-secondary)"} style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder={isShoppingMode ? "Buscar en lista de compras (ej: 'cambur', 'harina')..." : "Buscar producto en tu despensa..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                width: '100%',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  border: 'none',
                  backgroundColor: '#F5F2EC',
                  color: 'var(--text-secondary)',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Limpiar búsqueda"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {invLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={24} className="spinner" style={{ color: 'var(--color-terracota)' }} />
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="tiles-grid">
            {filteredItems.map(item => (
              <ProductTile
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onEdit={(itemToEdit) => {
                  setItemToEdit(itemToEdit);
                  setShowEditModal(true);
                }}
                isShoppingMode={isShoppingMode}
                shoppingCartQty={shoppingQtyMap[item.id] || 0}
                onIncrementCartQty={handleIncrementCartQty}
                itemPriceInfo={itemPriceMap[item.id]}
                onOpenPriceTapModal={(it) => setActiveTapItem(it)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-secondary)' }}>
            <ShoppingBasket size={44} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>
              {searchQuery ? `No se encontraron productos que coincidan con "${searchQuery}"` : (isShoppingMode ? '¡No hay ítems en la lista de compras!' : 'No hay productos en esta vista.')}
            </p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              {searchQuery ? 'Prueba escribiendo otra palabra o limpia el buscador.' : (isShoppingMode ? 'Toda tu despensa está completa.' : 'Presiona + Nuevo Tile abajo para agregar tu primer producto.')}
            </p>
          </div>
        )}
      </main>

      {/* Toolbar Inferior en la Zona del Pulgar */}
      <BottomToolbar
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenAddModal={() => {
          setItemToEdit(null);
          setShowEditModal(true);
        }}
        onOpenAIModal={() => setShowAIModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenLastPurchaseModal={() => setShowLastPurchaseModal(true)}
        lowStockCount={lowStockCount}
        isShoppingMode={isShoppingMode}
        onToggleShoppingMode={() => {
          triggerHaptic(30);
          setIsShoppingMode(prev => !prev);
          if (!isShoppingMode) setActiveCategory('Por Comprar');
        }}
        shoppingCheckedCount={shoppingCheckedCount}
        onFinishShopping={handleFinishShopping}
        activeItems={activeItems}
        shoppingFilterMode={shoppingFilterMode}
        onToggleShoppingFilterMode={(newMode) => setShoppingFilterMode(newMode)}
      />

      {/* Modales en React Portals */}
      {showShareModal && (
        <ShareModal
          isOpen={true}
          onClose={() => setShowShareModal(false)}
          items={activeItems}
        />
      )}

      {showLastPurchaseModal && (
        <LastPurchaseModal
          isOpen={true}
          onClose={() => setShowLastPurchaseModal(false)}
          lastPurchaseData={lastPurchaseData}
        />
      )}

      {showPendingModal && (
        <PendingApprovalModal
          pendingItems={pendingItems}
          activeItems={activeItems}
          onLink={linkPendingItem}
          onApproveAsNew={approvePendingAsNewTile}
          onDiscard={discardPendingItem}
          onClose={() => setShowPendingModal(false)}
        />
      )}

      {showEditModal && (
        <ProductEditModal
          itemToEdit={itemToEdit}
          onSave={handleSaveItem}
          onDelete={deleteItem}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showAIModal && (
        <AIQueryModal
          activeItems={activeItems}
          onProcessAIResult={handleAIResult}
          onClose={() => setShowAIModal(false)}
        />
      )}

      {showCheckoutSaldoModal && (
        <CheckoutSaldoModal
          isOpen={true}
          onClose={() => setShowCheckoutSaldoModal(false)}
          purchasedItems={checkoutPurchasedList}
          onConfirmCheckout={handleConfirmCheckout}
          loading={checkoutLoading}
        />
      )}

      {activeTapItem && (
        <ItemPriceTapModal
          isOpen={true}
          onClose={() => setActiveTapItem(null)}
          item={activeTapItem}
          addedQty={shoppingQtyMap[activeTapItem.id] || 1}
          initialAmount={itemPriceMap[activeTapItem.id]?.amount}
          initialCurrency={itemPriceMap[activeTapItem.id]?.currency}
          initialPriceMode={itemPriceMap[activeTapItem.id]?.priceMode}
          onSavePrice={(priceData) => handleSaveTapPrice(activeTapItem.id, priceData)}
        />
      )}
    </div>
  );
}
