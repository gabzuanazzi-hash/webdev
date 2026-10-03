/* Hustleville — business hubs. Each business is a small simulation you manage with
   action points (AP) during the year. Age-up runs yearEnd(), which turns the state of
   the hub into a profit and loss. Loaded after data.js, before game.js. */
'use strict';

const HUBS = {};
const hsc = (b) => Math.pow(1.5, b.level - 1);          // scale with level
const apMax = (b) => Math.min(12, 5 + b.level);
const hlog = (b, m) => { b.log = b.log || []; b.log.unshift(m); b.log.length = Math.min(b.log.length, 10); };
const hcol = (p) => p >= 66 ? '#4cc65a' : p >= 40 ? '#f5c542' : '#ff5d5d';
const num = (n) => Math.round(n).toLocaleString();
const fnum = (n) => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString();

/* =========================================================
   1. DROPSHIPPING STORE
   ========================================================= */
const PRODUCT_IDEAS = [
  ['Posture Corrector', '🧍', 29], ['LED Strip Lights', '💡', 24], ['Pet Hair Remover', '🐕', 19], ['Mini Projector', '📽️', 89],
  ['Yoga Mat Pro', '🧘', 39], ['Phone Gimbal', '📱', 69], ['Cat Water Fountain', '🐈', 34], ['Smart Water Bottle', '🥤', 32],
  ['Beard Grooming Kit', '🧔', 45], ['Car Vacuum', '🚗', 49], ['Sunset Lamp', '🌅', 22], ['Massage Gun', '💆', 79], ['Desk Organizer', '🗂️', 28]
];

