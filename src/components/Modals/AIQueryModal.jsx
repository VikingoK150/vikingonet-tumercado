import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Mic, Camera, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useHaptic } from '../../hooks/useHaptic';

export function AIQueryModal({ activeItems = [], onProcessAIResult, onClose }) {
  const { triggerHaptic } = useHaptic();

  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
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

Categorías actualmente en uso en la despensa:
${existingCategories.join(', ') || 'Alimentos, Limpieza, Bebidas, Otros'}

Fecha de hoy: ${todayStr}

### 🔴 REGLA DE ORO PARA FACTURAS / TICKETS / RECIBOS (FOTOS O TEXTO):
Si la entrada es la foto o texto de una factura o ticket de caja (ej. HIPERMERCADO FAMOSO, Automercado, Farmacia, etc.):
1. **Factura o Recibo:** Lee la Razón Social / Nombre del Comercio (ej. "Hipermercado Famoso C.A"), el Monto Total (ej. "TOTAL Bs 688,36") y la fecha.
2. **Productos y Pesos:** Extrae cada producto con su peso/unidad exacto (ej. "0,552xBs 1.247,02 000017 CEBOLLA P/KG" -> 0.552 kg Cebolla, monto 688.36 Bs).
3. **DEBES OBLIGATORIAMENTE GENERAR DOS TIPOS DE ACCIONES:**
   a) register_saldo_transaction: Para registrar la factura completa en SaldoVikingo con su desglose de items y precios.
   b) update_stock o create: Para sumar el peso/cantidad comprada a la despensa en TuMercadoVikingo.

### 🟢 Normalización Inteligente de Alimentos y Pesos:
- Transforma automáticamente gramos a kilos: 650g -> 0.65 kg, 552g -> 0.552 kg, 500g -> 0.5 kg, 250g -> 0.25 kg.
- Asigna unidades estándar: "kg", "unid", "L", "paq".
- Selecciona el emoji más adecuado para cada producto (ej. Cebolla 🧅, Tomate 🍅, Pera 🍐, Manzana 🍎, Papa 🥔, Carne 🥩, Pollo 🍗, Queso 🧀, Leche 🥛, Pan/Harina 🍞, Arroz 🍚).

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
   {"type": "register_saldo_transaction", "mainDescription": "NombreComercio O Mercado", "category": "Alimentos/Automercado", "amount_original": número, "currency_original": "VES"|"USD"|"USDT"|"EUR", "date": "YYYY-MM-DD", "breakdown": [{"description": "0.552 kg Cebolla", "amount": 688.36}]}

2. Crear Producto Nuevo en Despensa:
   {"type": "create", "name": "Nombre", "quantity": número, "unit": "unid"|"kg"|"L"|"paq", "min_threshold": número, "category": "Categoría", "emoji": "emoji"}

3. Ajustar Stock Actual (Fijar valor exacto o sumar/restar):
   {"type": "update_stock", "target_id": "ID_DEL_ITEM", "target_name": "Nombre", "mode": "set"|"add", "quantity": número}

4. Organizar / Recategorizar / Modificar Atributos:
   {"type": "update_item", "target_id": "ID_DEL_ITEM", "fields": {"category": "NombreCategoría", "emoji": "emoji"}}

5. Cambiar Mínimo de Alerta:
   {"type": "update_threshold", "target_all": true, "min_threshold": 0}

6. Eliminar Producto:
   {"type": "delete", "target_id": "ID_DEL_ITEM", "target_name": "Nombre"}
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
        // NO auto-ejecutar inmediatamente; requerir confirmación del usuario
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card ai-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="ai-modal-title">
            <Sparkles size={20} className="sparkles-icon" />
            <span>Asistente IA Vikingo</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="ai-modal-desc">
          Escanea tu factura o escribe tu compra. La IA detectará los montos para SaldoVikingo y el stock para TuMercado antes de pedirte confirmación.
        </p>

        {/* Input Text / Dictado */}
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Ej: 'Compré 650g de cebolla por 35 Bs y 2kg de papa por 80 Bs en Hipermercado Famoso'"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
        </div>

        {/* Adjuntar Imagen */}
        <div className="ai-file-row">
          <label className="btn-file-label">
            <Camera size={16} />
            <span>Escanear Factura / Ticket</span>
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {selectedImage && <span className="file-status">📷 Imagen cargada</span>}
        </div>

        {/* Botón Ejecutar Análisis */}
        <button 
          className="btn-modal btn-primary btn-ai-run"
          onClick={handleRunAI}
          disabled={loading || (!promptText.trim() && !selectedImage)}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
          <span>{loading ? 'Analizando Entrada con IA...' : 'Analizar Entrada con IA'}</span>
        </button>

        {/* Respuesta de la IA y Ventana de Confirmación antes de Aplicar */}
        {aiResponse && (
          <div className="ai-response-box" style={{ marginTop: '14px', border: '1.5px solid #2ECC71', backgroundColor: '#F8FDF9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <CheckCircle2 size={18} color="#2ECC71" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1E8449' }}>
                Resumen Detectado por la IA:
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: '#2C3E50', marginBottom: '10px', lineHeight: '1.4' }}>{aiResponse.reply}</p>

            {aiResponse.actions && aiResponse.actions.length > 0 ? (
              <div className="ai-actions-preview" style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', border: '1px solid #D5F5E3' }}>
                <h5 style={{ fontSize: '11px', fontWeight: '800', color: '#27AE60', marginBottom: '6px', textTransform: 'uppercase' }}>
                  📋 Movimientos a Confirmar y Aplicar:
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#2C3E50', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {aiResponse.actions.map((act, idx) => (
                    <li key={idx}>
                      {act.type === 'register_saldo_transaction' && (
                        <span>💳 <strong>SaldoVikingo:</strong> Gasto de <strong>{act.amount_original} {act.currency_original || 'VES'}</strong> en "{act.mainDescription || 'Mercado'}"</span>
                      )}
                      {act.type === 'update_threshold' && (
                        <span>🔄 <strong>TuMercado:</strong> Mínimo de alerta en <strong>{act.min_threshold}</strong> {act.target_all ? 'para TODOS' : ''}</span>
                      )}
                      {(act.type === 'create' || act.type === 'add') && (
                        <span>➕ <strong>TuMercado:</strong> Crear producto {act.emoji} <strong>{act.name}</strong> ({act.quantity} {act.unit})</span>
                      )}
                      {act.type === 'update_stock' && (
                        <span>✏️ <strong>TuMercado:</strong> Stock de <strong>{act.target_id || act.target_name}</strong> {act.mode === 'add' ? `+${act.quantity}` : `fijado en ${act.quantity}`}</span>
                      )}
                      {act.type === 'update_item' && (
                        <span>✏️ <strong>TuMercado:</strong> Actualizar datos en producto</span>
                      )}
                      {act.type === 'delete' && (
                        <span>🗑️ <strong>TuMercado:</strong> Eliminar producto</span>
                      )}
                    </li>
                  ))}
                </ul>

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
    </div>,
    document.body
  );
}
