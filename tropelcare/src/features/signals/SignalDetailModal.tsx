import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Signal, SignalStatus } from '../../types/api';
import { Spinner, ErrorState, Badge } from '../../components/ui';
import { severityTone, statusTone, PATCHABLE_STATUS } from './constants';

interface Props {
  id: string;
  onClose: () => void;
  /** Called after a successful PATCH so the feed can replace the item by id. */
  onUpdated: (updated: Signal) => void;
}

export function SignalDetailModal({ id, onClose, onUpdated }: Props) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [loadTick, setLoadTick] = useState(0);

  const [patching, setPatching] = useState<SignalStatus | null>(null);
  const [patchError, setPatchError] = useState<ApiError | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const lastTarget = useRef<SignalStatus | null>(null);

  // Load the signal detail.
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setLoadError(null);
    api
      .get<Signal>(`/signals/${id}`, { signal: ctrl.signal })
      .then((res) => {
        setSignal(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError(err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', 'Error de red'));
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [id, loadTick]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function patchStatus(next: SignalStatus) {
    if (patching) return;
    lastTarget.current = next;
    setPatching(next);
    setPatchError(null);
    setConfirmed(false);
    try {
      // No optimistic update: the previous status stays until the server confirms.
      const updated = await api.patch<Signal>(`/signals/${id}/status`, { status: next });
      setSignal(updated);
      setConfirmed(true);
      onUpdated(updated);
    } catch (err: unknown) {
      setPatchError(err instanceof ApiError ? err : new ApiError(0, 'NETWORK_ERROR', 'Error de red'));
    } finally {
      setPatching(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de señal"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-semibold">Detalle de señal</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="flex justify-center p-10"><Spinner size="lg" /></div>
        )}

        {loadError && !loading && (
          <ErrorState
            message={loadError.message || 'No se pudo cargar la señal.'}
            onRetry={() => setLoadTick((t) => t + 1)}
          />
        )}

        {signal && !loading && !loadError && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">{signal.signalType}</span>
              <Badge tone={severityTone(signal.severity)}>{signal.severity}</Badge>
              <Badge tone={statusTone(signal.status)}>{signal.status}</Badge>
            </div>

            <p className="rounded bg-slate-50 p-3 text-sm text-slate-700">{signal.rawContent}</p>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Field label="Tropel" value={`${signal.tropel.name} · ${signal.tropel.species}`} />
              <Field label="Creada" value={new Date(signal.createdAt).toLocaleString()} />
              <Field label="Actualizada" value={new Date(signal.updatedAt).toLocaleString()} />
            </dl>

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium uppercase text-slate-500">Cambiar estado</p>
              <div className="flex gap-2">
                {PATCHABLE_STATUS.map((s) => {
                  const isThis = patching === s;
                  const isCurrent = signal.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={patching !== null || isCurrent}
                      onClick={() => patchStatus(s)}
                      className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium enabled:hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isThis && <Spinner size="sm" />}
                      {s}
                    </button>
                  );
                })}
              </div>

              {confirmed && !patchError && (
                <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  ✓ Estado actualizado a <strong>{signal.status}</strong>.
                </p>
              )}

              {patchError && (
                <div className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  <p className="font-medium">No se pudo actualizar la señal.</p>
                  <p className="text-xs">El estado anterior se mantiene.</p>
                  <button
                    type="button"
                    onClick={() => lastTarget.current && patchStatus(lastTarget.current)}
                    className="mt-2 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Reintentar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
