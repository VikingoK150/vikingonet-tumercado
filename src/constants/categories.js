/**
 * Categorías Oficiales Estandarizadas para TuMercadoVikingo
 * Coincidentes con la clasificación de WhatsApp/Telegram
 */

export const OFFICIAL_MARKET_CATEGORIES = [
  { 
    id: 'Viandas y Proteínas', 
    name: 'Viandas y Proteínas', 
    icon: '🥩', 
    description: 'Carnes, pollo, pescado, mariscos, huevos, embutidos' 
  },
  { 
    id: 'Secos y Víveres', 
    name: 'Secos y Víveres', 
    icon: '🌾', 
    description: 'Arroz, pasta, harina, enlatados, aceite, sal, granos, azucar' 
  },
  { 
    id: 'Vegetales y Frutas', 
    name: 'Vegetales y Frutas', 
    icon: '🥦', 
    description: 'Verduras, hortalizas, frutas, tubérculos' 
  },
  { 
    id: 'Dulces, Panadería y Snacks', 
    name: 'Dulces, Panadería y Snacks', 
    icon: '🍿', 
    description: 'Pan, galletas, chocolates, postres, snacks' 
  },
  { 
    id: 'Bebidas y Lácteos', 
    name: 'Bebidas y Lácteos', 
    icon: '🧃', 
    description: 'Leche, quesos, mantequilla, jugos, café, té, licores' 
  },
  { 
    id: 'Limpieza e Higiene', 
    name: 'Limpieza e Higiene', 
    icon: '🧼', 
    description: 'Jabón, detergentes, papel higiénico, aseo personal' 
  },
  { 
    id: 'Otros', 
    name: 'Otros Productos', 
    icon: '📦', 
    description: 'Artículos y accesorios varios' 
  }
];

/**
 * Normaliza texto eliminando tildes y pasando a minúsculas
 */
function removeAccents(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Clasifica un producto en una de las 7 Categorías Oficiales
 */
export function classifyItemCategory(item) {
  if (!item) return 'Otros';
  const name = removeAccents(item.name || '');
  const cat = removeAccents(item.category || '');
  const emoji = item.emoji || '';

  // Coincidencia exacta si ya tiene el nombre oficial
  const exactMatch = OFFICIAL_MARKET_CATEGORIES.find(c => removeAccents(c.id) === cat || removeAccents(c.name) === cat);
  if (exactMatch) return exactMatch.id;

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
    return 'Viandas y Proteínas';
  }

  // 2. SECOS Y VÍVERES
  const secosKeywords = [
    'harina', 'arroz', 'espagueti', 'pasta', 'azucar', 'sal', 'grano', 'caraota', 
    'frijol', 'lenteja', 'garbanzo', 'avena', 'cereal', 'aceite', 'manteca', 'vinagre', 
    'aliño', 'condimento', 'cubito', 'salsa', 'mayonesa', 'mostaza', 'ketchup', 'seco', 'viveres'
  ];
  const secosEmojis = ['🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🌾', '🍚', '🍝', '🥣', '🧂', '🥫'];
  if (secosKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || secosEmojis.includes(emoji)) {
    return 'Secos y Víveres';
  }

  // 3. VEGETALES Y FRUTAS
  const vegKeywords = [
    'tomate', 'cebolla', 'papa', 'patata', 'zanahoria', 'lechuga', 'pepino', 'pimenton', 
    'pimiento', 'aji', 'chile', 'ajo', 'plátano', 'platano', 'cambur', 'banana', 'manzana', 
    'pera', 'aguacate', 'palta', 'durazno', 'fresa', 'limon', 'naranja', 'uva', 'patilla', 
    'melon', 'piña', 'vegetal', 'fruta', 'verdura', 'batata', 'yuca'
  ];
  const vegEmojis = ['🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🍆', '🍠', '🫛', '🫘'];
  if (vegKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || vegEmojis.includes(emoji)) {
    return 'Vegetales y Frutas';
  }

  // 4. DULCES, PANADERÍA Y SNACKS
  const dulcesKeywords = [
    'galleta', 'pan', 'pan arabe', 'pan de molde', 'chocolate', 'cacao', 'dona', 'torta', 
    'pastel', 'cotufas', 'palomitas', 'chupeta', 'caramelo', 'dulce', 'snack', 'doritos', 
    'papas fritas', 'mermelada', 'miel', 'helado', 'postre', 'ponque', 'cupcake'
  ];
  const dulcesEmojis = ['🍫', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍬', '🍭', '🍯', '🍿', '🍦', '🍨', '🍮'];
  if (dulcesKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || dulcesEmojis.includes(emoji)) {
    return 'Dulces, Panadería y Snacks';
  }

  // 5. BEBIDAS Y LÁCTEOS
  const bebidasKeywords = [
    'leche', 'lacteo', 'queso', 'mantequilla', 'margarina', 'tetero', 'jugo', 'juguito', 
    'refresco', 'soda', 'cafe', 'te', 'infusion', 'agua', 'cerveza', 'tercio', 'vino', 
    'ron', 'whisky', 'licor', 'bebida'
  ];
  const bebidasEmojis = ['🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧊', '🧀', '🧈', '🫗'];
  if (bebidasKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || bebidasEmojis.includes(emoji)) {
    return 'Bebidas y Lácteos';
  }

  // 6. LIMPIEZA E HIGIENE
  const limpiezaKeywords = [
    'jabon', 'papel', 'papel higienico', 'escoba', 'esponja', 'champu', 'shampoo', 
    'lavaplatos', 'cloro', 'detergente', 'suavizante', 'desinfectante', 'desodorante', 
    'crema dental', 'afeitar', 'limpieza', 'higiene', 'baño'
  ];
  const limpiezaEmojis = ['🧼', '🧻', '🧹', '🧽', '🧴', '🧺', '🪥', '🪒', '🪣', '🧯', '🪠'];
  if (limpiezaKeywords.some(kw => name.includes(kw) || cat.includes(kw)) || limpiezaEmojis.includes(emoji)) {
    return 'Limpieza e Higiene';
  }

  // 7. OTROS
  return 'Otros';
}
