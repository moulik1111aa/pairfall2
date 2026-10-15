import { DEFAULT_THEME } from './themes/registry.ts';
import { tileUrls } from './themes/prerender.ts';

const app = document.getElementById('app')!;
const params = new URLSearchParams(location.search);
if (params.has('sheet')) {
  const urls = tileUrls(DEFAULT_THEME);
  app.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px;overflow:auto;background:#D9E4DC';
  app.innerHTML = urls.map((u, i) => `<figure style="margin:0;text-align:center;font:12px system-ui"><img src="${u}" style="width:100%"><figcaption>${DEFAULT_THEME.tiles[i].name}</figcaption></figure>`).join('') +
    `<div style="grid-column:1/-1;display:flex;gap:4px;flex-wrap:wrap">${urls.map((u) => `<img src="${u}" style="width:40px">`).join('')}</div>`;
} else {
  app.innerHTML = '<h1 style="text-align:center;margin-top:40vh">Pairfall</h1>';
}
