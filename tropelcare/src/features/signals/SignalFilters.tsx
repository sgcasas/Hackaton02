import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../tropels/useDebouncedValue';
import { SIGNAL_TYPE_OPTIONS, SEVERITY_OPTIONS, STATUS_OPTIONS } from './constants';

export interface SignalFilterValues {
  signalType: string;
  severity: string;
  status: string;
  q: string;
}

interface Props {
  values: SignalFilterValues;
  onChange: (patch: Partial<SignalFilterValues>) => void;
  onSearch: (q: string) => void;
}

const selectCls =
  'rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none';

export function SignalFilters({ values, onChange, onSearch }: Props) {
  const [qInput, setQInput] = useState(values.q);
  const debouncedQ = useDebouncedValue(qInput, 300);

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
          placeholder="Contenido…"
          onChange={(e) => setQInput(e.target.value)}
          className={selectCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Tipo
        <select
          value={values.signalType}
          onChange={(e) => onChange({ signalType: e.target.value })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {SIGNAL_TYPE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Severidad
        <select
          value={values.severity}
          onChange={(e) => onChange({ severity: e.target.value })}
          className={selectCls}
        >
          <option value="">Todas</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Estado
        <select
          value={values.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className={selectCls}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
