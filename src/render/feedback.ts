// What the board reports as it animates, so sound and vibration land on the
// same frames as the visuals.

export interface Feedback {
  tap(): void;
  land(): void;
  match(combo: number): void;
  deal(count: number): void;
  danger(on: boolean): void;
  win(): void;
  lose(): void;
}

export const silentFeedback: Feedback = {
  tap() {},
  land() {},
  match() {},
  deal() {},
  danger() {},
  win() {},
  lose() {},
};
