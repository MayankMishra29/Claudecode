/* Stratum Field Lab - all screens. */
import {
  TOPICS, LEVELS, QUESTIONS, GLOSSARY, ARTICLES, RESOURCES, JOBS,
  BADGES, PLANS, COHORT, MENTOR_PROMPTS,
} from './data.js';
import {
  h, $, icon, S, save, toast, modal, addXp, touchStreak, recordAnswer, accuracy,
  weakestTopic, adaptiveLevel, levelOf, intoLevel, LEVEL_STEP, isPaid, requirePaid,
  leaderboard, mentorReply, buildCrossword, daySeed, checkBadges, resetAll,
} from './core.js';

const rerender = () => window.dispatchEvent(new Event('stratum:render'));
const SERIES = { geology:'var(--c-geology)', earth:'var(--c-earth)', gis:'var(--c-gis)' };

/* ------------------------------------------------------------ shared bits */
export function topicTag(t){
  return h('span.tag.tag-topic.tag-' + t, TOPICS[t].label);
}
function levelTag(l){ return h('span.tag.tag-' + l, l); }

function lockedCard(title, note){
  return h('div.card', { style:{ position:'relative', minHeight:'140px' } },
    h('div.locked', { style:{ position:'absolute', inset:0 } }),
    h('div.locknote',
      icon('lock', 'ico'),
      h('strong', title),
      h('p', { style:{ fontSize:'13px', color:'var(--ink-2)', maxWidth:'34ch' } }, note),
      h('button.btn.btn-sm.btn-primary', { onclick: () => requirePaid(title) }, 'Unlock')));
}

function adSlot(){
  if (isPaid()) return null;
  return h('div.adslot',
    h('span.eyebrow', 'Sponsored'),
    h('div', { style:{ flex:'1', minWidth:'0' } },
      h('div', { style:{ fontWeight:'600', fontSize:'13.5px' } }, 'QGIS 3 for Earth Scientists — free 40-page field guide'),
      h('div', { style:{ fontSize:'12.5px', color:'var(--ink-2)' } }, 'Ad placement shown to Free tier only. Pro and above are ad-free.')),
    h('button.btn.btn-sm', { onclick: () => requirePaid('Ad-free reading') }, 'Remove ads'));
}

function sectionHead(title, ...right){
  return h('div.shead', h('h2', title), right.length ? h('div.sp', right) : null);
}

/* ---------------------------------------------------------------- charts */
/* Single-series magnitude over time. One hue, recessive grid, hover layer. */
function activityChart(days = 14){
  const W = 640, H = 170, padL = 34, padR = 10, padT = 12, padB = 26;
  const rows = [];
  for (let i = days - 1; i >= 0; i--){
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const rec = S.history.find(r => r.d === d);
    rows.push({ d, xp: rec ? rec.xp : 0 });
  }
  const max = Math.max(40, ...rows.map(r => r.xp));
  const niceMax = Math.ceil(max / 20) * 20;
  const iw = W - padL - padR, ih = H - padT - padB;
  const bw = iw / rows.length;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'chart');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `XP earned per day over the last ${days} days`);
  const ns = 'http://www.w3.org/2000/svg';
  const mk = (t, a) => { const e = document.createElementNS(ns, t);
    for (const k in a) e.setAttribute(k, a[k]); return e; };

  for (let g = 0; g <= 2; g++){
    const y = padT + ih - (ih * g / 2);
    svg.append(mk('line', { class:'gridline', x1:padL, x2:W - padR, y1:y, y2:y }));
    const lab = mk('text', { x:padL - 6, y:y + 3, 'text-anchor':'end' });
    lab.textContent = Math.round(niceMax * g / 2); svg.append(lab);
  }
  const tip = h('div.charttip');
  rows.forEach((r, i) => {
    const bh = niceMax ? (r.xp / niceMax) * ih : 0;
    const x = padL + i * bw + 2;
    const w = Math.max(3, bw - 4);                       // 2px surface gap each side
    if (bh > 0){
      svg.append(mk('rect', { x, y: padT + ih - bh, width:w, height:bh,
        rx:Math.min(4, w / 2), fill:'var(--azurite)' }));
    }
    const hit = mk('rect', { class:'hit', x:padL + i * bw, y:padT, width:bw, height:ih });
    hit.addEventListener('pointerenter', () => {
      tip.textContent = `${r.d.slice(5)} · ${r.xp} XP`;
      tip.style.left = ((padL + i * bw + bw / 2) / W * 100) + '%';
      tip.style.top  = ((padT + ih - bh) / H * 100) + '%';
      tip.style.opacity = '1';
    });
    hit.addEventListener('pointerleave', () => { tip.style.opacity = '0'; });
    svg.append(hit);
    if (i === 0 || i === rows.length - 1 || i === Math.floor(rows.length / 2)){
      const t = mk('text', { x:padL + i * bw + bw / 2, y:H - 8, 'text-anchor':'middle' });
      t.textContent = r.d.slice(5); svg.append(t);
    }
  });
  return h('div.chartbox', svg, tip);
}

/* Categorical identity: three topics, validated series hues, direct-labelled. */
function topicChart(){
  const rows = Object.keys(TOPICS).map(k => {
    const st = S.topicStats[k] || { n:0, ok:0 };
    return { k, label:TOPICS[k].label, n:st.n, pct: st.n ? Math.round(st.ok / st.n * 100) : 0 };
  });
  if (!rows.some(r => r.n)) return h('div.empty', 'Answer a few questions and your accuracy by topic appears here.');
  return h('div.stack', { style:{ gap:'12px' } },
    rows.map(r => h('div',
      h('div.row', { style:{ justifyContent:'space-between', marginBottom:'5px', gap:'10px' } },
        h('div.row', { style:{ gap:'7px' } },
          h('span', { style:{ width:'9px', height:'9px', borderRadius:'2px', background:SERIES[r.k] } }),
          h('span', { style:{ fontSize:'13.5px', fontWeight:'500' } }, r.label)),
        h('span.num', { style:{ fontSize:'13px', color:'var(--ink-2)' } },
          r.n ? `${r.pct}%` : '—',
          h('span', { style:{ color:'var(--ink-3)', fontWeight:'400' } }, `  ${r.n}q`))),
      h('div.bar', h('i', { style:{ width:r.pct + '%', background:SERIES[r.k] } })))));
}

