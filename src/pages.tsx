// Страницы, которые открываются поверх вкладок.
import { Card, Icon, Window, type IconName } from 'cozy-ui-kit';
import { Button, Mo, Tap, Toggle } from './motion';
import { useState, type CSSProperties } from 'react';
import {
  addDays, allCx, C, CONFIG, cap1, day, dkey, endOf, fem, findSes, fmtDay, fmtShort, fromKey, fromMin, isMulti, mk, MG,
  mondayOf, nextUid, overlaps, PACKS, packIcon, packLow, packName, paymentsOn, personStatus, plural, renewalSession, renewPack, rub, S,
  short, sortDay, sortedClients, startOf, subOf, TEMPLATES, toMin, today0, TYPE_LOOKS, TYPES, typeUsed, WD, when, whoOf, isGroup,
  type Session, type Status, type TypeKey,
} from './data';
import { closeDialog, confirmDialog, hap, inTG, pop, push, refresh, state, tg, toast, type PageName } from './store';
import { save } from './persist';
import { openInvite, renewText } from './tabs';
import { Avatar, Chip, Empty, ErrNote, Hearts, PageHead, SecTitle, Sheet, Tag, TypeBadge } from './ui';

/* ===== Тренировка ===== */
type Line = [IconName, string];
function careLines(s: Session): Line[] {
  const st = startOf(s), now = Date.now(), out: Line[] = [];
  const multi = isMulti(s), p0 = s.people[0], c0 = C(p0.cid);
  if (!multi && p0.st === 'nobot') return [['letter', `${short(c0)} ещё не в боте — отправь ссылку, и бот начнёт напоминать`]];
  const rem: [keyof typeof state.settings, number, string][] = [['r24', 24, 'за сутки'], ['r2', 2, 'за 2 часа'], ['r30', .5, 'за 30 минут']];
  for (const [key, hrs, label] of rem) {
    if (!state.settings[key]) continue;
    const t = new Date(st.getTime() - hrs * 36e5);
    out.push(t.getTime() <= now ? ['check', `Напомнил ${label} — ${when(t)}`] : ['timer', `Напомнит ${label} — ${when(t)}`]);
  }
  if (multi) {
    if (s.people.some(p => p.st === 'pending')) out.push(['letter', 'Кто-то ещё не ответил — бот напомнит сам']);
    if (s.people.some(p => p.st === 'cancelled') && state.settings.waitlist) out.push(['heart', 'Свободные места бот предложит листу ожидания']);
    return out;
  }
  const n = short(c0);
  if (p0.st === 'confirmed') out.push(['heart', `${n} ${fem(c0, 'подтвердил', 'подтвердила')} — всё хорошо`]);
  if (p0.st === 'pending') {
    out.push(['letter', 'Ответа пока нет — это нормально, бот напомнит ещё раз']);
    if (state.settings.notifyMe) out.push(['bell', 'Если ответа не будет, бот тихонько скажет тебе за 3 часа']);
  }
  if (p0.st === 'cancelled' && state.settings.waitlist) out.push(['heart', 'Окошко бот уже предложил листу ожидания']);
  return out;
}

function setStatus(sid: string, cid: string, v: Status) {
  const s = findSes(sid)!, p = s.people.find(x => x.cid === cid)!, c = C(cid);
  const was = p.st === 'came' || p.st === 'missed';
  p.st = p.st === v ? 'confirmed' : v;
  const now = p.st === 'came' || p.st === 'missed';
  if (c.pack) { if (!was && now) c.pack.left = Math.max(0, c.pack.left - 1); if (was && !now) c.pack.left++; }
  hap('select'); refresh();
  if (p.st === 'came') toast(`Отмечено ♡ ${c.pack ? 'Занятие списано с абонемента' : ''}`, undefined, true);
}

