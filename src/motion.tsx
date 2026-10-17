// Анимации приложения: движок пружин Cozy UI Kit (cozy-motion.ts) и пресеты из его motion.json.
// Один Motion и один цикл rAF на всё приложение; слои двигаются через style.transform по ref,
// React на каждый кадр не перерисовывается. Карта — MOTION.md.
import {
  Button as KitButton, IconButton as KitIconButton, Toggle as KitToggle, Arrow as KitArrow,
  type ArrowProps, type ButtonProps, type IconButtonProps, type ToggleProps,
} from 'cozy-ui-kit';
import { buttonPressDepth, buttonPressedSprites, buttonSprites, iconSprites } from 'cozy-ui-kit-assets';
import { Motion, type Handle, type Layer, type MotionSpec, type Preset } from 'cozy-motion';
import spec from 'cozy-motion-spec';
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { kitShrink } from './density';
import { hap, state } from './store';

export const motion = new Motion(spec as unknown as MotionSpec, {
  onEvent(e) {
    if (e.type === 'haptic') hap(e.name === 'warning' || e.name === 'success' || e.name === 'medium' ? e.name : 'light');
    if (e.type === 'sprite') (e.target as { setSprite?: (v: string) => void } | undefined)?.setSprite?.(e.value as string);
    // sfx не играем: это Telegram, его открывают где угодно
  },
});
motion.setFeel('bouncy'); // утверждено: одно мягкое покачивание, а не «желе»
export const rule = (n: string) => motion.rule(n);

const reduceMq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
/** «Меньше движения»: настройка в приложении или системная настройка телефона. */
export const calm = () => !!state.settings.calmMotion || !!reduceMq?.matches;

/* ===== Свои пресеты — только поправки на спокойствие ===== */
/** «Нет-нет» вполсилы: ±3px один раз (в ките ±5px дважды). */
export const NOPE_SOFT = { tracks: [{ layer: 'root', prop: 'x', keys: [[0, 0], [45, -3, 'out'], [100, 3, 'inOut'], [150, 0, 'out']] }], haptic: 'warning' } as unknown as Preset;
/** Замена любого появления при «Меньше движения». */
const FADE = { tracks: [{ layer: 'root', prop: 'o', keys: [[0, 0], [150, 1, 'out']] }] } as unknown as Preset;
const ENTER = new Set(['sticker.slap', 'window.in']);

/* ===== Слои и кадр ===== */
export const newLayer = (): Layer => ({ x: 0, y: 0, s: 1, sx: 1, sy: 1, r: 0, o: 1, flash: 0 });
interface Bound { el: HTMLElement; L: Layer; dirty: boolean }
const bound = new Map<Layer, Bound>();

export function bind(L: Layer, el: HTMLElement | null, pivot = '50% 50%') {
  if (!el) { motion.release(L); bound.delete(L); return; }
  el.style.transformOrigin = pivot;
  const b = { el, L, dirty: true };
  bound.set(L, b); paint(b);
}
function paint(b: Bound) {
  const { L, el } = b;
  const still = L.x === 0 && L.y === 0 && L.s === 1 && L.sx === 1 && L.sy === 1 && L.r === 0;
  const idle = still && L.o === 1 && !L.flash;
  if (idle && !b.dirty) return;
  el.style.transform = still ? '' : `translate(${L.x}px, ${L.y}px) rotate(${L.r}deg) scale(${L.s * L.sx}, ${L.s * L.sy})`;
  el.style.opacity = L.o >= 1 ? '' : String(Math.max(0, L.o));
  el.style.filter = L.flash > 0.01 ? `drop-shadow(0 0 ${5 * L.flash}px rgba(255, 255, 255, ${L.flash}))` : '';
  if (typeof L.outset === 'number') el.style.setProperty('--cz-outset', `${L.outset}px`);
  b.dirty = !idle;
}

let raf = 0, last = 0, aliveUntil = 0;
const loops = new Set<Handle>();
function frame(t: number) {
  motion.update(last ? t - last : 16); last = t;
  bound.forEach(paint);
  if (t < aliveUntil || loops.size) raf = requestAnimationFrame(frame);
  else { raf = 0; last = 0; }
}
function wake(ms: number) {
  aliveUntil = Math.max(aliveUntil, performance.now() + ms + 900); // +900 мс — пружины успевают успокоиться
  if (!raf) raf = requestAnimationFrame(frame);
}

