import React, { useState, useMemo } from 'react';
import { ModalInApp } from './ModalInApp';
import { Search, ChevronDown, Plus, Check } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { RenderIconOrEmoji } from '../RenderIconOrEmoji';

// Función para normalizar texto (elimina tildes y pasa a minúsculas)
function removeAccents(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const MARKET_FOOD_CATEGORIES = [
  {
    id: 'store_pantry',
    name: 'Mercado y Despensa',
    icon: '🛒',
    items: [
      { emoji: '🛒', label: 'Carrito', keywords: ['carrito', 'mercado', 'compra', 'supermercado'] },
      { emoji: '🛍️', label: 'Bolsa', keywords: ['bolsa', 'compras'] },
      { emoji: '🥫', label: 'Lata / Atún', keywords: ['enlatado', 'lata', 'atun', 'salsa', 'conserva'] },
      { emoji: '📦', label: 'Caja Despensa', keywords: ['caja', 'despensa', 'paquete'] },
      { emoji: '🏷️', label: 'Etiqueta', keywords: ['etiqueta', 'oferta', 'precio'] }
    ]
  },
  {
    id: 'fruits_veg',
    name: 'Frutas y Vegetales',
    icon: '🍎',
    items: [
      { emoji: '🍎', label: 'Manzana', keywords: ['manzana', 'fruta', 'roja'] },
      { emoji: '🍏', label: 'Manzana Verde', keywords: ['manzana verde', 'fruta'] },
      { emoji: '🍐', label: 'Pera', keywords: ['pera', 'fruta'] },
      { emoji: '🍍', label: 'Piña', keywords: ['pina', 'piña', 'ananas', 'fruta'] },
      { emoji: '🍌', label: 'Cambur / Banana', keywords: ['cambur', 'banana', 'platano', 'fruta'] },
      { emoji: '🍉', label: 'Patilla / Sandía', keywords: ['patilla', 'sandia', 'fruta'] },
      { emoji: '🍈', label: 'Melón', keywords: ['melon', 'fruta'] },
      { emoji: '🍊', label: 'Naranja', keywords: ['naranja', 'mandarina', 'citrico', 'fruta'] },
      { emoji: '🍋', label: 'Limón', keywords: ['limon', 'citrico', 'fruta'] },
      { emoji: '🍇', label: 'Uva', keywords: ['uva', 'uvas', 'fruta'] },
      { emoji: '🥭', label: 'Mango', keywords: ['mango', 'fruta'] },
      { emoji: '🍑', label: 'Durazno', keywords: ['durazno', 'melocoton', 'fruta'] },
      { emoji: '🍒', label: 'Cereza', keywords: ['cereza', 'fruta'] },
      { emoji: '🍓', label: 'Fresa', keywords: ['fresa', 'fruta'] },
      { emoji: '🫐', label: 'Arándano', keywords: ['arandano', 'fruta'] },
      { emoji: '🥝', label: 'Kiwi', keywords: ['kiwi', 'fruta'] },
      { emoji: '🍅', label: 'Tomate', keywords: ['tomate', 'verdura', 'salsa'] },
      { emoji: '🍆', label: 'Berenjena', keywords: ['berenjena', 'verdura'] },
      { emoji: '🫒', label: 'Aceituna', keywords: ['aceituna', 'oliva'] },
      { emoji: '🥑', label: 'Aguacate', keywords: ['aguacate', 'palta', 'guacamole'] },
      { emoji: '🥔', label: 'Papa', keywords: ['papa', 'patata', 'tubérculo'] },
      { emoji: '🍠', label: 'Batata / Yuca', keywords: ['batata', 'camote', 'yuca', 'tubérculo'] },
      { emoji: '🥕', label: 'Zanahoria', keywords: ['zanahoria', 'verdura'] },
      { emoji: '🌽', label: 'Maíz / Jojoto', keywords: ['maiz', 'jojoto', 'choclo', 'harina pan'] },
      { emoji: '🌶️', label: 'Ají / Picante', keywords: ['aji', 'picante', 'chile'] },
      { emoji: '🫑', label: 'Pimentón', keywords: ['pimenton', 'pimiento'] },
      { emoji: '🥒', label: 'Pepino', keywords: ['pepino', 'ensalada'] },
      { emoji: '🥬', label: 'Lechuga', keywords: ['lechuga', 'ensalada'] },
      { emoji: '🥦', label: 'Brócoli', keywords: ['brocoli', 'verdura'] },
      { emoji: '🫛', label: 'Guisantes / Arvejas', keywords: ['guisante', 'arveja', 'poroto', 'chicharo'] },
      { emoji: '🫘', label: 'Caraotas / Frijoles', keywords: ['caraota', 'frijol', 'grano', 'habichuela'] },
      { emoji: '🧄', label: 'Ajo', keywords: ['ajo', 'aliño'] },
      { emoji: '🧅', label: 'Cebolla', keywords: ['cebolla', 'verdura'] },
      { emoji: '🍄', label: 'Champiñón', keywords: ['hongo', 'champiñon'] },
      { emoji: '🥜', label: 'Maní', keywords: ['mani', 'fruto seco'] },
      { emoji: '🌰', label: 'Nuez', keywords: ['nuez', 'avellana'] }
    ]
  },
  {
    id: 'meats_animals',
    name: 'Carnes y Animales Comestibles',
    icon: '🥩',
    items: [
      { emoji: '🥩', label: 'Carne / Bistec', keywords: ['carne', 'bistec', 'res', 'corte'] },
      { emoji: '🐄', label: 'Vaca / Res', keywords: ['vaca', 'res', 'vacuno', 'ganado', 'carne de res'] },
      { emoji: '🐖', label: 'Cerdo / Cochi', keywords: ['cerdo', 'marrano', 'cochino', 'puerco', 'chicharrón'] },
      { emoji: '🐓', label: 'Pollo / Gallo', keywords: ['gallo', 'pollo', 'gallina', 'ave'] },
      { emoji: '🦃', label: 'Pavo', keywords: ['pavo', 'pavito', 'ave'] },
      { emoji: '🐑', label: 'Cordero', keywords: ['oveja', 'cordero', 'carnero'] },
      { emoji: '🐐', label: 'Chivo / Cabra', keywords: ['cabra', 'chivo', 'cabrito'] },
      { emoji: '🦆', label: 'Pato', keywords: ['pato', 'ave'] },
      { emoji: '🐰', label: 'Conejo', keywords: ['conejo', 'carne de conejo'] },
      { emoji: '🐟', label: 'Pescado', keywords: ['pescado', 'pez', 'pescaderia', 'filete'] },
      { emoji: '🦐', label: 'Camarón', keywords: ['camaron', 'gambas', 'marisco'] },
      { emoji: '🦀', label: 'Cangrejo', keywords: ['cangrejo', 'jaiba', 'marisco'] },
      { emoji: '🦞', label: 'Langosta', keywords: ['langosta', 'marisco'] },
      { emoji: '🦑', label: 'Calamar / Pulpo', keywords: ['calamar', 'pulpo', 'marisco'] },
      { emoji: '🦪', label: 'Ostra / Almeja', keywords: ['ostra', 'almeja', 'marisco'] },
      { emoji: '🍗', label: 'Muslo Pollo', keywords: ['pollo', 'muslo', 'presa'] },
      { emoji: '🍖', label: 'Costilla', keywords: ['costilla', 'chuleta', 'cerdo'] },
      { emoji: '🥓', label: 'Tocineta', keywords: ['tocineta', 'bacon', 'tocino'] },
      { emoji: '🍕', label: 'Pizza', keywords: ['pizza', 'comida'] },
      { emoji: '🌭', label: 'Salchicha', keywords: ['perro caliente', 'salchicha'] },
      { emoji: '🍔', label: 'Hamburguesa', keywords: ['hamburguesa', 'carne'] },
      { emoji: '🌮', label: 'Taco', keywords: ['taco', 'carne'] },
      { emoji: '🌯', label: 'Burrito', keywords: ['burrito'] },
      { emoji: '🫔', label: 'Hallaca', keywords: ['hallaca', 'tamal'] },
      { emoji: '🥟', label: 'Empanada', keywords: ['empanada', 'pastelito', 'dumpling'] },
      { emoji: '🍲', label: 'Sopa / Sancocho', keywords: ['sopa', 'sancocho', 'caldo', 'guiso'] },
      { emoji: '🥗', label: 'Ensalada', keywords: ['ensalada', 'vegetales', 'verde'] },
      { emoji: '🥚', label: 'Huevo', keywords: ['huevo', 'huevos'] },
      { emoji: '🍳', label: 'Huevo Frito', keywords: ['huevo frito', 'desayuno'] }
    ]
  },
  {
    id: 'bakery_dairy',
    name: 'Panadería y Lácteos',
    icon: '🍞',
    items: [
      { emoji: '🍞', label: 'Pan', keywords: ['pan', 'panaderia', 'hogaza'] },
      { emoji: '🥐', label: 'Croissant', keywords: ['croissant', 'panaderia'] },
      { emoji: '🥖', label: 'Baguette', keywords: ['baguette', 'pan frances'] },
      { emoji: '🫓', label: 'Arepa', keywords: ['arepa', 'pan plano', 'tortilla'] },
      { emoji: '🥨', label: 'Pretzel', keywords: ['pretzel', 'panaderia'] },
      { emoji: '🥯', label: 'Bagel', keywords: ['bagel', 'panaderia'] },
      { emoji: '🥞', label: 'Panqueca', keywords: ['panqueca', 'pancake'] },
      { emoji: '🧇', label: 'Waffle', keywords: ['waffle'] },
      { emoji: '🧀', label: 'Queso', keywords: ['queso', 'lacteo'] },
      { emoji: '🥛', label: 'Leche', keywords: ['leche', 'lacteo', 'vaso de leche'] },
      { emoji: '🍼', label: 'Leche Bebé', keywords: ['biberon', 'tetero', 'leche bebe'] },
      { emoji: '🧈', label: 'Mantequilla', keywords: ['mantequilla', 'margarina'] },
      { emoji: '🧂', label: 'Sal / Aliño', keywords: ['sal', 'condimento', 'salero'] },
      { emoji: '🍚', label: 'Arroz', keywords: ['arroz', 'grano'] },
      { emoji: '🍝', label: 'Pasta / Fideos', keywords: ['pasta', 'espagueti', 'fideos'] }
    ]
  },
  {
    id: 'sweets_snacks',
    name: 'Dulces, Postres y Snacks',
    icon: '🍰',
    items: [
      { emoji: '🍫', label: 'Chocolate', keywords: ['chocolate', 'dulce', 'cacao'] },
      { emoji: '🍩', label: 'Dona', keywords: ['dona', 'rosquilla'] },
      { emoji: '🍪', label: 'Galleta', keywords: ['galleta', 'dulce'] },
      { emoji: '🎂', label: 'Torta', keywords: ['torta', 'pastel'] },
      { emoji: '🍰', label: 'Pastel', keywords: ['torta', 'dulce'] },
      { emoji: '🧁', label: 'Cupcake', keywords: ['cupcake', 'ponque'] },
      { emoji: '🥧', label: 'Pie / Pay', keywords: ['pie', 'pay', 'tarta'] },
      { emoji: '🍮', label: 'Flan / Quesillo', keywords: ['flan', 'quesillo', 'postre', 'dulce'] },
      { emoji: '🍬', label: 'Caramelo', keywords: ['caramelo', 'dulce'] },
      { emoji: '🍭', label: 'Chupeta', keywords: ['chupeta', 'paleta'] },
      { emoji: '🍯', label: 'Miel', keywords: ['miel', 'postre'] },
      { emoji: '🍿', label: 'Cotufas', keywords: ['cotufas', 'palomitas'] },
      { emoji: '🍦', label: 'Helado', keywords: ['helado', 'barquilla'] },
      { emoji: '🍨', label: 'Copa Helado', keywords: ['helado', 'postre'] }
    ]
  },
  {
    id: 'drinks',
    name: 'Bebidas y Licores',
    icon: '🧃',
    items: [
      { emoji: '🥛', label: 'Leche', keywords: ['leche', 'vaso'] },
      { emoji: '🍼', label: 'Tetero', keywords: ['tetero', 'bebe'] },
      { emoji: '🫖', label: 'Tetera', keywords: ['tetera', 'infusion'] },
      { emoji: '☕', label: 'Café', keywords: ['cafe', 'taza', 'desayuno'] },
      { emoji: '🍵', label: 'Té Verde', keywords: ['te', 'infusion'] },
      { emoji: '🧃', label: 'Jugo', keywords: ['jugo', 'juguito', 'cajita'] },
      { emoji: '🥤', label: 'Refresco', keywords: ['refresco', 'soda'] },
      { emoji: '🧋', label: 'Batido / Boba', keywords: ['batido', 'merengada', 'boba', 'malteada'] },
      { emoji: '🫗', label: 'Aceite / Líquido', keywords: ['aceite', 'vinagre', 'liquido'] },
      { emoji: '🍾', label: 'Champán', keywords: ['champan', 'sidra'] },
      { emoji: '🍷', label: 'Vino', keywords: ['vino', 'copa de vino'] },
      { emoji: '🍸', label: 'Cóctel', keywords: ['coctel', 'trago'] },
      { emoji: '🍹', label: 'Jugo Tropical', keywords: ['jugo', 'coctel'] },
      { emoji: '🍺', label: 'Cerveza', keywords: ['cerveza', 'tercio', 'licor'] },
      { emoji: '🍻', label: 'Cervezas', keywords: ['cervezas', 'brindis'] },
      { emoji: '🥂', label: 'Brindis', keywords: ['brindis', 'copas'] },
      { emoji: '🥃', label: 'Whisky / Ron', keywords: ['whisky', 'ron', 'licor'] },
      { emoji: '🧊', label: 'Hielo', keywords: ['hielo', 'cubito'] }
    ]
  },
  {
    id: 'cleaning_home',
    name: 'Limpieza e Higiene',
    icon: '🧼',
    items: [
      { emoji: '🧼', label: 'Jabón', keywords: ['jabon', 'limpieza', 'baño'] },
      { emoji: '🧻', label: 'Papel Higiénico', keywords: ['papel higienico', 'papel de baño'] },
      { emoji: '🧹', label: 'Escoba', keywords: ['escoba', 'limpieza', 'barrer'] },
      { emoji: '🧽', label: 'Esponja', keywords: ['esponja', 'fregar', 'lavaplatos'] },
      { emoji: '🧴', label: 'Champú / Loción', keywords: ['champu', 'shampoo', 'crema', 'locion'] },
      { emoji: '🧺', label: 'Lavandería', keywords: ['ropa', 'lavanderia'] },
      { emoji: '🪥', label: 'Cepillo Dientes', keywords: ['cepillo de dientes', 'crema dental'] },
      { emoji: '🪒', label: 'Afeitadora', keywords: ['afeitadora', 'hojilla'] },
      { emoji: '🪣', label: 'Balde / Tobobo', keywords: ['tobobo', 'balde'] },
      { emoji: '🧯', label: 'Extintor', keywords: ['extintor', 'seguridad'] },
      { emoji: '🪠', label: 'Destapador', keywords: ['destapador', 'plomeria'] }
    ]
  }
];

const ALL_FOOD_ITEMS = MARKET_FOOD_CATEGORIES.flatMap(c => c.items);
const ALL_CATEGORY = {
  id: 'all',
  name: 'Todos los Emojis',
  icon: '✨',
  items: ALL_FOOD_ITEMS
};
const FULL_CATEGORY_LIST = [ALL_CATEGORY, ...MARKET_FOOD_CATEGORIES];

export function EmojiPickerModal({ isOpen, onClose, selectedIcon, onSelectIcon }) {
  const { triggerHaptic } = useHaptic();
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategorySelectModal, setShowCategorySelectModal] = useState(false);

  const currentCategory = useMemo(() => {
    return FULL_CATEGORY_LIST.find(c => c.id === activeCategoryTab) || ALL_CATEGORY;
  }, [activeCategoryTab]);

  // Buscador Inteligente en Español con etiquetas descriptivas
  const filteredCategories = useMemo(() => {
    const queryNorm = removeAccents(searchQuery);
    
    if (!queryNorm) {
      return [currentCategory];
    }

    return FULL_CATEGORY_LIST.map(cat => {
      const matchingItems = cat.items.filter(item => {
        const labelClean = removeAccents(item.label);
        const emojiClean = removeAccents(item.emoji);
        if (labelClean.includes(queryNorm) || emojiClean.includes(queryNorm)) return true;

        const keywords = item.keywords || [];
        return keywords.some(kw => removeAccents(kw).includes(queryNorm));
      });

      return {
        ...cat,
        items: matchingItems
      };
    }).filter(cat => cat.items.length > 0);
  }, [searchQuery, activeCategoryTab, currentCategory]);

  const handleChoose = (icon) => {
    triggerHaptic(20);
    onSelectIcon(icon);
    onClose();
  };

  return (
    <>
      <ModalInApp isOpen={isOpen} onClose={onClose} title="Catálogo de Emojis de Mercado" maxWidth="430px">
        {/* Campo de búsqueda inteligente en Español */}
        <div className="search-input-wrapper" style={{ marginBottom: '8px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="modal-search-input"
            placeholder="Buscar en español (ej. 'vaca', 'cerdo', 'leche', 'carne')..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Selector de Categoría en Modal In-App */}
        {!searchQuery && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
              Categoría de Emojis
            </label>
            <button
              type="button"
              className="custom-select-trigger"
              onClick={() => { triggerHaptic(20); setShowCategorySelectModal(true); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#F8F6F0',
                border: '1px solid #E8E3D8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>{currentCategory.icon}</span>
                <span>{currentCategory.name}</span>
              </div>
              <ChevronDown size={16} color="var(--text-secondary)" />
            </button>
          </div>
        )}

        {/* Botón limpio de Emoji Personalizado */}
        {searchQuery.trim() && (
          <button
            type="button"
            onClick={() => handleChoose(searchQuery.trim())}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--color-terracota)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            <Plus size={16} />
            <span>+ Emoji Personalizado</span>
          </button>
        )}

        {/* Grid de Emojis con Nombres en Negrita Abajo */}
        <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
          {filteredCategories.length > 0 ? (
            filteredCategories.map(cat => (
              <div key={cat.id} style={{ marginBottom: '12px' }}>
                {searchQuery && (
                  <h4 style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {cat.icon} {cat.name}
                  </h4>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {cat.items.map(item => {
                    const isSelected = selectedIcon === item.emoji;
                    return (
                      <button
                        key={item.emoji + item.label}
                        type="button"
                        onClick={() => handleChoose(item.emoji)}
                        style={{
                          height: '62px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid var(--color-terracota)' : '1px solid #EAE5D9',
                          backgroundColor: isSelected ? '#FDEEEB' : '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px 2px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'transform 0.1s ease',
                          overflow: 'hidden'
                        }}
                      >
                        <RenderIconOrEmoji icon={item.emoji} style={{ fontSize: '22px' }} />
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            fontWeight: '700', 
                            color: isSelected ? 'var(--color-terracota)' : 'var(--text-primary)', 
                            marginTop: '2px', 
                            textAlign: 'center', 
                            width: '100%', 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis' 
                          }}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No encontramos coincidencias para "{searchQuery}". <br />
              ¡Presiona el botón de arriba para usarlo directamente!
            </div>
          )}
        </div>
      </ModalInApp>

      {/* Modal In-App Desplegable de Selección de Categoría */}
      {showCategorySelectModal && (
        <ModalInApp
          isOpen={true}
          onClose={() => setShowCategorySelectModal(false)}
          title="Seleccionar Categoría"
          maxWidth="340px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FULL_CATEGORY_LIST.map(cat => {
              const isSelected = cat.id === activeCategoryTab;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveCategoryTab(cat.id);
                    setShowCategorySelectModal(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '2px solid var(--color-terracota)' : '1px solid #E8E3D8',
                    backgroundColor: isSelected ? '#FDEEEB' : '#F8F6F0',
                    color: isSelected ? 'var(--color-terracota)' : 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  {isSelected && <Check size={18} color="var(--color-terracota)" />}
                </button>
              );
            })}
          </div>
        </ModalInApp>
      )}
    </>
  );
}