function SessionPage({ id }: { id: string }) {
  const s = findSes(id);
  if (!s) return <><PageHead title="Тренировка" /><Empty face="(・・？)">Тренировка не найдена</Empty></>;
  const T = TYPES[s.type], now = Date.now(), d = fromKey(s.k);
  const started = startOf(s).getTime() <= now, past = endOf(s).getTime() <= now, cx = allCx(s), multi = isMulti(s);
  const care = past ? [] : careLines(s);
  const dues = paymentsOn(s.k).filter(d => d.s === s);

  const cancel = () => confirmDialog({
    title: 'Отменить?',
    text: multi ? 'Все участники получат мягкое сообщение от бота.' : `${short(C(s.people[0].cid))} получит мягкое сообщение от бота.`,
    ok: 'Отменить', cancel: 'Оставить',
    onOk: () => {
      const before = s.people.map(p => p.st);
      s.people.forEach(p => { p.st = 'cancelled'; });
      closeDialog(); pop(); hap('warning');
      toast('Тренировка отменена', () => { s.people.forEach((p, i) => { p.st = before[i]; }); hap('success'); refresh(); });
    },
  });

  return (
    <>
      <PageHead title={isGroup(T) ? T.name : multi ? whoOf(s) : short(C(s.people[0].cid))} color={T.color} />
      <Mo enter="window" block>
      <Window kind="frame" color={T.color} animate={false}>
        <div className="hero">
          <TypeBadge type={s.type} size={88} />
          <div>
            <div className="hero__time">{s.time}–{fromMin(startOf(s).getHours() * 60 + startOf(s).getMinutes() + T.dur)}</div>
            <div className="hero__date">{cap1(fmtDay(d))}</div>
            <div className="hero__place"><Icon name="pinRed" size={30} />{CONFIG.place}</div>
          </div>
        </div>
        <div className="hero__tags"><Tag tone="soft">{subOf(s)}</Tag>{cx && <Tag tone="calm">Отменена</Tag>}</div>
      </Window>
      </Mo>

      <SecTitle>{multi ? `Кто записан · ${s.people.length} из ${T.cap}` : 'Кто придёт'}</SecTitle>
      <Sheet>
        {s.people.map((p, i) => {
          const c = C(p.cid), [label, tone] = personStatus(p.st, c), due = dues.find(d => d.c.id === c.id);
          return (
            <Mo key={p.cid} enter="slap" index={i} block>
              <div className="prow">
                <Tap className="prow__main cz-tap" onClick={() => push('client', c.id)}>
                  <Avatar c={c} size={60} />
                  <div className="prow__mid"><div className="prow__name">{c.name}</div><div className="prow__tags"><Tag tone={tone}>{label}</Tag>{due && <Tag tone="soft" icon="coin">{due.kind === 'renew' ? 'Продление' : 'Оплата'} {rub(due.amount)}</Tag>}</div></div>
                </Tap>
                {p.st === 'nobot' ? (
                  <div className="prow__acts"><Button color="pink" size="sm" shape="square" onClick={() => openInvite(short(c))}>Пригласить в бота</Button></div>
                ) : started && p.st !== 'cancelled' ? (
                  <div className="prow__acts">
                    <Button color={p.st === 'came' ? 'pink' : 'white'} size="sm" shape="square" icon={p.st === 'came' ? 'check' : undefined}
                      onClick={() => setStatus(s.id, c.id, 'came')}>{fem(c, 'Был', 'Была')}</Button>
                    <Button color={p.st === 'missed' ? 'gray' : 'white'} size="sm" shape="square"
                      onClick={() => setStatus(s.id, c.id, 'missed')}>Не получилось</Button>
                  </div>
                ) : !started && p.st === 'pending' ? (
                  <div className="prow__acts"><Button color="white" size="sm" shape="square" onClick={() => {
                    toast(`Бот напомнил ${short(c)} ♡`); hap('success');
                    setTimeout(() => { if (p.st !== 'pending') return; p.st = 'confirmed'; refresh(); toast(`${short(c)} ${fem(c, 'ответил', 'ответила')}: придёт ♡`, undefined, true); hap('success'); }, 3500);
                  }}>Напомнить ещё раз</Button></div>
                ) : null}
              </div>
            </Mo>
          );
        })}
      </Sheet>

      {care.length > 0 && <>
        <SecTitle>Бот позаботится</SecTitle>
        <Sheet>
          <ul className="care">{care.map(([ic, t], i) => <li key={i}><Icon name={ic} size={36} /><span>{t}</span></li>)}</ul>
        </Sheet>
      </>}

      {!started && !cx && (
        <div className="actions">
          <Button color="turquoise" fullWidth onClick={() => { state.mv = { k: s.k, time: null, err: '' }; push('move', s.id); }}>Перенести</Button>
          <Button color="white" size="sm" onClick={cancel}>Отменить тренировку</Button>
        </div>
      )}
    </>
  );
}

