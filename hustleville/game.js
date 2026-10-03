/* Hustleville — engine. Depends on data.js */
'use strict';

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const chance = (p) => Math.random() < p;
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const fmt = (n) => {
  const s = n < 0 ? '-' : ''; n = Math.abs(n);
  if (n >= 1e9) return s + '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return s + '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return s + '$' + (n / 1e3).toFixed(1) + 'K';
  return s + '$' + Math.round(n).toLocaleString();
};
const SAVE_KEY = 'hustleville-save-v1';

/* ---------- state ---------- */
let S = null;
const UI = { panel: null, sub: { money: 'jobs', crazy: 'crime' }, niche: 'fashion', filter: 'all', cat: 'home' };
let modalQueue = [];
let C = null; // active contract

function newLife() {
  const country = pick(COUNTRIES);
  let r = Math.random(), tier = 0;
  FAMILIES.forEach((f, i) => { if (r > 0) { r -= f.p; if (r <= 0) tier = i; } });
  const last = pick(LAST);
  const mom = { name: pick(FIRST) + ' ' + last, age: ri(22, 36), alive: true };
  const dad = { name: pick(FIRST) + ' ' + last, age: ri(23, 40), alive: true };
  S = {
    name: pick(FIRST) + ' ' + last, age: 0, alive: true, cause: '',
    country: country.n, flag: country.f, w: country.w, tier,
    cash: 0, happy: ri(65, 95), health: ri(70, 100), smarts: ri(20, 80), looks: ri(20, 90), fame: 0,
    job: null, jobYears: 0, deg: false, college: null,
    biz: [], assets: [], invest: { savings: 0, index: 0, crypto: 0 },
    candidate: null, partner: null, kids: [], mom, dad,
    jail: 0, record: 0, heat: 0, done: {}, ach: [], market: 1, log: [], peakNW: 0
  };
  S.log.push({ age: 0, items: [] });
  say('👶', `You were born in ${country.n} ${country.f} to a ${FAMILIES[tier].n} family.`, '');
  say('👨‍👩‍👦', `Your mother is ${mom.name} and your father is ${dad.name}.`, '');
  save();
}

function say(icon, text, cls = '') { S.log[S.log.length - 1].items.push({ i: icon, t: text, c: cls }); }
function famAllowance() { return FAMILIES[S.tier].base * S.w; }
function lifeCost() { return 8000 * Math.max(0.4, S.w); }
function ownedHome() { return S.assets.filter(a => a.cat === 'home').length > 0; }

/* ---------- derived numbers ---------- */
function jobDef() { return S.job ? JOBS.find(j => j.id === S.job) : null; }
function jobTier() { let t = 0; LADDER_YEARS.forEach((y, i) => { if (S.jobYears >= y) t = i; }); return t; }
function salary() {
  const j = jobDef(); if (!j) return 0;
  let p = j.pay * j.mult[jobTier()] * Math.max(0.5, S.w);
  if (S.college) p *= 0.5;
  return p;
}
function bizBase(b) { return BIZ[b.id].baseProfit * Math.pow(1.9, b.level - 1); }
function contractMult(c, trapActive) {
  const termBonus = { 1: 1, 3: 1.04, 5: 1.08 }[c.term] || 1;
  let m = (c.share / 60) * termBonus * (c.excl ? 1.15 : 1) * (c.fee ? 1 : 0.97);
  if (c.trapId && !c.trapStruck) m *= TRAPS.find(t => t.id === c.trapId).mult;
  return m;
}
function bizEstimate(b) {
  let m = contractMult(b.contract) * (1 - (b.dilution || 0));
  if (b.termLeft <= 0) m *= 0.7;
  return bizBase(b) * m * (0.85 + S.smarts / 400);
}
function bizValue(b) { return bizBase(b) * 4; }
function assetValue(a) { return a.value; }
function netWorth() {
  const inv = S.invest.savings + S.invest.index + S.invest.crypto;
  return S.cash + inv + S.biz.reduce((t, b) => t + bizValue(b), 0) + S.assets.reduce((t, a) => t + a.value, 0);
}
function stageIcon() {
  if (!S.alive) return '⚰️';
  if (netWorth() >= 1e9 || S.fame >= 80) return '👑';
  const a = S.age;
  return a < 4 ? '👶' : a < 13 ? '🧒' : a < 40 ? '🧑' : a < 65 ? '🧑‍🦱' : '👴';
}
function statusTitle() {
  const nw = netWorth();
  const w = nw < 1000 ? 'Broke' : nw < 50000 ? 'Getting by' : nw < 1e6 ? 'Comfortable' : nw < 1e7 ? 'Millionaire' : nw < 1e8 ? 'Multi-millionaire' : nw < 1e9 ? 'Centimillionaire' : 'Billionaire';
  const f = S.fame < 10 ? 'Unknown' : S.fame < 35 ? 'Local name' : S.fame < 65 ? 'Famous' : 'Global icon';
  return { w, f };
}
function occupation() {
  if (S.jail > 0) return 'In prison';
  if (S.college) return 'University student';
  const j = jobDef(); if (j) return j.ladder[jobTier()];
  if (S.biz.length) return 'Entrepreneur';
  return S.age < 6 ? 'Toddler' : S.age < 18 ? 'Student' : 'Unemployed';
}

/* ---------- achievements ---------- */
const ACH = [
  { id: 'firstbiz', t: 'Founder — start a business', ok: () => S.biz.length >= 1 },
  { id: 'tenbiz', t: 'Empire — own 10 businesses', ok: () => S.biz.length >= 10 },
  { id: 'mill', t: 'Millionaire', ok: () => netWorth() >= 1e6 },
  { id: 'bill', t: 'Billionaire', ok: () => netWorth() >= 1e9 },
  { id: 'married', t: 'Married', ok: () => S.partner && S.partner.married },
  { id: 'parent', t: 'Parent', ok: () => S.kids.length > 0 },
  { id: 'famous', t: 'Famous (fame 60+)', ok: () => S.fame >= 60 },
  { id: 'jet', t: 'Private jet owner', ok: () => S.assets.some(a => a.cat === 'plane') },
  { id: 'patek', t: 'Patek Philippe Grandmaster Chime', ok: () => S.assets.some(a => a.n.startsWith('Patek')) },
  { id: 'island', t: 'Private island', ok: () => S.assets.some(a => a.n === 'Private Island') },
  { id: 'jail', t: 'Jailbird', ok: () => S.record > 0 },
  { id: 'old', t: 'Lived to 90', ok: () => S.age >= 90 }
];
function checkAch() {
  ACH.forEach(a => { if (!S.ach.includes(a.id) && a.ok()) { S.ach.push(a.id); say('🏆', 'Achievement unlocked: ' + a.t, 'gold'); } });
}

/* ---------- save / load ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { S = JSON.parse(r); return true; } } catch (e) { /* ignore */ } return false; }

