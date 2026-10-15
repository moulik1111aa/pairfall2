import { App } from './ui/app.ts';
import { homeScreen } from './ui/home.ts';
import { playScreen } from './ui/play.ts';
import { mapScreen } from './ui/map.ts';

const app = new App(document.getElementById('app')!);
const params = new URLSearchParams(location.search);
const level = Number(params.get('level'));
if (params.has('map')) app.show(mapScreen);
else if (app.debug && Number.isInteger(level) && level > 0) app.show(playScreen(level));
else app.show(homeScreen);
