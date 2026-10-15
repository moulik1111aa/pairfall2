// Level-generation worker. Messages: { id, mode } → { id, level } | { id, error }.
import { makeLevel, type PlayMode } from './levels.ts';

interface Req {
  id: number;
  mode: PlayMode;
}

const scope = self as unknown as { onmessage: ((e: MessageEvent<Req>) => void) | null; postMessage(m: unknown): void };
scope.onmessage = (e) => {
  const { id, mode } = e.data;
  try {
    scope.postMessage({ id, level: makeLevel(mode) });
  } catch (err) {
    scope.postMessage({ id, error: String(err) });
  }
};
