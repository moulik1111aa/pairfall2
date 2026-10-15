// Renders Pairfall's Android launcher icons and splash logo from the real Zen
// Garden tile artwork. Output is committed under native/android/res, so the APK
// build needs no image tools. Re-run after changing the tile art:
//   node scripts/icons.ts
// Uses sharp (installed globally here: npm root -g).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tileSvg } from '../src/themes/prerender.ts';
import { zenGarden } from '../src/themes/zen-garden/index.ts';

const require = createRequire(import.meta.url);
let sharp: (input: Buffer) => { resize(w: number, h: number): { png(): { toBuffer(): Promise<Buffer> } } };
try {
  sharp = require('sharp');
} catch {
  sharp = require(join(execSync('npm root -g').toString().trim(), 'sharp'));
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'native/android/res');

const LOTUS = 0;
const BLOSSOM = 4;

/** One tile, 100×120 units, drawn at (x, y) with its centre rotated by `deg`. */
function tile(kind: number, cx: number, cy: number, width: number, deg: number): string {
  const s = width / 100;
  const inner = tileSvg(zenGarden, kind).replace(/width="200" height="240"/, 'width="100" height="120"');
  return `<g transform="translate(${cx} ${cy}) rotate(${deg}) scale(${s}) translate(-50 -60)">${inner}</g>`;
}

function sparkle(cx: number, cy: number, r: number): string {
  const t = r * 0.22;
  return `<g transform="translate(${cx} ${cy})">
    <circle r="${r * 0.9}" fill="url(#glow)"/>
    <path d="M0 ${-r} Q${t} ${-t} ${r} 0 Q${t} ${t} 0 ${r} Q${-t} ${t} ${-r} 0 Q${-t} ${-t} 0 ${-r}Z" fill="#FFE7A3"/>
    <path d="M0 ${-r * 0.55} Q${t * 0.5} ${-t * 0.5} ${r * 0.55} 0 Q${t * 0.5} ${t * 0.5} 0 ${r * 0.55} Q${-t * 0.5} ${t * 0.5} ${-r * 0.55} 0 Q${-t * 0.5} ${-t * 0.5} 0 ${-r * 0.55}Z" fill="#FFFFFF"/>
  </g>`;
}

function petal(x: number, y: number, size: number, deg: number, fill = '#F7C5D3'): string {
  return `<path transform="translate(${x} ${y}) rotate(${deg}) scale(${size / 10})" d="M0 -10 C6 -6 6 4 0 10 C-6 4 -6 -6 0 -10Z" fill="${fill}"/>`;
}

const DEFS = `<defs>
  <radialGradient id="bgGrad" cx="50%" cy="38%" r="75%">
    <stop offset="0" stop-color="#5FAE93"/><stop offset=".55" stop-color="#2F7766"/><stop offset="1" stop-color="#173F3B"/>
  </radialGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#FFF4C9" stop-opacity=".95"/><stop offset="1" stop-color="#FFD66B" stop-opacity="0"/></radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
</defs>`;

