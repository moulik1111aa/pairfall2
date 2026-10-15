// Inline SVG icons (original).

export const ICONS = {
  sound: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="2" fill="currentColor"/><rect x="14" y="4" width="5" height="16" rx="2" fill="currentColor"/></svg>`,
  back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  /** A mon: round coin with a square hole. */
  coin: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#E2B24A" stroke="#26324A" stroke-width="1.8"/><circle cx="12" cy="12" r="7" fill="none" stroke="#B8862B" stroke-width="1.2"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#FBF9F4" stroke="#26324A" stroke-width="1.6"/></svg>`,
  lantern: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="8" y="4" width="8" height="2.5" rx="1" fill="#E9B949"/><ellipse cx="12" cy="13" rx="7" ry="7" fill="#D9534F"/><path d="M12 6c-4 4-4 10 0 14M12 6c4 4 4 10 0 14" fill="none" stroke="#9E2F2C" stroke-width="1.2"/><rect x="8" y="19.5" width="8" height="2.5" rx="1" fill="#E9B949"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>`,
  finger: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 30V12a5 5 0 0 1 10 0v15l13 3c4 1 6 4 5 8l-3 13c-1 4-4 7-8 7H30c-3 0-5-1-7-3l-9-11c-2-2-2-5 0-7s5-2 7 0l3 3Z" fill="#FBF9F4" stroke="#26324A" stroke-width="3" stroke-linejoin="round"/></svg>`,
};

export function starIcon(filled: boolean): string {
  return `<svg class="star" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4l6 13 14 1.6-10.5 9.6 3 14L24 35l-12.5 7.2 3-14L4 18.6 18 17Z" fill="${filled ? '#E2B24A' : '#DCE5DE'}" stroke="${filled ? '#26324A' : '#A8BDB0'}" stroke-width="2.6" stroke-linejoin="round"/></svg>`;
}

export function coinsBadge(n: number): string {
  return `<span class="coins" aria-label="${n} coins">${ICONS.coin}<span class="coin-count">${n}</span></span>`;
}
