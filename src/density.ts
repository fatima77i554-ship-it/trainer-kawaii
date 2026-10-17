// Размер интерфейса: base — под какую ширину рисуем (на телефоне всё вписывается base → ширина экрана),
// ts — множитель текста. Выбирается в Настройках («Размер интерфейса»), хранится в localStorage;
// для проверки можно открыть с ?density=small | medium | large. Базы продублированы в index.html (скрипт для iPhone).
export const DENSITY: Record<string, { base: number; ts: number; label: string }> = {
  small: { base: 840, ts: 1.12, label: 'Мельче' },
  medium: { base: 720, ts: 1, label: 'Средне' },
  large: { base: 620, ts: 1, label: 'Крупнее' },
};
export const SIZE_KEY = 'trainer_kawaii_size';
const saved = (() => { try { return localStorage.getItem(SIZE_KEY); } catch { return null; } })();
export const densKey = [new URLSearchParams(location.search).get('density'), saved].find(k => k && DENSITY[k]) ?? 'medium';
export const dens = DENSITY[densKey];
/** Во сколько раз спрайты кита мельче, чем в его родной базе 720px. */
export const kitShrink = dens.base / 720;
/** Сменить размер: запоминаем и перезапускаем страницу — на iPhone масштаб задаётся до первой отрисовки. */
export function setDensity(key: string) {
  try { localStorage.setItem(SIZE_KEY, key); } catch { /* */ }
  const u = new URL(location.href); u.searchParams.delete('density');
  location.replace(u.toString());
}
