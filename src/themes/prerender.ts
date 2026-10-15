// Composes each tile design onto a tile body and turns it into a cached image URL,
// so the board never re-parses SVG while playing.
import type { Theme } from './types.ts';

/** Tile artwork aspect: 100 wide × TILE_H tall (face plus visible edge). */
export const TILE_W = 100;
export const TILE_H = 116;

export function tileSvg(theme: Theme, kind: number): string {
  const { face, edge, rim } = theme.tile;
  const art = theme.tiles[kind % theme.tiles.length].svg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_W} ${TILE_H}" width="${TILE_W * 2}" height="${TILE_H * 2}">
  <rect x="2.5" y="12" width="95" height="101.5" rx="15" fill="${edge}" stroke="${rim}" stroke-width="2.5"/>
  <rect x="2.5" y="2.5" width="95" height="101.5" rx="15" fill="${face}" stroke="${rim}" stroke-width="2.5"/>
  <rect x="7" y="7" width="86" height="92.5" rx="11" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="2"/>
  <g transform="translate(5 7) scale(0.9)">${art}</g>
</svg>`;
}

const cache = new Map<string, string[]>();

/** Object URLs for every tile kind of a theme (created once per theme). */
export function tileUrls(theme: Theme): string[] {
  let urls = cache.get(theme.id);
  if (!urls) {
    urls = theme.tiles.map((_, k) => URL.createObjectURL(new Blob([tileSvg(theme, k)], { type: 'image/svg+xml' })));
    cache.set(theme.id, urls);
  }
  return urls;
}

/** Decode every tile image up front so the first tap never stalls. */
export async function warmTiles(theme: Theme): Promise<void> {
  await Promise.all(
    tileUrls(theme).map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    }),
  );
}

export function backdropUrl(theme: Theme): string {
  return `url("data:image/svg+xml,${encodeURIComponent(theme.backdrop)}")`;
}