/* ---------- modals ---------- */
function showModal(m) {
  if ($('modal').classList.contains('open')) { modalQueue.push(m); return; }
  $('modalIcon').textContent = m.icon || '❗';
  $('modalTitle').textContent = m.title;
  $('modalText').innerHTML = m.text;
  const box = $('modalBtns'); box.innerHTML = '';
  (m.buttons || [{ t: 'OK' }]).forEach(b => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls || ''); el.textContent = b.t;
    el.onclick = () => { $('modal').classList.remove('open'); if (b.fn) b.fn(); refresh(); const n = modalQueue.shift(); if (n) setTimeout(() => showModal(n), 120); };
    box.appendChild(el);
  });
  $('modal').classList.add('open');
}
const modalOpen = () => $('modal').classList.contains('open') || $('contract').classList.contains('open');

/* ---------- random events ---------- */
const EVENTS = [
  { ok: s => s.age >= 8, run() { const a = Math.round(ri(100, 2000) * (1 + S.age / 30)); S.cash += a; say('💰', `You found an envelope with ${fmt(a)} in an old coat.`, 'good'); } },
  { ok: () => true, run() { const c = ri(300, 6000); S.health = clamp(S.health - ri(6, 22)); S.cash -= c; S.happy = clamp(S.happy - 4); say('🤒', `You fell ill and the hospital bill was ${fmt(c)}.`, 'bad'); } },
  { ok: s => s.age >= 18 && s.cash > 8000, run() {
    const amt = Math.min(5000, Math.round(S.cash * 0.2));
    showModal({ icon: '🤝', title: 'A friend needs help', text: `An old friend asks to borrow ${fmt(amt)}. They swear they will pay you back.`, buttons: [
      { t: 'Lend it', cls: 'gold', fn: () => { S.cash -= amt; if (chance(0.55)) { S.cash += amt * 1.3; say('🤝', `They paid you back with interest: +${fmt(amt * 0.3)}.`, 'good'); } else { say('🤝', `They vanished with your ${fmt(amt)}.`, 'bad'); S.happy = clamp(S.happy - 5); } } },
      { t: 'Say no', fn: () => say('🤝', 'You turned down your friend. Awkward.', '') }] });
  } },
  { ok: s => s.biz.length > 0, run() {
    const b = pick(S.biz); const d = BIZ[b.id]; const offer = Math.round(bizValue(b) * 0.35);
    showModal({ icon: '📈', title: 'Investor offer', text: `An angel investor offers <b>${fmt(offer)}</b> for 15% of <b>${d.name}</b> profits.`, buttons: [
      { t: 'Accept', cls: 'gold', fn: () => { S.cash += offer; b.dilution = Math.min(0.6, (b.dilution || 0) + 0.15); say('📈', `You sold 15% of ${d.name} for ${fmt(offer)}.`, 'good'); } },
      { t: 'Decline', fn: () => say('📈', `You turned down the investor for ${d.name}.`, '') }] });
  } },
  { ok: s => s.biz.length > 0, run() {
    const c = Math.round(netWorth() * 0.01) + 2000;
    showModal({ icon: '⚖️', title: 'Lawsuit!', text: `A disgruntled ex-contractor is suing your company. Settle for ${fmt(c)} or fight it in court?`, buttons: [
      { t: 'Settle', fn: () => { S.cash -= c; say('⚖️', `You settled the lawsuit for ${fmt(c)}.`, 'bad'); } },
      { t: 'Fight', cls: 'gold', fn: () => { if (chance(0.5)) { say('⚖️', 'You crushed them in court.', 'good'); S.fame += 2; } else { S.cash -= c * 2.5; say('⚖️', `You lost in court. Damages: ${fmt(c * 2.5)}.`, 'bad'); } } }] });
  } },
  { ok: s => s.age >= 13, run() { S.fame += 5; S.happy = clamp(S.happy + 5); say('🔥', 'Something you posted went viral overnight!', 'good'); } },
  { ok: s => s.age >= 18 && s.cash > 100, run() {
    showModal({ icon: '🎟️', title: 'Lottery ticket', text: 'A scratch ticket for $20. Feeling lucky?', buttons: [
      { t: 'Buy it', fn: () => { S.cash -= 20; if (chance(0.01)) { S.cash += 250000; say('🎟️', 'YOU WON $250,000 ON A SCRATCH TICKET!', 'gold'); } else say('🎟️', 'Not a winner.', ''); } },
      { t: 'Pass' }] });
  } },
  { ok: s => s.job && s.age >= 18, run() { if (chance(0.5)) { say('📉', `Layoffs hit your company. You lost your job as ${occupation()}.`, 'bad'); S.job = null; S.jobYears = 0; S.happy = clamp(S.happy - 8); } else { S.jobYears++; say('🌟', 'Your boss noticed your work. Fast-tracked toward a promotion.', 'good'); } } },
  { ok: s => s.age < 18 && s.tier >= 1, run() { const a = Math.round(famAllowance() * ri(1, 3)); S.cash += a; say('🎁', `Your parents gave you ${fmt(a)} for doing well.`, 'good'); } },
  { ok: s => s.age >= 17 && s.assets.some(a => a.cat === 'car'), run() { const c = ri(1000, 8000); S.cash -= c; S.health = clamp(S.health - ri(2, 10)); say('💥', `You were in a fender bender. Repairs cost ${fmt(c)}.`, 'bad'); } },
  { ok: s => s.age >= 8 && s.age <= 16, run() {
    showModal({ icon: '😠', title: 'Bully trouble', text: 'A kid at school keeps picking on you.', buttons: [
      { t: 'Stand up to them', fn: () => { if (chance(0.5)) { S.happy = clamp(S.happy + 8); say('😠', 'You stood up to the bully and earned respect.', 'good'); } else { S.health = clamp(S.health - 8); S.happy = clamp(S.happy - 6); say('😠', 'You got into a fight and lost.', 'bad'); } } },
      { t: 'Ignore it', fn: () => { S.happy = clamp(S.happy - 4); say('😠', 'You kept your head down.', ''); } }] });
  } },
  { ok: s => s.age >= 18 && s.cash > 1000, run() { if (chance(S.smarts / 120)) say('📞', 'A scammer called pretending to be your bank. You saw through it.', 'good'); else { const l = Math.round(S.cash * rnd(0.03, 0.15)); S.cash -= l; say('📞', `You fell for a scam and lost ${fmt(l)}.`, 'bad'); } } },
  { ok: s => s.age >= 18, run() { S.smarts = clamp(S.smarts + 4); S.happy = clamp(S.happy + 3); say('🧠', 'A mentor took you under their wing and taught you a ton.', 'good'); } },
  { ok: s => netWorth() > 1e6, run() { const t = Math.round(S.cash * 0.03); S.cash -= t; say('🧾', `Tax audit. You paid ${fmt(t)} in back taxes.`, 'bad'); } }
];

