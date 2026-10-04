/* Hustleville — fashion: full-body characters, brand clothing stores and a fitting room.
   Garments are transparent layers cut to the shared woman/man body templates, so they fit every character of that body type.
   Loaded before game.js (needs S, UI, fmt, say, save, refresh, renderFeed at call time). */
'use strict';

const WD_SLOTS = { bottom: 1, top: 2, dress: 2, shoes: 3, face: 4, head: 5 };                // draw order
const WD_SLOT_NAME = { top: 'Top', bottom: 'Bottoms', dress: 'Dress', shoes: 'Shoes', face: 'Face', head: 'Hat' };
const WARDROBE = [
  { id: 'urban', n: 'Urban Thread', e: '🧢', blurb: 'Loud streetwear for the block', items: [
    { id: 'u_m_hoodie', g: 'm', slot: 'top', n: 'Blaze Hoodie', price: 120, looks: 2 }, { id: 'u_m_cargo', g: 'm', slot: 'bottom', n: 'Block Cargo Joggers', price: 90, looks: 1 },
    { id: 'u_m_hightop', g: 'm', slot: 'shoes', n: 'Crimson High-Tops', price: 160, looks: 2 }, { id: 'u_m_cap', g: 'm', slot: 'head', n: 'Midnight Snapback', price: 45, looks: 1 },
    { id: 'u_w_jacket', g: 'w', slot: 'top', n: 'Blaze Crop Jacket', price: 130, looks: 2 }, { id: 'u_w_cargo', g: 'w', slot: 'bottom', n: 'Block Cargo Pants', price: 90, looks: 1 },
    { id: 'u_w_platform', g: 'w', slot: 'shoes', n: 'Candy Platforms', price: 150, looks: 2 }, { id: 'u_w_beanie', g: 'w', slot: 'head', n: 'Tangerine Beanie', price: 35, looks: 1 }] },
  { id: 'sunny', n: 'Sunny Coast', e: '🌴', blurb: 'Beach-day basics and holiday colour', items: [
    { id: 's_m_floral', g: 'm', slot: 'top', n: 'Hibiscus Shirt', price: 70, looks: 1 }, { id: 's_m_board', g: 'm', slot: 'bottom', n: 'Coral Board Shorts', price: 55, looks: 1 },
    { id: 's_m_sandal', g: 'm', slot: 'shoes', n: 'Beach Flip-Flops', price: 30, looks: 1 }, { id: 's_m_shades', g: 'm', slot: 'face', n: 'Gold Aviators', price: 95, looks: 2 },
    { id: 's_w_sundress', g: 'w', slot: 'dress', n: 'Daisy Sundress', price: 110, looks: 2 }, { id: 's_w_denim', g: 'w', slot: 'bottom', n: 'Cutoff Denims', price: 60, looks: 1 },
    { id: 's_w_sunhat', g: 'w', slot: 'head', n: 'Straw Sun Hat', price: 55, looks: 1 }, { id: 's_w_sandal', g: 'w', slot: 'shoes', n: 'Gladiator Sandals', price: 45, looks: 1 }] },
  { id: 'apex', n: 'Apex Athletics', e: '🏃', blurb: 'Performance gear that looks fast', items: [
    { id: 'a_m_top', g: 'm', slot: 'top', n: 'Royal Compression Top', price: 80, looks: 1 }, { id: 'a_m_track', g: 'm', slot: 'bottom', n: 'Stripe Track Pants', price: 110, looks: 1 }, { id: 'a_m_run', g: 'm', slot: 'shoes', n: 'Neon Runners', price: 190, looks: 2 },
    { id: 'a_w_top', g: 'w', slot: 'top', n: 'Pink Sport Top', price: 70, looks: 1 }, { id: 'a_w_leggings', g: 'w', slot: 'bottom', n: 'Stripe Leggings', price: 95, looks: 1 }, { id: 'a_w_train', g: 'w', slot: 'shoes', n: 'Lavender Trainers', price: 170, looks: 2 }] },
  { id: 'velvet', n: 'Velvet & Vine', e: '💎', blurb: 'Tailored luxury for the very successful', items: [
    { id: 'v_m_suit', g: 'm', slot: 'top', n: 'Navy Suit Jacket', price: 2400, looks: 5 }, { id: 'v_m_trousers', g: 'm', slot: 'bottom', n: 'Pressed Trousers', price: 1200, looks: 3 }, { id: 'v_m_oxford', g: 'm', slot: 'shoes', n: 'Oxford Shoes', price: 1600, looks: 4 },
    { id: 'v_w_gown', g: 'w', slot: 'dress', n: 'Emerald Gown', price: 5200, looks: 8 }, { id: 'v_w_blazer', g: 'w', slot: 'top', n: 'Burgundy Blazer', price: 1900, looks: 4 }, { id: 'v_w_heels', g: 'w', slot: 'shoes', n: 'Stiletto Pumps', price: 1700, looks: 4 }] }
];
const WD_SKIN = new Set(['a_w_top', 's_m_floral', 's_m_sandal', 's_w_sandal', 's_w_sundress', 'u_w_jacket', 'v_w_gown', 'v_w_heels']);   // layers that show template skin: pre-tinted per character
const WD_ITEM = {}; WARDROBE.forEach(b => b.items.forEach(i => { WD_ITEM[i.id] = { ...i, brand: b.id }; }));

