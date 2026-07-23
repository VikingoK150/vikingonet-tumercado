import React, { useState, useEffect, useMemo } from 'react';
import { ModalInApp } from './ModalInApp';
import { CustomSelectModal } from './CustomSelectModal';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { fetchRatesForDate } from '../../services/exchangeService';
import { DatePickerModal } from './DatePickerModal';
import { Calendar } from 'lucide-react';

export function CheckoutSaldoModal({
  isOpen,
  onClose,
  purchasedItems = [],
  onConfirmCheckout,
  loading = false
}) {
  const [registerInSaldo, setRegisterInSaldo] = useState(true);
  const [commerceConcept, setCommerceConcept] = useState('TuMercado');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [itemsState, setItemsState] = useState([]);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Modal de selección de moneda centrado y difuminado por producto
  const [activeItemForCurrencySelect, setActiveItemForCurrencySelect] = useState(null);

  // Tasas de cambio (BCV y P2P USDT)
  const [rates, setRates] = useState({ bcv: 60.0, usdt: 65.0, eur: 64.8 });
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    if (isOpen && purchasedItems.length > 0) {
      setCommerceConcept('TuMercado');
      setItemsState(
        purchasedItems.map(item => ({
          id: item.id,
          name: item.name,
          emoji: item.emoji || '🛒',
          unit: item.unit || 'unid',
          addedQty: item.addedQty || 1,
          amount: item.amount !== undefined ? item.amount : '',
          currency: item.currency || 'VES'
        }))
      );
    }
  }, [isOpen, purchasedItems]);

  // Cargar tasas exactas según la fecha seleccionada usando el motor calcado de SaldoVikingo
  useEffect(() => {
    let isMounted = true;
    const loadRates = async () => {
      setRatesLoading(true);
      try {
        const fetched = await fetchRatesForDate(purchaseDate);
        if (isMounted && fetched) {
          setRates({
            bcv: fetched.bcv || 60.0,
            usdt: fetched.usdt || 65.0,
            eur: fetched.eur || (fetched.bcv * 1.09)
          });
        }
      } catch (err) {
        console.warn("Error cargando tasas de cambio:", err);
      } finally {
        if (isMounted) setRatesLoading(false);
      }
    };

    loadRates();
    return () => { isMounted = false; };
  }, [purchaseDate]);

  const handleItemAmountChange = (id, val) => {
    setItemsState(prev =>
      prev.map(item => (item.id === id ? { ...item, amount: val } : item))
    );
  };

  const handleItemCurrencyChange = (id, newCurr) => {
    setItemsState(prev =>
      prev.map(item => (item.id === id ? { ...item, currency: newCurr } : item))
    );
  };

  // Visualizador estilo AlCambioVikingo: Calcula el total consolidado en las 4 monedas
  const multiCurrencySummary = useMemo(() => {
    let totalInVes = 0;

    itemsState.forEach(item => {
      const amt = parseFloat(item.amount) || 0;
      const curr = item.currency || 'VES';
      if (curr === 'VES') {
        totalInVes += amt;
      } else if (curr === 'USD') {
        totalInVes += amt * rates.bcv;
      } else if (curr === 'USDT') {
        totalInVes += amt * rates.usdt;
      } else if (curr === 'EUR') {
        totalInVes += amt * rates.eur;
      }
    });

    const totalVes = totalInVes;
    const totalUsdBcv = rates.bcv > 0 ? totalInVes / rates.bcv : 0;
    const totalUsdt = rates.usdt > 0 ? totalInVes / rates.usdt : 0;
    const totalEur = rates.eur > 0 ? totalInVes / rates.eur : 0;

    return {
      ves: totalVes,
      usd: totalUsdBcv,
      usdt: totalUsdt,
      eur: totalEur
    };
  }, [itemsState, rates]);

  const handleConfirm = () => {
    onConfirmCheckout({
      items: itemsState,
      registerInSaldo,
      commerceConcept: (commerceConcept || '').trim() || 'TuMercado',
      defaultCurrency: 'VES',
      purchaseDate,
      rates,
      multiCurrencySummary
    });
  };

  const currencyOptions = [
    { value: 'VES', label: '🇻🇪 Bolívares (VES)' },
    { value: 'USD', label: '💵 Dólar BCV (USD)' },
    { value: 'USDT', label: '🪙 USDT (P2P)' },
    { value: 'EUR', label: '💶 Euros (EUR)' }
  ];

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title="🛒 Cierre de Compra y Precios" maxWidth="450px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Lista de productos comprados */}
        <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
          {itemsState.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E3DA',
                borderRadius: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 0px', minWidth: 0 }}>
                <span style={{ fontSize: '18px' }}>{item.emoji}</span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#2C2C2C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#7F8C8D' }}>
                    Cantidad: {item.addedQty} {item.unit}
                  </span>
                </div>
              </div>

              {/* Campos de Precio y Botón de Moneda Centrado */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <input
                  type="number"
                  step="any"
                  placeholder="Monto"
                  value={item.amount}
                  onChange={e => handleItemAmountChange(item.id, e.target.value)}
                  style={{
                    width: '80px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: '1px solid #D1C9BF',
                    borderRadius: '8px',
                    textAlign: 'right'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setActiveItemForCurrencySelect(item)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: '800',
                    border: '1px solid #D1C9BF',
                    borderRadius: '8px',
                    backgroundColor: '#F5F2EC',
                    color: '#2C2C2C',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                  title="Cambiar moneda"
                >
                  <span>{item.currency}</span>
                  <ChevronDown size={12} color="#7F8C8D" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Visualizador 4 Tarjetas Multimoneda tipo AlCambioVikingo */}
        <div style={{ padding: '10px 12px', backgroundColor: '#F8F6F0', borderRadius: '12px', border: '1px solid #E8E3D8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#555555' }}>📊 Resumen AlCambioVikingo:</span>
            {ratesLoading && <span style={{ fontSize: '10px', color: '#7F8C8D' }}>Cargando tasas...</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E0D5', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#7F8C8D', fontWeight: '600', display: 'block' }}>🇻🇪 Bolívares (VES)</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#2C2C2C' }}>Bs. {multiCurrencySummary.ves.toFixed(2)}</span>
            </div>

            <div style={{ padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E0D5', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#7F8C8D', fontWeight: '600', display: 'block' }}>💵 Dólar BCV</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#27AE60' }}>$ {multiCurrencySummary.usd.toFixed(2)}</span>
            </div>

            <div style={{ padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E0D5', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#7F8C8D', fontWeight: '600', display: 'block' }}>🪙 USDT (P2P)</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#D35400' }}>$ {multiCurrencySummary.usdt.toFixed(2)}</span>
            </div>

            <div style={{ padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #E5E0D5', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#7F8C8D', fontWeight: '600', display: 'block' }}>💶 Euros (EUR)</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#2980B9' }}>€ {multiCurrencySummary.eur.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Fecha y Checkbox SaldoVikingo In-App */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F8F6F0', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E8E3D8' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#555555' }}>📅 Fecha de Mercado:</label>
              {/* Presets Rápidos de Fecha In-App */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().substring(0, 10);
                    setPurchaseDate(todayStr);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: purchaseDate === new Date().toISOString().substring(0, 10) ? '1.5px solid #27AE60' : '1px solid #D1C9BF',
                    backgroundColor: purchaseDate === new Date().toISOString().substring(0, 10) ? '#E8F8F0' : '#FFFFFF',
                    color: purchaseDate === new Date().toISOString().substring(0, 10) ? '#27AE60' : '#555555',
                    cursor: 'pointer'
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setPurchaseDate(yesterday.toISOString().substring(0, 10));
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1px solid #D1C9BF',
                    backgroundColor: '#FFFFFF',
                    color: '#555555',
                    cursor: 'pointer'
                  }}
                >
                  Ayer
                </button>
              </div>
            </div>

            {/* Botón Trigger In-App para el Calendario In-App */}
            <button
              type="button"
              onClick={() => setShowDatePickerModal(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '8px',
                border: '1px solid #D1C9BF',
                backgroundColor: '#FFFFFF',
                color: '#2C2C2C',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <span>{purchaseDate}</span>
              <Calendar size={15} color="#7F8C8D" />
            </button>
          </div>

          {/* Estado de Tasas de Cambio Obtenidas para la Fecha */}
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#27AE60', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E8F8F0', padding: '6px 8px', borderRadius: '8px', border: '1px solid #A9DFBF' }}>
            <span>{ratesLoading ? '🔄 Obtiendo tasas de la fecha...' : `⚡ Tasas del ${purchaseDate}:`}</span>
            <span>BCV: Bs. {rates.bcv.toFixed(2)} | P2P: Bs. {rates.usdt.toFixed(2)}</span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#2C2C2C', marginTop: '2px' }}>
            <input
              type="checkbox"
              checked={registerInSaldo}
              onChange={e => setRegisterInSaldo(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#2ECC71' }}
            />
            <span>Registrar gasto desglosado en SaldoVikingo</span>
          </label>

          {registerInSaldo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#555555' }}>🏷️ Comercio / Concepto para SaldoVikingo:</label>
              <input
                type="text"
                value={commerceConcept}
                onChange={e => setCommerceConcept(e.target.value)}
                placeholder="TuMercado"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: '1px solid #D1C9BF',
                  backgroundColor: '#FFFFFF',
                  color: '#2C2C2C',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Botón de Confirmación */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#2ECC71',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)',
            opacity: loading ? 0.7 : 1
          }}
        >
          <CheckCircle2 size={18} />
          <span>{loading ? 'Guardando Mercado...' : 'Finalizar e Incrementar Despensa'}</span>
        </button>
      </div>

      {/* Modal Desplegable Centrado con Backdrop Blur para Selección de Moneda del Producto */}
      {activeItemForCurrencySelect && (
        <CustomSelectModal
          isOpen={true}
          onClose={() => setActiveItemForCurrencySelect(null)}
          title={`Moneda para ${activeItemForCurrencySelect.name}`}
          options={currencyOptions}
          value={activeItemForCurrencySelect.currency}
          onChange={(newCurr) => {
            handleItemCurrencyChange(activeItemForCurrencySelect.id, newCurr);
            setActiveItemForCurrencySelect(null);
          }}
        />
      )}

      {/* Modal de Calendario In-App */}
      {showDatePickerModal && (
        <DatePickerModal
          isOpen={true}
          onClose={() => setShowDatePickerModal(false)}
          value={purchaseDate}
          onChange={(newDate) => setPurchaseDate(newDate)}
        />
      )}
    </ModalInApp>
  );
}
