// Promise-based access to generated levels. Generation runs in a Web Worker built
// from the inlined worker bundle; if workers are unavailable it falls back to the
// main thread (yielding first so the UI can paint).
import { makeLevel, modeKey, type Level, type PlayMode } from './levels.ts';

declare global {
  interface Window {
    __WORKER_SRC__?: string;
  }
}

type Pending = { resolve: (l: Level) => void; reject: (e: Error) => void };

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, Pending>();
const cache = new Map<string, Promise<Level>>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    const src = window.__WORKER_SRC__;
    if (!src || typeof Worker === 'undefined') throw new Error('no worker source');
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = (e: MessageEvent<{ id: number; level?: Level; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.level) p.resolve(e.data.level);
      else p.reject(new Error(e.data.error ?? 'generation failed'));
    };
    worker.onerror = () => {
      // Worker died: finish outstanding work on the main thread from now on.
      worker = null;
      for (const [, p] of pending) p.reject(new Error('worker failed'));
      pending.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

function generateOnMainThread(mode: PlayMode): Promise<Level> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        resolve(makeLevel(mode));
      } catch (e) {
        reject(e as Error);
      }
    }, 16),
  );
}

function request(mode: PlayMode): Promise<Level> {
  const w = getWorker();
  if (!w) return generateOnMainThread(mode);
  const id = nextId++;
  return new Promise<Level>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, mode });
  }).catch(() => generateOnMainThread(mode));
}

/** Get the level for a mode (cached). A number means that Journey level. */
export function getLevel(m: PlayMode | number): Promise<Level> {
  const mode: PlayMode = typeof m === 'number' ? { kind: 'journey', n: m } : m;
  const key = modeKey(mode);
  let p = cache.get(key);
  if (!p) {
    p = request(mode);
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  // keep the cache small
  if (cache.size > 8) {
    const first = cache.keys().next().value;
    if (first !== undefined && first !== key) cache.delete(first);
  }
  return p;
}

/** Start generating a level in the background. */
export function prefetch(m: PlayMode | number): void {
  void getLevel(m);
}
