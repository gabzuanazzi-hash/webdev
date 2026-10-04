/* Hustleville — engine. Depends on data.js */
'use strict';

/* ---------- helpers ---------- */
const $ = (id) => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const chance = (p) => Math.random() < p;
const luckV = () => clamp((S.luck == null ? 50 : S.luck) + (S.karma || 0) * 0.3);          // 0-100; karma nudges it
const luckAdj = () => (luckV() - 50) / 50;                                                // -1 (cursed) .. +1 (blessed)
const lk = (p, w = 0.08) => Math.min(0.99, Math.max(0.005, p + luckAdj() * w));            // a good-outcome chance, shifted by luck
const addKarma = (n) => { S.karma = Math.max(-100, Math.min(100, (S.karma || 0) + n)); };
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const fmt = (n) => {
  const s = n < 0 ? '-' : ''; n = Math.abs(n);
  if (n >= 1e9) return s + '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return s + '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return s + '$' + (n / 1e3).toFixed(1) + 'K';
  return s + '$' + Math.round(n).toLocaleString();
};
const SAVE_KEY = 'hustleville-save-v2';
function toast(m) { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------- Runway art (sprite sheets, optional) ----------
   Drop the generated sheets into assets/runway/ with these names. Until a
   sheet loads, the game falls back to emoji. */
const ART = {
  niches: { src: 'assets/runway/niches.png', cols: 5, rows: 2 },
  home: { src: 'assets/runway/homes.png', cols: 4, rows: 2 },
  car: { src: 'assets/runway/cars.png', cols: 3, rows: 2 },
  clothes: { src: 'assets/runway/clothes.png', cols: 3, rows: 2 },
  watch: { src: 'assets/runway/watches.png', cols: 3, rows: 2 },
  plane: { src: 'assets/runway/planes.png', cols: 3, rows: 2 },
  stages: { src: 'assets/runway/stages.png', cols: 4, rows: 2 },
  hubs: { src: 'assets/runway/ui/hub-icons.png', cols: 3, rows: 2 },
  products: { src: 'assets/runway/ui/products.png', cols: 5, rows: 3 },
  extra: { src: 'assets/runway/ui/extra-items.png', cols: 5, rows: 3 },
  itA: { src: 'assets/runway/ui/items-a.jpg', cols: 5, rows: 3 },
  itB: { src: 'assets/runway/ui/items-b.jpg', cols: 5, rows: 3 },
  itC: { src: 'assets/runway/ui/items-c.jpg', cols: 5, rows: 3 },
  lux: { src: 'assets/garage/lux-icons.webp', cols: 5, rows: 4 }
};
const BANNERS = { hubs: { src: 'assets/runway/ui/hub-banners.png', pos: [10, 50, 90] }, social: { src: 'assets/runway/ui/social-banners.png', pos: [20, 80] } };
function bannerHTML(key, idx) { const a = BANNERS[key]; return a && a.ok ? `<div class="banner" style="background-image:url(${a.src});background-position:center ${a.pos[idx]}%"></div>` : ''; }
function preloadArt() {
  const sp = new Image(); sp.onload = () => $('title').classList.add('has-art'); sp.src = 'assets/runway/splash.png';
  const hr = new Image(); hr.onload = () => { $('hero').classList.add('has-art'); document.body.classList.add('ui-art'); if (S && !$('title').classList.contains('open')) refresh(); }; hr.src = 'assets/runway/ui/hero.png';
  Object.values(BANNERS).forEach(a => { const im = new Image(); im.onload = () => { a.ok = true; if (S && !$('title').classList.contains('open')) refresh(); }; im.src = a.src; });
  Object.values(ART).forEach(a => {
    const im = new Image();
    im.onload = () => { a.ok = true; a.A = im.naturalWidth / im.naturalHeight; if (S && !$('title').classList.contains('open')) refresh(); };
    im.src = a.src;
  });
}
// Renders the centered square of cell `idx` of a sheet at B px, or the fallback emoji.
function art(key, idx, B, fb) {
  const a = ART[key];
  if (!a || !a.ok || idx == null || idx < 0) return fb;
  const s = Math.min(a.A / a.cols, 1 / a.rows), k = B / s;
  const cx = ((idx % a.cols) + 0.5) * a.A / a.cols, cy = (Math.floor(idx / a.cols) + 0.5) / a.rows;
  return `<span class="art" style="width:${B}px;height:${B}px;background-image:url(${a.src});background-size:${a.A * k}px ${k}px;background-position:${B / 2 - cx * k}px ${B / 2 - cy * k}px"></span>`;
}
/* ---------- profile characters ---------- */
const AVATARS = [
  { k: 'classic', n: 'Classic', who: 'Everyone' },
  { k: 'auburn', n: 'Ruby', who: 'Woman', src: 'assets/avatars/auburn.webp' },
  { k: 'brown', n: 'Ben', who: 'Man', src: 'assets/avatars/brown.webp' },
  { k: 'bob', n: 'Mei', who: 'Woman', src: 'assets/avatars/bob.webp' },
  { k: 'fade', n: 'Marcus', who: 'Man', src: 'assets/avatars/fade.webp' }
];
const avatarOf = () => AVATARS.find(a => a.k === (S && S.avatar)) || AVATARS[0];
function avatarImg(av, idx, B) {                       // idx = life stage 0..7 (baby..ghost), 4x2 atlas of 192px cells; drawn at 80% so the figure sits centred with a margin
  const k = 0.8, c = B * k, o = (B - c) / 2, oy = o + B * 0.03;
  return `<span class="art av" style="width:${B}px;height:${B}px;border-radius:50%;background-image:url(${av.src});background-size:${c * 4}px ${c * 2}px;background-position:${o - (idx % 4) * c}px ${oy - Math.floor(idx / 4) * c}px"></span>`;
}
// Avatar crop: zoom into the head and shoulders so the face fills the circle.
function avatarArt(idx, B, fb) {
  const av = avatarOf(); if (av.src) return avatarImg(av, idx, B);
  const a = ART.stages;
  if (!a || !a.ok) return fb;
  const zoom = [0.4, 0.58, 0.62, 0.62, 0.62, 0.62, 0.62, 0.52][idx] || 0.62, dy = [0.5, 0.45, 0.44, 0.44, 0.44, 0.44, 0.42, 0.5][idx] || 0.44;
  const s = zoom / a.rows, k = B / s;
  const cx = ((idx % a.cols) + 0.5) * a.A / a.cols, cy = (Math.floor(idx / a.cols) + dy) / a.rows;
  return `<span class="art" style="width:${B}px;height:${B}px;border-radius:50%;background-image:url(${a.src});background-size:${a.A * k}px ${k}px;background-position:${B / 2 - cx * k}px ${B / 2 - cy * k}px"></span>`;
}
function stageIdx() {
  if (!S.alive) return 7;
  if (netWorth() >= 1e9 || S.fame >= 80) return 6;
  const a = S.age; return a < 4 ? 0 : a < 13 ? 1 : a < 18 ? 2 : a < 30 ? 3 : a < 65 ? 4 : 5;
}

/* ---------- state ---------- */
let S = null;
const UI = { panel: null, sub: { money: 'jobs', crazy: 'fun', social: 'post' }, hub: null, startOpen: false, src: null, cat: 'home' };
UI.sub.shop = 'shop';
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
    cash: 0, luck: ri(40, 60), karma: 0, happy: ri(65, 95), health: ri(70, 100), smarts: ri(20, 80), looks: ri(20, 90), fame: 0,
    job: null, jobYears: 0, deg: false, college: null,
    biz: [], assets: [], invest: { savings: 0, index: 0, crypto: 0 },
    avatar: pick(AVATARS.slice(1)).k, carSpend: 0, candidate: null, partner: null, kids: [], mom, dad,
    jail: 0, record: 0, heat: 0, done: {}, ach: [], market: 1, log: [], peakNW: 0, xp: 0, hobbies: 0, trips: 0, goals: [], social: socialInit(), payments: []
  };
  S.log.push({ age: 0, items: [] });
  say('👶', `You were born in ${country.n} ${country.f} to a ${FAMILIES[tier].n} family.`, '');
  say('👨‍👩‍👦', `Your mother is ${mom.name} and your father is ${dad.name}.`, '');
  genGoals();
  save();
}

function say(icon, text, cls = '') { S.log[S.log.length - 1].items.push({ i: icon, t: text, c: cls }); }
function famAllowance() { return FAMILIES[S.tier].base * S.w; }
function lifeCost() { return 8000 * Math.max(0.4, S.w) * (1 - Math.min(0.2, gearAdd('living'))); }
function ownedHome() { return S.assets.filter(a => a.cat === 'home' && !a.rented).length > 0; }

/* ---------- owned items: condition, perks and interactions ---------- */
const findItem = (cat, n) => ASSETS[cat] && ASSETS[cat].items.find(x => x.n === n);
const cond = (a) => a.cond == null ? 100 : a.cond;
const itemArt = (cat, it, B) => art(it.sh || cat, it.sp, B, it.icon);
/* ---------- car customization (see garage.js) ---------- */
const carArt = (a, B) => typeof Garage !== 'undefined' ? Garage.art(a, B, () => itemArt(a.cat, findItem(a.cat, a.n) || {}, B)) : itemArt(a.cat, findItem(a.cat, a.n) || {}, B);

