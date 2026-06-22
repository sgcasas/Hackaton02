// Mapeo de identificadores de la API (colorToken / assetKey) a estilos CSS LOCALES.
// Regla dura del CP5: el visual se construye con CSS. assetKey y colorToken son
// IDENTIFICADORES, no URLs. Nada de imágenes / video / canvas pregrabado.
import type { CSSProperties } from 'react';
import type { Climate } from '../../types/api';

interface ThemeVars {
  from: string;
  to: string;
  accent: string;
  fg: string;
}

// Hash estable y determinista de un string -> entero no negativo.
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0; // fuerza 32-bit
  }
  return Math.abs(h);
}

// Paleta de temas. colorToken conocidos mapean directo; los desconocidos caen,
// de forma determinista, sobre uno de estos (así NUNCA se rompe el visual).
const COLOR_TOKENS: Record<string, ThemeVars> = {
  emerald: { from: '#022c22', to: '#10b981', accent: '#6ee7b7', fg: '#ecfdf5' },
  cyan: { from: '#083344', to: '#06b6d4', accent: '#67e8f9', fg: '#ecfeff' },
  violet: { from: '#2e1065', to: '#8b5cf6', accent: '#c4b5fd', fg: '#f5f3ff' },
  amber: { from: '#451a03', to: '#f59e0b', accent: '#fcd34d', fg: '#fffbeb' },
  rose: { from: '#4c0519', to: '#f43f5e', accent: '#fda4af', fg: '#fff1f2' },
  sky: { from: '#082f49', to: '#0ea5e9', accent: '#7dd3fc', fg: '#f0f9ff' },
  lime: { from: '#1a2e05', to: '#84cc16', accent: '#bef264', fg: '#f7fee7' },
  fuchsia: { from: '#4a044e', to: '#d946ef', accent: '#f0abfc', fg: '#fdf4ff' },
};

const PALETTE = Object.values(COLOR_TOKENS);

// Patrones CSS disponibles (definidos en story.css). Se elige uno por assetKey.
const PATTERNS = [
  'pattern-grid',
  'pattern-dots',
  'pattern-rings',
  'pattern-diagonal',
  'pattern-waves',
  'pattern-hex',
] as const;

export function themeVars(colorToken: string): ThemeVars {
  const known = COLOR_TOKENS[colorToken.toLowerCase()];
  if (known) return known;
  return PALETTE[hash(colorToken) % PALETTE.length];
}

// Devuelve las CSS custom properties que el panel visual aplica inline.
// El cast a CSSProperties es seguro: son variables CSS (`--*`), no `any`.
export function stageStyle(colorToken: string): CSSProperties {
  const t = themeVars(colorToken);
  return {
    '--story-from': t.from,
    '--story-to': t.to,
    '--story-accent': t.accent,
    '--story-fg': t.fg,
  } as CSSProperties;
}

export function patternClass(assetKey: string): string {
  return PATTERNS[hash(assetKey) % PATTERNS.length];
}

// Etiqueta legible del clima para la cabecera del panel.
const CLIMATE_LABEL: Record<Climate, string> = {
  PIXEL_FOREST: 'Bosque Pixel',
  NEON_CAVE: 'Caverna Neón',
  CLOUD_AQUARIUM: 'Acuario Nube',
  RETRO_ARCADE: 'Arcade Retro',
};

export function climateLabel(climate: Climate): string {
  return CLIMATE_LABEL[climate] ?? climate;
}
