// Правки тренера (виды, абонементы, настройки) сохраняются: в Telegram — в CloudStorage бота,
// в браузере — в localStorage. Демо-расписание и клиенты по-прежнему собираются заново.
import { PACKS, TEMPLATES, TYPES, type PackDef, type SessionType } from './data';
import { inTG, refresh, state, tg } from './store';

const KEY = 'trainer_kawaii_v1';
interface Saved { types?: Record<string, SessionType>; packs?: PackDef[]; settings?: Partial<typeof state.settings> }

function apply(raw: string | null | undefined) {
  if (!raw) return;
  let d: Saved;
  try { d = JSON.parse(raw); } catch { return; }
  if (d.types) {
    // виды из шаблона недели не теряем, даже если их нет в сохранённом
    const keep = new Set(TEMPLATES.map(t => t.type));
    for (const k of Object.keys(TYPES)) if (!d.types[k] && !keep.has(k)) delete TYPES[k];
    Object.assign(TYPES, d.types);
  }
  if (d.packs?.length) PACKS.splice(0, PACKS.length, ...d.packs);
  if (d.settings) Object.assign(state.settings, d.settings);
}

export function loadSaved() {
  try { apply(localStorage.getItem(KEY)); } catch { /* приватный режим */ }
  if (inTG && tg.CloudStorage && tg.isVersionAtLeast?.('6.9')) {
    try { tg.CloudStorage.getItem(KEY, (err: unknown, v: string) => { if (!err && v) { apply(v); refresh(); } }); } catch { /* */ }
  }
}

export function save() {
  const data = JSON.stringify({ types: TYPES, packs: PACKS, settings: state.settings });
  try { localStorage.setItem(KEY, data); } catch { /* */ }
  if (inTG && tg.CloudStorage && tg.isVersionAtLeast?.('6.9')) { try { tg.CloudStorage.setItem(KEY, data); } catch { /* */ } }
}

export function clearSaved(done: () => void) {
  try { localStorage.removeItem(KEY); } catch { /* */ }
  if (inTG && tg.CloudStorage && tg.isVersionAtLeast?.('6.9')) { try { tg.CloudStorage.removeItem(KEY, () => done()); return; } catch { /* */ } }
  done();
}
