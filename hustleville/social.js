/* Hustleville — social media + celebrity life. Fame here is luck-driven: steady posting grows
   you slowly, but only a few accounts ever break out. Loaded after hubs.js, before game.js. */
'use strict';

const BRANDS = [['Zephyr Sneakers', '👟'], ['GlowLab Skincare', '🧴'], ['PixelPro Headsets', '🎧'], ['FuelUp Energy', '🥤'], ['Aurora Watches', '⌚'], ['TravelNest', '🧳'],
  ['BiteBox Meals', '🍔'], ['Volt Mobile', '📱'], ['Luxe Motors', '🚘'], ['StreamPlus', '📺'], ['FitFuel Protein', '💪'], ['Maison Couture', '👗']];
const TRENDS = ['dance', 'fitness', 'finance', 'comedy', 'fashion', 'gaming', 'food', 'travel', 'pets', 'storytime'];
const POSTS = [
  { id: 'selfie', icon: '📸', t: 'Selfie / outfit', d: 'Low risk. Looks help.', sig: 0.5, conv: 0.03, pv: 0.012, rep: [0, 1] },
  { id: 'vlog', icon: '🎥', t: 'Day-in-my-life vlog', d: 'Steady, personal growth.', sig: 0.6, conv: 0.035, pv: 0.015, rep: [0, 2] },
  { id: 'hot', icon: '🔥', t: 'Hot take', d: 'Big swings. Can blow up or backfire.', sig: 1.1, conv: 0.045, pv: 0.03, rep: [-14, 6], risky: true },
  { id: 'trend', icon: '💃', t: 'Join the trend', d: 'Riding this year\'s trend boosts reach.', sig: 0.9, conv: 0.04, pv: 0.025, rep: [0, 2], useTrend: true },
  { id: 'tutorial', icon: '📚', t: 'Tutorial / value post', d: 'Smarts help. Slow and steady.', sig: 0.4, conv: 0.04, pv: 0.01, rep: [1, 3], smarts: true },
  { id: 'collab', icon: '🤝', t: 'Collab with a creator', d: 'Borrow someone else\'s audience.', sig: 0.7, conv: 0.05, pv: 0.02, rep: [0, 3], collab: true },
  { id: 'live', icon: '🔴', t: 'Go live', d: 'Fans tip you in real time.', sig: 0.5, conv: 0.03, pv: 0.01, rep: [0, 3], tips: true },
  { id: 'giveaway', icon: '🎁', t: 'Giveaway', d: 'Costs $200. Fast follower surge.', sig: 0.4, conv: 0.08, pv: 0.015, rep: [-1, 2], cost: 200 },
  { id: 'charity', icon: '🎗️', t: 'Charity post', d: 'Reputation boost.', sig: 0.5, conv: 0.025, pv: 0.012, rep: [4, 10] },
  { id: 'sponsored', icon: '💼', t: 'Sponsored post', d: 'Fulfills an active brand deal.', sig: 0.5, conv: 0.02, pv: 0.008, rep: [-2, 0], needsDeal: true }
];
const CAPTIONS = {
  selfie: ['New fit, who dis?', 'Golden hour hits different', 'Casual Tuesday vibes'], vlog: ['Come spend the day with me', 'A very normal day (it wasn\'t)', 'Morning routine, finally'],
  hot: ['Unpopular opinion thread 🧵', 'I said what I said', 'Everyone is wrong about this'], trend: ['Did the challenge!', 'Okay fine, I joined the trend', 'Tried it so you don\'t have to'],
  tutorial: ['5 things I wish I knew sooner', 'Step-by-step, save this', 'How I actually do it'], collab: ['Collab day with a friend!', 'We finally made something together', 'Duet that got out of hand'],
  live: ['Live now, come hang out', 'Q&A with you all', 'Late-night live, ask me anything'], giveaway: ['GIVEAWAY: follow + share', 'Thank you for 1 more year', 'Free stuff for my favorite people'],
  charity: ['Giving back this week', 'Please help this cause', 'Proud of this community'], sponsored: ['Partnered with a brand I love', 'Use my code for a discount', 'Ad, but a good one']
};
const fmtN = (n) => fnum(n);