/* ===== Перенос ===== */
function MovePage({ id }: { id: string }) {
  const s = findSes(id)!, mv = state.mv!, T = TYPES[s.type], now = new Date();
  const save = () => {
    if (!mv.time) { mv.err = 'Выбери время ♡'; hap('warning'); refresh(); return; }
    S[s.k] = S[s.k].filter(x => x !== s);
    s.k = mv.k; s.time = mv.time; s.id = `${mv.k}_${mv.time}_${s.type}_m${nextUid()}`;
    const hrs = (startOf(s).getTime() - Date.now()) / 36e5;
    s.people.forEach(p => { if (p.st !== 'nobot') p.st = hrs < 30 ? 'pending' : 'planned'; });
    day(mv.k).push(s); sortDay(mv.k);
    state.sel = mv.k; state.weekStart = dkey(mondayOf(fromKey(mv.k)));
    pop(); setTimeout(pop, 60);
    toast(`Перенесено на ${fmtShort(fromKey(mv.k))}, ${mv.time}. Бот спросит клиента ♡`);
    hap('success');
  };
  const times: string[] = [];
  for (let m = toMin(CONFIG.dayStart); m <= toMin(CONFIG.dayEnd); m += 30) times.push(fromMin(m));
  return (
    <>
      <PageHead title="Перенос" color="turquoise" />
      <p className="lead">{whoOf(s)} · сейчас {fmtShort(fromKey(s.k))}, {s.time}</p>
      <SecTitle>День</SecTitle>
      <div className="chips scroll">
        {Array.from({ length: 14 }, (_, i) => {
          const d = addDays(today0(), i), k = dkey(d);
          return <Chip key={k} color="turquoise" on={mv.k === k} onClick={() => { mv.k = k; mv.time = null; mv.err = ''; refresh(); }}>
            {i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : WD[d.getDay()]}<small>{d.getDate()} {MG[d.getMonth()]}</small>
          </Chip>;
        })}
      </div>
      <SecTitle>Свободное время</SecTitle>
      <div className="chips">
        {times.map(t => {
          const busy = day(mv.k).some(x => x !== s && !allCx(x) && overlaps(x, t, T.dur));
          const gone = mv.k === dkey(today0()) && Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) <= now.getHours() * 60 + now.getMinutes();
          return <Chip key={t} color="turquoise" off={busy || gone} on={mv.time === t} onClick={() => { mv.time = t; mv.err = ''; refresh(); }}>{t}</Chip>;
        })}
      </div>
      {mv.err && <ErrNote text={mv.err} />}
      <div className="actions">
        <Button color="turquoise" fullWidth onClick={save}>Перенести</Button>
        <p className="hint">Бот предложит клиенту новое время и попросит подтвердить.</p>
      </div>
    </>
  );
}

