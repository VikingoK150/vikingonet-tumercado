import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Link, PlusCircle, X, Search } from 'lucide-react';
import { normalizeText } from '../../utils/stringUtils';
import { useHaptic } from '../../hooks/useHaptic';
import { RenderIconOrEmoji } from '../RenderIconOrEmoji';

export function PendingApprovalModal({ 
  pendingItems = [], 
  activeItems = [], 
  onLink, 
  onApproveAsNew, 
  onDiscard, 
  onClose 
}) {
  const { triggerHaptic } = useHaptic();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const currentItem = pendingItems[currentIndex];

  // Filtrar ítems activos con autocompletado en 1 tap
  const filteredTargets = useMemo(() => {
    if (!currentItem) return [];
    const query = normalizeText(searchQuery);
    const itemNorm = normalizeText(currentItem.raw_source_name || currentItem.name);

    return activeItems.filter(active => {
      const activeNameNorm = normalizeText(active.name);
      if (!query) {
        return activeNameNorm.includes(itemNorm) || itemNorm.includes(activeNameNorm);
      }
      return activeNameNorm.includes(query) || (active.aliases || []).some(a => normalizeText(a).includes(query));
    }).slice(0, 5);
  }, [searchQuery, activeItems, currentItem]);

  if (!currentItem) return null;

  const handleLink = async (target) => {
    triggerHaptic(40);
    await onLink(currentItem.id, target);
    setSearchQuery('');
    if (currentIndex >= pendingItems.length - 1) {
      onClose();
    }
  };

  const handleCreateNew = async () => {
    triggerHaptic(40);
    await onApproveAsNew(currentItem.id, {
      name: currentItem.name,
      unit: currentItem.unit || 'unid',
      step_increment: currentItem.step_increment || (currentItem.unit === 'kg' ? 0.5 : 1),
      category: currentItem.category || 'Alimentos',
      emoji: currentItem.emoji || '🛒'
    });
    setSearchQuery('');
    if (currentIndex >= pendingItems.length - 1) {
      onClose();
    }
  };

  const handleDiscard = async () => {
    triggerHaptic(40);
    await onDiscard(currentItem.id);
    setSearchQuery('');
    if (currentIndex >= pendingItems.length - 1) {
      onClose();
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card pending-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="pending-badge-header">
            <span>🔔 Producto por Aprobación ({currentIndex + 1} de {pendingItems.length})</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pending-item-box">
          <span className="pending-icon">
            <RenderIconOrEmoji icon={currentItem.emoji || '🛍️'} />
          </span>
          <div>
            <h3 className="pending-title">"{currentItem.raw_source_name || currentItem.name}"</h3>
            <p className="pending-subtitle">
              Cantidad detectada: <strong>{currentItem.quantity} {currentItem.unit || 'unid'}</strong>
            </p>
          </div>
        </div>

        <p className="modal-instruction">
          ¿Deseas vincular este producto a un tile existente (aprenderá el alias) o crear un tile nuevo?
        </p>

        {/* Campo de búsqueda rápida autocompletado */}
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="modal-search-input"
            placeholder="Buscar para vincular (ej. 'Har' para Harina)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de resultados para vincular en 1 Tap */}
        <div className="autocomplete-results-list">
          {filteredTargets.length > 0 ? (
            filteredTargets.map(target => (
              <button
                key={target.id}
                className="autocomplete-item-btn"
                onClick={() => handleLink(target)}
              >
                <div className="autocomplete-item-info">
                  <span className="autocomplete-emoji">
                    <RenderIconOrEmoji icon={target.emoji || '🛒'} />
                  </span>
                  <span className="autocomplete-name">{target.name}</span>
                  <span className="autocomplete-current-qty">(Stock: {target.quantity} {target.unit})</span>
                </div>
                <div className="link-action-tag">
                  <Link size={14} />
                  <span>Vincular</span>
                </div>
              </button>
            ))
          ) : (
            <div className="no-autocomplete-msg">
              {searchQuery ? 'No se encontraron coincidencias exactas.' : 'Escribe para buscar un producto existente.'}
            </div>
          )}
        </div>

        {/* Acciones Directas: Crear Nuevo o Descartar */}
        <div className="pending-actions-footer">
          <button className="btn-modal btn-discard" onClick={handleDiscard}>
            <Trash2 size={16} />
            <span>Descartar (🗑️)</span>
          </button>

          <button className="btn-modal btn-create-new" onClick={handleCreateNew}>
            <PlusCircle size={16} />
            <span>Crear Nuevo Tile</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
