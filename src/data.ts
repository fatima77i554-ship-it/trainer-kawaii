// Данные и логика расписания. Перенесено из trainer-miniapp без статистики:
// ни доходов, ни процентов, ни счётчиков пропусков — только то, что нужно для работы.
import type { CozyColor, IconName } from 'cozy-ui-kit';

/* ===== Настройки прототипа ===== */
export const CONFIG = {
  botUsername: 'Lizzi_trainer_bot', // username бота из @BotFather, без @
  place: 'Зал на Ленина, 12',
  dayStart: '06:00', // с какого времени открыта запись
  dayEnd: '21:00', // последнее время начала
};

/* ===== Даты ===== */
export const pad = (n: number) => String(n).padStart(2, '0');
export const dkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WDF = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
export const MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const fmtDay = (d: Date) => `${WDF[d.getDay()]}, ${d.getDate()} ${MG[d.getMonth()]}`;
export const fmtShort = (d: Date) => `${WD[d.getDay()].toLowerCase()}, ${d.getDate()} ${MG[d.getMonth()]}`;
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const rub = (n: number) => Math.round(n).toLocaleString('ru-RU') + ' ₽';
export const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c;
};
export const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function rangeLabel(a: Date, b: Date) {
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MG[b.getMonth()]}`
    : `${a.getDate()} ${MG[a.getMonth()]} – ${b.getDate()} ${MG[b.getMonth()]}`;
}
export function when(d: Date) {
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const diff = Math.round((dd.getTime() - today0().getTime()) / 864e5), hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diff === 0) return `сегодня в ${hm}`;
  if (diff === -1) return `вчера в ${hm}`;
  if (diff === 1) return `завтра в ${hm}`;
  return `${fmtShort(d)} в ${hm}`;
}
export const rnd = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/* ===== Виды тренировок и абонементы ===== */
export type TypeKey = string;
export interface SessionType { name: string; dur: number; price: number; cap: number; color: CozyColor; icon: IconName }
/** Вид от трёх человек считаем группой. */
export const isGroup = (T: SessionType) => T.cap >= 3;
/** Значки на выбор для своих видов: цвет плашки + иконка пака. */
export const TYPE_LOOKS: { color: CozyColor; icon: IconName }[] = [
  { color: 'pink', icon: 'heart' }, { color: 'turquoise', icon: 'energy' }, { color: 'yellow', icon: 'star' },
  { color: 'blue', icon: 'friends' }, { color: 'lime', icon: 'shoe' }, { color: 'wood', icon: 'trophy' },
];
export const TYPES: Record<TypeKey, SessionType> = {
  pers:    { name: 'Персональная',   dur: 60, price: 2500, cap: 1, color: 'pink',      icon: 'heart' },
  func:    { name: 'Функциональная', dur: 60, price: 900,  cap: 8, color: 'turquoise', icon: 'energy' },
  stretch: { name: 'Растяжка',       dur: 45, price: 1500, cap: 1, color: 'yellow',    icon: 'star' },
  split:   { name: 'Сплит',          dur: 60, price: 1800, cap: 2, color: 'blue',      icon: 'friends' },
};
export const typeUsed = (k: TypeKey) =>
  TEMPLATES.some(t => t.type === k) || Object.values(S).some(list => list.some(s => s.type === k && endOf(s).getTime() > Date.now()));

export interface PackDef { id: string; n: number; price: number; days: number }
export const PACKS: PackDef[] = [
  { id: 'p8',  n: 8,  price: 18000, days: 30 },
  { id: 'p12', n: 12, price: 25200, days: 45 },
  { id: 'p1',  n: 1,  price: 2500,  days: 14 },
];
export const packIcon = (p: PackDef): IconName => (p.n === 1 ? 'heart' : p.n >= 12 ? 'medalPinkStar' : 'medalPink');
export const packName = (p: PackDef) => (p.n === 1 ? 'Разовое занятие' : `${p.n} ${plural(p.n, 'занятие', 'занятия', 'занятий')}`);

/* ===== Клиенты ===== */
export interface Pack { total: number; left: number; until: Date }
export interface Client { id: string; g: 'm' | 'f'; name: string; goal: string; joined: boolean; pack: Pack | null; note: string }
type Seed = Omit<Client, 'joined' | 'pack'> & { joined?: boolean; pack: [number, number, number] | null };
const SEED: Seed[] = [
  { id: 'c1',  g: 'f', name: 'Ольга Демидова',    goal: 'Минус 6 кг к лету',                  pack: [8, 5, 20],  note: 'Любит круговые. Следить за техникой становой.' },
  { id: 'c2',  g: 'f', name: 'Анна Кузнецова',    goal: 'Подготовка к полумарафону',          pack: [12, 2, 6],  note: 'Забег 15 ноября — за неделю до старта снижаем объём.' },
  { id: 'c3',  g: 'f', name: 'Мария Соколова',    goal: 'Восстановление после травмы колена', pack: [12, 7, 31], note: 'Колено: без прыжков, приседания до 90°.' },
  { id: 'c4',  g: 'f', name: 'Ирина Павлова',     goal: 'Растяжка и осанка',                  pack: [8, 1, 4],   note: '' },
  { id: 'c5',  g: 'm', name: 'Дмитрий Орлов',     goal: 'Набор мышечной массы',               pack: [12, 9, 38], note: '' },
  { id: 'c6',  g: 'f', name: 'Екатерина Белова',  goal: 'Общий тонус',                        pack: [8, 4, 12],  note: '' },
  { id: 'c7',  g: 'm', name: 'Сергей Миронов',    goal: 'Функциональная подготовка',          pack: [8, 6, 24],  note: '' },
  { id: 'c8',  g: 'f', name: 'Алина Ветрова',     goal: 'Похудение',                          pack: null, joined: false, note: 'Пришла по рекомендации Ольги. Пробная тренировка завтра.' },
  { id: 'c9',  g: 'f', name: 'Ксения Лебедева',   goal: 'Здоровая спина',                     pack: [8, 3, 15],  note: '' },
  { id: 'c10', g: 'f', name: 'Виктория Захарова', goal: 'Тонус после родов',                  pack: [8, 5, 22],  note: 'Тренируется в паре с Ксенией.' },
];
export const clients: Client[] = SEED.map(c => ({
  ...c,
  joined: c.joined !== false,
  pack: c.pack ? { total: c.pack[0], left: c.pack[1], until: addDays(today0(), c.pack[2]) } : null,
}));
export const C = (id: string) => clients.find(c => c.id === id)!;
export const short = (c: Client) => c.name.split(' ')[0];
export const fem = (c: Client, m: string, f: string) => (c.g === 'm' ? m : f);
export const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
export const sortedClients = () => clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'));
export const packLow = (c: Client) => !!c.pack && c.pack.left <= 2;

/* ===== Шаблон недели ===== */
interface Template { dow: number; t: string; type: TypeKey; p: string[]; from?: string }
export const TEMPLATES: Template[] = [
  { dow: 1, t: '08:00', type: 'pers', p: ['c2'] },
  { dow: 1, t: '10:00', type: 'pers', p: ['c3'] },
  { dow: 1, t: '18:00', type: 'func', p: ['c1', 'c5', 'c7', 'c9', 'c10'] },
  { dow: 1, t: '19:30', type: 'pers', p: ['c5'] },
  { dow: 2, t: '09:00', type: 'stretch', p: ['c4'] },
  { dow: 2, t: '18:30', type: 'pers', p: ['c1'] },
  { dow: 2, t: '20:00', type: 'split', p: ['c9', 'c10'] },
  { dow: 3, t: '08:00', type: 'pers', p: ['c2'] },
  { dow: 3, t: '10:00', type: 'pers', p: ['c3'] },
  { dow: 3, t: '18:00', type: 'func', p: ['c1', 'c5', 'c7', 'c9', 'c10', 'c2'] },
  { dow: 3, t: '19:30', type: 'pers', p: ['c5'] },
  { dow: 4, t: '09:00', type: 'stretch', p: ['c4'] },
  { dow: 4, t: '12:00', type: 'pers', p: ['c7'] },
  { dow: 4, t: '18:30', type: 'pers', p: ['c1'] },
  { dow: 4, t: '20:00', type: 'split', p: ['c9', 'c10'] },
  { dow: 5, t: '08:00', type: 'pers', p: ['c2'] },
  { dow: 5, t: '10:00', type: 'pers', p: ['c3'] },
  { dow: 5, t: '17:00', type: 'func', p: ['c1', 'c5', 'c7', 'c9', 'c10'] },
  { dow: 5, t: '19:00', type: 'pers', p: ['c9'] },
  { dow: 6, t: '10:00', type: 'func', p: ['c1', 'c5', 'c7', 'c9', 'c10', 'c2'] },
  { dow: 6, t: '12:00', type: 'pers', p: ['c3'] },
  { dow: 6, t: '14:00', type: 'stretch', p: ['c4'] },
  { dow: 6, t: '16:00', type: 'pers', p: ['c7'] },
  { dow: 6, t: '18:00', type: 'split', p: ['c9', 'c10'] },
  { dow: 0, t: '11:00', type: 'stretch', p: ['c10'] },
  { dow: 0, t: '12:30', type: 'pers', p: ['c1'] },
];

/* ===== Тренировки ===== */
export type Status = 'confirmed' | 'pending' | 'cancelled' | 'came' | 'missed' | 'planned' | 'nobot';
export interface Person { cid: string; st: Status }
export interface Session { id: string; k: string; time: string; type: TypeKey; people: Person[]; trial?: boolean }

export const S: Record<string, Session[]> = {};
export const startOf = (s: { k: string; time: string }) => { const d = fromKey(s.k); const [h, m] = s.time.split(':').map(Number); d.setHours(h, m, 0, 0); return d; };
export const endOf = (s: Session) => new Date(startOf(s).getTime() + TYPES[s.type].dur * 60000);
export const isMulti = (s: Session) => s.people.length > 1 || isGroup(TYPES[s.type]);
export const allCx = (s: Session) => s.people.every(p => p.st === 'cancelled');
export const sortDay = (k: string) => S[k].sort((a, b) => toMin(a.time) - toMin(b.time));
export const overlaps = (s: Session, time: string, dur: number) => {
  const a = toMin(s.time), b = a + TYPES[s.type].dur, x = toMin(time);
  return x < b && a < x + dur;
};

let uid = 0;
export const nextUid = () => ++uid;

export function mk(k: string, time: string, type: TypeKey, people: string[], opts: Partial<Session> = {}): Session {
  const s: Session = { id: `${k}_${time}_${type}`, k, time, type, ...opts, people: [] };
  const h = (startOf(s).getTime() - Date.now()) / 36e5, durH = TYPES[type].dur / 60;
  s.people = people.map(cid => {
    const r = rnd(s.id + cid);
    let st: Status;
    if (!C(cid).joined) st = 'nobot';
    else if (h <= -durH) st = r < .02 ? 'cancelled' : r < .07 ? 'missed' : 'came';
    else if (h <= 0) st = 'confirmed';
    else if (h < 30) st = r < .72 ? 'confirmed' : 'pending';
    else st = 'planned';
    return { cid, st };
  });
  return s;
}
export function day(k: string): Session[] {
  if (!S[k]) {
    const dow = fromKey(k).getDay();
    S[k] = TEMPLATES.filter(t => t.dow === dow && (!t.from || k >= t.from)).map(t => mk(k, t.t, t.type, t.p));
    if (k === dkey(addDays(today0(), 1))) S[k].push(mk(k, '15:00', 'pers', ['c8'], { trial: true }));
    sortDay(k);
  }
  return S[k];
}
export const findSes = (id: string) => { for (const k in S) { const s = S[k].find(x => x.id === id); if (s) return s; } return null; };
export function seedDemo() {
  const now = Date.now();
  const up = [0, 1].flatMap(i => day(dkey(addDays(today0(), i))))
    .filter(s => startOf(s).getTime() > now && startOf(s).getTime() - now < 30 * 36e5);
  const ir = up.find(s => s.people.some(p => p.cid === 'c4'));
  if (ir) ir.people.find(p => p.cid === 'c4')!.st = 'cancelled';
  const pend = up.find(s => s !== ir && s.people.length === 1 && s.people[0].st !== 'nobot');
  if (pend) pend.people[0].st = 'pending';
}

/* ===== Статусы — мягкими словами, без красного ===== */
export type Tone = 'ok' | 'soft' | 'calm' | 'live' | 'love';
export function personStatus(st: Status, c: Client): [string, Tone] {
  switch (st) {
    case 'confirmed': return [fem(c, 'Придёт', 'Придёт'), 'ok'];
    case 'pending': return ['Ждём ответик', 'soft'];
    case 'cancelled': return ['Не сможет', 'calm'];
    case 'came': return [fem(c, 'Был ♡', 'Была ♡'), 'love'];
    case 'missed': return ['Не получилось', 'calm'];
    case 'planned': return ['В планах', 'soft'];
    case 'nobot': return ['Ещё не в боте', 'soft'];
  }
}
export function sessionStatus(s: Session): [string, Tone] {
  const now = Date.now();
  if (startOf(s).getTime() <= now && now < endOf(s).getTime() && !allCx(s)) return ['Сейчас идёт', 'live'];
  if (allCx(s)) return ['Окошко свободно', 'calm'];
  if (!isMulti(s)) return personStatus(s.people[0].st, C(s.people[0].cid));
  if (endOf(s).getTime() <= now) return ['Прошла ♡', 'love'];
  const act = s.people.filter(p => p.st !== 'cancelled');
  if (act.every(p => p.st === 'planned')) return ['В планах', 'soft'];
  if (act.every(p => p.st === 'confirmed')) return ['Все придут', 'ok'];
  return ['Ждём ответики', 'soft'];
}
export const whoOf = (s: Session) => {
  const T = TYPES[s.type];
  if (isGroup(T)) return T.name;
  if (s.people.length > 1) return s.people.map(p => short(C(p.cid))).join(' и ');
  return C(s.people[0].cid).name;
};
export function subOf(s: Session) {
  const T = TYPES[s.type];
  if (isGroup(T)) return 'Группа';
  if (s.people.length > 1) return `${T.name} · вдвоём`;
  return `${s.trial ? 'Пробная · ' : ''}${T.name}`;
}

/* ===== Оплаты: деньги показываем только там, где человек действительно платит ===== */
export interface Due { c: Client; s: Session; kind: 'renew' | 'single'; amount: number; label: string }
const active = (st: Status) => st !== 'cancelled' && st !== 'missed' && st !== 'came';
/** Тариф для продления: такой же, как текущий абонемент, иначе первый в списке. */
export const renewPack = (c: Client) => PACKS.find(p => c.pack && p.n === c.pack.total) || PACKS[0];
/** Первая предстоящая тренировка, которую абонемент уже не покрывает (кончились занятия или срок). */
export function renewalSession(c: Client, horizon = 120): Session | null {
  if (!c.pack) return null;
  const now = Date.now(), t0 = today0();
  let i = 0;
  for (let d = 0; d <= horizon; d++) {
    for (const s of day(dkey(addDays(t0, d)))) {
      const p = s.people.find(x => x.cid === c.id);
      if (!p || !active(p.st) || endOf(s).getTime() <= now) continue;
      if (i >= c.pack.left || startOf(s) > addDays(c.pack.until, 1)) return s;
      i++;
    }
  }
  return null;
}
export function paymentsOn(k: string): Due[] {
  if (k < dkey(today0())) return []; // прошлое не считаем — это была бы статистика
  const horizon = Math.round((fromKey(k).getTime() - today0().getTime()) / 864e5);
  const out: Due[] = [];
  for (const s of day(k)) {
    if (endOf(s).getTime() <= Date.now()) continue;
    for (const p of s.people) {
      const c = C(p.cid);
      if (!active(p.st)) continue;
      if (!c.pack) out.push({ c, s, kind: 'single', amount: TYPES[s.type].price, label: s.trial ? 'пробная' : 'разовое занятие' });
      else if (renewalSession(c, horizon) === s) { const pk = renewPack(c); out.push({ c, s, kind: 'renew', amount: pk.price, label: `продление · ${packName(pk)}` }); }
    }
  }
  return out;
}