/* ===== Новая тренировка ===== */
function NewPage() {
  const f = state.form!, T = TYPES[f.type], multi = T.cap > 1;
  const setErr = (e: string) => { f.err = e; hap('warning'); refresh(); };
  const save = () => {
    if (!f.people.length) return setErr(multi ? 'Выбери участников ♡' : 'Выбери клиента ♡');
    if (!f.k || !f.time) return setErr('Укажи дату и время ♡');
    if (toMin(f.time) < toMin(CONFIG.dayStart) || toMin(f.time) > toMin(CONFIG.dayEnd)) return setErr(`Запись открыта с ${CONFIG.dayStart.replace(/^0/, '')} до ${CONFIG.dayEnd}`);
    if (startOf({ k: f.k, time: f.time }).getTime() < Date.now()) return setErr('Это время уже прошло — выбери другое');
    const clash = day(f.k).find(x => !allCx(x) && overlaps(x, f.time, T.dur));
    if (clash) return setErr(`В ${clash.time} уже есть тренировка — выбери другое время`);
    const s = mk(f.k, f.time, f.type, f.people);
    s.id += '_n' + nextUid();
    const hrs = (startOf(s).getTime() - Date.now()) / 36e5;
    s.people.forEach(p => { p.st = !C(p.cid).joined ? 'nobot' : hrs < 30 ? (f.ask ? 'pending' : 'confirmed') : 'planned'; });
    day(f.k).push(s); sortDay(f.k);
    if (f.repeat) {
      const dow = fromKey(f.k).getDay();
      TEMPLATES.push({ dow, t: f.time, type: f.type, p: f.people.slice(), from: f.k });
      Object.keys(S).forEach(k => { if (k > f.k && fromKey(k).getDay() === dow) { S[k].push(mk(k, f.time, f.type, f.people)); sortDay(k); } });
    }
    state.sel = f.k; state.weekStart = dkey(mondayOf(fromKey(f.k)));
    pop();
    toast(`Добавлено ♡ ${fmtShort(fromKey(f.k))}, ${f.time}`, undefined, true);
    hap('success');
  };
  const pick = (cid: string) => {
    f.err = '';
    if (T.cap === 1) f.people = [cid];
    else if (f.people.includes(cid)) f.people = f.people.filter(x => x !== cid);
    else if (f.people.length < T.cap) f.people.push(cid);
    else return setErr(`Здесь помещается до ${T.cap} человек`);
    refresh();
  };
  return (
    <>
      <PageHead title="Новая тренировка" />
      <SecTitle>Вид</SecTitle>
      <div className="chips">
        {(Object.keys(TYPES) as TypeKey[]).map(k => (
          <Chip key={k} on={f.type === k} color={TYPES[k].color} onClick={() => { f.type = k; if (f.people.length > TYPES[k].cap) f.people = f.people.slice(0, TYPES[k].cap); refresh(); }}>
            <Icon name={TYPES[k].icon} size={30} />{TYPES[k].name}
          </Chip>
        ))}
      </div>
      <SecTitle right={multi ? <span className="sec-t__r">{f.people.length} из {T.cap}</span> : undefined}>{multi ? 'Участники' : 'Клиент'}</SecTitle>
      <div className="chips">
        {sortedClients().map(c => <Chip key={c.id} on={f.people.includes(c.id)} onClick={() => pick(c.id)}>{c.name.split(' ')[0]} {c.name.split(' ')[1][0]}.</Chip>)}
      </div>
      <SecTitle>Когда</SecTitle>
      <Sheet>
        <label className="field"><span className="field__t">Дата</span>
          <input className="inp inp--sm" type="date" value={f.k} min={dkey(today0())} onChange={e => { f.k = e.target.value; f.err = ''; refresh(); }} /></label>
        <label className="field"><span className="field__t">Время</span>
          <input className="inp inp--sm" type="time" step={900} min={CONFIG.dayStart} max={CONFIG.dayEnd} value={f.time} onChange={e => { f.time = e.target.value; f.err = ''; refresh(); }} /></label>
        <div className="field"><div className="field__t">Каждую неделю</div>
          <Toggle kind="switch" height={48} checked={f.repeat} onChange={v => { f.repeat = v; hap('select'); refresh(); }} /></div>
      </Sheet>
      <Sheet>
        <div className="field"><div><div className="field__t">Попросить подтвердить</div><div className="field__s">Клиент получит кнопки «Приду / Не смогу»</div></div>
          <Toggle kind="switch" height={48} checked={f.ask} onChange={v => { f.ask = v; hap('select'); refresh(); }} /></div>
      </Sheet>
      {f.err && <ErrNote text={f.err} />}
      <div className="actions"><Button color="pink" halo fullWidth onClick={save}>Добавить</Button></div>
    </>
  );
}