/* ---------- the year ---------- */
function ageUp() {
  if (!S.alive || modalOpen()) return;
  S.age++; S.done = {};
  S.log.push({ age: S.age, items: [] });
  let income = 0, expense = 0, bizProfit = 0;

  // family
  [S.mom, S.dad].forEach(p => { if (p.alive) { p.age++; if (p.age > 62 && chance(0.00003 * Math.exp(0.1 * p.age))) { p.alive = false; const inh = Math.round(FAMILIES[S.tier].base * S.w * 60 / 2); S.cash += inh; S.happy = clamp(S.happy - 15); say('🕊️', `Your ${p === S.mom ? 'mother' : 'father'} ${p.name} passed away. You inherited ${fmt(inh)}.`, 'bad'); } } });
  if (S.age < 18) { const a = Math.round(famAllowance()); S.cash += a; income += a; }
  if (S.age === 6) say('🏫', 'You started school.', '');
  if (S.age === 14) say('🧑', 'You\'re a teenager now. Entry-level jobs are open to you.', '');
  if (S.age === 18) say('🎉', 'You turned 18. Real life starts now.', 'gold');

  // school / college
  if (S.age >= 6 && S.age < 18 && !S.college) S.smarts = clamp(S.smarts + ri(0, 3));
  if (S.college) {
    S.college.years++; S.smarts = clamp(S.smarts + ri(3, 6));
    const tuition = Math.round(10000 * Math.max(0.4, S.w));
    if (S.tier >= 3) say('🎓', `University year ${S.college.years}. Your parents covered tuition.`, ''); else { S.cash -= tuition; expense += tuition; say('🎓', `University year ${S.college.years}. Tuition: ${fmt(tuition)}.`, ''); }
    if (S.college.years >= 4) { S.college = null; S.deg = true; say('🎓', 'You graduated with a bachelor\'s degree!', 'gold'); S.happy = clamp(S.happy + 10); }
  }

  // jail
  if (S.jail > 0) { S.jail--; S.happy = clamp(S.happy - 8); S.health = clamp(S.health - 3); say('⛓️', S.jail > 0 ? `Another year behind bars. ${S.jail} left.` : 'You were released from prison.', 'bad'); }

  // job
  if (S.job && S.jail === 0 && S.age >= 14) {
    const gross = salary(); const net = gross * 0.85;
    S.cash += net; income += net; S.jobYears++;
    const prev = jobTier();
    say('💼', `You earned ${fmt(net)} as ${occupation()} (after tax).`, 'good');
    if (LADDER_YEARS.includes(S.jobYears) && jobTier() > 0) say('📈', `Promotion! You are now ${jobDef().ladder[jobTier()]}.`, 'gold');
  }

  // market
  const r = Math.random(); S.market = r < 0.15 ? 1.3 : r > 0.82 ? 0.7 : 1;
  if (S.biz.length && S.market !== 1) say(S.market > 1 ? '📈' : '📉', S.market > 1 ? 'The market is booming this year.' : 'A recession is squeezing business.', S.market > 1 ? 'good' : 'bad');

  // businesses
  S.biz.forEach(b => {
    const d = BIZ[b.id]; const c = b.contract;
    let p = bizEstimate(b) * S.market * rnd(0.75, 1.25);
    if (S.jail > 0) p *= 0.5;
    if (chance(0.1 * d.risk) && S.market < 1.3) p = -bizBase(b) * 0.3;
    if (c.trapId && !c.trapStruck && !c.revealed) { c.revealed = true; say('😬', `The fine print bit you: ${TRAPS.find(t => t.id === c.trapId).text.split(':')[0]} is cutting into ${d.name}.`, 'bad'); }
    if (c.trapId === 'latepenalty' && !c.trapStruck && chance(0.2)) { const f = Math.round(d.cost * 0.25); S.cash -= f; say('😬', `Late-delivery penalty at ${d.name}: ${fmt(f)}.`, 'bad'); }
    const net = p > 0 ? p * 0.8 : p; S.cash += net; income += Math.max(0, net); bizProfit += p;
    say(d.icon, `${d.name} ${p >= 0 ? 'made' : 'lost'} ${fmt(Math.abs(net))}${p > 0 ? ' after tax' : ''}.`, p >= 0 ? 'good' : 'bad');
    if (b.termLeft > 0) { b.termLeft--; if (b.termLeft === 0) {
      if (c.trapId === 'autorenew' && !c.trapStruck) { b.termLeft = 3; say('😬', `The auto-renew clause locked ${d.name} in for 3 more years on bad terms.`, 'bad'); }
      else say('📄', `Your contract for ${d.name} expired. Renew it in Money → Business or profits drop 30%.`, 'bad'); } }
  });
  if (bizProfit > 1e8) S.fame += 4; else if (bizProfit > 1e7) S.fame += 3; else if (bizProfit > 1e6) S.fame += 2; else if (bizProfit > 1e5) S.fame += 1;

  // investments
  const iv = S.invest;
  const gain = (k, mu, sd) => { const g = Math.max(-0.9, mu + sd * gauss()); const d = iv[k] * g; iv[k] += d; return d; };
  if (iv.savings + iv.index + iv.crypto > 0) {
    const t = gain('savings', 0.03, 0) + gain('index', 0.08, 0.16) + gain('crypto', 0.15, 0.7);
    say('📊', `Your investments ${t >= 0 ? 'gained' : 'lost'} ${fmt(Math.abs(t))}.`, t >= 0 ? 'good' : 'bad');
  }

  // living costs & assets
  if (S.age >= 22) {
    const living = lifeCost(), rent = ownedHome() ? 0 : 10000 * Math.max(0.4, S.w);
    S.cash -= living + rent; expense += living + rent;
    say('🧾', `Living costs${rent ? ' and rent' : ''}: ${fmt(living + rent)}.`, '');
  }
  let up = 0;
  S.assets.forEach(a => { up += a.price * a.up; a.value = Math.max(a.price * 0.02, a.value * (1 + a.dep)); });
  if (up > 0) { S.cash -= up; expense += up; say('🧾', `Upkeep on your assets: ${fmt(up)}.`, ''); }
  S.kids.forEach(k => { k.age++; if (k.age < 18) { const c = 8000 * Math.max(0.4, S.w); S.cash -= c; expense += c; } });
  if (S.kids.some(k => k.age < 18)) say('🧒', 'Raising your kids costs you, but it\'s worth it.', '');
  if (S.cash < 0) { const i = -S.cash * 0.08; S.cash -= i; say('🏦', `You are in debt. Interest charged: ${fmt(i)}.`, 'bad'); }

  // partner
  if (S.partner) {
    const p = S.partner; p.age++; p.years++; p.score = clamp(p.score + ri(-9, 3));
    if (p.score <= 0) { say('💔', `${p.name} left you. The relationship fell apart.`, 'bad'); S.happy = clamp(S.happy - 15); S.partner = null; }
    else if (p.score < 30) say('💔', `Things are rocky with ${p.name}. Spend time with them.`, 'bad');
  }

  // stat drift
  S.fame = Math.max(0, S.fame * 0.93);
  S.heat = Math.floor(S.heat / 2);
  const ageHealth = S.age > 45 ? ri(1, 4) : S.age > 30 ? ri(0, 2) : 0;
  S.health = clamp(S.health - ageHealth + (S.cash > 50000 ? 1 : 0) + (S.age < 40 ? ri(0, 3) : 0));
  if (S.age > 30) S.looks = clamp(S.looks - ri(0, 2));
  S.happy = clamp(S.happy + (S.cash > 5000 ? 1 : -2) + ri(-3, 3));

  // random event
  if (chance(0.55)) { const pool = EVENTS.filter(e => e.ok(S)); if (pool.length) pick(pool).run(); }

  // education choice at 18
  if (S.age === 18 && !S.college && !S.deg) {
    const tuition = fmt(10000 * Math.max(0.4, S.w));
    showModal({ icon: '🎓', title: 'University?', text: `You can study for 4 years (${S.tier >= 3 ? 'your parents will pay' : tuition + '/year, paid from your cash'}). It unlocks degree-only careers and boosts Smarts, but you earn half pay while studying.`, buttons: [
      { t: 'Go to university', cls: 'gold', fn: () => { S.college = { years: 0 }; say('🎓', 'You enrolled at university.', 'gold'); } },
      { t: 'Start working', fn: () => say('💼', 'You decided to skip university and head straight into the real world.', '') }] });
  }

  if (!S.log[S.log.length - 1].items.length) say('🗓️', S.age < 6 ? pick(['You learned to walk and talk.', 'You played with your toys.', 'You made a mess. Everyone thought it was cute.']) : pick(['A quiet year. Nothing much happened.', 'Life went on as usual.', 'You kept your head down and got through the year.']), '');

  // death
  const p = 0.00003 * Math.exp(0.1 * S.age) * (2.5 - 1.5 * S.health / 100);
  if (S.health <= 0 || (S.age > 30 && chance(p)) || chance(0.0004)) die();

  checkAch();
  S.peakNW = Math.max(S.peakNW, netWorth());
  save(); refresh(); renderFeed();
}

