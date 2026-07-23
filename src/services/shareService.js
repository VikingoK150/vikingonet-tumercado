/**
 * Servicio de Formateo y Compartido de Lista de Compras / Inventario
 * Clasificación Inteligente por categorías típicas de mercado (Viandas, Secos, Vegetales, Dulces/Snacks, Bebidas, Limpieza, Otros).
 */

// Función para normalizar texto (elimina tildes y pasa a minúsculas)
function removeAccents(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Clasifica un producto en una categoría de mercado reconocible.
 * @param {Object} item 
 * @returns {string} Categoría formateada con emoji
 */
function classifyItemForExport(item) {
  const name = removeAccents(item.name || '');
  const cat = removeAccents(item.category || '');
  const emoji = item.emoji || '';

  // 1. VIANDAS Y PROTEÍNAS
  const viandasKeywords = [
    'carne', 'bistec', 'res', 'vacuno', 'pollo', 'gallina', 'huevo', 'huevos', 'pescado', 
    'pez', 'cerdo', 'marrano', 'cochino', 'puerco', 'chuleta', 'costilla', 'tocineta', 
    'bacon', 'marisco', 'camaron', 'cangrejo', 'langosta', 'calamar', 'pulpo', 'atun', 
    'sardina', 'pavo', 'chivo', 'cabra', 'cordero', 'pato', 'conejo', 'salchicha', 
    'hamburguesa', 'vianda', 'proteina'
  ];
  const viandasEmojis = ['🥩', '🐄', '🐖', '🐓', '🦃', '🐑', '🐐', '🦆', '🐰', '🐟', '🦐', '🦀', '🦞', '🦑', '🦪', '🍗', '🍖', '🥓', '🥚', '🍳'];
  if (viandasKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || viandasEmojis.includes(emoji)) {
    return '🥩 VIANDAS Y PROTEÍNAS';
  }

  // 2. SECOS Y VÍVERES
  const secosKeywords = [
    'harina', 'arroz', 'espagueti', 'pasta', 'azucar', 'sal', 'grano', 'caraota', 
    'frijol', 'lenteja', 'garbanzo', 'avena', 'cereal', 'aceite', 'manteca', 'vinagre', 
    'aliño', 'condimento', 'cubito', 'salsa', 'mayonesa', 'mostaza', 'ketchup', 'seco', 'viveres'
  ];
  const secosEmojis = ['🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🌾', '🍚', '🍝', '🥣', '🧂', '🥫'];
  if (secosKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || secosEmojis.includes(emoji)) {
    return '🌾 SECOS Y VÍVERES';
  }

  // 3. VEGETALES Y FRUTAS
  const vegKeywords = [
    'tomate', 'cebolla', 'papa', 'patata', 'zanahoria', 'lechuga', 'pepino', 'pimenton', 
    'pimiento', 'aji', 'chile', 'ajo', 'plátano', 'platano', 'cambur', 'banana', 'manzana', 
    'pera', 'aguacate', 'palta', 'durazno', 'fresa', 'limon', 'naranja', 'uva', 'patilla', 
    'melon', 'piña', 'vegetal', 'fruta', 'verdura'
  ];
  const vegEmojis = ['🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄'];
  if (vegKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || vegEmojis.includes(emoji)) {
    return '🥦 VEGETALES Y FRUTAS';
  }

  // 4. DULCES, PANADERÍA Y SNACKS
  const dulcesKeywords = [
    'galleta', 'pan', 'pan arabe', 'pan de molde', 'chocolate', 'cacao', 'dona', 'torta', 
    'pastel', 'cotufas', 'palomitas', 'chupeta', 'caramelo', 'dulce', 'snack', 'doritos', 
    'papas fritas', 'mermelada', 'miel', 'helado', 'postre', 'ponque', 'cupcake'
  ];
  const dulcesEmojis = ['🍫', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍬', '🍭', '🍯', '🍿', '🍦', '🍨'];
  if (dulcesKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || dulcesEmojis.includes(emoji)) {
    return '🍿 DULCES, PANADERÍA Y SNACKS';
  }

  // 5. BEBIDAS Y LÁCTEOS
  const bebidasKeywords = [
    'leche', 'lacteo', 'queso', 'mantequilla', 'margarina', 'tetero', 'jugo', 'juguito', 
    'refresco', 'soda', 'cafe', 'te', 'infusion', 'agua', 'cerveza', 'tercio', 'vino', 
    'ron', 'whisky', 'licor', 'bebida'
  ];
  const bebidasEmojis = ['🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧊', '🧀', '🧈'];
  if (bebidasKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || bebidasEmojis.includes(emoji)) {
    return '🧃 BEBIDAS Y LÁCTEOS';
  }

  // 6. LIMPIEZA E HIGIENE
  const limpiezaKeywords = [
    'jabon', 'papel', 'papel higienico', 'escoba', 'esponja', 'champu', 'shampoo', 
    'lavaplatos', 'cloro', 'detergente', 'suavizante', 'desinfectante', 'desodorante', 
    'crema dental', 'afeitar', 'limpieza', 'higiene', 'baño'
  ];
  const limpiezaEmojis = ['🧼', '🧻', '🧹', '🧽', '🧴', '🧺', '🪥', '🪒', '🪣', '🧯', '🪠'];
  if (limpiezaKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || limpiezaEmojis.includes(emoji)) {
    return '🧼 LIMPIEZA E HIGIENE';
  }

  // 7. OTROS
  return '📦 OTROS';
}

/**
 * Genera el texto formateado en Markdown para WhatsApp/Telegram.
 * @param {Array} items Lista de productos del inventario
 * @param {'missing' | 'available' | 'all'} mode 'missing' = Solo lo que falta, 'available' = Solo disponible, 'all' = Inventario completo
 */
export const generateMarketText = (items, mode = 'missing') => {
  if (!items || !Array.isArray(items)) return '';

  let filtered = items;
  if (mode === 'missing') {
    filtered = items.filter(i => (i.quantity || 0) <= (i.min_threshold || 1));
  } else if (mode === 'available') {
    filtered = items.filter(i => (i.quantity || 0) > 0);
  }

  if (filtered.length === 0) {
    if (mode === 'available') return "📦 No hay productos disponibles en la despensa actualmente.";
    return "🎉 ¡La despensa está completa! No hace falta comprar nada.";
  }

  // Agrupar productos por las categorías de mercado configuradas
  const grouped = filtered.reduce((acc, item) => {
    const cat = classifyItemForExport(item);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const dateStr = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let text = `🛒 *LISTA DE DESPENSA — TuMercadoVikingo*\n📅 _${dateStr}_\n\n`;
  if (mode === 'missing') {
    text = `🛒 *LISTA DE COMPRAS — TuMercadoVikingo*\n📅 _${dateStr}_\n\n⚠️ *PENDIENTES POR COMPRAR:*\n\n`;
  } else if (mode === 'available') {
    text = `✅ *PRODUCTOS DISPONIBLES EN DESPENSA*\n📅 _${dateStr}_\n\n`;
  } else {
    text = `📦 *INVENTARIO GENERAL DE DESPENSA*\n📅 _${dateStr}_\n\n`;
  }

  // Orden canónico de presentación
  const CATEGORY_ORDER = [
    '🥩 VIANDAS Y PROTEÍNAS',
    '🌾 SECOS Y VÍVERES',
    '🥦 VEGETALES Y FRUTAS',
    '🍿 DULCES, PANADERÍA Y SNACKS',
    '🧃 BEBIDAS Y LÁCTEOS',
    '🧼 LIMPIEZA E HIGIENE',
    '📦 OTROS'
  ];

  for (const catName of CATEGORY_ORDER) {
    if (grouped[catName] && grouped[catName].length > 0) {
      text += `*${catName}*\n`;
      grouped[catName].forEach(item => {
        const emoji = item.emoji || '🛒';
        const qty = item.quantity || 0;
        const unit = item.unit || 'unid';

        let statusText = '';
        if (mode === 'missing') {
          if (qty === 0) {
            statusText = '*_Agotado_*';
          } else {
            const needed = Math.max(0, (item.min_threshold || 1) - qty);
            statusText = `Falta: ${needed} ${unit} (Tengo: ${qty})`;
          }
        } else {
          statusText = qty === 0 ? '*_Agotado_*' : `${qty} ${unit}`;
        }

        text += `  • ${emoji} *${item.name}* (${statusText})\n`;
      });
      text += `\n`;
    }
  }

  text += `📌 *Total de ítems:* ${filtered.length}\n`;
  text += `_Generado desde TuMercadoVikingo_`;

  return text;
};

/**
 * Dispara la Web Share API nativa (WhatsApp/Telegram en móviles)
 * o realiza un fallback al portapapeles en computadoras.
 * @param {string} text Texto formateado a compartir
 */
export const shareToApps = async (text) => {
  if (!text) return { success: false, error: 'Texto vacío' };

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Lista de Compras — TuMercadoVikingo',
        text: text
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error al compartir nativamente:', err);
      } else {
        return { success: false, method: 'cancelled' };
      }
    }
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { success: true, method: 'clipboard' };
    }
  } catch (err) {
    console.error('Error copiando al portapapeles:', err);
    return { success: false, error: err };
  }
};
