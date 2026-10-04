/* Hustleville — casino: roulette, blackjack and sports betting. Play money only, real odds
   (European roulette, 3:2 blackjack, ~8% bookmaker margin). Loaded before game.js; game.js merges CASINO_ACTS into A. */
'use strict';

const CAS_CHIPS = [100, 500, 1000, 5000, 25000, 100000, 1000000];
const CAS_MIN_AGE = 21;
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROU_BETS = [['red', '🔴 Red', 1], ['black', '⚫ Black', 1], ['odd', 'Odd', 1], ['even', 'Even', 1], ['low', '1–18', 1], ['high', '19–36', 1], ['d1', '1st 12', 2], ['d2', '2nd 12', 2], ['d3', '3rd 12', 2]];
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const SPORTS = {
  soccer: { icon: '⚽', n: 'Soccer', draw: true, teams: ['Rovenia FC', 'Atletico Valmar', 'Dynamo Kestrel', 'Real Altona', 'Borussia Nordheim', 'Sporting Lusa', 'AS Montclair', 'Union Saltbridge'] },
  basket: { icon: '🏀', n: 'Basketball', teams: ['Metro Hawks', 'Bay City Waves', 'Capital Kings', 'Desert Scorpions', 'Harbor Titans', 'Lakeshore Flames'] },
  football: { icon: '🏈', n: 'Football', teams: ['Iron City Bulls', 'Pacific Wolves', 'Prairie Ghosts', 'Northgate Knights', 'Redrock Raiders', 'Summit Storm'] },
  tennis: { icon: '🎾', n: 'Tennis', teams: ['K. Novakova', 'L. Ferreira', 'D. Okafor', 'M. Tanaka', 'S. Lindqvist', 'A. Moreau', 'J. Castillo', 'R. Brandt'] },
  boxing: { icon: '🥊', n: 'Boxing', teams: ['"Iron" Mike Duarte', 'Tyson Blackwell', 'Kid Cortez', 'Bruno "Hammer" Kovac', 'Oleg Rastov', 'Slick Danny Reyes'] },
  hockey: { icon: '🏒', n: 'Ice Hockey', teams: ['Frostbite Wolves', 'Glacier Kings', 'Northern Blades', 'Polar Jets', 'Steel Harbor', 'Avalanche United'] }
};

const casS = () => { if (!S.cas) S.cas = { net: 0, rou: [], bj: null, fx: null, slip: [] }; return S.cas; };
const casU = () => { if (!UI.cas) UI.cas = { game: 'rou', bet: 1000, busy: false, ang: 0, shown: 0, msg: '', pick: '' }; return UI.cas; };
const casMoney = (delta) => { casS().net += delta; S.cash += delta; };
const casBet = () => Math.max(0, Math.min(casU().bet, Math.floor(S.cash)));
function casNote(label, net) {                                      // life-log line for the big swings only
  if (Math.abs(net) < 50000) return;
  say('🎰', net > 0 ? `${label}: you won ${fmt(net)}!` : `${label}: you lost ${fmt(-net)}.`, net > 0 ? 'gold' : 'bad');
  S.happy = clamp(S.happy + (net > 0 ? 3 : -3));
}