HUBS.ecom = {
  id: 'ecom', icon: '🛒', sprite: 0, banner: 0, name: 'Dropshipping Store', tag: 'online', cost: 3000,
  kind: 'Supplier Agreement', partner: 'Supplier',
  blurb: 'Find winning products, run ads, keep customers happy. What you do during the year decides the profit.',
  init(b) { b.hub = { products: [], adVisitors: 0, adSpend: 0, conv: 2.2, rating: 4.0, costMult: 1, rel: 60, backlog: 0, brand: 10, email: 0, orders: 0 }; },
  metrics(b) {
    const h = b.hub;
    return [
      { l: 'Conversion', v: h.conv.toFixed(1) + '%', p: h.conv / 6 * 100 },
      { l: 'Store rating', v: '⭐ ' + h.rating.toFixed(1), p: (h.rating - 1) / 4 * 100 },
      { l: 'Brand', v: Math.round(h.brand) + '', p: h.brand },
      { l: 'Supplier trust', v: Math.round(h.rel) + '', p: h.rel },
      { l: 'Support backlog', v: Math.round(h.backlog) + ' tickets', p: 100 - Math.min(100, h.backlog * 2) },
      { l: 'Email list', v: num(h.email), p: Math.min(100, h.email / 50) }
    ];
  },
  list: ['research', 'ad_s', 'ad_m', 'ad_l', 'optimize', 'supplier', 'support', 'qc', 'email', 'influencer'],
  defs(b) {
    const h = b.hub, s = hsc(b), haveP = h.products.length > 0;
    const ad = (name, base) => () => ({
      icon: '📣', t: name, d: 'Buy traffic. Strong trend + good conversion = good returns.', ap: 1, cost: Math.round(base * s), why: haveP ? '' : 'Need a product',
      run() {
        const best = Math.max(...h.products.map(p => p.trend)), spend = Math.round(base * s);
        const cpc = clamp(0.5 - best * 0.0033 + rnd(-0.07, 0.07), 0.15, 0.7), vis = Math.round(spend / cpc * (1 + h.brand / 200));
        h.adVisitors += vis; h.adSpend += spend; h.brand = Math.min(100, h.brand + 1);
        return `Campaign ran: ${num(vis)} visitors at $${cpc.toFixed(2)} each.`;
      }
    });
    return {
      research: () => ({
        icon: '🔍', t: 'Product research', d: 'Hunt for a product people want. Some are duds, some are winners.', ap: 1, cost: Math.round(300 * s),
        why: h.products.length >= 3 + b.level ? 'Store is full' : '',
        run() {
          const idea = pick(PRODUCT_IDEAS), price = Math.round(idea[2] * rnd(0.8, 1.4));
          const winner = chance(0.14), trend = winner ? ri(80, 98) : ri(12, 80);
          h.products.push({ n: idea[0], e: idea[1], price, cost: +(price * rnd(0.25, 0.5)).toFixed(2), trend, quality: ri(45, 90) });
          return winner ? `🔥 Winner! ${idea[0]} is blowing up on social media (trend ${trend}).` : `Added ${idea[0]} at $${price}. Trend score ${trend}.`;
        }
      }),
      ad_s: ad('Small ad test', 300), ad_m: ad('Ad campaign', 1500), ad_l: ad('Scale-up campaign', 6000),
      optimize: () => ({
        icon: '🛠️', t: 'Optimize store', d: 'A/B test the page, fix checkout. Raises conversion.', ap: 1, cost: Math.round(200 * s), why: h.conv >= 7 ? 'Maxed out' : '',
        run() { const g = rnd(0.15, 0.45) * (1 - h.conv / 8); h.conv = Math.min(7, h.conv + g); return `Conversion up to ${h.conv.toFixed(1)}%.`; }
      }),
      supplier: () => ({
        icon: '🤝', t: 'Negotiate with supplier', d: 'Push for a lower unit cost and better reliability.', ap: 1, cost: 0, why: '',
        run() {
          if (chance(0.35 + S.smarts / 250 + h.rel / 300)) { h.costMult = Math.max(0.7, h.costMult * 0.95); h.rel = Math.min(100, h.rel + 8); return `Supplier agreed to a better price (costs now ${Math.round(h.costMult * 100)}% of list).`; }
          h.rel = Math.max(0, h.rel - 3); return 'The supplier would not budge this time.';
        }
      }),
      support: () => ({
        icon: '🎧', t: 'Customer support sprint', d: 'Clear tickets and win back unhappy buyers.', ap: 1, cost: 0, why: h.backlog <= 0 ? 'No tickets' : '',
        run() { const c = Math.min(h.backlog, 10 + b.level * 2); h.backlog -= c; h.rating = Math.min(5, h.rating + 0.08); return `Resolved ${Math.round(c)} tickets. Rating improves.`; }
      }),
      qc: () => ({
        icon: '🔎', t: 'Quality control', d: 'Inspect stock. Better quality means fewer refunds.', ap: 1, cost: Math.round(250 * s), why: haveP ? '' : 'Need a product',
        run() { h.products.forEach(p => { p.quality = Math.min(100, p.quality + 8); }); return 'Quality improved across your catalog.'; }
      }),
      email: () => ({
        icon: '✉️', t: 'Email campaign', d: 'Grow your list for free repeat traffic.', ap: 1, cost: Math.round(100 * s), why: '',
        run() { const g = Math.round(300 * s * rnd(0.6, 1.4)); h.email += g; h.brand = Math.min(100, h.brand + 2); return `+${num(g)} subscribers.`; }
      }),
      influencer: () => {
        const free = S.social && S.social.followers >= 10000;
        return {
          icon: '🌟', t: free ? 'Post it on your channel' : 'Influencer collab', d: free ? 'Your own audience sends traffic for free.' : 'Pay a creator to show your product.', ap: 1, cost: free ? 0 : Math.round(1000 * s), why: haveP ? '' : 'Need a product',
          run() {
            let vis = Math.round(3000 * s * rnd(0.4, 2.2)); if (free) vis = Math.round(vis + Math.min(60000, S.social.followers * 0.02));
            const viral = chance(0.08); if (viral) vis += Math.round(20000 * s);
            h.adVisitors += vis; h.brand = Math.min(100, h.brand + 6);
            return viral ? `🔥 It went viral! ${num(vis)} visitors.` : `${num(vis)} visitors came through.`;
          }
        };
      },
      drop: (i) => ({ icon: '🗑️', t: 'Drop product', d: '', ap: 0, cost: 0, why: '', run() { const p = h.products.splice(+i, 1)[0]; return `Dropped ${p.n}.`; } })
    };
  },
  extra(b, i) {
    const h = b.hub;
    if (!h.products.length) return '<div class="note">No products yet. Start with Product research.</div>';
    return '<h5>Your catalog</h5>' + h.products.map((p, k) => {
      const margin = Math.round((1 - p.cost * h.costMult / p.price) * 100);
      return `<div class="row"><span class="ic">${p.e}</span><div class="grow"><b>${p.n}</b> · $${p.price}<small>${margin}% margin · quality ${p.quality}</small><div class="bar"><i style="width:${p.trend}%;background:${hcol(p.trend)}"></i></div><small>🔥 trend ${p.trend}</small></div><button class="btn sm" data-a="hubTask" data-v="${i}:drop:${k}">Drop</button></div>`;
    }).join('');
  },
  yearEnd(b) {
    const h = b.hub, s = hsc(b), notes = [];
    const organic = 1300 * s * (0.6 + h.brand / 100) * (1 + h.email / 4000);
    const visitors = organic + h.adVisitors;
    let rev = 0, cogs = 0, orders = 0, refunds = 0;
    const ws = h.products.map(p => (p.trend / 100) * (0.5 + p.quality / 200) + 0.1), wt = ws.reduce((a, c) => a + c, 0) || 1;
    let best = null;
    h.products.forEach((p, k) => {
      const vis = visitors * ws[k] / wt * rnd(0.85, 1.15);
      const o = vis * (h.conv / 100) * (0.7 + p.trend / 150) * (h.rating / 4.2);
      const r = o * p.price, rr = clamp(0.03 + (100 - p.quality) / 800 + h.backlog / 400, 0.02, 0.4);
      rev += r; cogs += o * p.cost * h.costMult; orders += o; refunds += r * rr;
      if (!best || r > best.r) best = { n: p.n, r };
    });
    const ship = orders * 3.5, fees = rev * 0.03, tools = 150 * s, ads = h.adSpend;
    let profit = rev - refunds - cogs - ship - fees - ads - tools;
    const exp = refunds + cogs + ship + fees + ads + tools;
    if (best) notes.push(`${num(orders)} orders · best seller ${best.n} (${fmt(best.r)})`);
    else notes.push('You had no products to sell.');
    if (chance(0.15)) { const hit = rev * 0.05; profit -= hit; notes.push(`Chargebacks and fraud cost ${fmt(hit)}.`); }
    if (chance(0.15)) { h.rel = Math.max(0, h.rel - 8); h.backlog += 12; notes.push('Your supplier shipped late. Tickets piled up.'); }
    // new year
    h.backlog = Math.min(120, h.backlog + orders / 90);
    h.rating = clamp(h.rating + (h.products.length ? (h.products.reduce((a, p) => a + p.quality, 0) / h.products.length - 60) / 400 : 0) - h.backlog / 400, 2, 5);
    h.products.forEach(p => { p.trend = Math.round(p.trend * 0.72); });
    h.products = h.products.filter(p => p.trend >= 6 || (notes.push(`${p.n} stopped selling and was dropped.`), false));
    h.brand = Math.max(0, h.brand - 3); h.adVisitors = 0; h.adSpend = 0; h.orders = Math.round(orders);
    return { rev, exp, profit, notes };
  },
  value(b) { return Math.max(1500, (b.last ? b.last.profit : 0) * 3) * (0.8 + b.level * 0.2); },
  roleplays: [
    { npc: ['Chen Wei', '🧑‍🏭'], ok: () => true, text: () => 'Your supplier calls: "Raw materials are up 15% and shipments will be three weeks late. What do you want to do?"',
      choices: [
        { t: 'Accept the new price', fn: b => { b.hub.costMult = Math.min(1.4, b.hub.costMult * 1.1); b.hub.rel = Math.min(100, b.hub.rel + 5); return 'You accepted the higher price. Chen Wei respects that.'; } },
        { t: 'Threaten to switch (risky)', fn: b => { if (chance(0.5 + S.smarts / 300)) return 'Chen Wei blinked and kept your old price.'; b.hub.rel = Math.max(0, b.hub.rel - 15); b.hub.costMult = Math.min(1.4, b.hub.costMult * 1.12); return 'It backfired. Prices went up and trust dropped.'; } },
        { t: 'Prepay for priority', fn: b => { const c = Math.round(2000 * hsc(b)); S.cash -= c; b.hub.rel = Math.min(100, b.hub.rel + 12); b.hub.backlog = Math.max(0, b.hub.backlog - 6); return `You prepaid ${fmt(c)} and got priority shipping.`; } }] },
    { npc: ['Kayla (150K)', '🤳'], ok: () => true, text: () => 'A mid-size influencer pitches you: "$2,000 and free stock, and I will make a video for your best product."',
      choices: [
        { t: 'Pay $2,000', fn: b => { S.cash -= 2000; const v = Math.round(9000 * hsc(b) * rnd(0.5, 3)); b.hub.adVisitors += v; b.hub.brand = Math.min(100, b.hub.brand + 7); return `Her video drove ${num(v)} visitors.`; } },
        { t: 'Counter with free stock only', fn: b => { if (chance(0.5)) { const v = Math.round(6000 * hsc(b)); b.hub.adVisitors += v; return `She accepted! ${num(v)} visitors for the price of some stock.`; } return 'She walked away.'; } },
        { t: 'Decline', fn: () => 'You passed on the collab.' }] },
    { npc: ['Angry customer', '😡'], ok: () => true, text: () => 'A buyer is threatening a chargeback and a one-star review over a late package.',
      choices: [
        { t: 'Refund and apologize', fn: b => { S.cash -= 60; b.hub.rating = Math.min(5, b.hub.rating + 0.05); return 'You refunded them. They left a nice review.'; } },
        { t: 'Fight the chargeback', fn: b => { if (chance(0.5)) return 'You won the dispute.'; b.hub.rating = Math.max(1, b.hub.rating - 0.15); return 'You lost and got the bad review.'; } },
        { t: 'Ignore it', fn: b => { b.hub.backlog += 4; b.hub.rating = Math.max(1, b.hub.rating - 0.1); return 'Ignoring it made things worse.'; } }] },
    { npc: ['Rival store', '🕵️'], ok: b => b.hub.products.length > 0, text: () => 'A copycat store is selling your best product for 20% less.',
      choices: [
        { t: 'Match their price', fn: b => { b.hub.products.forEach(p => { p.price = Math.round(p.price * 0.9); }); return 'You cut prices 10% across the catalog.'; } },
        { t: 'Improve quality instead', fn: b => { b.hub.products.forEach(p => { p.quality = Math.min(100, p.quality + 6); }); b.hub.brand = Math.min(100, b.hub.brand + 3); return 'You doubled down on quality and brand.'; } },
        { t: 'File a takedown ($1,500)', fn: b => { S.cash -= 1500; return chance(0.55) ? 'The copycat listing was taken down.' : 'The platform ignored your takedown.'; } }] },
    { npc: ['Ad platform', '🚫'], ok: b => b.hub.adSpend > 0, text: () => 'Your ad account was flagged for a policy violation. Ads are paused.',
      choices: [
        { t: 'Appeal', fn: b => { if (chance(0.4 + S.smarts / 250)) return 'Appeal approved. Ads are back.'; b.hub.adVisitors = Math.round(b.hub.adVisitors * 0.5); return 'Appeal denied. You lost half of this year\'s ad traffic.'; } },
        { t: 'Open a new account ($800)', fn: b => { S.cash -= 800; return 'You opened a fresh account and kept running.'; } }] },
    { npc: ['Retail buyer', '🏬'], ok: b => b.hub.products.length > 0, text: () => 'A retailer wants 500 units of your best product, but at 30% off.',
      choices: [
        { t: 'Take the deal', fn: b => { const g = Math.round(500 * 14 * hsc(b)); S.cash += g; b.hub.brand = Math.min(100, b.hub.brand + 4); return `You shipped the bulk order and cleared ${fmt(g)}.`; } },
        { t: 'Counter at 15% off', fn: b => { if (chance(0.45)) { const g = Math.round(500 * 22 * hsc(b)); S.cash += g; return `They agreed! You cleared ${fmt(g)}.`; } return 'They went with someone else.'; } },
        { t: 'Decline', fn: () => 'You passed. Margins matter.' }] }
  ]
};

