/* Hustleville — the Garage. Visual car customization: widebody kits, paint + finish, headlight colours.
   Cars are Runway-generated sprites (stock + widebody). Paint is a real recolor done on a canvas using a per-car paint map
   (R = shading, G = body-paint mask), headlights are recoloured + glow-lit, so every combination is rendered live. */
'use strict';

const Garage = (() => {
  const DIR = 'assets/garage/';
  const CAR_KEY = { 'Used Hatchback': 'hatch', 'Family Sedan': 'sedan', 'Luxury SUV': 'suv', 'Sports Coupe': 'coupe', 'Lamborghini': 'lambo', 'Bugatti Chiron': 'bugatti', 'Motorbike': 'bike', 'Pickup Truck': 'pickup', 'Scarlatti Stradale GT': 'scar0', 'Scarlatti Mirasole V12': 'scar1', 'Scarlatti Tempesta SF': 'scar2', 'Scarlatti Fenice Unica': 'scar3', 'Bellucci Aurelle': 'bell0', 'Bellucci Orion': 'bell1', 'Bellucci Sovrano': 'bell2', 'Bellucci Mirage Unica': 'bell3', 'Zeffiro Aria': 'zef0', 'Zeffiro Scirocco': 'zef1', 'Zeffiro Maestrale': 'zef2', 'Zeffiro Libeccio Unica': 'zef3', 'Kronvik Aurora': 'kron0', 'Kronvik Frost': 'kron1', 'Kronvik Valkyr': 'kron2', 'Kronvik Ragnarok Unica': 'kron3', 'Classic Muscle Car': 'muscle', 'Rolls-Royce': 'rolls' };
  const PAINTS = [
    { n: 'Stock' },
    { n: 'Crimson', c: [205, 22, 40] }, { n: 'Orange', c: [255, 112, 18] }, { n: 'Sunshine', c: [255, 204, 0] }, { n: 'Lime', c: [112, 222, 36] },
    { n: 'Emerald', c: [18, 150, 84] }, { n: 'Aqua', c: [18, 190, 204] }, { n: 'Electric blue', c: [28, 92, 236] }, { n: 'Midnight', c: [22, 34, 104], hl: 0.7 },
    { n: 'Violet', c: [128, 52, 206] }, { n: 'Hot pink', c: [246, 60, 164] }, { n: 'Gold', c: [214, 168, 50], hl: 0.8 },
    { n: 'Silver', c: [172, 176, 190], hl: 0.8 }, { n: 'Pearl white', c: [248, 248, 252], hl: 0.55, g: 0.72 }, { n: 'Obsidian', c: [34, 36, 44], hl: 0.55, g: 0.8 }
  ];
  const LIGHTS = [
    { n: 'Stock' }, { n: 'Ice blue', c: [110, 208, 255] }, { n: 'Neon purple', c: [182, 108, 255] }, { n: 'Acid lime', c: [168, 255, 60] },
    { n: 'Hot red', c: [255, 62, 62] }, { n: 'Gold', c: [255, 202, 64] }, { n: 'Pink', c: [255, 92, 196] }, { n: 'Cyan', c: [70, 255, 240] }
  ];
  const WRAPS = [{ n: 'None' }, { n: 'Sakura Idol', f: 'wrap-sakura.webp', jp: 'さくら' }, { n: 'Neon Tokyo', f: 'wrap-neon.webp', jp: '東京' }, { n: 'Drift Team', f: 'wrap-drift.webp', jp: '走り屋' }, { n: 'Kitsune Miko', f: 'wrap-kitsune.webp', jp: '狐' }, { n: 'Mecha Pilots', f: 'wrap-mecha.webp', jp: '出撃' }, { n: 'Magic Stars', f: 'wrap-magic.webp', jp: '魔法' }];
  const WHEELS = [{ n: 'Stock' }, { n: 'Chrome Star' }, { n: 'Gold Mesh' }, { n: 'Matte Blade' }, { n: 'Classic White' }, { n: 'Red Lip' }, { n: 'Turbine' }, { n: 'Carbon Aero' }, { n: 'Neon Ring' }, { n: 'Rose Gold' }, { n: 'Bronze Forged' }, { n: 'Blue Anodized' }, { n: 'Spinner' }, { n: 'Gunmetal Mesh' }, { n: 'Racing Yellow' }, { n: 'Wire Spoke' }, { n: 'Violet Swirl' }];
  const NEONS = [{ n: 'Off' }, { n: 'Cyan', c: [40, 240, 255] }, { n: 'Magenta', c: [255, 50, 210] }, { n: 'Violet', c: [150, 80, 255] }, { n: 'Lime', c: [140, 255, 60] }, { n: 'Red', c: [255, 50, 60] }, { n: 'Blue', c: [50, 110, 255] }, { n: 'Ice white', c: [235, 245, 255] }, { n: 'Rainbow', rainbow: true }];
  const hex = (c) => c ? `rgb(${c[0]},${c[1]},${c[2]})` : '#fff';
  // every wrap / wheel set has its own price tag (multiplier on the car's base tuning price)
  const WRAP_X = [0, 1, 1.3, 1.7, 2.2, 2.8, 3.5], WHEEL_X = [0, 0.7, 1.1, 0.9, 0.6, 1.3, 1.6, 2.2, 1.9, 2.6, 3, 2.4, 3.4, 1.4, 1.0, 4.2, 3.7];
  const PRICE = {
    wide: (a) => Math.min(6e6, Math.max(2500, Math.round(a.price * 0.1))),
    paint: (a) => Math.max(800, Math.round(a.price * 0.012)),
    matte: (a) => Math.max(300, Math.round(a.price * 0.004)),
    light: (a) => Math.max(400, Math.round(a.price * 0.004)),
    wrap: (a, k) => Math.round(Math.min(1.5e6, Math.max(3500, a.price * 0.03)) * (WRAP_X[k] || 1)),
    neon: (a) => Math.max(900, Math.round(a.price * 0.008)),
    wheel: (a, k) => Math.round(Math.min(900e3, Math.max(1800, a.price * 0.02)) * (WHEEL_X[k] || 1))
  };
  const keyOf = (a) => a && a.cat === 'car' ? CAR_KEY[a.n] : null;
  const norm = (m) => ({ wide: m && m.wide ? 1 : 0, paint: m && m.paint > 0 && m.paint < PAINTS.length ? m.paint | 0 : 0, finish: m && m.finish ? 1 : 0, light: m && m.light > 0 && m.light < LIGHTS.length ? m.light | 0 : 0, wrap: m && m.wrap > 0 && m.wrap < WRAPS.length ? m.wrap | 0 : 0, neon: m && m.neon > 0 && m.neon < NEONS.length ? m.neon | 0 : 0, wheel: m && m.wheel > 0 && m.wheel < WHEELS.length ? m.wheel | 0 : 0 });
  const plain = (m) => !m.wide && !m.paint && !m.light && !m.wrap && !m.neon && !m.wheel;

  /* ---------- asset loading + canvas recolor ---------- */
  const cars = {}, pending = {}, caches = {}; let tainted = false, meta = null;
  function loadImg(src, cors) {
    return new Promise((res, rej) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('img ' + src)); im.src = src; });
  }
  async function fetchImg(src) { try { return await loadImg(src, true); } catch (e) { return loadImg(src, false); } }
  function pixels(im) {
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    return g.getImageData(0, 0, c.width, c.height);
  }
  const WR = {}; let wrapsP = null, WHL = null;
  function loadWraps() {
    if (!wrapsP) wrapsP = Promise.all([fetchImg(DIR + 'wheels.webp').then(im => { WHL = im; }).catch(() => {})].concat(WRAPS.map(async (w, i) => { if (!w.f) return; try { WR[i] = { img: await fetchImg(DIR + w.f), cache: {} }; } catch (e) { /* missing wrap art: skipped */ } })));
    return wrapsP;
  }
  function wrapPixels(v, i) {                                       // wrap art stretched over the body-paint area of this variant, cached
    const W = WR[i]; if (!W) return null; if (W.cache[v.id]) return W.cache[v.id];
    if (!v.bb) { let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0; for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) if (v.pm[(y * v.w + x) * 4 + 1] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } v.bb = [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; }
    const [bx, by, bw, bh] = v.bb, c = document.createElement('canvas'); c.width = bw; c.height = bh; c.getContext('2d').drawImage(W.img, 0, 0, bw, bh);
    return (W.cache[v.id] = { d: c.getContext('2d').getImageData(0, 0, bw, bh).data, bx, by, bw, bh });
  }
  function load(key) {
    if (cars[key]) return Promise.resolve(cars[key]);
    if (pending[key]) return pending[key];
    pending[key] = (async () => {
      if (!meta) meta = await (await fetch(DIR + 'meta.json')).json();
      await loadWraps();
      const info = meta[key], ent = { info, vars: {} };
      for (const v of (info.wide ? ['stock', 'wide'] : ['stock'])) {
        const [sp, pm] = await Promise.all([fetchImg(`${DIR}${key}-${v}.webp`), fetchImg(`${DIR}${key}-${v}-pm.png`)]);
        const o = { img: sp, w: sp.naturalWidth, h: sp.naturalHeight, id: key + v };
        try { o.px = pixels(sp).data; o.pm = pixels(pm).data; } catch (e) { tainted = true; }
        ent.vars[v] = o;
      }
      cars[key] = ent; return ent;
    })().catch((e) => { delete pending[key]; throw e; });
    return pending[key];
  }

  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // renders (key, mods) to a canvas. o.pad: transparent border (fraction of width) so glows are not clipped. o.glow: glow strength (0 = none)
  function compose(key, m, o) {
    const ent = cars[key]; if (!ent) return null; o = o || {}; m = norm(m);
    const v = ent.vars[m.wide && ent.info.wide ? 'wide' : 'stock']; if (!v.px) return null;
    const w = v.w, h = v.h, data = new Uint8ClampedArray(v.px), pm = v.pm, P = PAINTS[m.paint];
    if (P.c) {
      const matte = m.finish === 1, hlK = (P.hl == null ? 0.88 : P.hl) * (matte ? 0.18 : 1), gm = P.g || 1, c = P.c;
      for (let i = 0, n = w * h; i < n; i++) {
        const k = i * 4, mk = pm[k + 1]; if (!mk) continue;
        const R = pm[k]; let s = Math.pow(Math.min(1, R / 150), gm); if (matte) s = 0.2 + 0.8 * s;
        const hh = Math.max(0, (R - 150) / 105) * hlK, a = mk / 255;
        const r = c[0] * s * (1 - hh) + 255 * hh, g = c[1] * s * (1 - hh) + 255 * hh, b = c[2] * s * (1 - hh) + 255 * hh;
        data[k] = data[k] * (1 - a) + r * a; data[k + 1] = data[k + 1] * (1 - a) + g * a; data[k + 2] = data[k + 2] * (1 - a) + b * a;
      }
    }
    const WP = m.wrap ? wrapPixels(v, m.wrap) : null;
    if (WP) {
      const matte = m.finish === 1;
      for (let y = 0; y < WP.bh; y++) for (let x = 0; x < WP.bw; x++) {
        const px = WP.bx + x, py = WP.by + y, i = py * w + px, k = i * 4, mk = pm[k + 1]; if (!mk) continue;
        const R = pm[k]; let sh = Math.min(1.12, R / 150); sh = 0.2 + 0.9 * sh; if (matte) sh = 0.45 + 0.55 * sh;
        const hh = Math.max(0, (R - 150) / 105) * (matte ? 0.1 : 0.4), t = (y * WP.bw + x) * 4, a = mk / 255;
        const r = WP.d[t] * sh * (1 - hh) + 255 * hh, g = WP.d[t + 1] * sh * (1 - hh) + 255 * hh, b = WP.d[t + 2] * sh * (1 - hh) + 255 * hh;
        data[k] = data[k] * (1 - a) + r * a; data[k + 1] = data[k + 1] * (1 - a) + g * a; data[k + 2] = data[k + 2] * (1 - a) + b * a;
      }
    }
    const lights = ent.info.lamps.map(([cx, cy, rx, ry, ang]) => ({ cx: cx * w, cy: cy * h, rx: rx * w, ry: ry * h, a: ang * Math.PI / 180 })), LC = LIGHTS[m.light].c;
    if (LC) {
      for (const L of lights) {
        const ca = Math.cos(-L.a), sa = Math.sin(-L.a), R = Math.max(L.rx, L.ry) * 1.3;
        for (let y = Math.max(0, Math.floor(L.cy - R)); y < Math.min(h, Math.ceil(L.cy + R)); y++) for (let x = Math.max(0, Math.floor(L.cx - R)); x < Math.min(w, Math.ceil(L.cx + R)); x++) {
          const dx = x - L.cx, dy = y - L.cy, u = (dx * ca - dy * sa) / L.rx, t = (dx * sa + dy * ca) / L.ry, d = Math.sqrt(u * u + t * t); if (d > 1.15) continue;
          const k = (y * w + x) * 4, r = data[k], g = data[k + 1], b = data[k + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, sat = mx ? (mx - mn) / mx : 0;
          const lw = sstep(0.4, 0.68, lum) * (1 - sstep(0.3, 0.58, sat)) * (1 - sstep(0.85, 1.12, d)) * 0.94; if (lw <= 0) continue;
          const tt = 0.4 + 0.85 * lum; data[k] = r * (1 - lw) + Math.min(255, LC[0] * tt) * lw; data[k + 1] = g * (1 - lw) + Math.min(255, LC[1] * tt) * lw; data[k + 2] = b * (1 - lw) + Math.min(255, LC[2] * tt) * lw;
        }
      }
    }
    const pad = Math.round((o.pad || 0) * w), cv = document.createElement('canvas'); cv.width = w + pad * 2; cv.height = h + Math.max(pad, m.neon ? Math.round(w * 0.14) : 0); const ctx = cv.getContext('2d');
    if (m.neon) {                                                             // underglow: drawn first so the car sits on top of it
      if (!v.ab) { let x0 = w, x1 = 0, y1 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (v.px[(y * w + x) * 4 + 3] > 200) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y > y1) y1 = y; } v.ab = [x0, x1, y1]; }
      const [ax0, ax1, ay1] = v.ab, N = NEONS[m.neon], gn = o.glow == null ? 1 : Math.max(0.8, o.glow), cx = (ax0 + ax1) / 2 + pad, cy = ay1 - h * 0.075, rx = (ax1 - ax0) * 0.56, ry = Math.max(h * 0.16, rx * 0.2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const blob = (x, rr, col, A) => { ctx.save(); ctx.translate(x, cy); ctx.scale(1, ry / rx); const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr); gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${A})`); gr.addColorStop(0.45, `rgba(${col[0]},${col[1]},${col[2]},${A * 0.45})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`); ctx.fillStyle = gr; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore(); };
      if (N.rainbow) { const cols = [[255, 60, 70], [255, 170, 40], [250, 240, 60], [70, 240, 110], [50, 210, 255], [110, 100, 255], [240, 70, 230]]; cols.forEach((c, i) => blob(cx - rx * 0.78 + i * rx * 0.26, rx * 0.5, c, 0.55 * gn)); }
      else { blob(cx, rx * 1.12, N.c, 0.5 * gn); blob(cx, rx * 0.8, N.c, 0.7 * gn); blob(cx, rx * 0.55, [255, 255, 255], 0.16 * gn); }
      ctx.restore();
    }
    const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; const tctx = tmp.getContext('2d'); tctx.putImageData(new ImageData(data, w, h), 0, 0);
    const WL = ent.info.wheels && ent.info.wheels[m.wide && ent.info.wide ? 'wide' : 'stock'];
    if (m.wheel && WL && WHL) {                                               // swap the rims: new wheel art squashed into each visible rim ellipse
      const wi = m.wheel - 1, sx = (wi % 4) * 256, sy = Math.floor(wi / 4) * 256;
      for (const [fx, fy, frx, fry, tilt] of WL) {
        tctx.save(); tctx.translate(fx * w, fy * h); tctx.rotate(tilt * Math.PI / 180); tctx.scale(frx * w * 1.06, fry * h * 1.06);
        tctx.beginPath(); tctx.arc(0, 0, 1, 0, 7); tctx.clip(); tctx.drawImage(WHL, sx, sy, 256, 256, -1, -1, 2, 2);
        const sh = tctx.createRadialGradient(-0.15, -0.15, 0.35, 0, 0, 1.05); sh.addColorStop(0, 'rgba(8,12,30,0)'); sh.addColorStop(1, 'rgba(8,12,30,0.5)'); tctx.fillStyle = sh; tctx.fillRect(-1.1, -1.1, 2.2, 2.2); tctx.restore();
      }
    }
    ctx.drawImage(tmp, pad, 0);
    const gl = o.glow == null ? 1 : o.glow;
    if (gl > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const col = LC || [255, 244, 214], base = LC ? 1 : 0.45;
      lights.forEach((L, idx) => {
        const R = Math.max(L.rx, L.ry) * (1.5 + gl * 1.3), x = L.cx + pad, y = L.cy, gr = ctx.createRadialGradient(x, y, 0, x, y, R), A = Math.min(0.95, base * (0.24 + 0.22 * gl));
        gr.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${A})`); gr.addColorStop(0.35, `rgba(${col[0]},${col[1]},${col[2]},${A * 0.4})`); gr.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        if (o.beam && idx === 0) {                                                // night: a soft cone of light thrown ahead of the near lamp
          ctx.save(); ctx.translate(x, y); ctx.rotate(0.28); const len = w * 0.62;
          for (let q = 0; q < 7; q++) {                                           // stacked cones fake a feathered edge
            const sp = 1 + q * 0.32, g2 = ctx.createLinearGradient(0, 0, len, 0);
            g2.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${base * 0.1})`); g2.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
            ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(0, -L.ry * 0.5); ctx.lineTo(len, -L.ry * 1.6 * sp); ctx.lineTo(len, L.ry * 1.6 * sp); ctx.lineTo(0, L.ry * 0.5); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        }
      });
      ctx.globalCompositeOperation = 'source-over';
    }
    return cv;
  }

  /* ---------- small cached renders for cards ---------- */
  function ready(key) { return !!(cars[key] && Object.values(cars[key].vars).every(v => v.px)); }
  function dataUrl(key, m, o) {
    const id = key + JSON.stringify(norm(m)) + JSON.stringify(o || {}); if (caches[id]) return caches[id];
    const c = compose(key, m, o); if (!c) return null; return (caches[id] = c.toDataURL('image/webp', 0.92));
  }
  // thumbnail used in My stuff / shop cards for owned cars
  function art(a, B, base) {
    const key = keyOf(a), m = norm(a.mods);
    if (!key || plain(m)) return base();
    if (!ready(key)) { if (!tainted) load(key).then(() => { if (typeof S !== 'undefined' && S && typeof refresh === 'function') refresh(); }).catch(() => { tainted = true; }); return fallback(a, B, base); }
    const u = dataUrl(key, m, { glow: 0.6 }); return u ? `<img class="carimg" src="${u}" style="width:${B}px;height:${B}px" alt="">` : fallback(a, B, base);
  }
  function fallback(a, B, base) { return base(); }
  // big hero picture for the car card: the full-width sprite (customised or stock) with its natural aspect ratio
  function hero(a, base) {
    const key = keyOf(a); if (!key) return base();
    if (!ready(key)) { if (!tainted) load(key).then(() => { if (typeof S !== 'undefined' && S && typeof refresh === 'function') refresh(); }).catch(() => { tainted = true; }); return base(); }
    const m = norm(a.mods), u = dataUrl(key, m, { glow: 0.55, pad: m.neon ? 0.03 : 0 }); return u ? `<img class="carhero" src="${u}" alt="${a.n}">` : base();
  }

  /* ---------- the garage screen ---------- */
  let G = null, el = null;
  const $g = (id) => document.getElementById(id);
  const fm = (n) => typeof fmt === 'function' ? fmt(n) : '$' + Math.round(n);
  function costOf(a, d, cur) {
    const items = [];
    if (d.wide && !cur.wide) items.push(['Widebody kit', PRICE.wide(a)]);
    if ((d.paint !== cur.paint || d.finish !== cur.finish) && d.paint > 0) items.push([`${PAINTS[d.paint].n} respray${d.finish ? ' (matte)' : ''}`, PRICE.paint(a) + (d.finish ? PRICE.matte(a) : 0)]);
    if (d.light !== cur.light && d.light > 0) items.push([`${LIGHTS[d.light].n} headlights`, PRICE.light(a)]);
    if (d.wrap !== cur.wrap && d.wrap > 0) items.push([`${WRAPS[d.wrap].n} wrap`, PRICE.wrap(a, d.wrap)]);
    if (d.wheel !== cur.wheel && d.wheel > 0) items.push([`${WHEELS[d.wheel].n} wheels`, PRICE.wheel(a, d.wheel)]);
    if (d.neon !== cur.neon && d.neon > 0) items.push([`${NEONS[d.neon].n} underglow`, PRICE.neon(a)]);
    return items;
  }
  function build() {
    el = document.createElement('div'); el.className = 'overlay garage'; el.id = 'garage';
    el.innerHTML = `<div class="gar">
      <div class="gar-head"><div><b id="garName"></b><small id="garSub"></small></div><button class="xbtn" id="garClose" aria-label="Close">✕</button></div>
      <div class="gar-stage" id="garStage"><div class="gar-wall"></div><div class="gar-floor"></div><div class="gar-spot"></div>
        <div class="gar-ring"></div><div class="gar-car" id="garCar"></div>
        <div class="gar-tools"><button id="garNight" title="Night preview">🌙 Night</button><button id="garCmp" title="Hold to compare with what you have now">👁 Compare</button></div>
        <div class="gar-flash" id="garFlash"></div></div>
      <div class="gar-tabs" id="garTabs"><button data-t="kit">🏁<span>Kit</span></button><button data-t="paint">🎨<span>Paint</span></button><button data-t="wrap">🌸<span>Wraps</span></button><button data-t="wheel">🛞<span>Wheels</span></button><button data-t="lights">💡<span>Lights</span></button><button data-t="neon">🌈<span>Neon</span></button></div>
      <div class="gar-opts" id="garOpts"></div>
      <div class="gar-foot"><div class="gar-tot"><small id="garTotLbl">No changes</small><b id="garTot">$0</b></div><button class="btn" id="garReset">Undo</button><button class="btn gold" id="garApply">Apply</button></div>
    </div>`;
    document.body.appendChild(el);
    $g('garClose').onclick = close; el.addEventListener('click', (e) => { if (e.target === el) close(); });
    $g('garTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { G.tab = b.dataset.t; draw(); $g('garOpts').scrollTop = 0; } });
    $g('garOpts').addEventListener('click', onOpt);
    $g('garNight').onclick = () => { G.night = !G.night; renderStage(); };
    const cmpOn = (v) => { G.cmp = v; renderStage(); };
    const cmp = $g('garCmp'); ['pointerdown'].forEach(ev => cmp.addEventListener(ev, (e) => { e.preventDefault(); cmpOn(true); }));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cmp.addEventListener(ev, () => { if (G && G.cmp) cmpOn(false); }));
    $g('garReset').onclick = () => { G.d = norm(G.a.mods); draw(); };
    $g('garApply').onclick = apply;
  }
  function open(a) {
    const key = keyOf(a); if (!key) { if (window.toast) toast('This one cannot be customized.'); return; }
    if (!el) build();
    G = { a, key, d: norm(a.mods), tab: 'kit', night: false, cmp: false };
    $g('garName').textContent = a.n; $g('garSub').textContent = 'Garage · tune it your way';
    $g('garCar').innerHTML = '<div class="gar-load">Loading the garage…</div>'; el.classList.add('open');
    load(key).then(() => { if (G && G.key === key) draw(); }).catch(() => { $g('garCar').innerHTML = '<div class="gar-load">The garage could not load. Try again.</div>'; });
  }
  function close() { if (el) el.classList.remove('open'); G = null; }
  function stageCanvas(m, night) {
    const c = compose(G.key, m, { pad: 0.16, glow: night ? 2.4 : 1, beam: night }); if (c) c.className = 'gar-cv' + (m.neon ? ' pulse' : ''); return c;
  }
  function renderStage(anim) {
    if (!G || !ready(G.key)) return;
    const m = G.cmp ? norm(G.a.mods) : G.d, c = stageCanvas(m, G.night), box = $g('garCar');
    box.innerHTML = ''; if (c) box.appendChild(c); $g('garStage').classList.toggle('night', G.night); $g('garNight').classList.toggle('on', G.night); $g('garCmp').classList.toggle('on', !!G.cmp);
    if (anim) { box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap'); const f = $g('garFlash'); f.className = 'gar-flash'; void f.offsetWidth; f.className = 'gar-flash go'; }
  }
  const tile = (inner, on, data, extra) => `<button class="gt ${on ? 'on' : ''} ${extra || ''}" ${data}>${inner}</button>`;
  function thumb(m, crop) {
    const c = compose(G.key, m, { glow: 0.7 }); if (!c) return '';
    let out = c; if (crop) { const k = document.createElement('canvas'), w = c.width, h = c.height, sx = w * 0.5, sy = h * 0.3, sw = w * 0.5, sh = h * 0.6; k.width = 220; k.height = Math.round(220 * sh / sw); k.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, k.width, k.height); out = k; }
    else { const k = document.createElement('canvas'); k.width = 190; k.height = Math.round(190 * c.height / c.width); k.getContext('2d').drawImage(c, 0, 0, k.width, k.height); out = k; }
    return `<img src="${out.toDataURL('image/webp', 0.88)}" alt="">`;
  }
  const wthumbs = {};
  function wheelThumb(k) {
    if (wthumbs[k]) return wthumbs[k]; if (!WHL) return '';
    const c = document.createElement('canvas'); c.width = c.height = 120; const i = k - 1; c.getContext('2d').drawImage(WHL, (i % 4) * 256, Math.floor(i / 4) * 256, 256, 256, 0, 0, 120, 120); return (wthumbs[k] = c.toDataURL('image/webp', 0.9));
  }
  function draw() {
    if (!G) return; const a = G.a, cur = norm(a.mods), d = G.d, info = (cars[G.key] || {}).info;
    $g('garTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === G.tab));
    const dot = (t, on) => $g('garTabs').querySelector(`[data-t=${t}]`).classList.toggle('dirty', on);
    dot('kit', d.wide !== cur.wide); dot('paint', d.paint !== cur.paint || d.finish !== cur.finish); dot('wrap', d.wrap !== cur.wrap); dot('wheel', d.wheel !== cur.wheel); dot('lights', d.light !== cur.light); dot('neon', d.neon !== cur.neon);
    const box = $g('garOpts'); let h = '';
    if (G.tab === 'kit') {
      if (!info.wide) h = `<div class="gar-note">One-off and bike bodywork cannot take a widebody kit. Try paint, a wrap, wheels or lights instead.</div>`;
      else h = `<div class="gar-grid two">${tile(thumb({ ...d, wide: 0 }) + '<b>Stock</b><small>Factory body</small>', !d.wide, 'data-k="wide" data-v="0"')}${tile(thumb({ ...d, wide: 1 }) + `<b>Widebody</b><small>${cur.wide ? 'Fitted ✓' : fm(PRICE.wide(a))}</small><i class="hot">+Style</i>`, !!d.wide, 'data-k="wide" data-v="1"')}</div><div class="gar-note">Flared arches, splitter, skirts and a wing. Adds value, fame and a big grin.</div>`;
    } else if (G.tab === 'paint') {
      const sw = (p, k) => p.c ? `<i class="sw" style="background:radial-gradient(circle at 32% 28%,#fff9 0 12%,transparent 30%),${hex(p.c)}"></i>` : `<i class="sw stock"></i>`;
      h = `<div class="gar-seg"><button class="${d.finish ? '' : 'on'}" data-k="finish" data-v="0">✨ Gloss</button><button class="${d.finish ? 'on' : ''}" data-k="finish" data-v="1">🌫️ Matte +${fm(PRICE.matte(a))}</button></div><div class="gar-grid paints">` +
        PAINTS.map((p, k) => tile(thumb({ ...d, paint: k }) + `<b>${p.n}</b><small>${k === 0 ? 'Factory' : (cur.paint === k && cur.finish === d.finish ? 'Current ✓' : fm(PRICE.paint(a)))}</small>`, d.paint === k, `data-k="paint" data-v="${k}"`, 'car')).join('') + '</div>';
    } else if (G.tab === 'wrap') {
      h = `<div class="gar-grid paints">` + WRAPS.map((w, k) => tile(thumb({ ...d, wrap: k }) + `<b>${w.n}</b><small>${k === 0 ? 'No wrap' : (cur.wrap === k ? 'Current ✓' : fm(PRICE.wrap(a, k)))}</small>` + (w.jp ? `<i class="jp">${w.jp}</i>` : ''), d.wrap === k, `data-k="wrap" data-v="${k}"`, 'car')).join('') + `</div><div class="gar-note">Full anime itasha wraps with Japanese lettering. A wrap covers your paint; the gloss/matte finish still applies.</div>`;
    } else if (G.tab === 'wheel') {
      if (!(info.wheels && info.wheels.stock)) h = `<div class="gar-note">Bikes keep their stock wheels. Try a paint job or a wrap instead.</div>`;
      else h = `<div class="gar-grid wheels">` + WHEELS.map((w, k) => tile((k ? `<img class="wimg" src="${wheelThumb(k)}" alt="">` : '<i class="wimg stockw">🛞</i>') + `<b>${w.n}</b><small>${k === 0 ? 'Factory' : (cur.wheel === k ? 'Current ✓' : fm(PRICE.wheel(a, k)))}</small>`, d.wheel === k, `data-k="wheel" data-v="${k}"`)).join('') + `</div>`;
    } else if (G.tab === 'neon') {
      h = `<div class="gar-grid paints">` + NEONS.map((n, k) => tile(thumb({ ...d, neon: k }) + `<b>${n.n}</b><small>${k === 0 ? 'No underglow' : (cur.neon === k ? 'Current ✓' : fm(PRICE.neon(a)))}</small>`, d.neon === k, `data-k="neon" data-v="${k}"`, 'car')).join('') + `</div><div class="gar-note">Underglow neons light up the ground beneath the car. Try 🌙 Night.</div>`;
    } else {
      h = `<div class="gar-grid lights">` + LIGHTS.map((l, k) => tile(thumb({ ...d, light: k }, true) + `<b>${l.n}</b><small>${k === 0 ? 'Factory' : (cur.light === k ? 'Current ✓' : fm(PRICE.light(a)))}</small>`, d.light === k, `data-k="light" data-v="${k}"`, 'lamp')).join('') + `</div><div class="gar-note">Tap 🌙 Night above to see the beams.</div>`;
    }
    box.innerHTML = h; renderStage();
    const items = costOf(a, d, cur), tot = items.reduce((s, x) => s + x[1], 0), dirty = d.wide !== cur.wide || d.paint !== cur.paint || d.finish !== cur.finish || d.light !== cur.light || d.wrap !== cur.wrap || d.neon !== cur.neon || d.wheel !== cur.wheel;
    $g('garTot').textContent = fm(tot); $g('garTotLbl').innerHTML = items.length ? items.map(x => `${x[0]} ${fm(x[1])}`).join(' · ') : (dirty ? 'Removing parts is free' : 'No changes');
    $g('garApply').disabled = !dirty || tot > S.cash; $g('garApply').textContent = tot > S.cash ? 'Not enough cash' : (dirty ? (tot ? 'Pay ' + fm(tot) : 'Apply') : 'Apply'); $g('garReset').disabled = !dirty;
  }
  function onOpt(e) {
    const b = e.target.closest('[data-k]'); if (!b || !G) return; const k = b.dataset.k, v = +b.dataset.v;
    if (k === 'wide') G.d.wide = v; else if (k === 'paint') G.d.paint = v; else if (k === 'finish') G.d.finish = v; else if (k === 'light') G.d.light = v; else if (k === 'wrap') G.d.wrap = v; else if (k === 'neon') G.d.neon = v; else if (k === 'wheel') G.d.wheel = v;
    if ((k === 'light' || k === 'neon') && v) G.night = true;
    draw(); renderStage(true);
  }
  function apply() {
    if (!G) return; const a = G.a, cur = norm(a.mods), d = G.d, items = costOf(a, d, cur), tot = items.reduce((s, x) => s + x[1], 0);
    if (S.cash < tot) return;
    S.cash -= tot; const msgs = [];
    if (d.wide && !cur.wide) { a.value += PRICE.wide(a) * 0.6; S.fame += 0.3; S.happy = clamp(S.happy + 3); msgs.push('a widebody kit'); }
    else if (!d.wide && cur.wide) { a.value = Math.max(a.price * 0.2, a.value - PRICE.wide(a) * 0.6); }
    if ((d.paint !== cur.paint || d.finish !== cur.finish) && d.paint > 0) { a.value += PRICE.paint(a) * 0.3; S.happy = clamp(S.happy + 1); msgs.push(`${PAINTS[d.paint].n.toLowerCase()} ${d.finish ? 'matte ' : ''}paint`); }
    if (d.light !== cur.light && d.light > 0) { a.value += PRICE.light(a) * 0.3; msgs.push(`${LIGHTS[d.light].n.toLowerCase()} headlights`); }
    if (d.wrap !== cur.wrap && d.wrap > 0) { a.value += PRICE.wrap(a, d.wrap) * 0.4; S.fame += 0.4; S.happy = clamp(S.happy + 2); msgs.push(`the ${WRAPS[d.wrap].n} anime wrap`); }
    if (d.neon !== cur.neon && d.neon > 0) { a.value += PRICE.neon(a) * 0.3; S.fame += 0.1; msgs.push(`${NEONS[d.neon].n.toLowerCase()} underglow`); }
    if (d.wheel !== cur.wheel && d.wheel > 0) { a.value += PRICE.wheel(a, d.wheel) * 0.4; S.happy = clamp(S.happy + 1); msgs.push(`${WHEELS[d.wheel].n.toLowerCase()} wheels`); }
    a.mods = { ...d };
    if (msgs.length && window.say) say('🔧', `Your ${a.n} got ${msgs.join(', ')}.`, 'gold');
    if (window.toast) toast(msgs.length ? 'Looking good! ' + (tot ? '-' + fm(tot) : '') : 'Saved.');
    S.done.item = true; if (window.save) save(); if (window.refresh) refresh(); if (window.renderFeed) renderFeed();
    draw(); renderStage(true);
  }
  return { open, close, art, hero, load, keyOf, norm, _G: () => G, get tainted() { return tainted; } };
})();
