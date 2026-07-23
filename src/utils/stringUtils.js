/**
 * Normaliza cadenas para comparaciones de inventario y aliases:
 * Pasa a minúsculas, elimina espacios sobrantes al inicio/final y consolida espacios múltiples.
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compara dos cadenas de texto de forma insensible a mayúsculas y espacios.
 */
export function isNormalizedMatch(str1, str2) {
  return normalizeText(str1) === normalizeText(str2);
}