/* ------------------------------------------------------------- DASHBOARD */
export function dashboard(){
  const lvl = levelOf(S.xp), into = intoLevel(S.xp);
  const acc = accuracy();
  const weak = weakestTopic();
  const done = Object.keys(S.answered).length;
  const rank = leaderboard().find(r => r.me).rank;

  const wrap = h('div');

  wrap.append(
    h('div.grid.g4', { style:{ marginBottom:'18px' } },
      h('div.card.stat',
        h('span.l', 'Level'), h('span.v', lvl),
        h('div.bar', { style:{ marginTop:'6px' } }, h('i', { style:{ width:(into / LEVEL_STEP * 100) + '%' } })),
        h('span.d', `${LEVEL_STEP - into} XP to level ${lvl + 1}`)),
      h('div.card.stat',
        h('span.l', 'Streak'),
        h('span.v', { style:{ color:'var(--limonite)' } }, S.streak, h('span', { style:{ fontSize:'15px' } }, ' d')),
        h('span.d', S.best ? `Best run ${S.best} days` : 'Answer one question to start')),
      h('div.card.stat',
        h('span.l', 'Accuracy'),
        h('span.v', acc === null ? '—' : acc + '%'),
        h('span.d', `${done} question${done === 1 ? '' : 's'} answered`)),
      h('div.card.stat',
        h('span.l', 'Cohort rank'),
        h('span.v', '#' + rank),
        h('span.d', `of ${COHORT.length + 1} learners`))));

  // next best action
  const nextTopic = weak || 'geology';
  wrap.append(
    h('div.card.lift', { style:{ marginBottom:'18px', borderLeft:'3px solid var(--azurite)' } },
      h('div.eyebrow', weak ? 'Recommended · based on your weakest topic' : 'Recommended · start here'),
      h('h3', { style:{ fontSize:'18px', margin:'6px 0 4px' } },
        weak ? `Drill ${TOPICS[weak].label} — your accuracy there is ${accuracy(weak)}%`
             : 'Take a five-question diagnostic'),
      h('p', { style:{ color:'var(--ink-2)', fontSize:'14px', maxWidth:'62ch' } },
        weak ? 'The adaptive engine will pitch questions at the level your recent answers support, then re-test.'
             : 'It sets your starting difficulty and tells the recommendation engine where to point you.'),
      h('div.row', { style:{ gap:'8px', marginTop:'12px', flexWrap:'wrap' } },
        h('button.btn.btn-primary', { onclick: () => { location.hash = '#/quiz/' + nextTopic; } },
          icon('quiz'), weak ? 'Start drill' : 'Start diagnostic'),
        h('button.btn', { onclick: () => { location.hash = '#/crossword'; } }, icon('grid'), 'Daily crossword'),
        h('button.btn.btn-ghost', { onclick: () => { location.hash = '#/mentor'; } }, icon('bot'), 'Ask the mentor'))));

  wrap.append(adSlot());

  wrap.append(
    sectionHead('Activity'),
    h('div.grid', { style:{ gridTemplateColumns:'minmax(0,1.5fr) minmax(0,1fr)' }, class:'dash-split' },
      h('div.card',
        h('div.eyebrow', { style:{ marginBottom:'8px' } }, 'XP per day · last 14 days'),
        activityChart()),
      h('div.card',
        h('div.eyebrow', { style:{ marginBottom:'12px' } }, 'Accuracy by topic'),
        topicChart())));

  // badges
  wrap.append(sectionHead('Badges',
    h('span.eyebrow', `${S.badges.length} of ${BADGES.length} earned`)));
  wrap.append(h('div.grid.g4',
    BADGES.map(b => {
      const got = S.badges.includes(b.id);
      return h('div.card', { style:{ opacity: got ? '1' : '.55', display:'flex', gap:'11px',
        alignItems:'center', padding:'12px 13px' } },
        h('div', { style:{ flex:'0 0 34px', width:'34px', height:'34px', borderRadius:'8px',
          display:'grid', placeItems:'center',
          background: got ? 'var(--azurite-wash)' : 'var(--surface-2)',
          color: got ? 'var(--azurite)' : 'var(--ink-3)' } }, icon(got ? b.icon : 'lock')),
        h('div', { style:{ minWidth:'0' } },
          h('div', { style:{ fontWeight:'600', fontSize:'13.5px' } }, b.name),
          h('div', { style:{ fontSize:'12px', color:'var(--ink-3)' } }, b.why)));
    })));

  return wrap;
}

/* ------------------------------------------------------------------ QUIZ */
export function quizHome(){
  const wrap = h('div');
  wrap.append(h('p.page-intro',
    'Pick a topic. The adaptive engine reads your recent accuracy and sets the difficulty, so the questions track your level instead of a fixed syllabus.'));
  wrap.append(h('div.grid.g3',
    Object.values(TOPICS).map(t => {
      const lvl = adaptiveLevel(t.id);
      const st = S.topicStats[t.id] || { n:0, ok:0 };
      const pool = QUESTIONS.filter(q => q.topic === t.id);
      const free = pool.filter(q => !q.premium).length;
      return h('div.card.lift', { style:{ display:'flex', flexDirection:'column', gap:'9px',
        borderTop:`3px solid ${SERIES[t.id]}` } },
        h('div.row', { style:{ justifyContent:'space-between' } }, topicTag(t.id), levelTag(lvl)),
        h('h3', { style:{ fontSize:'17px' } }, t.label),
        h('p', { style:{ fontSize:'13px', color:'var(--ink-2)' } },
          `${pool.length} questions · ${free} free, ${pool.length - free} premium`),
        h('div.bar', h('i', { style:{ width:(st.n ? st.ok / st.n * 100 : 0) + '%', background:SERIES[t.id] } })),
        h('div', { style:{ fontSize:'12px', color:'var(--ink-3)' } },
          st.n ? `${st.ok}/${st.n} correct so far` : 'Not started'),
        h('div.row', { style:{ gap:'7px', marginTop:'auto', paddingTop:'8px', flexWrap:'wrap' } },
          h('button.btn.btn-sm.btn-primary', { onclick: () => { location.hash = `#/quiz/${t.id}`; } }, 'Practice'),
          h('button.btn.btn-sm', { onclick: () => {
            if (requirePaid('Timed practice sessions')) location.hash = `#/quiz/${t.id}/timed`;
          } }, icon('clock'), 'Timed')));
    })));
  wrap.append(adSlot());
  wrap.append(sectionHead('Leaderboard', h('span.eyebrow', 'sample cohort + your real score')));
  wrap.append(leaderboardTable());
  return wrap;
}

function leaderboardTable(){
  const rows = leaderboard();
  return h('div.tablewrap',
    h('table',
      h('thead', h('tr', h('th', '#'), h('th', 'Learner'), h('th', 'XP'), h('th', 'Level'))),
      h('tbody', rows.map(r => h('tr', { class: r.me ? 'me' : '' },
        h('td.num', r.rank), h('td', r.me ? r.name + ' (you)' : r.name),
        h('td.num', r.xp.toLocaleString()), h('td.num', levelOf(r.xp)))))));
}

