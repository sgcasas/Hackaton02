import { useEffect, useState } from 'react';
import type { SectorListItem } from '../../types/api';
import { useDebouncedValue } from './useDebouncedValue';
import { SPECIES_OPTIONS, VITAL_OPTIONS, SORT_OPTIONS, SIZE_OPTIONS } from './constants';

export interface TropelFilterValues {
  species: string;
  vitalState: string;
  sectorId: string;
  q: string;
  sort: string;
  size: number;
}

interface Props {
  values: TropelFilterValues;
  sectors: SectorListItem[];
  /** Called when a non-text filter changes (resets page to 0). */
  onChange: (patch: Partial<TropelFilterValues>) => void;
  /** Called (debounced) when the search text settles. */
  onSearch: (q: string) => void;
}

const selectCls =
  'rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none';

export function TropelFilters({ values, sectors, onChange, onSearch }: Props) {
  const [qInput, setQInput] = useState(values.q);
  const debouncedQ = useDebouncedValue(qInput, 300);

  // Keep local input in sync if URL changes externally (back/forward, shared link).
  useEffect(() => {
    setQInput(values.q);
  }, [values.q]);

  useEffect(() => {
    if (debouncedQ !== values.q) onSearch(debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Buscar
        <input
          type="text"
          value={qInput}
          maxLength={80}
          placeholder="Nombre…"
          onChange={(e) => setQInput(e.target.value)}
          className={selectCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Especie
        <select
          value={values.species}
          onChange={(e) => onChange({ species: e.target.value })}
          className={selectCls}
        >
          <option value="">Todas</option>
          {SPECIES_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Estado vital
        <select
          value={values.vitalState}
          onChange={(e) => onChange({ vitalState: e.target.value })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {VITAL_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Sector
        <select
          value={values.sectorId}
          onChange={(e) => onChange({ sectorId: e.target.value })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Orden
        <select
          value={values.sort}
          onChange={(e) => onChange({ sort: e.target.value })}
          className={selectCls}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Por página
        <select
          value={values.size}
          onChange={(e) => onChange({ size: Number(e.target.value) })}
          className={selectCls}
        >
          {SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