/* ---------- roulette ---------- */
let wheelSvg = '';
function rouWheel() {
  if (wheelSvg) return wheelSvg;
  const sl = 360 / 37, pt = (r, t) => `${(r * Math.sin(t * Math.PI / 180)).toFixed(2)},${(-r * Math.cos(t * Math.PI / 180)).toFixed(2)}`;
  let s = '';
  WHEEL_ORDER.forEach((n, i) => {
    const a0 = i * sl - sl / 2, a1 = i * sl + sl / 2, col = n === 0 ? '#1f9d55' : RED_NUMS.has(n) ? '#d72d2d' : '#171a26';
    s += `<path d="M0,0 L${pt(100, a0)} A100,100 0 0 1 ${pt(100, a1)} Z" fill="${col}" stroke="#d9b14a" stroke-width=".6"/><text transform="rotate(${(i * sl).toFixed(2)}) translate(0,-83)" font-size="7" font-weight="700" fill="#fff" text-anchor="middle">${n}</text>`;
  });
  return (wheelSvg = `<svg viewBox="-112 -112 224 224" class="rouwheel"><circle r="110" fill="#6b4a1c"/><circle r="104" fill="#d9b14a"/><g id="rouWheel">${s}</g><circle r="58" fill="#0e1a33" stroke="#d9b14a" stroke-width="2"/><circle r="10" fill="#d9b14a"/></svg>`);
}
function rouWins(kind, n) {
  if (kind[0] === 'n') return +kind.slice(1) === n;
  if (n === 0) return false;
  switch (kind) {
    case 'red': return RED_NUMS.has(n); case 'black': return !RED_NUMS.has(n); case 'odd': return n % 2 === 1; case 'even': return n % 2 === 0;
    case 'low': return n <= 18; case 'high': return n >= 19; case 'd1': return n <= 12; case 'd2': return n > 12 && n <= 24; default: return n > 24;
  }
}
function rouHTML() {
  const u = casU(), c = casS(), off = u.busy || S.jail || casBet() <= 0 ? 'disabled' : '';
  const numBtns = Array.from({ length: 36 }, (_, i) => i + 1).map(n => `<button class="rn ${RED_NUMS.has(n) ? 'r' : 'b'}" ${off} data-a="rouSpin" data-v="n${n}">${n}</button>`).join('');
  return `<div class="rouwrap"><div class="rouptr">▼</div>${rouWheel().replace('class="rouwheel"', `class="rouwheel" style="--ang:${u.shown}deg"`)}</div>
    <div class="casmsg">${u.busy ? '🎡 No more bets…' : u.msg || 'Pick a bet — it plays with your selected chip.'}</div>
    <div class="rhist">${c.rou.map(n => `<i class="${n === 0 ? 'g' : RED_NUMS.has(n) ? 'r' : 'b'}">${n}</i>`).join('')}</div>
    <h5>Outside bets</h5><div class="rbets">${ROU_BETS.map(([k, l, m]) => `<button ${off} data-a="rouSpin" data-v="${k}">${l}<small>pays ${m}:1</small></button>`).join('')}</div>
    <h5>Single number · pays 35:1</h5><div class="rgrid"><button class="rn g" ${off} data-a="rouSpin" data-v="n0">0</button>${numBtns}</div>`;
}

/* ---------- blackjack ---------- */
const bjCard = () => ({ r: Math.floor(Math.random() * 13), s: Math.floor(Math.random() * 4) });
function bjTotal(h) {
  let t = 0, a = 0; h.forEach(c => { const v = c.r === 0 ? 11 : Math.min(10, c.r + 1); t += v; if (c.r === 0) a++; });
  while (t > 21 && a) { t -= 10; a--; } return t;
}
const bjCardHTML = (c, hide) => hide ? '<i class="pc back"></i>' : `<i class="pc ${c.s === 1 || c.s === 2 ? 'r' : ''}">${RANKS[c.r]}<b>${SUITS[c.s]}</b></i>`;
function bjHTML() {
  const g = casS().bj, u = casU(), live = g && !g.done, bet = casBet();
  let h = '';
  if (g) {
    h += `<div class="bjhand"><small>Dealer ${live ? '' : '· ' + bjTotal(g.d)}</small><div class="cards">${g.d.map((c, i) => bjCardHTML(c, live && i === 1)).join('')}</div></div>
      <div class="bjhand"><small>You · ${bjTotal(g.p)}${g.dbl ? ' · doubled' : ''} · bet ${fmt(g.bet)}</small><div class="cards">${g.p.map(c => bjCardHTML(c)).join('')}</div></div>`;
  } else h += '<div class="bjtable">🃏 Blackjack pays 3:2 · dealer stands on 17 · double down on any two cards</div>';
  h += `<div class="casmsg">${g && g.done ? g.res : live ? 'Your move.' : 'Choose your chip and deal.'}</div>`;
  if (live) {
    const canDbl = g.p.length === 2 && S.cash >= g.bet;
    h += `<div class="bjbtns"><button class="btn" data-a="bjHit">Hit</button><button class="btn" data-a="bjStand">Stand</button><button class="btn" ${canDbl ? '' : 'disabled'} data-a="bjDouble">Double ${fmt(g.bet)}</button></div>`;
  } else h += `<div class="bjbtns"><button class="gbtn" ${bet > 0 && !S.jail ? '' : 'disabled'} data-a="bjDeal">${g ? 'DEAL AGAIN' : 'DEAL'} · ${fmt(bet)}</button></div>`;
  return h;
}
function bjFinish(g, outcome) {                                       // outcome: 'win' | 'lose' | 'push' | 'bj'
  const back = { win: g.bet * 2, lose: 0, push: g.bet, bj: g.bet * 2.5 }[outcome];
  S.cash += back; casS().net += back - g.bet; g.done = true;
  g.res = { win: `✅ You win ${fmt(g.bet)}!`, lose: `❌ Dealer wins. −${fmt(g.bet)}`, push: '🤝 Push — bet returned.', bj: `🂡 BLACKJACK! +${fmt(g.bet * 1.5)}` }[outcome];
  casNote('Blackjack', back - g.bet);
}
function bjDealerPlay(g) {
  const p = bjTotal(g.p); while (bjTotal(g.d) < 17) g.d.push(bjCard());
  const d = bjTotal(g.d); bjFinish(g, d > 21 || p > d ? 'win' : p === d ? 'push' : 'lose');
}

