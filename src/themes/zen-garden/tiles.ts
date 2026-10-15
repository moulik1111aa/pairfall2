// Zen Garden tile designs — original artwork, 18 kinds.
// Each entry is the inner SVG markup for a 100×100 viewBox. Dominant colours and
// silhouettes are deliberately all different so pairs read at a glance.

const INK = '#26324A';
const S = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;

export const ZEN_TILES: readonly { name: string; svg: string }[] = [
  {
    name: 'Lotus',
    svg: `
      <path d="M22 72 Q50 84 78 72 Q72 80 50 82 Q28 80 22 72Z" fill="#7FB069" ${S}/>
      <path d="M50 22 Q62 40 58 66 Q50 72 42 66 Q38 40 50 22Z" fill="#E57FA5" ${S}/>
      <path d="M30 36 Q48 46 48 68 Q36 70 28 62 Q24 48 30 36Z" fill="#F0A3C0" ${S}/>
      <path d="M70 36 Q52 46 52 68 Q64 70 72 62 Q76 48 70 36Z" fill="#F0A3C0" ${S}/>
      <path d="M18 52 Q34 56 42 70 Q28 72 20 66 Q16 60 18 52Z" fill="#E57FA5" ${S}/>
      <path d="M82 52 Q66 56 58 70 Q72 72 80 66 Q84 60 82 52Z" fill="#E57FA5" ${S}/>`,
  },
  {
    name: 'Koi',
    svg: `
      <path d="M24 56 Q30 30 58 30 Q74 30 78 44 L90 34 Q88 50 90 64 L78 56 Q72 70 52 70 Q30 70 24 56Z" fill="#FFFFFF" ${S}/>
      <path d="M40 33 Q50 30 56 31 Q54 44 44 46 Q36 44 40 33Z" fill="#F06A3A"/>
      <path d="M58 52 Q66 50 72 58 Q64 68 54 68 Q52 60 58 52Z" fill="#F06A3A"/>
      <path d="M24 56 Q30 30 58 30 Q74 30 78 44 L90 34 Q88 50 90 64 L78 56 Q72 70 52 70 Q30 70 24 56Z" fill="none" ${S}/>
      <circle cx="34" cy="48" r="3.2" fill="${INK}"/>
      <path d="M50 70 Q46 80 38 82 Q42 74 44 69" fill="#F06A3A" ${S}/>`,
  },
  {
    name: 'Bamboo',
    svg: `
      <rect x="32" y="16" width="13" height="70" rx="5" fill="#7FB069" ${S}/>
      <rect x="54" y="26" width="13" height="60" rx="5" fill="#9CC583" ${S}/>
      <path d="M32 40 H45 M32 62 H45 M54 46 H67 M54 66 H67" ${S}/>
      <path d="M45 38 Q58 28 72 30 Q62 40 45 40Z" fill="#5E9A4E" ${S}/>
      <path d="M32 58 Q20 50 14 52 Q22 62 32 62Z" fill="#5E9A4E" ${S}/>`,
  },
  {
    name: 'Lantern',
    svg: `
      <path d="M50 12 V20" ${S}/>
      <rect x="38" y="20" width="24" height="8" rx="2" fill="#E9B949" ${S}/>
      <ellipse cx="50" cy="52" rx="26" ry="26" fill="#D9534F" ${S}/>
      <path d="M50 26 Q34 52 50 78 M50 26 Q66 52 50 78 M50 26 V78" fill="none" stroke="#9E2F2C" stroke-width="2.4"/>
      <ellipse cx="50" cy="52" rx="26" ry="26" fill="none" ${S}/>
      <rect x="38" y="76" width="24" height="8" rx="2" fill="#E9B949" ${S}/>
      <path d="M50 84 V92" ${S}/>`,
  },
  {
    name: 'Blossom',
    svg: `<g transform="translate(50 50) scale(1.25) translate(-50 -51)">
      <g ${S} fill="#FFFFFF">
        <path d="M50 50 Q38 30 46 18 L50 24 L54 18 Q62 30 50 50Z"/>
        <path d="M50 50 Q38 30 46 18 L50 24 L54 18 Q62 30 50 50Z" transform="rotate(72 50 50)"/>
        <path d="M50 50 Q38 30 46 18 L50 24 L54 18 Q62 30 50 50Z" transform="rotate(144 50 50)"/>
        <path d="M50 50 Q38 30 46 18 L50 24 L54 18 Q62 30 50 50Z" transform="rotate(216 50 50)"/>
        <path d="M50 50 Q38 30 46 18 L50 24 L54 18 Q62 30 50 50Z" transform="rotate(288 50 50)"/>
      </g>
      <circle cx="50" cy="51" r="9" fill="#F3A6BC" ${S}/>
      <g fill="#E9B949"><circle cx="50" cy="44" r="2.2"/><circle cx="56" cy="50" r="2.2"/><circle cx="44" cy="50" r="2.2"/><circle cx="53" cy="56" r="2.2"/><circle cx="47" cy="56" r="2.2"/></g></g>`,
  },
  {
    name: 'Crane',
    svg: `<g transform="translate(50 50) scale(1.12) translate(-50 -50)">
      <path d="M14 56 L46 50 L54 22 L60 50 L88 40 L62 62 L44 64Z" fill="#8CC7F0" ${S}/>
      <path d="M46 50 L60 50 L62 62 L44 64Z" fill="#B8DEF7" ${S}/>
      <path d="M44 64 L32 80 L50 70" fill="#8CC7F0" ${S}/>
      <path d="M14 56 L22 50 L28 54" fill="none" ${S}/>
      <circle cx="21" cy="52" r="2.4" fill="#D9534F"/></g>`,
  },
  {
    name: 'Fan',
    svg: `
      <path d="M50 76 L14 46 Q50 6 86 46Z" fill="#8E3B6E" ${S}/>
      <path d="M50 76 L26 34 M50 76 L38 26 M50 76 L50 24 M50 76 L62 26 M50 76 L74 34" stroke="#E9B949" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M50 76 L14 46 Q50 6 86 46Z" fill="none" ${S}/>
      <path d="M30 56 Q50 40 70 56" fill="none" stroke="#F3D9E7" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="76" r="5" fill="#E9B949" ${S}/>`,
  },
  {
    name: 'Bonsai',
    svg: `
      <path d="M30 74 H70 L64 88 H36Z" fill="#8C5A3C" ${S}/>
      <path d="M50 74 Q46 60 54 52 Q60 46 56 38" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M50 74 Q46 60 54 52 Q60 46 56 38" fill="none" stroke="#8C5A3C" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="38" cy="40" rx="17" ry="11" fill="#3E8E5E" ${S}/>
      <ellipse cx="64" cy="30" rx="18" ry="11" fill="#3E8E5E" ${S}/>
      <ellipse cx="70" cy="52" rx="13" ry="8" fill="#4FA56F" ${S}/>`,
  },
  {
    name: 'Moon',
    svg: `
      <circle cx="50" cy="50" r="34" fill="#34477A" ${S}/>
      <path d="M56 24 A27 27 0 1 0 56 76 A21 21 0 1 1 56 24Z" fill="#F7E7A6" ${S}/>
      <g fill="#F7E7A6"><circle cx="70" cy="34" r="2.5"/><circle cx="76" cy="54" r="1.8"/><circle cx="64" cy="66" r="2"/></g>`,
  },
  {
    name: 'Wave',
    svg: `
      <path d="M12 76 Q16 40 44 30 Q70 22 82 40 Q70 34 60 40 Q50 48 58 58 Q66 64 76 58 Q80 70 66 76Z" fill="#2F6DB5" ${S}/>
      <path d="M60 40 Q50 48 58 58 Q66 64 76 58" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      <path d="M12 76 H88" ${S}/>
      <g fill="#FFFFFF" ${S}><circle cx="80" cy="40" r="3.5"/><circle cx="86" cy="48" r="2.6"/></g>`,
  },
  {
    name: 'Maple',
    svg: `
      <path d="M50 14 L57 34 L74 24 L69 42 L88 44 L72 56 L80 70 L60 64 L54 74 L50 66 L46 74 L40 64 L20 70 L28 56 L12 44 L31 42 L26 24 L43 34Z" fill="#EE9A2E" ${S}/>
      <path d="M50 30 V90 M50 52 L66 40 M50 52 L34 40 M50 60 L66 60 M50 60 L34 60" fill="none" stroke="#B5651A" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M50 74 V90" ${S}/>`,
  },
  {
    name: 'Teapot',
    svg: `
      <path d="M26 46 Q24 82 50 82 Q76 82 74 46Z" fill="#3FA39A" ${S}/>
      <path d="M26 46 H74" ${S}/>
      <path d="M34 46 Q36 34 50 34 Q64 34 66 46" fill="#5FC0B6" ${S}/>
      <circle cx="50" cy="30" r="4.5" fill="#E9B949" ${S}/>
      <path d="M74 52 Q90 48 88 62 Q86 72 74 72" fill="none" ${S}/>
      <path d="M26 56 L12 44 L14 40 L28 50" fill="#3FA39A" ${S}/>
      <path d="M36 62 Q50 68 64 62" fill="none" stroke="#E9F6F3" stroke-width="3" stroke-linecap="round"/>`,
  },
  {
    name: 'Stones',
    svg: `
      <ellipse cx="50" cy="76" rx="30" ry="11" fill="#7D878D" ${S}/>
      <ellipse cx="50" cy="58" rx="22" ry="9" fill="#9AA3A8" ${S}/>
      <ellipse cx="50" cy="43" rx="15" ry="7" fill="#B7BFC3" ${S}/>
      <ellipse cx="50" cy="31" rx="9" ry="5" fill="#D3D9DC" ${S}/>
      <path d="M62 22 Q70 14 78 18 Q72 26 62 22Z" fill="#7FB069" ${S}/>`,
  },
  {
    name: 'Bell',
    svg: `
      <path d="M50 14 V22" ${S}/>
      <path d="M30 70 Q30 26 50 24 Q70 26 70 70Z" fill="#B8863B" ${S}/>
      <path d="M24 70 H76 Q76 78 70 78 H30 Q24 78 24 70Z" fill="#D9A653" ${S}/>
      <path d="M38 40 Q40 32 46 30" fill="none" stroke="#F2D59A" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="84" r="5" fill="#B8863B" ${S}/>`,
  },
  {
    name: 'Ginkgo',
    svg: `
      <path d="M50 70 Q20 60 16 32 Q34 18 50 22 Q66 18 84 32 Q80 60 50 70Z" fill="#EBCB3D" ${S}/>
      <path d="M50 22 L50 44" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 66 L30 34 M50 66 L40 28 M50 66 L60 28 M50 66 L70 34" stroke="#C9A41F" stroke-width="2" stroke-linecap="round"/>
      <path d="M50 70 Q48 80 42 88" fill="none" ${S}/>`,
  },
  {
    name: 'Drum',
    svg: `
      <path d="M24 34 Q18 50 24 66 L76 66 Q82 50 76 34Z" fill="#8C5A3C" ${S}/>
      <ellipse cx="24" cy="50" rx="7" ry="16" fill="#F4E9D2" ${S}/>
      <ellipse cx="76" cy="50" rx="7" ry="16" fill="#F4E9D2" ${S}/>
      <path d="M36 36 V64 M64 36 V64" stroke="#E9B949" stroke-width="3"/>
      <path d="M58 18 L82 34 M42 18 L18 34" ${S}/>
      <circle cx="58" cy="18" r="4" fill="#D9534F" ${S}/><circle cx="42" cy="18" r="4" fill="#D9534F" ${S}/>`,
  },
  {
    name: 'Cloud',
    svg: `
      <path d="M22 66 Q10 66 12 54 Q14 44 26 46 Q26 30 42 30 Q52 22 64 32 Q80 30 80 46 Q92 48 88 60 Q86 68 76 66Z" fill="#A9B8F0" ${S}/>
      <path d="M30 56 Q38 50 44 56 Q50 62 58 56" fill="none" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M26 78 H60 M40 86 H74" ${S}/>`,
  },
  {
    name: 'Butterfly',
    svg: `
      <path d="M50 46 Q34 20 18 26 Q12 42 30 50 Q14 58 22 72 Q36 78 50 56Z" fill="#9B6FD1" ${S}/>
      <path d="M50 46 Q66 20 82 26 Q88 42 70 50 Q86 58 78 72 Q64 78 50 56Z" fill="#9B6FD1" ${S}/>
      <circle cx="30" cy="36" r="4" fill="#E9D8FA"/><circle cx="70" cy="36" r="4" fill="#E9D8FA"/>
      <rect x="47" y="38" width="6" height="28" rx="3" fill="${INK}"/>
      <path d="M48 38 Q42 26 38 24 M52 38 Q58 26 62 24" fill="none" ${S}/>`,
  },
];
