// Три вкладки: расписание, клиенты, настройки. Вкладки «Статистика» больше нет.
import { Icon, Window } from 'cozy-ui-kit';
import { Arrow, Button, Mo, Tap, Toggle } from './motion';
import {
  addDays, allCx, C, CONFIG, cap1, fem, day, dkey, MG, plural, endOf, fmtDay, fromKey, isGroup, mondayOf, PACKS, packIcon, packLow, packName,
  pad, paymentsOn, rangeLabel, rub, sessionStatus, short, sortedClients, startOf, subOf, today0, TYPE_LOOKS, TYPES, WD, whoOf,
  type Session, type TypeKey,
} from './data';
import { DENSITY, densKey, setDensity } from './density';
import { clearSaved, save } from './persist';
import { hap, me, push, refresh, state, toast, type Settings } from './store';
import { Avatar, Empty, MeAvatar, Note, SecTitle, Sheet, Tag, trainerFullName, trainerName, TypeBadge } from './ui';

/* ===== Расписание ===== */
function SessionRow({ s, index }: { s: Session; index: number }) {
  const T = TYPES[s.type], now = Date.now();
  const past = endOf(s).getTime() <= now, cx = allCx(s);
  const [label, tone] = sessionStatus(s);
  return (
    <Tap press="content" enter="slap" index={index} delay={150} className={`ses cz-tap ${past ? 'past' : ''} ${cx ? 'cx' : ''}`} onClick={() => push('session', s.id)}>
        <div className="ses__time"><b>{s.time}</b><small>{T.dur} мин</small></div>
        <TypeBadge type={s.type} />
        <div className="ses__mid">
          <div className="ses__name">{whoOf(s)}</div>
          <div className="ses__sub">{subOf(s)}</div>
          <div className="ses__foot">
            <Tag tone={tone}>{label}</Tag>
            {isGroup(T) && !past && <div className="faces">{s.people.slice(0, 4).map(p => <Avatar key={p.cid} c={C(p.cid)} size={36} />)}{s.people.length > 4 && <span className="faces__more">+{s.people.length - 4}</span>}</div>}
          </div>
        </div>
    </Tap>
  );
}

