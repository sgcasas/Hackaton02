import { useEffect, useRef } from 'react';

/**
 * Observes a sentinel element and calls `onIntersect` while it is visible.
 * `enabled=false` tears the observer down (e.g. when the list is exhausted).
 * `onIntersect` should be a stable callback (see useCallbackRef).
 */
export function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
  rootMargin = '300px',
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onIntersect, enabled, rootMargin]);

  return sentinelRef;
}
