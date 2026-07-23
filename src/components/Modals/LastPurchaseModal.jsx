import React, { useState } from 'react';
import { ModalInApp } from './ModalInApp';
import { Share2, Check, Clock, ShoppingBag, Copy } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { RenderIconOrEmoji } from '../RenderIconOrEmoji';
import { OFFICIAL_MARKET_CATEGORIES, classifyItemCategory } from '../../constants/categories';
import { shareToApps } from '../../services/shareService';

export function LastPurchaseModal({ isOpen, onClose, lastPurchaseData }) {
  const { triggerHaptic } = useHaptic();
  const [copySuccess, setCopySuccess] = useState('');

  if (!lastPurchaseData || !lastPurchaseData.items || lastPurchaseData.items.length === 0) {
    return (
      <ModalInApp isOpen={isOpen} onClose={onClose} title="Reporte de Última Compra" maxWidth="400px">
        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-secondary)' }}>
          <ShoppingBag size={42} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontSize: '14px', fontWeight: '600' }}>No hay compras recientes registradas.</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Entra a Modo Comprando para realizar tu primer mercado.</p>
        </div>
      </ModalInApp>
    );
  }

  const { date, items } = lastPurchaseData;

  const dateFormatted = new Date(date).toLocaleString('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Agrupar ítems comprados por las 7 categorías oficiales
  const grouped = items.reduce((acc, item) => {
    const catName = classifyItemCategory(item);
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(item);
    return acc;
  }, {});

  // Generar texto en Markdown para compartir el reporte de compra
  const generateReportMarkdown = () => {
    let text = `🛒 *REPORTE DE ÚLTIMA COMPRA — TuMercadoVikingo*\n📅 _${dateFormatted}_\n\n`;

    OFFICIAL_MARKET_CATEGORIES.forEach(cat => {
      const catItems = grouped[cat.id];
      if (catItems && catItems.length > 0) {
        text += `*${cat.icon} ${cat.name.toUpperCase()}*\n`;
        catItems.forEach(i => {
          const amt = parseFloat(i.amount) || 0;
          const curr = i.currency || 'VES';
          const symbol = curr === 'VES' ? 'Bs.' : (curr === 'EUR' ? '€' : '$');
          const priceText = amt > 0 ? ` — ${symbol} ${amt.toFixed(2)} ${curr}` : '';
          text += `  • ${i.emoji || '🛒'} *${i.name}* (+${i.addedQty} ${i.unit || 'unid'}${priceText})\n`;
        });
        text += `\n`;
      }
    });

    text += `📌 *Total de productos agregados:* ${items.length}\n`;
    text += `_Generado desde TuMercadoVikingo_`;
    return text;
  };

  const handleShare = async () => {
    triggerHaptic(30);
    const text = generateReportMarkdown();
    const res = await shareToApps(text);
    if (res.success) {
      setCopySuccess(res.method === 'clipboard' ? '¡Copiado al portapapeles!' : '¡Enviado a compartir!');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title="📋 Reporte de Última Compra" maxWidth="430px">
      {/* Cabecera con fecha y estadísticas */}
      <div 
        style={{
          padding: '12px 14px',
          backgroundColor: '#F5F2EC',
          border: '1px solid #E5E0D5',
          borderRadius: '14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="var(--color-terracota)" />
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Fecha de Mercado</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{dateFormatted}</span>
          </div>
        </div>

        <span 
          style={{
            backgroundColor: 'var(--color-terracota)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: '800',
            padding: '4px 10px',
            borderRadius: '12px'
          }}
        >
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      {/* Lista Desglosada por Categorías */}
      <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px', marginBottom: '14px' }}>
        {OFFICIAL_MARKET_CATEGORIES.map(cat => {
          const catItems = grouped[cat.id];
          if (!catItems || catItems.length === 0) return null;

          return (
            <div key={cat.id} style={{ marginBottom: '14px' }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--color-terracota)',
                  marginBottom: '6px',
                  borderBottom: '1px dashed #E5E0D5',
                  paddingBottom: '4px'
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>({catItems.length})</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {catItems.map((item, idx) => {
                  const amt = parseFloat(item.amount) || 0;
                  const curr = item.currency || 'VES';
                  const symbol = curr === 'VES' ? 'Bs.' : (curr === 'EUR' ? '€' : '$');
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EAE5D9',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>
                          <RenderIconOrEmoji icon={item.emoji || '🛒'} />
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {amt > 0 && (
                          <span
                            style={{
                              backgroundColor: '#FFF8E7',
                              color: '#D35400',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              border: '1px solid #F39C12'
                            }}
                          >
                            {symbol} {amt.toFixed(2)}
                          </span>
                        )}
                        <span 
                          style={{
                            backgroundColor: '#E8F8F0',
                            color: '#27AE60',
                            fontSize: '12px',
                            fontWeight: '800',
                            padding: '2px 8px',
                            borderRadius: '8px',
                            border: '1px solid rgba(39, 174, 96, 0.3)'
                          }}
                        >
                          +{item.addedQty} {item.unit || 'unid'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón de Compartir y Notificación */}
      {copySuccess && (
        <div 
          style={{
            backgroundColor: '#E8F8F0',
            color: '#27AE60',
            fontSize: '12px',
            fontWeight: '700',
            textAlign: 'center',
            padding: '8px',
            borderRadius: '10px',
            marginBottom: '10px'
          }}
        >
          {copySuccess}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          className="btn-modal btn-primary"
          onClick={handleShare}
          style={{ flex: 1 }}
        >
          <Share2 size={16} />
          <span>Compartir por WhatsApp</span>
        </button>
      </div>
    </ModalInApp>
  );
}