/* ---------- sports betting ---------- */
function fxGen() {
  const keys = Object.keys(SPORTS).sort(() => Math.random() - 0.5), out = [];
  for (let i = 0; i < 8; i++) {
    const key = keys[i % keys.length], sp = SPORTS[key];
    const t = sp.teams.slice().sort(() => Math.random() - 0.5), s1 = rnd(0.6, 2.2), s2 = rnd(0.6, 2.2), base = s1 / (s1 + s2);
    const pd = sp.draw ? 0.27 * (1 - Math.abs(base - 0.5)) : 0, p = sp.draw ? [base * (1 - pd), pd, (1 - base) * (1 - pd)] : [base, 1 - base];
    out.push({ id: i, sp: key, a: t[0], b: t[1], p, o: p.map(x => Math.max(1.05, Math.round(0.92 / x * 100) / 100)), res: null });
  }
  return out;
}
function fxPlay(f) {                                                  // outcome index + a believable score line
  if (f.res) return f.res;
  const r = Math.random(); let acc = 0, w = f.p.length - 1; for (let i = 0; i < f.p.length; i++) { acc += f.p[i]; if (r < acc) { w = i; break; } }
  const draw = f.p.length === 3 && w === 1, a = w === 0, ri = (lo, hi) => Math.floor(rnd(lo, hi + 1)); let sc;
  if (f.sp === 'soccer') { const hi = ri(1, 4), lo = draw ? hi : ri(0, hi - 1); sc = draw ? `${hi}–${hi}` : a ? `${hi}–${lo}` : `${lo}–${hi}`; }
  else if (f.sp === 'basket') { const hi = ri(98, 128), lo = hi - ri(1, 18); sc = a ? `${hi}–${lo}` : `${lo}–${hi}`; }
  else if (f.sp === 'football') { const hi = ri(20, 41), lo = hi - ri(1, 17); sc = a ? `${hi}–${lo}` : `${lo}–${hi}`; }
  else if (f.sp === 'hockey') { const hi = ri(2, 6), lo = ri(0, hi - 1); sc = a ? `${hi}–${lo}` : `${lo}–${hi}`; }
  else if (f.sp === 'tennis') { const x = Math.random() < 0.6 ? '2–0' : '2–1'; sc = a ? x : x.split('–').reverse().join('–'); }
  else sc = Math.random() < 0.55 ? `KO round ${ri(1, 11)}` : 'decision';
  return (f.res = { w, sc });
}
function sportsHTML() {
  const c = casS(); if (!c.fx) c.fx = fxGen();
  const slipOf = (id) => { const s = c.slip.find(x => x[0] === id); return s ? s[1] : -1; };
  const odds = c.slip.reduce((m, [id, o]) => m * c.fx[id].o[o], 1), stake = casBet(), played = c.fx.every(f => f.res) || c.fx.some(f => f.res);
  let h = `<div class="casmsg">${c.sportMsg || 'Tap odds to build a slip. Add several for an accumulator — all legs must win.'}</div>`;
  h += c.fx.map(f => {
    const sp = SPORTS[f.sp], lab = f.p.length === 3 ? [f.a, 'Draw', f.b] : [f.a, f.b], sel = slipOf(f.id);
    return `<div class="fx"><div class="fxh"><span>${sp.icon} ${sp.n}</span>${f.res ? `<b class="fxres">FT ${f.res.sc}</b>` : ''}</div>
      <div class="fxo ${f.p.length === 3 ? 'three' : ''}">${lab.map((l, i) => `<button class="${sel === i ? 'on' : ''} ${f.res ? (f.res.w === i ? 'won' : 'lost') : ''}" ${f.res ? 'disabled' : ''} data-a="fxPick" data-v="${f.id}:${i}"><span>${l}</span><b>${f.o[i].toFixed(2)}</b></button>`).join('')}</div></div>`;
  }).join('');
  if (c.slip.length) h += `<div class="slip"><b>Bet slip · ${c.slip.length} leg${c.slip.length > 1 ? 's' : ''}</b>${c.slip.map(([id, o]) => { const f = c.fx[id]; return `<small>${SPORTS[f.sp].icon} ${[f.a, f.p.length === 3 ? 'Draw' : f.b, f.b][o]} @ ${f.o[o].toFixed(2)}</small>`; }).join('')}
    <div class="slipt">Odds ×${odds.toFixed(2)} · stake ${fmt(stake)} · returns <b>${fmt(stake * odds)}</b></div>
    <button class="gbtn" ${stake > 0 && !S.jail ? '' : 'disabled'} data-a="fxPlace">PLACE BET · ${fmt(stake)}</button></div>`;
  h += `<button class="btn sm" data-a="fxNew">${played ? '🔄 New matchday' : '🔄 Reroll fixtures'}</button>`;
  return h;
}

