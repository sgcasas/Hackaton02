import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import type { SectorListItem, SectorsResponse } from '../../types/api';
import { Spinner, ErrorState, EmptyState } from '../../components/ui';
import { climateLabel, climateStyle, patternClass, stageStyle } from './storyTheme';
import { prefersReducedMotion } from './usePrefersReducedMotion';
import './story.css';

// Document con la View Transition API tipada localmente (evita `any`).
type DocWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

function colorTokenForSector(s: SectorListItem): string {
  // El listado no trae colorToken; derivamos un tema estable del código.
  const tokens = ['emerald', 'cyan', 'violet', 'amber', 'rose', 'sky'];
  let h = 0;
  for (const ch of s.sectorCode) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tokens[h % tokens.length];
}

export default function SectorsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SectorsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    api
      .get<SectorsResponse>('/sectors', { signal: ctrl.signal })
      .then((res) => setData(res))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [nonce]);

  function goToStory(id: string): void {
    const doc = document as DocWithVT;
    if (doc.startViewTransition && !prefersReducedMotion()) {
      doc.startViewTransition(() => navigate(`/sectors/${id}/story`));
    } else {
      navigate(`/sectors/${id}/story`);
    }
  }

  if (loading) return <Spinner size="lg" />;
  if (error) return <ErrorState message="No se pudieron cargar los sectores." onRetry={() => setNonce((n) => n + 1)} />;
  if (!data || data.items.length === 0) return <EmptyState title="Sin sectores" hint="No hay sectores para mostrar." />;

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Sectores</h1>
        <p className="text-sm text-slate-400">Elige un sector para recorrer su historia.</p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((s) => {
          const token = colorTokenForSector(s);
          const swatch: CSSProperties = {
            ...stageStyle(token),
            ...climateStyle(s.climate),
            viewTransitionName: `sector-${s.id}`,
          } as CSSProperties;
          const pct = s.capacity > 0 ? Math.round((s.currentLoad / s.capacity) * 100) : 0;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goToStory(s.id)}
                className="group w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-lg hover:shadow-black/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              >
                <div className="story-visual relative h-24 overflow-hidden" style={swatch}>
                  <div className="story-climate" aria-hidden="true" />
                  <div className={`story-pattern ${patternClass(s.sectorCode)}`} aria-hidden="true" />
                  <div className="story-vignette" aria-hidden="true" />
                  <span className="absolute bottom-2 left-3 text-xs font-medium uppercase tracking-wide opacity-90">
                    {climateLabel(s.climate)}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-100">{s.name}</h2>
                    <span className="text-xs text-slate-500">{s.sectorCode}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-slate-500">Estabilidad</dt>
                      <dd className="text-slate-200">{s.stabilityLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Carga</dt>
                      <dd className="text-slate-200">{s.currentLoad}/{s.capacity} ({pct}%)</dd>
                    </div>
                  </dl>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
