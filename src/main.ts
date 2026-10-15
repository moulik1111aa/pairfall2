import { App } from './ui/app.ts';
import { homeScreen } from './ui/home.ts';
import { playScreen } from './ui/play.ts';
import { mapScreen } from './ui/map.ts';
import { sheetScreen } from './ui/sheet.ts';
import { nativeBridge, nativeStorage } from './platform/native.ts';
import { browserStorage } from './storage/save.ts';

async function boot(): Promise<void> {
  // In the Android app, restore the save mirror (if the WebView lost its storage)
  // before anything reads the save.
  const native = nativeBridge();
  const storage = native ? await nativeStorage(native) : browserStorage();
  const app = new App(document.getElementById('app')!, storage, native);
  if (app.debug) (window as unknown as { __app: App }).__app = app;
  const params = new URLSearchParams(location.search);
  const level = Number(params.get('level'));
  if (params.has('map')) app.show(mapScreen);
  else if (app.debug && params.has('sheet')) app.show(sheetScreen);
  else if (app.debug && Number.isInteger(level) && level > 0) app.show(playScreen(level));
  else app.show(homeScreen);
}

void boot();
