// Плотность интерфейса: base — под какую ширину рисуем (спрайты кита масштабируются base→экран),
// ts — множитель текста, чтобы при мелких рамках текст оставался читаемым. Утверждено: «средне».
// Для сравнения можно открыть с ?density=cozy | medium | compact.
export const DENSITY: Record<string, { base: number; ts: number }> = {
  cozy: { base: 720, ts: 1 },
  medium: { base: 840, ts: 1.12 },
  compact: { base: 960, ts: 1.26 },
};
export const dens = DENSITY[new URLSearchParams(location.search).get('density') ?? ''] ?? DENSITY.medium;
/** Во сколько раз спрайты кита мельче, чем в его родной базе 720px: столько добираем кнопкам и переключателям. */
export const kitShrink = dens.base / 720;
