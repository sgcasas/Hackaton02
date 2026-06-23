import type { SignalType, Severity, SignalStatus } from '../../types/api';

export const SIGNAL_TYPE_OPTIONS: SignalType[] = [
  'HAMBRE', 'ABANDONO', 'MUTACION', 'FUGA', 'CONFLICTO', 'REPRODUCCION_MASIVA', 'SENAL_CORRUPTA',
];
export const SEVERITY_OPTIONS: Severity[] = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO'];
export const STATUS_OPTIONS: SignalStatus[] = ['RECIBIDA', 'PROCESANDO', 'ATENDIDA'];

/** PATCH only accepts these two (never RECIBIDA). */
export const PATCHABLE_STATUS: Exclude<SignalStatus, 'RECIBIDA'>[] = ['PROCESANDO', 'ATENDIDA'];

type Tone = 'neutral' | 'info' | 'warn' | 'danger' | 'success';

export function severityTone(s: Severity): Tone {
  switch (s) {
    case 'LEVE':
      return 'neutral';
    case 'MODERADO':
      return 'info';
    case 'GRAVE':
      return 'warn';
    case 'CRITICO':
      return 'danger';
  }
}

export function statusTone(s: SignalStatus): Tone {
  switch (s) {
    case 'RECIBIDA':
      return 'warn';
    case 'PROCESANDO':
      return 'info';
    case 'ATENDIDA':
      return 'success';
  }
}
