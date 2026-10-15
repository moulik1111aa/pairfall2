// Artwork shared by every theme unless a theme supplies its own: the wild tile
// and the face-down "mystery" tile. 100×100 viewBox, like the tile designs.

/** A golden ensō (brush circle) with sparkles: matches anything. */
export const WILD_ART = `<defs>
    <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset=".5" stop-color="#F2B33D"/><stop offset="1" stop-color="#D9822B"/></linearGradient>
    <radialGradient id="wh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF6D6"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="40" fill="url(#wh)"/>
  <path d="M74 30 A30 30 0 1 0 80 52" fill="none" stroke="#26324A" stroke-width="15" stroke-linecap="round"/>
  <path d="M74 30 A30 30 0 1 0 80 52" fill="none" stroke="url(#wg)" stroke-width="10" stroke-linecap="round"/>
  <path d="M50 38 L53 47 L62 50 L53 53 L50 62 L47 53 L38 50 L47 47Z" fill="#F2B33D" stroke="#26324A" stroke-width="2" stroke-linejoin="round"/>
  <path d="M80 18 L81.6 22.4 L86 24 L81.6 25.6 L80 30 L78.4 25.6 L74 24 L78.4 22.4Z" fill="#FFE08A" stroke="#26324A" stroke-width="1.4" stroke-linejoin="round"/>
  <circle cx="22" cy="80" r="3" fill="#FFE08A" stroke="#26324A" stroke-width="1.4"/>`;

/** Face-down tile: a soft swirl pattern with a question mark. */
export const MYSTERY_ART = `<defs>
    <pattern id="mp" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 10 Q5 4 10 10 T20 10" fill="none" stroke="#9AA9C9" stroke-width="1.6" opacity=".55"/></pattern>
  </defs>
  <rect x="6" y="6" width="88" height="88" rx="14" fill="#DCE3F2"/>
  <rect x="6" y="6" width="88" height="88" rx="14" fill="url(#mp)"/>
  <circle cx="50" cy="50" r="24" fill="#FFFFFF" stroke="#26324A" stroke-width="2.8"/>
  <path d="M42 43 Q42 34 50 34 Q58 34 58 42 Q58 47 52 50 Q50 51 50 55" fill="none" stroke="#26324A" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="50" cy="63" r="3.2" fill="#26324A"/>`;