export function Schedule() {
  const t0 = today0(), tk = dkey(t0), ws = fromKey(state.weekStart), now = new Date();
  const hr = now.getHours();
  const greet = hr < 5 ? 'Доброй ночи' : hr < 12 ? 'Доброе утро' : hr < 18 ? 'Добрый день' : 'Добрый вечер';
  const isCur = state.weekStart === dkey(mondayOf(t0));
  const list = day(state.sel), selD = fromKey(state.sel);

  const week = (d: number) => {
    const w = addDays(ws, 7 * d);
    state.weekStart = dkey(w);
    state.sel = state.weekStart === dkey(mondayOf(t0)) ? tk : dkey(w);
    hap('select'); refresh();
  };

  // Кто ещё не ответил — показываем одной спокойной записочкой: бот справится сам.
  let pendingNote = null;
  if (state.sel === tk) {
    const pend = [0, 1].flatMap(i => day(dkey(addDays(t0, i)))).filter(s => startOf(s) > now)
      .flatMap(s => s.people.filter(p => p.st === 'pending').map(p => ({ s, c: C(p.cid) })));
    if (pend.length) {
      const f = pend[0];
      const title = pend.length > 1 ? 'Кое-кто пока не ответил' : `${short(f.c)} пока не ${fem(f.c, 'ответил', 'ответила')}`;
      pendingNote = (
        <Note icon="letter" delay={200} onClick={() => push('session', f.s.id)}>
          <b>{title}</b>
          Это нормально — бот сам напомнит ещё раз. Тебе ничего не нужно делать ♡
        </Note>
      );
    }
  }

  let nowShown = state.sel !== tk;
  const rows: JSX.Element[] = [];
  list.forEach((s, i) => {
    if (!nowShown && startOf(s) > now) { rows.push(<div key="now" className="nowline"><span>сейчас {pad(now.getHours())}:{pad(now.getMinutes())}</span></div>); nowShown = true; }
    rows.push(<SessionRow key={s.id} s={s} index={i} />);
  });

  return (
    <>
      <header className="top">
        <div>
          <div className="hello">{greet}{trainerName() ? `, ${trainerName()}` : ''} ♡</div>
          <div className="title">Расписание</div>
        </div>
        <Tap press="content" className="cz-tap" label="Настройки" onClick={() => { state.tab = 'settings'; refresh(); }}><MeAvatar size={76} /></Tap>
      </header>

      <div className="wnav">
        <Arrow direction="left" label="Прошлая неделя" width={30} onClick={() => week(-1)} />
        <span>{rangeLabel(ws, addDays(ws, 6))}</span>
        <Arrow direction="right" label="Следующая неделя" width={30} onClick={() => week(1)} />
        {!isCur && <button type="button" className="link" onClick={() => { state.weekStart = dkey(mondayOf(t0)); state.sel = tk; refresh(); }}>к сегодня</button>}
      </div>

      <div className="week">
        {Array.from({ length: 7 }, (_, i) => {
          const d = addDays(ws, i), k = dkey(d), n = day(k).length;
          return (
            <Tap key={k} press="push" className={`wd cz-tap ${k === state.sel ? 'sel' : ''} ${k === tk ? 'today' : ''}`}
              onClick={() => { state.sel = k; hap('select'); refresh(); }}>
              {k === tk && <Icon name="heart" size={26} className="wd__today" />}
              <small>{WD[d.getDay()]}</small><b>{d.getDate()}</b>
              <i style={{ opacity: n ? 1 : 0 }} />
            </Tap>
          );
        })}
      </div>

      {pendingNote}

      <Mo key={state.sel} enter="window" block className="day-mo">
      <Window kind="paper" title={state.sel === tk ? 'Сегодня' : cap1(fmtDay(selD).split(',')[0])} ribbonColor="pink" className="day" animate={false}>
        {state.sel !== tk || list.length ? <div className="day__date">{cap1(fmtDay(selD))}</div> : null}
        {list.length ? <div className="day__list">{rows}</div> : (
          <Empty face="(｡•ᴗ•｡)♡">
            <b>Свободный день</b>
            Можно отдохнуть — или добавить занятие, если захочется.
            <Button color="pink" size="sm" icon="plus" onClick={() => newSession()}>Добавить</Button>
          </Empty>
        )}
        <PayBlock k={state.sel} after={list.length} />
      </Window>
      </Mo>
    </>
  );
}

/** Ожидаемый доход — только в дни, когда кто-то правда платит: разовое занятие или продление. */
function PayBlock({ k, after }: { k: string; after: number }) {
  const dues = paymentsOn(k);
  if (!dues.length) return null;
  return (
    <Mo enter="slap" block delay={150 + (after + 1) * 70}>
    <div className="pay">
      <div className="pay__head"><Icon name="coin" size={40} /><b>Ожидаемый доход</b><span>{rub(dues.reduce((a, d) => a + d.amount, 0))}</span></div>
      {dues.map(d => (
        <button key={d.s.id + d.c.id} type="button" className="pay__row cz-tap" onClick={() => push('session', d.s.id)}>
          <Avatar c={d.c} size={40} />
          <span className="pay__who"><b>{short(d.c)}</b> · {d.label} · {d.s.time}</span>
          <span className="pay__sum">{rub(d.amount)}</span>
        </button>
      ))}
    </div>
    </Mo>
  );
}

export function newSession() {
  const tk = dkey(today0());
  state.form = { type: 'pers', people: [], k: state.sel < tk ? tk : state.sel, time: '18:00', repeat: false, ask: true, err: '' };
  push('new');
}

