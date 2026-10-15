import type { Theme } from '../types.ts';
import { FESTIVE_TILES } from './tiles.ts';

// Rangoli dot-and-petal rosettes in two corners, faint against warm sandstone.
const rosette = (cx: number, cy: number, r: number) => {
  const ring = (rad: number, n: number, size: number, fill: string) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return `<circle cx="${(cx + Math.cos(a) * rad).toFixed(1)}" cy="${(cy + Math.sin(a) * rad).toFixed(1)}" r="${size}" fill="${fill}"/>`;
    }).join('');
  const petal = Array.from({ length: 12 }, (_, i) =>
    `<path d="M${cx} ${cy} Q${cx - r * 0.18} ${cy - r * 0.5} ${cx} ${cy - r * 0.78} Q${cx + r * 0.18} ${cy - r * 0.5} ${cx} ${cy}Z" transform="rotate(${i * 30} ${cx} ${cy})" fill="#F3B98A" opacity=".55"/>`,
  ).join('');
  return `${petal}${ring(r * 0.9, 24, 3.2, '#E9A06A')}${ring(r * 1.08, 36, 2.2, '#F0B27E')}<circle cx="${cx}" cy="${cy}" r="${r * 0.16}" fill="#E9A06A"/>`;
};

const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="900" viewBox="0 0 420 900">
  ${rosette(60, 130, 150)}
  ${rosette(380, 790, 170)}
</svg>`;

export const festiveIndia: Theme = {
  id: 'festive-india',
  name: 'Festive India',
  unlockLevel: 30,
  blurb: 'Diyas, rangoli and sweets in festival colours, with sitar plucks.',
  sound: { scale: [0, 1, 4, 7, 8], base: 261.63, instrument: 'sitar', drone: [65.41, 98, 130.81] },
  vars: {
    '--bg': '#FCE1C2',
    '--bg-deep': '#F6CFA4',
    '--surface': '#FFF8EE',
    '--ink': '#4A1E2E',
    '--ink-soft': '#7A4A57',
    '--accent': '#E2287A',
    '--accent-ink': '#FFFFFF',
    '--accent-deep': '#B81D63',
    '--gold': '#F2A900',
    '--danger': '#C0262D',
    '--tray': '#FFF4E4',
    '--tray-edge': '#E2AE7E',
    '--well': '#F9DFC0',
    '--dim': '#4A1E2E',
    '--ink-edge': '#2A0F19',
    '--node-edge': '#E2AE7E',
    '--node-rim': '#B9723F',
    '--locked-bg': '#F6E3CC',
    '--locked-ink': '#B99A86',
    '--theme-color': '#FCE1C2',
  },
  tiles: FESTIVE_TILES,
  tile: { face: '#FFFBF3', faceShade: '#F7E4C6', edge: '#F2A900', edgeShade: '#B86F00', rim: '#8E4F0E' },
  particles: { colors: ['#E2287A', '#F2A900', '#1FA37A', '#FF7A00', '#FFFFFF'], shape: 'spark', count: 16, gravity: 300 },
  backdrop,
};
