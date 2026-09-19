/* Stratum Field Lab - state, helpers, gamification, crossword generator. */
import { BADGES, COHORT, KB, MENTOR_FALLBACK, QUESTIONS, CROSSWORD_WORDS } from './data.js';

/* --------------------------------------------------------- tiny DOM kit */
export function h(tag, props, ...kids){
  const parts = tag.split(/(?=[.#])/);
  const el = document.createElement(parts[0] || 'div');
  for (const p of parts.slice(1)){
    if (p[0] === '.') el.classList.add(p.slice(1));
    else el.id = p.slice(1);
  }
  const isProps = props !== null && props !== undefined
    && typeof props === 'object' && !props.nodeType && !Array.isArray(props);
  if (!isProps){
    if (props !== null && props !== undefined && props !== false) kids.unshift(props);
    props = null;
  }
  for (const k in (props || {})){
    const v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids){
  for (const k of kids){
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
export const $ = (s, r = document) => r.querySelector(s);

/* ------------------------------------------------------------- SVG icons */
const P = {
  dash:   'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  quiz:   'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  grid:   'M3 3h18v18H3V3Zm0 6h18M3 15h18M9 3v18M15 3v18',
  cards:  'M4 7h11v13H4V7Zm5-3h11v13',
  book:   'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z',
  shelf:  'M3 21V7l9-4 9 4v14M3 21h18M9 21v-6h6v6',
  bot:    'M12 2v3M5 8h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm3 4v2m8-2v2M9 16h6',
  chat:   'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 21 11.5Z',
  case:   'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  chart:  'M3 3v18h18M7 15l4-5 3 3 5-7',
  crown:  'M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z',
  flame:  'M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10-3 1-6 4-6 8 0-1-1-2-2-3-1 2-2 4-2 5a7 7 0 0 0 7 7Z',
  bolt:   'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  star:   'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z',
  flask:  'M9 2v6.5L3.6 18a2 2 0 0 0 1.7 3h13.4a2 2 0 0 0 1.7-3L15 8.5V2M8 2h8M7.5 14h9',
  lock:   'M6 10V7a6 6 0 1 1 12 0v3M5 10h14v11H5V10Z',
  check:  'M20 6 9 17l-5-5',
  x:      'M18 6 6 18M6 6l12 12',
  sun:    'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon:   'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  clock:  'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  send:   'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  mic:    'M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v4',
  down:   'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
  users:  'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm13 18v-2a4 4 0 0 0-3-3.9',
  gift:   'M20 12v9H4v-9M2 7h20v5H2V7Zm10 0v14M12 7S10.5 3 8 3a2.5 2.5 0 0 0 0 5m4-1s1.5-4 4-4a2.5 2.5 0 0 1 0 5',
  cal:    'M8 2v4m8-4v4M3 9h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  search: 'm21 21-4.3-4.3M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  hint:   'M9 21h6M10 17h4a5 5 0 1 0-4 0Z',
  reset:  'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  share:  'M4 12v8h16v-8M12 15V3m0 0 4 4m-4-4L8 7',
};
export function icon(name, cls = 'ico'){
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', cls);
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', P[name] || P.dash);
  svg.append(p);
  return svg;
}

/* ------------------------------------------------------------------ state */
const KEY = 'stratum.v1';
const today = () => new Date().toISOString().slice(0, 10);

const FRESH = {
  name:'Field Learner', tier:'free', xp:0, coins:30,
  streak:0, best:0, lastDay:null, days:[],            // days: ['2026-09-18', ...]
  answered:{},                                         // qid -> {ok, at}
  topicStats:{ geology:{n:0,ok:0}, earth:{n:0,ok:0}, gis:{n:0,ok:0} },
  history:[],                                          // {d, xp, correct, total}
  cards:{},                                            // term -> {box, due}
  cardsReviewed:0,
  read:[], saved:[], offline:[], ratings:{},
  badges:[], xwDone:[], threads:null, referral:null,
  bookings:[], theme:null, onboarded:false,
};

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...structuredClone(FRESH), ...JSON.parse(raw) };
  }catch(e){ /* private mode or blocked storage: run in memory */ }
  return structuredClone(FRESH);
}
export const S = load();

let saveTimer = null;
export function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ /* ignore */ }
  }, 120);
}
export function resetAll(){
  try{ localStorage.removeItem(KEY); }catch(e){}
  Object.assign(S, structuredClone(FRESH));
  save();
}

