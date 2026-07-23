import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Mic, Camera, Send, Loader2, CheckCircle2, Edit2, Trash2, ChevronDown, Eye } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useHaptic } from '../../hooks/useHaptic';
import { OFFICIAL_MARKET_CATEGORIES } from '../../constants/categories';
import { ModalInApp } from './ModalInApp';
import { CustomSelectModal } from './CustomSelectModal';

export function AIQueryModal({ activeItems = [], onProcessAIResult, onClose }) {
  const { triggerHaptic } = useHaptic();

  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  // Modales in-app de previsualización de imagen y selección de categoría
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [catSelectActionIdx, setCatSelectActionIdx] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFileName(file.name || 'factura_ticket.jpg');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAI = async () => {
    if (!promptText.trim() && !selectedImage) return;
    triggerHaptic(40);
    setLoading(true);
    setAiResponse(null);

    try {
      const apiKey = import.meta.env.VITE_SALDO_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Llave de API de Gemini no configurada.");

      const genAI = new GoogleGenerativeAI(apiKey);

      const currentInventoryText = activeItems.map(i => 
        `ID: "${i.id}" | Nombre: "${i.name}" | Cantidad Actual: ${i.quantity} ${i.unit} | Mínimo Alerta: ${i.min_threshold} | Categoría: ${i.category} | Emoji: ${i.emoji}`
      ).join('\n');

      const existingCategories = Array.from(new Set(activeItems.map(i => i.category || 'General')));
      const todayStr = new Date().toISOString().substring(0, 10);

      const systemInstruction = `
Eres el Asistente Inteligente Vikingo de TuMercadoVikingo y SaldoVikingo.
Tu objetivo es analizar entradas del usuario (texto en lenguaje natural, notas de voz o fotos de recibos/facturas/tickets del SENIAT o supermercado) y extraer con alta precisión los movimientos tanto para la despensa (TuMercadoVikingo) como para la contabilidad (SaldoVikingo).

Inventario Actual del Usuario:
${currentInventoryText || 'No hay productos en el inventario.'}

Categorías Oficiales Disponibles:
- Viandas y Proteínas (Carnes, Pollo, Pescado, Huevos)
- Secos y Víveres (Arroz, Pasta, Harina, Granos, Aceite, Enlatados)
- Vegetales y Frutas (Verduras, Hortalizas, Frutas)
- Dulces, Panadería y Snacks (Pan, Galletas, Chocolates, Postres)
- Bebidas y Lácteos (Agua, Leche, Queso, Jugos, Café, Refrescos)
- Limpieza e Higiene (Jabón, Detergente, Papel Higiénico)
- Otros

Fecha de hoy: ${todayStr}

### 🔴 REGLA DE ORO PARA FACTURAS / TICKETS / RECIBOS (FOTOS O TEXTO):
Si la entrada es la foto o texto de una factura o ticket de caja (ej. HIPERMERCADO FAMOSO, Automercado, Farmacia, etc.):
1. **Factura o Recibo:** Lee la Razón Social / Nombre del Comercio (ej. "Hipermercado Famoso C.A"), el Monto Total (ej. "TOTAL Bs 688,36") y la fecha.
2. **Productos, Pesos y Categoría:** Extrae cada producto con su peso/unidad exacto. Asigna estrictamente la categoría correcta:
   - "Agua", "Leche", "Queso", "Jugo" DEBEN ir en "Bebidas y Lácteos".
   - "Harina", "Arroz", "Pasta" DEBEN ir en "Secos y Víveres".
   - "Tomate", "Cebolla", "Papa" DEBEN ir en "Vegetales y Frutas".
3. **DEBES OBLIGATORIAMENTE GENERAR DOS TIPOS DE ACCIONES:**
   a) register_saldo_transaction: Para registrar la factura completa en SaldoVikingo con su desglose de items y precios.
   b) update_stock o create: Para sumar la cantidad comprada a la despensa en TuMercadoVikingo.

### 🟢 Normalización Inteligente de Alimentos y Pesos:
- Transforma automáticamente gramos a kilos: 650g -> 0.65 kg, 552g -> 0.552 kg, 500g -> 0.5 kg, 250g -> 0.25 kg.
- Asigna unidades estándar: "kg", "unid", "L", "paq".
- Selecciona el emoji más adecuado para cada producto (ej. Cebolla 🧅, Tomate 🍅, Pera 🍐, Manzana 🍎, Papa 🥔, Agua 🫗, Leche 🥛, Pan 🍞).

Reglas Estrictas de Respuesta en JSON:
Devuelve UNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "reply": "Explicación breve y amigable en español de lo que detectaste en la factura o mensaje",
  "actions": [
    ... arreglo de acciones a ejecutar ...
  ]
}

Tipos de Acciones Soportadas en "actions":
1. Registrar Movimiento Financiero en SaldoVikingo:
   {"type": "register_saldo_transaction", "mainDescription": "NombreComercio O Mercado", "category": "Alimentos/Automercado", "amount_original": número, "currency_original": "VES"|"USD"|"USDT"|"EUR", "date": "YYYY-MM-DD", "breakdown": [{"description": "Agua Minalba 5LT", "amount": 4462.06}]}

2. Crear Producto Nuevo en Despensa:
   {"type": "create", "name": "Nombre Exacto", "quantity": número, "unit": "unid"|"kg"|"L"|"paq", "min_threshold": número, "category": "Categoría Oficial", "emoji": "emoji"}

3. Ajustar Stock Actual (Fijar valor exacto o sumar/restar):
   {"type": "update_stock", "target_id": "ID_DEL_ITEM", "target_name": "Nombre", "mode": "set"|"add", "quantity": número}
`;

      const contents = [];
      contents.push({ text: systemInstruction });
      if (promptText) contents.push({ text: `Orden del Usuario: ${promptText}` });

      if (selectedImage) {
        const base64Data = selectedImage.split(',')[1];
        const mimeType = selectedImage.match(/data:(.*?);/)?.[1] || "image/jpeg";
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const modelsToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.1-flash-lite"];
      let responseText = null;
      let lastErr = null;

      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(contents);
          responseText = result.response.text();
          if (responseText) break;
        } catch (e) {
          lastErr = e;
          console.warn(`Fallback modelo ${modelName} falló:`, e);
        }
      }

      if (!responseText) {
        throw lastErr || new Error("No se pudo obtener respuesta del modelo de IA.");
      }

      // Extraer bloque JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAiResponse(parsed);
      } else {
        setAiResponse({ reply: responseText, actions: [] });
      }
    } catch (err) {
      console.error("Error ejecutando IA:", err);
      setAiResponse({ reply: `❌ Error de IA: ${err.message}`, actions: [] });
    } finally {
      setLoading(false);
    }
  };

  const [applying, setApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const handleRequestClose = (e) => {
    if (e) e.stopPropagation();
    if (aiResponse && aiResponse.actions && aiResponse.actions.length > 0 && !appliedSuccess) {
      triggerHaptic(30);
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Funciones para editar in-situ las acciones detectadas por la IA
  const handleUpdateActionField = (actIdx, field, value) => {
    setAiResponse(prev => {
      if (!prev || !prev.actions) return prev;
      const newActions = [...prev.actions];
      newActions[actIdx] = { ...newActions[actIdx], [field]: value };
      return { ...prev, actions: newActions };
    });
  };

  const handleUpdateBreakdownItem = (actIdx, bIdx, field, value) => {
    setAiResponse(prev => {
      if (!prev || !prev.actions) return prev;
      const newActions = [...prev.actions];
      const targetAct = { ...newActions[actIdx] };
      const newBreakdown = [...(targetAct.breakdown || [])];
      newBreakdown[bIdx] = { ...newBreakdown[bIdx], [field]: value };
      targetAct.breakdown = newBreakdown;
      newActions[actIdx] = targetAct;
      return { ...prev, actions: newActions };
    });
  };

  const handleRemoveAction = (actIdx) => {
    triggerHaptic(20);
    setAiResponse(prev => {
      if (!prev || !prev.actions) return prev;
      const newActions = prev.actions.filter((_, idx) => idx !== actIdx);
      return { ...prev, actions: newActions };
    });
  };

  const handleConfirmAndApply = async () => {
    if (!aiResponse || !aiResponse.actions || aiResponse.actions.length === 0) return;
    triggerHaptic(50);
    setApplying(true);
    try {
      if (onProcessAIResult) {
        await onProcessAIResult(aiResponse.actions);
      }
      setAppliedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      console.error("Error al aplicar acciones confirmadas por usuario:", e);
    } finally {
      setApplying(false);
    }
  };

  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={handleRequestClose}
      style={{
        position: 'fixed',
        inset: 0,
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
      <div 
        className="modal-card ai-modal-card" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
          boxSizing: 'border-box',
          margin: 'auto'
        }}
      >
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="ai-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '17px' }}>
            <Sparkles size={20} className="sparkles-icon" color="#2ECC71" />
            <span>Asistente IA Vikingo</span>
          </div>
          <button className="modal-close-btn" onClick={handleRequestClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#777' }}>
            <X size={20} />
          </button>
        </div>

        <p className="ai-modal-desc" style={{ fontSize: '13px', color: '#555555', margin: 0, lineHeight: '1.4' }}>
          Escanea tu factura o escribe tu compra. Puedes revisar y editar cualquier dato (nombre, categoría o precio) antes de confirmar.
        </p>

        {/* Input Text / Dictado */}
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Ej: 'Compré 650g de cebolla por 35 Bs y 1 Agua Minalba 5LT por 4462 Bs'"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1px solid #D1C9BF', fontSize: '13px' }}
          />
        </div>

        {/* Adjuntar Imagen con Thumbnail Preview Interactivo y Botón Eliminar */}
        <div className="ai-file-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
          <label className="btn-file-label" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', backgroundColor: '#F4F1EA', border: '1px solid #D8D2C5', fontSize: '12px', fontWeight: '700', color: '#444' }}>
            <Camera size={16} />
            <span>Escanear Factura / Ticket</span>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>

          {/* Previsualización tipo Thumbnail Interactivo (Hacer tap abre el modal de imagen completa) */}
          {selectedImage && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                backgroundColor: '#F8F6F0',
                border: '1.5px solid #2ECC71',
                borderRadius: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <img 
                src={selectedImage} 
                alt="Previsualización ticket" 
                onClick={() => { triggerHaptic(20); setShowImagePreview(true); }}
                style={{
                  width: '52px',
                  height: '52px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  border: '1px solid #D1C9BF',
                  cursor: 'pointer'
                }} 
                title="Toca para ver imagen completa"
              />
              <div 
                onClick={() => { triggerHaptic(20); setShowImagePreview(true); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#2C2C2C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  📷 {selectedFileName || 'Factura Cargada'} <Eye size={12} color="#27AE60" />
                </span>
                <span style={{ fontSize: '11px', color: '#27AE60', fontWeight: '600' }}>Toca para ver foto completa</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); triggerHaptic(20); setSelectedImage(null); setSelectedFileName(''); }}
                style={{
                  backgroundColor: '#FFEBEE',
                  color: '#E74C3C',
                  border: '1px solid #F5C6CB',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Eliminar imagen"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Botón Ejecutar Análisis con Mayor Altura y Estilo Prominente */}
        <button 
          className="btn-modal btn-primary btn-ai-run"
          onClick={handleRunAI}
          disabled={loading || (!promptText.trim() && !selectedImage)}
          style={{
            minHeight: '52px',
            padding: '14px 20px',
            fontSize: '15px',
            fontWeight: '800',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2ECC71 0%, #27AE60 100%)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 14px rgba(46, 204, 113, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: loading || (!promptText.trim() && !selectedImage) ? 'not-allowed' : 'pointer',
            opacity: loading || (!promptText.trim() && !selectedImage) ? 0.6 : 1,
            transition: 'all 0.2s ease',
            marginTop: '8px'
          }}
        >
          {loading ? <Loader2 size={20} className="spinner" /> : <Send size={20} />}
          <span>{loading ? 'Analizando Entrada con IA...' : 'Analizar Entrada con IA'}</span>
        </button>

        {/* Respuesta de la IA y Ventana de Confirmación Edición In-situ */}
        {aiResponse && (
          <div className="ai-response-box" style={{ marginTop: '14px', border: '1.5px solid #2ECC71', backgroundColor: '#F8FDF9', padding: '12px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <CheckCircle2 size={18} color="#2ECC71" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1E8449' }}>
                Resumen Detectado por la IA:
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: '#2C3E50', marginBottom: '10px', lineHeight: '1.4' }}>{aiResponse.reply}</p>

            {aiResponse.actions && aiResponse.actions.length > 0 ? (
              <div className="ai-actions-preview" style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '12px', border: '1px solid #D5F5E3' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h5 style={{ fontSize: '11px', fontWeight: '800', color: '#27AE60', margin: 0, textTransform: 'uppercase' }}>
                    ✏️ Movimientos (Puedes editarlos antes de aplicar):
                  </h5>
                  <span style={{ fontSize: '10px', color: '#666666', fontWeight: '600' }}>Toca para editar</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiResponse.actions.map((act, actIdx) => {
                    const matchedCatObj = OFFICIAL_MARKET_CATEGORIES.find(c => c.id === act.category);

                    return (
                      <div 
                        key={actIdx} 
                        style={{ 
                          backgroundColor: '#F9F8F6', 
                          border: '1px solid #E8E3D8', 
                          borderRadius: '10px', 
                          padding: '10px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '6px',
                          position: 'relative'
                        }}
                      >
                        {/* Botón para eliminar esta acción individual */}
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(actIdx)}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#E74C3C',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                          title="Descartar esta acción"
                        >
                          <Trash2 size={13} />
                        </button>

                        {/* Edición de Transacción SaldoVikingo */}
                        {act.type === 'register_saldo_transaction' && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#2980B9', display: 'block', marginBottom: '4px' }}>
                              💳 Movimiento en SaldoVikingo:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>Comercio / Concepto:</label>
                                <input
                                  type="text"
                                  value={act.mainDescription || ''}
                                  onChange={e => handleUpdateActionField(actIdx, 'mainDescription', e.target.value)}
                                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #D1C9BF', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>Monto Total ({act.currency_original || 'VES'}):</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={act.amount_original || ''}
                                  onChange={e => handleUpdateActionField(actIdx, 'amount_original', parseFloat(e.target.value) || 0)}
                                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #D1C9BF', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>

                            {/* Desglose de Items */}
                            {act.breakdown && act.breakdown.length > 0 && (
                              <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #E0DBCF' }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#777' }}>Desglose de Ítems:</span>
                                {act.breakdown.map((item, bIdx) => (
                                  <div key={bIdx} style={{ display: 'flex', gap: '4px', marginTop: '4px', alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      value={item.description || ''}
                                      onChange={e => handleUpdateBreakdownItem(actIdx, bIdx, 'description', e.target.value)}
                                      style={{ flex: 1, padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #D1C9BF' }}
                                    />
                                    <input
                                      type="number"
                                      step="any"
                                      value={item.amount || ''}
                                      onChange={e => handleUpdateBreakdownItem(actIdx, bIdx, 'amount', parseFloat(e.target.value) || 0)}
                                      style={{ width: '70px', padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid #D1C9BF', textAlign: 'right' }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Edición de Producto Creado o Actualizado en TuMercado */}
                        {(act.type === 'create' || act.type === 'add' || act.type === 'update_stock') && (
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#27AE60', display: 'block', marginBottom: '4px' }}>
                              🛒 Producto TuMercado ({act.type === 'update_stock' ? 'Actualizar Stock' : 'Crear Nuevo'}):
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '6px', marginBottom: '6px' }}>
                              <div>
                                <label style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>Nombre Producto:</label>
                                <input
                                  type="text"
                                  value={act.name || act.target_name || ''}
                                  onChange={e => {
                                    if (act.type === 'update_stock') handleUpdateActionField(actIdx, 'target_name', e.target.value);
                                    else handleUpdateActionField(actIdx, 'name', e.target.value);
                                  }}
                                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #D1C9BF', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '10px', color: '#555', fontWeight: '700' }}>Cantidad ({act.unit || 'unid'}):</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={act.quantity !== undefined ? act.quantity : 1}
                                  onChange={e => handleUpdateActionField(actIdx, 'quantity', parseFloat(e.target.value) || 0)}
                                  style={{ width: '100%', padding: '4px 6px', fontSize: '11px', fontWeight: '700', borderRadius: '6px', border: '1px solid #D1C9BF', boxSizing: 'border-box' }}
                                />
                              </div>
                            </div>

                            {/* Selector de Categoría Oficial en Modal In-App con Fondo Difuminado */}
                            <div>
                              <label style={{ fontSize: '10px', color: '#555', fontWeight: '700', marginBottom: '2px', display: 'block' }}>Categoría Oficial:</label>
                              <button
                                type="button"
                                onClick={() => { triggerHaptic(20); setCatSelectActionIdx(actIdx); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #2ECC71',
                                  backgroundColor: '#FFFFFF',
                                  color: '#2C2C2C',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  boxSizing: 'border-box'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{matchedCatObj?.icon || '🏷️'}</span>
                                  <span>{act.category || 'Otros'}</span>
                                </div>
                                <ChevronDown size={14} color="#777777" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Otro tipo de acciones */}
                        {act.type === 'update_threshold' && (
                          <div style={{ fontSize: '11px' }}>
                            <span>🔄 Mínimo de alerta: </span>
                            <input
                              type="number"
                              value={act.min_threshold || 0}
                              onChange={e => handleUpdateActionField(actIdx, 'min_threshold', parseFloat(e.target.value) || 0)}
                              style={{ width: '50px', padding: '2px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #D1C9BF' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón de Confirmación Definitiva */}
                <button
                  type="button"
                  onClick={handleConfirmAndApply}
                  disabled={applying || appliedSuccess}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: appliedSuccess ? '#27AE60' : '#2ECC71',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 8px rgba(46, 204, 113, 0.3)'
                  }}
                >
                  {applying ? (
                    <Loader2 size={16} className="spinner" />
                  ) : appliedSuccess ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>
                    {applying 
                      ? 'Aplicando Movimientos...' 
                      : appliedSuccess 
                      ? '¡Aplicado con Éxito!' 
                      : '⚡ Confirmar y Aplicar en SaldoVikingo y TuMercado'}
                  </span>
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: '#7F8C8D', margin: 0 }}>
                No se detectaron acciones de modificación. (Es una consulta informativa).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal In-App de Previsualización de Imagen Completa en Tamaño Grande */}
      {showImagePreview && selectedImage && (
        <ModalInApp
          isOpen={true}
          onClose={() => setShowImagePreview(false)}
          title="📷 Previsualización de Imagen"
          maxWidth="420px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <img
              src={selectedImage}
              alt="Factura o Ticket Completo"
              style={{
                width: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                borderRadius: '14px',
                border: '1px solid #D1C9BF',
                backgroundColor: '#1E1E1E'
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#2C2C2C', display: 'block' }}>
                {selectedFileName || 'Factura_Ticket.jpg'}
              </span>
              <span style={{ fontSize: '11px', color: '#666666' }}>
                Imagen adjuntada para análisis multimodal con la IA
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowImagePreview(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#2ECC71',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Cerrar Previsualización
            </button>
          </div>
        </ModalInApp>
      )}

      {/* Modal In-App de Selección de Categoría Oficial con Fondo Difuminado */}
      {catSelectActionIdx !== null && aiResponse?.actions?.[catSelectActionIdx] && (
        <CustomSelectModal
          isOpen={true}
          onClose={() => setCatSelectActionIdx(null)}
          title="Seleccionar Categoría Oficial"
          options={OFFICIAL_MARKET_CATEGORIES.map(c => ({
            value: c.id,
            label: c.name,
            icon: c.icon
          }))}
          value={aiResponse.actions[catSelectActionIdx].category || 'Otros'}
          onChange={(selectedCat) => {
            handleUpdateActionField(catSelectActionIdx, 'category', selectedCat);
            setCatSelectActionIdx(null);
          }}
        />
      )}

      {/* Modal In-App de Confirmación antes de salir si hay análisis de IA activo */}
      {showCloseConfirm && (
        <ModalInApp
          isOpen={true}
          onClose={() => setShowCloseConfirm(false)}
          title="⚠️ ¿Salir sin guardar?"
          maxWidth="340px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#555555', margin: 0, lineHeight: '1.4' }}>
              Tienes movimientos detectados por la IA pendientes de aplicar en TuMercado y SaldoVikingo.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #D1C9BF',
                  backgroundColor: '#F4F1EA',
                  color: '#2C2C2C',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={() => { setShowCloseConfirm(false); onClose(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#E74C3C',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Sí, Salir
              </button>
            </div>
          </div>
        </ModalInApp>
      )}
    </div>,
    document.body
  );
}
