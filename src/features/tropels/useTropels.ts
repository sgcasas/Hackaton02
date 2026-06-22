import { useCallbackRef } from './useCallbackRef';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Page, Tropel } from '../../types/api';

export interface TropelQuery {
  page: number;
  size: number;
  sort: string;
  species?: string;
  vitalState?: string;
  sectorId?: string;
  q?: string;
}

interface TropelsState {
  data: Page<Tropel> | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Fetches /tropels for the given query.
 * Double defense against stale responses (CP2):
 *  1. AbortController aborts the in-flight request on cleanup / query change.
 *  2. A monotonic reqId guard discards any resolved response that is not the latest.
 */
export function useTropels(query: TropelQuery): TropelsState & { reload: () => void } {
  const [state, setState] = useState<TropelsState>({ data: null, loading: true, error: null });
  const reqId = useRef(0);
  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallbackRef(() => setReloadTick((t) => t + 1));

  const { page, size, sort, species, vitalState, sectorId, q } = query;

  useEffect(() => {
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .get<Page<Tropel>>('/tropels', {
        params: { page, size, sort, species, vitalState, sectorId, q },
        signal: ctrl.signal,
      })
      .then((res) => {
        if (id === reqId.current) setState({ data: res, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (id !== reqId.current) return;
        const apiErr =
          err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', 'Error de red');
        setState((s) => ({ ...s, loading: false, error: apiErr }));
      });

    return () => ctrl.abort();
  }, [page, size, sort, species, vitalState, sectorId, q, reloadTick]);

  return { ...state, reload };
}
