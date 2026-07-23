import React, { useState } from 'react';
import { ModalInApp } from './ModalInApp';
import { Check, Plus } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';

export function CustomSelectModal({ isOpen, onClose, title, options, value, onChange, allowCustom = false }) {
  const { triggerHaptic } = useHaptic();
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const handleSelect = (val) => {
    triggerHaptic(25);
    onChange(val);
    onClose();
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customValue.trim()) return;
    triggerHaptic(30);
    onChange(customValue.trim());
    setCustomValue('');
    setShowCustomInput(false);
    onClose();
  };

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title={title} maxWidth="350px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const optIcon = typeof opt === 'object' ? opt.icon : null;
          const isSelected = optValue === value;

          return (
            <button
              key={optValue}
              type="button"
              onClick={() => handleSelect(optValue)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #E05638' : '1px solid #E8E3D8',
                backgroundColor: isSelected ? '#FDEEEB' : '#F8F6F0',
                color: isSelected ? '#E05638' : '#2C2C2C',
                fontSize: '14px',
                fontWeight: isSelected ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {optIcon && <span style={{ fontSize: '16px' }}>{optIcon}</span>}
                <span>{optLabel}</span>
              </div>
              {isSelected && <Check size={18} color="#E05638" />}
            </button>
          );
        })}

        {/* Opción para añadir categoría personalizada libre */}
        {allowCustom && !showCustomInput && (
          <button
            type="button"
            onClick={() => { triggerHaptic(20); setShowCustomInput(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px dashed #E05638',
              backgroundColor: '#FDEEEB',
              color: '#E05638',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            <Plus size={16} />
            <span>➕ Crear Nueva Categoría</span>
          </button>
        )}

        {allowCustom && showCustomInput && (
          <form onSubmit={handleAddCustom} style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Nombre de nueva categoría..."
              value={customValue}
              onChange={e => setCustomValue(e.target.value)}
              autoFocus
              required
              style={{ flex: 1, fontSize: '13px' }}
            />
            <button
              type="submit"
              className="btn-modal btn-primary"
              style={{ padding: '0 14px', whiteSpace: 'nowrap', fontSize: '13px' }}
            >
              Añadir
            </button>
          </form>
        )}
      </div>
    </ModalInApp>
  );
}
