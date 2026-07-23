import React from 'react';
import { Plus, Minus, Check, Edit2 } from 'lucide-react';
import { useHaptic } from '../hooks/useHaptic';
import { RenderIconOrEmoji } from './RenderIconOrEmoji';

export function ProductTile({ 
  item, 
  onUpdateQuantity, 
  onEdit, 
  isShoppingMode = false, 
  shoppingCartQty = 0,
  onIncrementCartQty,
  itemPriceInfo,
  onOpenPriceTapModal
}) {
  const { triggerHaptic } = useHaptic();
  
  const quantity = parseFloat(item.quantity || 0);
  const minThreshold = parseFloat(item.min_threshold || 1);
  const stepIncrement = parseFloat(item.step_increment || 1);

  // Semáforo de Agotamiento (Healthy > min, Warning <= min, Critical = 0)
  let statusClass = 'status-healthy';
  let statusLabel = 'Saludable';

  if (quantity === 0) {
    statusClass = 'status-critical';
    statusLabel = 'Agotado';
  } else if (quantity <= minThreshold) {
    statusClass = 'status-warning';
    statusLabel = 'Por Agotarse';
  }

  const handleMinus = (e) => {
    e.stopPropagation();
    triggerHaptic(40);
    if (isShoppingMode) {
      if (onIncrementCartQty) onIncrementCartQty(item.id, -stepIncrement);
    } else {
      onUpdateQuantity(item.id, -stepIncrement);
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    triggerHaptic(40);
    if (isShoppingMode) {
      if (onIncrementCartQty) onIncrementCartQty(item.id, stepIncrement);
    } else {
      onUpdateQuantity(item.id, stepIncrement);
    }
  };

  const hasPrice = itemPriceInfo && parseFloat(itemPriceInfo.amount) > 0;
  const priceDisplay = hasPrice 
    ? `${itemPriceInfo.currency === 'VES' ? 'Bs.' : (itemPriceInfo.currency === 'EUR' ? '€' : '$')}${parseFloat(itemPriceInfo.amount).toFixed(2)}`
    : '🏷️ Precio';

  const isCheckedInCart = shoppingCartQty > 0;

  return (
    <div 
      className={`product-tile ${statusClass} ${isShoppingMode ? 'shopping-mode-tile' : ''} ${isCheckedInCart ? 'in-cart' : ''}`}
      onClick={() => {
        if (isShoppingMode) {
          triggerHaptic(30);
          if (shoppingCartQty === 0) {
            if (onIncrementCartQty) onIncrementCartQty(item.id, stepIncrement);
          }
          if (onOpenPriceTapModal) onOpenPriceTapModal(item);
        }
      }}
    >
      {/* Indicador de Semáforo de Agotamiento */}
      <div className={`status-indicator-badge ${statusClass}`} title={`Estado: ${statusLabel}`}>
        <span className="status-dot"></span>
      </div>

      {/* Badge Flotante en Modo Compra cuando se han agregado unidades y botón de Precio */}
      {isShoppingMode && isCheckedInCart && (
        <div 
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 3
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic(20);
              if (onOpenPriceTapModal) onOpenPriceTapModal(item);
            }}
            style={{
              backgroundColor: hasPrice ? '#FFF8E7' : '#FFFFFF',
              color: hasPrice ? '#D35400' : '#444444',
              border: hasPrice ? '2px solid #F39C12' : '1.5px solid #D1C9BF',
              fontSize: '12px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {priceDisplay}
          </button>
          <div 
            style={{
              backgroundColor: '#2ECC71',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '12px',
              boxShadow: '0 2px 6px rgba(46, 204, 113, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Check size={13} strokeWidth={3} />
            <span>+{shoppingCartQty} {item.unit || 'unid'}</span>
          </div>
        </div>
      )}

      {/* Cabecera del Tile: Emoji Nativo y Botón de Edición */}
      <div className="tile-header">
        <span className="tile-emoji">
          <RenderIconOrEmoji icon={item.emoji || '🛒'} />
        </span>
        {!isShoppingMode && (
          <button 
            className="tile-edit-btn" 
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            title="Editar producto"
          >
            <Edit2 size={13} />
          </button>
        )}
      </div>

      {/* Nombre y Categoría */}
      <div className="tile-info">
        <h4 className="tile-title">{item.name}</h4>
        <span className="tile-category">{item.category || 'General'}</span>
      </div>

      {/* Controles Táctiles Ergonomía 44x44px (Tanto en vista normal como en Modo Compra) */}
      <div className="tile-controls" onClick={(e) => e.stopPropagation()}>
        <button 
          className="tile-btn tile-btn-minus" 
          onClick={handleMinus}
          disabled={!isShoppingMode && quantity <= 0}
          aria-label={`Disminuir ${stepIncrement}`}
          style={{ 
            minWidth: '38px', 
            minHeight: '38px',
            backgroundColor: isShoppingMode ? (shoppingCartQty > 0 ? '#FFEBEE' : '#F5F5F5') : undefined,
            color: isShoppingMode ? (shoppingCartQty > 0 ? '#E74C3C' : '#999999') : undefined
          }}
        >
          <Minus size={16} />
        </button>

        <div className="tile-qty-display">
          {isShoppingMode ? (
            <span 
              className="tile-qty-number" 
              style={{ color: shoppingCartQty > 0 ? '#27AE60' : 'var(--text-secondary)', fontWeight: '800' }}
            >
              {shoppingCartQty > 0 ? `+${shoppingCartQty}` : `0`}
            </span>
          ) : (
            <span className="tile-qty-number">{quantity}</span>
          )}
          <span className="tile-qty-unit">{item.unit || 'unid'}</span>
        </div>

        <button 
          className="tile-btn tile-btn-plus" 
          onClick={handlePlus}
          aria-label={`Aumentar ${stepIncrement}`}
          style={{ 
            minWidth: '38px', 
            minHeight: '38px',
            backgroundColor: isShoppingMode ? '#E8F8F0' : undefined,
            color: isShoppingMode ? '#27AE60' : undefined
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Prompt Táctil en Modo Supermercado */}
      {isShoppingMode && (
        <div className="shopping-tap-prompt" style={{ marginTop: '4px' }}>
          <span>{shoppingCartQty > 0 ? `🛒 Sumando +${shoppingCartQty}` : 'Toca o usa + / - para agregar'}</span>
        </div>
      )}
    </div>
  );
}