function die() {
  S.alive = false;
  S.cause = S.health <= 0 ? 'poor health' : S.age > 70 ? 'natural causes' : pick(['an unexpected accident', 'a sudden illness', 'a heart attack']);
  say('⚰️', `You died at ${S.age} from ${S.cause}.`, 'bad');
  const nw = netWorth();
  const heirs = S.kids.length ? `Your ${S.kids.length} kid${S.kids.length > 1 ? 's' : ''} inherited ${fmt(nw)}.` : 'You left no heirs.';
  save();
  setTimeout(() => showModal({ icon: '⚰️', title: `${S.name} (${S.age})`, text: `Cause: ${S.cause}.<br>Final net worth: <b>${fmt(nw)}</b> · Peak: ${fmt(S.peakNW)}<br>Fame: ${Math.round(S.fame)} · Businesses: ${S.biz.length} · Kids: ${S.kids.length}<br>Achievements: ${S.ach.length}/${ACH.length}<br>${heirs}`, buttons: [{ t: '👶 Be reborn', cls: 'gold', fn: () => { newLife(); closePanel(); refresh(); renderFeed(); } }] }), 200);
}

/* ---------- rendering ---------- */
function renderFeed() {
  $('feed').innerHTML = S.log.slice(-25).map(y => `<div class="yr"><h4>${y.age === 0 ? '👶 Born' : 'Age ' + y.age}</h4>${y.items.map(i => `<p class="${i.c}"><span>${i.i}</span><em>${i.t}</em></p>`).join('')}</div>`).join('');
  $('feed').scrollTop = $('feed').scrollHeight;
}
function bar(label, v, cls) { return `<div class="sb"><label>${label}</label><div class="bar"><i class="${cls}" style="width:${clamp(v)}%"></i></div><b>${Math.round(clamp(v))}</b></div>`; }
function refresh() {
  if (!S) return;
  const t = statusTitle();
  $('avatar').textContent = stageIcon();
  $('pname').textContent = S.name;
  $('psub').textContent = `${S.flag} Age ${S.age} · ${occupation()}`;
  $('cash').textContent = fmt(S.cash);
  $('cash').className = S.cash < 0 ? 'neg' : '';
  $('nw').textContent = `${t.w} · ${t.f}`;
  $('stats').innerHTML = bar('😊 Happy', S.happy, 'g') + bar('❤️ Health', S.health, 'r') + bar('🧠 Smarts', S.smarts, 'b') + bar('✨ Looks', S.looks, 'y');
  $('ageBtn').disabled = !S.alive;
  document.querySelectorAll('.tabs [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === UI.panel));
  if (UI.panel) renderPanel();
}

/* ---------- panels ---------- */
function openPanel(name) { UI.panel = name; $('sheet').classList.add('open'); refresh(); }
function closePanel() { UI.panel = null; $('sheet').classList.remove('open'); refresh(); }
function tabs(group, list) { return `<div class="subtabs">${list.map(([k, l]) => `<button class="${UI.sub[group] === k ? 'on' : ''}" data-a="sub" data-g="${group}" data-v="${k}">${l}</button>`).join('')}</div>`; }
const locked = () => S.jail > 0 ? `<div class="note bad">⛓️ You are in prison for ${S.jail} more year(s). Most actions are unavailable.</div>` : '';

function renderPanel() {
  const T = { money: ['💰 Money', moneyHTML], love: ['❤️ Love & Family', loveHTML], crazy: ['😈 Crazy', crazyHTML], status: ['👑 Status', statusHTML] }[UI.panel];
  $('sheetTitle').textContent = T[0];
  const y = $('sheetBody').scrollTop;
  $('sheetBody').innerHTML = locked() + T[1]();
  $('sheetBody').scrollTop = y;
}

function moneyHTML() {
  const sub = UI.sub.money;
  const head = tabs('money', [['jobs', '💼 Jobs'], ['biz', '🏢 Business'], ['assets', '🛍️ Assets'], ['invest', '📊 Invest']]);
  return head + ({ jobs: jobsHTML, biz: bizHTML, assets: assetsHTML, invest: investHTML }[sub])();
}

function jobsHTML() {
  const j = jobDef();
  let h = '';
  if (S.college) h += `<div class="note">🎓 In university: year ${S.college.years}/4. Part-time jobs pay half.</div>`;
  if (j) h += `<div class="card gold"><b>${j.icon} ${j.ladder[jobTier()]}</b><br>Salary: ${fmt(salary())}/yr · ${S.jobYears} yrs experience<br><button class="btn sm" data-a="quit">Quit job</button></div>`;
  h += '<h5>Entry-level & careers</h5>';
  JOBS.forEach(d => {
    const ok = S.age >= d.minAge && S.smarts >= d.smarts && (!d.deg || S.deg);
    const why = S.age < d.minAge ? `Age ${d.minAge}+` : S.smarts < d.smarts ? `Smarts ${d.smarts}+` : d.deg && !S.deg ? 'Degree required' : '';
    h += `<div class="row"><span class="ic">${d.icon}</span><div class="grow"><b>${d.ladder[0]}</b> ${d.online ? '<i class="tag">online</i>' : ''}<small>${fmt(d.pay * Math.max(0.5, S.w))}/yr → ${fmt(d.pay * d.mult[3] * Math.max(0.5, S.w))} at the top</small></div><button class="btn sm" ${ok && S.job !== d.id && !S.jail ? '' : 'disabled'} data-a="apply" data-v="${d.id}">${why || (S.job === d.id ? 'Current' : 'Apply')}</button></div>`;
  });
  return h;
}

function bizHTML() {
  let h = '';
  if (S.biz.length) {
    h += '<h5>Your businesses</h5>';
    S.biz.forEach((b, i) => {
      const d = BIZ[b.id]; const c = b.contract;
      const up = Math.round(d.cost * Math.pow(2, b.level - 1) * 1.5);
      h += `<div class="card"><b>${d.icon} ${d.name}</b> <i class="tag">${d.online ? 'online' : 'offline'}</i><br><small>${d.nicheName} · ${d.modelName} · Level ${b.level}/10</small><br>Est. profit <b class="g">${fmt(bizEstimate(b))}/yr</b> · Value ${fmt(bizValue(b))}<br><small>📄 ${c.cp} · ${c.share}% share · ${b.termLeft > 0 ? b.termLeft + ' yr left' : '<b class="bad">EXPIRED</b>'}${c.excl ? ' · exclusive' : ''}${c.trapId && !c.trapStruck ? ' · ⚠️ fine print' : ''}</small><div class="btns">
        <button class="btn sm gold" ${b.level < 10 && S.cash >= up ? '' : 'disabled'} data-a="upgrade" data-v="${i}">⬆️ Level up ${b.level < 10 ? fmt(up) : 'MAX'}</button>
        <button class="btn sm" data-a="renew" data-v="${i}">📄 ${b.termLeft > 0 ? 'Re-negotiate' : 'Renew'}</button>
        <button class="btn sm" data-a="sell" data-v="${i}">Sell ${fmt(bizValue(b) * 0.8)}</button></div></div>`;
    });
  }
  h += '<h5>Start a business — pick a niche</h5><div class="chips">' + NICHES.map(n => `<button class="${UI.niche === n.id ? 'on' : ''}" data-a="niche" data-v="${n.id}">${n.icon}<small>${n.n}</small></button>`).join('') + '</div>';
  h += `<div class="chips f">${['all', 'online', 'offline'].map(f => `<button class="${UI.filter === f ? 'on' : ''}" data-a="filter" data-v="${f}">${f}</button>`).join('')}</div>`;
  Object.keys(MODELS).map(m => BIZ[UI.niche + ':' + m]).filter(d => UI.filter === 'all' || (UI.filter === 'online') === d.online).forEach(d => {
    const owned = S.biz.some(b => b.id === d.id);
    h += `<div class="row"><span class="ic">${d.icon}</span><div class="grow"><b>${d.name}</b> <i class="tag">${d.online ? 'online' : 'offline'}</i><small>${d.modelName} · startup ${fmt(d.cost)} · ~${fmt(d.baseProfit)}/yr</small></div><button class="btn sm gold" ${owned || S.cash < d.cost || S.age < 16 || S.jail || S.biz.length >= 12 ? 'disabled' : ''} data-a="start" data-v="${d.id}">${owned ? 'Owned' : '✍️ Sign'}</button></div>`;
  });
  if (S.age < 16) h += '<div class="note">You must be 16+ to sign contracts.</div>';
  return h;
}

function assetsHTML() {
  let h = '<div class="chips f">' + Object.keys(ASSETS).map(k => `<button class="${UI.cat === k ? 'on' : ''}" data-a="cat" data-v="${k}">${ASSETS[k].icon} ${ASSETS[k].label}</button>`).join('') + '</div>';
  const owned = S.assets.map((a, i) => ({ a, i })).filter(x => x.a.cat === UI.cat);
  if (owned.length) h += '<h5>You own</h5>' + owned.map(({ a, i }) => `<div class="row"><span class="ic">${a.icon}</span><div class="grow"><b>${a.n}</b><small>Worth ${fmt(a.value)}${a.up ? ' · upkeep ' + fmt(a.price * a.up) + '/yr' : ''}</small></div><button class="btn sm" data-a="sellAsset" data-v="${i}">Sell</button></div>`).join('');
  h += '<h5>Shop</h5>';
  ASSETS[UI.cat].items.forEach((it, i) => {
    h += `<div class="row"><span class="ic">${it.icon}</span><div class="grow"><b>${it.n}</b><small>${fmt(it.price)}${it.up ? ' · upkeep ' + fmt(it.price * it.up) + '/yr' : ''}${it.looks ? ' · +' + it.looks + ' looks' : ''}</small></div><button class="btn sm gold" ${S.cash >= it.price && !S.jail ? '' : 'disabled'} data-a="buy" data-v="${i}">Buy</button></div>`;
  });
  return h;
}

function investHTML() {
  const rows = [['savings', '🏦', 'Savings account', '~3%/yr, safe'], ['index', '📈', 'Index fund', '~8%/yr, moderate swings'], ['crypto', '🪙', 'Crypto', '~15%/yr, wild swings']];
  return '<div class="note">Returns are applied each time you age up.</div>' + rows.map(([k, ic, n, d]) => `<div class="card"><b>${ic} ${n}</b> <small>${d}</small><br>Balance: <b>${fmt(S.invest[k])}</b><div class="btns"><button class="btn sm" data-a="inv" data-v="${k}:0.1">+10% cash</button><button class="btn sm" data-a="inv" data-v="${k}:0.5">+50% cash</button><button class="btn sm" data-a="inv" data-v="${k}:1">All in</button><button class="btn sm" data-a="wd" data-v="${k}">Withdraw</button></div></div>`).join('');
}

function loveHTML() {
  let h = '';
  const p = S.partner;
  if (p) {
    h += `<div class="card gold"><b>${p.married ? '💍' : '❤️'} ${p.name}</b> (${p.age}) · ${p.trait}<br>${p.married ? 'Married' : 'Dating'} for ${p.years} yr · Relationship ${bar('', p.score, 'r')}<div class="btns">
      <button class="btn sm" ${S.done.date || S.cash < 200 ? 'disabled' : ''} data-a="date">🍷 Date night $200</button>
      <button class="btn sm" ${S.done.gift || S.cash < 1000 ? 'disabled' : ''} data-a="gift">🎁 Gift $1K</button>
      ${p.married ? '' : '<button class="btn sm gold" data-a="propose">💍 Propose + wedding $20K</button>'}
      <button class="btn sm" ${S.age < 20 || S.age > 48 || S.kids.length >= 6 ? 'disabled' : ''} data-a="baby">👶 Have a child</button>
      <button class="btn sm" data-a="breakup">${p.married ? 'Divorce (lose half)' : 'Break up'}</button></div></div>`;
  } else if (S.age < 18) h += '<div class="note">Dating unlocks at 18.</div>';
  else if (S.candidate) {
    const c = S.candidate;
    h += `<div class="card"><b>🙂 ${c.name}</b> (${c.age}) · ${c.trait}<br>Looks ${c.looks}<div class="btns"><button class="btn sm gold" data-a="askout">Ask out</button><button class="btn sm" data-a="pass">Pass</button></div></div>`;
  } else h += `<div class="card"><b>Single</b><br><button class="btn sm gold" ${S.done.meet ? 'disabled' : ''} data-a="meet">🔍 Meet someone</button></div>`;
  if (S.kids.length) h += '<h5>Kids</h5>' + S.kids.map(k => `<div class="row"><span class="ic">${k.age < 4 ? '👶' : k.age < 13 ? '🧒' : '🧑'}</span><div class="grow"><b>${k.name}</b><small>Age ${k.age}</small></div></div>`).join('');
  h += '<h5>Parents</h5>' + [['Mom', S.mom, 'mom'], ['Dad', S.dad, 'dad']].map(([l, pp, k]) => `<div class="row"><span class="ic">${pp.alive ? '🧓' : '🕊️'}</span><div class="grow"><b>${l}: ${pp.name}</b><small>${pp.alive ? 'Age ' + pp.age : 'Passed away'}</small></div>${pp.alive ? `<button class="btn sm" ${S.done[k] ? 'disabled' : ''} data-a="call" data-v="${k}">📞 Call</button>` : ''}</div>`).join('');
  return h;
}

function crazyHTML() {
  const head = tabs('crazy', [['crime', '😈 Crime'], ['fun', '🎢 Crazy stuff']]);
  if (UI.sub.crazy === 'fun') return head + ACTIVITIES.map(a => `<div class="row"><span class="ic">${a.icon}</span><div class="grow"><b>${a.n}</b><small>${a.cost ? fmt(a.cost) : 'Free'}</small></div><button class="btn sm" ${S.age >= a.minAge && S.cash >= a.cost && !S.done[a.id] && !S.jail ? '' : 'disabled'} data-a="fun" data-v="${a.id}">${S.age < a.minAge ? a.minAge + '+' : S.done[a.id] ? 'Done' : 'Do it'}</button></div>`).join('');
  return head + `<div class="note">Heat: ${S.heat} · Record: ${S.record} arrest(s). Higher heat means more risk. Heat halves each year.</div>` + CRIMES.map(c => {
    const why = S.age < c.minAge ? c.minAge + '+' : c.smarts && S.smarts < c.smarts ? 'Smarts ' + c.smarts : c.biz && !S.biz.length ? 'Needs business' : c.cash && S.cash < c.cash ? 'Needs cash' : '';
    return `<div class="row"><span class="ic">${c.icon}</span><div class="grow"><b>${c.n}</b><small>${fmt(c.reward[0])}–${fmt(c.reward[1])} · risk ~${Math.round((c.risk + S.heat * 0.03) * 100)}%</small></div><button class="btn sm bad" ${why || S.jail ? 'disabled' : ''} data-a="crime" data-v="${c.id}">${why || 'Try'}</button></div>`;
  }).join('');
}

function statusHTML() {
  const t = statusTitle(); const nw = netWorth();
  const power = Math.round(clamp(Math.log10(Math.max(10, nw)) * 10 + S.biz.length * 3 + S.fame * 0.3 - 20));
  return `<div class="card gold"><b>${stageIcon()} ${S.name}</b><br>${S.flag} ${S.country} · born into a ${FAMILIES[S.tier].n} family<br>Net worth <b>${fmt(nw)}</b> (${t.w})</div>
    ${bar('👑 Fame', S.fame, 'y')}${bar('⚡ Power', power, 'b')}${bar('😊 Happy', S.happy, 'g')}${bar('❤️ Health', S.health, 'r')}
    <h5>Achievements ${S.ach.length}/${ACH.length}</h5>` + ACH.map(a => `<div class="row"><span class="ic">${S.ach.includes(a.id) ? '🏆' : '🔒'}</span><div class="grow ${S.ach.includes(a.id) ? '' : 'dim'}"><b>${a.t}</b></div></div>`).join('') +
    `<h5>Life</h5><button class="btn sm bad" data-a="restart">Start a new life</button>`;
}

/* ---------- actions ---------- */
const A = {
  sub(v, el) { UI.sub[el.dataset.g] = v; refresh(); },
  niche(v) { UI.niche = v; refresh(); }, filter(v) { UI.filter = v; refresh(); }, cat(v) { UI.cat = v; refresh(); },
  apply(id) {
    const d = JOBS.find(j => j.id === id);
    if (chance(0.8 + S.smarts / 500)) { S.job = id; S.jobYears = 0; say('💼', `You were hired as ${d.ladder[0]}.`, 'good'); } else say('💼', `Your application for ${d.ladder[0]} was rejected.`, 'bad');
    save(); refresh(); renderFeed();
  },
  quit() { say('💼', `You quit your job as ${occupation()}.`, ''); S.job = null; S.jobYears = 0; save(); refresh(); renderFeed(); },
  start(id) { openContract(id, 'start'); },
  renew(i) { openContract(S.biz[i].id, 'renew', i); },
  upgrade(i) {
    const b = S.biz[i]; const up = Math.round(BIZ[b.id].cost * Math.pow(2, b.level - 1) * 1.5);
    if (S.cash < up) return; S.cash -= up; b.level++; say(BIZ[b.id].icon, `You expanded ${BIZ[b.id].name} to level ${b.level}.`, 'good'); S.fame += 0.5; checkAch(); save(); refresh(); renderFeed();
  },
  sell(i) {
    const b = S.biz[i]; let v = bizValue(b) * 0.8;
    if (b.termLeft > 0 && b.contract.fee) { const f = BIZ[b.id].cost * 0.3; v -= f; say('📄', `Early termination fee: ${fmt(f)}.`, 'bad'); }
    S.cash += v; say('🤝', `You sold ${BIZ[b.id].name} for ${fmt(v)}.`, ''); S.biz.splice(i, 1); save(); refresh(); renderFeed();
  },
  buy(i) {
    const it = ASSETS[UI.cat].items[i]; if (S.cash < it.price) return;
    S.cash -= it.price; S.assets.push({ cat: UI.cat, n: it.n, icon: it.icon, price: it.price, up: it.up, dep: it.dep, value: it.price });
    S.happy = clamp(S.happy + it.happy); S.fame += it.fame || 0; S.looks = clamp(S.looks + (it.looks || 0));
    say(it.icon, `You bought a ${it.n} for ${fmt(it.price)}.`, 'gold'); checkAch(); save(); refresh(); renderFeed();
  },
  sellAsset(i) { const a = S.assets[i]; const v = a.value * 0.9; S.cash += v; say(a.icon, `You sold your ${a.n} for ${fmt(v)}.`, ''); S.assets.splice(i, 1); save(); refresh(); renderFeed(); },
  inv(v) { const [k, p] = v.split(':'); const amt = Math.max(0, S.cash) * parseFloat(p); if (amt < 1) return; S.cash -= amt; S.invest[k] += amt; save(); refresh(); },
  wd(k) { S.cash += S.invest[k]; S.invest[k] = 0; save(); refresh(); },
  meet() {
    S.done.meet = true;
    S.candidate = { name: pick(FIRST) + ' ' + pick(LAST), age: Math.max(18, S.age + ri(-4, 4)), looks: ri(20, 95), trait: pick(['funny', 'ambitious', 'shy', 'adventurous', 'kind', 'creative', 'serious']) };
    refresh();
  },
  pass() { S.candidate = null; refresh(); },
  askout() {
    const c = S.candidate; const p = 0.25 + S.looks / 250 + S.fame / 200 + Math.min(0.2, Math.log10(Math.max(10, netWorth())) / 40);
    S.candidate = null;
    if (chance(p)) { S.partner = { name: c.name, age: c.age, trait: c.trait, looks: c.looks, score: ri(45, 65), years: 0, married: false }; say('❤️', `${c.name} said yes! You're dating.`, 'gold'); }
    else say('💔', `${c.name} turned you down.`, 'bad');
    save(); refresh(); renderFeed();
  },
  date() { S.cash -= 200; S.done.date = true; S.partner.score = clamp(S.partner.score + ri(8, 15)); S.happy = clamp(S.happy + 4); say('🍷', `Date night with ${S.partner.name}.`, 'good'); save(); refresh(); renderFeed(); },
  gift() { S.cash -= 1000; S.done.gift = true; S.partner.score = clamp(S.partner.score + ri(8, 14)); say('🎁', `You surprised ${S.partner.name} with a gift.`, 'good'); save(); refresh(); renderFeed(); },
  propose() {
    const p = S.partner;
    if (p.score < 55) { say('💔', `${p.name} wasn't ready. They said no.`, 'bad'); p.score = clamp(p.score - 10); }
    else if (S.cash < 20000) { say('💍', 'You need $20K for the wedding.', 'bad'); }
    else { S.cash -= 20000; p.married = true; p.score = clamp(p.score + 15); S.happy = clamp(S.happy + 12); say('💍', `You married ${p.name}!`, 'gold'); checkAch(); }
    save(); refresh(); renderFeed();
  },
  baby() { if (chance(0.7)) { const k = { name: pick(FIRST), age: 0 }; S.kids.push(k); S.happy = clamp(S.happy + 10); say('👶', `${S.partner.name} and you welcomed a baby: ${k.name}!`, 'gold'); checkAch(); } else say('👶', 'You tried for a baby, but no luck this year.', ''); save(); refresh(); renderFeed(); },
  breakup() {
    const p = S.partner;
    if (p.married) { const l = Math.max(0, S.cash) / 2; S.cash -= l; say('💔', `You divorced ${p.name}. They took ${fmt(l)}.`, 'bad'); } else say('💔', `You broke up with ${p.name}.`, '');
    S.happy = clamp(S.happy - 10); S.partner = null; save(); refresh(); renderFeed();
  },
  call(k) { S.done[k] = true; S.happy = clamp(S.happy + 3); say('📞', `You called ${k === 'mom' ? 'Mom' : 'Dad'}. It felt good.`, 'good'); save(); refresh(); renderFeed(); },
  crime(id) {
    const c = CRIMES.find(x => x.id === id); const caught = c.risk + S.heat * 0.03 - S.smarts / 500;
    S.heat += 2;
    if (chance(caught)) {
      const yrs = ri(c.jail[0], c.jail[1]);
      if (yrs === 0) { const f = Math.max(500, Math.round(Math.max(0, S.cash) * 0.05)); S.cash -= f; say('🚔', `You got caught (${c.n}) and paid a ${fmt(f)} fine.`, 'bad'); }
      else { S.jail = yrs; S.record++; S.job = null; S.jobYears = 0; S.fame = Math.max(0, S.fame - 5); say('🚔', `Busted for "${c.n}"! Sentenced to ${yrs} year(s) in prison.`, 'bad'); checkAch(); }
    } else { const g = Math.round(rnd(c.reward[0], c.reward[1])); S.cash += g; say(c.icon, `You got away with it: ${c.n}. +${fmt(g)}.`, 'gold'); }
    save(); refresh(); renderFeed();
  },
  fun(id) {
    const a = ACTIVITIES.find(x => x.id === id); S.done[id] = true; S.cash -= a.cost;
    const r = a.run(S);
    S.happy = clamp(S.happy + (r.happy || 0)); S.health = clamp(S.health + (r.health || 0)); S.smarts = clamp(S.smarts + (r.smarts || 0)); S.looks = clamp(S.looks + (r.looks || 0)); S.fame = Math.max(0, S.fame + (r.fame || 0)); S.cash += r.cash || 0;
    say(a.icon, r.msg, (r.health < 0 || r.looks < 0 || r.happy < 0) ? 'bad' : 'good');
    if (S.health <= 0) die();
    save(); refresh(); renderFeed();
  },
  restart() { showModal({ icon: '⚠️', title: 'Start over?', text: 'This ends your current life and starts a new one.', buttons: [{ t: 'New life', cls: 'bad', fn: () => { newLife(); closePanel(); renderFeed(); refresh(); } }, { t: 'Cancel' }] }); }
};

/* ---------- immersive contract signing ---------- */
const REP_LINES = {
  open: ['Let\'s keep this quick. I have another meeting at three.', 'Read it carefully. Or don\'t. Most people don\'t.', 'Standard terms. Take it or leave it.'],
  win: ['Fine. You drive a hard bargain.', 'Hmm. I can move a little on that.', 'Alright, but this is my final concession.'],
  lose: ['No. That is non-negotiable.', 'Don\'t push your luck, kid.', 'My legal team would never allow it.'],
  magnify: ['You are actually reading it? ...Impressive.', 'Nothing to see in the small print. Really.']
};

function openContract(defId, mode, idx) {
  const d = BIZ[defId]; const m = MODELS[d.model];
  const old = mode === 'renew' ? S.biz[idx] : null;
  C = {
    d, mode, idx, cp: pick(COMPANIES) + ' ' + pick(['Ltd.', 'LLC', 'GmbH', 'Inc.', 'S.A.']), rep: pick(REPS),
    share: 55, term: 3, excl: false, fee: true, trapId: chance(0.8) ? pick(TRAPS).id : null, trapRead: false, trapStruck: false,
    tension: 0, ink: 0, say: pick(REP_LINES.open), level: old ? old.level : 1, dilution: old ? old.dilution : 0, cost: mode === 'start' ? d.cost : 0
  };
  $('contract').classList.add('open');
  $('cDesk').innerHTML = `
    <div class="rep"><span class="face">🧑‍💼</span><div class="bubble" id="cSay"></div></div>
    <div class="paper">
      <div class="lh"><b>${C.cp}</b><span class="seal">⚖️</span></div>
      <h3>${m.kind.toUpperCase()}</h3>
      <p class="pre">This Agreement is entered into between <b>${S.name}</b> ("Operator") and <b>${C.cp}</b> ("${m.partner}"), represented by ${C.rep}, for the operation of <b>${d.name}</b> (${d.nicheName}).</p>
      <div id="cClauses"></div>
      <div id="cFine"></div>
      <div class="sig"><canvas id="cCanvas" width="600" height="120"></canvas><span class="x">✗</span><button class="link" id="cClear">clear</button></div>
      <div class="stamp" id="cStamp">SIGNED</div>
    </div>
    <div class="deskbar"><div id="cSum"></div><div class="btns"><button class="btn" id="cWalk">Walk away</button><button class="btn gold" id="cSign">✍️ Sign</button></div></div>`;
  $('cSay').textContent = C.say;
  drawContract(); setupSignature();
  $('cWalk').onclick = () => closeContract();
  $('cSign').onclick = signContract;
}
function closeContract() { $('contract').classList.remove('open'); C = null; refresh(); }
function repSay(t) { C.say = t; $('cSay').textContent = t; }

function drawContract() {
  const c = C; const trap = TRAPS.find(t => t.id === c.trapId);
  $('cClauses').innerHTML = `<ol>
    <li><b>Revenue share.</b> Operator retains <span class="chip">${c.share}%</span> of net revenue. <button class="link" data-c="share">negotiate ↑</button></li>
    <li><b>Term.</b> ${[1, 3, 5].map(t => `<button class="opt ${c.term === t ? 'on' : ''}" data-c="term" data-v="${t}">${t} yr</button>`).join('')} <small>(longer term = steadier income)</small></li>
    <li><b>Exclusivity.</b> <button class="opt ${c.excl ? 'on' : ''}" data-c="excl">${c.excl ? 'Exclusive (+15% profit)' : 'Non-exclusive'}</button></li>
    <li><b>Early termination fee.</b> ${c.fee ? 'Operator pays 30% of startup cost if terminated early.' : '<s>Early termination fee</s> struck.'} ${c.fee ? '<button class="link" data-c="fee">negotiate away</button>' : '<small>(partner takes −3% revenue instead)</small>'}</li>
  </ol>`;
  $('cFine').innerHTML = `<div class="fine ${c.trapRead ? 'read' : ''}"><small>Fine print: ${c.trapId ? (c.trapRead ? `<mark>${trap.text}</mark>` : `<span class="blur">${trap.text}</span>`) : 'Standard boilerplate. Nothing unusual.'}</small></div>
    ${c.trapRead && c.trapId && !c.trapStruck ? '<button class="link" data-c="strike">✂️ strike this clause</button>' : ''}${c.trapRead && c.trapStruck ? '<small class="g">Clause struck ✔</small>' : ''}
    ${c.trapRead ? '' : '<button class="link" data-c="read">🔍 read the fine print</button>'}`;
  const est = BIZ[c.d.id].baseProfit * Math.pow(1.9, c.level - 1) * contractMult({ share: c.share, term: c.term, excl: c.excl, fee: c.fee, trapId: c.trapId, trapStruck: c.trapStruck }) * (1 - c.dilution) * (0.85 + S.smarts / 400);
  $('cSum').innerHTML = `Upfront <b>${fmt(c.cost)}</b> · Est. profit <b class="g">${fmt(est)}/yr</b> · Cash ${fmt(S.cash)}`;
  document.querySelectorAll('#cClauses [data-c], #cFine [data-c]').forEach(el => { el.onclick = () => contractAct(el.dataset.c, el.dataset.v); });
}

function negotiate(label, apply) {
  const p = clamp(0.3 + S.smarts / 250 + S.fame / 500 - C.tension * 0.15, 0.05, 0.9);
  if (chance(p)) { apply(); repSay(pick(REP_LINES.win)); }
  else { C.tension++; repSay(pick(REP_LINES.lose)); if (C.tension >= 3) { say('📄', `${C.cp} walked out of the negotiation for ${C.d.name}.`, 'bad'); const cp = C.cp; closeContract(); renderFeed(); showModal({ icon: '🚪', title: 'They walked out', text: `${cp} lost patience and left the table.` }); return; } }
  drawContract();
}
function contractAct(k, v) {
  if (k === 'share') { if (C.share >= 80) return repSay('That\'s as high as it goes.'); negotiate('share', () => { C.share += 5; }); }
  else if (k === 'term') { C.term = +v; drawContract(); }
  else if (k === 'excl') { C.excl = !C.excl; drawContract(); }
  else if (k === 'fee') negotiate('fee', () => { C.fee = false; });
  else if (k === 'read') { C.trapRead = true; repSay(pick(REP_LINES.magnify)); drawContract(); }
  else if (k === 'strike') negotiate('strike', () => { C.trapStruck = true; });
}

function setupSignature() {
  const cv = $('cCanvas'); const ctx = cv.getContext('2d');
  ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#13357a';
  let down = false, lx = 0, ly = 0;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = (e) => { down = true; [lx, ly] = pos(e); cv.setPointerCapture(e.pointerId); };
  cv.onpointermove = (e) => { if (!down) return; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); C.ink += Math.hypot(x - lx, y - ly); lx = x; ly = y; };
  cv.onpointerup = cv.onpointercancel = () => { down = false; };
  $('cClear').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); C.ink = 0; };
}

