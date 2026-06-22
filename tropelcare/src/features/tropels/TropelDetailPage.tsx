import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import type { Tropel } from '../../types/api';
import { Spinner, ErrorState, Badge } from '../../components/ui';
import { vitalTone } from './constants';

export default function TropelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tropel, setTropel] = useState<Tropel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<Tropel>(`/tropels/${id}`, { signal: ctrl.signal })
      .then((res) => {
        setTropel(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', 'Error de red'));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [id, tick]);

  return (
    <div className="flex flex-col gap-4">
      <Link to="/tropels" className="text-sm text-sky-700 hover:underline">← Volver al atlas</Link>

      {loading && (
        <div className="flex justify-center p-10"><Spinner size="lg" /></div>
      )}

      {error && !loading && (
        <ErrorState message={error.message || 'No se pudo cargar el tropel.'} onRetry={() => setTick((t) => t + 1)} />
      )}

      {tropel && !loading && !error && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{tropel.name}</h1>
            <Badge tone={vitalTone(tropel.vitalState)}>{tropel.vitalState}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Especie" value={tropel.species} />
            <Field label="Guardián" value={tropel.guardianName} />
            <Field label="Sector" value={`${tropel.sector.name} (${tropel.sector.sectorCode})`} />
            <Field label="Energía" value={String(tropel.energyLevel)} />
            <Field label="Índice de caos" value={String(tropel.chaosIndex)} />
            <Field label="Etapa de mutación" value={String(tropel.mutationStage)} />
            <Field label="Creado" value={new Date(tropel.createdAt).toLocaleString()} />
            <Field label="Actualizado" value={new Date(tropel.updatedAt).toLocaleString()} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
