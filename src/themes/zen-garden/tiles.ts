// Zen Garden tile designs — original artwork, 18 kinds.
// Each entry is the inner SVG markup for a 100×100 viewBox, drawn with shaded
// gradient fills, highlights and a soft contact shadow. Dominant colours and
// silhouettes all differ so pairs read at a glance, even at small sizes.
// Gradient ids only need to be unique within one tile image.

const INK = '#26324A';
const S = `stroke="${INK}" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"`;
const THIN = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;

/** Vertical linear gradient. */
const lg = (id: string, top: string, bottom: string, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
/** Radial gradient lit from the upper left. */
const rg = (id: string, inner: string, outer: string, cx = 0.35, cy = 0.3, r = 0.8) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient>`;
/** Soft contact shadow under the motif. */
const shadow = (cx: number, cy: number, rx: number, ry = 4) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}" opacity=".13"/>`;
/** White glint. */
const shine = (d: string, op = 0.55) => `<path d="${d}" fill="#FFFFFF" opacity="${op}"/>`;

export const ZEN_TILES: readonly { name: string; svg: string }[] = [
  {
    name: 'Lotus',
    svg: `<defs>${lg('pa', '#FFD3E2', '#E35C93')}${lg('pb', '#FFE6EF', '#F08DB3')}${lg('pad', '#9FD27C', '#4E8F45')}</defs>
      ${shadow(50, 84, 32)}
      <path d="M14 74 Q50 92 86 74 Q80 86 50 88 Q20 86 14 74Z" fill="url(#pad)" ${S}/>
      <path d="M30 80 Q50 84 70 80" fill="none" stroke="#3E7A38" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M16 54 Q34 56 42 74 Q26 76 18 68 Q14 62 16 54Z" fill="url(#pa)" ${S}/>
      <path d="M84 54 Q66 56 58 74 Q74 76 82 68 Q86 62 84 54Z" fill="url(#pa)" ${S}/>
      <path d="M28 34 Q48 44 48 74 Q34 74 27 64 Q22 48 28 34Z" fill="url(#pb)" ${S}/>
      <path d="M72 34 Q52 44 52 74 Q66 74 73 64 Q78 48 72 34Z" fill="url(#pb)" ${S}/>
      <path d="M50 14 Q64 36 60 68 Q50 76 40 68 Q36 36 50 14Z" fill="url(#pa)" ${S}/>
      ${shine('M47 26 Q43 40 44 56 Q41 40 47 26Z', 0.8)}
      <g fill="#F2C14E" ${THIN}><circle cx="45" cy="70" r="2.4"/><circle cx="50" cy="72" r="2.4"/><circle cx="55" cy="70" r="2.4"/></g>`,
  },
  {
    name: 'Koi',
    svg: `<defs>${lg('kb', '#FFFFFF', '#DCE4EA')}${lg('ks', '#FF9A5C', '#E2462A')}${lg('kf', '#FFB487', '#F0703F')}</defs>
      ${shadow(52, 82, 30)}
      <path d="M78 46 L92 32 Q94 50 92 66 L78 54Z" fill="url(#kf)" ${S}/>
      <path d="M48 70 Q44 82 34 86 Q38 76 40 68Z" fill="url(#kf)" ${S}/>
      <path d="M50 30 Q58 20 66 26 Q60 30 58 34Z" fill="url(#kf)" ${S}/>
      <path d="M18 54 Q24 28 56 28 Q74 28 80 48 Q74 70 50 72 Q24 72 18 54Z" fill="url(#kb)"/>
      <path d="M34 30 Q46 26 56 29 Q56 44 44 47 Q34 45 34 30Z" fill="url(#ks)"/>
      <path d="M56 52 Q66 48 76 56 Q68 70 54 71 Q50 60 56 52Z" fill="url(#ks)"/>
      <path d="M18 54 Q24 28 56 28 Q74 28 80 48 Q74 70 50 72 Q24 72 18 54Z" fill="none" ${S}/>
      <path d="M44 52 Q48 56 44 60 M52 50 Q56 55 52 60 M60 46 Q64 50 61 54" fill="none" stroke="#B9C6D1" stroke-width="1.6" stroke-linecap="round"/>
      ${shine('M26 46 Q32 34 44 32 Q34 38 30 48Z', 0.9)}
      <circle cx="28" cy="49" r="3.4" fill="${INK}"/><circle cx="27" cy="48" r="1.1" fill="#fff"/>
      <g fill="#BFE3F7" ${THIN}><circle cx="12" cy="40" r="3"/><circle cx="16" cy="30" r="2"/></g>`,
  },
  {
    name: 'Bamboo',
    svg: `<defs>${lg('st', '#B7E08F', '#5E9A4E', 1, 0)}${lg('st2', '#C9EAA6', '#72AE5C', 1, 0)}${lg('lf', '#8CCB6C', '#3E7A38')}</defs>
      ${shadow(50, 88, 26)}
      <rect x="28" y="12" width="15" height="76" rx="6" fill="url(#st)" ${S}/>
      <rect x="55" y="24" width="15" height="64" rx="6" fill="url(#st2)" ${S}/>
      <path d="M28 36 H43 M28 62 H43 M55 46 H70 M55 68 H70" ${S}/>
      <path d="M31 16 V33 M31 40 V59 M58 28 V43 M58 50 V65" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M43 34 Q58 20 78 22 Q66 36 43 36Z" fill="url(#lf)" ${S}/>
      <path d="M28 58 Q14 48 8 50 Q16 62 28 62Z" fill="url(#lf)" ${S}/>
      <path d="M70 66 Q84 60 90 64 Q82 72 70 70Z" fill="url(#lf)" ${S}/>
      <path d="M48 32 Q60 26 70 25" fill="none" stroke="#B7E08F" stroke-width="1.6" stroke-linecap="round"/>`,
  },
  {
    name: 'Lantern',
    svg: `<defs>${rg('lb', '#FF9A85', '#C23434', 0.4, 0.35, 0.75)}${lg('lg', '#F7D27A', '#C9922E')}${rg('glow', '#FFD27A', 'rgba(255,210,122,0)', 0.5, 0.5, 0.5)}</defs>
      <circle cx="50" cy="52" r="40" fill="url(#glow)" opacity=".35"/>
      <path d="M50 6 V16" ${S}/>
      <rect x="35" y="15" width="30" height="9" rx="3" fill="url(#lg)" ${S}/>
      <ellipse cx="50" cy="51" rx="29" ry="28" fill="url(#lb)" ${S}/>
      <path d="M50 23 Q30 51 50 79 M50 23 Q70 51 50 79 M50 23 Q40 51 50 79 M50 23 Q60 51 50 79" fill="none" stroke="#8E2424" stroke-width="1.6" opacity=".7"/>
      <ellipse cx="50" cy="51" rx="29" ry="28" fill="none" ${S}/>
      ${shine('M32 38 Q38 28 46 26 Q38 34 35 46Z', 0.6)}
      <rect x="35" y="78" width="30" height="9" rx="3" fill="url(#lg)" ${S}/>
      <path d="M50 87 V92" ${S}/>
      <path d="M46 92 H54 L52 98 H48Z" fill="#E2B24A" ${THIN}/>`,
  },
  {
    name: 'Blossom',
    svg: `<defs>${rg('bp', '#FFFFFF', '#FFC6D8', 0.5, 0.75, 0.9)}${rg('bc', '#FF9CBC', '#E0577F', 0.5, 0.5, 0.6)}</defs>
      ${shadow(50, 86, 26)}
      <g transform="translate(50 50) scale(1.32) translate(-50 -51)">
        <g ${S} fill="url(#bp)">
          <path d="M50 50 Q36 30 45 17 L50 23 L55 17 Q64 30 50 50Z"/>
          <path d="M50 50 Q36 30 45 17 L50 23 L55 17 Q64 30 50 50Z" transform="rotate(72 50 50)"/>
          <path d="M50 50 Q36 30 45 17 L50 23 L55 17 Q64 30 50 50Z" transform="rotate(144 50 50)"/>
          <path d="M50 50 Q36 30 45 17 L50 23 L55 17 Q64 30 50 50Z" transform="rotate(216 50 50)"/>
          <path d="M50 50 Q36 30 45 17 L50 23 L55 17 Q64 30 50 50Z" transform="rotate(288 50 50)"/>
        </g>
        <g stroke="#E77FA0" stroke-width="1.4" stroke-linecap="round" opacity=".8">
          <path d="M50 44 V30"/><path d="M50 44 V30" transform="rotate(72 50 50)"/><path d="M50 44 V30" transform="rotate(144 50 50)"/><path d="M50 44 V30" transform="rotate(216 50 50)"/><path d="M50 44 V30" transform="rotate(288 50 50)"/>
        </g>
        <circle cx="50" cy="50" r="8" fill="url(#bc)" ${S}/>
        <g fill="#F2C14E" ${THIN}><circle cx="50" cy="43" r="2"/><circle cx="57" cy="48" r="2"/><circle cx="43" cy="48" r="2"/><circle cx="54" cy="56" r="2"/><circle cx="46" cy="56" r="2"/></g>
      </g>`,
  },
  {
    name: 'Crane',
    svg: `<defs>${lg('c1', '#D4EEFF', '#8CC7F0')}${lg('c2', '#9FD3F5', '#4F9AD6')}${lg('c3', '#E9F6FF', '#B5DDF8')}</defs>
      ${shadow(50, 86, 30)}
      <g transform="translate(50 52) scale(1.14) translate(-50 -50)">
        <path d="M46 50 L56 18 L60 50Z" fill="url(#c1)" ${S}/>
        <path d="M60 50 L90 38 L64 62Z" fill="url(#c2)" ${S}/>
        <path d="M12 56 L46 50 L44 64Z" fill="url(#c1)" ${S}/>
        <path d="M46 50 L60 50 L64 62 L44 64Z" fill="url(#c3)" ${S}/>
        <path d="M44 64 L30 82 L52 70Z" fill="url(#c2)" ${S}/>
        <path d="M12 56 L20 49 L26 53" fill="none" ${S}/>
        <path d="M52 22 L55 46" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
        <circle cx="19" cy="51" r="2.6" fill="#E04848" ${THIN}/>
      </g>`,
  },
  {
    name: 'Fan',
    svg: `<defs>${lg('fl', '#C2559B', '#6E2456')}${lg('fr', '#FFF6E2', '#E9D5A8')}</defs>
      ${shadow(50, 84, 24)}
      <path d="M50 76 L12 46 Q50 2 88 46Z" fill="url(#fl)" ${S}/>
      <path d="M20 42 Q34 32 44 38 Q56 46 68 36 Q76 30 82 36" fill="none" stroke="#F2C14E" stroke-width="2" stroke-linecap="round"/>
      <path d="M24 30 Q36 22 46 26 Q58 32 70 24" fill="none" stroke="#F2C14E" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
      <g stroke="url(#fr)" stroke-width="3" stroke-linecap="round"><path d="M50 76 L22 38"/><path d="M50 76 L35 26"/><path d="M50 76 L50 22"/><path d="M50 76 L65 26"/><path d="M50 76 L78 38"/></g>
      <path d="M50 76 L12 46 Q50 2 88 46Z" fill="none" ${S}/>
      ${shine('M24 40 Q40 18 60 16 Q40 24 28 42Z', 0.25)}
      <circle cx="50" cy="76" r="5.5" fill="#F2C14E" ${S}/>
      <path d="M50 81 Q48 88 52 94" fill="none" stroke="#C23B54" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    name: 'Bonsai',
    svg: `<defs>${rg('g1', '#7FD39A', '#2E7A4C', 0.35, 0.25, 0.9)}${lg('tr', '#A8714A', '#6B4127', 1, 0)}${lg('pot', '#5A79C9', '#2E4483')}</defs>
      ${shadow(50, 91, 26)}
      <path d="M26 72 H74 L67 89 H33Z" fill="url(#pot)" ${S}/>
      <path d="M24 70 H76 V75 H24Z" fill="#7F99DC" ${S}/>
      <path d="M50 72 Q44 58 54 50 Q62 44 58 34" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
      <path d="M50 72 Q44 58 54 50 Q62 44 58 34" fill="none" stroke="url(#tr)" stroke-width="5" stroke-linecap="round"/>
      <path d="M55 50 Q66 48 72 52" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <path d="M55 50 Q66 48 72 52" fill="none" stroke="#8C5A3C" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M20 40 Q20 28 34 28 Q40 22 48 28 Q58 30 54 40 Q50 48 36 48 Q22 48 20 40Z" fill="url(#g1)" ${S}/>
      <path d="M46 26 Q48 14 62 14 Q72 10 80 18 Q90 24 82 32 Q78 40 62 38 Q48 38 46 26Z" fill="url(#g1)" ${S}/>
      <path d="M62 54 Q64 46 74 46 Q86 46 84 54 Q82 60 72 60 Q62 60 62 54Z" fill="url(#g1)" ${S}/>
      ${shine('M28 34 Q32 30 38 31 Q32 33 30 37Z', 0.7)}${shine('M56 20 Q62 15 70 16 Q62 19 59 24Z', 0.7)}
      <path d="M30 80 H44" stroke="#9DB3EA" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    name: 'Moon',
    svg: `<defs>${rg('ns', '#5A74B8', '#1F2C52', 0.4, 0.35, 0.8)}${lg('cr', '#FFF6CF', '#F2D27A')}</defs>
      ${shadow(50, 88, 26)}
      <circle cx="50" cy="50" r="36" fill="url(#ns)" ${S}/>
      <path d="M57 21 A29 29 0 1 0 57 79 A23 23 0 1 1 57 21Z" fill="url(#cr)" ${S}/>
      <circle cx="40" cy="62" r="3" fill="#E8C463" opacity=".7"/><circle cx="34" cy="44" r="2" fill="#E8C463" opacity=".7"/>
      <g fill="#FFF3C4">
        <path d="M72 30 L73.6 34.4 L78 36 L73.6 37.6 L72 42 L70.4 37.6 L66 36 L70.4 34.4Z"/>
        <path d="M76 58 L77 60.6 L79.6 61.6 L77 62.6 L76 65.2 L75 62.6 L72.4 61.6 L75 60.6Z"/>
        <circle cx="64" cy="70" r="1.6"/>
      </g>
      <path d="M58 76 Q66 70 74 74 Q82 72 86 78 Q80 82 70 80 Q62 82 58 76Z" fill="#C9D3F4" ${THIN}/>`,
  },
  {
    name: 'Wave',
    svg: `<defs>${lg('wv', '#4E9BE6', '#1B4A91')}${lg('wi', '#8CC6F5', '#4E9BE6')}</defs>
      ${shadow(50, 84, 34)}
      <path d="M10 78 Q12 40 42 28 Q70 18 84 38 Q72 32 61 39 Q51 47 58 58 Q66 66 78 58 Q84 72 66 78Z" fill="url(#wv)" ${S}/>
      <path d="M20 74 Q24 50 44 40 Q54 36 60 39" fill="none" stroke="url(#wi)" stroke-width="5" stroke-linecap="round"/>
      <path d="M61 39 Q51 47 58 58 Q66 66 78 58" fill="none" stroke="#FFFFFF" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M84 38 Q88 33 86 28 M82 37 Q85 30 80 26 M78 35 Q79 29 74 27" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M8 78 H92" ${S}/>
      <path d="M14 86 Q24 82 34 86 Q44 90 54 86" fill="none" stroke="#4E9BE6" stroke-width="2.4" stroke-linecap="round"/>
      <g fill="#FFFFFF" ${THIN}><circle cx="88" cy="46" r="3.2"/><circle cx="92" cy="54" r="2.2"/><circle cx="84" cy="52" r="1.6"/></g>`,
  },
  {
    name: 'Maple',
    svg: `<defs>${lg('mp', '#FFC24A', '#E0542A')}</defs>
      ${shadow(50, 90, 22)}
      <path d="M50 10 L57.5 31 L75 21 L70 40 L90 42 L73 55 L82 71 L60.5 65 L54 76 L50 67 L46 76 L39.5 65 L18 71 L27 55 L10 42 L30 40 L25 21 L42.5 31Z" fill="url(#mp)" ${S}/>
      <path d="M50 28 V76 M50 52 L68 38 M50 52 L32 38 M50 60 L70 60 M50 60 L30 60" fill="none" stroke="#B6411C" stroke-width="2" stroke-linecap="round"/>
      ${shine('M48 18 L45 34 Q40 30 36 27 Q44 30 48 18Z', 0.6)}
      <path d="M50 76 Q50 84 46 92" fill="none" ${S}/>`,
  },
  {
    name: 'Teapot',
    svg: `<defs>${rg('tp', '#7FE0D2', '#227A72', 0.35, 0.3, 0.85)}${lg('tl', '#8AE6D9', '#3FA39A')}</defs>
      ${shadow(50, 88, 30)}
      <path d="M70 26 Q66 18 72 12 M78 28 Q76 20 82 14" fill="none" stroke="#B9C6D1" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
      <path d="M74 50 Q92 46 90 62 Q88 74 74 74" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M74 50 Q92 46 90 62 Q88 74 74 74" fill="none" stroke="#3FA39A" stroke-width="3" stroke-linecap="round"/>
      <path d="M26 56 L10 42 L12 37 L30 50" fill="url(#tl)" ${S}/>
      <path d="M24 46 Q22 84 50 84 Q78 84 76 46Z" fill="url(#tp)" ${S}/>
      <path d="M24 46 H76" ${S}/>
      <path d="M33 46 Q35 32 50 32 Q65 32 67 46" fill="url(#tl)" ${S}/>
      <circle cx="50" cy="29" r="5" fill="#F2C14E" ${S}/>
      ${shine('M32 54 Q34 68 44 74 Q34 72 30 60Z', 0.55)}
      <path d="M36 62 Q50 68 64 62" fill="none" stroke="#E9F6F3" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    name: 'Stones',
    svg: `<defs>${rg('s1', '#AAB4BA', '#5E686E', 0.35, 0.25, 0.9)}${rg('s2', '#C2CACE', '#7D878D', 0.35, 0.25, 0.9)}${rg('s3', '#DCE2E5', '#99A3A8', 0.35, 0.25, 0.9)}${lg('lf2', '#9FD27C', '#4E8F45')}</defs>
      <path d="M8 86 Q30 80 50 86 Q70 92 92 86 M14 93 Q34 88 52 93 Q70 98 88 93" fill="none" stroke="#C3D3C8" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="50" cy="76" rx="32" ry="11" fill="url(#s1)" ${S}/>
      <ellipse cx="50" cy="58" rx="24" ry="9.5" fill="url(#s2)" ${S}/>
      <ellipse cx="50" cy="42" rx="17" ry="7.5" fill="url(#s3)" ${S}/>
      <ellipse cx="50" cy="29" rx="10" ry="5.5" fill="url(#s3)" ${S}/>
      ${shine('M30 72 Q40 67 54 68 Q40 70 32 75Z', 0.45)}${shine('M36 55 Q44 51 54 52 Q44 54 38 57Z', 0.5)}${shine('M40 40 Q46 37 52 38 Q46 40 42 42Z', 0.6)}
      <path d="M58 25 Q66 12 78 15 Q72 26 58 25Z" fill="url(#lf2)" ${S}/>
      <path d="M58 25 Q64 20 72 18" fill="none" stroke="#C9EAA6" stroke-width="1.4" stroke-linecap="round"/>`,
  },
  {
    name: 'Bell',
    svg: `<defs>${lg('bl', '#F2CB72', '#9C6B26', 1, 0.6)}${lg('br', '#F7DC97', '#B8862B')}</defs>
      ${shadow(50, 90, 24)}
      <path d="M50 6 V18" stroke="#C23B54" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="50" cy="19" r="4" fill="url(#br)" ${S}/>
      <path d="M28 70 Q28 24 50 22 Q72 24 72 70Z" fill="url(#bl)" ${S}/>
      <path d="M22 70 H78 Q78 79 71 79 H29 Q22 79 22 70Z" fill="url(#br)" ${S}/>
      <path d="M30 56 H70" stroke="#7E5520" stroke-width="2" opacity=".6"/>
      <path d="M31 62 H69" stroke="#7E5520" stroke-width="1.4" opacity=".5"/>
      ${shine('M36 60 Q34 36 46 28 Q40 40 40 60Z', 0.55)}
      <circle cx="50" cy="85" r="5.5" fill="url(#bl)" ${S}/>`,
  },
  {
    name: 'Ginkgo',
    svg: `<defs>${lg('gk', '#FFE98A', '#E0A019')}</defs>
      ${shadow(50, 90, 22)}
      <path d="M50 70 Q18 62 12 32 Q30 14 46 20 L50 30 L54 20 Q70 14 88 32 Q82 62 50 70Z" fill="url(#gk)" ${S}/>
      <g stroke="#C08A12" stroke-width="1.6" stroke-linecap="round" opacity=".85">
        <path d="M50 66 L22 32"/><path d="M50 66 L30 24"/><path d="M50 66 L40 22"/><path d="M50 66 L60 22"/><path d="M50 66 L70 24"/><path d="M50 66 L78 32"/>
      </g>
      ${shine('M20 32 Q28 22 40 22 Q30 28 24 38Z', 0.6)}
      <path d="M50 70 Q48 82 40 92" fill="none" ${S}/>`,
  },
  {
    name: 'Drum',
    svg: `<defs>${lg('dw', '#C2875A', '#6B3F22')}${rg('dh', '#FFFBF0', '#E9DCC0', 0.4, 0.35, 0.8)}</defs>
      ${shadow(50, 84, 34)}
      <path d="M60 14 L84 30 M40 14 L16 30" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <path d="M60 14 L84 30 M40 14 L16 30" stroke="#E9D5A8" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="60" cy="14" r="4.5" fill="#E04848" ${S}/><circle cx="40" cy="14" r="4.5" fill="#E04848" ${S}/>
      <path d="M22 34 Q14 52 22 70 L78 70 Q86 52 78 34Z" fill="url(#dw)" ${S}/>
      <path d="M34 36 V68 M66 36 V68" stroke="#F2C14E" stroke-width="3"/>
      <g fill="#F2C14E" ${THIN}><circle cx="34" cy="40" r="1.8"/><circle cx="34" cy="52" r="1.8"/><circle cx="34" cy="64" r="1.8"/><circle cx="66" cy="40" r="1.8"/><circle cx="66" cy="52" r="1.8"/><circle cx="66" cy="64" r="1.8"/></g>
      ${shine('M38 38 Q50 36 62 38 Q50 40 38 42Z', 0.35)}
      <ellipse cx="22" cy="52" rx="8" ry="18" fill="url(#dh)" ${S}/>
      <ellipse cx="78" cy="52" rx="8" ry="18" fill="url(#dh)" ${S}/>
      <path d="M44 52 Q50 46 56 52 Q50 58 44 52Z" fill="#C23B54" opacity=".85"/>`,
  },
  {
    name: 'Cloud',
    svg: `<defs>${lg('cl', '#E2E8FF', '#8E9EE6')}</defs>
      ${shadow(50, 84, 30)}
      <path d="M20 68 Q6 68 8 54 Q10 42 24 44 Q24 26 42 26 Q54 16 68 28 Q86 26 86 44 Q96 48 92 60 Q90 70 78 68Z" fill="url(#cl)" ${S}/>
      <path d="M30 56 Q30 48 38 48 Q44 48 44 54 Q44 58 40 58" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      <path d="M56 50 Q56 40 66 40 Q74 40 74 48 Q74 54 68 54" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
      ${shine('M26 40 Q32 30 44 30 Q34 34 30 42Z', 0.7)}
      <path d="M22 80 H58 M40 89 H80" stroke="#8E9EE6" stroke-width="3" stroke-linecap="round"/>`,
  },
  {
    name: 'Butterfly',
    svg: `<defs>${lg('bw', '#D2AEF7', '#6E3FB6')}${lg('bw2', '#C49BF2', '#5A2F9E')}</defs>
      ${shadow(50, 86, 26)}
      <path d="M50 46 Q34 16 14 22 Q6 42 28 50 Q10 58 18 74 Q34 82 50 56Z" fill="url(#bw)" ${S}/>
      <path d="M50 46 Q66 16 86 22 Q94 42 72 50 Q90 58 82 74 Q66 82 50 56Z" fill="url(#bw2)" ${S}/>
      <path d="M50 46 Q38 30 22 28 M50 54 Q36 60 26 68 M50 46 Q62 30 78 28 M50 54 Q64 60 74 68" fill="none" stroke="#4A2585" stroke-width="1.4" opacity=".6"/>
      <g fill="#FFF3C4" ${THIN}><circle cx="24" cy="34" r="4"/><circle cx="76" cy="34" r="4"/><circle cx="27" cy="64" r="2.6"/><circle cx="73" cy="64" r="2.6"/></g>
      ${shine('M18 28 Q24 22 32 24 Q24 26 20 32Z', 0.7)}
      <rect x="46.5" y="36" width="7" height="32" rx="3.5" fill="${INK}"/>
      <path d="M48 37 Q42 24 36 22 M52 37 Q58 24 64 22" fill="none" ${S}/>
      <circle cx="36" cy="22" r="2" fill="${INK}"/><circle cx="64" cy="22" r="2" fill="${INK}"/>`,
  },
];
