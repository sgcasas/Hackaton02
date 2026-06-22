import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { SectorStory } from '../../types/api';
import { Spinner, ErrorState } from '../../components/ui';
import { Badge } from '../../components/ui';
import { useActiveStage } from './useActiveStage';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { climateLabel, patternClass, stageStyle } from './storyTheme';
import './story.css';

// Soporte de scroll-driven animations (una sola lectura).
const SUPPORTS_SDA =
  typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()');

function metricLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default function SectorStoryPage(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const reduced = usePrefersReducedMotion();

  const [story, setStory] = useState<SectorStory | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(false);
    api
      .get<SectorStory>(`/sectors/${id}/story`, { signal: ctrl.signal })
      .then((res) => setStory(res))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [id, nonce]);

  const stages = useMemo(() => story?.stages ?? [], [story]);
  const count = stages.length;
  const { active, setStageRef, goTo } = useActiveStage(count);

  // Máximo de cada métrica a lo largo de la historia: normaliza las barras del
  // panel sin asumir una escala fija (stability/energy 0-100, alerts pequeñas…).
  const maxByMetric = useMemo(() => {
    const m: Record<string, number> = {};
    for (const st of stages) {
      for (const [k, v] of Object.entries(st.metrics)) {
        m[k] = Math.max(m[k] ?? 0, v);
      }
    }
    return m;
  }, [stages]);

  // Progreso fallback (cuando NO hay scroll-driven): escucha el scroll real.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (SUPPORTS_SDA || count === 0) return;
    const onScroll = () => {
      const el = document.scrollingElement ?? document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [count]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>): void {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'j') {
      e.preventDefault();
      goTo(active + 1, reduced);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'k') {
      e.preventDefault();
      goTo(active - 1, reduced);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0, reduced);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(count - 1, reduced);
    }
  }

  if (loading) return <Spinner size="lg" />;
  if (error || !story) {
    return (
      <div className="p-6">
        <ErrorState
          message="No se pudo cargar la historia del sector."
          onRetry={() => setNonce((n) => n + 1)}
        />
        <div className="mt-4">
          <Link to="/sectors" className="text-emerald-400 underline">
            ← Volver a sectores
          </Link>
        </div>
      </div>
    );
  }

  const activeStage = stages[active] ?? stages[0];
  const activeStyle = stageStyle(activeStage.colorToken);
  const visualStyle: CSSProperties = {
    ...activeStyle,
    viewTransitionName: `sector-${story.sector.id}`,
  } as CSSProperties;
  const barStyle: CSSProperties = SUPPORTS_SDA
    ? activeStyle
    : ({ ...activeStyle, '--p': progress } as CSSProperties);

  return (
    <div
      className="story-root outline-none"
      tabIndex={0}
      aria-label="Historia del sector. Usa las flechas para cambiar de etapa."
      onKeyDown={onKeyDown}
    >
      {/* Barra de progreso (scroll-driven con soporte; fallback JS si no). */}
      <div
        className={`story-progress ${SUPPORTS_SDA ? 'story-progress--sda' : ''}`}
        style={SUPPORTS_SDA ? activeStyle : barStyle}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={active}
      >
        <div className="story-progress__bar" style={SUPPORTS_SDA ? undefined : barStyle} />
      </div>

      <div className="lg:grid lg:grid-cols-2">
        {/* ---- Panel visual sticky (no se desmonta; cambia por etapa) ---- */}
        <aside className="sticky top-0 z-10 h-[45vh] lg:h-screen">
          <div className="story-visual relative flex h-full flex-col justify-between overflow-hidden p-6 lg:p-8" style={visualStyle}>
            <div className={`story-pattern ${patternClass(activeStage.assetKey)}`} aria-hidden="true" />
            <div className="story-scanlines" aria-hidden="true" />
            <div className="story-vignette" aria-hidden="true" />

            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-widest opacity-80">
                {climateLabel(story.sector.climate)} · Etapa {active + 1}/{count}
              </p>
              <h1 className="story-title mt-1 text-2xl font-bold lg:text-4xl">{story.sector.name}</h1>
              <p className="mt-2 max-w-md text-sm opacity-90 lg:text-lg">{activeStage.title}</p>
              <span className="story-event mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {activeStage.dominantEvent}
              </span>
            </div>

            {/* Métricas de la etapa ACTIVA, con barra normalizada (el TA verifica
                que correspondan a la etapa activa). */}
            <dl className="relative grid grid-cols-3 gap-3">
              {Object.entries(activeStage.metrics).map(([k, v]) => {
                const pct = Math.round((v / (maxByMetric[k] || 1)) * 100);
                return (
                  <div key={k} className="rounded-lg bg-black/30 p-3 backdrop-blur-sm">
                    <dt className="text-[11px] uppercase tracking-wide opacity-75">{metricLabel(k)}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
                    <div className="story-meter mt-2" aria-hidden="true">
                      <span className="story-meter__fill" style={{ width: `${pct}%` } as CSSProperties} />
                    </div>
                  </div>
                );
              })}
            </dl>

            {/* Rail de etapas (scrubber): mouse + indicador visual del avance. */}
            <nav className="story-rail" aria-label="Etapas">
              {stages.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i, reduced)}
                  aria-label={`Ir a etapa ${i + 1}: ${s.title}`}
                  aria-current={i === active ? 'step' : undefined}
                  className={`story-rail__dot ${i === active ? 'is-active' : ''}`}
                />
              ))}
            </nav>
          </div>
        </aside>

        {/* ---- Columna narrativa: 8 bloques altos ---- */}
        <div className="relative">
          {stages.map((s, i) => (
            <section
              key={s.id}
              ref={setStageRef(i)}
              data-idx={i}
              aria-current={i === active ? 'step' : undefined}
              className={`story-stage ${SUPPORTS_SDA ? 'story-stage--sda' : ''} flex min-h-[80vh] flex-col justify-center px-6 py-12 lg:min-h-screen`}
            >
              <div
                className={`max-w-xl rounded-2xl border p-6 transition-colors ${
                  i === active
                    ? 'border-emerald-400/60 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                  <Badge tone="info">{s.dominantEvent}</Badge>
                </div>
                <h2 className="text-xl font-semibold text-slate-100">{s.title}</h2>
                <p className="mt-3 text-slate-300">{s.narrative}</p>
                {/* Métricas también en el bloque: contenido completo en el DOM,
                    accesible sin animación y por teclado (reduced-motion safe). */}
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
                  {Object.entries(s.metrics).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1">
                      <dt>{metricLabel(k)}:</dt>
                      <dd className="font-medium text-slate-200 tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ))}

          <div className="px-6 pb-16">
            <Link to="/sectors" className="text-emerald-400 underline">
              ← Volver a sectores
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
