import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, ErrorState, EmptyState } from '../../components/ui';
import { useSignalFeed, type SignalFilters } from './useSignalFeed';
import { useIntersectionObserver } from './useIntersectionObserver';
import { useCallbackRef } from '../tropels/useCallbackRef';
import { SignalCard } from './SignalCard';
import { SignalFilters as SignalFiltersBar, type SignalFilterValues } from './SignalFilters';
import { SignalDetailModal } from './SignalDetailModal';

const FILTER_KEYS = ['signalType', 'severity', 'status', 'q'] as const;

export default function SignalsFeedPage() {
  const [sp, setSp] = useSearchParams();

  const signalType = sp.get('signalType') ?? '';
  const severity = sp.get('severity') ?? '';
  const status = sp.get('status') ?? '';
  const q = sp.get('q') ?? '';
  const openSignalId = sp.get('signal');

  const filterValues: SignalFilterValues = { signalType, severity, status, q };

  const filters: SignalFilters = useMemo(
    () => ({
      signalType: signalType || undefined,
      severity: severity || undefined,
      status: status || undefined,
      q: q || undefined,
    }),
    [signalType, severity, status, q],
  );

  const { items, hasMore, loading, error, totalEstimate, loadMore, retry, replaceItem } =
    useSignalFeed(filters);

  const onIntersect = useCallbackRef(() => loadMore());
  // Stop observing when the list is exhausted or there is a pending error to resolve.
  const sentinelRef = useIntersectionObserver(onIntersect, hasMore && !error);

  // ---- URL writers (filters live in the URL; never lose them on refresh/share) ----
  function patchFilters(patch: Partial<SignalFilterValues>) {
    const next = new URLSearchParams(sp);
    for (const key of FILTER_KEYS) {
      if (!(key in patch)) continue;
      const value = patch[key];
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    setSp(next, { replace: false });
  }

  const openDetail = useCallbackRef((id: string) => {
    const next = new URLSearchParams(sp);
    next.set('signal', id);
    setSp(next, { replace: false });
  });

  const closeDetail = useCallbackRef(() => {
    const next = new URLSearchParams(sp);
    next.delete('signal');
    setSp(next, { replace: false });
  });

  const showInitialSpinner = loading && items.length === 0;
  const isEmpty = !loading && !error && items.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Feed de Señales</h1>
        {totalEstimate !== null && (
          <span className="text-sm text-slate-500">~{totalEstimate} señales</span>
        )}
      </header>

      <SignalFiltersBar
        values={filterValues}
        onChange={patchFilters}
        onSearch={(value) => patchFilters({ q: value })}
      />

      {showInitialSpinner && (
        <div className="flex justify-center p-10"><Spinner size="lg" /></div>
      )}

      {isEmpty && <EmptyState title="Sin señales" hint="Prueba con otros filtros." />}

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <SignalCard key={s.id} signal={s} onOpen={openDetail} />
          ))}
        </div>
      )}

      {/* Loading more (subsequent pages) */}
      {loading && items.length > 0 && (
        <div className="flex justify-center py-4"><Spinner size="md" /></div>
      )}

      {/* Error on a later page: keep loaded items, retry only the failed page */}
      {error && (
        <div className="py-2">
          <ErrorState
            message={error.message || 'No se pudo cargar más señales.'}
            onRetry={retry}
          />
        </div>
      )}

      {/* End-of-list marker */}
      {!hasMore && !error && items.length > 0 && (
        <p className="py-4 text-center text-sm text-slate-400">— Fin del feed —</p>
      )}

      {/* Sentinel for IntersectionObserver (real infinite scroll, no "load more" button) */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {openSignalId && (
        <SignalDetailModal id={openSignalId} onClose={closeDetail} onUpdated={replaceItem} />
      )}
    </div>
  );
}
