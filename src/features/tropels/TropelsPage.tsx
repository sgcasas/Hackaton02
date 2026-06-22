import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner, ErrorState, EmptyState } from '../../components/ui';
import { useTropels } from './useTropels';
import { useSectors } from './useSectors';
import { TropelFilters, type TropelFilterValues } from './TropelFilters';
import { TropelRow } from './TropelRow';
import { DEFAULT_SORT, DEFAULT_SIZE, isValidSize, isValidSort } from './constants';

const FILTER_KEYS = ['species', 'vitalState', 'sectorId', 'q', 'sort', 'size'] as const;

export default function TropelsPage() {
  const [sp, setSp] = useSearchParams();

  // ---- read state straight from the URL (source of truth) ----
  const rawSize = Number(sp.get('size'));
  const size = isValidSize(rawSize) ? rawSize : DEFAULT_SIZE;
  const rawSort = sp.get('sort') ?? DEFAULT_SORT;
  const sort = isValidSort(rawSort) ? rawSort : DEFAULT_SORT;
  const page = Math.max(0, Number(sp.get('page') ?? 0) || 0);
  const species = sp.get('species') ?? '';
  const vitalState = sp.get('vitalState') ?? '';
  const sectorId = sp.get('sectorId') ?? '';
  const q = sp.get('q') ?? '';

  const filterValues: TropelFilterValues = { species, vitalState, sectorId, q, sort, size };

  const sectors = useSectors();
  const { data, loading, error, reload } = useTropels(
    useMemo(
      () => ({
        page,
        size,
        sort,
        species: species || undefined,
        vitalState: vitalState || undefined,
        sectorId: sectorId || undefined,
        q: q || undefined,
      }),
      [page, size, sort, species, vitalState, sectorId, q],
    ),
  );

  // ---- URL writers ----
  function patchFilters(patch: Partial<TropelFilterValues>) {
    const next = new URLSearchParams(sp);
    for (const key of FILTER_KEYS) {
      if (!(key in patch)) continue;
      const value = patch[key];
      if (value === undefined || value === '' || value === null) next.delete(key);
      else next.set(key, String(value));
    }
    next.delete('page'); // any filter/sort/size change resets pagination
    setSp(next, { replace: false });
  }

  function setSearch(value: string) {
    patchFilters({ q: value });
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(sp);
    if (nextPage <= 0) next.delete('page');
    else next.set('page', String(nextPage));
    setSp(next, { replace: false });
  }

  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.currentPage ?? page;
  const isEmpty = !loading && !error && data !== null && data.content.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Atlas de Tropeles</h1>
        {data && (
          <span className="text-sm text-slate-500">{data.totalElements} tropeles</span>
        )}
      </header>

      <TropelFilters
        values={filterValues}
        sectors={sectors}
        onChange={patchFilters}
        onSearch={setSearch}
      />

      {/* Reserve height so loading never collapses the layout. */}
      <div className="relative min-h-[420px] rounded-lg border border-slate-200 bg-white">
        {error && (
          <div className="p-6">
            <ErrorState message={error.message || 'No se pudo cargar el atlas.'} onRetry={reload} />
          </div>
        )}

        {isEmpty && (
          <div className="p-6">
            <EmptyState title="Sin tropeles" hint="Prueba con otros filtros." />
          </div>
        )}

        {!error && !isEmpty && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Especie</th>
                <th className="px-3 py-2 font-medium">Estado vital</th>
                <th className="px-3 py-2 text-right font-medium">Caos</th>
                <th className="px-3 py-2 text-right font-medium">Energía</th>
                <th className="px-3 py-2 font-medium">Sector</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((t) => <TropelRow key={t.id} tropel={t} />)}
            </tbody>
          </table>
        )}

        {/* Subtle overlay during refetch; the table stays mounted (no layout shift). */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Spinner size="lg" />
          </div>
        )}
      </div>

      {/* Server-side pagination */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          disabled={currentPage <= 0 || loading}
          onClick={() => goToPage(currentPage - 1)}
          className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40 enabled:hover:bg-slate-100"
        >
          ← Anterior
        </button>
        <span className="tabular-nums text-slate-600">
          Página {totalPages === 0 ? 0 : currentPage + 1} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage + 1 >= totalPages || loading}
          onClick={() => goToPage(currentPage + 1)}
          className="rounded border border-slate-300 px-3 py-1.5 font-medium disabled:opacity-40 enabled:hover:bg-slate-100"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
