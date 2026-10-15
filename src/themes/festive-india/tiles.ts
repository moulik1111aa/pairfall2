// Festive India tile designs — original artwork, 18 kinds. Warm, celebratory
// motifs with shaded fills and a plum ink outline. 100×100 viewBox.

const INK = '#4A1E2E';
const S = `stroke="${INK}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`;
const THIN = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
const lg = (id: string, top: string, bottom: string, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
const rg = (id: string, inner: string, outer: string, cx = 0.35, cy = 0.3, r = 0.8) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`;
const shadow = (cx: number, cy: number, rx: number, ry = 4) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity=".14"/>`;
const shine = (d: string, op = 0.55) => `<path d="${d}" fill="#FFFFFF" opacity="${op}"/>`;
const petals = (n: number, d: string, attrs: string) =>
  Array.from({ length: n }, (_, i) => `<path d="${d}" transform="rotate(${(360 / n) * i} 50 50)" ${attrs}/>`).join('');

export const FESTIVE_TILES: readonly { name: string; svg: string }[] = [
  {
    name: 'Diya',
    svg: `<defs>${lg('dc', '#E07A3F', '#9C3F1A')}${rg('fl', '#FFF6B0', '#FF9A1F', 0.5, 0.65, 0.7)}</defs>
      ${shadow(50, 86, 30)}
      <path d="M50 14 Q62 32 56 46 Q50 54 44 46 Q38 32 50 14Z" fill="url(#fl)" ${S}/>
      <path d="M14 56 Q50 50 86 56 Q80 80 50 82 Q20 80 14 56Z" fill="url(#dc)" ${S}/>
      <path d="M22 62 Q50 58 78 62" fill="none" stroke="#F7C46B" stroke-width="2.4" stroke-linecap="round"/>
      <g fill="#F7C46B"><circle cx="34" cy="70" r="2.2"/><circle cx="50" cy="72" r="2.2"/><circle cx="66" cy="70" r="2.2"/></g>`,
  },
  {
    name: 'Rangoli',
    svg: `<defs>${lg('rq', '#3FD3C0', '#127A8C')}${rg('rc', '#FFE07A', '#F2A900', 0.5, 0.5, 0.6)}</defs>
      ${shadow(50, 90, 28)}
      <rect x="22" y="22" width="56" height="56" rx="4" fill="url(#rq)" ${S}/>
      <rect x="22" y="22" width="56" height="56" rx="4" transform="rotate(45 50 50)" fill="url(#rq)" ${S}/>
      <circle cx="50" cy="50" r="20" fill="#FFF3DC" ${S}/>
      <g fill="#E2287A" ${THIN}>${Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return `<circle cx="${(50 + Math.cos(a) * 13).toFixed(1)}" cy="${(50 + Math.sin(a) * 13).toFixed(1)}" r="3.2"/>`;
      }).join('')}</g>
      <circle cx="50" cy="50" r="6" fill="url(#rc)" ${THIN}/>
      <g fill="#F2A900">${[0, 90, 180, 270].map((d) => `<circle cx="50" cy="12" r="3" transform="rotate(${d + 45} 50 50)"/>`).join('')}</g>`,
  },
  {
    name: 'Mango',
    svg: `<defs>${rg('mg', '#FFE36B', '#F28C1F', 0.35, 0.3, 0.9)}${lg('lf', '#7CCB5A', '#2E7D3F')}</defs>
      ${shadow(50, 88, 26)}
      <path d="M46 22 Q76 18 80 50 Q82 80 54 84 Q24 86 22 58 Q20 40 34 32 Q40 28 46 22Z" fill="url(#mg)" ${S}/>
      <path d="M50 22 Q60 8 76 10 Q70 24 50 22Z" fill="url(#lf)" ${S}/>
      <path d="M46 22 Q46 16 42 12" fill="none" ${S}/>
      ${shine('M34 44 Q36 34 46 30 Q38 38 37 48Z', 0.7)}
      <path d="M62 74 Q72 66 72 54" fill="none" stroke="#E2287A" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`,
  },
  {
    name: 'Peacock feather',
    svg: `<defs>${rg('pe', '#1E4FC2', '#0B2A6E', 0.5, 0.5, 0.5)}${lg('pv', '#3FD3B0', '#1A8C74')}</defs>
      ${shadow(50, 90, 18)}
      <path d="M50 92 Q52 60 50 14" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M50 70 Q20 60 22 34 Q26 12 50 10 Q74 12 78 34 Q80 60 50 70Z" fill="url(#pv)" ${S}/>
      <ellipse cx="50" cy="36" rx="17" ry="20" fill="#F2C14E" ${THIN}/>
      <ellipse cx="50" cy="38" rx="11" ry="14" fill="url(#pe)" ${THIN}/>
      <ellipse cx="50" cy="40" rx="5" ry="7" fill="#3FD3B0"/>
      <path d="M30 56 L20 62 M70 56 L80 62 M28 44 L16 46 M72 44 L84 46" stroke="#1A8C74" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    name: 'Marigold',
    svg: `<defs>${rg('mo', '#FFD15C', '#F28A00', 0.5, 0.5, 0.7)}</defs>
      ${shadow(50, 88, 26)}
      ${petals(14, 'M50 50 Q42 28 50 14 Q58 28 50 50Z', `fill="url(#mo)" ${THIN}`)}
      ${petals(10, 'M50 50 Q44 36 50 26 Q56 36 50 50Z', `fill="#FFB52E" ${THIN}`)}
      <circle cx="50" cy="50" r="9" fill="#C25E00" ${S}/>
      <g fill="#FFD15C"><circle cx="47" cy="47" r="1.6"/><circle cx="53" cy="49" r="1.6"/><circle cx="49" cy="54" r="1.6"/></g>`,
  },
  {
    name: 'Kite',
    svg: `<defs>${lg('k1', '#FF6FAE', '#D61C6A')}${lg('k2', '#FFE07A', '#F2A900')}</defs>
      ${shadow(46, 88, 20)}
      <path d="M46 10 L76 40 L46 72 L16 40Z" fill="url(#k1)" ${S}/>
      <path d="M46 10 L76 40 L46 40Z" fill="url(#k2)"/>
      <path d="M16 40 L46 72 L46 40Z" fill="url(#k2)"/>
      <path d="M46 10 L76 40 L46 72 L16 40Z M46 10 V72 M16 40 H76" fill="none" ${S}/>
      <path d="M46 72 Q54 80 48 86 Q42 92 52 96" fill="none" ${S}/>
      <path d="M48 84 L42 80 L42 88Z M52 94 L58 90 L58 98Z" fill="#1FA37A" ${THIN}/>`,
  },
  {
    name: 'Fountain firework',
    svg: `<defs>${lg('an', '#F05A3A', '#A3281A')}</defs>
      ${shadow(50, 90, 18)}
      <path d="M38 88 L44 58 H56 L62 88Z" fill="url(#an)" ${S}/>
      <path d="M40 72 H60" stroke="#F7C46B" stroke-width="2.4"/>
      <g stroke-linecap="round" stroke-width="3">
        <path d="M50 54 Q46 30 30 18" stroke="#F2A900" fill="none"/><path d="M50 54 Q54 30 70 18" stroke="#F2A900" fill="none"/>
        <path d="M50 54 Q40 38 20 36" stroke="#E2287A" fill="none"/><path d="M50 54 Q60 38 80 36" stroke="#E2287A" fill="none"/>
        <path d="M50 54 V12" stroke="#FFD15C" fill="none"/>
      </g>
      <g fill="#FFFFFF" ${THIN}><circle cx="30" cy="18" r="3"/><circle cx="70" cy="18" r="3"/><circle cx="20" cy="36" r="2.6"/><circle cx="80" cy="36" r="2.6"/><circle cx="50" cy="12" r="3.4"/></g>`,
  },
  {
    name: 'Dhol',
    svg: `<defs>${lg('db', '#E8453C', '#A01F1F')}${rg('dh2', '#FFF8E6', '#EBD6A8', 0.4, 0.35, 0.8)}</defs>
      ${shadow(50, 86, 34)}
      <path d="M20 36 Q50 30 80 36 V68 Q50 74 20 68Z" fill="url(#db)" ${S}/>
      <path d="M22 40 L36 66 L50 40 L64 66 L78 40" fill="none" stroke="#F2C14E" stroke-width="2.6" stroke-linejoin="round"/>
      <ellipse cx="20" cy="52" rx="7" ry="16" fill="url(#dh2)" ${S}/>
      <ellipse cx="80" cy="52" rx="7" ry="16" fill="url(#dh2)" ${S}/>
      <path d="M58 22 Q70 12 84 16" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
  },
  {
    name: 'Bangles',
    svg: `<defs>${lg('bg1', '#3FD38A', '#16804C')}${lg('bg2', '#FFE07A', '#D49A00')}</defs>
      ${shadow(50, 86, 30)}
      <ellipse cx="40" cy="50" rx="26" ry="26" fill="none" stroke="${INK}" stroke-width="12"/>
      <ellipse cx="40" cy="50" rx="26" ry="26" fill="none" stroke="url(#bg1)" stroke-width="7"/>
      <ellipse cx="60" cy="50" rx="26" ry="26" fill="none" stroke="${INK}" stroke-width="12"/>
      <ellipse cx="60" cy="50" rx="26" ry="26" fill="none" stroke="url(#bg2)" stroke-width="7"/>
      <g fill="#E2287A"><circle cx="60" cy="24" r="2.2"/><circle cx="84" cy="44" r="2.2"/><circle cx="78" cy="68" r="2.2"/><circle cx="42" cy="72" r="2.2"/></g>`,
  },
  {
    name: 'Conch',
    svg: `<defs>${lg('cn', '#FFFFFF', '#F0D2C2')}</defs>
      ${shadow(50, 88, 28)}
      <path d="M20 54 Q20 24 52 18 Q80 16 84 40 Q86 58 70 70 L50 86 Q44 76 32 72 Q20 66 20 54Z" fill="url(#cn)" ${S}/>
      <path d="M58 30 Q70 32 70 44 Q70 54 60 54 Q52 54 52 46 Q52 40 58 40" fill="none" stroke="#C97B6A" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M30 60 Q42 62 50 74 M28 48 Q44 50 56 64" fill="none" stroke="#E4A493" stroke-width="2" stroke-linecap="round"/>
      ${shine('M28 44 Q32 30 46 24 Q36 32 33 46Z', 0.8)}`,
  },
  {
    name: 'Coconut',
    svg: `<defs>${rg('cc', '#B8794A', '#6A3C1C', 0.35, 0.3, 0.9)}</defs>
      ${shadow(50, 88, 28)}
      <circle cx="50" cy="54" r="30" fill="url(#cc)" ${S}/>
      <g stroke="#4F2B12" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".8"><path d="M28 44 Q34 54 30 66"/><path d="M70 40 Q76 52 72 66"/></g>
      <g fill="#3A1C0A"><circle cx="44" cy="40" r="3"/><circle cx="56" cy="40" r="3"/><circle cx="50" cy="49" r="3"/></g>
      <path d="M50 24 Q42 10 26 10 Q36 18 40 26 M50 24 Q60 8 76 10 Q66 18 60 26" fill="#2E9E57" ${S}/>`,
  },
  {
    name: 'Laddoo',
    svg: `<defs>${rg('ld', '#FFD27A', '#E08A12', 0.35, 0.3, 0.9)}${lg('pl', '#F9F2E6', '#D9C8AE')}</defs>
      ${shadow(50, 90, 34)}
      <path d="M12 76 H88 L80 86 H20Z" fill="url(#pl)" ${S}/>
      <circle cx="32" cy="62" r="15" fill="url(#ld)" ${S}/>
      <circle cx="68" cy="62" r="15" fill="url(#ld)" ${S}/>
      <circle cx="50" cy="38" r="15" fill="url(#ld)" ${S}/>
      <g fill="#FFF3C4"><circle cx="45" cy="33" r="1.8"/><circle cx="54" cy="37" r="1.6"/><circle cx="28" cy="58" r="1.6"/><circle cx="36" cy="64" r="1.6"/><circle cx="64" cy="58" r="1.6"/><circle cx="72" cy="66" r="1.6"/></g>
      <path d="M46 26 Q50 22 54 26" fill="none" stroke="#9AD36A" stroke-width="2.4" stroke-linecap="round"/>`,
  },
  {
    name: 'Star lantern',
    svg: `<defs>${rg('sl', '#FF7F6E', '#C0262D', 0.5, 0.45, 0.7)}</defs>
      ${shadow(50, 90, 20)}
      <path d="M50 4 V14" ${S}/>
      <path d="M50 14 L59 34 L82 36 L64 52 L70 76 L50 63 L30 76 L36 52 L18 36 L41 34Z" fill="url(#sl)" ${S}/>
      <path d="M50 30 L54 42 L66 43 L56 50 L60 62 L50 55 L40 62 L44 50 L34 43 L46 42Z" fill="#FFE07A" opacity=".85"/>
      <path d="M44 74 L42 92 M50 70 V94 M56 74 L58 92" stroke="#F2A900" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    name: 'Elephant',
    svg: `<defs>${lg('el', '#A9B2BC', '#6B7682')}${lg('cl', '#8E3BB8', '#5A1F7A')}</defs>
      ${shadow(50, 90, 30)}
      <path d="M22 64 Q16 36 42 28 Q64 22 76 38 Q84 50 78 64 L76 84 H64 L62 72 H40 L38 84 H26Z" fill="url(#el)" ${S}/>
      <path d="M76 44 Q90 52 86 70 Q84 80 92 82" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
      <path d="M76 44 Q90 52 86 70 Q84 80 92 82" fill="none" stroke="#8C96A2" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 30 Q64 26 72 36 Q66 50 54 52 Q46 44 50 30Z" fill="url(#cl)" ${S}/>
      <g fill="#F2C14E"><circle cx="58" cy="38" r="2.4"/><circle cx="64" cy="44" r="2"/><circle cx="56" cy="46" r="2"/></g>
      <circle cx="70" cy="40" r="2.6" fill="${INK}"/>
      <path d="M30 44 Q34 40 40 42" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".6"/>`,
  },
  {
    name: 'Paisley',
    svg: `<defs>${lg('ps', '#FF6FAE', '#B81D63')}</defs>
      ${shadow(50, 90, 22)}
      <path d="M58 86 Q20 84 20 54 Q20 26 48 18 Q74 12 80 36 Q86 58 62 62 Q50 62 52 74 Q54 82 58 86Z" fill="url(#ps)" ${S}/>
      <path d="M46 52 Q34 46 36 34 Q40 24 52 26 Q64 28 64 40 Q62 50 52 50" fill="none" stroke="#FFE07A" stroke-width="2.6" stroke-linecap="round"/>
      <g fill="#FFE07A"><circle cx="30" cy="62" r="2.2"/><circle cx="36" cy="72" r="2.2"/><circle cx="46" cy="80" r="2.2"/><circle cx="72" cy="30" r="2.2"/></g>
      <circle cx="52" cy="38" r="4" fill="#1FA37A" ${THIN}/>`,
  },
  {
    name: 'Chai',
    svg: `<defs>${lg('ku', '#D9744A', '#8E3A1E')}</defs>
      ${shadow(50, 90, 24)}
      <path d="M40 22 Q34 14 40 8 M52 24 Q46 14 52 6 M64 22 Q58 14 64 8" fill="none" stroke="#C9B6A6" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M24 34 H76 L68 84 Q50 90 32 84Z" fill="url(#ku)" ${S}/>
      <ellipse cx="50" cy="34" rx="26" ry="6" fill="#B8784A" ${S}/>
      <ellipse cx="50" cy="35" rx="20" ry="3.5" fill="#E8C49A"/>
      <path d="M30 50 H70" stroke="#F7C46B" stroke-width="2.4"/>
      ${shine('M32 44 Q34 62 40 78 Q34 72 31 52Z', 0.35)}`,
  },
  {
    name: 'Jalebi',
    svg: `<defs>${lg('jl', '#FFB347', '#E8590C')}</defs>
      ${shadow(50, 88, 30)}
      <path d="M50 50 m0 0 c5 -1 7 6 2 8 c-8 3 -14 -6 -9 -12 c7 -8 21 -4 22 7 c1 13 -15 21 -26 15 c-14 -8 -12 -28 2 -33 c17 -6 34 6 33 22 c-1 20 -22 31 -40 23" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
      <path d="M50 50 m0 0 c5 -1 7 6 2 8 c-8 3 -14 -6 -9 -12 c7 -8 21 -4 22 7 c1 13 -15 21 -26 15 c-14 -8 -12 -28 2 -33 c17 -6 34 6 33 22 c-1 20 -22 31 -40 23" fill="none" stroke="url(#jl)" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M38 30 Q46 26 54 28" fill="none" stroke="#FFF3C4" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
  },
  {
    name: 'Rakhi',
    svg: `<defs>${rg('rk', '#FFE07A', '#E09A00', 0.5, 0.5, 0.6)}</defs>
      ${shadow(50, 82, 34)}
      <path d="M6 52 Q28 46 34 50 M66 50 Q72 46 94 52" fill="none" stroke="#C0262D" stroke-width="4" stroke-linecap="round"/>
      <path d="M6 52 Q28 46 34 50 M66 50 Q72 46 94 52" fill="none" stroke="#F2A900" stroke-width="1.4" stroke-dasharray="3 4" stroke-linecap="round"/>
      ${petals(10, 'M50 50 Q42 36 50 24 Q58 36 50 50Z', `fill="#E2287A" ${THIN}`)}
      <circle cx="50" cy="50" r="13" fill="url(#rk)" ${S}/>
      <circle cx="50" cy="50" r="5" fill="#1FA37A" ${THIN}/>
      <g fill="#FFFFFF"><circle cx="50" cy="40" r="1.6"/><circle cx="59" cy="51" r="1.6"/><circle cx="41" cy="51" r="1.6"/></g>
      <path d="M8 54 L4 64 M92 54 L96 64" stroke="#C0262D" stroke-width="2.6" stroke-linecap="round"/>`,
  },
];