/* =========================================================
   2. NIGHTCLUB
   ========================================================= */
HUBS.club = {
  id: 'club', icon: '🪩', sprite: 1, banner: 1, name: 'Nightclub', tag: 'offline', cost: 40000,
  kind: 'Venue Lease Agreement', partner: 'Landlord',
  blurb: 'Build the hype, book acts, keep the crowd safe and the inspector happy. Run the venue every weekend of the year.',
  init(b) { b.hub = { hype: 25, safety: 45, clean: 55, staff: 6, morale: 60, sound: 1, cover: 15, drinks: 2, stock: 60, locals: 50, strikes: 0, acts: 0, closed: false }; },
  cap(b) { return Math.round(130 * hsc(b) * (1 + (b.hub.sound - 1) * 0.06)); },
  need(b) { return Math.ceil(HUBS.club.cap(b) / 18); },
  metrics(b) {
    const h = b.hub, H = HUBS.club;
    return [
      { l: 'Hype', v: Math.round(h.hype) + '', p: h.hype },
      { l: 'Safety', v: Math.round(h.safety) + '', p: h.safety },
      { l: 'Cleanliness', v: Math.round(h.clean) + '', p: h.clean },
      { l: 'Staff', v: `${h.staff} / ${H.need(b)} needed`, p: Math.min(100, h.staff / H.need(b) * 100) },
      { l: 'Staff morale', v: Math.round(h.morale) + '', p: h.morale },
      { l: 'Bar stock', v: Math.round(h.stock) + '%', p: h.stock },
      { l: 'Local goodwill', v: Math.round(h.locals) + '', p: h.locals },
      { l: 'Licence', v: '❤️'.repeat(3 - h.strikes) + '🖤'.repeat(h.strikes), p: (3 - h.strikes) / 3 * 100 }
    ];
  },
  list: ['dj_s', 'dj_m', 'dj_l', 'themed', 'promo', 'staff', 'party', 'audit', 'restock', 'clean', 'sound', 'outreach', 'reopen'],
  defs(b) {
    const h = b.hub, s = hsc(b);
    const dj = (name, base, hype, ico) => () => ({
      icon: ico, t: name, d: `+${hype} hype for the year. Max 3 bookings.`, ap: 1, cost: Math.round(base * s), why: h.closed ? 'Club is closed' : h.acts >= 3 ? 'Lineup full' : '',
      run() { h.acts++; h.hype = Math.min(100, h.hype + hype); return `${name} booked. Hype is climbing.`; }
    });
    const open = h.closed ? 'Club is closed' : '';
    return {
      dj_s: dj('Local DJ', 800, 6, '🎧'), dj_m: dj('Touring DJ', 4000, 14, '🎛️'), dj_l: dj('Headliner', 15000, 28, '🌟'),
      themed: () => ({ icon: '🎉', t: 'Themed night', d: 'Costumes, neon, a big Saturday. Hype up, mess too.', ap: 1, cost: Math.round(600 * s), why: open, run() { const g = ri(5, 12); h.hype = Math.min(100, h.hype + g); h.clean = Math.max(0, h.clean - 6); return `The themed night was a hit. Hype +${g}.`; } }),
      promo: () => ({ icon: '📣', t: 'Promote', d: 'Flyers, promoters and social posts.', ap: 1, cost: Math.round(400 * s), why: open, run() { const g = ri(3, 8) + (S.social && S.social.followers > 20000 ? 4 : 0); h.hype = Math.min(100, h.hype + g); return `Promo pushed hype up by ${g}.`; } }),
      staff: () => ({ icon: '🧑‍🍳', t: 'Hire & train staff', d: '+2 bartenders and security. Costs wages every year.', ap: 1, cost: Math.round(1500 * s), why: h.staff >= 6 + b.level * 4 ? 'Team is full' : '', run() { h.staff += 2; h.morale = Math.min(100, h.morale + 4); h.safety = Math.min(100, h.safety + 4); return 'Two new hires started training.'; } }),
      party: () => ({ icon: '🥳', t: 'Staff party', d: 'Morale +15. Happy staff, better service.', ap: 1, cost: Math.round(500 * s), why: '', run() { h.morale = Math.min(100, h.morale + 15); return 'Your team loved it.'; } }),
      audit: () => ({ icon: '🛡️', t: 'Security audit', d: 'Fewer fights and scares at night.', ap: 1, cost: Math.round(400 * s), why: '', run() { const g = ri(8, 14); h.safety = Math.min(100, h.safety + g); return `Safety +${g}.`; } }),
      restock: () => ({ icon: '🍸', t: 'Restock the bar', d: 'Empty shelves mean lost sales.', ap: 1, cost: Math.round(800 * s), why: h.stock >= 95 ? 'Fully stocked' : '', run() { h.stock = 100; return 'The bar is fully stocked.'; } }),
      clean: () => ({ icon: '🧹', t: 'Deep clean & repairs', d: 'Keeps the inspector away.', ap: 1, cost: Math.round(500 * s), why: '', run() { h.clean = Math.min(100, h.clean + 25); return 'The venue sparkles.'; } }),
      sound: () => ({ icon: '🔊', t: 'Upgrade sound system', d: `Level ${h.sound}/5. Bigger capacity and a hype boost.`, ap: 1, cost: Math.round(6000 * s * h.sound), why: h.sound >= 5 ? 'Maxed out' : '', run() { h.sound++; h.hype = Math.min(100, h.hype + 4); return `Sound system is now level ${h.sound}.`; } }),
      outreach: () => ({ icon: '🏘️', t: 'Community outreach', d: 'Meet neighbors and local officials.', ap: 1, cost: Math.round(300 * s), why: '', run() { h.locals = Math.min(100, h.locals + 10); h.safety = Math.min(100, h.safety + 2); return 'Locals appreciate you listening.'; } }),
      reopen: () => ({ icon: '🔓', t: 'Reapply for licence', d: 'Your licence was pulled. Pay to reopen.', ap: 2, cost: Math.round(10000 * s), why: h.closed ? '' : 'Not closed', run() { h.closed = false; h.strikes = 1; return 'Licence restored with one strike left.'; } }),
      cover: (v) => ({ icon: '🎟️', t: 'Cover charge', d: '', ap: 0, cost: 0, why: '', run() { h.cover = +v; return `Cover charge set to $${v}.`; } }),
      drinks: (v) => ({ icon: '🍹', t: 'Drink prices', d: '', ap: 0, cost: 0, why: '', run() { h.drinks = +v; return `Drinks set to ${['value', 'standard', 'premium'][v - 1]}.`; } })
    };
  },
  crowd(b) {
    const h = b.hub, cap = HUBS.club.cap(b);
    const fp = clamp(1.15 - (h.cover / 50) * (0.9 - h.hype / 200) - (h.drinks - 2) * 0.08, 0.3, 1.2);
    const service = clamp(h.staff / HUBS.club.need(b), 0.5, 1.1);
    return Math.min(cap, cap * (h.hype / 100) * fp * (0.7 + 0.3 * service));
  },
  extra(b, i) {
    const h = b.hub, H = HUBS.club, sel = (k, v, label) => `<button class="mini ${h[k] === v ? 'on' : ''}" data-a="hubTask" data-v="${i}:${k}:${v}">${label}</button>`;
    return `<h5>Door & bar prices</h5><div class="card">Cover: <span class="seg">${sel('cover', 10, '$10')}${sel('cover', 25, '$25')}${sel('cover', 50, '$50')}</span><br>Drinks: <span class="seg">${sel('drinks', 1, 'Value')}${sel('drinks', 2, 'Standard')}${sel('drinks', 3, 'Premium')}</span>
      <small>Typical night: <b>${Math.round(H.crowd(b))}</b> guests of ${H.cap(b)} capacity · ${h.acts}/3 acts booked${h.closed ? ' · <b class="bad">CLOSED</b>' : ''}</small></div>`;
  },
  yearEnd(b) {
    const h = b.hub, s = hsc(b), H = HUBS.club, notes = [];
    if (h.closed) { const exp = 40000 * s * 0.4; notes.push('The club stayed closed all year. Rent kept running.'); return { rev: 0, exp, profit: -exp, notes }; }
    const nights = 52, crowd = H.crowd(b) * rnd(0.92, 1.08);
    const stockF = h.stock >= 40 ? 1 : 0.6 + h.stock / 100, dm = [0.75, 1, 1.4][h.drinks - 1];
    const door = crowd * h.cover * nights, drinksRev = crowd * 24 * dm * stockF * nights * (0.7 + 0.3 * clamp(h.staff / H.need(b), 0.5, 1.1));
    const rev = door + drinksRev, cogs = drinksRev * 0.3 / dm;
    const wages = h.staff * 8000 * Math.max(0.6, S.w), rent = 30000 * s, lic = 4000, util = 6000 * s, ins = rev * 0.02;
    let exp = cogs + wages + rent + lic + util + ins, profit = rev - exp;
    notes.push(`~${Math.round(crowd)} guests a night · ${fmt(rev)} revenue.`);
    // incidents
    for (let k = 0; k < 4; k++) {
      const p = clamp(0.5 - h.safety / 220 + (crowd / H.cap(b)) * 0.1 + (h.staff < H.need(b) ? 0.1 : 0), 0.05, 0.6);
      if (!chance(p)) continue;
      const t = ri(1, 4);
      if (t === 1) { const c = 3000 * s; profit -= c; h.hype = Math.max(0, h.hype - 6); h.locals = Math.max(0, h.locals - 4); notes.push(`A fight broke out. Settlement: ${fmt(c)}.`); }
      else if (t === 2) { h.hype = Math.max(0, h.hype - 4); h.safety = Math.max(0, h.safety - 4); notes.push('A guest needed an ambulance. Bad press.'); }
      else if (t === 3 && h.locals < 45) { const c = 2000 * s; profit -= c; notes.push(`Noise complaints led to a ${fmt(c)} fine.`); }
      else if (t === 4 && h.clean < 40) { const c = 2500 * s; profit -= c; notes.push(`You failed an inspection. Fine: ${fmt(c)}.`); }
      else if (h.safety < 35) { h.strikes++; notes.push('Police logged a licence strike against you.'); }
    }
    if (h.strikes >= 3) { h.closed = true; notes.push('🚫 Your licence was revoked. The club is closed.'); }
    exp = rev - profit;
    // new year
    h.hype = h.hype * 0.82 + 5; h.clean = Math.max(0, h.clean - 12); h.safety = Math.max(0, h.safety - 6); h.morale = Math.max(0, h.morale - 5); h.stock = Math.max(0, h.stock - 45); h.acts = 0; h.locals = clamp(h.locals - 2, 0, 100);
    if (h.morale < 25 && h.staff > 4) { h.staff -= 2; notes.push('Unhappy staff quit.'); }
    return { rev, exp, profit, notes };
  },
  value(b) { return Math.max(10000, (b.last ? b.last.profit : 0) * 3) * (0.8 + b.level * 0.2); },
  roleplays: [
    { npc: ['Rapper "Kojo"', '🕶️'], ok: () => true, text: () => 'A famous rapper was turned away at the door by your bouncer. A crowd is filming.',
      choices: [
        { t: 'Let him in', fn: b => { b.hub.hype = Math.min(100, b.hub.hype + 8); b.hub.safety = Math.max(0, b.hub.safety - 4); return 'Kojo partied until 3 a.m. It all went on social media.'; } },
        { t: 'Back your bouncer', fn: b => { b.hub.safety = Math.min(100, b.hub.safety + 4); b.hub.morale = Math.min(100, b.hub.morale + 6); b.hub.hype = Math.max(0, b.hub.hype - 4); return 'Your team feels respected. Kojo posted about it.'; } },
        { t: 'Comp a VIP table', fn: b => { S.cash -= 800; b.hub.hype = Math.min(100, b.hub.hype + 5); return 'You smoothed it over with a free table.'; } }] },
    { npc: ['Rival owner', '🥃'], ok: () => true, text: () => 'A rival club is trying to poach your resident DJ with a bigger offer.',
      choices: [
        { t: 'Counter-offer ($3,000)', fn: b => { S.cash -= 3000; b.hub.hype = Math.min(100, b.hub.hype + 4); return 'Your DJ stayed. Hype holds.'; } },
        { t: 'Let them go', fn: b => { b.hub.hype = Math.max(0, b.hub.hype - 10); return 'You lost your DJ and some regulars.'; } },
        { t: 'Promote a local talent', fn: b => { if (chance(0.5 + S.smarts / 300)) { b.hub.hype = Math.min(100, b.hub.hype + 6); return 'The new DJ is a star.'; } b.hub.hype = Math.max(0, b.hub.hype - 5); return 'The new DJ flopped.'; } }] },
    { npc: ['Mrs. Alvarez (neighbor)', '👵'], ok: () => true, text: () => 'A neighbor complains that your bass shakes her windows every weekend.',
      choices: [
        { t: 'Soundproof the walls ($2,500)', fn: b => { S.cash -= 2500; b.hub.locals = Math.min(100, b.hub.locals + 15); return 'Locals thank you for fixing it.'; } },
        { t: 'Lower volume after midnight', fn: b => { b.hub.locals = Math.min(100, b.hub.locals + 8); b.hub.hype = Math.max(0, b.hub.hype - 3); return 'She is calmer. The dance floor less so.'; } },
        { t: 'Ignore it', fn: b => { b.hub.locals = Math.max(0, b.hub.locals - 12); return 'She started a petition against you.'; } }] },
    { npc: ['Fire inspector', '🧯'], ok: () => true, text: () => 'An inspector is walking your venue with a clipboard.',
      choices: [
        { t: 'Fix everything now ($1,500)', fn: b => { S.cash -= 1500; b.hub.clean = Math.min(100, b.hub.clean + 20); b.hub.safety = Math.min(100, b.hub.safety + 6); return 'You passed with a compliment.'; } },
        { t: 'Argue the findings', fn: b => { if (chance(0.35)) return 'The inspector backed down.'; b.hub.strikes = Math.min(3, b.hub.strikes + 1); return 'You earned a licence strike.'; } },
        { t: 'Quick patch-up', fn: b => { if (b.hub.clean > 50) { b.hub.safety += 3; return 'It was good enough.'; } b.hub.strikes = Math.min(3, b.hub.strikes + 1); return 'The patch job did not impress. Strike.'; } }] },
    { npc: ['Staff lead', '🧑‍🍳'], ok: () => true, text: () => 'Your head bartender says the team is burnt out and threatens to walk.',
      choices: [
        { t: 'Raise wages ($2,000)', fn: b => { S.cash -= 2000; b.hub.morale = Math.min(100, b.hub.morale + 20); return 'Morale rebounds.'; } },
        { t: 'Pep talk', fn: b => { b.hub.morale = Math.min(100, b.hub.morale + (chance(0.5) ? 10 : -5)); return 'The pep talk had mixed results.'; } },
        { t: 'Let them walk', fn: b => { b.hub.staff = Math.max(3, b.hub.staff - 2); b.hub.morale = Math.max(0, b.hub.morale - 10); return 'You lost two key staff.'; } }] },
    { npc: ['Promoter "Dex"', '🧢'], ok: () => true, text: () => 'A promoter pitches a huge all-night rave: "Huge hype, but security will be stretched."',
      choices: [
        { t: 'Do it', fn: b => { b.hub.hype = Math.min(100, b.hub.hype + 14); b.hub.safety = Math.max(0, b.hub.safety - 10); b.hub.clean = Math.max(0, b.hub.clean - 12); return 'The rave was legendary and chaotic.'; } },
        { t: 'Safer, smaller version', fn: b => { b.hub.hype = Math.min(100, b.hub.hype + 6); return 'A solid night without the drama.'; } },
        { t: 'No thanks', fn: () => 'You passed.' }] }
  ]
};

