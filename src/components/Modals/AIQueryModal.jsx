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
Tu objetivo es analizar entradas del usuario (texto en lenguaje natural, notas de voz o fotos de recibos/facturas/tickets de supermercado o listas de compras) y realizar las acciones correspondientes tanto en la despensa (TuMercadoVikingo) como en la contabilidad financiera (SaldoVikingo).

Inventario Actual del Usuario:
${currentInventoryText || 'No hay productos en el inventario.'}

Categorías actualmente en uso en la despensa:
${existingCategories.join(', ') || 'Alimentos, Limpieza, Bebidas, Otros'}

Fecha de hoy: ${todayStr}

### 🟢 Normalización Inteligente de Alimentos y Pesos:
- Transforma automáticamente gramos a kilos: 650g -> 0.65 kg, 500g / medio kilo -> 0.5 kg, 250g -> 0.25 kg, 800g -> 0.8 kg.
- Asigna unidades estándar: "kg", "unid", "L", "paq".
- Selecciona el emoji más adecuado para cada producto (ej. Cebolla 🧅, Tomate 🍅, Pera 🍐, Manzana 🍎, Papa 🥔, Carne 🥩, Pollo 🍗, Queso 🧀, Leche 🥛, Pan/Harina 🍞, Arroz 🍚).

### 🔴 REGISTRAR COMPRA / MOVIMIENTO EN SALDOVIKINGO:
Si el usuario envía la FOTO DE UNA FACTURA/TICKET DE COMPRA o un MENSAJE DE TEXTO/AUDIO indicando compras realizadas (ej. "Compré 650g de cebolla por 35 Bs y 2kg de tomate por 80 Bs", "Ayer hice mercado de 45$"):
1. DEBES generar una acción "type": "register_saldo_transaction":
   {
     "type": "register_saldo_transaction",
     "mainDescription": "Mercado",
     "category": "Alimentos/Automercado",
     "amount_original": 115,
     "currency_original": "VES",
     "date": "${todayStr}",
     "breakdown": [
       { "description": "0.65 kg Cebolla", "amount": 35 },
       { "description": "2 kg Tomate", "amount": 80 }
     ]
   }
2. Y DEBES incluir las acciones de inventario correspondientes ("update_stock" para sumar al stock existente o "create" para productos nuevos en TuMercadoVikingo).

Reglas Estrictas de Respuesta en JSON:
Devuelve UNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "reply": "Explicación breve y amigable en español de lo que realizaste o respondiste",
  "actions": [
    ... arreglo de acciones a ejecutar sobre la base de datos Supabase ...
  ]
}

Tipos de Acciones Soportadas en "actions":
1. Crear Producto Nuevo:
   {"type": "create", "name": "Nombre", "quantity": número, "unit": "unid"|"kg"|"L"|"paq", "min_threshold": número, "category": "Categoría", "emoji": "emoji"}

2. Registrar Movimiento Financiero en SaldoVikingo:
   {"type": "register_saldo_transaction", "mainDescription": "Mercado", "category": "Alimentos/Automercado", "amount_original": número, "currency_original": "VES"|"USD"|"USDT"|"EUR", "date": "YYYY-MM-DD", "breakdown": [{"description": "0.65 kg Cebolla", "amount": 35}]}

3. Organizar / Recategorizar / Modificar Atributos (Nombre, Categoría, Unidad, Emoji):
   {"type": "update_item", "target_id": "ID_DEL_ITEM", "fields": {"category": "NombreCategoría", "emoji": "emoji"}}

4. Cambiar Mínimo de Alerta (en TODOS los productos o en uno específico):
   {"type": "update_threshold", "target_all": true, "min_threshold": 0}
   o {"type": "update_threshold", "target_id": "ID_DEL_ITEM", "min_threshold": número}

5. Ajustar Stock Actual (Fijar valor exacto o sumar/restar):
   {"type": "update_stock", "target_id": "ID_DEL_ITEM", "target_name": "Nombre", "mode": "set"|"add", "quantity": número}

6. Eliminar Producto:
   {"type": "delete", "target_id": "ID_DEL_ITEM", "target_name": "Nombre"}

Si el usuario solo hace una pregunta ("¿Qué me falta?", "¿Tengo leche?"), la lista "actions" estará vacía [] y responderás en "reply".

CRÍTICO — FILTRADO DE TICKETS / FACTURAS DE COMPRA:
Si el usuario envía la foto de una factura o una lista con compras variadas, DEBES EXTRAER E INCLUIR ÚNICAMENTE los ítems que pertenezcan a la despensa y al supermercado (Alimentos, Víveres, Carnes, Pescados, Lácteos, Vegetales, Frutas, Bebidas, Dulces/Snacks, Limpieza e Higiene del Hogar).
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
        if (parsed.actions && parsed.actions.length > 0 && onProcessAIResult) {
          await onProcessAIResult(parsed.actions);
        }
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
          Escanea tu factura, ticket o describe tu compra en texto/audio (ej: "Compré 650g de cebolla por 35 Bs") para registrarla en SaldoVikingo y actualizar TuMercado.
        </p>

        {/* Input Text / Dictado */}
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Ej: 'Compré 650g de cebolla por 35 Bs y 2kg de papa por 80 Bs en el mercado'"
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

        {/* Botón Ejecutar */}
        <button 
          className="btn-modal btn-primary btn-ai-run"
          onClick={handleRunAI}
          disabled={loading || (!promptText.trim() && !selectedImage)}
        >
          {loading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
          <span>{loading ? 'Procesando con IA...' : 'Ejecutar Orden con IA'}</span>
        </button>

        {/* Respuesta de la IA */}
        {aiResponse && (
          <div className="ai-response-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <CheckCircle2 size={16} color="#2ECC71" />
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>Resultado de la IA:</h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '8px' }}>{aiResponse.reply}</p>

            {aiResponse.actions && aiResponse.actions.length > 0 && (
              <div className="ai-actions-preview" style={{ backgroundColor: '#E8F8F0', padding: '8px 12px', borderRadius: '10px', border: '1px solid #2ECC71' }}>
                <h5 style={{ fontSize: '11px', fontWeight: '700', color: '#27AE60', marginBottom: '4px' }}>
                  ⚡ Acciones Ejecutadas:
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#2C3E50' }}>
                  {aiResponse.actions.map((act, idx) => (
                    <li key={idx}>
                      {act.type === 'register_saldo_transaction' && (
                        <span>💳 Registrada compra desglosada en <strong>SaldoVikingo</strong> ({act.amount_original} {act.currency_original || 'VES'})</span>
                      )}
                      {act.type === 'update_threshold' && (
                        <span>🔄 Mínimo de alerta cambiado a <strong>{act.min_threshold}</strong> {act.target_all ? 'en TODOS los productos' : ''}</span>
                      )}
                      {(act.type === 'create' || act.type === 'add') && (
                        <span>➕ Creado {act.emoji} <strong>{act.name}</strong> ({act.quantity} {act.unit})</span>
                      )}
                      {act.type === 'update_stock' && (
                        <span>✏️ Stock de <strong>{act.target_id || act.target_name}</strong> {act.mode === 'add' ? `+${act.quantity}` : `actualizado a ${act.quantity}`}</span>
                      )}
                      {act.type === 'update_item' && (
                        <span>✏️ Actualizados campos en {act.target_all ? 'todos los productos' : 'producto'}</span>
                      )}
                      {act.type === 'delete' && (
                        <span>🗑️ Eliminado producto</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