/* ---------- state ---------- */
function socialInit() {
  return { luck: Math.exp(gauss() * 0.75), followers: ri(0, 150), rep: 60, mood: 1, trend: pick(TRENDS), ap: 6, posts: [], deals: [], offers: [], viral: 0, celeb: false, story: [], team: {}, merch: 0, tour: 0, bestPost: 0, income: 0 };
}
const socialApMax = () => 6 + (S.social.team && S.social.team.manager ? 2 : 0) + (S.social.celeb ? 1 : 0);
function socialFame() {
  const s = S.social, F = s.followers; if (F < 500) return 0;
  return clamp((Math.log10(F + 1) - 2.5) * 22) * (0.6 + s.rep / 250) * (s.cancelled ? 0.5 : 1);
}
function socialTitle() {
  const F = S.social.followers;
  return F >= 1e8 ? 'Global icon' : F >= 1e7 ? 'Celebrity' : F >= 1e6 ? 'Star' : F >= 1e5 ? 'Rising star' : F >= 1e4 ? 'Micro-influencer' : F >= 1e3 ? 'Up and coming' : 'Just starting';
}

/* ---------- posting (the random part) ---------- */
function doPost(id) {
  const s = S.social, T = POSTS.find(p => p.id === id);
  const F = Math.max(s.followers, 0);
  const match = T.useTrend || chance(0.15);
  const quality = 0.7 + S.looks / 100 * 0.3 + S.smarts / 400 + (T.smarts ? S.smarts / 300 : 0) + (S.fame > 40 ? 0.1 : 0);
  const mult = Math.exp(gauss() * T.sig);
  let reach = (0.06 * F + 70) * mult * quality * s.mood * (s.luck || 1) * gearMul('reach');
  if (T.collab) reach += (F * rnd(0.5, 4) + rnd(500, 20000)) * 0.15;
  const flop = chance(0.18); if (flop) reach *= 0.25;
  let pv = T.pv * (match ? 2.2 : 1) * (s.mood > 1 ? 1.5 : s.mood < 1 ? 0.6 : 1) * (1 + S.looks / 300);
  const viral = chance(pv * 0.6);
  if (viral) reach *= Math.exp(rnd(Math.log(10), Math.log(120)));
  const mega = chance(0.0065 * (s.luck || 1) * (match ? 1.8 : 1) * (s.mood > 1 ? 1.4 : s.mood < 1 ? 0.5 : 1));
  if (mega) reach += Math.exp(rnd(Math.log(60000), Math.log(40000000)));
  const sat = clamp(1.15 - Math.log10(F + 10) / 9, 0.25, 1);
  let newF = Math.max(0, Math.round(reach * T.conv * sat * rnd(0.6, 1.4)));
  newF = Math.min(newF, Math.round(F * 30 + 300000));
  const likes = Math.round(reach * rnd(0.04, 0.12)), comments = Math.round(likes * rnd(0.04, 0.1));
  let rep = ri(T.rep[0], T.rep[1]), msg = '';
  if (T.tips) { const tips = Math.round(reach * 0.0004 * rnd(0.5, 1.5)); S.cash += tips; if (tips > 0) msg = ` Fans tipped ${fmt(tips)}.`; }
  if (T.needsDeal) { const d = s.deals.find(x => x.done < x.posts); if (d) d.done++; }
  s.followers = Math.min(2e9, s.followers + newF); s.posts_n = (s.posts_n || 0) + 1;
  s.rep = clamp(s.rep + rep);
  let cancelled = false;
  if (T.risky && chance(0.12 + (s.rep < 40 ? 0.15 : 0)) && s.followers > 2000) {
    cancelled = true; const loss = Math.round(s.followers * rnd(0.15, 0.3)); s.followers -= loss; s.rep = clamp(s.rep - 20); s.offers = []; s.deals = s.deals.filter(() => false); s.cancelled = true;
    msg += ` You got cancelled: -${fmtN(loss)} followers and your brand deals were pulled.`;
  }
  if (viral || mega) { s.viral++; s.bestPost = Math.max(s.bestPost, reach); S.fame += 2; }
  s.yPosts = (s.yPosts || 0) + 1;
  s.posts.unshift({ icon: T.icon, t: T.t, cap: pick(CAPTIONS[T.id]), likes, comments, newF, viral: viral || mega, flop, cancelled });
  s.posts.length = Math.min(s.posts.length, 8);
  S.fame = Math.max(S.fame, socialFame()); S.done.post = true; if (T.id === 'hot') S.done.viral = true;
  const out = (viral || mega) ? `🔥 VIRAL! ${fmtN(Math.round(reach))} views, +${fmtN(newF)} followers.${msg}` : flop ? `It flopped. +${fmtN(newF)} followers.${msg}` : `${T.t}: ${fmtN(likes)} likes, +${fmtN(newF)} followers.${msg}`;
  return { out, viral: viral || mega, cancelled };
}