const sellValue = (a) => a.value * 0.9 * (0.5 + cond(a) / 200);
const assetWorth = (a) => a.value * (0.6 + 0.4 * cond(a) / 100);
function gearMul(k) { return S.assets.reduce((m, a) => { const it = findItem(a.cat, a.n); return it && it.fx && it.fx[k] && cond(a) > 20 ? m * it.fx[k] : m; }, 1); }
function gearAdd(k) { return S.assets.reduce((m, a) => { const it = findItem(a.cat, a.n); return it && it.fx && it.fx[k] && cond(a) > 20 ? m + it.fx[k] : m; }, 0); }
const DECAY = { home: 3, car: 10, boat: 9, plane: 7, watch: 1, clothes: 6, tech: 6, gear: 7 };
const RENT = { home: 0.045, boat: 0.06, plane: 0.06 };
const TRIPS = ['Lisbon', 'Dubai', 'Tokyo', 'Cape Town', 'Rio', 'Reykjavik', 'Bali', 'Monaco', 'Maldives', 'New York'];
const dest = () => pick(TRIPS);
const ACTS = {
  renovate: { icon: '🛠️', t: 'Renovate', cost: a => a.price * 0.05, run(a) { a.cond = Math.min(100, cond(a) + 25); a.value *= 1.03; S.happy = clamp(S.happy + 2); return `You renovated your ${a.n}. It looks brand new.`; } },
  furnish: { icon: '🛋️', t: 'Furnish', cost: a => a.price * 0.03, run(a) { a.value *= 1.02; S.happy = clamp(S.happy + 4); return `You furnished your ${a.n} beautifully.`; } },
  party: { icon: '🎉', t: 'Throw a party', cost: a => Math.max(300, a.price * 0.003), run(a) {
    let m = `You threw a party with your ${a.n}.`; S.happy = clamp(S.happy + 6);
    const f = ri(0, 2) + (S.fame > 30 ? 1 : 0); S.fame += f; S.social.followers += Math.round(S.social.followers * 0.003 * f + f * 5);
    if (S.partner) S.partner.score = clamp(S.partner.score + 6);
    if (chance(0.2)) { a.cond = Math.max(0, cond(a) - 5); m += ' Things got messy.'; } else if (chance(0.1)) { S.fame += 2; m += ' A celebrity showed up and everyone posted about it!'; }
    return m; } },
  custom: { icon: '🔧', t: 'Garage', toggle: true, cost: () => 0, run(a) { Garage.open(a); return null; } },
  rent: { icon: '🏷️', t: a => a.rented ? 'Stop renting out' : 'Rent it out', toggle: true, cost: () => 0, run(a) {
    a.rented = !a.rented; const r = Math.round(a.price * RENT[a.cat]);
    return a.rented ? `Your ${a.n} is now rented out for about ${fmt(r)} a year${a.cat === 'home' ? '. You will pay rent yourself unless you own another home' : ''}.` : `You took your ${a.n} off the rental market.`; } },
  service: { icon: '🔧', t: a => ({ car: 'Service', boat: 'Refit', plane: 'Overhaul' }[a.cat] || 'Maintain'), cost: a => a.price * ({ plane: 0.04, boat: 0.035 }[a.cat] || 0.03), run(a) { a.cond = Math.min(100, cond(a) + 30); return `Your ${a.n} is in great shape again.`; } },
  roadtrip: { icon: '🛣️', t: 'Road trip', cost: a => 100 + a.price * 0.004, run(a) {
    S.happy = clamp(S.happy + 5); S.trips++; a.cond = Math.max(0, cond(a) - 3);
    if (cond(a) < 45 && chance(0.5)) { const c = a.price * 0.01; S.cash -= c; S.happy = clamp(S.happy - 2); return `Your ${a.n} broke down on the trip. Tow and repair: ${fmt(c)}.`; }
    return `You drove your ${a.n} to ${dest()}. Great memories.`; } },
  race: { icon: '🏁', t: 'Street race', cost: () => 200, run(a) {
    if (chance(0.05)) { S.cash -= 1500; S.heat += 1; return 'Police broke up the race and fined you $1,500.'; }
    if (chance(0.18)) { const c = a.price * 0.02; S.cash -= c; a.cond = Math.max(0, cond(a) - 40); S.health = clamp(S.health - 12); return `You crashed your ${a.n}. Repairs: ${fmt(c)}.`; }
    if (chance(0.3 + Math.min(0.3, a.price / 2e6))) { const p = Math.round(a.price * 0.02 + 500); S.cash += p; S.fame += 2; return `You won the race and ${fmt(p)}! Everyone is talking about it.`; }
    return 'You lost the race, but it was a thrill.'; } },
  sail: { icon: '⛵', t: 'Sail away', cost: a => 1500 + a.price * 0.005, run(a) { S.happy = clamp(S.happy + 8); S.trips++; a.cond = Math.max(0, cond(a) - 3); return `You sailed your ${a.n} to ${dest()}. Pure freedom.`; } },
  fly: { icon: '🛫', t: 'Fly somewhere', cost: a => 3000 + a.price * 0.006, run(a) { S.happy = clamp(S.happy + 10); S.trips++; S.fame += 1; a.cond = Math.max(0, cond(a) - 4); return `You flew your ${a.n} to ${dest()} for the weekend.`; } },
  flex: { icon: '📸', t: 'Flex it online', cost: () => 0, run(a) {
    const g = Math.round(Math.max(20, S.social.followers * 0.01) * rnd(0.5, 1.5)); S.social.followers += g; S.fame += 0.3;
    if (chance(0.08)) { S.social.rep = clamp(S.social.rep - 5); return `You posted your ${a.n}. People called it a show-off post (+${g} followers, reputation down).`; }
    return `You posted your ${a.n}: +${g} followers.`; } },
  appraise: { icon: '🔍', t: 'Appraise', cost: a => Math.max(50, a.price * 0.01), run(a) {
    const f = rnd(0.88, 1.18); a.value *= f; return f > 1.05 ? `The appraiser loved your ${a.n}. Value up ${Math.round((f - 1) * 100)}%.` : f < 0.95 ? `Bad news: your ${a.n} is worth ${Math.round((1 - f) * 100)}% less than thought.` : `Your ${a.n} is worth about what you paid.`; } },
  auction: { icon: '🔨', t: 'Auction', sell: true, cost: () => 0, run(a) { const v = Math.round(a.value * rnd(0.85, 1.4) * 0.9 * (0.6 + cond(a) / 250)); S.cash += v; return `Your ${a.n} sold at auction for ${fmt(v)}.`; } },
  wear: { icon: '🕺', t: 'Wear it out', cost: () => 0, run(a) { S.happy = clamp(S.happy + 2); S.fame += 0.3; if (S.partner) S.partner.score = clamp(S.partner.score + 3); return `You got compliments in your ${a.n}.`; } },
  donate: { icon: '🎗️', t: 'Donate', sell: true, cost: () => 0, run(a) { S.social.rep = clamp(S.social.rep + 4); S.happy = clamp(S.happy + 3); S.fame += 0.3; return `You donated your ${a.n} to charity.`; } },
  display: { icon: '🖼️', t: 'Host an exhibition', cost: a => a.price * 0.005, run(a) { S.fame += 1.5; S.happy = clamp(S.happy + 3); a.value *= rnd(1, 1.06); return `Guests admired your ${a.n} at your exhibition.`; } },
  play: { icon: '🎾', t: 'Play together', cost: () => 0, run(a) { a.bond = Math.min(100, (a.bond == null ? 50 : a.bond) + 10); S.happy = clamp(S.happy + 4); return `You played with your ${a.n.toLowerCase()}. So much love.`; } },
  train: { icon: '🦴', t: 'Train', cost: () => 100, run(a) { a.bond = Math.min(100, (a.bond == null ? 50 : a.bond) + 8); return `Your ${a.n.toLowerCase()} learned something new.`; } },
  vet: { icon: '🩺', t: 'Vet check-up', cost: a => 150 + a.price * 0.005, run(a) { a.extraLife = (a.extraLife || 0) + 1; a.bond = Math.min(100, (a.bond == null ? 50 : a.bond) + 5); return `The vet says your ${a.n.toLowerCase()} is healthy. Maybe a year longer to live.`; } },
  game: { icon: '🎮', t: 'Play games', cost: () => 0, run() { S.happy = clamp(S.happy + 4); S.smarts = clamp(S.smarts + 0.5); return 'You lost track of time in a great game.'; } },
  stream: { icon: '🔴', t: 'Stream', cost: () => 0, run() { const F = S.social.followers, g = Math.round(ri(5, 60) + F * 0.004), tip = ri(10, 200); S.social.followers += g; S.cash += tip; S.fame += 0.2; return `Your stream gained ${g} followers and ${fmt(tip)} in tips.`; } },
  workout: { icon: '🏋️', t: 'Workout', cost: () => 0, run() { S.health = clamp(S.health + 5); S.looks = clamp(S.looks + 2); return 'A solid workout. You feel stronger.'; } },
  relax: { icon: '♨️', t: 'Relax', cost: () => 0, run() { S.happy = clamp(S.happy + 5); S.health = clamp(S.health + 1); if (S.partner) S.partner.score = clamp(S.partner.score + 4); return 'You unwound in the hot tub.'; } },
  movie: { icon: '🍿', t: 'Movie night', cost: () => 0, run() { S.happy = clamp(S.happy + 5); if (S.partner) { S.partner.score = clamp(S.partner.score + 8); return 'A cozy movie night with your partner.'; } return 'You watched a great movie in style.'; } },
  swim: { icon: '🏊', t: 'Swim', cost: () => 0, run() { S.health = clamp(S.health + 3); S.happy = clamp(S.happy + 3); return 'A refreshing swim.'; } },
  showoff: { icon: '📱', t: 'Show it off', cost: () => 0, run() { const g = Math.round(Math.max(15, S.social.followers * 0.006)); S.social.followers += g; S.fame += 0.3; return `Your smart-home tour got +${g} followers.`; } }
};
const itemActs = (a) => { const it = findItem(a.cat, a.n); return (it && it.acts) || (ASSETS[a.cat] && ASSETS[a.cat].acts) || []; };
const actLabel = (id, a) => { const d = ACTS[id]; return typeof d.t === 'function' ? d.t(a) : d.t; };

