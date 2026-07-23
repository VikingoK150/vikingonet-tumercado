import React, { useState, useEffect } from 'react';
import { ModalInApp } from './ModalInApp';
import { Check } from 'lucide-react';

export function ItemPriceTapModal({
  isOpen,
  onClose,
  item,
  addedQty = 1,
  initialAmount = '',
  initialCurrency = 'VES',
  initialPriceMode = 'total',
  onSavePrice
}) {
  const [priceMode, setPriceMode] = useState('total'); // 'total' | 'unit'
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VES');

  useEffect(() => {
    if (isOpen && item) {
      setPriceMode(initialPriceMode || 'total');
      setAmount(initialAmount !== undefined ? initialAmount : '');
      setCurrency(initialCurrency || 'VES');
    }
  }, [isOpen, item, initialAmount, initialCurrency, initialPriceMode]);

  if (!item) return null;

  const currencyOptions = ['VES', 'USD', 'USDT', 'EUR'];

  const calculatedTotal = priceMode === 'unit' 
    ? (parseFloat(amount) || 0) * (addedQty || 1)
    : (parseFloat(amount) || 0);

  const handleSave = () => {
    onSavePrice({
      amount: priceMode === 'unit' ? parseFloat((calculatedTotal).toFixed(2)) : (parseFloat(amount) || 0),
      rawAmount: parseFloat(amount) || 0,
      currency,
      priceMode
    });
    onClose();
  };

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title={`${item.emoji || '🛒'} ${item.name}`} maxWidth="380px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ textAlign: 'center', backgroundColor: '#F8F6F0', padding: '10px', borderRadius: '12px', border: '1px solid #E8E3D8' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#2C2C2C' }}>
            Comprando: {addedQty} {item.unit || 'unid'}
          </span>
        </div>

        {/* Selector de Modo de Precio (Unitario vs Total) */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#555555', marginBottom: '4px', display: 'block' }}>
            Modalidad del Precio:
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setPriceMode('total')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                border: priceMode === 'total' ? '2px solid #2ECC71' : '1px solid #D1C9BF',
                backgroundColor: priceMode === 'total' ? '#E8F8F0' : '#FFFFFF',
                color: priceMode === 'total' ? '#27AE60' : '#555555',
                cursor: 'pointer'
              }}
            >
              Valor Total ({addedQty} {item.unit})
            </button>
            <button
              type="button"
              onClick={() => setPriceMode('unit')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '700',
                border: priceMode === 'unit' ? '2px solid #2ECC71' : '1px solid #D1C9BF',
                backgroundColor: priceMode === 'unit' ? '#E8F8F0' : '#FFFFFF',
                color: priceMode === 'unit' ? '#27AE60' : '#555555',
                cursor: 'pointer'
              }}
            >
              Precio por 1 {item.unit || 'unid'}
            </button>
          </div>
        </div>

        {/* Monto y Selector de Moneda */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#555555', marginBottom: '4px', display: 'block' }}>
            {priceMode === 'unit' ? `Monto por 1 ${item.unit}:` : `Monto Total Pagado:`}
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '16px',
                fontWeight: '700',
                borderRadius: '8px',
                border: '1px solid #D1C9BF',
                textAlign: 'right'
              }}
            />
            <button
              type="button"
              onClick={() => {
                const nextIdx = (currencyOptions.indexOf(currency) + 1) % currencyOptions.length;
                setCurrency(currencyOptions[nextIdx]);
              }}
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '800',
                borderRadius: '8px',
                border: '2px solid #2ECC71',
                backgroundColor: '#E8F8F0',
                color: '#1E8449',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                minWidth: '95px',
                justifyContent: 'center'
              }}
              title="Toca para cambiar la moneda"
            >
              <span>{currency === 'VES' ? '🇻🇪 VES' : (currency === 'USD' ? '💵 USD' : (currency === 'USDT' ? '🪙 USDT' : '💶 EUR'))}</span>
            </button>
          </div>
        </div>

        {/* Muestra cálculo resultante si está en modo unitario */}
        {priceMode === 'unit' && addedQty > 1 && (
          <div style={{ fontSize: '12px', color: '#27AE60', fontWeight: '600', textAlign: 'right' }}>
            Total equivalente: {currency === 'VES' ? 'Bs.' : (currency === 'EUR' ? '€' : '$')} {calculatedTotal.toFixed(2)} {currency}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
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
            gap: '6px'
          }}
        >
          <Check size={18} />
          <span>Guardar Precio</span>
        </button>
      </div>
    </ModalInApp>
  );
}
