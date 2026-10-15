// Composes each tile design onto a tile body and turns it into a cached image URL,
// so the board never re-parses SVG while playing.
import type { Theme } from './types.ts';
import { WILD_ART, MYSTERY_ART } from './common.ts';

/** Image index of the wild tile and the face-down tile, after the 18 designs. */
export const WILD_IMAGE = 18;
export const MYSTERY_IMAGE = 19;
const WILD_KIND = 99;

/** Which image a tile kind uses. */
export const imageIndex = (kind: number): number => (kind === WILD_KIND ? WILD_IMAGE : kind);

export interface TileOptions {
  /** Colour-blind help: a small number in the corner of each design. */
  readonly numbers?: boolean;
}

function artFor(theme: Theme, index: number): string {
  if (index === WILD_IMAGE) return theme.wildArt ?? WILD_ART;
  if (index === MYSTERY_IMAGE) return theme.mysteryArt ?? MYSTERY_ART;
  return theme.tiles[index % theme.tiles.length].svg;
}

const imageCount = (theme: Theme) => theme.tiles.length + 2;

/** Tile artwork aspect: 100 wide × TILE_H tall (face plus visible edge). */
export const TILE_W = 100;
export const TILE_H = 120;

export function tileSvg(theme: Theme, index: number, opts: TileOptions = {}): string {
  const { face, faceShade, edge, edgeShade, rim } = theme.tile;
  const art = artFor(theme, index);
  const badge =
    opts.numbers && index < theme.tiles.length
      ? `<g><circle cx="83" cy="17" r="11" fill="#26324A"/><text x="83" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="${index + 1 >= 10 ? 12 : 14}" fill="#FFFFFF">${index + 1}</text></g>`
      : '';
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
  <rect x="6.5" y="6.5" width="87" height="93.5" rx="12.5" fill="none" stroke="${theme.tile.highlight ?? '#FFFFFF'}" stroke-width="2.2"/>
  <path d="M12 8 H88 Q92 8 92 12 V22 Q50 30 8 22 V12 Q8 8 12 8Z" fill="url(#b-gloss)" opacity=".7"/>
  <g transform="translate(4 5.5) scale(0.92)">${art}</g>
  ${badge}
</svg>`;
}

const svgCache = new Map<string, string[]>();
const rasterCache = new Map<string, string[]>();
const pending = new Map<string, Promise<string[]>>();
const cacheKey = (theme: Theme, opts: TileOptions) => `${theme.id}:${opts.numbers ? 'n' : ''}`;

/** Pixel width tiles are rasterised at: the largest on-screen tile (76 CSS px) at a 3× screen. */
export const RASTER_W = 240;

function svgUrls(theme: Theme, opts: TileOptions): string[] {
  const k = cacheKey(theme, opts);
  let urls = svgCache.get(k);
  if (!urls) {
    urls = Array.from({ length: imageCount(theme) }, (_, i) =>
      URL.createObjectURL(new Blob([tileSvg(theme, i, opts)], { type: 'image/svg+xml' })),
    );
    svgCache.set(k, urls);
  }
  return urls;
}

/**
 * Image URLs for every tile image of a theme: the designs, then the wild tile, then
 * the face-down tile. Once `prepareTiles` has finished these are pre-rasterised PNGs
 * (cheap to draw and scale); before that, the SVG originals.
 */
export function tileUrls(theme: Theme, opts: TileOptions = {}): string[] {
  return rasterCache.get(cacheKey(theme, opts)) ?? svgUrls(theme, opts);
}

/**
 * Rasterise each tile's SVG once into a PNG. Drawing a bitmap is far cheaper than
 * re-rendering vector art (with its blur shadow) whenever a tile changes size.
 */
export function prepareTiles(theme: Theme, opts: TileOptions = {}): Promise<string[]> {
  const k = cacheKey(theme, opts);
  const done = rasterCache.get(k);
  if (done) return Promise.resolve(done);
  let p = pending.get(k);
  if (!p) {
    p = Promise.all(svgUrls(theme, opts).map((src) => rasterise(src))).then(
      (urls) => {
        rasterCache.set(k, urls);
        return urls;
      },
      () => svgUrls(theme, opts),
    );
    pending.set(k, p);
  }
  return p;
}

async function rasterise(src: string, w = RASTER_W, h = Math.round((RASTER_W * TILE_H) / TILE_W)): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
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
export async function warmTiles(theme: Theme, opts: TileOptions = {}): Promise<void> {
  await prepareTiles(theme, opts);
}

export function backdropUrl(theme: Theme): string {
  return `url("data:image/svg+xml,${encodeURIComponent(theme.backdrop)}")`;
}

/** The ice overlay drawn over frozen tiles: rasterised once, drawn as a bitmap. */
const ICE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 104" width="200" height="208">
  <defs>
    <linearGradient id="i" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ECF7FF" stop-opacity=".88"/><stop offset=".55" stop-color="#AAD4F5" stop-opacity=".66"/><stop offset="1" stop-color="#D6ECFF" stop-opacity=".84"/></linearGradient>
    <radialGradient id="r" cx=".5" cy=".5" r=".6"><stop offset=".6" stop-color="#6EAAE1" stop-opacity="0"/><stop offset="1" stop-color="#6EAAE1" stop-opacity=".45"/></radialGradient>
  </defs>
  <rect x="2" y="2" width="96" height="100" rx="15" fill="url(#i)"/>
  <rect x="2" y="2" width="96" height="100" rx="15" fill="url(#r)"/>
  <rect x="3.5" y="3.5" width="93" height="97" rx="14" fill="none" stroke="#FFFFFF" stroke-width="3"/>
  <path d="M18 20 30 34 26 50M70 14 62 30 74 42M80 72 66 66 58 82M14 70 24 78" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".85"/>
  <path d="M14 14 Q30 8 44 12" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".7"/>
</svg>`;

let iceUrl: string | null = null;
let icePending: Promise<string> | null = null;

/** Ice overlay image URL (SVG until rasterised, then PNG). */
export function iceImage(): string {
  return iceUrl ?? `data:image/svg+xml,${encodeURIComponent(ICE_SVG)}`;
}

export function prepareIce(): Promise<string> {
  if (iceUrl) return Promise.resolve(iceUrl);
  icePending ??= rasterise(URL.createObjectURL(new Blob([ICE_SVG], { type: 'image/svg+xml' })), 240, 250).then(
    (u) => (iceUrl = u),
    () => iceImage(),
  );
  return icePending;
}
