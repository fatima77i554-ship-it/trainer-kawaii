// Каркас: вкладки, стопка страниц, нижнее меню, кнопка «+», тост и диалог.
import { CozyRoot, Icon, SelectionCorners, Window, type IconName } from 'cozy-ui-kit';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { day } from './data';
import { bind, burst, Button, IconButton, Mo, newLayer, play, useMo } from './motion';
import { Page } from './pages';
import { closeDialog, closeToast, hap, refresh, state, useRefresh, type Dialog, type PageEntry, type Tab, type Toast } from './store';
import { Clients, newSession, Schedule, SettingsTab } from './tabs';

const TABS: [Tab, IconName, string][] = [['sched', 'calendar', 'Расписание'], ['clients', 'friends', 'Клиенты'], ['settings', 'settings', 'Настройки']];

/** Тип 4: новая страница въезжает справа, нижняя сдвигается на 30% и темнеет (CSS-переход). */
function PageLayer({ e, under }: { e: PageEntry; under: boolean }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); return () => cancelAnimationFrame(r); }, []);
  return (
    <div className={`page ${shown && !e.closing ? 'in' : ''} ${under ? 'under' : ''}`}>
      <div className="wrap"><Page p={e.p} id={e.id} /></div>
    </div>
  );
}

/** Уголки выбора защёлкиваются снаружи внутрь (select.corners.in). */
function ActiveCorners({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null), L = useRef(newLayer());
  useLayoutEffect(() => {
    bind(L.current, ref.current?.querySelector<HTMLElement>('.cz-corners__frame') ?? null);
    play('select.corners.in', { corners: L.current });
    return () => bind(L.current, null);
  }, []);
  return <span ref={ref} className="tab__corners"><SelectionCorners tone="cream" corner={18}>{children}</SelectionCorners></span>;
}

/** Вкладка: подложка стоит, иконка приседает; новая активная иконка подпрыгивает. */
function TabButton({ k, icon, label }: { k: Tab; icon: IconName; label: string }) {
  const on = state.tab === k;
  const mo = useMo<HTMLButtonElement>({ press: 'content' });
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) play('press.content.up', { content: mo.layers.content });
    was.current = on;
  }, [on]);
  return (
    <button ref={mo.ref} {...mo.handlers} type="button" className={`tab cz-tap ${on ? 'on' : ''}`}
      onClick={() => { if (on) return; state.tab = k; window.scrollTo(0, 0); hap('select'); refresh(); }}>
      <span data-mo="content" className="tab__ic">{on ? <ActiveCorners><Icon name={icon} size={56} /></ActiveCorners> : <Icon name={icon} size={56} />}</span>
      <span>{label}</span>
    </button>
  );
}

/** Тост: всплывает «стикером», уходит отклеиваясь; на радостных событиях вылетают сердечки. */
function ToastView({ t }: { t: Toast }) {
  const mo = useMo<HTMLDivElement>({ enter: 'slap' });
  useEffect(() => { if (t.joy) { const id = setTimeout(() => burst(mo.ref.current), 140); return () => clearTimeout(id); } }, []);
  useEffect(() => { if (t.closing) play('window.out', { window: mo.layers.root }); }, [t.closing]);
  return (
    <div ref={mo.ref} className="toast" role="status">
      <span>{t.msg}</span>
      {t.undo && !t.closing && <button type="button" onClick={() => { const u = t.undo!; closeToast(); u(); }}>Вернуть</button>}
    </div>
  );
}

/** Модальное окно (тип 3 + 4): фон темнеет, окно прижимается; закрытие — окно отклеивается, потом светлеет фон. */
function DialogView({ d }: { d: Dialog }) {
  const dimRef = useRef<HTMLDivElement>(null), boxRef = useRef<HTMLDivElement>(null);
  const L = useRef({ dim: newLayer(), plate: newLayer(), ribbon: newLayer() });
  useLayoutEffect(() => {
    const ls = L.current, box = boxRef.current!;
    bind(ls.dim, dimRef.current); bind(ls.plate, box);
    const rib = box.querySelector<HTMLElement>('.cz-window__ribbon');
    if (rib) bind(ls.ribbon, rib);
    play('window.in', { dim: ls.dim, plate: ls.plate, ribbon: rib ? ls.ribbon : undefined });
    return () => { bind(ls.dim, null); bind(ls.plate, null); bind(ls.ribbon, null); };
  }, []);
  useEffect(() => { if (d.closing) play('window.out', { window: L.current.plate, dim: L.current.dim }); }, [d.closing]);
  return (
    <div className="dim-wrap" onClick={closeDialog}>
      <div ref={dimRef} className="dim" />
      <div ref={boxRef} className="dialog" onClick={e => e.stopPropagation()}>
        <Window kind="frame" color="pink" title={d.title} ribbonColor="pink" animate={false} footer={
          <div className="dialog__btns">
            {d.primary ? <>
              <Button color="white" size="sm" onClick={closeDialog}>{d.cancel}</Button>
              <Button color="pink" size="sm" onClick={d.onOk}>{d.ok}</Button>
            </> : <>
              <Button color="white" size="sm" onClick={d.onOk}>{d.ok}</Button>
              <Button color="pink" size="sm" onClick={closeDialog}>{d.cancel}</Button>
            </>}
          </div>
        }>
          <p className="dialog__text">{d.text}</p>
        </Window>
      </div>
    </div>
  );
}

export function App() {
  useRefresh();
  const view = state.tab === 'sched' ? <Schedule /> : state.tab === 'clients' ? <Clients /> : <SettingsTab />;
  const live = state.stack.filter(e => !e.closing);
  const top = live[live.length - 1];
  return (
    <CozyRoot background="candy" className="app">
      <main className={`wrap ${live.length ? 'under' : ''}`} key={state.tab}>{view}</main>

      {state.tab === 'sched' && (
        <div className="fab">
          <Mo enter="slap" delay={200}>
            {/* «внимание» — единственное на экране: «+» мягко дышит, только когда день пустой */}
            <IconButton icon="plus" label="Добавить тренировку" color="pink" shape="round" size={104} attention={!day(state.sel).length && !live.length} onClick={() => newSession()} />
          </Mo>
        </div>
      )}

      <nav className="tabs">
        <div className="tabs__in">{TABS.map(([k, icon, label]) => <TabButton key={k} k={k} icon={icon} label={label} />)}</div>
      </nav>

      <div className="pages">{state.stack.map(e => <PageLayer key={e.key} e={e} under={!!top && e !== top && !e.closing} />)}</div>

      {state.toast && <ToastView key={state.toast.key} t={state.toast} />}
      {state.dialog && <DialogView d={state.dialog} />}
    </CozyRoot>
  );
}
