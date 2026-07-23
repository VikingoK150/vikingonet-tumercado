import React, { useState, useMemo } from 'react';
import { ModalInApp } from './ModalInApp';
import { ChevronLeft, ChevronRight, Check, ChevronDown } from 'lucide-react';
import { getEffectiveRateDate } from '../../services/exchangeService';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const WEEKDAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function DatePickerModal({ isOpen, onClose, value, onChange }) {
  const [tempDate, setTempDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
    return new Date();
  });

  const [viewYear, setViewYear] = useState(() => tempDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => tempDate.getMonth());
  // Niveles de vista: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState('days');

  const handlePrevNav = () => {
    if (viewMode === 'days') {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(prev => prev - 1);
      } else {
        setViewMonth(prev => prev - 1);
      }
    } else if (viewMode === 'months') {
      setViewYear(prev => prev - 1);
    } else if (viewMode === 'years') {
      setViewYear(prev => prev - 12);
    }
  };

  const handleNextNav = () => {
    if (viewMode === 'days') {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(prev => prev + 1);
      } else {
        setViewMonth(prev => prev + 1);
      }
    } else if (viewMode === 'months') {
      setViewYear(prev => prev + 1);
    } else if (viewMode === 'years') {
      setViewYear(prev => prev + 12);
    }
  };

  const handleTitleClick = () => {
    if (viewMode === 'days') {
      setViewMode('months');
    } else if (viewMode === 'months') {
      setViewMode('years');
    } else if (viewMode === 'years') {
      setViewMode('days');
    }
  };

  const handlePresetSelect = (preset) => {
    const today = new Date();
    let target = new Date();
    if (preset === 'today') {
      target = today;
    } else if (preset === 'yesterday') {
      target.setDate(today.getDate() - 1);
    } else if (preset === '7days') {
      target.setDate(today.getDate() - 7);
    }

    setTempDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setViewMode('days');
  };

  // Rango de 12 años para la vista de años
  const yearsList = useMemo(() => {
    const start = viewYear - 5;
    return Array.from({ length: 12 }, (_, i) => start + i);
  }, [viewYear]);

  // Construir cuadrícula de días para el mes seleccionado
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo
    const daysInMonth = lastDayOfMonth.getDate();

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }
    return days;
  }, [viewYear, viewMonth]);

  const selectedDateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
  const effectiveDateStr = getEffectiveRateDate(selectedDateStr);
  const isWeekend = effectiveDateStr !== selectedDateStr;

  const handleConfirm = () => {
    onChange(selectedDateStr);
    onClose();
  };

  return (
    <ModalInApp isOpen={isOpen} onClose={onClose} title="🗓️ Calendario In-App de Mercado" maxWidth="380px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Presets Rápidos de Fecha */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => handlePresetSelect('today')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '8px',
              border: '1px solid #D1C9BF',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              cursor: 'pointer'
            }}
          >
            Hoy
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('yesterday')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '8px',
              border: '1px solid #D1C9BF',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              cursor: 'pointer'
            }}
          >
            Ayer
          </button>

          <button
            type="button"
            onClick={() => handlePresetSelect('7days')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '8px',
              border: '1px solid #D1C9BF',
              backgroundColor: '#FFFFFF',
              color: '#2C2C2C',
              cursor: 'pointer'
            }}
          >
            Hace 7 días
          </button>
        </div>

        {/* Barra Navegación Jerárquica: Días -> Meses -> Años */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#F8F6F0',
            borderRadius: '10px',
            border: '1px solid #E8E3D8'
          }}
        >
          <button
            type="button"
            onClick={handlePrevNav}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <ChevronLeft size={20} color="#555555" />
          </button>

          {/* Título Interactivo (Tap para cambiar nivel de vista) */}
          <button
            type="button"
            onClick={handleTitleClick}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: '800',
              color: '#2C2C2C',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: '#EFECE6'
            }}
          >
            <span>
              {viewMode === 'days' && `${MONTH_NAMES[viewMonth]} ${viewYear}`}
              {viewMode === 'months' && `${viewYear}`}
              {viewMode === 'years' && `${yearsList[0]} - ${yearsList[yearsList.length - 1]}`}
            </span>
            <ChevronDown size={14} color="#7F8C8D" />
          </button>

          <button
            type="button"
            onClick={handleNextNav}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <ChevronRight size={20} color="#555555" />
          </button>
        </div>

        {/* VISTA 1: DÍAS DEL MES */}
        {viewMode === 'days' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {WEEKDAY_NAMES.map(w => (
                <span key={w} style={{ fontSize: '10px', fontWeight: '700', color: '#7F8C8D' }}>
                  {w}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarDays.map((dateObj, idx) => {
                if (!dateObj) {
                  return <div key={`empty-${idx}`} style={{ height: '36px' }} />;
                }

                const dayNum = dateObj.getDate();
                const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDateStr;
                const isWeekendDay = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setTempDate(dateObj)}
                    style={{
                      height: '36px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #E05638' : '1px solid #E8E3D8',
                      backgroundColor: isSelected ? '#E05638' : (isWeekendDay ? '#FFF8E7' : '#FFFFFF'),
                      color: isSelected ? '#FFFFFF' : (isWeekendDay ? '#D35400' : '#2C2C2C'),
                      fontSize: '12px',
                      fontWeight: isSelected ? '800' : '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* VISTA 2: SELECCIÓN DE MESES */}
        {viewMode === 'months' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '6px 0' }}>
            {MONTH_SHORT.map((mName, mIdx) => {
              const isSelectedMonth = mIdx === viewMonth && viewYear === tempDate.getFullYear();
              return (
                <button
                  key={mName}
                  type="button"
                  onClick={() => {
                    setViewMonth(mIdx);
                    setViewMode('days');
                  }}
                  style={{
                    padding: '12px 6px',
                    fontSize: '13px',
                    fontWeight: isSelectedMonth ? '800' : '600',
                    borderRadius: '10px',
                    border: isSelectedMonth ? '2px solid #E05638' : '1px solid #E8E3D8',
                    backgroundColor: isSelectedMonth ? '#E05638' : '#FFFFFF',
                    color: isSelectedMonth ? '#FFFFFF' : '#2C2C2C',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        )}

        {/* VISTA 3: SELECCIÓN DE AÑOS */}
        {viewMode === 'years' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '6px 0' }}>
            {yearsList.map(yNum => {
              const isSelectedYear = yNum === viewYear;
              return (
                <button
                  key={yNum}
                  type="button"
                  onClick={() => {
                    setViewYear(yNum);
                    setViewMode('months');
                  }}
                  style={{
                    padding: '12px 6px',
                    fontSize: '13px',
                    fontWeight: isSelectedYear ? '800' : '600',
                    borderRadius: '10px',
                    border: isSelectedYear ? '2px solid #E05638' : '1px solid #E8E3D8',
                    backgroundColor: isSelectedYear ? '#E05638' : '#FFFFFF',
                    color: isSelectedYear ? '#FFFFFF' : '#2C2C2C',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {yNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Indicador de Regla de Fin de Semana */}
        {isWeekend && (
          <div style={{ fontSize: '11px', color: '#D35400', backgroundColor: '#FFF8E7', padding: '6px 10px', borderRadius: '8px', border: '1px solid #F39C12', fontWeight: '600' }}>
            ⚠️ Compra en fin de semana ({selectedDateStr}): Tasa de referencia del Lunes siguiente ({effectiveDateStr}).
          </div>
        )}

        {/* Botón de Confirmación */}
        <button
          type="button"
          onClick={handleConfirm}
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
            gap: '6px',
            boxShadow: '0 4px 12px rgba(46, 204, 113, 0.3)'
          }}
        >
          <Check size={18} />
          <span>Confirmar Fecha ({selectedDateStr})</span>
        </button>
      </div>
    </ModalInApp>
  );
}