/* live quiz session */
export function quizRun(topic, mode){
  const timed = mode === 'timed';
  const lvl = adaptiveLevel(topic);
  const order = { beginner:0, intermediate:1, advanced:2 };
  let pool = QUESTIONS.filter(q => q.topic === topic && Math.abs(order[q.level] - order[lvl]) <= 1);
  if (!isPaid()) pool = pool.filter(q => !q.premium);
  if (!pool.length) pool = QUESTIONS.filter(q => q.topic === topic && !q.premium);
  // prefer unseen questions first
  pool = [...pool.filter(q => !S.answered[q.id]), ...pool.filter(q => S.answered[q.id])];
  const set = pool.slice(0, Math.min(6, pool.length));

  let i = 0, correct = 0, locked = false, left = timed ? 30 : 0, timer = null;
  const wrap = h('div.qwrap');
  const meter = h('div.qmeter', set.map(() => h('i')));
  const head = h('div');
  const body = h('div', { style:{ display:'flex', flexDirection:'column', gap:'9px', marginTop:'16px' } });
  const foot = h('div', { style:{ marginTop:'16px' } });
  wrap.append(head, meter, body, foot);

  function paintMeter(){
    [...meter.children].forEach((el, n) => {
      el.className = n < i ? (set[n]._ok ? 'ok' : 'no') : n === i ? 'now' : '';
    });
  }
  function stopTimer(){ clearInterval(timer); timer = null; }

  function renderQ(){
    const q = set[i];
    head.replaceChildren(
      h('div.row', { style:{ justifyContent:'space-between', gap:'10px', marginBottom:'10px', flexWrap:'wrap' } },
        h('div.row', { style:{ gap:'7px', flexWrap:'wrap' } }, topicTag(topic), levelTag(q.level),
          q.premium ? h('span.tag.tag-lock', 'premium') : null),
        h('div.row', { style:{ gap:'10px' } },
          timed ? h('span.chip.flame', { id:'qtimer' }, icon('clock'), h('span', left + 's')) : null,
          h('span.eyebrow', `${i + 1} of ${set.length}`))),
      h('h2', { style:{ fontSize:'21px', lineHeight:'1.3' } }, q.q));
    paintMeter();
    body.replaceChildren(...q.choices.map((c, n) =>
      h('button.choice', { onclick: () => pick(n) },
        h('span.k', 'ABCD'[n]), h('span', c))));
    foot.replaceChildren();
    if (timed){
      left = 30;
      stopTimer();
      timer = setInterval(() => {
        left--;
        const t = $('#qtimer'); if (t) t.lastChild.textContent = left + 's';
        if (left <= 0) pick(-1);
      }, 1000);
    }
  }

  function pick(n){
    if (locked) return;
    locked = true; stopTimer();
    const q = set[i];
    const ok = n === q.answer;
    q._ok = ok;
    if (ok) correct++;
    recordAnswer(q, ok);
    touchStreak();
    [...body.children].forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.answer) btn.classList.add('correct');
      else if (idx === n) btn.classList.add('wrong');
    });
    paintMeter();
    addXp(ok ? (timed ? 15 : 10) : 2, ok ? 'correct' : 'attempted');
    foot.replaceChildren(
      h('div.explain', h('strong', ok ? 'Correct. ' : (n === -1 ? 'Out of time. ' : 'Not quite. ')), q.why),
      h('div.row', { style:{ marginTop:'12px', gap:'8px' } },
        h('button.btn.btn-primary', { onclick: next }, i + 1 < set.length ? 'Next question' : 'See result')));
    foot.querySelector('button').focus();
  }

  function next(){
    i++; locked = false;
    if (i < set.length) renderQ(); else finish();
  }

  function finish(){
    stopTimer();
    const pct = Math.round(correct / set.length * 100);
    if (pct === 100){ S.perfectRun = true; checkBadges(); }
    const bonus = pct === 100 ? 40 : pct >= 70 ? 20 : 0;
    if (bonus) addXp(bonus, pct === 100 ? 'clean sweep' : 'strong round');
    head.replaceChildren();
    meter.replaceChildren();
    body.replaceChildren(
      h('div.card.lift', { style:{ textAlign:'center', padding:'28px' } },
        h('div.eyebrow', 'Round complete'),
        h('div.num', { style:{ fontSize:'46px', margin:'8px 0 2px' } }, pct + '%'),
        h('p', { style:{ color:'var(--ink-2)' } }, `${correct} of ${set.length} correct`),
        bonus ? h('p', { style:{ color:'var(--malachite)', fontWeight:'600', marginTop:'6px' } }, `+${bonus} XP bonus`) : null,
        h('p', { style:{ color:'var(--ink-2)', fontSize:'13.5px', marginTop:'12px', maxWidth:'46ch', marginInline:'auto' } },
          `Your ${TOPICS[topic].label} level is now set to ${adaptiveLevel(topic)}. The next round will match it.`),
        h('div.row', { style:{ gap:'8px', marginTop:'18px', justifyContent:'center', flexWrap:'wrap' } },
          h('button.btn.btn-primary', { onclick: () => { location.hash = '#/quiz'; setTimeout(() => { location.hash = `#/quiz/${topic}` + (timed ? '/timed' : ''); }, 10); } }, 'Another round'),
          h('button.btn', { onclick: () => { location.hash = '#/quiz'; } }, 'Back to topics'),
          h('button.btn.btn-ghost', { onclick: () => {
            navigator.clipboard?.writeText(`I scored ${pct}% on a ${TOPICS[topic].label} round in Stratum Field Lab.`)
              .then(() => toast('Result copied to clipboard'), () => toast('Copy not available'));
          } }, icon('share'), 'Share'))));
    foot.replaceChildren();
  }

  if (!set.length){
    wrap.replaceChildren(h('div.empty', 'No questions available for this topic yet.'));
    return wrap;
  }
  renderQ();
  wrap.addEventListener('stratum:teardown', stopTimer);
  return wrap;
}

/* ------------------------------------------------------------- CROSSWORD */
export function crossword(){
  const seed = daySeed();
  const key = 'xw-' + seed;
  const puz = buildCrossword(seed);
  const wrap = h('div');
  const solvedToday = S.xwDone.includes(key);

  const letters = Array.from({ length: puz.rows }, () => Array(puz.cols).fill(''));
  const inputs  = Array.from({ length: puz.rows }, () => Array(puz.cols).fill(null));
  let active = puz.entries[0];

  const gridEl = h('div.xw-grid', { style:{
    gridTemplateColumns:`repeat(${puz.cols}, minmax(0, 30px))` } });

  const numAt = {};
  for (const e of puz.entries) numAt[`${e.r},${e.c}`] = e.num;

  for (let r = 0; r < puz.rows; r++){
    for (let c = 0; c < puz.cols; c++){
      if (!puz.grid[r][c]){ gridEl.append(h('div.xw-cell.block')); continue; }
      const inp = h('input', { type:'text', maxlength:'1', 'aria-label':`row ${r + 1} column ${c + 1}`,
        autocomplete:'off', autocapitalize:'characters', spellcheck:'false' });
      const cell = h('div.xw-cell', numAt[`${r},${c}`] ? h('span.n', numAt[`${r},${c}`]) : null, inp);
      inputs[r][c] = inp;
      inp.addEventListener('focus', () => {
        const hit = puz.entries.find(e => covers(e, r, c) && e === active)
                 || puz.entries.find(e => covers(e, r, c));
        if (hit){ active = hit; paint(); }
      });
      inp.addEventListener('input', () => {
        const v = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
        inp.value = v; letters[r][c] = v;
        if (v) step(r, c, 1);
        checkSolved();
      });
      inp.addEventListener('keydown', ev => {
        const k = ev.key;
        if (k === 'Backspace' && !inp.value){ ev.preventDefault(); step(r, c, -1); }
        else if (k === 'ArrowRight'){ ev.preventDefault(); move(r, c + 1); }
        else if (k === 'ArrowLeft'){ ev.preventDefault(); move(r, c - 1); }
        else if (k === 'ArrowDown'){ ev.preventDefault(); move(r + 1, c); }
        else if (k === 'ArrowUp'){ ev.preventDefault(); move(r - 1, c); }
      });
      gridEl.append(cell);
    }
  }
  const covers = (e, r, c) => e.horiz
    ? (r === e.r && c >= e.c && c < e.c + e.w.length)
    : (c === e.c && r >= e.r && r < e.r + e.w.length);

  function move(r, c){
    if (r < 0 || c < 0 || r >= puz.rows || c >= puz.cols) return;
    if (inputs[r][c]) inputs[r][c].focus();
  }
  function step(r, c, dir){
    const dr = active.horiz ? 0 : dir, dc = active.horiz ? dir : 0;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nc >= 0 && nr < puz.rows && nc < puz.cols && inputs[nr][nc]) inputs[nr][nc].focus();
  }

  const clueBox = h('div.cluelist');
  function entryDone(e){
    for (let i = 0; i < e.w.length; i++){
      const r = e.r + (e.horiz ? 0 : i), c = e.c + (e.horiz ? i : 0);
      if (letters[r][c] !== e.w[i]) return false;
    }
    return true;
  }
  function paint(){
    for (let r = 0; r < puz.rows; r++){ for (let c = 0; c < puz.cols; c++){
      const cell = inputs[r][c]?.parentElement; if (!cell) continue;
      cell.classList.toggle('hl', covers(active, r, c));
    } }
    for (const e of puz.entries){
      const done = entryDone(e);
      for (let i = 0; i < e.w.length; i++){
        const r = e.r + (e.horiz ? 0 : i), c = e.c + (e.horiz ? i : 0);
        if (done) inputs[r][c].parentElement.classList.add('done');
      }
    }
    renderClues();
  }
  function renderClues(){
    const mk = horiz => h('div',
      h('div.eyebrow', { style:{ margin:'4px 0 6px' } }, horiz ? 'Across' : 'Down'),
      puz.entries.filter(e => e.horiz === horiz).map(e =>
        h('button.clue', {
          'aria-current': e === active ? 'true' : 'false',
          class: entryDone(e) ? 'solved' : '',
          onclick: () => { active = e; inputs[e.r][e.c].focus(); paint(); },
        }, h('span.cn', e.num), h('span', e.clue))));
    clueBox.replaceChildren(mk(true), mk(false));
  }

  let solvedFlag = solvedToday;
  function checkSolved(){
    const all = puz.entries.every(entryDone);
    paint();
    if (all && !solvedFlag){
      solvedFlag = true;
      if (!S.xwDone.includes(key)) S.xwDone.push(key);
      save(); touchStreak(); addXp(60, 'crossword solved'); checkBadges();
      status.replaceChildren(h('span', { style:{ color:'var(--malachite)', fontWeight:'600' } },
        'Solved. Come back tomorrow for a new grid.'));
    }
  }

  const status = h('div', { style:{ fontSize:'13px', color:'var(--ink-2)', minHeight:'20px' } },
    solvedToday ? 'You already solved today’s grid. Fill it again for practice, or come back tomorrow.' : '');

  function hint(){
    if (S.coins < 5){ toast('Not enough coins · earn them in quizzes'); return; }
    const e = active;
    for (let i = 0; i < e.w.length; i++){
      const r = e.r + (e.horiz ? 0 : i), c = e.c + (e.horiz ? i : 0);
      if (letters[r][c] !== e.w[i]){
        letters[r][c] = e.w[i]; inputs[r][c].value = e.w[i];
        S.coins -= 5; save(); coinChip.lastChild.textContent = S.coins;
        checkSolved(); return;
      }
    }
    toast('That clue is already complete');
  }
  function reveal(){
    if (!requirePaid('Reveal the full grid')) return;
    for (const e of puz.entries) for (let i = 0; i < e.w.length; i++){
      const r = e.r + (e.horiz ? 0 : i), c = e.c + (e.horiz ? i : 0);
      letters[r][c] = e.w[i]; inputs[r][c].value = e.w[i];
    }
    paint();
  }
  function clear(){
    for (let r = 0; r < puz.rows; r++) for (let c = 0; c < puz.cols; c++)
      if (inputs[r][c]){ letters[r][c] = ''; inputs[r][c].value = ''; inputs[r][c].parentElement.classList.remove('done'); }
    paint();
  }

  const coinChip = h('span.chip', icon('bolt'), h('span', S.coins));

  wrap.append(
    h('p.page-intro', 'A fresh grid every day, built from the same keyword bank you are studying. Solving it holds your streak and pays 60 XP.'),
    h('div.row', { style:{ gap:'8px', marginBottom:'14px', flexWrap:'wrap' } },
      h('button.btn.btn-sm', { onclick: hint }, icon('hint'), 'Hint (5 coins)'),
      h('button.btn.btn-sm', { onclick: clear }, icon('reset'), 'Clear'),
      h('button.btn.btn-sm', { onclick: reveal }, icon('lock'), 'Reveal all'),
      coinChip),
    status,
    h('div.xw-layout', { style:{ marginTop:'14px' } },
      h('div', { style:{ overflowX:'auto' } }, gridEl),
      h('div.card', { style:{ maxHeight:'62dvh', overflowY:'auto' } }, clueBox)));

  paint();
  return wrap;
}

