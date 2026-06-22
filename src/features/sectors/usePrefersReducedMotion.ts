import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// Lectura puntual (para handlers que no son React, p.ej. antes de navegar).
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

// Hook reactivo: se actualiza si el usuario cambia la preferencia del SO en vivo.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
