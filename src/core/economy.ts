// Stars and coin rewards (spec §2, §3).

import { CONFIG } from '../config.ts';

export interface RunSummary {
  /** Power-ups used during the attempt, including Continue. */
  powerupsUsed: number;
  dangerReached: boolean;
  comboBonusSteps: number;
}

export function starsFor(run: RunSummary): 1 | 2 | 3 {
  if (run.powerupsUsed === 0 && !run.dangerReached) return 3;
  if (run.powerupsUsed <= 1) return 2;
  return 1;
}

export function coinsFor(run: RunSummary): number {
  const r = CONFIG.rewards;
  return r.levelClear + r.perStar * starsFor(run) + r.perComboStepAbove2 * run.comboBonusSteps;
}