/* --------------------------------------------- GLOSSARY + FLASHCARDS */
export function studyAids(){
  const wrap = h('div');
  let mode = S._aidMode || 'glossary';
  const body = h('div');

  const seg = h('div.seg',
    ...['glossary', 'flashcards'].map(m =>
      h('button', { 'aria-pressed': String(m === mode), onclick: () => {
        mode = m; S._aidMode = m;
        [...seg.children].forEach(b => b.setAttribute('aria-pressed', String(b.textContent.toLowerCase() === m)));
        paint();
      } }, m[0].toUpperCase() + m.slice(1))));

  function paint(){ body.replaceChildren(mode === 'glossary' ? glossaryView() : flashcards()); }

  wrap.append(
    h('p.page-intro', 'Forty working definitions across the three tracks. Flashcard mode schedules each term with a Leitner box system, so terms you miss come back sooner.'),
    h('div', { style:{ marginBottom:'16px' } }, seg), body);
  paint();
  return wrap;
}

function glossaryView(){
  const box = h('div');
  const list = h('div.grid.g2', { style:{ marginTop:'14px' } });
  let q = '', topic = 'all';

  function draw(){
    const rows = GLOSSARY.filter(g =>
      (topic === 'all' || g.topic === topic) &&
      (!q || g.term.toLowerCase().includes(q) || g.def.toLowerCase().includes(q)));
    list.replaceChildren(...(rows.length ? rows.map(g =>
      h('div.card', { style:{ borderLeft:`3px solid ${SERIES[g.topic]}` } },
        h('div.row', { style:{ justifyContent:'space-between', gap:'8px', marginBottom:'5px' } },
          h('strong', { style:{ fontSize:'15px' } }, g.term), topicTag(g.topic)),
        h('p', { style:{ fontSize:'13.5px', color:'var(--ink-2)' } }, g.def))) :
      [h('div.empty', `No terms match “${q}”.`)]));
  }

  const search = h('input.field', { type:'search', id:'glossary-search',
    placeholder:'Search 40 terms and definitions…', oninput: e => { q = e.target.value.toLowerCase().trim(); draw(); } });

  box.append(
    h('div.row', { style:{ gap:'10px', flexWrap:'wrap' } },
      h('div', { style:{ flex:'1 1 240px', position:'relative' } }, search),
      h('div.seg', ...['all', ...Object.keys(TOPICS)].map(t =>
        h('button', { 'aria-pressed': String(t === topic), onclick: e => {
          topic = t;
          [...e.target.parentElement.children].forEach(b => b.setAttribute('aria-pressed', 'false'));
          e.target.setAttribute('aria-pressed', 'true'); draw();
        } }, t === 'all' ? 'All' : TOPICS[t].label)))),
    list);
  draw();
  return box;
}

/* Leitner boxes: 1 -> same day, 2 -> +1d, 3 -> +3d, 4 -> +7d, 5 -> retired */
const BOX_DAYS = [0, 0, 1, 3, 7, 30];
function dueCards(){
  const now = Date.now();
  return GLOSSARY.filter(g => {
    const c = S.cards[g.term];
    return !c || c.due <= now;
  });
}
function flashcards(){
  const box = h('div');
  let queue = dueCards();
  if (!queue.length) queue = GLOSSARY.slice();
  let idx = 0, flipped = false;

  const card = h('div.fc');
  const counter = h('div.eyebrow', { style:{ textAlign:'center', marginBottom:'12px' } });
  const controls = h('div.row', { style:{ gap:'8px', justifyContent:'center', marginTop:'16px', flexWrap:'wrap' } });

  function draw(){
    if (idx >= queue.length){
      card.replaceChildren(h('div.fc-inner', h('div.fc-face',
        icon('check', 'ico'), h('h3', 'Deck clear'),
        h('p', { style:{ color:'var(--ink-2)', fontSize:'14px' } },
          `You reviewed ${queue.length} card${queue.length === 1 ? '' : 's'}. Terms you marked "again" return today; the rest are scheduled forward.`),
        h('button.btn.btn-sm', { onclick: () => { queue = GLOSSARY.slice(); idx = 0; draw(); } }, 'Review everything again'))));
      counter.textContent = '';
      controls.replaceChildren();
      return;
    }
    const g = queue[idx];
    const cur = S.cards[g.term];
    flipped = false; card.classList.remove('flipped');
    counter.textContent = `Card ${idx + 1} of ${queue.length} · box ${cur ? cur.box : 1} of 5`;
    card.replaceChildren(h('div.fc-inner', { onclick: flip },
      h('div.fc-face',
        topicTag(g.topic),
        h('h3', { style:{ fontSize:'26px', marginTop:'10px' } }, g.term),
        h('p.eyebrow', { style:{ marginTop:'14px' } }, 'Tap to reveal')),
      h('div.fc-face.fc-back',
        h('div.eyebrow', g.term),
        h('p', { style:{ fontSize:'15.5px', lineHeight:'1.6', marginTop:'8px' } }, g.def))));
    controls.replaceChildren(
      h('button.btn', { onclick: () => grade(false) }, icon('reset'), 'Again'),
      h('button.btn.btn-primary', { onclick: () => grade(true) }, icon('check'), 'Got it'));
  }
  function flip(){ flipped = !flipped; card.classList.toggle('flipped', flipped); }
  function grade(ok){
    const g = queue[idx];
    const cur = S.cards[g.term] || { box:1 };
    cur.box = ok ? Math.min(5, cur.box + 1) : 1;
    cur.due = Date.now() + BOX_DAYS[cur.box] * 864e5;
    S.cards[g.term] = cur;
    S.cardsReviewed++;
    save(); touchStreak();
    if (S.cardsReviewed % 5 === 0) addXp(10, '5 cards reviewed');
    checkBadges();
    idx++; draw();
  }

  box.append(counter, card, controls,
    h('p', { style:{ textAlign:'center', marginTop:'16px', fontSize:'12.5px', color:'var(--ink-3)' } },
      `${S.cardsReviewed} reviews logged · ${dueCards().length} cards due now`));
  draw();
  return box;
}

