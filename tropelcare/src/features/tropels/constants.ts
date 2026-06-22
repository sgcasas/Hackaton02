import type { Species, VitalState } from '../../types/api';

export const SPECIES_OPTIONS: Species[] = ['BLOBITO', 'CHISPA', 'GRUNON', 'DORMILON', 'GLITCHY'];
export const VITAL_OPTIONS: VitalState[] = ['ESTABLE', 'HAMBRIENTO', 'AGITADO', 'MUTANDO', 'CRITICO'];

export const SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: 'Actualizado (reciente)' },
  { value: 'name,asc', label: 'Nombre (A-Z)' },
  { value: 'chaosIndex,desc', label: 'Caos (mayor)' },
] as const;

export const SIZE_OPTIONS = [10, 20, 50] as const;

export const DEFAULT_SORT = 'updatedAt,desc';
export const DEFAULT_SIZE = 20;

export function isValidSize(n: number): n is 10 | 20 | 50 {
  return n === 10 || n === 20 || n === 50;
}

export function isValidSort(s: string): boolean {
  return SORT_OPTIONS.some((o) => o.value === s);
}

/** Maps a vital state to a Badge tone. */
export function vitalTone(v: VitalState): 'neutral' | 'info' | 'warn' | 'danger' | 'success' {
  switch (v) {
    case 'ESTABLE':
      return 'success';
    case 'HAMBRIENTO':
      return 'warn';
    case 'AGITADO':
      return 'warn';
    case 'MUTANDO':
      return 'info';
    case 'CRITICO':
      return 'danger';
  }
}
