// Состояние приложения + Telegram. Данные живут в изменяемых объектах (как в прототипе),
// а React перерисовывается по refresh().
import { useSyncExternalStore } from 'react';
import { dkey, mondayOf, today0, type TypeKey } from './data';

/* ===== Telegram ===== */
type TG = any;
export const tg: TG = (window as any).Telegram?.WebApp;
export const inTG = !!(tg && tg.platform && tg.platform !== 'unknown');
export interface TgUser { first_name?: string; last_name?: string; username?: string; photo_url?: string }
/** Пользователь Telegram, открывший приложение (тренер). Вне Telegram — null. */
export const me = (): TgUser | null => (inTG && tg.initDataUnsafe?.user) || null;

export type Haptic = 'light' | 'medium' | 'select' | 'success' | 'warning';
export const hap = (t: Haptic = 'light') => {
  if (!inTG) return;
  try {
    if (t === 'success' || t === 'warning') tg.HapticFeedback.notificationOccurred(t);
    else if (t === 'select') tg.HapticFeedback.selectionChanged();
    else tg.HapticFeedback.impactOccurred(t);
  } catch { /* старый клиент */ }
};

/* ===== Состояние ===== */
export type Tab = 'sched' | 'clients' | 'settings';
export type PageName = 'session' | 'move' | 'new' | 'client' | 'renew' | 'invite' | 'type' | 'pack';
export interface PageEntry { key: number; p: PageName; id?: string; closing?: boolean }
/** joy — радостное событие: из тоста вылетают сердечки. closing — тост уже уходит (анимация ухода). */
export interface Toast { msg: string; undo?: () => void; key: number; joy?: boolean; closing?: boolean }
/** primary: «да» — главная розовая кнопка (отправить); иначе «да» тихая белая (отменить). */
export interface Dialog { title: string; text: string; ok: string; cancel: string; onOk: () => void; primary?: boolean; closing?: boolean }

export const state = {
  tab: 'sched' as Tab,
  sel: dkey(today0()),
  weekStart: dkey(mondayOf(today0())),
  q: '',
  settings: { r24: true, r2: true, r30: false, notifyMe: true, waitlist: true, cancelH: 12, calmMotion: false },
  stack: [] as PageEntry[],
  form: null as null | { type: TypeKey; people: string[]; k: string; time: string; repeat: boolean; ask: boolean; err: string },
  mv: null as null | { k: string; time: string | null; err: string },
  invite: null as null | { name: string; code: string },
  typeForm: null as null | { key: string | null; name: string; dur: number; price: string; cap: number; look: number; err: string },
  packForm: null as null | { id: string | null; n: string; price: string; days: number; err: string },
  toast: null as Toast | null,
  dialog: null as Dialog | null,
};
export type Settings = typeof state.settings;

let version = 0;
const subs = new Set<() => void>();
export const refresh = () => { version++; subs.forEach(f => f()); };
export const useRefresh = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => version);

/* ===== Навигация ===== */
let pageKey = 0;
export function push(p: PageName, id?: string) {
  state.stack.push({ key: ++pageKey, p, id });
  syncBack(); hap('light'); refresh();
}
export function pop() {
  const live = state.stack.filter(e => !e.closing);
  const top = live[live.length - 1];
  if (!top) return;
  top.closing = true;
  syncBack(); refresh();
  setTimeout(() => { state.stack = state.stack.filter(e => e !== top); refresh(); }, 300);
}
export function syncBack() {
  if (!inTG) return;
  try { state.stack.some(e => !e.closing) ? tg.BackButton.show() : tg.BackButton.hide(); } catch { /* */ }
}

/* ===== Тосты и диалоги ===== */
let toastTimer = 0, toastKey = 0;
const OUT_MS = 220; // уход быстрее входа: окно/тост «отклеиваются», потом исчезают из DOM
export function toast(msg: string, undo?: () => void, joy?: boolean) {
  state.toast = { msg, undo, joy, key: ++toastKey };
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(closeToast, undo ? 5000 : 3000);
  refresh();
}
export function closeToast() {
  const t = state.toast;
  clearTimeout(toastTimer);
  if (!t || t.closing) return;
  t.closing = true; refresh();
  setTimeout(() => { if (state.toast === t) { state.toast = null; refresh(); } }, OUT_MS);
}
export function confirmDialog(d: Dialog) { state.dialog = d; hap('light'); refresh(); }
export function closeDialog() {
  const d = state.dialog;
  if (!d || d.closing) return;
  d.closing = true; refresh();
  setTimeout(() => { if (state.dialog === d) { state.dialog = null; refresh(); } }, OUT_MS);
}