type Layers = Record<string, Layer | Layer[] | undefined>;
/** Проиграть пресет кита (или свой объект). При «Меньше движения» появления — короткое затухание, остальное — ничего. */
export function play(name: string | Preset, layers: Layers, ctx: Record<string, unknown> = {}, opts: { delay?: number; onDone?: () => void } = {}): Handle | null {
  if (calm()) {
    const root = (layers.root ?? layers.plate) as Layer | undefined;
    if (typeof name === 'string' && ENTER.has(name) && root) { name = FADE; layers = { root }; }
    else { if (opts.onDone) setTimeout(opts.onDone, 0); return null; }
  }
  const h = motion.play(name, layers, ctx, opts);
  const p = typeof name === 'string' ? (spec as unknown as MotionSpec).presets[name] : name;
  wake((opts.delay ?? 0) + (p ? motion.duration(p) : 0));
  if (p && (p as { loop?: unknown }).loop) loops.add(h);
  return h;
}
export function stop(h: Handle | null | undefined) { if (h) { h.cancel(); loops.delete(h); } }

/* ===== Спрайт «нажато» у кнопок кита ===== */
const URL2KEY = new Map<string, string>(Object.entries(buttonSprites as Record<string, string>).map(([k, v]) => [v, k]));
function spritePlate(host: HTMLElement) {
  const m = host.style.getPropertyValue('--cz-img').match(/url\("(.*)"\)/);
  const key = m && URL2KEY.get(m[1]);
  if (!key) return null;
  return {
    key,
    depth: (buttonPressDepth as Record<string, number>)[key] ?? 0.09,
    setSprite(v: string) {
      const src = v === 'pressed' ? (buttonPressedSprites as Record<string, string>)[key] : (buttonSprites as Record<string, string>)[key];
      if (src) host.style.setProperty('--cz-img', `url("${src}")`);
    },
  };
}

/* ===== Хук: нажатие, появление, «внимание» на одном элементе ===== */
export type PressKind = 'push' | 'content' | 'squish' | 'nudge-left' | 'nudge-right';
export interface MoOptions { press?: PressKind; enter?: 'slap' | 'window'; index?: number; delay?: number; attention?: boolean; pivot?: string }

export function useMo<T extends HTMLElement = HTMLDivElement>({ press, enter, index = 0, delay = 0, attention, pivot }: MoOptions = {}) {
  const ref = useRef<T>(null);
  const s = useRef<{ root: Layer; content: Layer; ribbon: Layer; plate: ReturnType<typeof spritePlate>; hasContent: boolean; down: boolean; idle: Handle | null }>();
  if (!s.current) s.current = { root: newLayer(), content: newLayer(), ribbon: newLayer(), plate: null, hasContent: false, down: false, idle: null };

  useLayoutEffect(() => {
    const el = ref.current, st = s.current!;
    if (!el) return;
    bind(st.root, el, pivot ?? (press === 'push' ? '50% 100%' : '50% 60%'));
    const content = el.querySelector<HTMLElement>('[data-mo="content"], .cz-content')
      ?? (press && press !== 'push' && press !== 'content' ? el.firstElementChild as HTMLElement | null : null);
    st.hasContent = !!content;
    if (content) bind(st.content, content, press === 'nudge-left' || press === 'nudge-right' ? '50% 50%' : '50% 70%');
    const host = [el, ...Array.from(el.querySelectorAll<HTMLElement>('[data-press="push"]'))].find(n => n.style.getPropertyValue('--cz-img'));
    st.plate = press === 'push' && host ? spritePlate(host) : null;
    if (enter) {
      st.root.o = 0; paint({ el, L: st.root, dirty: true }); // спрятан до своей очереди
      const d = delay + index * rule('staggerMs');
      if (enter === 'slap') play('sticker.slap', { root: st.root }, {}, { delay: d });
      else {
        const rib = el.querySelector<HTMLElement>('.cz-window__ribbon');
        if (rib) bind(st.ribbon, rib, '50% 50%');
        play('window.in', { plate: st.root, ribbon: rib ? st.ribbon : undefined }, {}, { delay: d });
      }
    }
    return () => { bind(st.root, null); bind(st.content, null); bind(st.ribbon, null); stop(st.idle); };
  }, []);

  // «Внимание»: одно на экран, начинается после паузы и замолкает от первого касания
  useEffect(() => {
    const st = s.current!;
    if (!attention) return;
    const t = setTimeout(() => { st.idle = play('idle.breathe', { root: st.root }); }, rule('idleHintAfterMs'));
    return () => { clearTimeout(t); stop(st.idle); st.idle = null; st.root.s = 1; wake(0); };
  }, [attention]);

  const kind = press === 'nudge-left' || press === 'nudge-right' ? 'nudge' : press;
  const ctx = () => {
    const el = ref.current!, st = s.current!;
    return { dir: press === 'nudge-left' ? -1 : 1, lip: (st.plate?.depth ?? 0.09) * el.offsetHeight };
  };
  const layers = (): Layers => { const st = s.current!; return { root: st.root, content: st.hasContent ? st.content : undefined, plate: st.plate ?? undefined }; };
  const handlers = press ? {
    onPointerDown: () => {
      const st = s.current!;
      if (st.idle) { stop(st.idle); st.idle = null; }
      if (ref.current?.querySelector('button:disabled') || (ref.current as HTMLButtonElement | null)?.disabled) { play(NOPE_SOFT, { root: st.root }); return; }
      st.down = true; play(`press.${kind}.down`, layers(), ctx());
    },
    onPointerUp: () => release(),
    onPointerCancel: () => release(),
    onPointerLeave: () => release(),
  } : {};
  function release() {
    const st = s.current!;
    if (!st.down) return;
    st.down = false; play(`press.${kind}.up`, layers(), ctx());
  }
  return { ref, handlers, nope: () => play(NOPE_SOFT, { root: s.current!.root }), layers: s.current };
}