function assetsYear() {
  let up = 0, rentInc = 0, petJoy = 0;
  for (let k = S.assets.length - 1; k >= 0; k--) {
    const a = S.assets[k], it = findItem(a.cat, a.n) || {};
    up += a.price * a.up;
    a.value = Math.max(a.price * 0.02, a.value * (1 + a.dep + (it.vol ? gauss() * it.vol : 0)));
    a.cond = Math.max(0, cond(a) - (DECAY[a.cat] || 0)); a.used = {};
    if (a.rented && RENT[a.cat]) rentInc += a.price * RENT[a.cat] * cond(a) / 100;
    if (a.cat === 'pet') {
      a.age = (a.age || 0) + 1; a.bond = Math.max(0, (a.bond == null ? 50 : a.bond) - 8);
      if (a.age > (it.life || 12) + (a.extraLife || 0) && chance(0.5)) { S.assets.splice(k, 1); S.happy = clamp(S.happy - 12); say('🕊️', `Your ${a.n.toLowerCase()} passed away after a long life. You miss them.`, 'bad'); }
      else if (a.bond > 60) petJoy += 2;
    } else if (DECAY[a.cat] >= 5 && cond(a) < 35 && chance(0.35)) {
      const bill = a.price * 0.03; S.cash -= bill; up += bill; a.cond = Math.min(100, cond(a) + 20); say('🔧', `Your ${a.n} broke down. Repair bill: ${fmt(bill)}.`, 'bad');
    }
  }
  if (rentInc > 0) { S.cash += rentInc; say('🏷️', `Rental income from your assets: ${fmt(rentInc)}.`, 'good'); }
  if (petJoy) S.happy = clamp(S.happy + petJoy);
  S.smarts = clamp(S.smarts + gearAdd('smarts')); S.health = clamp(S.health + gearAdd('health'));
  return up;
}

/* ---------- yearly goals + XP ---------- */
const GOAL_POOL = [
  { id: 'gym', t: 'Hit the gym', ok: s => s.age >= 14, chk: s => s.done.gym },
  { id: 'call', t: 'Call Mom or Dad', ok: s => s.mom.alive || s.dad.alive, chk: s => s.done.mom || s.done.dad },
  { id: 'study', t: 'Study hard', ok: s => s.age >= 6, chk: s => s.done.study },
  { id: 'date', t: 'Go on a date night', ok: s => !!s.partner, chk: s => s.done.date },
  { id: 'meet', t: 'Meet someone new', ok: s => s.age >= 18 && !s.partner, chk: s => s.done.meet },
  { id: 'upg', t: 'Level up a business', ok: s => s.biz.length > 0, chk: s => s.done.upg },
  { id: 'inv', t: 'Invest some money', ok: s => s.age >= 18, chk: s => s.done.inv },
  { id: 'apply', t: 'Apply for a job', ok: s => s.age >= 14 && !s.job && !s.college, chk: s => s.done.apply },
  { id: 'viral', t: 'Post something outrageous', ok: s => s.age >= 13, chk: s => s.done.viral },
  { id: 'post', t: 'Post on social media', ok: s => s.age >= 13, chk: s => s.done.post },
  { id: 'hub', t: 'Work in your business hub', ok: s => s.biz.length > 0, chk: s => s.done.hub },
  { id: 'therapy', t: 'See a therapist', ok: s => s.age >= 14, chk: s => s.done.therapy }
];
function genGoals() {
  const pool = GOAL_POOL.filter(g => g.ok(S)); S.goals = [];
  while (S.goals.length < 3 && pool.length) {
    const g = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    S.goals.push({ id: g.id, t: g.t, k: pick(['cash', 'cash', 'happy', 'smarts']), done: false, claimed: false });
  }
}
function updateGoals() { (S.goals || []).forEach(g => { const d = GOAL_POOL.find(x => x.id === g.id); if (d && d.chk(S)) g.done = true; }); }
function rewardCash() { return Math.round(250 + Math.min(50000, Math.max(0, netWorth()) * 0.002)); }
function rewardText(g) { return g.k === 'cash' ? '🪙 +' + fmt(rewardCash()) : g.k === 'happy' ? '😊 +5' : '🧠 +3'; }
const level = () => Math.floor((S.xp || 0) / 300) + 1;
const tapPower = () => 1 + Math.floor(S.biz.reduce((t, b) => t + b.level, 0) / 2);

/* ---------- derived numbers ---------- */
function jobDef() { return S.job ? JOBS.find(j => j.id === S.job) : null; }
function jobTier() { let t = 0; LADDER_YEARS.forEach((y, i) => { if (S.jobYears >= y) t = i; }); return t; }
function salary() {
  const j = jobDef(); if (!j) return 0;
  let p = j.pay * j.mult[jobTier()] * Math.max(0.5, S.w);
  if (S.college) p *= 0.5;
  return p;
}
function contractMult(c, trapActive) {
  const termBonus = { 1: 1, 3: 1.04, 5: 1.08 }[c.term] || 1;
  let m = (c.share / 60) * termBonus * (c.excl ? 1.15 : 1) * (c.fee ? 1 : 0.97);
  if (c.trapId && !c.trapStruck) m *= TRAPS.find(t => t.id === c.trapId).mult;
  return m;
}
function bizEstimate(b) { return b.last ? Math.max(0, b.last.profit) : HUBS[b.id].lvlBase * 0.2; }
function bizValue(b) { return HUBS[b.id].value(b); }
function assetValue(a) { return a.value; }
function netWorth() {
  const inv = S.invest.savings + S.invest.index + S.invest.crypto;
  return S.cash + inv + S.biz.reduce((t, b) => t + bizValue(b), 0) + S.assets.reduce((t, a) => t + assetWorth(a), 0);
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
  if (S.social && S.social.celeb) return 'Celebrity';
  if (S.social && S.social.followers >= 10000 && !S.biz.length) return 'Influencer';
  if (S.biz.length) return 'Entrepreneur';
  return S.age < 6 ? 'Toddler' : S.age < 18 ? 'Student' : 'Unemployed';
}

/* ---------- achievements ---------- */
const ACH = [
  { id: 'firstbiz', t: 'Founder — start a business', ok: () => S.biz.length >= 1 },
  { id: 'empire', t: 'Empire — run all 3 business types', ok: () => new Set(S.biz.map(b => b.id)).size >= 3 },
  { id: 'viral', t: 'Went viral', ok: () => S.social && S.social.viral > 0 },
  { id: 'star', t: 'Celebrity (1M followers)', ok: () => S.social && S.social.celeb },
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
  ACH.forEach(a => { if (!S.ach.includes(a.id) && a.ok()) { S.ach.push(a.id); S.xp = (S.xp || 0) + 100; say('🏆', 'Achievement unlocked: ' + a.t, 'gold'); } });
}

/* ---------- save / load ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { S = JSON.parse(r); if (!S.avatar || !AVATARS.some(v => v.k === S.avatar && v.src)) S.avatar = pick(AVATARS.slice(1)).k; if (S.carSpend == null) S.carSpend = (S.assets || []).filter(a => a.cat === 'car').reduce((s, a) => s + (a.price || 0), 0); S.xp = S.xp || 0; S.hobbies = S.hobbies || 0; S.trips = S.trips || 0; S.goals = S.goals || []; S.social = S.social || socialInit(); S.payments = S.payments || []; return true; } } catch (e) { /* ignore */ } return false; }