/** Background layer on a 108-unit adaptive-icon canvas: jade gradient with raked-sand ripples. */
function background(): string {
  const ripples = Array.from({ length: 7 }, (_, i) => `<ellipse cx="54" cy="62" rx="${18 + i * 11}" ry="${12 + i * 8}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${DEFS}
  <rect width="108" height="108" fill="url(#bgGrad)"/>
  <g fill="none" stroke="#9FD3BE" stroke-opacity=".16" stroke-width="1.2">${ripples}</g>
</svg>`;
}

/** The emblem: two matching tiles tipping towards each other, a spark where they meet. */
function emblem(): string {
  return `${tile(LOTUS, 41, 56, 30, -13)}
  ${tile(LOTUS, 67, 56, 30, 13)}
  ${sparkle(54, 30, 9)}
  ${petal(24, 30, 3.2, -30)}${petal(86, 34, 2.6, 40, '#F3A6BC')}${petal(80, 84, 2.4, 110)}${petal(27, 82, 2, 70, '#FFFFFF')}`;
}

function foreground(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${DEFS}${emblem()}</svg>`;
}

/** Themed-icon (Android 13+) layer: a flat silhouette the launcher tints. */
function monochrome(): string {
  const lotus = `<path d="M0 -9 C4 -5 4 3 0 6 C-4 3 -4 -5 0 -9Z"/>
      <path transform="rotate(-42 0 6)" d="M0 -6 C3.4 -3 3.4 3 0 6 C-3.4 3 -3.4 -3 0 -6Z"/>
      <path transform="rotate(42 0 6)" d="M0 -6 C3.4 -3 3.4 3 0 6 C-3.4 3 -3.4 -3 0 -6Z"/>
      <path d="M-9 8.5 Q0 12.5 9 8.5" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round"/>`;
  const card = (cx: number, deg: number, extra = 0) =>
    `<rect transform="translate(${cx} 56) rotate(${deg})" x="${-15 - extra}" y="${-18 - extra}" width="${30 + 2 * extra}" height="${36 + 2 * extra}" rx="${5 + extra}"/>`;
  const cutout = (cx: number, deg: number) => `<g transform="translate(${cx} 55) rotate(${deg})" fill="#000">${lotus}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <mask id="left"><rect width="108" height="108" fill="#fff"/><g fill="#000">${card(67, 13, 2.6)}</g>${cutout(41, -13)}</mask>
  <mask id="right"><rect width="108" height="108" fill="#fff"/>${cutout(67, 13)}</mask>
  <g fill="#000" mask="url(#left)">${card(41, -13)}</g>
  <g fill="#000" mask="url(#right)">${card(67, 13)}</g>
  <path transform="translate(54 29)" d="M0 -9 Q2 -2 9 0 Q2 2 0 9 Q-2 2 -9 0 Q-2 -2 0 -9Z" fill="#000"/>
</svg>`;
}

/** Full legacy icon: background and emblem, emblem enlarged since no launcher mask crops it. */
function legacy(shape: 'square' | 'round'): string {
  const clip =
    shape === 'round' ? '<clipPath id="c"><circle cx="54" cy="54" r="54"/></clipPath>' : '<clipPath id="c"><rect width="108" height="108" rx="24"/></clipPath>';
  const ripples = Array.from({ length: 7 }, (_, i) => `<ellipse cx="54" cy="62" rx="${18 + i * 11}" ry="${12 + i * 8}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${DEFS}<defs>${clip}</defs>
  <g clip-path="url(#c)">
    <rect width="108" height="108" fill="url(#bgGrad)"/>
    <g fill="none" stroke="#9FD3BE" stroke-opacity=".16" stroke-width="1.2">${ripples}</g>
    <g transform="translate(54 56) scale(1.32) translate(-54 -56)">${emblem()}</g>
  </g>
</svg>`;
}

/** Splash logo for older Android versions: the emblem on a transparent canvas. */
function splash(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 14 72 84">${DEFS}${emblem()}</svg>`;
}

async function png(svg: string, w: number, h: number, file: string): Promise<void> {
  const out = join(res, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, await sharp(Buffer.from(svg)).resize(w, h).png().toBuffer());
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const;

for (const [name, scale] of Object.entries(DENSITIES)) {
  const legacySize = Math.round(48 * scale);
  const layerSize = Math.round(108 * scale);
  await png(legacy('square'), legacySize, legacySize, `mipmap-${name}/ic_launcher.png`);
  await png(legacy('round'), legacySize, legacySize, `mipmap-${name}/ic_launcher_round.png`);
  await png(foreground(), layerSize, layerSize, `mipmap-${name}/ic_launcher_foreground.png`);
  await png(background(), layerSize, layerSize, `mipmap-${name}/ic_launcher_background.png`);
  await png(monochrome(), layerSize, layerSize, `mipmap-${name}/ic_launcher_monochrome.png`);
}
await png(splash(), 480, 560, 'drawable-nodpi/splash_logo.png');

// Store-style 512 px icon and a preview sheet for the docs.
mkdirSync(join(root, 'docs/assets'), { recursive: true });
writeFileSync(join(root, 'docs/assets/icon-512.png'), await sharp(Buffer.from(legacy('square'))).resize(512, 512).png().toBuffer());
console.log('icons written to native/android/res and docs/assets/icon-512.png');
