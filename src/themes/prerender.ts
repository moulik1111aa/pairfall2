// Composes each tile design onto a tile body and turns it into a cached image URL,
// so the board never re-parses SVG while playing.
import type { Theme } from './types.ts';

/** Tile artwork aspect: 100 wide × TILE_H tall (face plus visible edge). */
export const TILE_W = 100;
export const TILE_H = 120;

export function tileSvg(theme: Theme, kind: number): string {
  const { face, faceShade, edge, edgeShade, rim } = theme.tile;
  const art = theme.tiles[kind % theme.tiles.length].svg;
  // A porcelain tile: shaded face, jade side edge, glossy top highlight.
  // The drop shadow is baked into the image (a CSS filter per tile is costly to composite).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE_W} ${TILE_H}" width="${TILE_W * 2}" height="${TILE_H * 2}">
  <defs>
    <filter id="b-sh" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.8"/></filter>
    <linearGradient id="b-face" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="${face}"/><stop offset=".65" stop-color="${face}"/><stop offset="1" stop-color="${faceShade}"/></linearGradient>
    <linearGradient id="b-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${edge}"/><stop offset="1" stop-color="${edgeShade}"/></linearGradient>
    <linearGradient id="b-gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
  </defs>
  <rect x="4" y="15" width="92" height="101" rx="16" fill="#26324A" fill-opacity=".22" filter="url(#b-sh)"/>
  <rect x="2.5" y="12" width="95" height="101.5" rx="16" fill="url(#b-edge)" stroke="${rim}" stroke-width="2.4"/>
  <path d="M8 104 Q50 110 92 104" fill="none" stroke="#FFFFFF" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>
  <rect x="2.5" y="2.5" width="95" height="101.5" rx="16" fill="url(#b-face)" stroke="${rim}" stroke-width="2.4"/>
  <rect x="6.5" y="6.5" width="87" height="93.5" rx="12.5" fill="none" stroke="#FFFFFF" stroke-width="2.2"/>
  <path d="M12 8 H88 Q92 8 92 12 V22 Q50 30 8 22 V12 Q8 8 12 8Z" fill="url(#b-gloss)" opacity=".7"/>
  <g transform="translate(4 5.5) scale(0.92)">${art}</g>
</svg>`;
}

const svgCache = new Map<string, string[]>();
const rasterCache = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();

/** Pixel width tiles are rasterised at: the largest on-screen tile (76 CSS px) at a 3× screen. */
export const RASTER_W = 240;

function svgUrls(theme: Theme): string[] {
  let urls = svgCache.get(theme.id);
  if (!urls) {
    urls = theme.tiles.map((_, k) => URL.createObjectURL(new Blob([tileSvg(theme, k)], { type: 'image/svg+xml' })));
    svgCache.set(theme.id, urls);
  }
  return urls;
}

/**
 * Image URLs for every tile kind of a theme. Once `prepareTiles` has finished these
 * are pre-rasterised PNGs (cheap to draw and scale); before that, the SVG originals.
 */
export function tileUrls(theme: Theme): string[] {
  return rasterCache.get(theme.id) ?? svgUrls(theme);
}

/**
 * Rasterise each tile's SVG once into a PNG. Drawing a bitmap is far cheaper than
 * re-rendering vector art (with its blur shadow) whenever a tile changes size.
 */
export function prepareTiles(theme: Theme): Promise<string[]> {
  const done = rasterCache.get(theme.id);
  if (done) return Promise.resolve(done);
  let p = pending.get(theme.id);
  if (!p) {
    p = Promise.all(svgUrls(theme).map((src) => rasterise(src))).then(
      (urls) => {
        rasterCache.set(theme.id, urls);
        return urls;
      },
      () => svgUrls(theme),
    );
    pending.set(theme.id, p);
  }
  return p;
}

async function rasterise(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = RASTER_W;
  const h = Math.round((RASTER_W * TILE_H) / TILE_W);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return src;
  const url = URL.createObjectURL(blob);
  const out = new Image();
  out.src = url;
  await out.decode().catch(() => undefined);
  return url;
}

/** Prepare (rasterise and decode) every tile image up front so the first tap never stalls. */
export async function warmTiles(theme: Theme): Promise<void> {
  await prepareTiles(theme);
}

export function backdropUrl(theme: Theme): string {
  return `url("data:image/svg+xml,${encodeURIComponent(theme.backdrop)}")`;
}