/* ---------- modals ---------- */
function showModal(m) {
  if ($('modal').classList.contains('open')) { modalQueue.push(m); return; }
  $('modalIcon').innerHTML = m.art || m.icon || '❗';
  $('modalTitle').textContent = m.title;
  $('modalText').innerHTML = m.text;
  const box = $('modalBtns'); box.innerHTML = '';
  (m.buttons || [{ t: 'OK' }]).forEach((b, i) => {
    const el = document.createElement('button');
    el.className = 'btn ' + (b.cls === 'bad' ? 'bad' : i === 0 ? 'gold' : i === 1 ? 'teal' : 'bad'); el.textContent = b.t;
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
    const b = pick(S.biz); const d = HUBS[b.id]; const offer = Math.round(bizValue(b) * 0.35);
    showModal({ icon: '📈', title: 'Big Opportunity!', art: '<img src="assets/runway/ui/deal.png" alt="">', text: `An angel investor offers <b>${fmt(offer)}</b> for 15% of <b>${d.name}</b> profits.`, buttons: [
      { t: 'Accept', cls: 'gold', fn: () => { S.cash += offer; b.dilution = Math.min(0.6, (b.dilution || 0) + 0.15); say('📈', `You sold 15% of ${d.name} for ${fmt(offer)}.`, 'good'); } },
      { t: 'Decline', fn: () => say('📈', `You turned down the investor for ${d.name}.`, '') }] });
  } },
  { ok: s => s.biz.length > 0, run() {
    const c = Math.round(netWorth() * 0.01) + 2000;
    showModal({ icon: '⚖️', title: 'Lawsuit!', text: `A disgruntled ex-contractor is suing your company. Settle for ${fmt(c)} or fight it in court?`, buttons: [
      { t: 'Settle', fn: () => { S.cash -= c; say('⚖️', `You settled the lawsuit for ${fmt(c)}.`, 'bad'); } },
      { t: 'Fight', cls: 'gold', fn: () => { if (chance(lk(0.5, 0.15))) { say('⚖️', 'You crushed them in court.', 'good'); S.fame += 2; } else { S.cash -= c * 2.5; say('⚖️', `You lost in court. Damages: ${fmt(c * 2.5)}.`, 'bad'); } } }] });
  } },
  { ok: s => s.age >= 13, run() { S.fame += 5; S.happy = clamp(S.happy + 5); say('🔥', 'Something you posted went viral overnight!', 'good'); } },
  { ok: s => s.age >= 18 && s.cash > 100, run() {
    showModal({ icon: '🎟️', title: 'Lottery ticket', text: 'A scratch ticket for $20. Feeling lucky?', buttons: [
      { t: 'Buy it', fn: () => { S.cash -= 20; if (chance(lk(0.01, 0.01))) { S.cash += 250000; say('🎟️', 'YOU WON $250,000 ON A SCRATCH TICKET!', 'gold'); } else say('🎟️', 'Not a winner.', ''); } },
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
  S.age++; S.done = {}; S.luck = Math.round(((S.luck == null ? 50 : S.luck) * 0.75 + 50 * 0.25) * 10) / 10;
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

  // businesses: each hub turns the year you ran into a profit and loss
  S.biz.forEach(b => {
    const H = HUBS[b.id], c = b.contract, r = H.yearEnd(b);
    let p = r.profit;
    if (p > 0) p = p * contractMult(c) * (1 - (b.dilution || 0)) * (b.termLeft <= 0 ? 0.7 : 1);
    if (S.jail > 0) p *= 0.5;
    if (c.trapId && !c.trapStruck && !c.revealed) { c.revealed = true; say('😬', `The fine print bit you: ${TRAPS.find(t => t.id === c.trapId).text.split(':')[0]} is cutting into ${H.name}.`, 'bad'); }
    const net = p > 0 ? p * 0.8 : p; S.cash += net + (r.cashAdj || 0); income += Math.max(0, net); bizProfit += p;
    b.last = { rev: r.rev, exp: r.exp, profit: p, notes: r.notes };
    say(H.icon, `${H.name}: ${p >= 0 ? 'profit' : 'loss'} ${fmt(Math.abs(net))}${p > 0 ? ' after tax' : ''}.`, p >= 0 ? 'good' : 'bad');
    r.notes.slice(0, 3).forEach(n => say('📋', n, ''));
    hlog(b, `Year result: ${fmt(p)} profit (${fmt(r.rev)} revenue).`);
    b.ap = apMax(b);
    if (b.termLeft > 0) { b.termLeft--; if (b.termLeft === 0) {
      if (c.trapId === 'autorenew' && !c.trapStruck) { b.termLeft = 3; say('😬', `The auto-renew clause locked ${H.name} in for 3 more years on bad terms.`, 'bad'); }
      else say('📄', `Your contract for ${H.name} expired. Renew it in Money → Business or profits drop 30%.`, 'bad'); } }
  });
  if (bizProfit > 1e8) S.fame += 4; else if (bizProfit > 1e7) S.fame += 3; else if (bizProfit > 1e6) S.fame += 2; else if (bizProfit > 1e5) S.fame += 1;
  socialYear();

  // installments from business sales
  S.payments = (S.payments || []).filter(p => { S.cash += p.amt; income += p.amt; say('🤝', `Sale installment received: ${fmt(p.amt)}.`, 'good'); return --p.left > 0; });

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
  const up = assetsYear();
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
  if (!S.social.celeb && chance(0.55)) { const pool = EVENTS.filter(e => e.ok(S)); if (pool.length) pick(pool).run(); }

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

  S.xp += 20; genGoals();
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
function metersHTML() {
  const career = clamp((S.job ? 25 * (jobTier() + 1) : 0) + S.biz.reduce((t, b) => t + b.level * 6, 0));
  const wealth = clamp(Math.log10(Math.max(1, netWorth())) / 9 * 100);
  return [['Career', career, '#22c3b0'], ['Wealth', wealth, '#f5c542'], ['Health', S.health, '#e8453c'], ['Happy', S.happy, '#8a5cf6']]
    .map(([l, v, c]) => `<div class="orb"><span style="--v:${Math.round(v)};--c:${c}"></span>${l}</div>`).join('');
}
function refresh() {
  if (!S) return;
  const t = statusTitle();
  $('avatar').innerHTML = avatarArt(stageIdx(), 44, stageIcon());
  $('pname').textContent = S.name;
  $('psub').textContent = `${S.flag} Age ${S.age} · ${occupation()}`;
  $('cash').textContent = fmt(S.cash);
  $('cash').className = S.cash < 0 ? 'neg' : '';
  $('hudLvl').textContent = level();
  $('nw').innerHTML = `${t.w}<br>NW ${fmt(netWorth())}`;
  $('meters').innerHTML = metersHTML();
  $('ageBtn').disabled = !S.alive;
  document.body.classList.toggle('celeb', !!(S.social && S.social.celeb));
  document.querySelectorAll('.tabs [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === UI.panel));
  if (UI.panel) renderPanel();
}
function tap(e) {
  if (!S || !S.alive || modalOpen() || $('title').classList.contains('open')) return;
  const n = tapPower(); S.cash += n;
  const h = $('hero'), r = h.getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'pop'; p.textContent = '+' + fmt(n);
  p.style.left = Math.max(10, Math.min(r.width - 50, (e.clientX || r.left + r.width / 2) - r.left - 14)) + 'px';
  p.style.top = Math.max(10, (e.clientY || r.top + r.height / 2) - r.top - 20) + 'px';
  h.appendChild(p); setTimeout(() => p.remove(), 800);
  refresh();
}

/* ---------- panels ---------- */
function openPanel(name) { UI.panel = name; $('sheet').classList.add('open'); refresh(); }
function closePanel() { UI.panel = null; $('sheet').classList.remove('open'); refresh(); }
function tabs(group, list) { return `<div class="subtabs">${list.map(([k, l]) => `<button class="${UI.sub[group] === k ? 'on' : ''}" data-a="sub" data-g="${group}" data-v="${k}">${l}</button>`).join('')}</div>`; }
const locked = () => S.jail > 0 ? `<div class="note bad">⛓️ You are in prison for ${S.jail} more year(s). Most actions are unavailable.</div>` : '';

function renderPanel() {
  const hubOpen = UI.panel === 'money' && UI.sub.money === 'biz' && UI.hub != null && S.biz[UI.hub];
  const money = hubOpen ? (UI.src ? 'Sourcing' : HUBS[S.biz[UI.hub].id].name) : { jobs: 'Careers', biz: 'Business Empire', invest: 'Invest' }[UI.sub.money];
  const T = { money: [money, moneyHTML], social: ['Social Media', socialHTML], love: ['Love & Family', loveHTML], shop: ['Asset Shop', shopHTML], crazy: ['Activities', crazyHTML], status: ['Life & Goals', statusHTML] }[UI.panel];
  $('sheetTitle').textContent = T[0];
  const view = [UI.panel, UI.sub.money, UI.sub.social, UI.sub.crazy, UI.hub, UI.src ? (UI.src.sel ? 's2' : 's1') : 0, UI.startOpen, UI.sub.shop, UI.cat].join('|');
  const y = view === renderPanel.last ? $('sheetBody').scrollTop : 0;
  renderPanel.last = view;
  $('sheetBody').innerHTML = locked() + T[1]();
  $('sheetBody').scrollTop = y;
}

function ribbonHTML() {
  const inc = S.biz.reduce((t, b) => t + bizEstimate(b), 0) + salary() * 0.85;
  return `<div class="ribbon"><div class="rb"><i class="coin-ic">$</i><b>${fmt(inc)}</b><small>/yr</small></div><div class="rb2"><b>${fmt(S.cash)}</b> 💵</div></div>`;
}
function moneyHTML() {
  const sub = UI.sub.money;
  return ribbonHTML() + tabs('money', [['jobs', '💼 Jobs'], ['biz', '🏢 Business'], ['invest', '📊 Invest']]) + ({ jobs: jobsHTML, biz: bizHTML, invest: investHTML }[sub])();
}
function shopHTML() {
  const sub = UI.sub.shop || 'shop';
  return ribbonHTML() + tabs('shop', [['shop', '🛍️ Shop'], ['mine', `🎒 My stuff (${S.assets.length})`]]) + (sub === 'mine' ? stuffHTML() : assetsHTML());
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
  if (UI.hub != null && S.biz[UI.hub]) return hubHTML(UI.hub);
  let h = '';
  if (S.biz.length) {
    h += '<h5>Your businesses</h5>';
    S.biz.forEach((b, i) => {
      const H = HUBS[b.id], up = Math.round(H.lvlBase * Math.pow(2, b.level - 1) * 1.5);
      h += `<div class="bcard"><div class="btile">${art('hubs', H.sprite, 56, H.icon)}<em>Lvl ${b.level}</em></div>
        <div class="binfo"><b>${H.name}</b><div class="inc"><i class="coin-ic s">$</i>${b.last ? fmt(b.last.profit) + ' last year' : 'New business'}</div>
        <small>Open the hub to run it. Worth about ${fmt(bizValue(b))}.</small></div>
        <button class="gbtn" data-a="openHub" data-v="${i}">OPEN HUB</button>
        <div class="bmini"><button class="mini" ${b.level < 10 && S.cash >= up ? '' : 'disabled'} data-a="upgrade" data-v="${i}">⬆️ Level up ${b.level < 10 ? fmt(up) : 'MAX'}</button><button class="mini" data-a="sell" data-v="${i}">✍️ Sell · sign a deal</button></div></div>`;
    });
  } else h += '<div class="note">You do not own a business yet.</div>';
  const young = S.age < 16, open = UI.startOpen && !young;
  h += `<button class="btn big ${open ? '' : 'gold'}" ${young || S.jail ? 'disabled' : ''} data-a="toggleStart">${young ? '🔒 Start a business (age 16)' : open ? '✕ Close' : '➕ Start a business'}</button>`;
  if (open) {
    h += '<h5>Choose a business</h5>';
    Object.values(HUBS).forEach(H => {
      const owned = S.biz.some(b => b.id === H.id);
      h += `<div class="bcard"><div class="btile">${art('hubs', H.sprite, 56, H.icon)}<em>${H.tag}</em></div>
        <div class="binfo"><b>${H.name}</b><small>${H.blurb}</small></div>
        <button class="gbtn" ${owned || S.cash < H.cost ? 'disabled' : ''} data-a="start" data-v="${H.id}">${owned ? 'OWNED' : 'START'}<small>${H.cost ? fmt(H.cost) : 'FREE'}</small></button></div>`;
    });
  }
  return h;
}
function hubHTML(i) {
  if (UI.src && S.biz[i].id === 'ecom') return sourcingHTML(i);
  const b = S.biz[i], H = HUBS[b.id], defs = H.defs(b), mx = apMax(b);
  const mets = H.metrics(b).map(m => `<div class="mt"><label>${m.l}</label><div class="bar"><i style="width:${clamp(m.p)}%;background:${hcol(m.p)}"></i></div><b>${m.v}</b></div>`).join('');
  const tasks = H.list.map(id => {
    const d = defs[id](), why = d.why || (!canAp(b.ap, d.ap) ? 'No actions left' : S.cash < d.cost ? 'Need ' + fmt(d.cost) : '');
    return `<button class="task" ${why ? 'disabled' : ''} data-a="hubTask" data-v="${i}:${id}"><span class="ti">${d.icon}</span><b>${d.t}</b><small>${d.d}</small><em>${why || (apTag(d.ap) + (d.cost ? (ENERGY_ON ? ' · ' : '') + fmt(d.cost) : (ENERGY_ON ? ' · free' : 'free')))}</em></button>`;
  }).join('');
  const L = b.last;
  return `<button class="back" data-a="closeHub">← All businesses</button>
    ${bannerHTML('hubs', H.banner)}
    <div class="hubhead"><div><b>${H.icon} ${H.name}</b> <i class="tag">Lvl ${b.level}</i><small>${H.blurb}</small></div>${ENERGY_ON ? `<div class="aps">${apPips(b.ap, mx)}<small>actions left this year</small></div>` : ''}</div>
    <div class="metrics">${mets}</div>
    <button class="btn big teal" ${!canAp(b.ap, 1) ? 'disabled' : ''} data-a="hubPhone" data-v="${i}">📞 Take a call${ENERGY_ON ? ' (⚡1)' : ''}</button>
    <h5>Tasks</h5><div class="tasks">${tasks}</div>
    ${H.extra(b, i)}
    <h5>Last year</h5>${L ? `<div class="card ${L.profit >= 0 ? 'gold' : ''}"><b>${L.profit >= 0 ? 'Profit' : 'Loss'} ${fmt(L.profit)}</b><small>Revenue ${fmt(L.rev)} · Costs ${fmt(L.exp)}</small>${L.notes.map(n => `<small>• ${n}</small>`).join('')}</div>` : '<div class="note">Age up to see your first year results. Your tasks decide them.</div>'}
    <h5>Hub log</h5>${(b.log || []).length ? (b.log || []).map(m => `<div class="logline">${m}</div>`).join('') : '<div class="note">Nothing yet.</div>'}`;
}

const carSpend = () => S.carSpend || 0;
function buyLock(it) {                                  // why this item cannot be bought right now ('' = it can)
  if (it.req && carSpend() < it.req) return `Collector status: spend ${fmt(it.req)} on cars (you: ${fmt(carSpend())})`;
  if (it.unique && S.assets.some(a => a.n === it.n)) return 'Yours — only one exists';
  return '';
}
function buyBlock(it, i) {
  const why = buyLock(it);
  if (why) return `<small class="lockmsg">🔒 ${why}</small><button class="gbtn sm" disabled>${fmt(it.price)}</button>`;
  return `<button class="gbtn sm" ${S.cash >= it.price && !S.jail ? '' : 'disabled'} data-a="buy" data-v="${i}">${fmt(it.price)}</button>`;
}
function assetsHTML() {
  const cat = ASSETS[UI.cat];
  let h = '<div class="chips scroll">' + Object.keys(ASSETS).map(k => `<button class="${UI.cat === k ? 'on' : ''}" data-a="cat" data-v="${k}">${ASSETS[k].icon}<small>${ASSETS[k].label}</small></button>`).join('') + '</div>';
  const BRANDS = ['Scarlatti', 'Bellucci', 'Zeffiro', 'Kronvik', 'Torrente'], BRAND_BLURB = { Scarlatti: '🇮🇹 Red-blooded Italian V8 & V12 legends', Bellucci: '🇫🇷 Horseshoe-grille ultra-luxury hypercars', Zeffiro: '🇮🇹 Hand-built carbon-fibre art pieces', Kronvik: '🇸🇪 Wing-heavy Scandinavian speed machines', Torrente: '🇮🇹 Razor-edged raging-bull wedge supercars' };
  const order = UI.cat === 'car' ? cat.items.map((it, i) => ({ it, i })).sort((x, y) => (BRANDS.indexOf(x.it.brand) + 1) - (BRANDS.indexOf(y.it.brand) + 1) || x.it.tier - y.it.tier || x.i - y.i) : cat.items.map((it, i) => ({ it, i }));
  let lastBrand = null;
  const canIds = [...new Set(cat.items.flatMap(it => it.acts || cat.acts || []))], lab = (id) => ACTS[id].icon + ' ' + (typeof ACTS[id].t === 'function' ? ACTS[id].t({ cat: UI.cat }) : ACTS[id].t);
  if (canIds.length) h += `<div class="cando"><b>What you can do with these</b><span>${canIds.map(id => `<i>${lab(id)}</i>`).join('')}</span></div>`;
  h += `<div class="agrid">`;
  order.forEach(({ it, i }) => {
    if (UI.cat === 'car' && (it.brand || '') !== lastBrand) {
      lastBrand = it.brand || '';
      const gk = lastBrand || 'everyday', cnt = cat.items.filter(x => (x.brand || '') === lastBrand).length, shut = !!(UI.shut && UI.shut[gk]);
      h += `</div><button class="brandhead ${lastBrand ? '' : 'plain'} ${shut ? 'shut' : ''}" data-a="toggleGrp" data-v="${gk}"><span class="bh"><b>${lastBrand || '🚗 Everyday & classic'}</b>${lastBrand ? `<small>${BRAND_BLURB[lastBrand]}</small>` : ''}</span><em>${cnt}</em><i class="chev">▾</i></button><div class="agrid ${shut ? 'hide' : ''}">`;
    }
    h += `<div class="acard"><span class="ai">${itemArt(UI.cat, it, 64)}</span><b>${it.n}</b>
      <small>${UI.cat === 'exp' ? 'One-time experience' : it.up ? 'upkeep ' + fmt(it.price * it.up) + '/yr' : 'no upkeep'}${it.looks ? ' · +' + it.looks + ' looks' : ''}</small>
      ${it.perk ? `<span class="perk">${it.perk}</span>` : ''}
      ${it.brand ? `<span class="brand t${it.tier}">${it.brand}${it.unique ? ' · 1/1 UNIQUE' : ''}</span>` : ''}
      ${buyBlock(it, i)}</div>`;
  });
  return h + '</div>';
}
const brandRank = (a) => { const it = findItem(a.cat, a.n); return it && it.brand ? ['Scarlatti', 'Bellucci', 'Zeffiro', 'Kronvik', 'Torrente'].indexOf(it.brand) + 1 : 0; };
function stuffHTML() {
  if (!S.assets.length) return '<div class="note">You do not own anything yet. Buy something in the Shop, then come back here to use it, upgrade it, rent it out or sell it.</div>';
  let h = '', last = null;
  const order = Object.keys(ASSETS);
  S.assets.map((a, i) => ({ a, i })).sort((x, y) => order.indexOf(x.a.cat) - order.indexOf(y.a.cat) || brandRank(x.a) - brandRank(y.a)).forEach(({ a, i }) => {
    if (a.cat !== last) { h += `<h5>${ASSETS[a.cat].icon} ${ASSETS[a.cat].label}</h5>`; last = a.cat; }
    const it = findItem(a.cat, a.n) || {}, c = cond(a), used = a.used || {};
    const btns = itemActs(a).map(id => {
      const d = ACTS[id], cost = Math.round(d.cost(a)), why = !d.toggle && used[id] ? 'Done this year' : S.cash < cost ? 'Need ' + fmt(cost) : S.jail ? 'In prison' : '';
      return `<button class="mini" ${why ? 'disabled title="' + why + '"' : ''} data-a="itemAct" data-v="${i}:${id}">${d.icon} ${actLabel(id, a)}${cost ? ' ' + fmt(cost) : ''}</button>`;
    }).join('');
    if (a.cat === 'car' && typeof Garage !== 'undefined' && Garage.keyOf(a)) {
      const mods = Garage.norm(a.mods), tags = [mods.wide ? '🏁 Widebody' : '', mods.paint ? '🎨 Custom paint' : '', mods.wrap ? '🌸 Wrap' : '', mods.wheel ? '🛞 Wheels' : '', mods.light ? '💡 Lights' : '', mods.neon ? '🌈 Neon' : ''].filter(Boolean);
      h += `<div class="card item carcard"><div class="carstage">${Garage.hero(a, () => itemArt(a.cat, it, 96))}</div>
        <div class="cinfo">${it.brand ? `<span class="brand t${it.tier}">${it.brand}${it.unique ? ' · 1/1 UNIQUE' : ''}</span>` : ''}<b>${a.n}</b> ${a.rented ? '<i class="tag">Rented out</i>' : ''}
        <div class="cstats"><span>💰 Worth <b>${fmt(a.value)}</b></span><span>🔧 Upkeep <b>${a.up ? fmt(a.price * a.up) + '/yr' : 'none'}</b></span></div>
        <div class="sb"><label>Condition</label><div class="bar"><i style="width:${c}%;background:${hcol(c)}"></i></div><b>${Math.round(c)}</b></div>
        ${tags.length ? `<div class="ctags">${tags.map(t => `<i>${t}</i>`).join('')}</div>` : ''}${it.perk ? `<span class="perk">${it.perk}</span>` : ''}</div>
        <div class="btns">${btns}<button class="mini" data-a="sellAsset" data-v="${i}">💵 Sell ${fmt(sellValue(a))}</button></div></div>`;
      return;
    }
    h += `<div class="card item"><div class="row nobg"><span class="ic">${carArt(a, 52)}</span><div class="grow"><b>${a.n}</b> ${a.rented ? '<i class="tag">Rented out</i>' : ''}
      <small>Worth ${fmt(a.value)} · ${a.up ? 'upkeep ' + fmt(a.price * a.up) + '/yr' : 'no upkeep'}${a.cat === 'pet' ? ' · bond ' + Math.round(a.bond == null ? 50 : a.bond) + ' · age ' + (a.age || 0) : ''}</small>
      ${DECAY[a.cat] ? `<div class="sb"><label>Condition</label><div class="bar"><i style="width:${c}%;background:${hcol(c)}"></i></div><b>${Math.round(c)}</b></div>` : ''}${it.perk ? `<span class="perk">${it.perk}</span>` : ''}</div></div>
      <div class="btns">${btns}<button class="mini" ${a.cat === 'pet' ? 'disabled' : ''} data-a="sellAsset" data-v="${i}">💵 Sell ${fmt(sellValue(a))}</button></div></div>`;
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

const actRow = (a) => `<div class="row"><span class="ic">${a.icon}</span><div class="grow"><b>${a.n}</b><small>${a.cost ? fmt(a.cost) : 'Free'} · ${a.fx}</small></div><button class="btn sm" ${S.age >= a.minAge && S.cash >= a.cost && !S.done[a.id] && !S.jail ? '' : 'disabled'} data-a="fun" data-v="${a.id}">${S.age < a.minAge ? a.minAge + '+' : S.done[a.id] ? 'Done' : 'Do it'}</button></div>`;
function crazyHTML() {
  const head = tabs('crazy', [['fun', '🎯 Activities'], ['casino', '🎰 Casino'], ['crime', '😈 Crime']]);
  if (UI.sub.crazy === 'casino') return head + casinoHTML();
  if (UI.sub.crazy === 'fun') return head + ACT_GROUPS.map(([gk, gl]) => `<h5>${gl}</h5>` + ACTIVITIES.filter(a => a.grp === gk).map(actRow).join('')).join('');
  return head + `<div class="note">Heat: ${S.heat} · Record: ${S.record} arrest(s). Higher heat means more risk. Heat halves each year. Bad karma is building: ${Math.round(S.karma || 0)}. Good luck lowers your risk.</div>` + CRIMES.map(c => {
    const why = S.age < c.minAge ? c.minAge + '+' : c.smarts && S.smarts < c.smarts ? 'Smarts ' + c.smarts : c.biz && !S.biz.length ? 'Needs business' : c.cash && S.cash < c.cash ? 'Needs cash' : '';
    return `<div class="row"><span class="ic">${c.icon}</span><div class="grow"><b>${c.n}</b><small>${fmt(c.reward[0])}–${fmt(c.reward[1])} · risk ~${Math.round(Math.max(0, c.risk + S.heat * 0.03 - luckAdj() * 0.08) * 100)}%</small></div><button class="btn sm bad" ${why || S.jail ? 'disabled' : ''} data-a="crime" data-v="${c.id}">${why || 'Try'}</button></div>`;
  }).join('');
}

function lifeTiles() {
  const homeIdx = S.assets.filter(a => a.cat === 'home').reduce((m, a) => Math.max(m, ASSETS.home.items.findIndex(x => x.n === a.n)), -1);
  return [
    { n: 'Home', ico: 'life-home', e: '🏠', p: homeIdx < 0 ? 0 : Math.round((homeIdx + 1) / ASSETS.home.items.length * 100), lv: homeIdx + 1 },
    { n: 'Relationships', ico: 'life-rel', e: '💞', p: S.partner ? Math.round(S.partner.score) : 0, lv: 1 + (S.partner && S.partner.married ? 1 : 0) + Math.min(3, S.kids.length) },
    { n: 'Health', ico: 'life-health', e: '🏃', p: Math.round(S.health), lv: 1 + Math.floor(S.health / 25) },
    { n: 'Education', ico: 'life-edu', e: '🎓', p: Math.round(S.smarts), lv: S.deg ? 4 : S.college ? 3 : S.age >= 14 ? 2 : 1 },
    { n: 'Hobbies', ico: 'life-hobby', e: '🎨', p: Math.min(100, S.hobbies * 10), lv: 1 + Math.floor(S.hobbies / 3) },
    { n: 'Travel', ico: 'life-travel', e: '✈️', p: Math.min(100, S.trips * 20), lv: 1 + S.trips }
  ];
}
function statusHTML() {
  updateGoals();
  const t = statusTitle(), nw = netWorth(), xp = (S.xp || 0) % 300;
  const power = Math.round(clamp(Math.log10(Math.max(10, nw)) * 10 + S.biz.length * 3 + S.fame * 0.3 - 20));
  const claimable = S.goals.some(g => g.done && !g.claimed);
  return `<div class="lvlhead"><div class="lv">👑 LEVEL ${level()}</div><div class="xpbar"><i style="width:${xp / 3}%"></i><span>XP ${xp}/300</span></div></div>
    <div class="card gold"><b>${stageIcon()} ${S.name}</b><br>${S.flag} ${S.country} · born into a ${FAMILIES[S.tier].n} family<br>Net worth <b>${fmt(nw)}</b> (${t.w}) · ${t.f}<br>🍀 Luck <b>${Math.round(luckV())}</b> · ☯️ Karma <b>${(S.karma || 0) >= 0 ? '+' : ''}${Math.round(S.karma || 0)}</b></div>
    <div class="tiles">${lifeTiles().map(x => `<div class="tile"><b>${x.n}</b><div class="ring" style="--p:${x.p}"><span class="lic" style="background-image:url(assets/runway/ui/${x.ico}.png)">${x.e}</span></div>${x.p}%<br><span class="lvb">Lvl ${x.lv}</span></div>`).join('')}</div>
    <div class="goals"><h4>Yearly Goals</h4>${S.goals.map(g => `<div class="goal ${g.done ? 'done' : ''} ${g.claimed ? 'claimed' : ''}"><span class="cb">${g.done ? '✓' : ''}</span>${g.t}<span class="rw">${rewardText(g)}</span></div>`).join('') || '<div class="goal">No goals right now.</div>'}
      <button class="btn big gold" data-a="claim" ${claimable ? '' : 'disabled'}>Claim Reward</button></div>
    <h5>Milestones ${S.ach.length}/${ACH.length}</h5>
    <div class="trophies">${ACH.map(a => { const u = S.ach.includes(a.id); return `<div class="trophy ${u ? '' : 'lockd'}"><span style="background-image:url(assets/runway/ui/${u ? 'trophy' : 'trophy-lock'}.png)">${u ? '🏆' : '🔒'}</span>${a.t.split(' — ')[0]}</div>`; }).join('')}</div>
    <h5>Stats</h5>${bar('👑 Fame', S.fame, 'y')}${bar('⚡ Power', power, 'b')}${bar('😊 Happy', S.happy, 'g')}${bar('🧠 Smarts', S.smarts, 'b')}${bar('✨ Looks', S.looks, 'y')}${bar('❤️ Health', S.health, 'r')}
    <h5>Life</h5><button class="btn sm bad" data-a="restart">Start a new life</button>`;
}

/* ---------- actions ---------- */
const A = {
  sub(v, el) { UI.sub[el.dataset.g] = v; refresh(); },
  niche(v) { UI.niche = v; refresh(); }, filter(v) { UI.filter = v; refresh(); }, cat(v) { UI.cat = v; refresh(); },
  apply(id) {
    const d = JOBS.find(j => j.id === id); S.done.apply = true;
    if (chance(0.8 + S.smarts / 500)) { S.job = id; S.jobYears = 0; say('💼', `You were hired as ${d.ladder[0]}.`, 'good'); } else say('💼', `Your application for ${d.ladder[0]} was rejected.`, 'bad');
    save(); refresh(); renderFeed();
  },
  quit() { say('💼', `You quit your job as ${occupation()}.`, ''); S.job = null; S.jobYears = 0; save(); refresh(); renderFeed(); },
  toggleStart() { UI.startOpen = !UI.startOpen; refresh(); },
  start(id) {
    const H = HUBS[id]; if (!H || S.cash < H.cost || S.biz.some(b => b.id === id) || S.age < 16) return;
    S.cash -= H.cost;
    const nb = { id, level: 1, termLeft: 999, contract: { cp: '—', share: 60, term: 3, excl: false, fee: true, trapId: null, trapStruck: true, revealed: true }, dilution: 0, ap: 0, log: [], last: null };
    H.init(nb); nb.ap = apMax(nb); S.biz.push(nb); UI.hub = S.biz.length - 1; UI.startOpen = false;
    say(H.icon, `You started ${H.name}${H.cost ? ' for ' + fmt(H.cost) : ''}.`, 'gold'); checkAch(); save(); refresh(); renderFeed();
  },
  openHub(i) { UI.hub = +i; UI.src = null; refresh(); },
  closeHub() { UI.hub = null; UI.src = null; refresh(); },
  hubTask(v) {
    const [i, id, arg] = v.split(':'), b = S.biz[+i]; if (!b) return;
    const mk = HUBS[b.id].defs(b)[id]; if (!mk) return;
    const d = mk(arg); if (d.why || !canAp(b.ap, d.ap) || S.cash < d.cost) return;
    if (ENERGY_ON) b.ap -= d.ap; S.cash -= d.cost; S.done.hub = true;
    const msg = d.run(); if (msg) { hlog(b, msg); toast(msg); }
    S.fame = Math.max(S.fame, socialFame()); save(); refresh();
  },
  hubPhone(i) { const b = S.biz[+i]; if (!b || !canAp(b.ap, 1)) return; if (ENERGY_ON) b.ap--; S.done.hub = true; hubCall(b); },
  upgrade(i) {
    const b = S.biz[i], H = HUBS[b.id], up = Math.round(H.lvlBase * Math.pow(2, b.level - 1) * 1.5);
    if (S.cash < up || b.level >= 10) return; S.cash -= up; b.level++; b.ap += 1; S.done.upg = true; S.xp += 10 * b.level;
    say(H.icon, `You expanded ${H.name} to level ${b.level}.`, 'good'); S.fame += 0.5; checkAch(); save(); refresh(); renderFeed();
  },
  sell(i) { openSale(+i); },
  buy(i) {
    const it = ASSETS[UI.cat].items[i]; if (!it || S.cash < it.price || buyLock(it)) return;
    S.cash -= it.price;
    if (UI.cat === 'exp') {
      const e = it.e || {}; let msg = it.msg || e.msg || '';
      if (it.gamble) { const r = Math.random(); if (r < 0.04) { S.cash += 400000; S.happy = clamp(S.happy + 15); msg = 'JACKPOT! You won $400,000.'; } else if (r < 0.4) { const w = Math.round(it.price * 1.6); S.cash += w; S.happy = clamp(S.happy + 6); msg = `You won ${fmt(w)}.`; } else { S.happy = clamp(S.happy - 3); msg = 'The house won this time.'; } }
      S.happy = clamp(S.happy + (e.happy || 0)); S.health = clamp(S.health + (e.health || 0)); S.smarts = clamp(S.smarts + (e.smarts || 0)); S.fame += e.fame || 0; S.trips += e.trips || 0; if (e.deg) S.deg = true;
      if (it.partner && S.partner) S.partner.score = clamp(S.partner.score + it.partner);
      if (it.risk && chance(it.risk.p)) { if (it.risk.cost) S.cash -= it.risk.cost; if (it.risk.health) S.health = clamp(S.health + it.risk.health); msg = it.risk.msg; }
      say(it.icon, `${it.n}: ${msg}`, 'gold'); toast(msg); if (S.health <= 0) die();
    } else {
      if (UI.cat === 'car') S.carSpend = (S.carSpend || 0) + it.price;
      S.assets.push({ cat: UI.cat, n: it.n, icon: it.icon, price: it.price, up: it.up, dep: it.dep, value: it.price, cond: 100, used: {}, age: 0, bond: 50 });
      S.happy = clamp(S.happy + it.happy); S.fame += it.fame || 0; S.looks = clamp(S.looks + (it.looks || 0));
      say(it.icon, `You bought a ${it.n} for ${fmt(it.price)}.`, 'gold'); toast(`Bought ${it.n}. Find it in My stuff.`);
      if (UI.cat === 'car' && typeof Garage !== 'undefined' && Garage.keyOf(S.assets[S.assets.length - 1])) { const car = S.assets[S.assets.length - 1]; Garage.load(Garage.keyOf(car)).catch(() => {}); showModal({ icon: it.icon, title: `Your ${it.n}!`, text: 'Brand new and begging for a makeover. Widebody kit, fresh paint, glowing headlights?', buttons: [{ t: '🔧 Open the garage', cls: 'gold', fn: () => setTimeout(() => Garage.open(car), 150) }, { t: 'Later' }] }); }
    }
    checkAch(); save(); refresh(); renderFeed();
  },
  sellAsset(i) { const a = S.assets[i]; if (!a) return; const v = sellValue(a); S.cash += v; say(a.icon, `You sold your ${a.n} for ${fmt(v)}.`, ''); S.assets.splice(i, 1); save(); refresh(); renderFeed(); },
  itemAct(v) {
    const [i, id] = v.split(':'), a = S.assets[+i]; if (!a) return;
    const d = ACTS[id]; if (!d || S.jail) return;
    const cost = Math.round(d.cost(a)); a.used = a.used || {};
    if ((!d.toggle && a.used[id]) || S.cash < cost) return;
    S.cash -= cost; if (!d.toggle) a.used[id] = true;
    const msg = d.run(a); if (d.sell) S.assets.splice(+i, 1);
    if (!msg) return;
    S.happy = clamp(S.happy); say(d.icon, msg, 'gold'); toast(msg); S.done.item = true;
    if (S.health <= 0) die();
    checkAch(); save(); refresh(); renderFeed();
  },
  inv(v) { const [k, p] = v.split(':'); const amt = Math.max(0, S.cash) * parseFloat(p); if (amt < 1) return; S.done.inv = true; S.cash -= amt; S.invest[k] += amt; save(); refresh(); },
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
  call(k) { S.done[k] = true; addKarma(1); S.happy = clamp(S.happy + 3); say('📞', `You called ${k === 'mom' ? 'Mom' : 'Dad'}. It felt good.`, 'good'); save(); refresh(); renderFeed(); },
  crime(id) {
    const c = CRIMES.find(x => x.id === id); const caught = c.risk + S.heat * 0.03 - S.smarts / 500 - luckAdj() * 0.08;
    S.heat += 2; addKarma(-3);
    if (chance(caught)) {
      const yrs = ri(c.jail[0], c.jail[1]);
      if (yrs === 0) { const f = Math.max(500, Math.round(Math.max(0, S.cash) * 0.05)); S.cash -= f; say('🚔', `You got caught (${c.n}) and paid a ${fmt(f)} fine.`, 'bad'); }
      else { S.jail = yrs; S.record++; S.job = null; S.jobYears = 0; S.fame = Math.max(0, S.fame - 5); say('🚔', `Busted for "${c.n}"! Sentenced to ${yrs} year(s) in prison.`, 'bad'); checkAch(); }
    } else { const g = Math.round(rnd(c.reward[0], c.reward[1])); S.cash += g; say(c.icon, `You got away with it: ${c.n}. +${fmt(g)}.`, 'gold'); }
    save(); refresh(); renderFeed();
  },
  fun(id) {
    if (id === 'meditate') return openBreathe();
    if (id === 'gym') return openGym();
    const a = ACTIVITIES.find(x => x.id === id); S.done[id] = true; S.cash -= a.cost; if (id === 'travel') S.trips++; else S.hobbies++;
    const r = a.run(S);
    S.happy = clamp(S.happy + (r.happy || 0)); S.health = clamp(S.health + (r.health || 0)); S.smarts = clamp(S.smarts + (r.smarts || 0)); S.looks = clamp(S.looks + (r.looks || 0)); S.fame = Math.max(0, S.fame + (r.fame || 0)); S.cash += r.cash || 0; if (id === 'charity') addKarma(6);
    say(a.icon, r.msg, (r.health < 0 || r.looks < 0 || r.happy < 0) ? 'bad' : 'good');
    if (S.health <= 0) die();
    save(); refresh(); renderFeed();
  },
  claim() {
    let n = 0;
    S.goals.forEach(g => { if (g.done && !g.claimed) { g.claimed = true; n++; S.xp += 25; if (g.k === 'cash') S.cash += rewardCash(); else if (g.k === 'happy') S.happy = clamp(S.happy + 5); else S.smarts = clamp(S.smarts + 3); } });
    if (n) say('🎯', `You claimed ${n} goal reward${n > 1 ? 's' : ''}.`, 'gold');
    save(); refresh(); renderFeed();
  },
  toggleGrp(k) { UI.shut = UI.shut || {}; UI.shut[k] = !UI.shut[k]; refresh(); },
  restart() { showModal({ icon: '⚠️', title: 'Start over?', text: 'This ends your current life and starts a new one.', buttons: [{ t: 'New life', cls: 'bad', fn: () => { newLife(); closePanel(); renderFeed(); refresh(); } }, { t: 'Cancel' }] }); }
};

Object.assign(A, SA, HA);

/* ---------- immersive contract signing ---------- */
const REP_LINES = {
  open: ['Let\'s keep this quick. I have another meeting at three.', 'Read it carefully. Or don\'t. Most people don\'t.', 'Standard terms. Take it or leave it.'],
  win: ['Fine. You drive a hard bargain.', 'Hmm. I can move a little on that.', 'Alright, but this is my final concession.'],
  lose: ['No. That is non-negotiable.', 'Don\'t push your luck, kid.', 'My legal team would never allow it.'],
  magnify: ['You are actually reading it? ...Impressive.', 'Nothing to see in the small print. Really.']
};

const SALE_TRAPS = [
  { id: 'holdback', text: 'Section 6(b): 20% of the price is withheld for 12 months and can be reduced by up to 50% for any post-sale dispute.', fx: 0.93 },
  { id: 'indemnity', text: 'Section 9(a): Seller indemnifies Buyer for every pre-sale liability, capped at 10% of the price.', fx: 0.92 },
  { id: 'earnout', text: 'Section 4(c): The final price drops by 8% if first-year revenue falls short of the Seller\'s projections.', fx: 0.92 }
];
function salePrice(c) {
  let p = c.value * c.pm;
  if (c.nc) p *= 1.10;
  if (c.inst) p *= 1.08;
  if (c.trapId && !c.trapStruck) p *= SALE_TRAPS.find(t => t.id === c.trapId).fx;
  return p;
}
function openSale(idx) {
  const b = S.biz[idx], H = HUBS[b.id];
  C = { idx, d: H, cp: pick(COMPANIES) + ' ' + pick(['Ltd.', 'LLC', 'GmbH', 'Inc.', 'S.A.']), rep: pick(REPS), value: bizValue(b), pm: 0.7, inst: false, nc: false,
        trapId: chance(0.75) ? pick(SALE_TRAPS).id : null, trapRead: false, trapStruck: false, tension: 0, ink: 0, say: pick(REP_LINES.open) };
  $('contract').classList.add('open');
  $('cDesk').innerHTML = `
    <div class="rep"><span class="face">🧑‍💼</span><div class="bubble" id="cSay"></div></div>
    <div class="paper">
      <div class="lh"><b>${C.cp}</b><span class="seal">⚖️</span></div>
      <h3>BUSINESS SALE AGREEMENT</h3>
      <p class="pre">This Agreement is entered into between <b>${S.name}</b> ("Seller") and <b>${C.cp}</b> ("Buyer"), represented by ${C.rep}, for the sale of <b>${H.name}</b>, including its customers, stock and brand.</p>
      <div id="cClauses"></div>
      <div id="cFine"></div>
      <div class="sig"><canvas id="cCanvas" width="600" height="120"></canvas><span class="x">✗</span><button class="link" id="cClear">clear</button></div>
      <div class="stamp" id="cStamp">SOLD</div>
    </div>
    <div class="deskbar"><div id="cSum"></div><div class="btns"><button class="btn" id="cWalk">Keep the business</button><button class="btn gold" id="cSign">✍️ Sign &amp; sell</button></div></div>`;
  $('cSay').textContent = C.say;
  drawContract(); setupSignature();
  $('cWalk').onclick = () => closeContract();
  $('cSign').onclick = signContract;
}
function closeContract() { $('contract').classList.remove('open'); C = null; refresh(); }
function repSay(t) { C.say = t; $('cSay').textContent = t; }

function drawContract() {
  const c = C, trap = SALE_TRAPS.find(t => t.id === c.trapId);
  $('cClauses').innerHTML = `<ol>
    <li><b>Sale price.</b> Buyer offers <span class="chip">${fmt(c.value * c.pm)}</span> (${Math.round(c.pm * 100)}% of valuation). <button class="link" data-c="price">negotiate ↑</button></li>
    <li><b>Payment.</b> <button class="opt ${!c.inst ? 'on' : ''}" data-c="pay" data-v="lump">Lump sum</button><button class="opt ${c.inst ? 'on' : ''}" data-c="pay" data-v="inst">3 yearly installments (+8%)</button></li>
    <li><b>Non-compete.</b> <button class="opt ${!c.nc ? 'on' : ''}" data-c="nc" data-v="no">None</button><button class="opt ${c.nc ? 'on' : ''}" data-c="nc" data-v="yes">5 years (+10%)</button></li>
  </ol>`;
  $('cFine').innerHTML = `<div class="fine"><small>Fine print: ${c.trapId ? (c.trapRead ? `<mark>${trap.text}</mark>` : `<span class="blur">${trap.text}</span>`) : 'Standard boilerplate. Nothing unusual.'}</small></div>
    ${c.trapRead && c.trapId && !c.trapStruck ? '<button class="link" data-c="strike">✂️ strike this clause</button>' : ''}${c.trapRead && c.trapStruck ? '<small class="g">Clause struck ✔</small>' : ''}
    ${c.trapRead ? '' : '<button class="link" data-c="read">🔍 read the fine print</button>'}`;
  $('cSum').innerHTML = `You receive <b class="g">${fmt(salePrice(c))}</b>${c.inst ? ' over 3 years' : ' now'}${c.trapId && !c.trapRead ? ' · <span class="bad">unread fine print</span>' : ''}`;
  document.querySelectorAll('#cClauses [data-c], #cFine [data-c]').forEach(el => { el.onclick = () => contractAct(el.dataset.c, el.dataset.v); });
}

function negotiate(label, apply) {
  const p = clamp(0.3 + S.smarts / 250 + S.fame / 500 - C.tension * 0.15, 0.05, 0.9);
  if (chance(p)) { apply(); repSay(pick(REP_LINES.win)); }
  else { C.tension++; repSay(pick(REP_LINES.lose)); if (C.tension >= 3) { const cp = C.cp; say('📄', `${cp} walked out of the sale talks for ${C.d.name}.`, 'bad'); closeContract(); renderFeed(); showModal({ icon: '🚪', title: 'They walked out', text: `${cp} lost patience and left the table.` }); return; } }
  drawContract();
}
function contractAct(k, v) {
  if (k === 'price') { if (C.pm >= 1.05) return repSay('That is as high as I can go.'); negotiate('price', () => { C.pm = +(C.pm + 0.05).toFixed(2); }); }
  else if (k === 'pay') { C.inst = v === 'inst'; drawContract(); }
  else if (k === 'nc') { C.nc = v === 'yes'; drawContract(); }
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
  $('cStamp').classList.add('show');
  const c = C, price = salePrice(c);
  setTimeout(() => {
    const b = S.biz[c.idx];
    if (c.inst) { S.cash += price / 3; S.payments.push({ amt: price / 3, left: 2 }); } else S.cash += price;
    S.done.sign = true; S.biz.splice(c.idx, 1); UI.hub = null;
    say('✍️', `You sold ${c.d.name} to ${c.cp} for ${fmt(price)}${c.inst ? ' (paid over 3 years)' : ''}.`, 'gold');
    if (c.trapId && !c.trapStruck) say('😬', 'The fine print in the sale cost you part of the price.', 'bad');
    save(); closeContract(); renderFeed();
  }, 1000);
}

/* ---------- boot ---------- */
Object.assign(A, CASINO_ACTS);
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) A[el.dataset.a](el.dataset.v, el);
  const p = e.target.closest('[data-p]'); if (p) { UI.panel === p.dataset.p ? closePanel() : openPanel(p.dataset.p); }
});
$('ageBtn').addEventListener('click', ageUp);
$('hero').addEventListener('click', tap);
$('btnGear').addEventListener('click', () => { if (S) openPanel('status'); });
$('sheetClose').addEventListener('click', closePanel);
$('btnNew').addEventListener('click', () => { newLife(); $('title').classList.remove('open'); renderFeed(); refresh(); });
$('btnCont').addEventListener('click', () => { $('title').classList.remove('open'); renderFeed(); refresh(); });
if (load() && S.alive) $('btnCont').hidden = false;
preloadArt();