/* ---------- sponsorship offers ---------- */
function makeOffer() {
  const s = S.social, F = s.followers, b = pick(BRANDS);
  const mgr = s.team.manager ? 1.2 : 1;
  return { brand: b[0], icon: b[1], fee: Math.round((F * rnd(0.02, 0.08) + 500) * mgr), posts: ri(2, 6), years: ri(1, 3), done: 0 };
}
const maxDeals = () => 1 + Math.floor(Math.max(0, Math.log10(Math.max(1, S.social.followers)) - 3) / 1.5);

/* ---------- yearly social + celebrity ---------- */
function socialChurn() { const s = S.social; s.followers = Math.round(s.followers * ((s.yPosts || 0) >= 3 ? 0.96 : 0.86)); s.yPosts = 0; }
function socialYear() {
  const s = S.social; if (!s || S.age < 13) return;
  const r = Math.random(); s.mood = r < 0.2 ? 0.6 : r > 0.85 ? 1.5 : 1; s.trend = pick(TRENDS); s.cancelled = s.rep < 25 ? s.cancelled : false;
  socialChurn();
  let income = 0;
  s.deals = s.deals.filter(d => {
    if (d.done >= d.posts) { income += d.fee; say(d.icon, `${d.brand} paid your ${fmt(d.fee)} sponsorship fee.`, 'good'); }
    else if (d.done > 0) { const f = Math.round(d.fee * d.done / d.posts); income += f; say(d.icon, `You only did ${d.done}/${d.posts} posts for ${d.brand}. Paid ${fmt(f)}.`, 'bad'); }
    else { s.rep = clamp(s.rep - 3); say(d.icon, `You ignored ${d.brand}'s deal. They ended it.`, 'bad'); return false; }
    d.years--; d.done = 0; return d.years > 0;
  });
  if (s.followers >= 100000) { const ad = Math.round(s.followers * 0.003); income += ad; say('📱', `Platform ad revenue share: ${fmt(ad)}.`, 'good'); }
  if (s.celeb) income += celebYear();
  if (income > 0) { const net = income * 0.8; S.cash += net; s.income = net; }
  s.rep = clamp(s.rep + (50 - s.rep) * 0.1 + (s.team.pr ? 4 : 0));
  if (s.followers >= 5000) { const n = chance(0.45 + (s.team.agent ? 0.3 : 0)) ? 1 : 0; for (let k = 0; k < n && s.offers.length + s.deals.length < maxDeals() + 2; k++) s.offers.push(makeOffer()); if (s.offers.length && n) say('💼', 'A brand sent you a sponsorship offer. Check Social → Deals.', 'gold'); }
  s.offers = s.offers.slice(-3);
  S.fame = Math.max(S.fame, socialFame());
  s.ap = socialApMax();
  storyBeats();
}

