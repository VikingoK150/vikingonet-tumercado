import { useCallback } from 'react';

/**
 * Custom hook para feedback háptico seguro.
 * Intenta ejecutar navigator.vibrate con fallback silencioso en iOS/Webkit.
 */
export function useHaptic() {
  const triggerHaptic = useCallback((pattern = 40) => {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof window.navigator.vibrate === 'function') {
      try {
        window.navigator.vibrate(pattern);
      } catch (err) {
        // Fallback silencioso si el navegador bloquea la vibración
      }
    }
  }, []);

  return { triggerHaptic };
}
