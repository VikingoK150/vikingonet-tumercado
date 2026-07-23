import React, { useState, useMemo } from 'react';
import { ModalInApp } from './ModalInApp';
import { Share2, Copy, Check, ShoppingBag, Box } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { generateMarketText, shareToApps } from '../../services/shareService';

export function ShareModal({ isOpen, onClose, items }) {
  const { triggerHaptic } = useHaptic();
  const [mode, setMode] = useState('missing'); // 'missing' | 'all'
  const [copiedStatus, setCopiedStatus] = useState(false);

  // Generar texto en tiempo real
  const formattedText = useMemo(() => {
    return generateMarketText(items, mode);
  }, [items, mode]);

  const handleShare = async () => {
    triggerHaptic(30);
    const res = await shareToApps(formattedText);
    
    if (res.success) {
      if (res.method === 'clipboard') {
        setCopiedStatus(true);
        setTimeout(() => setCopiedStatus(false), 2500);
      } else {
        onClose();
      }
    }
  };

  const missingCount = useMemo(() => {
    return (items || []).filter(i => (i.quantity || 0) <= (i.min_threshold || 1)).length;
  }, [items]);

  const availableCount = useMemo(() => {
    return (items || []).filter(i => (i.quantity || 0) > 0).length;
  }, [items]);

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title="Compartir Lista de Mercado" maxWidth="480px">
      {/* Selector de Modo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => { triggerHaptic(15); setMode('missing'); setCopiedStatus(false); }}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: mode === 'missing' ? '2px solid var(--color-terracota)' : '1px solid #E5E0D5',
            backgroundColor: mode === 'missing' ? '#FDEEEB' : '#F5F2EC',
            color: mode === 'missing' ? 'var(--color-terracota)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: mode === 'missing' ? '700' : '500',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <ShoppingBag size={14} />
          <span>Falta ({missingCount})</span>
        </button>

        <button
          type="button"
          onClick={() => { triggerHaptic(15); setMode('available'); setCopiedStatus(false); }}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: mode === 'available' ? '2px solid var(--color-terracota)' : '1px solid #E5E0D5',
            backgroundColor: mode === 'available' ? '#FDEEEB' : '#F5F2EC',
            color: mode === 'available' ? 'var(--color-terracota)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: mode === 'available' ? '700' : '500',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <Check size={14} />
          <span>Disponible ({availableCount})</span>
        </button>

        <button
          type="button"
          onClick={() => { triggerHaptic(15); setMode('all'); setCopiedStatus(false); }}
          style={{
            padding: '8px 4px',
            borderRadius: '10px',
            border: mode === 'all' ? '2px solid var(--color-terracota)' : '1px solid #E5E0D5',
            backgroundColor: mode === 'all' ? '#FDEEEB' : '#F5F2EC',
            color: mode === 'all' ? 'var(--color-terracota)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: mode === 'all' ? '700' : '500',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            cursor: 'pointer'
          }}
        >
          <Box size={14} />
          <span>Todo ({items?.length || 0})</span>
        </button>
      </div>

      {/* Previsualizador de Texto en Markdown */}
      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
          Vista Previa (Formato WhatsApp / Telegram)
        </label>
        <div
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '10px 12px',
            backgroundColor: '#F8F6F0',
            border: '1px solid #E8E3D8',
            borderRadius: '12px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)',
            lineHeight: '1.4'
          }}
        >
          {formattedText}
        </div>
      </div>

      {/* Mensaje de Confirmación de Copiado */}
      {copiedStatus && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#E8F8F0',
            border: '1px solid #2ECC71',
            borderRadius: '10px',
            color: '#27AE60',
            fontSize: '12px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Check size={16} />
          <span>¡Texto copiado al portapapeles! Pégalo en WhatsApp o Telegram.</span>
        </div>
      )}

      {/* Botón Principal de Compartir */}
      <button
        type="button"
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          backgroundColor: 'var(--color-terracota)',
          border: 'none',
          borderRadius: '14px',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(224, 86, 56, 0.25)'
        }}
      >
        {navigator.share ? <Share2 size={18} /> : <Copy size={18} />}
        <span>{navigator.share ? 'Compartir en WhatsApp / Telegram' : 'Copiar Texto para WhatsApp'}</span>
      </button>
    </ModalInApp>
  );
}
