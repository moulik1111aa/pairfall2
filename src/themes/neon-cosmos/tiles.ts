// Neon Cosmos tile designs — original artwork, 18 kinds. Glowing line art on dark
// glass: each design has its own neon colour and silhouette. 100×100 viewBox.

const GLOW = `<filter id="g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
/** Neon stroke in a colour, with a translucent fill of the same colour. */
const n = (c: string, w = 3.2) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="${c}" fill-opacity=".22"`;
const line = (c: string, w = 3.2) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const wrap = (body: string) => `<defs>${GLOW}</defs><g filter="url(#g)">${body}</g>`;

const PINK = '#FF5FD2';
const CYAN = '#2DE2E6';
const YELLOW = '#FFD166';
const GREEN = '#7CFF6B';
const VIOLET = '#B89BFF';
const ORANGE = '#FF8C42';
const RED = '#FF4D6D';
const BLUE = '#5AA8FF';
const WHITE = '#F4F6FF';

export const NEON_TILES: readonly { name: string; svg: string }[] = [
  {
    name: 'Ringed planet',
    svg: wrap(`<circle cx="50" cy="50" r="20" ${n(ORANGE)}/><path d="M50 32 Q62 40 66 52" ${line(ORANGE, 2)} opacity=".6"/>
      <ellipse cx="50" cy="52" rx="38" ry="11" transform="rotate(-18 50 52)" ${line(YELLOW)}/>`),
  },
  {
    name: 'Star',
    svg: wrap(`<path d="M50 14 L59 39 L86 40 L65 56 L72 82 L50 67 L28 82 L35 56 L14 40 L41 39Z" ${n(YELLOW)}/>`),
  },
  {
    name: 'Comet',
    svg: wrap(`<circle cx="66" cy="34" r="12" ${n(CYAN)}/>
      <path d="M57 42 L16 82 M61 46 L30 84 M54 38 L14 66" ${line(CYAN, 2.6)} opacity=".85"/>`),
  },
  {
    name: 'Crescent moon',
    svg: wrap(`<path d="M60 16 A34 34 0 1 0 84 64 A27 27 0 1 1 60 16Z" ${n(WHITE)}/>
      <circle cx="74" cy="26" r="2.4" fill="${WHITE}"/><circle cx="84" cy="40" r="1.6" fill="${WHITE}"/>`),
  },
  {
    name: 'Rocket',
    svg: wrap(`<path d="M50 12 Q66 28 64 60 H36 Q34 28 50 12Z" ${n(RED)}/>
      <circle cx="50" cy="38" r="7" ${line(CYAN, 2.6)}/>
      <path d="M36 52 L24 68 L36 66 M64 52 L76 68 L64 66" ${line(RED)}/>
      <path d="M44 66 Q50 86 56 66" ${line(ORANGE)}/>`),
  },
  {
    name: 'Saucer',
    svg: wrap(`<path d="M36 48 Q38 28 50 28 Q62 28 64 48" ${n(CYAN)}/>
      <ellipse cx="50" cy="52" rx="36" ry="10" ${n(GREEN)}/>
      <circle cx="34" cy="53" r="2.4" fill="${YELLOW}"/><circle cx="50" cy="56" r="2.4" fill="${YELLOW}"/><circle cx="66" cy="53" r="2.4" fill="${YELLOW}"/>
      <path d="M38 66 L30 84 M62 66 L70 84" ${line(GREEN, 2.4)} opacity=".7"/>`),
  },
  {
    name: 'Galaxy',
    svg: wrap(`<path d="M50 50 m0 0 c6 -6 16 -2 16 6 c0 12 -18 16 -26 6 c-10 -12 2 -30 18 -28 c20 2 26 24 14 38 c-14 16 -42 10 -46 -10" ${line(VIOLET)}/>
      <circle cx="50" cy="50" r="5" fill="${WHITE}"/>`),
  },
  {
    name: 'Gem',
    svg: wrap(`<path d="M30 30 H70 L84 46 L50 84 L16 46Z" ${n(PINK)}/>
      <path d="M16 46 H84 M30 30 L40 46 L50 30 L60 46 L70 30 M40 46 L50 84 L60 46" ${line(PINK, 2)}/>`),
  },
  {
    name: 'Crystal',
    svg: wrap(`<path d="M50 14 L60 40 L54 82 H46 L40 40Z" ${n(GREEN)}/>
      <path d="M30 40 L38 56 L34 82 H26 L22 56Z" ${n(GREEN)}/>
      <path d="M70 34 L78 52 L74 82 H66 L62 52Z" ${n(GREEN)}/>
      <path d="M18 84 H82" ${line(GREEN, 2.6)}/>`),
  },
  {
    name: 'Helmet',
    svg: wrap(`<circle cx="50" cy="46" r="30" ${n(WHITE)}/>
      <path d="M30 46 Q30 30 50 30 Q70 30 70 46 Q70 60 50 60 Q30 60 30 46Z" ${n(BLUE)}/>
      <path d="M38 38 Q42 34 48 34" ${line(WHITE, 2.4)}/>
      <path d="M28 76 H72 V86 H28Z" ${n(WHITE)}/>`),
  },
  {
    name: 'Satellite',
    svg: wrap(`<rect x="40" y="40" width="20" height="20" rx="3" transform="rotate(45 50 50)" ${n(YELLOW)}/>
      <path d="M12 28 L30 46 L22 54 L4 36Z" ${n(BLUE)}/><path d="M70 46 L88 64 L80 72 L62 54Z" ${n(BLUE)}/>
      <path d="M50 36 L62 20 M60 18 Q70 24 64 30" ${line(YELLOW, 2.4)}/>`),
  },
  {
    name: 'Sun',
    svg: wrap(`<circle cx="50" cy="50" r="17" ${n(ORANGE)}/>
      <path d="M50 14 V24 M50 76 V86 M14 50 H24 M76 50 H86 M24 24 L31 31 M69 69 L76 76 M76 24 L69 31 M31 69 L24 76" ${line(YELLOW)}/>`),
  },
  {
    name: 'Alien',
    svg: wrap(`<path d="M50 16 Q78 16 76 46 Q74 74 50 84 Q26 74 24 46 Q22 16 50 16Z" ${n(GREEN)}/>
      <path d="M34 44 Q42 40 46 50 Q38 56 34 44Z" fill="${GREEN}"/><path d="M66 44 Q58 40 54 50 Q62 56 66 44Z" fill="${GREEN}"/>
      <path d="M44 68 Q50 72 56 68" ${line(GREEN, 2.4)}/>`),
  },
  {
    name: 'Asteroid',
    svg: wrap(`<path d="M26 34 L44 18 L68 22 L84 42 L78 70 L54 84 L28 76 L16 54Z" ${n(VIOLET)}/>
      <circle cx="42" cy="40" r="6" ${line(VIOLET, 2.2)}/><circle cx="62" cy="60" r="8" ${line(VIOLET, 2.2)}/><circle cx="38" cy="64" r="4" ${line(VIOLET, 2.2)}/>`),
  },
  {
    name: 'Telescope',
    svg: wrap(`<path d="M18 52 L70 26 L76 38 L24 64Z" ${n(PINK)}/>
      <path d="M70 26 L82 20 L88 32 L76 38" ${n(PINK)}/>
      <path d="M46 50 L36 84 M46 50 L56 84 M46 50 V84" ${line(WHITE, 2.4)}/>`),
  },
  {
    name: 'Constellation',
    svg: wrap(`<path d="M16 66 L34 44 L52 52 L68 28 L84 40 M52 52 L60 78" ${line(CYAN, 2)} opacity=".8"/>
      <g fill="${WHITE}"><circle cx="16" cy="66" r="4"/><circle cx="34" cy="44" r="4"/><circle cx="52" cy="52" r="5"/><circle cx="68" cy="28" r="4"/><circle cx="84" cy="40" r="3.5"/><circle cx="60" cy="78" r="3.5"/></g>`),
  },
  {
    name: 'Black hole',
    svg: wrap(`<ellipse cx="50" cy="50" rx="38" ry="14" ${line(RED)}/><ellipse cx="50" cy="50" rx="28" ry="9" ${line(ORANGE, 2.4)}/>
      <circle cx="50" cy="50" r="14" fill="#05060F" stroke="${ORANGE}" stroke-width="3"/>`),
  },
  {
    name: 'Earth',
    svg: wrap(`<circle cx="50" cy="50" r="30" ${n(BLUE)}/>
      <path d="M30 38 Q40 32 44 40 Q46 48 38 52 Q30 56 28 48 M56 26 Q66 30 64 40 Q60 46 54 42 M52 60 Q62 56 70 62 Q66 74 56 76 Q50 70 52 60Z" ${n(GREEN, 2.4)}/>`),
  },
];
