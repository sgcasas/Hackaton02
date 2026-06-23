import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Signal, SignalFeed } from '../../types/api';
import { useCallbackRef } from '../tropels/useCallbackRef';

export interface SignalFilters {
  signalType?: string;
  severity?: string;
  status?: string;
  q?: string;
}

const LIMIT = 15;

export interface SignalFeedState {
  items: Signal[];
  hasMore: boolean;
  loading: boolean;
  error: ApiError | null;
  totalEstimate: number | null;
  /** Triggered by the IntersectionObserver; stable identity. */
  loadMore: () => void;
  /** Retries ONLY the failed page (same cursor), keeping loaded items. */
  retry: () => void;
  /** Replaces an item by id (used by CP4 after a successful PATCH). */
  replaceItem: (updated: Signal) => void;
}

function toKey(f: SignalFilters): string {
  return JSON.stringify([f.signalType ?? '', f.severity ?? '', f.status ?? '', f.q ?? '']);
}

/**
 * Cursor-based infinite feed for /signals/feed.
 * Guarantees (CP3):
 *  - single load in flight (loadingRef)
 *  - dedup by id (seenIds)
 *  - filter change => abort in-flight + full reset; stale responses discarded by filter key
 *  - correct end-of-list (hasMore=false stops the observer)
 *  - error on a later page keeps loaded items and allows retrying the same cursor
 */
export function useSignalFeed(filters: SignalFilters): SignalFeedState {
  const [items, setItems] = useState<Signal[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [totalEstimate, setTotalEstimate] = useState<number | null>(null);

  // Control state lives in refs so loadMore never acts on a stale closure.
  const seenIds = useRef<Set<string>>(new Set());
  const cursor = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const activeCtrl = useRef<AbortController | null>(null);

  const filtersKey = toKey(filters);
  const filtersKeyRef = useRef(filtersKey);

  const loadMore = useCallbackRef(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const myKey = filtersKeyRef.current;
    const ctrl = new AbortController();
    activeCtrl.current = ctrl;

    try {
      const res = await api.get<SignalFeed>('/signals/feed', {
        params: {
          cursor: cursor.current ?? undefined,
          limit: LIMIT,
          signalType: filters.signalType,
          severity: filters.severity,
          status: filters.status,
          q: filters.q,
        },
        signal: ctrl.signal,
      });

      // Discard responses for a filter set that is no longer active.
      if (myKey !== filtersKeyRef.current) return;

      setItems((prev) => {
        const next = prev.slice();
        for (const it of res.items) {
          if (seenIds.current.has(it.id)) continue;
          seenIds.current.add(it.id);
          next.push(it);
        }
        return next;
      });
      cursor.current = res.nextCursor;
      hasMoreRef.current = res.hasMore;
      setHasMore(res.hasMore);
      setTotalEstimate(res.totalEstimate);
      setLoading(false);
      loadingRef.current = false;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return; // cancelled
      if (myKey !== filtersKeyRef.current) return; // stale filter
      setError(err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', 'Error de red'));
      setLoading(false);
      loadingRef.current = false; // allow retry; cursor untouched so the same page reloads
    }
  });

  const retry = useCallbackRef(() => {
    if (loadingRef.current) return;
    loadMore();
  });

  const replaceItem = useCallbackRef((updated: Signal) => {
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  });

  // Reset + load first page whenever filters change.
  useEffect(() => {
    filtersKeyRef.current = filtersKey;
    activeCtrl.current?.abort();
    seenIds.current = new Set();
    cursor.current = null;
    loadingRef.current = false;
    hasMoreRef.current = true;
    setItems([]);
    setHasMore(true);
    setError(null);
    setLoading(false);
    setTotalEstimate(null);
    loadMore();
    return () => activeCtrl.current?.abort();
  }, [filtersKey, loadMore]);

  return { items, hasMore, loading, error, totalEstimate, loadMore, retry, replaceItem };
}