/* ------------------------------------------------------------------ BLOG */
export function blogList(){
  const wrap = h('div');
  wrap.append(h('p.page-intro',
    'Long-form pieces with a comprehension checkpoint part-way through. Three are free; the rest are part of Pro.'));
  wrap.append(adSlot());
  wrap.append(h('div.grid.g2', { style:{ marginTop:'16px' } },
    ARTICLES.map(a => {
      const locked = a.premium && !isPaid();
      const read = S.read.includes(a.id);
      return h('article.card.lift', { style:{ display:'flex', flexDirection:'column', gap:'8px' } },
        h('div.row', { style:{ gap:'6px', flexWrap:'wrap' } },
          topicTag(a.topic),
          a.premium ? h('span.tag.tag-lock', icon('lock'), 'Pro') : h('span.tag.tag-free', 'Free'),
          read ? h('span.tag.tag-free', icon('check'), 'Read') : null),
        h('h3', { style:{ fontSize:'17px' } }, a.title),
        h('p', { style:{ fontSize:'13.5px', color:'var(--ink-2)' } }, a.dek),
        h('div.row', { style:{ justifyContent:'space-between', marginTop:'auto', paddingTop:'8px', gap:'8px' } },
          h('span.eyebrow', `${a.author} · ${a.mins} min`),
          h('button.btn.btn-sm' + (locked ? '' : '.btn-primary'), { onclick: () => {
            if (locked){ requirePaid('“' + a.title + '”'); return; }
            location.hash = '#/blog/' + a.id;
          } }, locked ? [icon('lock'), 'Unlock'] : 'Read')));
    })));
  return wrap;
}

export function article(id){
  const a = ARTICLES.find(x => x.id === id);
  if (!a) return h('div.empty', 'That article does not exist.');
  if (a.premium && !isPaid()){
    return h('div', lockedCard(a.title, 'This piece is part of the Pro tier.'));
  }
  const wrap = h('div.prose');
  wrap.append(
    h('button.btn.btn-sm.btn-ghost', { style:{ marginBottom:'14px' },
      onclick: () => { location.hash = '#/blog'; } }, '← All articles'),
    h('div.row', { style:{ gap:'6px', marginBottom:'10px', flexWrap:'wrap' } },
      topicTag(a.topic), h('span.eyebrow', `${a.author} · ${a.mins} min read`)),
    h('h1', { style:{ fontSize:'30px', letterSpacing:'-.02em', marginBottom:'10px' } }, a.title),
    h('p', { style:{ fontSize:'17px', color:'var(--ink-2)', marginBottom:'22px' } }, a.dek));

  for (const blk of a.body){
    if (blk.t === 'p') wrap.append(h('p', blk.v));
    else if (blk.t === 'h') wrap.append(h('h3', blk.v));
    else if (blk.t === 'quiz') wrap.append(inlineQuiz(blk));
  }

  const done = S.read.includes(a.id);
  wrap.append(h('div.card', { style:{ marginTop:'26px', display:'flex', gap:'10px',
    alignItems:'center', flexWrap:'wrap' } },
    h('div', { style:{ flex:'1 1 200px' } },
      h('strong', done ? 'Marked as read' : 'Finished this piece?'),
      h('p', { style:{ fontSize:'13px', color:'var(--ink-2)' } },
        done ? 'It counts toward your Close Reader badge.' : 'Marking it read awards 25 XP and holds your streak.')),
    done ? null : h('button.btn.btn-primary', { onclick: e => {
      S.read.push(a.id); save(); touchStreak(); addXp(25, 'article read'); checkBadges();
      e.target.closest('.card').replaceWith(h('div.card', { style:{ marginTop:'26px' } },
        h('strong', 'Marked as read')));
    } }, icon('check'), 'Mark as read'),
    h('button.btn', { onclick: () => {
      if (S.offline.includes(a.id)){ toast('Already saved for offline'); return; }
      if (!requirePaid('Offline downloads')) return;
      S.offline.push(a.id); save(); toast('Saved for offline reading');
    } }, icon('down'), 'Save offline')));
  return wrap;
}

function inlineQuiz(blk){
  const box = h('div.card', { style:{ margin:'20px 0', borderLeft:'3px solid var(--azurite)' } });
  const opts = h('div', { style:{ display:'flex', flexDirection:'column', gap:'7px', marginTop:'10px' } });
  let done = false;
  blk.choices.forEach((c, n) => opts.append(h('button.choice', { onclick: () => {
    if (done) return; done = true;
    [...opts.children].forEach((b, idx) => {
      b.disabled = true;
      if (idx === blk.answer) b.classList.add('correct');
      else if (idx === n) b.classList.add('wrong');
    });
    box.append(h('div.explain', { style:{ marginTop:'10px' } }, blk.why));
    if (n === blk.answer) addXp(5, 'checkpoint');
  } }, h('span.k', 'ABCD'[n]), h('span', c))));
  box.append(h('div.eyebrow', 'Checkpoint'),
    h('strong', { style:{ display:'block', marginTop:'4px', fontSize:'15px' } }, blk.q), opts);
  return box;
}

/* ------------------------------------------------------------- RESOURCES */
export function resources(){
  const wrap = h('div');
  let level = 'all', topic = 'all';
  const list = h('div.grid.g2', { style:{ marginTop:'16px' } });

  function stars(id, val){
    const mine = S.ratings[id];
    const row = h('div.row', { style:{ gap:'2px' } });
    for (let i = 1; i <= 5; i++){
      const on = (mine || Math.round(val)) >= i;
      row.append(h('button', { class:'btn-ghost', title:`Rate ${i} of 5`,
        style:{ border:'0', background:'none', cursor:'pointer', padding:'0 1px', lineHeight:'0',
          color: on ? 'var(--sulfur)' : 'var(--line-strong)' },
        onclick: () => { S.ratings[id] = i; save(); toast(`Rated ${i} of 5`); draw(); } },
        icon('star', 'ico')));
    }
    row.append(h('span', { style:{ fontSize:'12px', color:'var(--ink-3)', marginLeft:'5px' } },
      mine ? `you rated ${mine}` : val.toFixed(1)));
    return row;
  }

  function draw(){
    const rows = RESOURCES.filter(r =>
      (level === 'all' || r.level === level) && (topic === 'all' || r.topic === topic));
    list.replaceChildren(...rows.map(r =>
      h('div.card', { style:{ display:'flex', flexDirection:'column', gap:'7px' } },
        h('div.row', { style:{ gap:'6px', flexWrap:'wrap' } },
          topicTag(r.topic), h('span.tag.tag-' + r.level, r.level),
          h('span.tag', { class: r.price === 'Free' ? 'tag-free' : 'tag-lock' }, r.price)),
        h('strong', { style:{ fontSize:'15px' } }, r.title),
        h('span.eyebrow', `${r.kind} · ${r.by}`),
        h('p', { style:{ fontSize:'13.5px', color:'var(--ink-2)' } }, r.note),
        stars(r.id, r.rating),
        h('div.row', { style:{ gap:'7px', marginTop:'auto', paddingTop:'8px', flexWrap:'wrap' } },
          h('button.btn.btn-sm', { onclick: () => modal((b, close) => {
            b.append(h('div.eyebrow', 'Affiliate link'),
              h('h3', { style:{ margin:'6px 0 8px' } }, r.title),
              h('p', { style:{ color:'var(--ink-2)', fontSize:'14px' } },
                'In production this opens the partner storefront with the affiliate tag attached. This build ships no outbound links and no tracking, so nothing is sent anywhere.'),
              h('p.eyebrow', { style:{ marginTop:'12px' } }, 'Demo build · link disabled'),
              h('div.row', { style:{ marginTop:'16px', justifyContent:'flex-end' } },
                h('button.btn.btn-primary', { onclick: close }, 'Close')));
          }) }, 'Get it'),
          h('button.btn.btn-sm.btn-ghost', { onclick: () => {
            const i = S.saved.indexOf(r.id);
            if (i >= 0) S.saved.splice(i, 1); else S.saved.push(r.id);
            save(); draw();
          } }, S.saved.includes(r.id) ? [icon('check'), 'Saved'] : 'Save')))));
  }

  const segs = (items, cur, set) => h('div.seg', ...items.map(t =>
    h('button', { 'aria-pressed': String(t.id === cur()), onclick: e => {
      set(t.id);
      [...e.target.parentElement.children].forEach(b => b.setAttribute('aria-pressed', 'false'));
      e.target.setAttribute('aria-pressed', 'true'); draw();
    } }, t.label)));

  wrap.append(
    h('p.page-intro', 'A curated shelf rather than a link dump: every entry is placed on a level, so you can follow one track from beginner to advanced. Ratings are yours and stay on this device.'),
    h('div.row', { style:{ gap:'10px', flexWrap:'wrap' } },
      segs([{ id:'all', label:'All levels' }, ...LEVELS.map(l => ({ id:l, label:l[0].toUpperCase() + l.slice(1) }))],
        () => level, v => level = v),
      segs([{ id:'all', label:'All topics' }, ...Object.values(TOPICS).map(t => ({ id:t.id, label:t.label }))],
        () => topic, v => topic = v)),
    list);
  draw();
  return wrap;
}

