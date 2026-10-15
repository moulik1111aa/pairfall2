import type { Theme } from './types.ts';
import { zenGarden } from './zen-garden/index.ts';
import { neonCosmos } from './neon-cosmos/index.ts';
import { festiveIndia } from './festive-india/index.ts';

export const THEMES: readonly Theme[] = [zenGarden, neonCosmos, festiveIndia];
export const DEFAULT_THEME = zenGarden;

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}