/* ===== Клиент ===== */
function ClientPage({ id }: { id: string }) {
  const c = C(id), t0 = today0(), now = Date.now();
  const [note, setNote] = useState(c.note);
  const nextPay = renewalSession(c, 60);
  const next: Session[] = [];
  for (let i = 0; i < 14 && next.length < 3; i++) for (const s of day(dkey(addDays(t0, i)))) if (startOf(s).getTime() > now && s.people.some(p => p.cid === id) && next.length < 3) next.push(s);
  return (
    <>
      <PageHead title={short(c)} />
      <Mo enter="slap" block className="prof">
        <Avatar c={c} size={132} />
        <div className="prof__name">{c.name}</div>
        <div className="prof__goal"><Icon name="trophy" size={32} />{c.goal}</div>
        {c.joined ? <Tag tone="ok">В боте</Tag> : <Tag tone="soft" icon="letter">Ещё не в боте</Tag>}
      </Mo>

      {!c.joined && (
        <Sheet>
          <p className="body">Как только {short(c)} {fem(c, 'нажмёт', 'нажмёт')} «Запустить» в боте, напоминания пойдут сами.</p>
          <Button color="pink" size="sm" icon="plus" onClick={() => openInvite(short(c))}>Отправить ссылку</Button>
        </Sheet>
      )}

      <SecTitle>Абонемент</SecTitle>
      <Sheet>
        {c.pack ? <>
          <div className="pack__head"><b>{c.pack.total} {plural(c.pack.total, 'занятие', 'занятия', 'занятий')}</b><span>до {c.pack.until.getDate()} {MG[c.pack.until.getMonth()]}</span></div>
          <Hearts total={c.pack.total} left={c.pack.left} />
          {nextPay && <p className="body soft">Следующая оплата — {fmtShort(fromKey(nextPay.k))}, {rub(renewPack(c).price)}</p>}
          {packLow(c) && <p className="body soft">Скоро продлевать — бот может мягко об этом напомнить.</p>}
          <div className="row-btns">
            <Button color="pink" size="sm" shape="square" onClick={() => push('renew', c.id)}>Продлить</Button>
            {packLow(c) && <Button color="white" size="sm" shape="square" onClick={() => {
              const pk = renewPack(c), pack = c.pack!;
              confirmDialog({ title: 'Напомнить?', text: renewText(short(c), pack.left, pack.until, packName(pk), pk.price), ok: 'Отправить', cancel: 'Не сейчас', primary: true,
                onOk: () => { closeDialog(); toast(`${short(c)} получит мягкое напоминание ♡`); hap('success'); } });
            }}>Напомнить</Button>}
          </div>
        </> : <>
          <p className="body soft">Абонемента пока нет.</p>
          <Button color="pink" size="sm" shape="square" onClick={() => push('renew', c.id)}>Оформить</Button>
        </>}
      </Sheet>

      <SecTitle>Скоро увидитесь</SecTitle>
      <Sheet>
        {next.length ? next.map(s => {
          const p = s.people.find(x => x.cid === id)!, [label, tone] = personStatus(p.st, c);
          return (
            <Tap key={s.id} className="nrow cz-tap" onClick={() => push('session', s.id)}>
              <TypeBadge type={s.type} size={48} />
              <div className="nrow__mid"><b>{cap1(fmtShort(fromKey(s.k)))}, {s.time}</b><span>{subOf(s)}</span></div>
              <Tag tone={tone}>{label}</Tag>
            </Tap>
          );
        }) : <p className="body soft">Пока ничего не запланировано.</p>}
      </Sheet>

      <SecTitle>Заметочки</SecTitle>
      <Sheet>
        <textarea className="txt" placeholder="Травмы, цели, что учесть…" value={note} onChange={e => { setNote(e.target.value); c.note = e.target.value; }} />
      </Sheet>
    </>
  );
}

/* ===== Абонемент ===== */
function RenewPage({ id }: { id: string }) {
  const c = C(id);
  const [sel, setSel] = useState(0);
  const p = PACKS[sel];
  return (
    <>
      <PageHead title="Абонемент" />
      <p className="lead">{c.name}</p>
      <div className="packs">
        {PACKS.map((pk, i) => (
          <Mo key={pk.id} enter="slap" index={i}>
            <Card title={pk.n === 1 ? 'Разовое' : `×${pk.n}`} color="pink" icon={packIcon(pk)} footer={rub(pk.price).replace(' ₽', '')} width={160}
              selected={sel === i} onClick={() => { setSel(i); hap('select'); }} />
            <div className="packs__cap">{pk.n === 1 ? '1 занятие' : `${pk.n} занятий`}<br />на {pk.days} дней</div>
          </Mo>
        ))}
      </div>
      <div className="actions">
        <Button color="pink" halo fullWidth onClick={() => {
          const left = (c.pack ? c.pack.left : 0) + p.n; // остаток старого абонемента не пропадает
          c.pack = { total: left, left, until: addDays(today0(), p.days) };
          pop(); toast(`${short(c)} получит счёт в Telegram ♡`, undefined, true); hap('success');
        }}>Отправить счёт</Button>
        <p className="hint">Клиент оплатит картой прямо в чате с ботом — абонемент включится сам.</p>
      </div>
    </>
  );
}