/* ---------------------------------------------------------------- MENTOR */
export function mentor(){
  const wrap = h('div');
  const log = h('div.chat-log');
  const input = h('input.field', { id:'mentor-input', placeholder:'Ask about rocks, plates, projections, careers…', autocomplete:'off' });

  function push(text, who){
    const m = h('div.msg.' + who);
    m.textContent = text;
    log.append(m);
    log.scrollIntoView({ block:'end', behavior:'smooth' });
    return m;
  }
  function ask(text){
    if (!text.trim()) return;
    push(text, 'me');
    input.value = '';
    const thinking = push('…', 'bot');
    setTimeout(() => {
      thinking.textContent = mentorReply(text);
      log.scrollIntoView({ block:'end', behavior:'smooth' });
      if (window.speechSynthesis && S._speak){
        try{ speechSynthesis.speak(new SpeechSynthesisUtterance(thinking.textContent)); }catch(e){}
      }
    }, 320);
  }

  push('I am the Stratum mentor. I answer from a fixed knowledge base covering geology, earth science and GIS, entirely on this device — nothing you type leaves the browser. Ask me a term, or ask what to study next and I will read your own accuracy record.', 'bot');

  const prompts = h('div.prompts', MENTOR_PROMPTS.map(p =>
    h('button', { onclick: () => ask(p) }, p)));

  const micBtn = h('button.btn', { title:'Voice input', onclick: () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR){ toast('Voice input is not supported in this browser'); return; }
    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false;
    rec.onresult = ev => ask(ev.results[0][0].transcript);
    rec.onerror = () => toast('Could not hear that');
    try{ rec.start(); toast('Listening…', 'mic'); }catch(e){ toast('Microphone unavailable'); }
  } }, icon('mic'));

  const speakBtn = h('button.btn', { title:'Read answers aloud', onclick: e => {
    S._speak = !S._speak;
    e.currentTarget.style.borderColor = S._speak ? 'var(--azurite)' : '';
    e.currentTarget.style.color = S._speak ? 'var(--azurite)' : '';
    toast(S._speak ? 'Answers will be read aloud' : 'Voice output off');
  } }, icon('bot'));

  const form = h('form.chat-bar', { onsubmit: e => { e.preventDefault(); ask(input.value); } },
    input, micBtn, speakBtn, h('button.btn.btn-primary', { type:'submit' }, icon('send'), h('span.sr', 'Send')));

  wrap.append(
    h('p.page-intro', 'A subject-specific assistant that runs entirely in the browser. It retrieves from a curated knowledge base rather than generating text, so it will say when something is outside its scope instead of inventing an answer.'),
    prompts, h('div.card', { style:{ padding:'14px' } }, log), form);
  return wrap;
}

/* ------------------------------------------------------------- COMMUNITY */
const SEED_THREADS = [
  { id:'t1', by:'A. Raut', topic:'geology', title:'Is this a fault or a joint? Road cut near Pune',
    body:'Clean planar surface, no visible offset in the bedding either side. Slickensides would settle it but the face is weathered. What else should I look for?',
    at: Date.now() - 6 * 36e5, replies:[
      { by:'S. Iyer', at: Date.now() - 5 * 36e5, body:'Look for drag folds in the adjacent beds, and for a gouge or breccia zone along the surface. A joint has neither. If the bedding is truly continuous across it with no thickness change, it is a joint.' },
      { by:'M. Devi', at: Date.now() - 3 * 36e5, body:'Also check whether it is part of a set. Joints come in systematic sets at consistent orientations; a single isolated surface is more suspicious.' }] },
  { id:'t2', by:'K. Bose', topic:'gis', title:'Zonal stats giving different answers in two projections',
    body:'Same polygons, same raster, two CRSs, roughly 4 percent difference in mean. Which one do I trust?',
    at: Date.now() - 26 * 36e5, replies:[
      { by:'J. Lima', at: Date.now() - 24 * 36e5, body:'Neither, until you check the resampling. Reprojecting the raster resamples cells; if you used bilinear on a continuous surface that is defensible, but the cell areas also change. Reproject the vector to the raster CRS instead and leave the raster untouched.' }] },
  { id:'t3', by:'P. Nayak', topic:'earth', title:'Study group for the seismology track, weekends',
    body:'Two of us are working through global seismology. Room for three or four more. We meet Saturday mornings IST and work problems together.',
    at: Date.now() - 50 * 36e5, replies:[] },
];

