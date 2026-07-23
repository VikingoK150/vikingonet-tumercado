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
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

      const currentInventoryText = activeItems.map(i => 
        `ID: "${i.id}" | Nombre: "${i.name}" | Cantidad Actual: ${i.quantity} ${i.unit} | Mínimo Alerta: ${i.min_threshold} | Categoría: ${i.category} | Emoji: ${i.emoji}`
      ).join('\n');

      const existingCategories = Array.from(new Set(activeItems.map(i => i.category || 'General')));

      const systemInstruction = `
Eres el Asistente Inteligente de TuMercadoVikingo, el gestor de despensa personal.
Tu objetivo es procesar órdenes, consultas, recategorizaciones y modificaciones masivas sobre el inventario actual.

Inventario Actual del Usuario:
${currentInventoryText || 'No hay productos en el inventario.'}

Categorías actualmente en uso en la despensa:
${existingCategories.join(', ') || 'Alimentos, Limpieza, Bebidas, Otros'}

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

2. Organizar / Recategorizar / Modificar Atributos (Nombre, Categoría, Unidad, Emoji):
   Si el usuario dice "organiza mis productos por categorías" o "recategoriza":
   Genera acciones {"type": "update_item", "target_id": "ID_DEL_ITEM", "fields": {"category": "NombreCategoría", "emoji": "emoji"}} para cada ítem.

3. Cambiar Mínimo de Alerta (en TODOS los productos o en uno específico):
   Si el usuario dice "ponle 0 de mínimo a todos" o "que la alerta sea 0 para todo":
   {"type": "update_threshold", "target_all": true, "min_threshold": 0}
   Si es para un solo producto:
   {"type": "update_threshold", "target_id": "ID_DEL_ITEM", "min_threshold": número}

4. Ajustar Stock Actual (Fijar valor exacto o sumar/restar):
   {"type": "update_stock", "target_id": "ID_DEL_ITEM", "mode": "set", "quantity": número}
   o {"type": "update_stock", "target_id": "ID_DEL_ITEM", "mode": "add", "quantity": número}

5. Eliminar Producto:
   {"type": "delete", "target_id": "ID_DEL_ITEM"}

Si el usuario solo hace una pregunta ("¿Qué me falta?", "¿Tengo leche?"), la lista "actions" estará vacía [] y responderás en "reply".

CRÍTICO — FILTRADO DE TICKETS / FACTURAS DE COMPRA:
Si el usuario envía la foto de una factura o una lista con compras variadas, DEBES EXTRAER E INCLUIR ÚNICAMENTE los ítems que pertenezcan a la despensa y al supermercado (Alimentos, Víveres, Carnes, Pescados, Lácteos, Vegetales, Frutas, Bebidas, Dulces/Snacks, Limpieza e Higiene del Hogar).

IGNORA Y OMITE COMPLETAMENTE de "actions" todo ítem que NO corresponda a mercado o despensa (tales como herramientas de ferretería, ropa, repuestos de autos, electrodomésticos, tecnología, gasolina, o servicios).
`;

      const contents = [];
      contents.push({ text: systemInstruction });
      if (promptText) contents.push({ text: `Orden del Usuario: ${promptText}` });

      if (selectedImage) {
        const base64Data = selectedImage.split(',')[1];
        contents.push({
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        });
      }

      const result = await model.generateContent(contents);
      const responseText = result.response.text();
      
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
          Procesa modificaciones masivas (ej. "pon 0 de mínimo a todo"), analiza tickets de compra o consulta tu despensa.
        </p>

        {/* Input Text / Dictado */}
        <div className="form-group">
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Ej: 'A todas haz que el mínimo de alerta sea 0', o 'Añadí 2 kg de carne'"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
          />
        </div>

        {/* Adjuntar Imagen */}
        <div className="ai-file-row">
          <label className="btn-file-label">
            <Camera size={16} />
            <span>Escanear Ticket/Foto</span>
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
          <span>{loading ? 'Ejecutando Acciones...' : 'Ejecutar Orden con IA'}</span>
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
                  ⚡ Acciones Ejecutadas en la Base de Datos:
                </h5>
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#2C3E50' }}>
                  {aiResponse.actions.map((act, idx) => (
                    <li key={idx}>
                      {act.type === 'update_threshold' && (
                        <span>🔄 Mínimo de alerta cambiado a <strong>{act.min_threshold}</strong> {act.target_all ? 'en TODOS los productos' : ''}</span>
                      )}
                      {(act.type === 'create' || act.type === 'add') && (
                        <span>➕ Creado {act.emoji} <strong>{act.name}</strong> ({act.quantity} {act.unit})</span>
                      )}
                      {act.type === 'update_stock' && (
                        <span>✏️ Stock de <strong>{act.target_id || act.target_name}</strong> actualizado a {act.quantity}</span>
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
