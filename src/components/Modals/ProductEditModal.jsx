import React, { useState, useEffect } from 'react';
import { ModalInApp } from './ModalInApp';
import { CustomSelectModal } from './CustomSelectModal';
import { EmojiPickerModal } from './EmojiPickerModal';
import { Save, Trash2, ChevronDown, Grid, Plus } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { RenderIconOrEmoji } from '../RenderIconOrEmoji';

// Cuadrícula rápida de 12 presets populares (2 filas x 6 columnas)
const POPULAR_PRESETS_GRID = [
  '🛒', '🍎', '🥛', '🥩', '🍞', '🧀',
  '🥚', '🍗', '☕', '🍫', '🧃', '🧼'
];

import { OFFICIAL_MARKET_CATEGORIES } from '../../constants/categories';

const CATEGORY_OPTIONS = OFFICIAL_MARKET_CATEGORIES.map(c => ({
  value: c.id,
  label: c.name,
  icon: c.icon
}));

const UNIT_OPTIONS = [
  { value: 'unid', label: 'Unidades (unid)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'paq', label: 'Paquetes (paq)' },
  { value: 'carton', label: 'Cartón' }
];

export function ProductEditModal({ itemToEdit, onSave, onDelete, onClose }) {
  const { triggerHaptic } = useHaptic();
  
  const isEditing = !!itemToEdit?.id;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [category, setCategory] = useState('Alimentos');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('unid');
  const [stepIncrement, setStepIncrement] = useState(1);
  const [minThreshold, setMinThreshold] = useState(1);

  // Modales desplegables personalizados
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showUnitSelect, setShowUnitSelect] = useState(false);
  const [showEmojiPickerModal, setShowEmojiPickerModal] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || '');
      setEmoji(itemToEdit.emoji || '🛒');
      setCategory(itemToEdit.category || 'Alimentos');
      setQuantity(itemToEdit.quantity !== undefined ? itemToEdit.quantity : 1);
      setUnit(itemToEdit.unit || 'unid');
      setStepIncrement(itemToEdit.step_increment || 1);
      setMinThreshold(itemToEdit.min_threshold || 1);
    } else {
      setName('');
      setEmoji('🛒');
      setCategory('Alimentos');
      setQuantity(1);
      setUnit('unid');
      setStepIncrement(1);
      setMinThreshold(1);
    }
  }, [itemToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    triggerHaptic(40);

    onSave({
      id: itemToEdit?.id,
      name: name.trim(),
      emoji: emoji.trim() || '🛒',
      category,
      quantity: parseFloat(quantity),
      unit,
      step_increment: parseFloat(stepIncrement),
      min_threshold: parseFloat(minThreshold)
    });
    onClose();
  };

  const handleDelete = () => {
    if (!isEditing) return;
    if (confirm(`¿Seguro que deseas eliminar "${name}"?`)) {
      triggerHaptic(50);
      onDelete(itemToEdit.id);
      onClose();
    }
  };

  return (
    <>
      <ModalInApp 
        isOpen={true} 
        onClose={onClose} 
        title={isEditing ? 'Editar Producto' : 'Crear Nuevo Tile'}
        maxWidth="400px"
      >
        <form onSubmit={handleSubmit} className="edit-form">
          {/* Selector de Emoji con Botón + y Display aparte */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label>Emoji del Producto</label>
              <button
                type="button"
                onClick={() => { triggerHaptic(20); setShowEmojiPickerModal(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-terracota)',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Grid size={13} />
                <span>Explorar Catálogo</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              {/* Botón de Cruz (+) para abrir el catálogo */}
              <button
                type="button"
                onClick={() => { triggerHaptic(20); setShowEmojiPickerModal(true); }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  border: '2px dashed var(--color-terracota)',
                  backgroundColor: '#FDEEEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Abrir catálogo completo de emojis"
              >
                <Plus size={22} color="var(--color-terracota)" />
              </button>

              {/* Display o Cuadrito Aparte con el Emoji Elegido */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: '1px solid #EAE5D9',
                  backgroundColor: '#F8F6F0'
                }}
              >
                <span style={{ fontSize: '24px' }}>
                  <RenderIconOrEmoji icon={emoji || '🛒'} />
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '600' }}>Emoji Seleccionado</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{name || 'Producto'}</span>
                </div>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
              {POPULAR_PRESETS_GRID.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { triggerHaptic(15); setEmoji(e); }}
                  style={{
                    height: '34px',
                    borderRadius: '8px',
                    border: emoji === e ? '2px solid var(--color-terracota)' : '1px solid #EAE5D9',
                    backgroundColor: emoji === e ? '#FDEEEB' : '#FFFFFF',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <RenderIconOrEmoji icon={e} />
                </button>
              ))}
            </div>
          </div>

          {/* Nombre del Producto */}
          <div className="form-group">
            <label>Nombre del Producto *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ej. Harina de trigo"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          {/* Categoría y Unidad con Modales CustomSelect */}
          <div className="form-row">
            <div className="form-group half">
              <label>Categoría</label>
              <button
                type="button"
                className="custom-select-trigger"
                onClick={() => { triggerHaptic(20); setShowCategorySelect(true); }}
              >
                <span>{category}</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="form-group half">
              <label>Unidad de Medida</label>
              <button
                type="button"
                className="custom-select-trigger"
                onClick={() => { triggerHaptic(20); setShowUnitSelect(true); }}
              >
                <span>{unit}</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Cantidad Inicial, Incremento por Tap y Umbral Mínimo con Botones +1 y -1 */}
          <div className="form-row">
            {/* Stock Actual */}
            <div className="form-group third">
              <label>Stock Actual</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setQuantity(prev => Math.max(0, parseFloat(prev || 0) - 1))}
                  style={{ padding: '6px 8px', borderRadius: '6px 0 0 6px', border: '1px solid #D1C9BF', borderRight: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >-1</button>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ borderRadius: 0, textAlign: 'center', padding: '6px 2px' }}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(prev => parseFloat(prev || 0) + 1)}
                  style={{ padding: '6px 8px', borderRadius: '0 6px 6px 0', border: '1px solid #D1C9BF', borderLeft: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >+1</button>
              </div>
            </div>

            {/* Tap (+ / -) */}
            <div className="form-group third">
              <label>Tap (+ / -)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setStepIncrement(prev => Math.max(0.1, parseFloat(prev || 1) - 1))}
                  style={{ padding: '6px 8px', borderRadius: '6px 0 0 6px', border: '1px solid #D1C9BF', borderRight: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >-1</button>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ borderRadius: 0, textAlign: 'center', padding: '6px 2px' }}
                  value={stepIncrement}
                  onChange={e => setStepIncrement(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setStepIncrement(prev => parseFloat(prev || 0) + 1)}
                  style={{ padding: '6px 8px', borderRadius: '0 6px 6px 0', border: '1px solid #D1C9BF', borderLeft: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >+1</button>
              </div>
            </div>

            {/* Mín. Alerta */}
            <div className="form-group third">
              <label>Mín. Alerta</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setMinThreshold(prev => Math.max(0, parseFloat(prev || 0) - 1))}
                  style={{ padding: '6px 8px', borderRadius: '6px 0 0 6px', border: '1px solid #D1C9BF', borderRight: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >-1</button>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  style={{ borderRadius: 0, textAlign: 'center', padding: '6px 2px' }}
                  value={minThreshold}
                  onChange={e => setMinThreshold(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMinThreshold(prev => parseFloat(prev || 0) + 1)}
                  style={{ padding: '6px 8px', borderRadius: '0 6px 6px 0', border: '1px solid #D1C9BF', borderLeft: 'none', backgroundColor: '#F5F2EC', cursor: 'pointer', fontWeight: '700', fontSize: '11px' }}
                >+1</button>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions-row">
            {isEditing && (
              <button type="button" className="btn-modal btn-danger" onClick={handleDelete}>
                <Trash2 size={16} />
                <span>Borrar</span>
              </button>
            )}

            <button type="submit" className="btn-modal btn-primary">
              <Save size={16} />
              <span>{isEditing ? 'Guardar Cambios' : 'Crear Tile'}</span>
            </button>
          </div>
        </form>
      </ModalInApp>

      {/* Modal Catálogo de Emojis por Categoría */}
      <EmojiPickerModal
        isOpen={showEmojiPickerModal}
        onClose={() => setShowEmojiPickerModal(false)}
        selectedIcon={emoji}
        onSelectIcon={setEmoji}
      />

      {/* Modal Desplegable de Categorías con opción de categoría personalizada */}
      <CustomSelectModal
        isOpen={showCategorySelect}
        onClose={() => setShowCategorySelect(false)}
        title="Seleccionar Categoría"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
        allowCustom={true}
      />

      {/* Modal Desplegable de Unidades */}
      <CustomSelectModal
        isOpen={showUnitSelect}
        onClose={() => setShowUnitSelect(false)}
        title="Seleccionar Unidad"
        options={UNIT_OPTIONS}
        value={unit}
        onChange={setUnit}
      />
    </>
  );
}
