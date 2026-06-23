// Mock LOCAL para adelantar el visual del CP5 antes de que llegue la fundación.
// Tipado con los contratos reales (cero `any`). Tras `git merge origin/main` se
// usa `api.get<SectorStory>` y este archivo deja de importarse.
import type { SectorsResponse, SectorStory, StoryStage } from '../../types/api';

const EVENTS = ['HAMBRE', 'MUTACION', 'CONFLICTO', 'FUGA', 'REPRODUCCION_MASIVA'];
const TOKENS = ['emerald', 'cyan', 'violet', 'amber', 'rose', 'sky', 'lime', 'fuchsia'];

const stages: StoryStage[] = Array.from({ length: 8 }, (_, i): StoryStage => ({
  id: `stage_${i}`,
  order: i,
  title: `Etapa ${i + 1}: ${['Primer pulso', 'Despertar', 'Tensión', 'Quiebre', 'Mutación', 'Cascada', 'Reorden', 'Equilibrio'][i]}`,
  narrative:
    'La actividad del sector cambia de forma a medida que el scroll avanza. Las métricas del panel reflejan exactamente esta etapa, no una animación decorativa.',
  dominantEvent: EVENTS[i % EVENTS.length],
  metrics: {
    stability: 40 + ((i * 7) % 55),
    energy: 30 + ((i * 11) % 65),
    alerts: (i * 3) % 12,
  },
  assetKey: `pixel-forest-${i}`,
  colorToken: TOKENS[i % TOKENS.length],
  progress: i / 7,
}));

export const MOCK_STORY: SectorStory = {
  sector: { id: 'sec_001', name: 'Bosque Norte', climate: 'PIXEL_FOREST' },
  stages,
};

export const MOCK_SECTORS: SectorsResponse = {
  items: [
    { id: 'sec_001', sectorCode: 'SEC-01', name: 'Bosque Norte', climate: 'PIXEL_FOREST', capacity: 20, currentLoad: 13, stabilityLevel: 68 },
    { id: 'sec_002', sectorCode: 'SEC-02', name: 'Caverna Sur', climate: 'NEON_CAVE', capacity: 30, currentLoad: 27, stabilityLevel: 41 },
    { id: 'sec_003', sectorCode: 'SEC-03', name: 'Acuario Este', climate: 'CLOUD_AQUARIUM', capacity: 25, currentLoad: 9, stabilityLevel: 82 },
    { id: 'sec_004', sectorCode: 'SEC-04', name: 'Arcade Oeste', climate: 'RETRO_ARCADE', capacity: 18, currentLoad: 16, stabilityLevel: 55 },
  ],
};