/* ===== Клиенты ===== */
export function Clients() {
  const q = state.q.trim().toLowerCase();
  const list = sortedClients().filter(c => !q || c.name.toLowerCase().includes(q));
  return (
    <>
      <header className="top">
        <div><div className="hello">Твои люди ♡</div><div className="title">Клиенты</div></div>
      </header>
      <input className="inp" type="search" placeholder="Найти по имени…" value={state.q} onChange={e => { state.q = e.target.value; refresh(); }} />
      <Tap press="push" className="invite cz-tap" onClick={() => openInvite()}>
        <Icon name="mail" size={64} />
        <div className="invite__mid"><b>Пригласить клиента</b><span>Ссылка на бота — и напоминания пойдут сами</span></div>
        <Icon name="plusTeal" size={48} />
      </Tap>
      <Sheet>
        {list.length ? list.map((c, i) => (
            <Tap key={c.id} press="content" enter="slap" index={Math.min(i, 8)} className="crow cz-tap" onClick={() => push('client', c.id)}>
              <Avatar c={c} />
              <div className="crow__mid">
                <div className="crow__name">{c.name}</div>
                <div className="crow__sub">{c.goal}</div>
                {!c.joined ? <Tag tone="soft" icon="letter">Ещё не в боте</Tag> : packLow(c) ? <Tag tone="soft" icon="medalPink">Скоро продлевать</Tag> : null}
              </div>
            </Tap>
        )) : <Empty face="(・・？)">Никого не нашли</Empty>}
      </Sheet>
    </>
  );
}

export function openInvite(name = '') {
  state.invite = { name, code: 'inv_' + Math.random().toString(36).slice(2, 8) };
  push('invite');
}

/* ===== Настройки ===== */
function Sw({ k, title, sub }: { k: keyof Settings; title: string; sub?: string }) {
  const v = state.settings[k] as boolean;
  return (
    <div className="field">
      <div><div className="field__t">{title}</div>{sub && <div className="field__s">{sub}</div>}</div>
      <Toggle kind="switch" checked={v} height={48} onChange={x => { (state.settings[k] as boolean) = x; save(); hap('select'); refresh(); }} />
    </div>
  );
}

export function editType(key: TypeKey | null) {
  const T = key ? TYPES[key] : null;
  const look = T ? Math.max(0, TYPE_LOOKS.findIndex(l => l.color === T.color && l.icon === T.icon)) : Object.keys(TYPES).length % TYPE_LOOKS.length;
  state.typeForm = { key, name: T?.name ?? '', dur: T?.dur ?? 60, price: T ? String(T.price) : '', cap: T?.cap ?? 1, look, err: '' };
  push('type');
}
export function editPack(id: string | null) {
  const p = id ? PACKS.find(x => x.id === id) : null;
  state.packForm = { id, n: p ? String(p.n) : '', price: p ? String(p.price) : '', days: p?.days ?? 30, err: '' };
  push('pack');
}
const capLabel = (cap: number) => (cap >= 3 ? `группа до ${cap}` : cap === 2 ? 'вдвоём' : 'один на один');

/** Текст напоминания о продлении — один и тот же для превью и для отправки. */
export const renewText = (name: string, left: number, until: Date, packLabel: string, price: number) =>
  `${name}, привет! ♡\nВ абонементе ${left === 0 ? 'закончились занятия' : `осталось ${left} ${plural(left, 'занятие', 'занятия', 'занятий')}`} — до ${until.getDate()} ${MG[until.getMonth()]}.\nПродлим, чтобы не прерываться? ${packLabel} — ${rub(price)}, оплатить можно прямо здесь.`;

