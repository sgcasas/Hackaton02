import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { DashboardSummary, Severity } from '../../types/api';
import { Spinner } from '../../components/ui/Spinner';
import { ErrorState } from '../../components/ui/ErrorState';

const SEVERITY_LABEL: Record<Severity, string> = {
  LEVE: 'Leve',
  MODERADO: 'Moderado',
  GRAVE: 'Grave',
  CRITICO: 'Crítico',
};

const SEVERITY_TONE: Record<Severity, string> = {
  LEVE: 'bg-green-100 text-green-700',
  MODERADO: 'bg-yellow-100 text-yellow-700',
  GRAVE: 'bg-orange-100 text-orange-700',
  CRITICO: 'bg-red-100 text-red-700',
};

function useDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<DashboardSummary>('/dashboard/summary', { signal: ctrl.signal })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [tick]);

  return { data, loading, error, refetch: () => setTick((n) => n + 1) };
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading) return <Spinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const kpis = [
    { label: 'Tropeles totales', value: data.totalTropels, color: 'text-indigo-600' },
    { label: 'Tropeles críticos', value: data.criticalTropels, color: 'text-red-600' },
    { label: 'Señales abiertas', value: data.openSignals, color: 'text-orange-600' },
    {
      label: 'Estabilidad media',
      value: `${data.sectorStabilityAvg.toFixed(1)}%`,
      color: 'text-green-600',
    },
  ];

  const severities: Severity[] = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Actualizado: {new Date(data.generatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
            <p className={`mt-2 text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Señales por severidad
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {severities.map((s) => (
            <div key={s} className={`rounded-lg p-4 ${SEVERITY_TONE[s]}`}>
              <p className="text-xs font-medium">{SEVERITY_LABEL[s]}</p>
              <p className="mt-1 text-2xl font-bold">{data.signalsBySeverity[s] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