/** Обёртка-слой: то же, что useMo, для чужих компонентов (кнопок кита и т.п.). */
export function Mo({ children, block, className, style, ...opts }: MoOptions & { children: ReactNode; block?: boolean; className?: string; style?: CSSProperties }) {
  const { ref, handlers } = useMo(opts);
  return <div ref={ref} {...handlers} className={`mo ${block ? 'mo--block' : ''} ${className ?? ''}`} style={style}>{children}</div>;
}

/* ===== Кнопки кита с нажатием из motion-кита ===== */
/** Кнопки кита на размер крупнее, если плотность мельче родной базы кита (иначе ~26 pt — неудобно пальцу). */
const UP: Record<string, 'sm' | 'md' | 'lg'> = { sm: 'md', md: 'lg', lg: 'lg' };
export function Button(p: ButtonProps) {
  const size = kitShrink > 1.1 ? UP[p.size ?? 'md'] : p.size;
  return <Mo press="push" block={p.fullWidth}><KitButton {...p} size={size} /></Mo>;
}
export function IconButton({ attention, ...p }: IconButtonProps & { attention?: boolean }) {
  return <Mo press="push" attention={attention}><KitIconButton {...p} /></Mo>;
}
export function Toggle(p: ToggleProps) {
  return <Mo press="squish"><KitToggle {...p} height={Math.round((p.height ?? 44) * kitShrink)} /></Mo>;
}
export function Arrow({ className, style, ...p }: ArrowProps) {
  return <Mo press={p.direction === 'left' ? 'nudge-left' : 'nudge-right'} className={className} style={style}><KitArrow {...p} /></Mo>;
}

/* ===== Штамп при смене значения (статусы) ===== */
export function useStamp<T extends HTMLElement>(value: unknown) {
  const ref = useRef<T>(null), L = useRef(newLayer()), prev = useRef(value);
  useLayoutEffect(() => { bind(L.current, ref.current); return () => bind(L.current, null); }, []);
  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    play('check.stamp', { mark: L.current });
  }, [value]);
  return ref;
}

/* ===== Радость: 6 сердечек из пака, лёгкая гравитация, тают за 400 мс ===== */
export function burst(host: HTMLElement | null, n = 6) {
  if (!host || calm()) return;
  const parts = Array.from({ length: n }, (_, i) => {
    const img = document.createElement('img');
    img.src = (iconSprites as Record<string, string>).heart;
    img.className = 'joy';
    host.appendChild(img);
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.38 + (Math.random() - 0.5) * 0.2;
    const v = 0.42 + Math.random() * 0.12;
    return { img, x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (Math.random() - 0.5) * 30, vr: (Math.random() - 0.5) * 0.4 };
  });
  const t0 = performance.now(), life = 560;
  let prevT = t0;
  const step = (t: number) => {
    const dt = Math.min(32, t - prevT), age = t - t0; prevT = t;
    for (const p of parts) {
      p.vy += 0.0016 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      const o = age < 160 ? 1 : Math.max(0, 1 - (age - 160) / 400);
      p.img.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${0.6 + 0.4 * Math.min(1, age / 120)})`;
      p.img.style.opacity = String(o);
    }
    if (age < life) requestAnimationFrame(step); else parts.forEach(p => p.img.remove());
  };
  requestAnimationFrame(step);
}

/** Кнопка-строка или кнопка с бортиком: нажатие (и, если нужно, появление) из motion-кита. */
export function Tap({ press = 'content', enter, index, delay, className, onClick, label, children }: MoOptions & { className?: string; onClick?: () => void; label?: string; children: ReactNode }) {
  const { ref, handlers } = useMo<HTMLButtonElement>({ press, enter, index, delay });
  return <button ref={ref} {...handlers} type="button" className={className} onClick={onClick} aria-label={label}>{children}</button>;
}