export function SettingsTab() {
  const st = state.settings;
  const remindDay = st.r24 ? 'Завтра' : 'Сегодня';
  const demoPack = PACKS.find(p => p.n > 1) || PACKS[0];
  return (
    <>
      <header className="top"><div><div className="hello">Всё под контролем ♡</div><div className="title">Настройки</div></div></header>

      <Sheet>
        <div className="me">
          <MeAvatar size={88} />
          <div><div className="me__name">{trainerFullName() || 'Тренер'}</div><div className="me__sub">{me()?.username ? `@${me()!.username} · ` : ''}бот @{CONFIG.botUsername}</div></div>
        </div>
      </Sheet>

      <SecTitle>Размер интерфейса</SecTitle>
      <div className="seg">
        {Object.entries(DENSITY).map(([k, d]) => (
          <Button key={k} color={k === densKey ? 'pink' : 'white'} size="sm" shape="square"
            onClick={() => { if (k !== densKey) { hap('select'); setDensity(k); } }}>{d.label}</Button>
        ))}
      </div>

      <SecTitle>Бот напомнит клиентам</SecTitle>
      <Sheet>
        <Sw k="r24" title="За сутки" />
        <Sw k="r2" title="За 2 часа" />
        <Sw k="r30" title="За 30 минут" />
      </Sheet>

      <SecTitle>Спокойствие</SecTitle>
      <Sheet>
        <Sw k="notifyMe" title="Тихонько сказать мне" sub="Если клиент не ответил за 3 часа до тренировки" />
        <Sw k="waitlist" title="Лист ожидания" sub="Освободившееся окошко бот сам предложит другим" />
        <Sw k="calmMotion" title="Меньше движения" sub="Без прыжков — элементы просто мягко появляются" />
      </Sheet>

      <SecTitle>Бесплатная отмена</SecTitle>
      <div className="seg">
        {[6, 12, 24].map(n => (
          <Button key={n} color={st.cancelH === n ? 'pink' : 'white'} size="sm" shape="square"
            onClick={() => { st.cancelH = n; save(); hap('select'); refresh(); }}>за {n} ч</Button>
        ))}
      </div>

      <SecTitle>Так клиент видит напоминание</SecTitle>
      <div className="chat">
        <div className="bubble">
          <div className="bubble__from">Бот тренера</div>
          <b>Напоминание о тренировке ♡</b>
          {remindDay} в 18:00 — персональная тренировка.<br />{CONFIG.place}<br />Жду вас 🥂
          <div className="bubble__kb">
            <button type="button" onClick={() => toast('Клиент нажал «Приду» — в расписании сразу появится «Придёт»')}>Приду</button>
            <button type="button" onClick={() => toast('Клиент нажал «Не смогу» — бот предложит окошко листу ожидания')}>Не смогу</button>
            <button type="button" className="wide" onClick={() => toast('Клиент выберет новое время, а ты получишь запрос')}>Перенести</button>
          </div>
        </div>
      </div>

      <SecTitle>А так — о продлении абонемента</SecTitle>
      <div className="chat">
        <div className="bubble">
          <div className="bubble__from">Бот тренера</div>
          <b>Абонемент скоро закончится ♡</b>
          <span className="pre">{renewText('Анна', 1, addDays(today0(), 6), packName(demoPack), demoPack.price).split('\n').slice(1).join('\n')}</span>
          <div className="bubble__kb">
            <button type="button" onClick={() => toast('Клиенту придёт счёт — абонемент включится сам после оплаты')}>Продлить</button>
            <button type="button" onClick={() => toast('Бот мягко напомнит ещё раз перед следующей тренировкой')}>Позже</button>
          </div>
        </div>
      </div>
      <p className="hint">Бот присылает это, когда остаётся 2 занятия или меньше. Можно отправить и вручную — из карточки клиента.</p>

      <SecTitle right={<button type="button" className="link" onClick={() => editType(null)}>+ добавить</button>}>Виды тренировок</SecTitle>
      <Sheet>
        {Object.entries(TYPES).map(([k, T]) => (
          <Tap key={k} className="trow cz-tap" onClick={() => editType(k)}>
            <TypeBadge type={k} size={52} />
            <div className="trow__mid"><b>{T.name}</b><span>{T.dur} мин · {capLabel(T.cap)}</span></div>
            <span className="price">{rub(T.price)}</span>
            <Icon name="pencil" size={36} />
          </Tap>
        ))}
      </Sheet>

      <SecTitle right={<button type="button" className="link" onClick={() => editPack(null)}>+ добавить</button>}>Абонементы</SecTitle>
      <Sheet>
        {PACKS.map(p => (
          <Tap key={p.id} className="trow cz-tap" onClick={() => editPack(p.id)}>
            <span data-mo="content" className="trow__ic"><Icon name={packIcon(p)} size={52} /></span>
            <div className="trow__mid"><b>{packName(p)}</b><span>на {p.days} дней</span></div>
            <span className="price">{rub(p.price)}</span>
            <Icon name="pencil" size={36} />
          </Tap>
        ))}
      </Sheet>

      <p className="foot">Прототип · клиенты и расписание демонстрационные</p>
      <div className="center">
        <Button color="white" size="sm" onClick={() => clearSaved(() => location.reload())}>Сбросить демо</Button>
      </div>
    </>
  );
}