/* ------------------------------------------------------------ progression */
export const LEVEL_STEP = 250;
export const levelOf  = xp => Math.floor(xp / LEVEL_STEP) + 1;
export const intoLevel = xp => xp % LEVEL_STEP;
export const isPaid = () => S.tier !== 'free';

export function addXp(n, why){
  S.xp += n;
  const d = today();
  let row = S.history.find(r => r.d === d);
  if (!row){ row = { d, xp:0, correct:0, total:0 }; S.history.push(row); }
  row.xp += n;
  if (S.history.length > 60) S.history = S.history.slice(-60);
  save();
  if (why) toast(`+${n} XP · ${why}`);
  checkBadges();
}

export function touchStreak(){
  const d = today();
  if (S.lastDay === d) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  S.streak = (S.lastDay === y) ? S.streak + 1 : 1;
  S.best = Math.max(S.best, S.streak);
  S.lastDay = d;
  if (!S.days.includes(d)) S.days.push(d);
  if (S.days.length > 60) S.days = S.days.slice(-60);
  save();
  checkBadges();
}

export function recordAnswer(q, ok){
  S.answered[q.id] = { ok, at: Date.now() };
  const t = S.topicStats[q.topic] || (S.topicStats[q.topic] = { n:0, ok:0 });
  t.n++; if (ok) t.ok++;
  const d = today();
  let row = S.history.find(r => r.d === d);
  if (!row){ row = { d, xp:0, correct:0, total:0 }; S.history.push(row); }
  row.total++; if (ok) row.correct++;
  save();
}

export function accuracy(topic){
  const t = topic ? S.topicStats[topic]
                  : Object.values(S.topicStats).reduce((a, b) => ({ n:a.n + b.n, ok:a.ok + b.ok }), { n:0, ok:0 });
  return t.n ? Math.round(t.ok / t.n * 100) : null;
}

export function weakestTopic(){
  const rows = Object.entries(S.topicStats)
    .filter(([, v]) => v.n >= 3)
    .map(([k, v]) => [k, v.ok / v.n]);
  if (!rows.length) return null;
  rows.sort((a, b) => a[1] - b[1]);
  return rows[0][0];
}

/* Adaptive level: rolling accuracy over the last 6 answers of this topic. */
export function adaptiveLevel(topic){
  const recent = QUESTIONS
    .filter(q => q.topic === topic && S.answered[q.id])
    .sort((a, b) => S.answered[b.id].at - S.answered[a.id].at)
    .slice(0, 6);
  if (recent.length < 3) return 'beginner';
  const acc = recent.filter(q => S.answered[q.id].ok).length / recent.length;
  return acc >= 0.8 ? 'advanced' : acc >= 0.55 ? 'intermediate' : 'beginner';
}

/* ----------------------------------------------------------------- badges */
export function checkBadges(){
  const got = new Set(S.badges);
  const test = {
    first_quiz: () => Object.keys(S.answered).length >= 5,
    streak3:    () => S.streak >= 3,
    streak7:    () => S.streak >= 7,
    perfect:    () => S.perfectRun === true,
    crossword:  () => S.xwDone.length >= 1,
    cards25:    () => S.cardsReviewed >= 25,
    reader:     () => S.read.length >= 3,
    xp1000:     () => S.xp >= 1000,
  };
  for (const b of BADGES){
    if (!got.has(b.id) && test[b.id] && test[b.id]()){
      S.badges.push(b.id);
      toast(`Badge unlocked · ${b.name}`);
    }
  }
  save();
}

