import { useCallback, useEffect, useRef, useState } from 'react';

interface ActiveStage {
  active: number;
  /** Asigna el ref del bloque narrativo i (callback ref). */
  setStageRef: (i: number) => (el: HTMLElement | null) => void;
  /** Mueve a la etapa i (teclado): actualiza estado + scroll al bloque. */
  goTo: (i: number, reducedMotion: boolean) => void;
}

// Detección de etapa activa con IntersectionObserver: la etapa cuyo bloque cruza
// la "línea central" del viewport es la activa. Es el comportamiento REAL del
// scrollytelling y funciona aunque no haya scroll-driven animations.
export function useActiveStage(count: number): ActiveStage {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setStageRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
    [],
  );

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    const els = refs.current.slice(0, count).filter((el): el is HTMLElement => el != null);
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [count]);

  const goTo = useCallback(
    (i: number, reducedMotion: boolean) => {
      const next = Math.max(0, Math.min(count - 1, i));
      setActive(next);
      refs.current[next]?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      });
    },
    [count],
  );

  return { active, setStageRef, goTo };
}