/* ---------- celebrity chapter ---------- */
const TEAM = [
  { id: 'manager', icon: '🧑‍💼', t: 'Manager', d: '+2 action points and 20% higher deal fees.', base: 60000 },
  { id: 'agent', icon: '📞', t: 'Talent agent', d: 'More brand offers and film roles.', base: 40000 },
  { id: 'pr', icon: '📰', t: 'PR team', d: 'Halves scandal damage, rebuilds reputation.', base: 90000 },
  { id: 'stylist', icon: '👗', t: 'Stylist', d: 'Looks and fame creep up.', base: 50000 },
  { id: 'security', icon: '🕴️', t: 'Security detail', d: 'Fewer stalker and paparazzi incidents.', base: 120000 }
];
const teamCost = (t) => Math.round(t.base * Math.max(1, S.social.followers / 2e6));
function celebYear() {
  const s = S.social; let inc = 0;
  const cost = TEAM.filter(t => s.team[t.id]).reduce((a, t) => a + teamCost(t), 0);
  if (cost) { S.cash -= cost; say('🧾', `Entourage payroll: ${fmt(cost)}.`, ''); }
  if (s.merch) { const m = Math.round(s.followers * 0.04 * s.merch * rnd(0.7, 1.3)); inc += m; say('🛍️', `Your merch line earned ${fmt(m)}.`, 'good'); }
  if (s.tour) { const t = Math.round(s.followers * 0.12 * rnd(0.6, 1.6) * (1 + s.rep / 200)); inc += t; say('🎤', `Your tour grossed ${fmt(t)}.`, 'gold'); s.tour = 0; }
  if (s.team.stylist) { S.looks = clamp(S.looks + 1); S.fame += 0.5; }
  // the celebrity walkthrough: a headline event most years
  if (chance(0.85)) { const e = pick(CELEB_EVENTS.filter(x => x.ok())); if (e) setTimeout(() => e.run(), 0); }
  return inc;
}
const CELEB_EVENTS = [
  { ok: () => true, run() {
    showModal({ icon: '📸', title: 'Paparazzi!', art: '<div class="npc">📸</div>', text: 'Photographers caught you leaving a restaurant. Tomorrow\'s tabloid cover is up to you.', buttons: [
      { t: 'Smile and pose', fn: () => { S.fame += 2; S.social.rep = clamp(S.social.rep + 2); say('📸', 'The photos made you look effortlessly cool.', 'good'); } },
      { t: 'Hide your face', fn: () => { S.social.rep = clamp(S.social.rep - 2); say('📸', 'The "celebrity is rude" headlines ran anyway.', 'bad'); } },
      { t: 'Call the PR team', fn: () => { if (S.social.team.pr) { S.social.rep = clamp(S.social.rep + 4); say('📸', 'Your PR team spun it perfectly.', 'good'); } else say('📸', 'You have no PR team to call.', ''); } }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '🏆', title: 'Award show invite', art: '<div class="npc">🏆</div>', text: 'You are invited to a major award show. Designers want to dress you, and it is not cheap.', buttons: [
      { t: 'Go all out ($' + fnum(S.social.followers * 0.004) + ')', fn: () => { S.cash -= S.social.followers * 0.004; S.fame += 4; S.social.followers = Math.round(S.social.followers * 1.04); say('🏆', 'You stole the red carpet. +4% followers.', 'gold'); } },
      { t: 'Wear something simple', fn: () => { S.social.followers = Math.round(S.social.followers * 1.01); say('🏆', 'Understated and classy.', ''); } },
      { t: 'Skip it', fn: () => say('🏆', 'You stayed home.', '') }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '📰', title: 'Tabloid rumor', art: '<div class="npc">📰</div>', text: 'A tabloid claims you secretly feuded with another star. It is not true.', buttons: [
      { t: 'Post a calm denial', fn: () => { S.social.rep = clamp(S.social.rep + 3); say('📰', 'Your calm post shut the rumor down.', 'good'); } },
      { t: 'Clap back publicly', fn: () => { if (chance(0.5)) { S.social.followers = Math.round(S.social.followers * 1.05); say('📰', 'Your clap-back went viral.', 'gold'); } else { S.social.rep = clamp(S.social.rep - 10); say('📰', 'The clap-back made things worse.', 'bad'); } } },
      { t: 'Ignore it', fn: () => { S.social.rep = clamp(S.social.rep - (S.social.team.pr ? 2 : 5)); say('📰', 'The rumor lingered for weeks.', 'bad'); } }] }); } },
  { ok: () => !S.social.team.security, run() {
    showModal({ icon: '😨', title: 'Obsessed fan', art: '<div class="npc">😨</div>', text: 'A fan has been following you home. You feel unsafe.', buttons: [
      { t: 'Hire a security detail', fn: () => { S.social.team.security = true; say('🕴️', 'You hired round-the-clock security.', 'good'); } },
      { t: 'Report to police', fn: () => { S.happy = clamp(S.happy - 4); say('🚔', 'Police opened a case. You stayed on edge.', ''); } },
      { t: 'Brush it off', fn: () => { S.health = clamp(S.health - 8); S.happy = clamp(S.happy - 10); say('😨', 'It got scarier and you could not sleep.', 'bad'); } }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '🕰️', title: 'Old posts resurface', art: '<div class="npc">🕰️</div>', text: 'Someone dug up cringe posts you made years ago. People are mad.', buttons: [
      { t: 'Apology video', fn: () => { S.social.rep = clamp(S.social.rep - 3); say('🕰️', 'The apology was well received.', ''); } },
      { t: 'Delete everything', fn: () => { S.social.rep = clamp(S.social.rep - 8); say('🕰️', 'Deleting looked guilty.', 'bad'); } },
      { t: 'Own it with humor', fn: () => { if (chance(0.6)) { S.fame += 3; say('🕰️', 'Your humor turned it into a win.', 'gold'); } else { S.social.rep = clamp(S.social.rep - 12); say('🕰️', 'The joke did not land.', 'bad'); } } }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '🎙️', title: 'Talk show invite', art: '<div class="npc">🎙️</div>', text: 'A late-night host wants you as a guest next week.', buttons: [
      { t: 'Accept', fn: () => { const g = Math.round(S.social.followers * rnd(0.01, 0.04)); S.social.followers += g; S.fame += 2; say('🎙️', `You charmed the audience. +${fmtN(g)} followers.`, 'good'); } },
      { t: 'Decline politely', fn: () => say('🎙️', 'You passed on the interview.', '') }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '🤝', title: 'Brand conflict', art: '<div class="npc">🤝</div>', text: 'Two rival brands both want to sponsor your next campaign.', buttons: [
      { t: 'Pick the bigger paycheck', fn: () => { const g = Math.round(S.social.followers * rnd(0.03, 0.08)); S.cash += g; say('💼', `You signed the richer deal: +${fmt(g)}.`, 'gold'); } },
      { t: 'Pick the brand you love', fn: () => { S.social.rep = clamp(S.social.rep + 5); say('💼', 'Fans loved how authentic that was.', 'good'); } }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '😵', title: 'Burnout', art: '<div class="npc">😵</div>', text: 'Constant events, travel and posting are wearing you down.', buttons: [
      { t: 'Take a month off', fn: () => { S.health = clamp(S.health + 10); S.happy = clamp(S.happy + 8); S.social.followers = Math.round(S.social.followers * 0.98); say('😵', 'You rested. Followers dipped a little.', ''); } },
      { t: 'Push through', fn: () => { S.health = clamp(S.health - 10); S.happy = clamp(S.happy - 8); say('😵', 'You kept going and paid for it.', 'bad'); } }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '💬', title: 'Fan frenzy', art: '<div class="npc">💬</div>', text: 'A crowd mobbed you at the airport and wants selfies.', buttons: [
      { t: 'Take photos with everyone', fn: () => { S.social.rep = clamp(S.social.rep + 5); S.happy = clamp(S.happy + 4); say('💬', 'Fans posted about how kind you were.', 'good'); } },
      { t: 'Leave quickly', fn: () => say('💬', 'You made your flight on time.', '') }] }); } },
  { ok: () => true, run() {
    showModal({ icon: '💔', title: 'An ex sells a story', art: '<div class="npc">💔</div>', text: 'A tabloid is paying your ex for their version of events.', buttons: [
      { t: 'Pay for silence ($' + fnum(S.social.followers * 0.003) + ')', fn: () => { S.cash -= S.social.followers * 0.003; say('💔', 'The story never ran.', ''); } },
      { t: 'Let it run', fn: () => { S.social.rep = clamp(S.social.rep - (S.social.team.pr ? 4 : 9)); say('💔', 'The story ran and hurt.', 'bad'); } }] }); } }
];

/* ---------- story beats (a different walkthrough once you are famous) ---------- */
const STORY = [
  { id: 'k1', at: 1000, run() { say('📈', 'You hit 1,000 followers. People actually watch your posts.', 'gold'); } },
  { id: 'free', at: 10000, run() {
    showModal({ icon: '📦', title: 'Free stuff!', art: '<div class="npc">📦</div>', text: 'Brands started sending you free products. You are officially a micro-influencer.', buttons: [{ t: 'Nice', fn: () => { S.fame += 1; say('📦', 'You started getting free products.', 'gold'); } }] }); } },
  { id: 'agency', at: 100000, run() {
    showModal({ icon: '🏢', title: 'Talent agency calls', art: '<div class="npc">🏢</div>', text: 'A talent agency offers to represent you and take a share of your deals.', buttons: [
      { t: 'Sign with them', fn: () => { S.social.team.manager = true; S.social.team.agent = true; say('🏢', 'You signed with a talent agency. A manager and an agent now work for you.', 'gold'); } },
      { t: 'Stay independent', fn: () => { S.happy = clamp(S.happy + 2); say('🏢', 'You kept full control for now.', ''); } }] }); } },
  { id: 'verified', at: 250000, run() { S.social.rep = clamp(S.social.rep + 8); S.fame += 3; say('✅', 'You got the verified badge. Your fame jumped.', 'gold'); } },
  { id: 'star', at: 1000000, run() {
    S.social.celeb = true; document.body.classList.add('celeb');
    showModal({ icon: '⭐', title: 'YOU ARE A STAR', art: '<div class="npc">⭐</div>', text: 'One million followers. Strangers recognize you, brands chase you, and your life will never be quiet again. A new Celebrity page just opened in Social.', buttons: [{ t: 'Begin celebrity life', cls: 'gold', fn: () => { S.fame += 5; say('⭐', 'Celebrity life begins. Entourage, tours and headlines await.', 'gold'); S.social.ap = socialApMax(); } }] }); } },
  { id: 'cover', at: 3000000, run() {
    showModal({ icon: '📖', title: 'Magazine cover', art: '<div class="npc">📖</div>', text: 'A major magazine wants you on their cover. The photographer asks what style you want.', buttons: [
      { t: 'Bold and edgy', fn: () => { if (chance(0.6)) { S.fame += 5; S.social.followers = Math.round(S.social.followers * 1.06); say('📖', 'The edgy cover went viral.', 'gold'); } else { S.social.rep = clamp(S.social.rep - 6); say('📖', 'The cover divided opinion.', ''); } } },
      { t: 'Classic and elegant', fn: () => { S.fame += 3; S.social.rep = clamp(S.social.rep + 4); say('📖', 'A timeless cover.', 'good'); } }] }); } },
  { id: 'film', at: 10000000, run() {
    showModal({ icon: '🎬', title: 'Film role offer', art: '<div class="npc">🎬</div>', text: 'A studio offers you a role in a big movie.', buttons: [
      { t: 'Take the role', fn: () => { const g = Math.round(S.social.followers * 0.3); S.cash += g; S.fame += 6; say('🎬', `You filmed the movie and earned ${fmt(g)}.`, 'gold'); } },
      { t: 'Decline', fn: () => say('🎬', 'You stuck to your own content.', '') }] }); } },
  { id: 'icon', at: 100000000, run() { S.fame += 10; say('🌎', 'You hit 100 million followers. You are a global icon. A star with your name goes on the Walk of Fame.', 'gold'); } }
];
function storyBeats() {
  const s = S.social; s.story = s.story || [];
  const next = STORY.find(b => !s.story.includes(b.id) && s.followers >= b.at);
  if (next) { s.story.push(next.id); next.run(); }
}

/* ---------- celebrity tasks ---------- */
const CELEB_TASKS = [
  { id: 'tour', icon: '🎤', t: 'Plan a tour', d: 'Big money at the end of the year. Tiring.', ap: 2, cost: () => Math.round(S.social.followers * 0.05), why: () => S.social.tour ? 'Already booked' : '', run() { S.social.tour = 1; S.health = clamp(S.health - 6); S.happy = clamp(S.happy + 4); return 'Tour booked. It pays out when you age up.'; } },
  { id: 'carpet', icon: '🎞️', t: 'Red carpet appearance', d: 'Fame and followers, if you shine.', ap: 1, cost: () => 5000 + Math.round(S.social.followers * 0.004), why: () => '', run() { const g = Math.round(S.social.followers * 0.02 * rnd(0.5, 2)); S.social.followers += g; S.fame += 2; S.social.rep = clamp(S.social.rep + 2); return `You turned heads. +${fmtN(g)} followers.`; } },
  { id: 'meetup', icon: '🫶', t: 'Fan meet-up', d: 'Reputation and loyal fans.', ap: 1, cost: () => Math.round(S.social.followers * 0.002), why: () => '', run() { const g = Math.round(S.social.followers * 0.01 * rnd(0.5, 1.5)); S.social.followers += g; S.social.rep = clamp(S.social.rep + 6); S.happy = clamp(S.happy + 3); return `Fans loved it. +${fmtN(g)} followers.`; } },
  { id: 'merch', icon: '🛍️', t: 'Launch / upgrade merch line', d: 'Yearly passive income. Up to level 5.', ap: 2, cost: () => 200000 * (S.social.merch + 1), why: () => S.social.merch >= 5 ? 'Maxed out' : '', run() { S.social.merch++; return `Merch line is now level ${S.social.merch}.`; } },
  { id: 'foundation', icon: '🎗️', t: 'Start a charity foundation', d: 'Reputation and fame, plus feel-good.', ap: 1, cost: () => Math.round(S.social.followers * 0.01), why: () => '', run() { S.social.rep = clamp(S.social.rep + 10); S.fame += 2; S.happy = clamp(S.happy + 8); return 'Your foundation made headlines for the right reasons.'; } },
  { id: 'apology', icon: '🙏', t: 'Rebuild your image', d: 'Repair a battered reputation.', ap: 1, cost: () => 0, why: () => S.social.rep >= 80 ? 'Reputation is great' : '', run() { S.social.rep = clamp(S.social.rep + 12); S.social.cancelled = false; return 'You rebuilt some trust with the public.'; } }
];

/* ---------- rendering ---------- */
function apPips(cur, max) { cur = Math.min(Math.max(0, cur), max); return '⚡'.repeat(cur) + '<span class="dim">' + '⚡'.repeat(Math.max(0, max - cur)) + '</span>'; }
function socialHTML() {
  const s = S.social, sub = UI.sub.social || 'post';
  if (S.age < 13) return '<div class="note">Social media unlocks at age 13.</div>';
  const mood = s.mood > 1 ? ['🌞', 'Algorithm boom'] : s.mood < 1 ? ['🌧️', 'Algorithm slump'] : ['⛅', 'Normal algorithm'];
  const F = s.followers;
  const head = `${bannerHTML('social', 0, 'social')}
    <div class="stats3"><div><b>${fmtN(F)}</b><small>followers</small></div><div><b>${socialTitle()}</b><small>${s.celeb ? '⭐ celebrity' : 'status'}</small></div><div><b>${mood[0]}</b><small>${mood[1]}</small></div></div>
    <div class="sb"><label>Reputation</label><div class="bar"><i style="width:${s.rep}%;background:${hcol(s.rep)}"></i></div><b>${Math.round(s.rep)}</b></div>
    <small class="meta">Trend this year: <b>#${s.trend}</b> ${ENERGY_ON ? ' · Actions left ' + apPips(s.ap, socialApMax()) : ''}${s.cancelled ? ' · <b class="bad">cancelled</b>' : ''}</small>
    ${tabs('social', [['post', '📸 Post'], ['deals', '💼 Deals' + (s.offers.length ? ' (' + s.offers.length + ')' : '')], ['celeb', '⭐ Celebrity'], ['boost', '🔥 Boost']])}`;
  return head + ({ post: postHTML, deals: dealsHTML, celeb: celebHTML, boost: boostHTML }[sub])();
}
function boostHTML() {                                               // fame-buying activities (moved here from Activities)
  return '<div class="note">Spend money to boost your name.</div>' + ACTIVITIES.filter(a => a.grp === 'fame').map(actRow).join('');
}
function postHTML() {
  const s = S.social, hasDeal = s.deals.some(d => d.done < d.posts);
  let h = '<div class="agrid">' + POSTS.map(p => {
    const why = !canAp(s.ap, 1) ? 'No actions left' : p.needsDeal && !hasDeal ? 'Needs a deal' : p.cost && S.cash < p.cost ? 'Need ' + fmt(p.cost) : '';
    return `<div class="acard"><span class="ai">${p.icon}</span><b>${p.t}</b><small>${p.d}</small><button class="gbtn sm" ${why ? 'disabled' : ''} data-a="post" data-v="${p.id}">${why || 'POST' + (ENERGY_ON ? ' ⚡1' : '') + (p.cost ? ' · ' + fmt(p.cost) : '')}</button></div>`;
  }).join('') + '</div>';
  h += '<h5>Your recent posts</h5>';
  h += s.posts.length ? s.posts.map(p => `<div class="post ${p.viral ? 'viral' : ''}"><span class="pi">${p.icon}</span><div><b>${p.cap}</b><small>👍 ${fmtN(p.likes)} · 💬 ${fmtN(p.comments)} · ➕ ${fmtN(p.newF)}${p.viral ? ' · 🔥 VIRAL' : ''}${p.flop ? ' · 💤 flopped' : ''}${p.cancelled ? ' · 🚫 cancelled' : ''}</small></div></div>`).join('') : '<div class="note">No posts yet. Fame is a lottery: most posts do little, a few explode.</div>';
  return h;
}
function dealsHTML() {
  const s = S.social; let h = '';
  if (s.followers < 5000) h += `<div class="note">Brands start noticing you around 5,000 followers. You have ${fmtN(s.followers)}.</div>`;
  if (s.offers.length) h += '<h5>Offers</h5>' + s.offers.map((o, i) => `<div class="card"><b>${o.icon} ${o.brand}</b><small>${fmt(o.fee)}/yr · ${o.posts} sponsored posts a year · ${o.years} yr${o.years > 1 ? 's' : ''}</small><div class="btns"><button class="btn sm gold" ${s.deals.length >= maxDeals() ? 'disabled' : ''} data-a="offer" data-v="${i}:accept">Accept</button><button class="btn sm" data-a="offer" data-v="${i}:negotiate">Negotiate</button><button class="btn sm bad" data-a="offer" data-v="${i}:decline">Decline</button></div>${s.deals.length >= maxDeals() ? '<small>You can run ' + maxDeals() + ' deal(s) at once.</small>' : ''}</div>`).join('');
  h += '<h5>Active deals</h5>' + (s.deals.length ? s.deals.map(d => `<div class="card gold"><b>${d.icon} ${d.brand}</b><small>${fmt(d.fee)}/yr · ${d.years} yr left</small><div class="prog"><i style="width:${d.done / d.posts * 100}%"></i><span>${d.done}/${d.posts} sponsored posts</span></div></div>`).join('') : '<div class="note">No active deals.</div>');
  return h;
}
function celebHTML() {
  const s = S.social;
  if (!s.celeb) return `<div class="note">The Celebrity page unlocks at 1,000,000 followers. You have ${fmtN(s.followers)}.</div>` + storyHTML();
  let h = `${bannerHTML('social', 1, 'celeb')}<h5>Your entourage</h5>` + TEAM.map(t => `<div class="row"><span class="ic">${t.icon}</span><div class="grow"><b>${t.t}</b><small>${t.d} · ${fmt(teamCost(t))}/yr</small></div><button class="btn sm ${s.team[t.id] ? '' : 'gold'}" data-a="team" data-v="${t.id}">${s.team[t.id] ? 'Fire' : 'Hire'}</button></div>`).join('');
  h += '<h5>Celebrity actions</h5><div class="agrid">' + CELEB_TASKS.map(t => {
    const cost = t.cost(), why = !canAp(s.ap, t.ap) ? 'No actions left' : t.why() || (S.cash < cost ? 'Need ' + fmt(cost) : '');
    return `<div class="acard"><span class="ai">${t.icon}</span><b>${t.t}</b><small>${t.d}</small><button class="gbtn sm" ${why ? 'disabled' : ''} data-a="celebTask" data-v="${t.id}">${why || (apTag(t.ap) + (cost ? (ENERGY_ON ? ' · ' : '') + fmt(cost) : (ENERGY_ON ? '' : 'GO')))}</button></div>`;
  }).join('') + '</div>';
  return h + `<small class="meta">Merch level ${s.merch}/5 · tour ${s.tour ? 'booked' : 'not planned'}</small>` + storyHTML();
}
function storyHTML() {
  const s = S.social, lab = { k1: '1K followers', free: '10K: free products', agency: '100K: talent agency', verified: '250K: verified', star: '1M: celebrity life', cover: '3M: magazine cover', film: '10M: film role', icon: '100M: global icon' };
  return '<h5>Your story</h5><div class="story">' + STORY.map(b => `<span class="${s.story.includes(b.id) ? 'done' : ''}">${s.story.includes(b.id) ? '✔' : '○'} ${lab[b.id]}</span>`).join('') + '</div>';
}

/* ---------- actions (merged into A in game.js) ---------- */
const SA = {
  post(id) {
    const s = S.social, T = POSTS.find(p => p.id === id); if (!T || !canAp(s.ap, 1)) return;
    if (T.needsDeal && !s.deals.some(d => d.done < d.posts)) return;
    if (T.cost) { if (S.cash < T.cost) return; S.cash -= T.cost; }
    if (ENERGY_ON) s.ap--; const r = doPost(id);
    say(T.icon, r.out, r.viral ? 'gold' : r.cancelled ? 'bad' : ''); toast(r.out);
    storyBeats(); checkAch(); save(); refresh(); renderFeed();
  },
  offer(v) {
    const [i, act] = v.split(':'); const s = S.social, o = s.offers[+i]; if (!o) return;
    if (act === 'accept') { if (s.deals.length >= maxDeals()) return; s.deals.push(o); s.offers.splice(+i, 1); say(o.icon, `You signed a sponsorship with ${o.brand}.`, 'gold'); toast('Deal signed with ' + o.brand); }
    else if (act === 'decline') { s.offers.splice(+i, 1); toast('Offer declined'); }
    else { if (chance(0.45 + S.smarts / 300)) { o.fee = Math.round(o.fee * 1.2); toast('They agreed to +20% fee!'); } else if (chance(0.3)) { s.offers.splice(+i, 1); toast(o.brand + ' withdrew the offer.'); } else toast('They would not move.'); }
    save(); refresh(); renderFeed();
  },
  team(id) {
    const s = S.social, t = TEAM.find(x => x.id === id); s.team[id] = !s.team[id]; s.ap = Math.min(socialApMax(), s.ap + (s.team[id] && id === 'manager' ? 2 : 0));
    say(t.icon, s.team[id] ? `You hired a ${t.t.toLowerCase()}.` : `You let your ${t.t.toLowerCase()} go.`, ''); save(); refresh(); renderFeed();
  },
  celebTask(id) {
    const t = CELEB_TASKS.find(x => x.id === id), s = S.social, cost = t.cost();
    if (!canAp(s.ap, t.ap) || S.cash < cost || t.why()) return;
    if (ENERGY_ON) s.ap -= t.ap; S.cash -= cost; const m = t.run(); say(t.icon, m, 'gold'); toast(m);
    S.fame = Math.max(S.fame, socialFame()); storyBeats(); save(); refresh(); renderFeed();
  }
};
