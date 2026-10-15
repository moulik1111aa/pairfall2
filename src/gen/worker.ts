// Level-generation worker. Messages: { id, n } → { id, level } | { id, error }.
import { makeJourneyLevel } from './levels.ts';

interface Req { id: number; n: number }

const scope = self as unknown as { onmessage: ((e: MessageEvent<Req>) => void) | null; postMessage(m: unknown): void };
scope.onmessage = (e) => {
  const { id, n } = e.data;
  try {
    scope.postMessage({ id, level: makeJourneyLevel(n) });
  } catch (err) {
    scope.postMessage({ id, error: String(err) });
  }
};
