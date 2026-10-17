// Общие кусочки интерфейса поверх Cozy UI Kit.
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Icon, Ribbon, Window, type CozyColor, type IconName } from 'cozy-ui-kit';
import { initials, rnd, TYPES, type Client, type Tone, type TypeKey } from './data';
import { Arrow, bind, newLayer, play, rule, useMo, useStamp } from './motion';
import { hap, inTG, me, pop } from './store';

const AV_COLORS: CozyColor[] = ['pink', 'turquoise', 'yellow', 'lime', 'blue', 'cream'];

// data-mo="content" — слой «содержимое»: в строках списка приседает он, а подложка строки стоит
export function Avatar({ c, size = 64 }: { c: Client; size?: number }) {
  const color = AV_COLORS[Math.floor(rnd('a' + c.id) * AV_COLORS.length)];
  return <span data-mo="content" className={`av av--${color}`} style={{ '--s': `${size}px` } as CSSProperties}>{initials(c.name)}</span>;
}

/** Имя тренера — ровно как в Telegram: в приветствии имя, в профиле имя и фамилия. Вне Telegram имени нет. */
export const trainerName = () => me()?.first_name?.trim() || '';
export const trainerFullName = () => { const u = me(); return [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim(); };
export function MeAvatar({ size = 64 }: { size?: number }) {
  const u = me();
  if (u?.photo_url) return <img data-mo="content" className="av av--pink" style={{ '--s': `${size}px` } as CSSProperties} src={u.photo_url} alt="" />;
  return <span data-mo="content" className="av av--pink" style={{ '--s': `${size}px` } as CSSProperties}>{initials(trainerFullName() || 'Тренер')}</span>;
}

const TONE_ICON: Record<Tone, IconName | null> = { ok: 'check', soft: null, calm: null, live: 'heart', love: null };
/** Статус-пилюля: когда текст меняется («Ждём ответик» → «Придёт»), она штампуется. */
export function Tag({ tone, children, icon }: { tone: Tone; children: ReactNode; icon?: IconName }) {
  const ic = icon ?? TONE_ICON[tone];
  const ref = useStamp<HTMLSpanElement>(typeof children === 'string' ? children : tone);
  return <span ref={ref} className={`tag tag--${tone}`}>{ic && <Icon name={ic} size={24} />}{children}</span>;
}

export function TypeBadge({ type, size = 56 }: { type: TypeKey; size?: number }) {
  const T = TYPES[type];
  return <span data-mo="content" className={`tbadge tbadge--${T.color}`} style={{ '--s': `${size}px` } as CSSProperties}><Icon name={T.icon} size={size * .62} /></span>;
}

/** Заголовок раздела: маленькое сердечко и подпись. */
export function SecTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="sec-t"><span>{children}</span>{right}</div>;
}

/** Бумажный лист кита (Window kind=paper) без ленты. */
export function Sheet({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <Window kind="paper" animate={false} className={className} style={style}>{children}</Window>;
}

/** Чип с бортиком: продавливается (push). Недоступный — мягкое «нет-нет» вместо disabled. */
export function Chip({ on, off, onClick, children, color = 'pink' }: { on?: boolean; off?: boolean; onClick?: () => void; children: ReactNode; color?: CozyColor }) {
  const { ref, handlers, nope } = useMo<HTMLButtonElement>({ press: off ? undefined : 'push' });
  return (
    <button ref={ref} {...handlers} type="button" aria-disabled={off || undefined} className={`chip chip--${color} ${on ? 'on' : ''} ${off ? 'off' : ''}`}
      onClick={() => { if (off) { nope(); return; } hap('select'); onClick?.(); }}>
      {children}
    </button>
  );
}

/** Заголовок экрана-страницы: кнопка «назад» (в Telegram — системная) и лента. */
export function PageHead({ title, color = 'pink' }: { title: string; color?: CozyColor }) {
  return (
    <div className={`phead ${inTG ? '' : 'phead--back'}`}>
      {!inTG && <Arrow direction="left" label="Назад" width={32} onClick={() => pop()} className="phead__back" />}
      <Ribbon color={color} className="phead__ribbon">{title}</Ribbon>
    </div>
  );
}

/** Одно сердечко абонемента: потратили — «сдувается» и бледнеет; продлили — шлёпается обратно. */
function Heart({ used, size, i }: { used: boolean; size: number; i: number }) {
  const ref = useRef<HTMLSpanElement>(null), L = useRef(newLayer()), prev = useRef(used);
  useLayoutEffect(() => { bind(L.current, ref.current); return () => bind(L.current, null); }, []);
  useEffect(() => {
    if (prev.current === used) return;
    prev.current = used;
    if (used) play('press.squish.down', { content: L.current }, {}, { onDone: () => play('press.squish.up', { content: L.current }) });
    else play('sticker.slap', { root: L.current }, {}, { delay: i * rule('gridStaggerMs') });
  }, [used]);
  return <span ref={ref} className={`heart ${used ? 'hearts__used' : ''}`}><Icon name="heart" size={size} /></span>;
}
/** Абонемент сердечками: закрашены оставшиеся занятия. */
export function Hearts({ total, left }: { total: number; left: number }) {
  const size = total > 10 ? 36 : 44;
  return (
    <div className="hearts" aria-label={`Осталось занятий: ${left}`}>
      {Array.from({ length: total }, (_, i) => <Heart key={i} i={i} used={i >= left} size={size} />)}
    </div>
  );
}

/** Мягкая записочка вместо тревожных баннеров: шлёпается после окна дня. */
export function Note({ icon = 'heart', children, onClick, delay = 0 }: { icon?: IconName; children: ReactNode; onClick?: () => void; delay?: number }) {
  const { ref, handlers } = useMo<HTMLButtonElement>({ press: onClick ? 'push' : undefined, enter: 'slap', delay });
  return (
    <button ref={ref} {...handlers} className="note" onClick={onClick} type="button" disabled={!onClick}>
      <Icon name={icon} size={48} />
      <div className="note__text">{children}</div>
    </button>
  );
}

export function Empty({ face, children }: { face: string; children: ReactNode }) {
  return <div className="empty"><div className="empty__face">{face}</div>{children}</div>;
}

/** Плашка ошибки в форме (рендерить только когда есть текст): при появлении и смене текста — «нет-нет» вполсилы. */
export function ErrNote({ text }: { text: string }) {
  const { ref, nope } = useMo<HTMLDivElement>({});
  useEffect(() => { if (text) nope(); }, [text]);
  return <div ref={ref} className="err">{text}</div>;
}
