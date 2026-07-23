import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function ModalInApp({ isOpen, onClose, title, children, maxWidth = '380px' }) {
  // Evita el doble scroll de la pantalla de fondo al abrir el modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }} // Cierra al hacer clic en el fondo oscuro sin propagar al modal padre
      style={{
        position: 'fixed',
        inset: 0, // top:0, left:0, right:0, bottom:0
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      {/* Tarjeta del Modal con propagación detenida */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '100%',
          maxWidth: maxWidth,
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2DDD5',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          boxSizing: 'border-box',
          color: '#2C2C2C',
          animation: 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#2C2C2C' }}>{title}</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#7F8C8D',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Contenido del Modal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
