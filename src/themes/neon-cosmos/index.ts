import type { Theme } from '../types.ts';
import { NEON_TILES } from './tiles.ts';

// A night sky: scattered stars of a few sizes and two faint nebula clouds.
const stars = (() => {
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: 90 }, () => {
    const x = (r() * 420).toFixed(0);
    const y = (r() * 900).toFixed(0);
    const s = (0.6 + r() * 1.6).toFixed(1);
    const o = (0.3 + r() * 0.6).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${s}" fill="#FFFFFF" opacity="${o}"/>`;
  }).join('');
})();

const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="900" viewBox="0 0 420 900">
  <defs>
    <radialGradient id="n1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7B3FE4" stop-opacity=".45"/><stop offset="1" stop-color="#7B3FE4" stop-opacity="0"/></radialGradient>
    <radialGradient id="n2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#16B3C9" stop-opacity=".35"/><stop offset="1" stop-color="#16B3C9" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="60" cy="160" rx="240" ry="150" fill="url(#n1)"/>
  <ellipse cx="380" cy="760" rx="260" ry="170" fill="url(#n2)"/>
  ${stars}
</svg>`;

export const neonCosmos: Theme = {
  id: 'neon-cosmos',
  name: 'Neon Cosmos',
  unlockLevel: 15,
  blurb: 'Glowing planets and gems on dark glass, with synth notes.',
  sound: { scale: [0, 2, 4, 7, 9], base: 329.63, instrument: 'synth', drone: [82.41, 123.47, 164.81] },
  vars: {
    '--bg': '#0E1330',
    '--bg-deep': '#0A0E26',
    '--surface': '#1B2250',
    '--ink': '#EEF1FF',
    '--ink-soft': '#A9B2E0',
    '--accent': '#FF5FD2',
    '--accent-ink': '#1B0B1F',
    '--accent-deep': '#D94CB4',
    '--gold': '#FFD166',
    '--danger': '#FF4D6D',
    '--tray': '#151B44',
    '--tray-edge': '#3B4590',
    '--well': '#0D1236',
    '--dim': '#000000',
    '--ink-edge': '#8A93C8',
    '--node-edge': '#3B4590',
    '--node-rim': '#6C78D8',
    '--locked-bg': '#151B44',
    '--locked-ink': '#5D669C',
    '--theme-color': '#0E1330',
  },
  tiles: NEON_TILES,
  tile: { face: '#232C66', faceShade: '#131944', edge: '#2DE2E6', edgeShade: '#127F9E', rim: '#7FEFFF', highlight: 'rgba(127,239,255,.45)' },
  particles: { colors: ['#FF5FD2', '#2DE2E6', '#FFD166', '#FFFFFF', '#B89BFF'], shape: 'star', count: 14, gravity: 120 },
  backdrop,
  mysteryArt: `<defs><filter id="mg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect x="8" y="8" width="84" height="84" rx="14" fill="#0D1236" stroke="#3B4590" stroke-width="2"/>
    <g filter="url(#mg)" fill="none" stroke="#B89BFF" stroke-width="5" stroke-linecap="round">
      <path d="M38 40 Q38 28 50 28 Q62 28 62 39 Q62 46 54 50 Q50 52 50 58"/>
    </g>
    <circle cx="50" cy="69" r="3.6" fill="#B89BFF" filter="url(#mg)"/>`,
};
