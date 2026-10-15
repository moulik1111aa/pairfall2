// Vibration feedback. Uses the web Vibration API where the browser allows it
// (the Android app swaps in native haptics in Milestone 3). Never throws.

export class Haptics {
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  private buzz(pattern: number | number[]): void {
    if (!this.enabled) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not allowed here */
    }
  }

  tap(): void {
    this.buzz(6);
  }
  match(combo: number): void {
    this.buzz(combo >= 3 ? [14, 40, 22] : 14);
  }
  heartbeat(): void {
    this.buzz([18, 90, 26]);
  }
  win(): void {
    this.buzz([30, 60, 30, 60, 70]);
  }
  lose(): void {
    this.buzz([90, 70, 140]);
  }
}