/* ---------- chips ---------- */
const CHIP_COL = { 100: ['#2f6fe0', '#1b3f8f'], 500: ['#8a4bd1', '#512a85'], 1000: ['#d93a3a', '#8f1f1f'], 5000: ['#1fa05a', '#0f6636'], 25000: ['#2a2d3a', '#0d0f16'], 100000: ['#e8872a', '#9a4c0b'], 1000000: ['#f1c53d', '#a67a0c'], all: ['#f1c53d', '#a67a0c'] };
const chipLbl = (v) => v === 'all' ? 'ALL' : v >= 1e6 ? v / 1e6 + 'M' : v >= 1000 ? v / 1000 + 'K' : '' + v;
function chipSvg(v, px) {                                              // a casino chip: coloured body, white edge spots, inlay ring, value in the middle
  const [a, b] = CHIP_COL[v] || CHIP_COL[100], dark = v === 1000000 || v === 'all', ink = dark ? '#5b3d00' : '#fff', id = 'cg' + String(v), l = chipLbl(v);
  return `<svg class="chipsvg" width="${px}" height="${px}" viewBox="0 0 100 100"><defs><radialGradient id="${id}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
    <circle cx="50" cy="52" r="47" fill="rgba(0,0,0,.35)"/><circle cx="50" cy="50" r="47" fill="url(#${id})" stroke="${b}" stroke-width="2"/>
    <circle cx="50" cy="50" r="41" fill="none" stroke="#fff" stroke-width="11" stroke-dasharray="10.7 10.7" opacity=".92"/>
    <circle cx="50" cy="50" r="33" fill="url(#${id})" stroke="${dark ? '#fff7d6' : '#fff'}" stroke-width="1.6" stroke-dasharray="${dark ? '0' : '3 2.5'}"/>
    <circle cx="50" cy="50" r="27" fill="none" stroke="${ink}" stroke-opacity=".45" stroke-width="1"/>
    <text x="50" y="${l.length > 3 ? 56 : 57}" text-anchor="middle" font-family="Lilita One,Fredoka,sans-serif" font-size="${l.length > 3 ? 17 : l.length > 2 ? 21 : 25}" fill="${ink}" stroke="rgba(0,0,0,.25)" stroke-width=".6">${l}</text>
    <ellipse cx="38" cy="30" rx="16" ry="7" fill="#fff" opacity=".18" transform="rotate(-30 38 30)"/></svg>`;
}
function betStack(amount) {                                            // the bet as a pile of chips (greedy by denomination, capped for space)
  let left = Math.round(amount), out = [];
  for (const d of CAS_CHIPS.slice().reverse()) { while (left >= d && out.length < 14) { out.push(d); left -= d; } }
  if (!out.length) return '<div class="stackempty">No bet</div>';
  return `<div class="stack" key="${amount}">${out.reverse().map((d, i) => `<span style="bottom:${i * 6}px;left:${(i % 2) * 3}px;animation-delay:${i * 35}ms">${chipSvg(d, 54)}</span>`).join('')}</div>`;
}
let casAudio = null;
function casClick(f) {                                                 // tiny synthesized chip clack
  try { casAudio = casAudio || new (window.AudioContext || window.webkitAudioContext)(); const o = casAudio.createOscillator(), g = casAudio.createGain(), t = casAudio.currentTime;
    o.type = 'triangle'; o.frequency.setValueAtTime(f || 1400, t); o.frequency.exponentialRampToValueAtTime(500, t + 0.07); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(casAudio.destination); o.start(t); o.stop(t + 0.1); } catch (e) { /* audio unavailable */ }
}