/* =========================================================
   3. CREATOR MANAGEMENT AGENCY (subscription platform)
   Consenting adult creators, fair contracts, wellbeing and risk. No explicit content.
   ========================================================= */
const CREATOR_NICHES = ['Fitness & wellness', 'Cosplay & costumes', 'Gaming', 'Lifestyle & fashion', 'Art & illustration', 'Music & ASMR', 'Fashion modelling', 'Travel & vlogs'];
const PERSONAS = ['cautious', 'ambitious', 'laid-back'];

HUBS.agency = {
  id: 'agency', icon: '📸', sprite: 2, banner: 2, name: 'Creator Agency', tag: 'online', cost: 8000,
  kind: 'Creator Management Agreement', partner: 'Platform partner',
  blurb: 'Manage adult creators on a subscription platform: recruit them with fair offers, plan content, protect them, and keep them healthy. Their success is your income.',
  init(b) { b.hub = { creators: [], prospects: [], rep: 40, chatters: 0, legal: 0, compliance: 30 }; },
  max(b) { return 2 + 2 * b.level; },
  metrics(b) {
    const h = b.hub, cs = h.creators, avg = (k) => cs.length ? cs.reduce((a, c) => a + c[k], 0) / cs.length : 0;
    return [
      { l: 'Agency reputation', v: Math.round(h.rep) + '', p: h.rep },
      { l: 'Roster', v: `${cs.length} / ${HUBS.agency.max(b)}`, p: cs.length / HUBS.agency.max(b) * 100 },
      { l: 'Avg creator trust', v: cs.length ? Math.round(avg('trust')) + '' : '–', p: avg('trust') },
      { l: 'Avg burnout', v: cs.length ? Math.round(avg('burnout')) + '' : '–', p: 100 - avg('burnout') },
      { l: 'Chat team', v: h.chatters + ' chatters', p: Math.min(100, h.chatters * 25) },
      { l: 'Compliance', v: Math.round(h.compliance) + '', p: h.compliance }
    ];
  },
  list: ['scout', 'chat', 'comply', 'legal'],
  newCreator(b) {
    return { name: pick(FIRST) + ' ' + pick(LAST), niche: pick(CREATOR_NICHES), followers: ri(3000, 90000), quality: ri(35, 85), pers: pick(PERSONAS), ask: pick([20, 25, 30]) };
  },
  defs(b) {
    const h = b.hub, s = hsc(b), cs = h.creators, H = HUBS.agency;
    const cdef = (id, icon, t, ap, costBase, run) => (i) => { const c = cs[+i]; return { icon, t, d: '', ap, cost: Math.round(costBase * s), why: c ? '' : 'Gone', run() { return run(c); } }; };
    return {
      scout: () => ({ icon: '🔎', t: 'Scout creators', d: 'Find three adult creators who might want representation.', ap: 1, cost: Math.round(300 * s), why: cs.length >= H.max(b) ? 'Roster full' : '', run() { h.prospects = [H.newCreator(b), H.newCreator(b), H.newCreator(b)]; return 'You found three prospects to pitch.'; } }),
      chat: () => ({ icon: '💬', t: 'Hire a chat manager', d: 'Fans get replies faster. Costs wages each year.', ap: 1, cost: Math.round(2000 * s), why: h.chatters >= 1 + b.level * 2 ? 'Team is full' : '', run() { h.chatters++; return 'A new chat manager joined the team.'; } }),
      comply: () => ({ icon: '📋', t: 'Platform compliance review', d: 'Rules, age checks and contracts in order.', ap: 1, cost: Math.round(500 * s), why: '', run() { h.compliance = Math.min(100, h.compliance + 15); h.rep = Math.min(100, h.rep + 3); return 'Compliance review complete.'; } }),
      legal: () => ({ icon: '⚖️', t: 'Legal retainer', d: 'A lawyer for leaks and harassment. Costs each year.', ap: 1, cost: Math.round(3000 * s), why: h.legal >= 3 ? 'Maxed out' : '', run() { h.legal++; return 'A law firm is now on retainer.'; } }),
      pitch: (k) => ({ icon: '🤝', t: 'Pitch', d: '', ap: 1, cost: 0, why: h.prospects[+k] ? '' : 'Gone', run() { H.openPitch(b, +k); return null; } }),
      calendar: cdef('calendar', '📅', 'Plan content calendar', 1, 0, c => { c.quality = Math.min(100, c.quality + 4); c.hot = Math.min(100, (c.hot || 0) + 6); c.burnout = Math.min(100, c.burnout + 3); return `${c.name}'s content is better planned.`; }),
      shoot: cdef('shoot', '🎬', 'Fund a shoot day', 1, 500, c => { c.quality = Math.min(100, c.quality + 10); c.hot = Math.min(100, (c.hot || 0) + 8); c.burnout = Math.min(100, c.burnout + 8); return `${c.name}'s production value jumped.`; }),
      promo: cdef('promo', '📣', 'Cross-promote', 1, 300, c => { const g = Math.round(c.followers * 0.05 * rnd(0.5, 2)); c.followers += g; c.hot = Math.min(100, (c.hot || 0) + 8); return `${c.name} gained ${num(g)} followers.`; }),
      wellness: cdef('wellness', '🫶', 'Wellness check-in', 1, 0, c => { c.burnout = Math.max(0, c.burnout - 18); c.trust = Math.min(100, c.trust + 10); return `${c.name} feels heard. Burnout down, trust up.`; }),
      protect: cdef('protect', '🛡️', 'Anti-leak & privacy sweep', 1, 400, c => { c.safe = Math.min(100, (c.safe || 0) + 25); c.trust = Math.min(100, c.trust + 4); return `You locked down ${c.name}'s accounts and privacy.`; }),
      rest: cdef('rest', '🏖️', 'Give a break', 1, 0, c => { c.burnout = Math.max(0, c.burnout - 30); c.hot = Math.max(0, (c.hot || 0) - 8); c.trust = Math.min(100, c.trust + 5); return `${c.name} took a proper break.`; }),
      split: cdef('split', '📝', 'Improve their split', 1, 0, c => { if (c.split <= 10) return 'Already a minimal cut.'; c.split -= 5; c.trust = Math.min(100, c.trust + 12); return `${c.name} now keeps ${100 - c.split}% after the platform. Trust up.`; }),
      price: (v) => { const [k, p] = v.split('/'); return { icon: '💲', t: 'Price', d: '', ap: 0, cost: 0, why: cs[+k] ? '' : 'Gone', run() { cs[+k].price = +p; return `Subscription set to $${p}/month.`; } }; },
      release: (k) => ({ icon: '👋', t: 'Part ways', d: '', ap: 0, cost: 0, why: '', run() { const c = cs.splice(+k, 1)[0]; h.rep = Math.min(100, h.rep + (c.trust > 55 ? 2 : -2)); return `You parted ways with ${c.name}${c.trust > 55 ? ' on good terms' : ''}.`; } })
    };
  },
  openPitch(b, k) {
    const h = b.hub, c = h.prospects[k]; if (!c) return;
    const go = (split, trust, bonus) => () => {
      const p = clamp(0.3 + h.rep / 300 + bonus + (c.pers === 'cautious' && split <= 20 ? 0.15 : 0) + (c.pers === 'ambitious' && split >= 40 ? 0.15 : 0) - (split > c.ask ? (split - c.ask) / 80 : 0), 0.05, 0.9);
      h.prospects.splice(k, 1);
      if (chance(p)) {
        h.creators.push({ name: c.name, niche: c.niche, followers: c.followers, subs: Math.round(c.followers * 0.003), price: 10, quality: c.quality, burnout: 15, trust, split, hot: 20, safe: 0, pers: c.pers, earned: 0 });
        h.rep = Math.min(100, h.rep + 1);
        return `${c.name} signed with you on a ${split}% agency split.`;
      }
      return `${c.name} politely declined your offer.`;
    };
    showModal({
      icon: '🤳', title: 'Pitch: ' + c.name, art: '<div class="npc">🙋</div>',
      text: `${c.name} (${c.niche}, ${num(c.followers)} followers, ${c.pers}) is willing to hear you out. Creators decide for themselves, so make an offer worth saying yes to.`,
      buttons: [
        { t: 'Honest numbers · 20% cut · privacy clause', fn: () => hubResult(b, go(20, 70, 0.25)()) },
        { t: 'Standard terms · 30% cut', fn: () => hubResult(b, go(30, 55, 0.05)()) },
        { t: 'Big promises · 40% cut', fn: () => hubResult(b, go(40, 40, -0.2)()) }]
    });
  },
  extra(b, i) {
    const h = b.hub, H = HUBS.agency; let out = '';
    if (h.prospects.length) {
      out += '<h5>Prospects</h5>' + h.prospects.map((c, k) => `<div class="row"><span class="ic">🙋</span><div class="grow"><b>${c.name}</b><small>${c.niche} · ${num(c.followers)} followers · ${c.pers} · quality ${c.quality}</small></div><button class="btn sm gold" data-a="hubTask" data-v="${i}:pitch:${k}">Pitch ⚡1</button></div>`).join('');
    }
    out += `<h5>Your creators (${h.creators.length}/${H.max(b)})</h5>`;
    if (!h.creators.length) out += '<div class="note">No creators yet. Scout some, then pitch them a fair offer. They can say no.</div>';
    h.creators.forEach((c, k) => {
      const btn = (id, ico, label) => `<button class="mini" data-a="hubTask" data-v="${i}:${id}:${k}" title="${label}">${ico}</button>`;
      out += `<div class="card"><b>${c.name}</b> <small>${c.niche} · ${c.pers}</small>
        <small>${num(c.followers)} followers · ${num(c.subs)} subs · $${c.price}/mo · they keep ${100 - c.split}% after platform</small>
        <div class="sb"><label>Trust</label><div class="bar"><i style="width:${c.trust}%;background:${hcol(c.trust)}"></i></div><b>${Math.round(c.trust)}</b></div>
        <div class="sb"><label>Burnout</label><div class="bar"><i style="width:${c.burnout}%;background:${hcol(100 - c.burnout)}"></i></div><b>${Math.round(c.burnout)}</b></div>
        <div class="sb"><label>Quality</label><div class="bar"><i style="width:${c.quality}%;background:${hcol(c.quality)}"></i></div><b>${Math.round(c.quality)}</b></div>
        <div class="btns">${btn('calendar', '📅', 'Content calendar')}${btn('shoot', '🎬', 'Fund a shoot ($)')}${btn('promo', '📣', 'Cross-promote ($)')}${btn('wellness', '🫶', 'Wellness check-in')}${btn('protect', '🛡️', 'Privacy sweep ($)')}${btn('rest', '🏖️', 'Give a break')}${btn('split', '📝', 'Improve split')}
        ${[5, 10, 15, 25].map(p => `<button class="mini ${c.price === p ? 'on' : ''}" data-a="hubTask" data-v="${i}:price:${k}/${p}">$${p}</button>`).join('')}${btn('release', '👋', 'Part ways')}</div>
        <small>⚡1 each. 🎬 and 📣 cost money.</small></div>`;
    });
    return out;
  },
  yearEnd(b) {
    const h = b.hub, s = hsc(b), cs = h.creators, notes = [];
    let rev = 0, gross = 0;
    for (let k = cs.length - 1; k >= 0; k--) {
      const c = cs[k];
      c.followers = Math.round(c.followers * (1 + clamp((c.hot || 0) / 100 * 0.25 + c.quality / 600 - 0.05, -0.1, 0.3) * rnd(0.6, 1.4) * Math.max(0.05, 1 - c.followers / 1.2e6)));
      let target = c.followers * (0.004 + c.quality / 100 * 0.008) * Math.pow(10 / c.price, 0.7);
      if (chance(0.06)) { target *= 1.8; notes.push(`${c.name} had a breakout moment.`); }
      c.subs = Math.max(0, Math.round((c.subs + target) / 2));
      const chatBonus = 1 + 0.15 + Math.min(0.5, h.chatters * 0.12 / Math.max(1, cs.length));
      const g = c.subs * c.price * 12 * chatBonus, net = g * 0.8, mine = net * c.split / 100;
      gross += g; rev += mine; c.earned = net - mine;
      c.hot = (c.hot || 0) * 0.7;
      c.burnout = clamp(c.burnout - 10 + (c.shoots || 0), 0, 100);
      if (c.split <= 25) c.trust = Math.min(100, c.trust + 3); else if (c.split >= 35) c.trust = Math.max(0, c.trust - 4);
      // risks
      if (chance(0.12 * (1 - (c.safe || 0) / 130))) {
        const cost = h.legal > 0 ? 1500 * s : 0; rev -= cost; c.trust = Math.max(0, c.trust - (h.legal > 0 ? 5 : 15)); c.hot = Math.max(0, c.hot - 5);
        notes.push(`${c.name}'s content leaked online. ${h.legal > 0 ? 'Your lawyers handled the takedowns.' : 'You had no legal support and trust took a hit.'}`);
      }
      c.safe = Math.max(0, (c.safe || 0) - 15);
      if (c.burnout > 85 && chance(0.4)) { cs.splice(k, 1); h.rep = Math.max(0, h.rep - 4); notes.push(`${c.name} burned out and left the platform.`); continue; }
      if (c.trust < 25 && chance(0.35)) { cs.splice(k, 1); h.rep = Math.max(0, h.rep - 5); notes.push(`${c.name} left your agency. They did not feel supported.`); continue; }
    }
    if (chance(0.05 * (1 - h.compliance / 120))) { const hit = rev * 0.1; rev -= hit; h.rep = Math.max(0, h.rep - 8); notes.push(`A compliance scare cost you ${fmt(hit)} and some reputation.`); }
    const exp = h.chatters * 18000 + 2000 * s + h.legal * 6000;
    const profit = rev - exp;
    if (cs.length) notes.unshift(`Fans spent ${fmt(gross)} across ${cs.length} creator${cs.length > 1 ? 's' : ''}. Your cut: ${fmt(rev)}.`); else notes.push('No creators on your roster.');
    h.prospects = []; h.compliance = Math.max(0, h.compliance - 5);
    if (cs.length) h.rep = clamp(h.rep + (cs.reduce((a, c) => a + c.trust, 0) / cs.length - 50) / 20, 0, 100);
    return { rev, exp, profit, notes };
  },
  value(b) { return Math.max(3000, (b.last ? b.last.profit : 0) * 3) * (0.8 + b.level * 0.2); },
  roleplays: [
    { npc: ['Your creator', '🙋'], ok: b => b.hub.creators.length > 0, who: 1, text: c => `${c.name} asks you to lower the agency cut: "I'm doing most of the work. Can we move to ${Math.max(10, c.split - 5)}%?"`,
      choices: [
        { t: 'Agree to the new split', fn: (b, c) => { c.split = Math.max(10, c.split - 5); c.trust = Math.min(100, c.trust + 12); return `${c.name} is thrilled and works harder.`; } },
        { t: 'Meet in the middle', fn: (b, c) => { c.split = Math.max(10, c.split - 2); c.trust = Math.min(100, c.trust + 4); return `${c.name} accepted a small reduction.`; } },
        { t: 'Refuse', fn: (b, c) => { c.trust = Math.max(0, c.trust - 12); return `${c.name} is disappointed.`; } }] },
    { npc: ['Your creator', '😮‍💨'], ok: b => b.hub.creators.length > 0, who: 1, text: c => `${c.name} says they feel exhausted and asks for a lighter schedule.`,
      choices: [
        { t: 'Give them a month off', fn: (b, c) => { c.burnout = Math.max(0, c.burnout - 30); c.trust = Math.min(100, c.trust + 10); c.hot = Math.max(0, c.hot - 10); return `${c.name} came back refreshed.`; } },
        { t: 'Lighter schedule', fn: (b, c) => { c.burnout = Math.max(0, c.burnout - 15); c.trust = Math.min(100, c.trust + 5); return 'A balanced calendar helped.'; } },
        { t: 'Push for the content calendar', fn: (b, c) => { c.trust = Math.max(0, c.trust - 15); c.burnout = Math.min(100, c.burnout + 8); return `${c.name} felt ignored. This will cost you.`; } }] },
    { npc: ['Your creator', '😨'], ok: b => b.hub.creators.length > 0, who: 1, text: c => `A fan has been harassing ${c.name} and tracking their posts. ${c.name} is scared.`,
      choices: [
        { t: 'Lawyers + platform report', fn: (b, c) => { const cost = Math.round(2500 * hsc(b)); S.cash -= cost; c.trust = Math.min(100, c.trust + 15); c.safe = Math.min(100, (c.safe || 0) + 30); return `You acted fast (${fmt(cost)}). ${c.name} feels safe.`; } },
        { t: 'Block, report and safety plan', fn: (b, c) => { c.trust = Math.min(100, c.trust + 6); return 'You blocked the account and built a safety plan.'; } },
        { t: 'Downplay it', fn: (b, c) => { c.trust = Math.max(0, c.trust - 25); b.hub.rep = Math.max(0, b.hub.rep - 5); return `${c.name} does not trust you to protect them anymore.`; } }] },
    { npc: ['Your creator', '🔓'], ok: b => b.hub.creators.length > 0, who: 1, text: c => `${c.name}'s private content showed up on a pirate site.`,
      choices: [
        { t: 'Takedown blitz ($1,500)', fn: (b, c) => { S.cash -= 1500; c.trust = Math.min(100, c.trust + 6); return 'The pirate listings came down fast.'; } },
        { t: 'Public statement', fn: (b, c) => { b.hub.rep = Math.min(100, b.hub.rep + 2); return 'Your statement earned sympathy.'; } },
        { t: 'Ignore it', fn: (b, c) => { c.trust = Math.max(0, c.trust - 15); c.hot = Math.max(0, c.hot - 8); return `${c.name} is angry and subs dropped.`; } }] },
    { npc: ['Rival agency', '🤵'], ok: b => b.hub.creators.length > 0, text: () => 'A bigger agency proposes a cross-promo partnership across both rosters.',
      choices: [
        { t: 'Accept', fn: b => { b.hub.creators.forEach(c => { c.followers = Math.round(c.followers * 1.06); c.hot = Math.min(100, (c.hot || 0) + 6); }); return 'Both rosters grew.'; } },
        { t: 'Negotiate', fn: b => { if (chance(0.5)) { b.hub.creators.forEach(c => { c.followers = Math.round(c.followers * 1.09); }); return 'They agreed to better terms.'; } return 'They withdrew the offer.'; } },
        { t: 'Decline', fn: () => 'You kept your own lane.' }] },
    { npc: ['Your creator', '🚪'], ok: b => b.hub.creators.length > 0, who: 1, text: c => `${c.name} is thinking about going solo and leaving your agency.`,
      choices: [
        { t: 'Wish them well', fn: (b, c) => { b.hub.creators.splice(b.hub.creators.indexOf(c), 1); b.hub.rep = Math.min(100, b.hub.rep + 3); return `${c.name} left on great terms and tells people about you.`; } },
        { t: 'Offer better terms', fn: (b, c) => { c.split = Math.max(10, c.split - 5); c.trust = Math.min(100, c.trust + 18); return `${c.name} decided to stay.`; } },
        { t: 'Point to the contract', fn: (b, c) => { c.trust = Math.max(0, c.trust - 20); return `${c.name} stayed, but trust is badly damaged.`; } }] },
    { npc: ['Platform notice', '📩'], ok: () => true, text: () => 'The platform updated its content rules and is auditing agencies.',
      choices: [
        { t: 'Full compliance sweep ($1,000)', fn: b => { S.cash -= 1000; b.hub.compliance = Math.min(100, b.hub.compliance + 20); return 'You passed the audit comfortably.'; } },
        { t: 'Quick check', fn: b => { b.hub.compliance = Math.min(100, b.hub.compliance + 6); return 'It was enough, barely.'; } },
        { t: 'Ignore it', fn: b => { b.hub.compliance = Math.max(0, b.hub.compliance - 10); b.hub.rep = Math.max(0, b.hub.rep - 4); return 'The platform flagged your agency.'; } }] }
  ]
};

/* ---- shared hub helpers ---- */
function hubResult(b, msg) {
  if (!msg) return; hlog(b, msg); b.last2 = msg; say(HUBS[b.id].icon, msg, ''); toast(msg);
}
function hubCall(b) {
  const H = HUBS[b.id], pool = H.roleplays.filter(r => r.ok(b));
  if (!pool.length) return toast('Nobody is calling right now.');
  const r = pick(pool), c = r.who ? pick(b.hub.creators) : null;
  showModal({
    icon: r.npc[1], title: r.npc[0], art: `<div class="npc">${r.npc[1]}</div>`, text: r.text(c),
    buttons: r.choices.map(ch => ({ t: ch.t, fn: () => { hubResult(b, ch.fn(b, c)); save(); } }))
  });
}