export function community(){
  if (!S.threads) { S.threads = structuredClone(SEED_THREADS); save(); }
  const wrap = h('div');
  const list = h('div');

  function ago(t){
    const m = Math.floor((Date.now() - t) / 6e4);
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.floor(m / 60) + 'h ago';
    return Math.floor(m / 1440) + 'd ago';
  }
  const initials = n => n.split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  function draw(){
    list.replaceChildren(...S.threads.map(t => {
      const open = S._openThread === t.id;
      const replyBox = h('textarea.field', { rows:'2', placeholder:'Write a reply…' });
      return h('div.card', { style:{ marginBottom:'12px' } },
        h('div.thread', { style:{ borderBottom:'0', paddingTop:'0' } },
          h('div.avatar', initials(t.by)),
          h('div', { style:{ minWidth:'0', flex:'1' } },
            h('div.row', { style:{ gap:'7px', flexWrap:'wrap', marginBottom:'4px' } },
              topicTag(t.topic), h('span.eyebrow', `${t.by} · ${ago(t.at)}`)),
            h('strong', { style:{ fontSize:'15.5px', display:'block' } }, t.title),
            h('p', { style:{ fontSize:'14px', color:'var(--ink-2)', marginTop:'4px' } }, t.body),
            h('button.btn.btn-sm.btn-ghost', { style:{ marginTop:'8px', paddingLeft:'0' },
              onclick: () => { S._openThread = open ? null : t.id; draw(); } },
              icon('chat'), `${t.replies.length} repl${t.replies.length === 1 ? 'y' : 'ies'}`))),
        open ? h('div', { style:{ paddingLeft:'46px', marginTop:'4px' } },
          t.replies.map(r => h('div.thread',
            h('div.avatar', initials(r.by)),
            h('div', { style:{ minWidth:'0' } },
              h('span.eyebrow', `${r.by} · ${ago(r.at)}`),
              h('p', { style:{ fontSize:'14px', color:'var(--ink-2)', marginTop:'3px' } }, r.body)))),
          h('form', { style:{ display:'flex', gap:'8px', marginTop:'12px', alignItems:'flex-start' },
            onsubmit: e => {
              e.preventDefault();
              const txt = replyBox.value.trim(); if (!txt) return;
              t.replies.push({ by:S.name, at:Date.now(), body:txt });
              save(); addXp(8, 'community reply'); touchStreak(); draw();
            } },
            replyBox, h('button.btn.btn-primary', { type:'submit' }, 'Reply'))) : null);
    }));
  }

  function newThread(){
    modal((box, close) => {
      const title = h('input.field', { id:'nt-title', placeholder:'What is your question?' });
      const body  = h('textarea.field', { id:'nt-body', rows:'4', placeholder:'Give enough detail that someone can actually answer.' });
      const topic = h('select.field', { id:'nt-topic' },
        Object.values(TOPICS).map(t => h('option', { value:t.id }, t.label)));
      box.append(
        h('h2', { style:{ fontSize:'19px', marginBottom:'12px' } }, 'Start a thread'),
        h('div.stack', { style:{ gap:'10px' } }, title, topic, body),
        h('div.row', { style:{ gap:'8px', marginTop:'16px', justifyContent:'flex-end' } },
          h('button.btn', { onclick: close }, 'Cancel'),
          h('button.btn.btn-primary', { onclick: () => {
            if (!title.value.trim()){ toast('A title is required'); return; }
            S.threads.unshift({ id:'u' + Date.now(), by:S.name, topic:topic.value,
              title:title.value.trim(), body:body.value.trim(), at:Date.now(), replies:[] });
            save(); addXp(15, 'thread posted'); touchStreak(); close(); draw();
          } }, 'Post')));
    });
  }

  wrap.append(
    h('p.page-intro', 'Questions, answers and study groups. Threads you post are stored on this device only — the seeded discussions show how the space reads once it is populated.'),
    h('div.row', { style:{ marginBottom:'16px', gap:'8px', flexWrap:'wrap' } },
      h('button.btn.btn-primary', { onclick: newThread }, icon('chat'), 'Start a thread'),
      h('button.btn', { onclick: () => requirePaid('Private study groups') }, icon('users'), 'Study groups'),
      h('span.eyebrow', `${S.threads.length} threads`)),
    list);
  draw();
  return wrap;
}

/* --------------------------------------------------------------- CAREERS */
export function careers(){
  const wrap = h('div');
  let lvl = 'All';
  const list = h('div.grid.g2', { style:{ marginTop:'16px' } });

  function draw(){
    const rows = JOBS.filter(j => lvl === 'All' || j.level === lvl);
    list.replaceChildren(...rows.map(j =>
      h('div.card', { style:{ display:'flex', flexDirection:'column', gap:'7px' } },
        h('div.row', { style:{ gap:'6px', flexWrap:'wrap' } },
          h('span.tag.tag-lock', j.type), h('span.tag.tag-free', j.level)),
        h('strong', { style:{ fontSize:'16px' } }, j.role),
        h('span.eyebrow', `${j.org} · ${j.place}`),
        h('p', { style:{ fontSize:'13.5px', color:'var(--ink-2)' } }, j.note),
        h('div.row', { style:{ gap:'5px', flexWrap:'wrap', marginTop:'2px' } },
          j.skills.map(s => h('span.tag.tag-beginner', s))),
        h('button.btn.btn-sm', { style:{ marginTop:'auto' }, onclick: () => modal((b, close) => {
          b.append(h('div.eyebrow', 'Demo listing'),
            h('h3', { style:{ margin:'6px 0 8px' } }, j.role),
            h('p', { style:{ color:'var(--ink-2)', fontSize:'14px' } },
              'These are representative listings written for the app, not live vacancies. In production this panel carries the employer’s application flow.'),
            h('div.row', { style:{ marginTop:'16px', justifyContent:'flex-end' } },
              h('button.btn.btn-primary', { onclick: close }, 'Close')));
        }) }, 'View role'))));
  }

  wrap.append(
    h('p.page-intro', 'Roles across geology, GIS and earth science, plus a slot to book time with a working professional.'),
    bookingCard(),
    sectionHead('Job board',
      h('div.seg', ...['All', 'Entry', 'Mid', 'Senior'].map(l =>
        h('button', { 'aria-pressed': String(l === lvl), onclick: e => {
          lvl = l;
          [...e.target.parentElement.children].forEach(b => b.setAttribute('aria-pressed', 'false'));
          e.target.setAttribute('aria-pressed', 'true'); draw();
        } }, l)))),
    list);
  draw();
  return wrap;
}

function bookingCard(){
  const slots = [];
  for (let d = 1; d <= 5; d++){
    const day = new Date(Date.now() + d * 864e5);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    for (const t of ['10:00', '14:30', '18:00']) slots.push({ d: day.toISOString().slice(0, 10), t });
  }
  const grid = h('div.grid', { style:{ gridTemplateColumns:'repeat(auto-fill,minmax(112px,1fr))', gap:'7px', marginTop:'12px' } });
  slots.slice(0, 9).forEach(s => {
    const taken = S.bookings.some(b => b.d === s.d && b.t === s.t);
    grid.append(h('button.btn.btn-sm', {
      style: taken ? { borderColor:'var(--malachite)', color:'var(--malachite)' } : {},
      onclick: () => {
        if (taken){ toast('Already booked'); return; }
        if (!requirePaid('1-on-1 mentor sessions')) return;
        S.bookings.push({ ...s, at:Date.now() }); save();
        toast(`Session booked · ${s.d} at ${s.t}`);
        rerender();
      } },
      h('span', { style:{ display:'block', fontSize:'11px', fontFamily:'var(--f-mono)', color:'var(--ink-3)' } },
        new Date(s.d).toLocaleDateString(undefined, { weekday:'short', day:'numeric' })),
      h('span', taken ? '✓ ' + s.t : s.t)));
  });
  return h('div.card.lift', { style:{ borderLeft:'3px solid var(--limonite)' } },
    h('div.eyebrow', 'Premium · 1-on-1'),
    h('h3', { style:{ fontSize:'18px', margin:'6px 0 4px' } }, 'Book 30 minutes with a working geoscientist'),
    h('p', { style:{ fontSize:'14px', color:'var(--ink-2)', maxWidth:'62ch' } },
      'Career direction, portfolio review, or a technical problem you are stuck on. Included with Premium; Pro and Free can book at a per-session rate.'),
    grid,
    S.bookings.length ? h('p', { style:{ marginTop:'12px', fontSize:'13px', color:'var(--malachite)', fontWeight:'600' } },
      `${S.bookings.length} session${S.bookings.length === 1 ? '' : 's'} booked`) : null);
}

