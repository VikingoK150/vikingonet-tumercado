import React from 'react';

/**
 * Componente renderizador de Emojis nativos para TuMercadoVikingo.
 */
export function RenderIconOrEmoji({ icon, className = '', style = {} }) {
  if (!icon) {
    return <span className={className} style={style}>🛒</span>;
  }

  const iconStr = icon.toString().trim();
  return <span className={className} style={style}>{iconStr}</span>;
}
