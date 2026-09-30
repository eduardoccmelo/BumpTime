import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const storeKey = 'entre-contracoes-v1';
const pad = n => String(n).padStart(2, '0');
const duration = ms => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};
const clock = (iso, language) => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const datetimeValue = iso => {
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const copy = {
  pt: { clear: 'Limpar', clearConfirm: 'Apagar todo o histórico desta sessão?', active: 'CONTRAÇÃO EM ANDAMENTO', ready: 'PRONTA QUANDO VOCÊ ESTIVER', started: 'Começou às', registered: n => `${n} contraç${n === 1 ? 'ão registrada' : 'ões registradas'}`, tapStart: 'Toque no botão quando começar', start: 'COMEÇAR', stop: 'PARAR', tapStop: 'Toque novamente quando terminar', oneTap: 'Um toque. Sem formulários.', undo: 'Desfazer última ação', pattern: 'O PADRÃO', latest: 'últimas', patternHelp: 'Intervalo e duração de cada contração, juntos.', contraction: 'CONTRAÇÃO', interval: 'INTERVALO', duration: 'DURAÇÃO', moreFrequent: '↓ Estão ficando mais frequentes', moreSpaced: '↑ Estão ficando mais espaçadas', stable: '→ Frequência estável', frequency: 'FREQUÊNCIA', startToStart: 'início a início', history: 'HISTÓRICO', records: 'registros', first: 'primeira', edit: 'Editar registro', delete: 'Excluir registro', savedHere: 'Dados salvos somente neste aparelho.', editRecord: 'EDITAR REGISTRO', adjust: 'Ajustar horários', beginning: 'Início', end: 'Fim', cancel: 'Cancelar', save: 'Salvar', invalid: 'O horário de fim precisa ser depois do início.', graphEmpty: 'O gráfico aparece após a segunda contração.', previous: 'anterior', now: 'agora' },
  en: { clear: 'Clear', clearConfirm: 'Delete the entire history for this session?', active: 'CONTRACTION IN PROGRESS', ready: 'READY WHEN YOU ARE', started: 'Started at', registered: n => `${n} contraction${n === 1 ? ' recorded' : 's recorded'}`, tapStart: 'Tap the button when it starts', start: 'START', stop: 'STOP', tapStop: 'Tap again when it ends', oneTap: 'One tap. No forms.', undo: 'Undo last action', pattern: 'THE PATTERN', latest: 'latest', patternHelp: 'Interval and duration for each contraction, together.', contraction: 'CONTRACTION', interval: 'INTERVAL', duration: 'DURATION', moreFrequent: '↓ They are getting closer together', moreSpaced: '↑ They are getting farther apart', stable: '→ Frequency is steady', frequency: 'FREQUENCY', startToStart: 'start to start', history: 'HISTORY', records: 'records', first: 'first', edit: 'Edit record', delete: 'Delete record', savedHere: 'Data is saved only on this device.', editRecord: 'EDIT RECORD', adjust: 'Adjust times', beginning: 'Start', end: 'End', cancel: 'Cancel', save: 'Save', invalid: 'The end time must be after the start time.', graphEmpty: 'The chart appears after the second contraction.', previous: 'earlier', now: 'now' }
};

function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('entre-language') || 'pt');
  const [items, setItems] = useState(() => JSON.parse(localStorage.getItem(storeKey) || '[]'));
  const [activeStart, setActiveStart] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [undo, setUndo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editError, setEditError] = useState('');
  const t = copy[language];

  useEffect(() => localStorage.setItem(storeKey, JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem('entre-language', language), [language]);
  useEffect(() => {
    if (!activeStart) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [activeStart]);

  const completed = useMemo(() => items.filter(x => x.end).sort((a,b) => new Date(a.start) - new Date(b.start)), [items]);
  // Frequência é a medida usada para acompanhar o padrão: início → próximo início.
  const frequencies = completed.map((x, i) => i ? new Date(x.start) - new Date(completed[i - 1].start) : null);
  const recentFrequencies = frequencies.slice(-5).filter(Boolean);
  const recentCycles = completed.slice(-5).map((item, offset, list) => {
    const index = completed.length - list.length + offset;
    return { item, number: index + 1, frequency: frequencies[index], duration: new Date(item.end) - new Date(item.start) };
  });
  const trend = recentFrequencies.length < 2 ? null : recentFrequencies.at(-1) < recentFrequencies[0] ? 'mais frequentes' : recentFrequencies.at(-1) > recentFrequencies[0] ? 'mais espaçadas' : 'estáveis';

  const buzz = pattern => navigator.vibrate?.(pattern);
  function toggle() {
    const instant = new Date().toISOString();
    if (!activeStart) {
      setActiveStart(instant); buzz(18);
      return;
    }
    const next = [...items, { id: crypto.randomUUID(), start: activeStart, end: instant }];
    setItems(next); setUndo({ type: 'add', item: next.at(-1) }); setActiveStart(null); buzz([20, 50, 20]);
  }
  function undoLast() {
    if (!undo) return;
    if (undo.type === 'add') setItems(v => v.filter(x => x.id !== undo.item.id));
    if (undo.type === 'delete') setItems(v => [...v, undo.item].sort((a,b) => new Date(a.start)-new Date(b.start)));
    setUndo(null); buzz(15);
  }
  function remove(item) { setItems(v => v.filter(x => x.id !== item.id)); setUndo({ type: 'delete', item }); buzz(15); }
  function saveEdit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget); const start = new Date(data.get('start')).toISOString(); const end = new Date(data.get('end')).toISOString();
    if (end <= start) {
      setEditError(t.invalid);
      buzz(30);
      return;
    }
    setItems(v => v.map(x => x.id === editing.id ? { ...x, start, end } : x)); setEditing(null);
  }

  return <main>
    <header><div className="brand"><Logo /> <span>ENTRE</span></div><div className="header-actions"><div className="language-switch" aria-label="Language"><button className={language === 'pt' ? 'selected' : ''} onClick={() => setLanguage('pt')}>PT</button><button className={language === 'en' ? 'selected' : ''} onClick={() => setLanguage('en')}>EN</button></div><button className="reset" onClick={() => { if (confirm(t.clearConfirm)) setItems([]) }}>{t.clear}</button></div></header>
    <section className="hero" aria-live="polite">
      <p className="eyebrow">{activeStart ? t.active : t.ready}</p>
      <div className="timer">{activeStart ? duration(now - new Date(activeStart)) : '00:00'}</div>
      <p className="sub">{activeStart ? `${t.started} ${clock(activeStart, language)}` : completed.length ? t.registered(completed.length) : t.tapStart}</p>
      <button className={`main-button ${activeStart ? 'stop' : ''}`} onClick={toggle} aria-label={activeStart ? t.stop : t.start}>
        <span className="button-icon">{activeStart ? '■' : '●'}</span><span>{activeStart ? t.stop : t.start}</span>
      </button>
      <p className="hint">{activeStart ? t.tapStop : t.oneTap}</p>
    </section>

    {undo && !completed.length && <button className="undo empty-undo" onClick={undoLast}>↶ {t.undo}</button>}

    {completed.length > 0 && <>
      <section className="pattern card">
        <div className="section-title"><span>{t.pattern}</span><small>{t.latest} {recentCycles.length}</small></div>
        <p className="pattern-help">{t.patternHelp}</p>
        <div className="pattern-table"><div className="pattern-row pattern-header"><span>{t.contraction}</span><span>{t.interval}</span><span>{t.duration}</span></div>{[...recentCycles].reverse().map(cycle => <div className="pattern-row" key={cycle.item.id}><span><b>#{cycle.number}</b><small>{clock(cycle.item.start, language)}</small></span><strong>{cycle.frequency ? duration(cycle.frequency) : '—'}</strong><strong className="duration-value">{duration(cycle.duration)}</strong></div>)}</div>
        {undo && <button className="undo table-undo" onClick={undoLast}>↶ {t.undo}</button>}
        {trend && <div className={`trend ${trend.replace(' ', '-')}`}>{trend === 'mais frequentes' ? t.moreFrequent : trend === 'mais espaçadas' ? t.moreSpaced : t.stable}</div>}
      </section>
      <section className="card chart-card"><div className="section-title"><span>{t.frequency}</span><small>{t.startToStart}</small></div><IntervalChart values={frequencies.slice(-8).filter(Boolean)} t={t} /></section>
      <section className="history"><div className="section-title"><span>{t.history}</span><small>{completed.length} {t.records}</small></div>
        <div className="records">{[...completed].reverse().map((x, reversed) => { const i = completed.length - 1 - reversed; return <article className="record" key={x.id}>
          <div className="number">{i + 1}</div><div className="times"><b>{clock(x.start, language)} <em>—</em> {clock(x.end, language)}</b><span>{t.duration} {duration(new Date(x.end)-new Date(x.start))}</span></div><div className="interval">{i ? <><b>{duration(frequencies[i])}</b><span>{t.frequency.toLowerCase()}</span></> : <span>{t.first}</span>}</div>
          <button onClick={() => { setEditError(''); setEditing(x); }} aria-label={t.edit}>✎</button><button onClick={() => remove(x)} aria-label={t.delete}>×</button>
        </article>})}</div>
      </section>
    </>}
    <footer>{t.savedHere}</footer>
    {editing && <div className="overlay"><form className="modal" onSubmit={saveEdit}><div><p className="eyebrow">{t.editRecord}</p><h2>{t.adjust}</h2></div><label>{t.beginning}<input type="datetime-local" name="start" required defaultValue={datetimeValue(editing.start)} onChange={() => setEditError('')} /></label><label>{t.end}<input type="datetime-local" name="end" required defaultValue={datetimeValue(editing.end)} onChange={() => setEditError('')} /></label>{editError && <p className="form-error" role="alert">{editError}</p>}<div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>{t.cancel}</button><button className="save" type="submit">{t.save}</button></div></form></div>}
  </main>;
}

function Logo() {
  return <svg className="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 16c3.2-8.5 6.4-8.5 9.6 0s6.4 8.5 12.4 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><circle cx="5" cy="16" r="2" fill="currentColor"/><circle cx="27" cy="16" r="2" fill="currentColor"/></svg>;
}

function IntervalChart({ values, t }) {
  if (!values.length) return <p className="muted">{t.graphEmpty}</p>;
  const max = Math.max(...values), min = Math.min(...values), width = 300, height = 75;
  const points = values.map((v,i) => `${values.length === 1 ? 150 : i * width/(values.length-1)},${height - 8 - ((v-min)/(max-min || 1)) * (height-20)}`).join(' ');
  return <><svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label={t.frequency}><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#ff715d" stopOpacity=".35"/><stop offset="1" stopColor="#ff715d" stopOpacity="0"/></linearGradient></defs><path d={`M 0 ${height} L ${points.replaceAll(' ', ' L ')} L ${width} ${height} Z`} fill="url(#fill)"/><polyline points={points} fill="none" stroke="#ff715d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.split(' ').map((p,i) => <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="3" fill="#fff1eb" stroke="#ff715d" strokeWidth="2"/>)}</svg><div className="chart-labels"><span>{t.previous}</span><span>{t.now}</span></div></>;
}
createRoot(document.getElementById('root')).render(<App />);
