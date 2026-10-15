// Every tunable number lives here (spec §3, §2). Starting values, not final.

export const CONFIG = {
  comboWindowMs: 2500,
  trayLimit: { early: 5, normal: 4, earlyUntilLevel: 10 },
  rewards: { levelClear: 10, perStar: 5, perComboStepAbove2: 1, comboBonusCap: 20, daily: 50 },
  costs: { undo: 20, hint: 20, shuffle: 40, xray: 30, extraSlot: 60, continue: 80 },
  start: { coins: 100, freeEachPowerup: 1 },
} as const;

export type PowerupId = 'undo' | 'hint' | 'shuffle' | 'xray' | 'extraSlot';