/* ---------- casino shell ---------- */
function casinoHTML() {
  if (S.age < CAS_MIN_AGE) return `<div class="note">🎰 The casino is 21+. Come back at ${CAS_MIN_AGE}.</div>`;
  const u = casU(), c = casS();
  const gm = [['rou', '🎡 Roulette'], ['bj', '🃏 Blackjack'], ['spt', '🏟️ Sports']];
  return `<div class="casbanner" style="background-image:url(assets/casino/${{ rou: 'roulette', bj: 'blackjack', spt: 'sports' }[u.game]}.webp)"><span>${gm.find(g => g[0] === u.game)[1]}</span></div>
    <div class="stats3"><div><b>${fmt(S.cash)}</b><small>wallet</small></div><div><b class="${c.net < 0 ? 'bad' : 'good'}">${c.net < 0 ? '−' : '+'}${fmt(Math.abs(c.net))}</b><small>net result</small></div><div><b>${fmt(casBet())}</b><small>bet size</small></div></div>
    <div class="subtabs cas">${gm.map(([k, l]) => `<button class="${u.game === k ? 'on' : ''}" data-a="casGame" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="chiprack">${CAS_CHIPS.map(v => `<button class="chipb ${u.bet === v ? 'on' : ''}" ${S.cash < v ? 'disabled' : ''} data-a="casChip" data-v="${v}" title="${fmt(v)}">${chipSvg(v, 44)}<small>${fmt(v)}</small></button>`).join('')}<button class="chipb ${u.bet === Math.floor(S.cash) && S.cash > 0 ? 'on' : ''}" ${S.cash < 1 ? 'disabled' : ''} data-a="casChip" data-v="${Math.max(1, Math.floor(S.cash))}" title="All in">${chipSvg('all', 44)}<small>ALL IN</small></button></div>
    <div class="betbox"><div class="betlbl"><small>YOUR BET</small><b>${fmt(casBet())}</b></div>${betStack(casBet())}</div>
    ${{ rou: rouHTML, bj: bjHTML, spt: sportsHTML }[u.game]()}
    <div class="note">Play money only. The house always has an edge — roulette has a 2.7% edge, bookmakers keep ~8%.</div>`;
}

const CASINO_ACTS = {
  casGame(v) { casU().game = v; refresh(); },
  casChip(v) { casU().bet = +v; casClick(); refresh(); },
  rouSpin(kind) {
    const u = casU(), c = casS(), b = casBet(); if (u.busy || S.jail || b <= 0 || S.cash < b) return;
    casClick(900); S.cash -= b; c.net -= b; const n = Math.floor(Math.random() * 37), i = WHEEL_ORDER.indexOf(n), mult = kind[0] === 'n' ? 35 : ROU_BETS.find(x => x[0] === kind)[2], win = rouWins(kind, n);
    u.busy = true; u.ang = Math.ceil(u.shown / 360) * 360 + 1800 - i * (360 / 37);
    save(); refresh();
    requestAnimationFrame(() => { const w = document.getElementById('rouWheel'); if (!w) return; w.getBoundingClientRect(); w.style.transition = 'transform 2.6s cubic-bezier(.12,.6,.1,1)'; w.style.transform = `rotate(${u.ang}deg)`; });
    setTimeout(() => {
      const pay = win ? b * (mult + 1) : 0; S.cash += pay; c.net += pay; u.busy = false; u.shown = u.ang;
      c.rou.unshift(n); c.rou.length = Math.min(c.rou.length, 14);
      u.msg = `${RED_NUMS.has(n) ? '🔴' : n === 0 ? '🟢' : '⚫'} ${n} — ${win ? `you win ${fmt(b * mult)}!` : `you lose ${fmt(b)}.`}`;
      casNote('Roulette', pay - b); save(); refresh(); renderFeed();
    }, 2700);
  },
  bjDeal() {
    const c = casS(), b = casBet(); if (S.jail || b <= 0 || (c.bj && !c.bj.done)) return;
    S.cash -= b; c.net -= b; const g = c.bj = { bet: b, p: [bjCard(), bjCard()], d: [bjCard(), bjCard()], done: false, dbl: false, res: '' };
    const pb = bjTotal(g.p) === 21, db = bjTotal(g.d) === 21;
    if (pb || db) bjFinish(g, pb && db ? 'push' : pb ? 'bj' : 'lose');
    save(); refresh(); renderFeed();
  },
  bjHit() { const g = casS().bj; if (!g || g.done) return; g.p.push(bjCard()); const t = bjTotal(g.p); if (t > 21) bjFinish(g, 'lose'); else if (t === 21) bjDealerPlay(g); save(); refresh(); renderFeed(); },
  bjStand() { const g = casS().bj; if (!g || g.done) return; bjDealerPlay(g); save(); refresh(); renderFeed(); },
  bjDouble() {
    const g = casS().bj; if (!g || g.done || g.p.length !== 2 || S.cash < g.bet) return;
    S.cash -= g.bet; casS().net -= g.bet; g.bet *= 2; g.dbl = true; g.p.push(bjCard());
    if (bjTotal(g.p) > 21) bjFinish(g, 'lose'); else bjDealerPlay(g);
    save(); refresh(); renderFeed();
  },
  fxPick(v) {
    const c = casS(), [id, o] = v.split(':').map(Number), at = c.slip.findIndex(x => x[0] === id);
    if (at >= 0 && c.slip[at][1] === o) c.slip.splice(at, 1); else if (at >= 0) c.slip[at][1] = o; else c.slip.push([id, o]);
    refresh();
  },
  fxPlace() {
    const c = casS(), b = casBet(); if (!c.slip.length || b <= 0 || S.jail) return;
    S.cash -= b; c.net -= b;
    const legs = c.slip.map(([id, o]) => ({ f: c.fx[id], o, r: fxPlay(c.fx[id]) })), win = legs.every(l => l.r.w === l.o), odds = legs.reduce((m, l) => m * l.f.o[l.o], 1), pay = win ? Math.round(b * odds) : 0;
    S.cash += pay; c.net += pay; c.slip = [];
    c.sportMsg = win ? `✅ All ${legs.length} leg${legs.length > 1 ? 's' : ''} landed! +${fmt(pay - b)}` : `❌ Slip lost (${legs.filter(l => l.r.w === l.o).length}/${legs.length} legs). −${fmt(b)}`;
    casNote('Sports betting', pay - b); save(); refresh(); renderFeed();
  },
  fxNew() { const c = casS(); c.fx = fxGen(); c.slip = []; c.sportMsg = ''; refresh(); }
};
