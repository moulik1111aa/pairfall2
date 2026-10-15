import type { Theme } from '../types.ts';
import { ZEN_TILES } from './tiles.ts';

// Raked-sand ripples around two stones — the garden the board sits in.
const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="900" viewBox="0 0 420 900">
  <g fill="none" stroke="#C3D3C8" stroke-width="2">
    ${Array.from({ length: 9 }, (_, i) => `<ellipse cx="70" cy="120" rx="${34 + i * 22}" ry="${22 + i * 15}"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<ellipse cx="360" cy="800" rx="${30 + i * 22}" ry="${20 + i * 15}"/>`).join('')}
  </g>
  <ellipse cx="70" cy="120" rx="24" ry="14" fill="#A9B6AE"/>
  <ellipse cx="360" cy="800" rx="20" ry="12" fill="#A9B6AE"/>
</svg>`;

export const zenGarden: Theme = {
  id: 'zen-garden',
  name: 'Zen Garden',
  unlockLevel: 1,
  blurb: 'Pastel paper, lotus and koi, soft koto notes.',
  sound: { scale: [0, 2, 5, 7, 9], base: 293.66, instrument: 'koto', drone: [73.42, 110, 146.83] },
  vars: {
    '--bg': '#D9E4DC',
    '--bg-deep': '#C6D6CB',
    '--surface': '#FBF9F4',
    '--ink': '#26324A',
    '--ink-soft': '#5A6578',
    '--accent': '#E57FA5',
    '--accent-ink': '#FFFFFF',
    '--accent-deep': '#C45D84',
    '--gold': '#D9A63A',
    '--danger': '#C23B54',
    '--tray': '#EEF2EC',
    '--tray-edge': '#A8BDB0',
    '--well': '#DCE5DE',
  },
  tiles: ZEN_TILES,
  tile: { face: '#FFFDF8', faceShade: '#F0EADC', edge: '#A9C9B6', edgeShade: '#73997F', rim: '#5F8270' },
  particles: { colors: ['#F7C5D3', '#F3A6BC', '#FFFFFF', '#E57FA5'], shape: 'petal', count: 14, gravity: 260 },
  backdrop,
};