/* ------------------------------------------------------------ leaderboard */
export function leaderboard(){
  const rows = COHORT.map(c => ({ ...c, me:false }));
  rows.push({ name: S.name, xp: S.xp, me:true });
  rows.sort((a, b) => b.xp - a.xp);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/* --------------------------------------------------------------- teardown */
/* Views register cleanup here; the router runs it before swapping pages.
   A DOM event cannot do this job because it never reaches descendants. */
const teardowns = [];
export function onTeardown(fn){ teardowns.push(fn); }
export function runTeardowns(){
  while (teardowns.length){ try{ teardowns.pop()(); }catch(e){ /* keep unwinding */ } }
}

/* ------------------------------------------------------------------ toast */
export function toast(msg, ico = 'check'){
  const box = $('#toasts'); if (!box) return;
  const t = h('div.toast', icon(ico, 'ico'), h('span', msg));
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0';
    setTimeout(() => t.remove(), 320); }, 2400);
}

/* ------------------------------------------------------------------ modal */
export function modal(build, { wide = false } = {}){
  const box = h('div.modal' + (wide ? '.wide' : ''));
  const scrim = h('div#scrim', { onclick: e => { if (e.target === scrim) close(); } }, box);
  function close(){ scrim.remove(); document.removeEventListener('keydown', esc); }
  function esc(e){ if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', esc);
  build(box, close);
  document.body.append(scrim);
  const f = box.querySelector('button, input, a, select, textarea');
  if (f) f.focus();
  return close;
}

/* ------------------------------------------------------- paywall / upsell */
export function requirePaid(what, onDone){
  if (isPaid()) { onDone && onDone(); return true; }
  modal((box, close) => {
    box.append(
      h('div.eyebrow', 'Premium feature'),
      h('h2', { style:{ marginTop:'6px', fontSize:'21px' } }, what),
      h('p', { style:{ color:'var(--ink-2)', marginTop:'8px' } },
        'This is part of the Pro tier. Everything on the Free tier stays free — quizzes up to intermediate, the daily crossword, the full glossary and three articles.'),
      h('div', { style:{ display:'flex', gap:'8px', marginTop:'18px', flexWrap:'wrap' } },
        h('button.btn.btn-primary', { onclick: () => { close(); location.hash = '#/plans'; } }, 'See plans'),
        h('button.btn', { onclick: () => {
          S.tier = 'pro'; save(); close();
          toast('Pro trial active · demo mode'); window.dispatchEvent(new Event('stratum:render'));
          onDone && onDone();
        } }, 'Start demo trial'),
        h('button.btn.btn-ghost', { onclick: close }, 'Not now')),
      h('p.eyebrow', { style:{ marginTop:'14px' } },
        'Demo build · no payment is taken and nothing leaves this browser'));
  });
  return false;
}

/* --------------------------------------------------------- mentor (local) */
const STOP = new Set(['the','a','an','is','are','what','how','do','i','me','my','to','of','in','on','for','and','you','it','that','this','with','can','should','be','about','tell','explain','why']);
export function mentorReply(text){
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
  let best = null, bestScore = 0;
  for (const entry of KB){
    let score = 0;
    for (const key of entry.k){
      if (text.toLowerCase().includes(key)) score += key.includes(' ') ? 3 : 2;
      for (const w of words) if (key.includes(w) || w.includes(key)) score += 1;
    }
    if (score > bestScore){ bestScore = score; best = entry; }
  }
  if (!best || bestScore < 2) return MENTOR_FALLBACK;
  let out = best.a;
  const weak = weakestTopic();
  if (weak && /study|next|weak|practice|plan/.test(text.toLowerCase())){
    const acc = accuracy(weak);
    out += `\n\nFrom your own record: ${weak} is your weakest topic at ${acc}% accuracy. That is where the next three sessions should go.`;
  }
  return out;
}

/* ------------------------------------------------------- crossword engine */
/* Deterministic per-day puzzle: seeded shuffle, then greedy crossing fill. */
function mulberry(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function daySeed(offset = 0){
  const d = new Date(Date.now() - offset * 864e5);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

const SIZE = 15;
export function buildCrossword(seed, maxWords = 11){
  const rnd = mulberry(seed);
  const pool = CROSSWORD_WORDS.slice();
  for (let i = pool.length - 1; i > 0; i--){                 // seeded shuffle
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.sort((a, b) => b.w.length - a.w.length);

  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const placed = [];
  const at = (r, c) => (r < 0 || c < 0 || r >= SIZE || c >= SIZE) ? undefined : g[r][c];

  function fits(word, r, c, horiz){
    let crossings = 0;
    const dr = horiz ? 0 : 1, dc = horiz ? 1 : 0;
    if (at(r - dr, c - dc) != null) return -1;                // must start clean
    if (at(r + dr * word.length, c + dc * word.length) != null) return -1;
    for (let i = 0; i < word.length; i++){
      const rr = r + dr * i, cc = c + dc * i;
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) return -1;
      const cur = g[rr][cc];
      if (cur != null){
        if (cur !== word[i]) return -1;
        crossings++;
      } else {
        // an empty cell must not touch letters on the perpendicular sides
        if (horiz){ if (at(rr - 1, cc) != null || at(rr + 1, cc) != null) return -1; }
        else      { if (at(rr, cc - 1) != null || at(rr, cc + 1) != null) return -1; }
      }
    }
    return crossings;
  }
  function put(item, r, c, horiz){
    for (let i = 0; i < item.w.length; i++) g[r + (horiz ? 0 : i)][c + (horiz ? i : 0)] = item.w[i];
    placed.push({ ...item, r, c, horiz });
  }

  const first = pool.shift();
  put(first, Math.floor(SIZE / 2), Math.floor((SIZE - first.w.length) / 2), true);

  for (const item of pool){
    if (placed.length >= maxWords) break;
    let best = null;
    for (const p of placed){
      const horiz = !p.horiz;
      for (let i = 0; i < p.w.length; i++){
        const pr = p.r + (p.horiz ? 0 : i), pc = p.c + (p.horiz ? i : 0);
        for (let j = 0; j < item.w.length; j++){
          if (item.w[j] !== p.w[i]) continue;
          const r = horiz ? pr : pr - j, c = horiz ? pc - j : pc;
          const score = fits(item.w, r, c, horiz);
          if (score > 0 && (!best || score > best.score)) best = { r, c, horiz, score };
        }
      }
    }
    if (best) put(item, best.r, best.c, best.horiz);
  }

  // crop to bounding box
  let r0 = SIZE, c0 = SIZE, r1 = -1, c1 = -1;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
    if (g[r][c]){ r0 = Math.min(r0, r); c0 = Math.min(c0, c); r1 = Math.max(r1, r); c1 = Math.max(c1, c); }
  const rows = r1 - r0 + 1, cols = c1 - c0 + 1;
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => g[r + r0][c + c0]));
  const entries = placed.map(p => ({ ...p, r: p.r - r0, c: p.c - c0 }));

  // number the cells, crossword convention
  const numAt = {}; let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
    if (!grid[r][c]) continue;
    const startsAcross = grid[r][c] && (c === 0 || !grid[r][c - 1]) && grid[r][c + 1];
    const startsDown   = grid[r][c] && (r === 0 || !grid[r - 1][c]) && grid[r + 1] && grid[r + 1][c];
    if (startsAcross || startsDown) numAt[`${r},${c}`] = ++n;
  }
  for (const e of entries) e.num = numAt[`${e.r},${e.c}`];
  entries.sort((a, b) => a.num - b.num);
  return { grid, rows, cols, entries };
}