function signContract() {
  if (C.ink < 150) return repSay('You haven\'t signed yet. Put your name on the line.');
  if (S.cash < C.cost) return repSay('You don\'t have the funds for the upfront fee.');
  $('cStamp').classList.add('show');
  const c = C;
  setTimeout(() => {
    const contract = { cp: c.cp, share: c.share, term: c.term, excl: c.excl, fee: c.fee, trapId: c.trapId, trapStruck: c.trapStruck, revealed: c.trapRead };
    if (c.mode === 'start') {
      S.cash -= c.cost; S.biz.push({ id: c.d.id, level: 1, termLeft: c.term, contract, dilution: 0 });
      say('✍️', `You signed with ${c.cp} and launched ${c.d.name} for ${fmt(c.cost)}.`, 'gold');
    } else { const b = S.biz[c.idx]; b.contract = contract; b.termLeft = c.term; say('✍️', `You signed a new ${c.term}-year contract with ${c.cp} for ${c.d.name}.`, 'gold'); }
    checkAch(); save(); closeContract(); renderFeed();
  }, 1000);
}

/* ---------- boot ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el.dataset.v, el);
  const p = e.target.closest('[data-p]'); if (p) { UI.panel === p.dataset.p ? closePanel() : openPanel(p.dataset.p); }
});
$('ageBtn').addEventListener('click', ageUp);
$('sheetClose').addEventListener('click', closePanel);
$('btnNew').addEventListener('click', () => { newLife(); $('title').classList.remove('open'); renderFeed(); refresh(); });
$('btnCont').addEventListener('click', () => { $('title').classList.remove('open'); renderFeed(); refresh(); });
if (load() && S.alive) $('btnCont').hidden = false;
