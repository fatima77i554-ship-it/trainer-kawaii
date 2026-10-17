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

// Интерфейс нарисован под ширину 600px и масштабируется под экран телефона.
const BASE = 600;
// На телефоне — по ширине; на широком экране (превью на компьютере) — чтобы влезала высота.
const fit = () => {
  const w = window.innerWidth, h = window.innerHeight;
  const z = w < BASE ? w / BASE : Math.min(1, h / 1050);
  document.documentElement.style.setProperty('--zoom', String(z));
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
}

loadSaved();
seedDemo();
createRoot(document.getElementById('root')!).render(<App />);
