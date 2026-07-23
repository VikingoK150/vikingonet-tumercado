import React, { useState } from 'react';
import { Plus, Sparkles, ChevronDown, Check, Share2, ShoppingCart, CheckCircle2, ClipboardList } from 'lucide-react';
import { ModalInApp } from './Modals/ModalInApp';
import { useHaptic } from '../hooks/useHaptic';
import { OFFICIAL_MARKET_CATEGORIES } from '../constants/categories';

export function BottomToolbar({ 
  activeCategory, 
  onSelectCategory, 
  onOpenAddModal, 
  onOpenAIModal, 
  onOpenShareModal,
  onOpenLastPurchaseModal,
  lowStockCount,
  isShoppingMode = false,
  onToggleShoppingMode,
  shoppingCheckedCount = 0,
  onFinishShopping,
  activeItems = [],
  shoppingFilterMode = 'alerts',
  onToggleShoppingFilterMode
}) {
  const { triggerHaptic } = useHaptic();
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Construir opciones de filtro dinámicamente usando las 7 Categorías Oficiales
  const filterOptions = React.useMemo(() => {
    const base = [
      { id: 'Todos', name: 'Todos los Productos', icon: '📦', description: 'Muestra todo tu inventario de despensa' },
      { id: 'Por Comprar', name: 'Por Comprar / Falta Stock', icon: '🛒', description: 'Solo productos agotados o bajo el mínimo' },
      ...OFFICIAL_MARKET_CATEGORIES.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        description: c.description
      }))
    ];

    const baseIds = new Set(base.map(b => b.id));
    const customCats = Array.from(new Set((activeItems || []).map(i => i.category || 'General')))
      .filter(cat => cat && !baseIds.has(cat));

    if (customCats.length > 0) {
      customCats.forEach(cat => {
        base.push({
          id: cat,
          name: cat,
          icon: '🏷️',
          description: `Categoría personalizada (${cat})`
        });
      });
    }

    return base;
  }, [activeItems]);

  const currentFilter = filterOptions.find(f => f.id === activeCategory) || filterOptions[0];

  const handleSelectFilter = (filterId) => {
    triggerHaptic(20);
    onSelectCategory(filterId);
    setShowFilterModal(false);
  };

  return (
    <nav className="bottom-toolbar">
      <div className="toolbar-container">
        {isShoppingMode ? (
          /* Modo Supermercado Activo */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#E8F8F0',
                border: '1px solid #2ECC71',
                borderRadius: '12px',
                color: '#27AE60',
                fontSize: '12px',
                fontWeight: '700'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingCart size={16} />
                  <span>🛒 Modo Supermercado Activo</span>
                </div>
                <span style={{ backgroundColor: '#2ECC71', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>
                  {shoppingCheckedCount} en carrito
                </span>
              </div>

              {/* Selector de Filtro en Modo Supermercado: Solo Alertas vs Todos */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); if (onToggleShoppingFilterMode) onToggleShoppingFilterMode('alerts'); }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '700',
                    border: shoppingFilterMode === 'alerts' ? '1.5px solid #27AE60' : '1px solid #C8E6C9',
                    backgroundColor: shoppingFilterMode === 'alerts' ? '#2ECC71' : '#FFFFFF',
                    color: shoppingFilterMode === 'alerts' ? '#FFFFFF' : '#27AE60',
                    cursor: 'pointer'
                  }}
                >
                  ⚠️ Solo Alertas / Faltantes
                </button>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(15); if (onToggleShoppingFilterMode) onToggleShoppingFilterMode('all'); }}
                  style={{
                    flex: 1,
                    padding: '4px 6px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '700',
                    border: shoppingFilterMode === 'all' ? '1.5px solid #27AE60' : '1px solid #C8E6C9',
                    backgroundColor: shoppingFilterMode === 'all' ? '#2ECC71' : '#FFFFFF',
                    color: shoppingFilterMode === 'all' ? '#FFFFFF' : '#27AE60',
                    cursor: 'pointer'
                  }}
                >
                  📦 Todos los Productos
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="btn-thumb"
                onClick={() => { triggerHaptic(20); onToggleShoppingMode(); }}
                style={{
                  flex: 1,
                  minWidth: '70px',
                  padding: '8px 4px',
                  backgroundColor: '#F5F2EC',
                  color: 'var(--text-secondary)',
                  border: '1px solid #E5E0D5',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
                }}
              >
                <span>Salir</span>
              </button>

              <button 
                type="button"
                className="btn-thumb"
                onClick={() => { triggerHaptic(25); onOpenAddModal(); }}
                style={{
                  flex: 1.2,
                  minWidth: '80px',
                  padding: '8px 4px',
                  backgroundColor: '#FFF8E7',
                  color: '#D35400',
                  border: '1px solid #F39C12',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
                }}
              >
                <span>➕ Rápido</span>
              </button>

              <button 
                type="button"
                className="btn-thumb"
                onClick={() => { triggerHaptic(40); onFinishShopping(); }}
                style={{
                  flex: 1.8,
                  minWidth: '110px',
                  padding: '8px 6px',
                  backgroundColor: '#2ECC71',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
                }}
              >
                <CheckCircle2 size={15} />
                <span>Finalizar ({shoppingCheckedCount})</span>
              </button>
            </div>
          </div>
        ) : (
          /* Modo Estándar de Navegación */
          <>
            {/* Botón Selector de Filtro de Vista & Botón Compartir */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="filter-trigger-btn"
                onClick={() => { triggerHaptic(20); setShowFilterModal(true); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  backgroundColor: '#F5F2EC',
                  border: activeCategory === 'Por Comprar' ? '1px solid var(--color-amber)' : '1px solid #E5E0D5',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>{currentFilter.icon}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Vista:</span>
                  <span style={{ fontWeight: '700', color: activeCategory === 'Por Comprar' ? '#D35400' : 'var(--text-primary)' }}>
                    {currentFilter.name.split('/')[0].trim()}
                  </span>

                  {activeCategory === 'Por Comprar' && lowStockCount > 0 && (
                    <span 
                      style={{ 
                        backgroundColor: '#D35400', 
                        color: '#FFFFFF', 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        padding: '1px 6px', 
                        borderRadius: '10px' 
                      }}
                    >
                      {lowStockCount}
                    </span>
                  )}
                </div>

                <ChevronDown size={14} color="var(--text-secondary)" />
              </button>

              {/* Botón de Compartir Lista en WhatsApp/Telegram */}
              <button
                type="button"
                onClick={() => { triggerHaptic(20); onOpenShareModal(); }}
                style={{
                  padding: '9px 12px',
                  backgroundColor: '#FDEEEB',
                  border: '1px solid var(--color-terracota)',
                  borderRadius: '12px',
                  color: 'var(--color-terracota)',
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
                title="Compartir lista en WhatsApp o Telegram"
              >
                <Share2 size={15} />
                <span>Exportar</span>
              </button>
            </div>

            {/* Barra de Acciones Principales del Pulgar con soporte multilinea */}
            <div className="thumb-action-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="btn-thumb btn-thumb-add" 
                onClick={() => { triggerHaptic(30); onOpenAddModal(); }}
                style={{ flex: 1, minWidth: '85px', padding: '10px 4px', whiteSpace: 'normal', lineHeight: '1.2' }}
              >
                <Plus size={18} />
                <span>Nuevo Tile</span>
              </button>

              <button 
                type="button"
                className="btn-thumb"
                onClick={() => { triggerHaptic(30); onToggleShoppingMode(); }}
                style={{
                  flex: 1.5,
                  minWidth: '120px',
                  padding: '10px 6px',
                  backgroundColor: '#E8F8F0',
                  color: '#27AE60',
                  border: '1px solid #2ECC71',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: '700',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
                }}
              >
                <ShoppingCart size={17} />
                <span>Modo Comprando</span>
              </button>

              <button 
                type="button"
                className="btn-thumb btn-thumb-ai" 
                onClick={() => { triggerHaptic(30); onOpenAIModal(); }}
                style={{ flex: 0.8, minWidth: '60px', padding: '10px 4px', whiteSpace: 'normal', lineHeight: '1.2' }}
              >
                <Sparkles size={18} />
                <span>IA</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal In-App para Filtrar la Vista del Inventario */}
      {showFilterModal && (
        <ModalInApp
          isOpen={true}
          onClose={() => setShowFilterModal(false)}
          title="Filtrar Vista del Inventario"
          maxWidth="380px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filterOptions.map(opt => {
              const isSelected = opt.id === activeCategory;
              const isNeeded = opt.id === 'Por Comprar';

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectFilter(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: isSelected ? '2px solid var(--color-terracota)' : '1px solid #E8E3D8',
                    backgroundColor: isSelected ? '#FDEEEB' : '#F9F7F2',
                    color: isSelected ? 'var(--color-terracota)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: isSelected ? '700' : '600' }}>
                        {opt.name}
                        {isNeeded && lowStockCount > 0 && (
                          <span 
                            style={{ 
                              marginLeft: '8px', 
                              backgroundColor: '#E74C3C', 
                              color: '#FFFFFF', 
                              fontSize: '11px', 
                              fontWeight: '800', 
                              padding: '1px 7px', 
                              borderRadius: '10px' 
                            }}
                          >
                            {lowStockCount} por comprar
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {opt.description}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={20} color="var(--color-terracota)" />}
                </button>
              );
            })}
          </div>
        </ModalInApp>
      )}
    </nav>
  );
}
