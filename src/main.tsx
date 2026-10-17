import 'cozy-ui-kit-fonts';
import 'cozy-ui-kit-css';
import './app.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { seedDemo } from './data';
import { loadSaved } from './persist';
import { inTG, pop, tg } from './store';

// Палитра фона: ?palette=milk | mint | lavender (по умолчанию) | candy (старая) — для сравнения на телефоне.
const palette = new URLSearchParams(location.search).get('palette');
if (palette) document.documentElement.dataset.palette = palette;

// Интерфейс нарисован под ширину 720px (база кита) и масштабируется под экран через zoom.
// Ширину мерим со снятым zoom: часть движков отдаёт размеры окна уже «в зуме», и масштаб начинает гулять.
const BASE = 720;
let curZoom = 0;
const fit = () => {
  const root = document.documentElement;
  root.style.zoom = '1';
  const w = root.clientWidth || window.innerWidth, h = window.innerHeight;
  const z = w < BASE ? w / BASE : Math.min(1, h / 1280);
  root.style.zoom = String(z);
  if (Math.abs(z - curZoom) > 0.001) curZoom = z;
};
fit();
addEventListener('resize', fit);

if (inTG) {
  tg.ready();
  tg.expand();
  try { if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes(); } catch { /* */ }
  // шапка и фон Telegram — в цвет фона приложения, нижняя панель — в цвет бумажного меню
  const css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue('--bg').trim() || '#e4ddf4', paper = css.getPropertyValue('--cozy-paper').trim() || '#fffeeb';
  try { tg.setHeaderColor(bg); tg.setBackgroundColor(bg); } catch { /* */ }
  try { if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor(paper); } catch { /* */ }
  try { tg.BackButton.onClick(pop); } catch { /* */ }
  try { tg.onEvent('viewportChanged', fit); } catch { /* */ }
}

loadSaved();
seedDemo();
createRoot(document.getElementById('root')!).render(<App />);