/* ===== Приглашение ===== */
function InvitePage() {
  const iv = state.invite!;
  const link = `https://t.me/${CONFIG.botUsername}?start=${iv.code}`;
  const share = () => {
    const text = `${iv.name ? iv.name + ', привет' : 'Привет'}! Это мой бот для тренировок: тут расписание, напоминания и запись. Нажми «Запустить» ♡`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
    if (inTG) tg.openTelegramLink(url); else window.open(url, '_blank');
    hap('success');
  };
  const copy = () => {
    const done = () => { toast('Ссылка скопирована ♡'); hap('success'); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, () => toast(link));
    else toast(link);
  };
  return (
    <>
      <PageHead title="Пригласить" />
      <Sheet>
        <ol className="steps">
          <li>Отправь клиенту ссылку на бота</li>
          <li>Клиент нажимает «Запустить»</li>
          <li>Всё — напоминания пойдут сами ♡</li>
        </ol>
      </Sheet>
      <SecTitle>Как зовут</SecTitle>
      <input className="inp" placeholder="Например, Алина" value={iv.name} onChange={e => { iv.name = e.target.value; refresh(); }} />
      <SecTitle>Личная ссылка</SecTitle>
      <div className="linkbox">{link}</div>
      <div className="actions">
        <Button color="pink" halo fullWidth onClick={share}>Отправить</Button>
        <Button color="white" size="sm" onClick={copy}>Скопировать ссылку</Button>
      </div>
    </>
  );
}

/* ===== Вид тренировки: редактирование ===== */
function TypePage() {
  const f = state.typeForm!, look = TYPE_LOOKS[f.look];
  const used = f.key ? typeUsed(f.key) : false;
  const setErr = (e: string) => { f.err = e; hap('warning'); refresh(); };
  const saveType = () => {
    const name = f.name.trim(), price = Math.round(Number(f.price.replace(/\s/g, '')));
    if (!name) return setErr('Как назовём вид? ♡');
    if (!(price >= 0) || f.price.trim() === '') return setErr('Укажи цену за занятие');
    const key = f.key ?? `t${Date.now().toString(36)}`;
    TYPES[key] = { name, dur: f.dur, price, cap: f.cap, color: look.color, icon: look.icon };
    save(); pop(); toast(f.key ? 'Сохранено ♡' : `Добавлено: ${name} ♡`); hap('success');
  };
  const remove = () => confirmDialog({
    title: 'Удалить вид?', text: `«${TYPES[f.key!].name}» пропадёт из списка.`, ok: 'Удалить', cancel: 'Оставить',
    onOk: () => { const k = f.key!, was = TYPES[k]; delete TYPES[k]; save(); closeDialog(); pop(); toast('Вид удалён', () => { TYPES[k] = was; save(); refresh(); }); },
  });
  return (
    <>
      <PageHead title={f.key ? 'Вид тренировки' : 'Новый вид'} color={look.color} />
      <SecTitle>Название</SecTitle>
      <input className="inp" placeholder="Например, Пилатес" value={f.name} maxLength={28} onChange={e => { f.name = e.target.value; f.err = ''; refresh(); }} />
      <SecTitle>Длительность</SecTitle>
      <div className="chips">{[30, 45, 60, 75, 90, 120].map(m => <Chip key={m} color={look.color} on={f.dur === m} onClick={() => { f.dur = m; refresh(); }}>{m} мин</Chip>)}</div>
      <SecTitle>Сколько человек</SecTitle>
      <div className="chips">{[1, 2, 4, 6, 8, 10, 12, 15].map(n => (
        <Chip key={n} color={look.color} on={f.cap === n} onClick={() => { f.cap = n; refresh(); }}>{n === 1 ? 'Один' : n === 2 ? 'Вдвоём' : `до ${n}`}</Chip>
      ))}</div>
      <SecTitle>Цена за одно занятие</SecTitle>
      <label className="money"><input className="inp" inputMode="numeric" placeholder="2500" value={f.price} onChange={e => { f.price = e.target.value.replace(/[^\d\s]/g, ''); f.err = ''; refresh(); }} /><span>₽</span></label>
      <SecTitle>Значок</SecTitle>
      <div className="looks">{TYPE_LOOKS.map((l, i) => (
        <Tap key={i} className={`look cz-tap ${f.look === i ? 'on' : ''}`} label={`Значок ${i + 1}`} onClick={() => { f.look = i; hap('select'); refresh(); }}>
          <span data-mo="content" className={`tbadge tbadge--${l.color}`} style={{ '--s': '64px' } as CSSProperties}><Icon name={l.icon} size={40} /></span>
        </Tap>
      ))}</div>
      {f.err && <ErrNote text={f.err} />}
      <div className="actions">
        <Button color="pink" halo fullWidth onClick={saveType}>Сохранить</Button>
        {f.key && (used
          ? <p className="hint">Этот вид уже есть в расписании — его можно поправить, но не удалить.</p>
          : <Button color="white" size="sm" onClick={remove}>Удалить вид</Button>)}
      </div>
    </>
  );
}

