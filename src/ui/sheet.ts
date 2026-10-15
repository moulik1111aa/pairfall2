// Debug-only tile sheet (?debug&sheet): every tile design at full and in-game size.
import { App, html, type Screen } from './app.ts';
import { tileUrls } from '../themes/prerender.ts';
import { themeById } from '../themes/registry.ts';

export function sheetScreen(app: App): Screen {
  const id = new URLSearchParams(location.search).get('theme');
  if (id) app.setTheme(themeById(id));
  const urls = tileUrls(app.theme);
  const el = html(`<section class="screen" style="overflow:auto;padding:16px;display:block">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${urls
      .map((u, i) => `<figure style="margin:0;text-align:center;font-size:12px"><img src="${u}" alt="" style="width:100%"><figcaption>${(app.theme.tiles[i]?.name ?? (i === app.theme.tiles.length ? 'Wild' : 'Face-down'))}</figcaption></figure>`)
      .join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:16px">${urls.map((u) => `<img src="${u}" alt="" style="width:42px">`).join('')}</div>
  </section>`);
  return { el };
}
