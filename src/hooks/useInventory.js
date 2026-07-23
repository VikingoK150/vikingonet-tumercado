import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { normalizeText } from '../utils/stringUtils';

export function useInventory(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Buffer para agrupar actualizaciones debounced (500ms) por item.id
  const pendingSyncRef = useRef({});
  const debounceTimersRef = useRef({});

  // Cargar inventario completo del usuario
  const fetchInventory = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('market_inventory')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setItems(data || []);
      setError(null);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Separar en activos y pendientes
  const activeItems = items.filter(i => (i.status || 'active') === 'active');
  const pendingItems = items.filter(i => i.status === 'pending');

  // Actualización debounced de cantidad (0ms en UI local, 500ms en Supabase)
  const updateQuantity = useCallback((id, delta) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id !== id) return item;
        const step = parseFloat(item.step_increment || 1);
        const currentQty = parseFloat(item.quantity || 0);
        const newQty = Math.max(0, parseFloat((currentQty + (delta * step)).toFixed(2)));
        
        // Registrar en buffer de sincronización
        pendingSyncRef.current[id] = newQty;
        
        // Programar debounce de 500ms
        if (debounceTimersRef.current[id]) {
          clearTimeout(debounceTimersRef.current[id]);
        }
        
        debounceTimersRef.current[id] = setTimeout(async () => {
          const finalQty = pendingSyncRef.current[id];
          delete pendingSyncRef.current[id];
          delete debounceTimersRef.current[id];

          try {
            await supabase
              .from('market_inventory')
              .update({
                quantity: finalQty,
                updated_at: new Date().toISOString()
              })
              .eq('id', id);
          } catch (err) {
            console.error(`Error guardando cantidad para ${id}:`, err);
          }
        }, 500);

        return { ...item, quantity: newQty };
      });
    });
  }, []);

  // Vincular ítem pendiente a un producto existente (Aprender alias)
  const linkPendingItem = useCallback(async (pendingId, targetItem) => {
    const pending = items.find(i => i.id === pendingId);
    if (!pending || !targetItem) return;

    const rawAlias = pending.raw_source_name || pending.name;
    const normalizedAlias = normalizeText(rawAlias);

    const existingAliases = targetItem.aliases || [];
    const updatedAliases = Array.from(new Set([...existingAliases.map(a => normalizeText(a)), normalizedAlias])).filter(Boolean);

    const addQty = parseFloat(pending.quantity || 1);
    const newQty = parseFloat((parseFloat(targetItem.quantity || 0) + addQty).toFixed(2));

    try {
      // 1. Actualizar item objetivo con nuevo alias y stock
      const { error: updateErr } = await supabase
        .from('market_inventory')
        .update({
          aliases: updatedAliases,
          quantity: newQty,
          last_purchased_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', targetItem.id);

      if (updateErr) throw updateErr;

      // 2. Eliminar el registro pendiente
      await supabase
        .from('market_inventory')
        .delete()
        .eq('id', pendingId);

      // 3. Recargar estado local
      await fetchInventory();
    } catch (err) {
      console.error("Error al vincular producto pendiente:", err);
      throw err;
    }
  }, [items, fetchInventory]);

  // Aprobar ítem pendiente como nuevo tile activo
  const approvePendingAsNewTile = useCallback(async (pendingId, customData = {}) => {
    const pending = items.find(i => i.id === pendingId);
    if (!pending) return;

    const targetUnit = customData.unit || pending.unit || 'unid';
    const targetStep = customData.step_increment || pending.step_increment || (targetUnit === 'kg' ? 0.5 : 1);

    try {
      const { error: updateErr } = await supabase
        .from('market_inventory')
        .update({
          name: customData.name || pending.name,
          category: customData.category || pending.category || 'Alimentos',
          emoji: customData.emoji || pending.emoji || '🛒',
          unit: targetUnit,
          step_increment: targetStep,
          min_threshold: customData.min_threshold || pending.min_threshold || 1,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingId);

      if (updateErr) throw updateErr;
      await fetchInventory();
    } catch (err) {
      console.error("Error aprobando ítem pendiente:", err);
      throw err;
    }
  }, [items, fetchInventory]);

  // Descartar/Eliminar ítem pendiente (Papelera 🗑️)
  const discardPendingItem = useCallback(async (pendingId) => {
    try {
      const { error: delErr } = await supabase
        .from('market_inventory')
        .delete()
        .eq('id', pendingId);

      if (delErr) throw delErr;
      setItems(prev => prev.filter(i => i.id !== pendingId));
    } catch (err) {
      console.error("Error al descartar pendiente:", err);
      throw err;
    }
  }, []);

  // Crear nuevo tile activo manualmente
  const addItem = useCallback(async (newItemData) => {
    if (!userId) return;
    try {
      const { data, error: insertErr } = await supabase
        .from('market_inventory')
        .insert({
          user_id: userId,
          name: newItemData.name.trim(),
          emoji: newItemData.emoji || '🛒',
          category: newItemData.category || 'General',
          quantity: parseFloat(newItemData.quantity || 0),
          min_threshold: parseFloat(newItemData.min_threshold || 1),
          unit: newItemData.unit || 'unid',
          step_increment: parseFloat(newItemData.step_increment || 1),
          status: 'active',
          aliases: newItemData.aliases || []
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      await fetchInventory();
      return data;
    } catch (err) {
      console.error("Error al añadir item:", err);
      throw err;
    }
  }, [userId, fetchInventory]);

  // Editar tile activo
  const editItem = useCallback(async (id, fields) => {
    try {
      const { error: updateErr } = await supabase
        .from('market_inventory')
        .update({
          ...fields,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateErr) throw updateErr;
      await fetchInventory();
    } catch (err) {
      console.error("Error al editar item:", err);
      throw err;
    }
  }, [fetchInventory]);

  // Borrar tile
  const deleteItem = useCallback(async (id) => {
    try {
      const { error: delErr } = await supabase
        .from('market_inventory')
        .delete()
        .eq('id', id);

      if (delErr) throw delErr;
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Error al borrar item:", err);
      throw err;
    }
  }, []);

  return {
    items,
    activeItems,
    pendingItems,
    loading,
    error,
    refresh: fetchInventory,
    updateQuantity,
    linkPendingItem,
    approvePendingAsNewTile,
    discardPendingItem,
    addItem,
    editItem,
    deleteItem
  };
}