/* ===== Абонемент: редактирование ===== */
function PackPage() {
  const f = state.packForm!;
  const setErr = (e: string) => { f.err = e; hap('warning'); refresh(); };
  const num = (v: string) => Math.round(Number(v.replace(/\s/g, '')));
  const savePack = () => {
    const n = num(f.n), price = num(f.price);
    if (!(n >= 1 && n <= 100)) return setErr('Сколько занятий в абонементе? ♡');
    if (!(price >= 0) || f.price.trim() === '') return setErr('Укажи цену абонемента');
    if (f.id) Object.assign(PACKS.find(p => p.id === f.id)!, { n, price, days: f.days });
    else PACKS.push({ id: `p${Date.now().toString(36)}`, n, price, days: f.days });
    PACKS.sort((a, b) => b.n - a.n);
    save(); pop(); toast('Сохранено ♡'); hap('success');
  };
  const remove = () => confirmDialog({
    title: 'Удалить?', text: 'Абонемент пропадёт из списка. У кого он уже есть — ничего не изменится.', ok: 'Удалить', cancel: 'Оставить',
    onOk: () => { const i = PACKS.findIndex(p => p.id === f.id), was = PACKS[i]; PACKS.splice(i, 1); save(); closeDialog(); pop(); toast('Абонемент удалён', () => { PACKS.splice(i, 0, was); save(); refresh(); }); },
  });
  const n = num(f.n), price = num(f.price);
  return (
    <>
      <PageHead title={f.id ? 'Абонемент' : 'Новый абонемент'} />
      <SecTitle>Сколько занятий</SecTitle>
      <div className="chips">{[1, 4, 8, 10, 12, 16].map(x => <Chip key={x} on={f.n === String(x)} onClick={() => { f.n = String(x); f.err = ''; refresh(); }}>{x === 1 ? 'Разовое' : x}</Chip>)}</div>
      <input className="inp" inputMode="numeric" placeholder="или своё число" value={f.n} onChange={e => { f.n = e.target.value.replace(/\D/g, ''); f.err = ''; refresh(); }} />
      <SecTitle>Действует</SecTitle>
      <div className="chips">{[14, 30, 45, 60, 90].map(d => <Chip key={d} on={f.days === d} onClick={() => { f.days = d; refresh(); }}>{d} дней</Chip>)}</div>
      <SecTitle>Цена</SecTitle>
      <label className="money"><input className="inp" inputMode="numeric" placeholder="18000" value={f.price} onChange={e => { f.price = e.target.value.replace(/[^\d\s]/g, ''); f.err = ''; refresh(); }} /><span>₽</span></label>
      {n > 1 && price > 0 && <p className="hint">Это {rub(price / n)} за занятие</p>}
      {f.err && <ErrNote text={f.err} />}
      <div className="actions">
        <Button color="pink" halo fullWidth onClick={savePack}>Сохранить</Button>
        {f.id && PACKS.length > 1 && <Button color="white" size="sm" onClick={remove}>Удалить абонемент</Button>}
      </div>
    </>
  );
}

export function Page({ p, id }: { p: PageName; id?: string }) {
  switch (p) {
    case 'session': return <SessionPage id={id!} />;
    case 'move': return <MovePage id={id!} />;
    case 'new': return <NewPage />;
    case 'client': return <ClientPage id={id!} />;
    case 'renew': return <RenewPage id={id!} />;
    case 'invite': return <InvitePage />;
    case 'type': return <TypePage />;
    case 'pack': return <PackPage />;
  }
}