/* -------------------------------------------------------------- PROGRESS */
export function progress(){
  const wrap = h('div');
  const acc = accuracy();
  const done = Object.keys(S.answered).length;
  const weak = weakestTopic();

  wrap.append(
    h('p.page-intro', 'Everything the app knows about your learning, in one place. All of it is computed on this device from your own answers.'),
    h('div.grid.g4', { style:{ marginBottom:'18px' } },
      h('div.card.stat', h('span.l', 'Total XP'), h('span.v', S.xp.toLocaleString()), h('span.d', `Level ${levelOf(S.xp)}`)),
      h('div.card.stat', h('span.l', 'Questions'), h('span.v', done), h('span.d', `of ${QUESTIONS.length} in the bank`)),
      h('div.card.stat', h('span.l', 'Accuracy'), h('span.v', acc === null ? '—' : acc + '%'), h('span.d', 'across all topics')),
      h('div.card.stat', h('span.l', 'Cards'), h('span.v', S.cardsReviewed), h('span.d', 'flashcard reviews')),
      h('div.card.stat', h('span.l', 'Articles'), h('span.v', S.read.length), h('span.d', `of ${ARTICLES.length} read`)),
      h('div.card.stat', h('span.l', 'Crosswords'), h('span.v', S.xwDone.length), h('span.d', 'grids solved')),
      h('div.card.stat', h('span.l', 'Best streak'), h('span.v', S.best), h('span.d', 'consecutive days')),
      h('div.card.stat', h('span.l', 'Badges'), h('span.v', S.badges.length), h('span.d', `of ${BADGES.length}`))),
    sectionHead('XP per day', h('span.eyebrow', 'last 14 days')),
    h('div.card', activityChart()),
    sectionHead('Accuracy by topic'),
    h('div.card', topicChart()));

  if (isPaid()){
    const rows = Object.keys(TOPICS).map(k => {
      const pool = QUESTIONS.filter(q => q.topic === k);
      const seen = pool.filter(q => S.answered[q.id]);
      const st = S.topicStats[k] || { n:0, ok:0 };
      return { k, label:TOPICS[k].label, coverage:Math.round(seen.length / pool.length * 100),
        acc: st.n ? Math.round(st.ok / st.n * 100) : null, level:adaptiveLevel(k) };
    });
    wrap.append(sectionHead('Mastery breakdown', h('span.tag.tag-lock', 'Pro')),
      h('div.tablewrap', h('table',
        h('thead', h('tr', h('th', 'Topic'), h('th', 'Bank covered'), h('th', 'Accuracy'), h('th', 'Adaptive level'))),
        h('tbody', rows.map(r => h('tr',
          h('td', h('div.row', { style:{ gap:'7px' } },
            h('span', { style:{ width:'9px', height:'9px', borderRadius:'2px', background:SERIES[r.k] } }), r.label)),
          h('td.num', r.coverage + '%'),
          h('td.num', r.acc === null ? '—' : r.acc + '%'),
          h('td', h('span.tag.tag-' + r.level, r.level))))))));
    wrap.append(h('div.card', { style:{ marginTop:'14px', borderLeft:'3px solid var(--azurite)' } },
      h('div.eyebrow', 'Recommendation'),
      h('p', { style:{ marginTop:'6px', fontSize:'14.5px' } },
        weak ? `Your weakest track is ${TOPICS[weak].label} at ${accuracy(weak)}%. Three focused rounds there would move your overall accuracy more than anything else you could do this week.`
             : 'Answer at least three questions in each topic to unlock a targeted recommendation.')));
  } else {
    wrap.append(sectionHead('Mastery breakdown'),
      lockedCard('Detailed mastery analytics',
        'Per-topic coverage, adaptive level and a weekly recommendation. Part of Pro.'));
  }

  wrap.append(h('div.row', { style:{ gap:'8px', marginTop:'22px', flexWrap:'wrap' } },
    h('button.btn', { onclick: () => {
      const acc2 = accuracy();
      navigator.clipboard?.writeText(
        `Stratum Field Lab — level ${levelOf(S.xp)}, ${S.xp} XP, ${acc2 === null ? 'no' : acc2 + '%'} accuracy over ${done} questions, ${S.best}-day best streak.`)
        .then(() => toast('Report copied to clipboard'), () => toast('Copy not available'));
    } }, icon('share'), 'Copy report card'),
    h('button.btn', { onclick: () => modal((b, close) => {
      b.append(h('h2', { style:{ fontSize:'19px' } }, 'Reset all progress'),
        h('p', { style:{ color:'var(--ink-2)', marginTop:'8px' } },
          'This clears your XP, streak, answers, flashcard schedule, ratings, bookings and forum posts on this device. It cannot be undone.'),
        h('div.row', { style:{ gap:'8px', marginTop:'18px', justifyContent:'flex-end' } },
          h('button.btn', { onclick: close }, 'Cancel'),
          h('button.btn', { style:{ borderColor:'var(--cinnabar)', color:'var(--cinnabar)' },
            onclick: () => { resetAll(); close(); toast('Progress reset'); location.hash = '#/'; rerender(); } },
            'Reset everything')));
    }) }, icon('reset'), 'Reset progress')));
  return wrap;
}

/* ----------------------------------------------------------------- PLANS */
export function plans(){
  const wrap = h('div');
  wrap.append(h('p.page-intro',
    'Four tiers, following the freemium model in the brief. This is a demo build: choosing a plan flips the feature flags locally so you can see exactly what each tier unlocks. No payment is taken and no data leaves the browser.'));

  wrap.append(h('div.grid.g4', PLANS.map(p => {
    const cur = S.tier === p.id;
    return h('div.card' + (p.tag ? '.lift' : ''), {
      style:{ display:'flex', flexDirection:'column', gap:'9px',
        borderColor: cur ? 'var(--azurite)' : (p.tag ? 'var(--line-strong)' : 'var(--line)'),
        borderWidth: cur ? '2px' : '1px' } },
      p.tag ? h('span.tag.tag-gis.tag-topic', p.tag) : h('span', { style:{ height:'19px' } }),
      h('h3', { style:{ fontSize:'18px' } }, p.name),
      h('div', h('span.num', { style:{ fontSize:'27px' } }, p.price),
        h('span', { style:{ color:'var(--ink-3)', fontSize:'13px' } }, ' / ' + p.per)),
      h('ul', { style:{ listStyle:'none', padding:'0', margin:'6px 0 0', display:'flex',
        flexDirection:'column', gap:'6px', fontSize:'13.5px', color:'var(--ink-2)' } },
        p.perks.map(x => h('li', { style:{ display:'flex', gap:'7px', alignItems:'flex-start' } },
          icon('check', 'ico'), h('span', x)))),
      h('button.btn' + (cur ? '' : '.btn-primary'), { style:{ marginTop:'auto' }, disabled: cur,
        onclick: () => {
          S.tier = p.id; save();
          toast(p.id === 'free' ? 'Switched to Free' : `${p.name} active · demo mode`);
          rerender();
        } }, cur ? 'Current plan' : (p.id === 'free' ? 'Switch to Free' : 'Choose ' + p.name)));
  })));

  // referral
  if (!S.referral) { S.referral = 'STRAT-' + Math.random().toString(36).slice(2, 7).toUpperCase(); save(); }
  wrap.append(sectionHead('Referral programme'),
    h('div.card.lift', { style:{ display:'flex', gap:'14px', alignItems:'center', flexWrap:'wrap' } },
      h('div', { style:{ flex:'1 1 260px' } },
        h('strong', 'Invite a study partner'),
        h('p', { style:{ fontSize:'13.5px', color:'var(--ink-2)', marginTop:'3px' } },
          'Both of you get one month of Pro when they complete their first quiz. Your code:')),
      h('code.mono', { style:{ padding:'9px 14px', borderRadius:'var(--r-sm)',
        background:'var(--surface-2)', border:'1px dashed var(--line-strong)', fontSize:'15px',
        fontWeight:'600', letterSpacing:'.06em' } }, S.referral),
      h('button.btn', { onclick: () => {
        navigator.clipboard?.writeText(S.referral).then(() => toast('Code copied'), () => toast('Copy not available'));
      } }, icon('gift'), 'Copy code')));

  wrap.append(sectionHead('What the tiers gate'),
    h('div.tablewrap', h('table',
      h('thead', h('tr', h('th', 'Capability'), h('th', 'Free'), h('th', 'Pro'), h('th', 'Premium'))),
      h('tbody',
        [['Beginner + intermediate quizzes', 1, 1, 1],
         ['Daily crossword and glossary', 1, 1, 1],
         ['Advanced quiz bank', 0, 1, 1],
         ['Premium articles', 0, 1, 1],
         ['Timed practice sessions', 0, 1, 1],
         ['Detailed mastery analytics', 0, 1, 1],
         ['Ad-free', 0, 1, 1],
         ['Offline downloads', 0, 0, 1],
         ['1-on-1 mentor booking', 0, 0, 1],
         ['Private study groups', 0, 0, 1]].map(r => h('tr',
          h('td', r[0]),
          ...r.slice(1).map(v => h('td', v
            ? icon('check', 'ico')
            : h('span', { style:{ color:'var(--ink-3)' } }, '–')))))))));
  return wrap;
}
