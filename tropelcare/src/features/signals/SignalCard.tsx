import type { Signal } from '../../types/api';
import { Badge } from '../../components/ui';
import { severityTone, statusTone } from './constants';

interface Props {
  signal: Signal;
  onOpen: (id: string) => void;
}

export function SignalCard({ signal, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(signal.id)}
      className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-sky-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-800">{signal.signalType}</span>
        <Badge tone={severityTone(signal.severity)}>{signal.severity}</Badge>
        <Badge tone={statusTone(signal.status)}>{signal.status}</Badge>
        <span className="ml-auto text-xs text-slate-400">
          {new Date(signal.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="line-clamp-2 text-sm text-slate-600">{signal.rawContent}</p>
      <p className="text-xs text-slate-500">
        Tropel: <span className="font-medium text-slate-700">{signal.tropel.name}</span> ·{' '}
        {signal.tropel.species}
      </p>
    </button>
  );
}