const wdGender = () => (typeof avatarOf === 'function' && avatarOf().who === 'Man') ? 'm' : 'w';
const wdState = () => { if (!S.wardrobe) S.wardrobe = { own: {}, worn: {} }; return S.wardrobe; };
const wdBody = () => { const av = avatarOf(); return av && av.fb ? av.fb : null; };

function wdFigure(px, g) {                                             // the character wearing what they have on, as stacked layers
  const w = wdState().worn, body = wdBody(), h = Math.round(px * 716 / 400); if (!body) return '';
  const layers = Object.entries(w).filter(([, id]) => id && WD_ITEM[id]).sort((a, b) => WD_SLOTS[a[0]] - WD_SLOTS[b[0]]);
  return `<span class="wdfig" style="width:${px}px;height:${h}px"><img src="${body}" alt="">${layers.map(([, id]) => `<img src="assets/wardrobe/g-${id}${WD_SKIN.has(id) && !['amara', 'diego'].includes(avatarOf().k) ? '@' + avatarOf().k : ''}.webp" alt="">`).join('')}</span>`;
}
function wdWear(id) {
  const it = WD_ITEM[id], st = wdState(); if (!it || !st.own[id]) return;
  const worn = st.worn;
  if (it.slot === 'dress') { delete worn.top; delete worn.bottom; } else if (it.slot === 'top' || it.slot === 'bottom') delete worn.dress;
  worn[it.slot] = id;
}
function wdStyle() { const w = wdState().worn; return Object.values(w).reduce((s, id) => s + (WD_ITEM[id] ? WD_ITEM[id].looks : 0), 0); }

function fashionHTML() {
  if (S.age < 4) return '<div class="note">Clothes shopping unlocks at age 4. For now you wear whatever mum picks.</div>';
  const st = wdState(), g = wdGender(), av = avatarOf(), worn = st.worn;
  const slots = ['head', 'face', 'top', 'dress', 'bottom', 'shoes'];
  let h = `<div class="wdroom"><div class="wdstage">${wdFigure(150)}</div><div class="wdinfo"><b>${S.name}'s fitting room</b><small>Style score <b>${wdStyle()}</b> · tap an item you own to wear it</small>
    <div class="wdslots">${slots.map(s => worn[s] ? `<button class="wdslot on" data-a="wdOff" data-v="${s}"><span>${WD_SLOT_NAME[s]}</span>${WD_ITEM[worn[s]].n} ✕</button>` : '').join('') || '<small>Wearing the basics. Shop below!</small>'}</div>
    ${Object.keys(worn).length ? '<button class="mini" data-a="wdStrip">👕 Back to basics</button>' : ''}</div></div>`;
  WARDROBE.forEach(b => {
    const items = b.items.filter(i => i.g === g), shut = !!(UI.shut && UI.shut['cl_' + b.id]);
    h += `<button class="brandhead ${shut ? 'shut' : ''}" data-a="toggleGrp" data-v="cl_${b.id}"><span class="bh"><b>${b.e} ${b.n}</b><small>${b.blurb}</small></span><em>${items.length}</em><i class="chev">▾</i></button>
      <div class="agrid ${shut ? 'hide' : ''}">${items.map(i => {
        const own = st.own[i.id], on = worn[i.slot] === i.id;
        return `<div class="acard wdcard"><span class="wdthumb" style="background-image:url(assets/wardrobe/t-${i.id}.webp)"></span><b>${i.n}</b><small>${WD_SLOT_NAME[i.slot]} · ✨ +${i.looks} looks</small>
          ${own ? `<button class="gbtn sm" data-a="${on ? 'wdOff' : 'wdOn'}" data-v="${on ? i.slot : i.id}">${on ? 'TAKE OFF' : 'WEAR'}</button>` : `<button class="gbtn sm" ${S.cash >= i.price && !S.jail ? '' : 'disabled'} data-a="wdBuy" data-v="${i.id}">${fmt(i.price)}</button>`}</div>`;
      }).join('')}</div>`;
  });
  return h;
}

const WARDROBE_ACTS = {
  wdBuy(id) {
    const it = WD_ITEM[id], st = wdState(); if (!it || st.own[id] || S.cash < it.price || S.jail) return;
    S.cash -= it.price; st.own[id] = 1; S.looks = clamp(S.looks + it.looks); wdWear(id);
    say('👗', `You bought the ${it.n} from ${WARDROBE.find(b => b.id === it.brand).n} (+${it.looks} looks).`, 'good'); save(); refresh(); renderFeed();
  },
  wdOn(id) { wdWear(id); save(); refresh(); },
  wdOff(slot) { delete wdState().worn[slot]; save(); refresh(); },
  wdStrip() { wdState().worn = {}; save(); refresh(); }
};
