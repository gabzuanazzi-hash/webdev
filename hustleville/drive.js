/* Hustleville — 3D open-world drive. Free-roam a night/sunset/day city in your yellow Lamborghini (Three.js, loaded on first use).
   No score, no timer: drive, drift, boost, knock over cones, switch cameras and time of day. Leaving hands back a tiny joy-ride summary. */
'use strict';

const Drive = (() => {
  const BLOCK = 44, ROAD = 18, N = 13, STEP = BLOCK + ROAD, CITY = N * STEP + ROAD, HALF = CITY / 2, CURB = 1.5, PZ = 84;
  const rc = (i) => -HALF + ROAD / 2 + i * STEP;                              // centre line of road i (0..N)
  const isPlazaBlock = (i, j) => i >= 5 && i <= 7 && j >= 5 && j <= 7;
  const inPlaza = (x, z) => Math.abs(x) < PZ + 1 && Math.abs(z) < PZ + 1;
  const MAXV = 72, ACC = 36, BRAKE = 64, GEARS = [0, 15, 28, 41, 54, 66, 92];

  /* seeded rng so the city is always the same */
  let seed = 20240607;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rnd = (a, b) => a + rand() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = (a) => a[Math.floor(rand() * a.length)], chance = (p) => rand() < p;
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sm = (e0, e1, v) => { const t = clampv((v - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const dang = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  const $id = (id) => document.getElementById(id);

  const PRESETS = {
    night: { top: 0x03071a, mid: 0x0b1636, hor: 0x2a3d78, fog: 0x172250, fogD: 0.0017, sunC: 0xb9ccff, sunDir: [-0.4, 0.42, -0.8], sunI: 0.5, hemiS: 0x4660b8, hemiG: 0x121830, hemiI: 0.38, win: 1.3, lamp: 1, stars: 1, exp: 1.15, envI: 0.5, cloud: 0x1d2a52, cloudO: 0.4, mtn: 0x0a1230, head: 1 },
    sunset: { top: 0x1f2a68, mid: 0x93467f, hor: 0xff8f4f, fog: 0xc86a78, fogD: 0.0013, sunC: 0xffb169, sunDir: [0.3, 0.12, -0.9], sunI: 1.7, hemiS: 0xffb98a, hemiG: 0x3b2c4d, hemiI: 0.9, win: 0.75, lamp: 0.75, stars: 0.12, exp: 1.12, envI: 0.8, cloud: 0xff9b78, cloudO: 0.6, mtn: 0x3a2450, head: 0.55 },
    day: { top: 0x2c7be0, mid: 0x6cb1f3, hor: 0xcfe6fb, fog: 0xc3dbf2, fogD: 0.0011, sunC: 0xfff1d8, sunDir: [0.3, 0.42, -0.85], sunI: 1.7, hemiS: 0xbfdcff, hemiG: 0x6f7380, hemiI: 0.85, win: 0.04, lamp: 0, stars: 0, exp: 0.9, envI: 0.85, cloud: 0xffffff, cloudO: 0.85, mtn: 0x7e95b0, head: 0 }
  };
  const TOD = ['night', 'sunset', 'day'], TOD_ICON = { night: '🌙', sunset: '🌇', day: '☀️' };
  const CAMS = ['Chase cam', 'Drone cam', 'Hood cam', 'Orbit cam'];
  const NUM = ['fogD', 'sunI', 'hemiI', 'win', 'lamp', 'stars', 'exp', 'envI', 'cloudO', 'head'], COL = ['top', 'mid', 'hor', 'fog', 'sunC', 'hemiS', 'hemiG', 'cloud', 'mtn'];

  let THREE = null, el = null, renderer, scene, camera, sunLight, hemi, skyMat, skyMesh, starPts, cloudMats = [], mtnMat, glowMat, poolMat, lampHeadMat, beaconMat;
  let wallMats = [], envMats = [], envs = {}, P = {}, applied = null, tween = null, todKey = 'night', camMode = 0, camYaw = 0, orbitA = 0, drag = null;
  let carGroup, carBody, glassGroup, wheelSpin = [], wheelSteer = [], tailMat, tailGlow = [], headGlow = [], beam, spot, flames = [], frontPts = [];
  let skidMesh, skidIdx = 0, skidLast = [null, null], smokes = [], npcs = [], cones = [], coneMesh = null, coneDirty = false, mapCtx = null, mapBlocks = [], maxAniso = 4;
  const grid = new Map();
  let orbitR = 9.5, orbitAuto = true, st = null, raf = 0, last = 0, running = false, asset = null, built = false, frame = 0, adaptT = 0, adaptN = 0, pr = 1, tagT = 0;
  const keys = {}, touch = {};

  /* ---------- loading ---------- */
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'assets/vendor/three.min.js';
      s.onload = () => res(window.THREE); s.onerror = () => rej(new Error('3D engine failed to load')); document.head.appendChild(s);
    });
  }

  /* ---------- DOM / input ---------- */
  function buildDom() {
    el = document.createElement('div'); el.id = 'drive'; el.className = 'drive';
    el.innerHTML = `
      <canvas id="dvCanvas"></canvas>
      <div class="dv-vig"></div><div class="dv-streak" id="dvStreak"></div><div class="dv-flash" id="dvFlash"></div>
      <div class="dv-top">
        <div class="dv-map"><canvas id="dvMap" width="240" height="240"></canvas><span>N</span></div>
        <div class="dv-btns">
          <button id="dvCam" title="Camera (C)">📷</button><button id="dvTime" title="Time of day (T)">🌙</button><button id="dvSnd" title="Sound (M)">🔊</button><button id="dvReset" title="Reset car (R)">↺</button><button class="dv-exit" id="dvExit">✕ Exit</button>
        </div>
      </div>
      <div class="dv-dash">
        <div class="dv-speed"><b id="dvSpeed">0</b><small>km/h</small></div>
        <div class="dv-gear" id="dvGear">N</div>
        <div class="dv-rpm"><i id="dvRpm"></i></div>
        <div class="dv-boost"><i id="dvBoost"></i><span>NITRO</span></div>
      </div>
      <div class="dv-tag" id="dvTag"></div>
      <div class="dv-help" id="dvHelp">W/S gas &amp; brake · A/D steer · Shift nitro · Space drift · C camera · T time of day · H horn · R reset</div>
      <div class="dv-pad">
        <div class="dv-lr"><button data-k="left">◀</button><button data-k="right">▶</button></div>
        <div class="dv-bt"><button data-k="hand" class="h">✋</button><button data-k="boost" class="b">⚡</button><button data-k="brake">⏹</button><button data-k="gas" class="g">GAS</button></div>
      </div>
      <div class="dv-load" id="dvLoad"><b>Building the city…</b><i></i></div>`;
    document.body.appendChild(el);
    if (window.matchMedia && matchMedia('(hover: none)').matches) $id('dvHelp').textContent = 'Hold GAS · ◀ ▶ steer · ⚡ nitro · ✋ drift · 📷 camera · 🌙 time of day';
    $id('dvExit').onclick = () => close();
    $id('dvCam').onclick = () => cycleCam();
    $id('dvTime').onclick = () => cycleTime();
    $id('dvSnd').onclick = () => toggleMute();
    $id('dvReset').onclick = () => resetCar();
    el.querySelectorAll('.dv-pad button').forEach(b => {
      const k = b.dataset.k, on = (e) => { e.preventDefault(); touch[k] = true; b.classList.add('on'); }, off = () => { touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    const cv = $id('dvCanvas');
    cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, a: orbitA }; });
    window.addEventListener('pointermove', (e) => { if (drag && camMode === 3) orbitA = drag.a - (e.clientX - drag.x) * 0.012; });
    window.addEventListener('pointerup', () => { drag = null; });
    window.addEventListener('keydown', (e) => {
      if (!running) return; keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        if (e.code === 'KeyC') cycleCam(); else if (e.code === 'KeyT') cycleTime(); else if (e.code === 'KeyM') toggleMute(); else if (e.code === 'KeyR') resetCar(); else if (e.code === 'KeyH') horn(true); else if (e.code === 'Escape') close();
      }
      const h = $id('dvHelp'); if (h && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) setTimeout(() => h.classList.add('gone'), 4000);
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyH') horn(false); });
    window.addEventListener('resize', fit);
  }
  const fit = () => { if (!renderer || !el) return; const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  function tag(t) { const e = $id('dvTag'); if (!e) return; e.textContent = t; e.classList.remove('show'); void e.offsetWidth; e.classList.add('show'); }

  /* ---------- procedural textures ---------- */
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function mkTex(c, rep) { const t = new THREE.CanvasTexture(c); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = maxAniso; return t; }
  const LIT = ['#ffd98a', '#ffe9b8', '#ffc66e', '#fff3d6', '#bfe0ff', '#ffb870'];
  function facade(style) {
    const S = 256, K = 4, Pn = S / K, d = mkCanvas(S, S), e = mkCanvas(S, S), g = d.getContext('2d'), h = e.getContext('2d');
    g.fillStyle = { glass: '#6a7c99', office: '#b3b0a8', apart: '#a58472' }[style]; g.fillRect(0, 0, S, S); h.fillStyle = '#000'; h.fillRect(0, 0, S, S);
    for (let r = 0; r < K; r++) for (let c = 0; c < K; c++) {
      const x = c * Pn, y = r * Pn, lit = rand() < (style === 'apart' ? 0.5 : style === 'glass' ? 0.4 : 0.46);
      let px, py, pw, ph;
      if (style === 'glass') { px = x + 2; py = y + 3; pw = Pn - 4; ph = Pn - 6; } else if (style === 'office') { px = x + 6; py = y + 11; pw = Pn - 12; ph = Pn - 24; } else { px = x + 17; py = y + 10; pw = Pn - 34; ph = Pn - 22; }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      const gr = g.createLinearGradient(0, py, 0, py + ph);
      if (lit) { gr.addColorStop(0, '#8d7d57'); gr.addColorStop(1, '#a89260'); } else { gr.addColorStop(0, style === 'glass' ? '#2b4768' : '#22344f'); gr.addColorStop(1, '#0f1a2c'); }
      g.fillStyle = gr; g.fillRect(px, py, pw, ph);
      if (!lit) { g.fillStyle = 'rgba(170,205,255,.15)'; g.beginPath(); g.moveTo(px, py + ph); g.lineTo(px + pw * 0.55, py); g.lineTo(px + pw * 0.8, py); g.lineTo(px + pw * 0.25, py + ph); g.fill(); }
      if (style === 'apart') { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(px - 5, py + ph + 2, pw + 10, 3); }
      else { g.fillStyle = 'rgba(16,24,40,.6)'; g.fillRect(px + pw / 2 - 1, py, 2, ph); }
      if (lit) { h.globalAlpha = rnd(0.7, 1); h.fillStyle = pick(LIT); h.fillRect(px, py, pw, ph); h.globalAlpha = 1; }
    }
    return { map: mkTex(d, true), emi: mkTex(e, true) };
  }
  function asphaltTex() {
    const S = 512, c = mkCanvas(S, S), g = c.getContext('2d'); g.fillStyle = '#2d3039'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 5200; k++) { const v = Math.floor(rnd(30, 75)); g.fillStyle = `rgba(${v},${v + 2},${v + 8},${rnd(0.15, 0.5)})`; g.fillRect(rnd(0, S), rnd(0, S), rnd(1, 3), rnd(1, 3)); }
    g.strokeStyle = 'rgba(10,12,18,.45)'; g.lineWidth = 1.3; for (let k = 0; k < 7; k++) { g.beginPath(); let x = rnd(0, S), y = rnd(0, S); g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += rnd(-30, 30); y += rnd(-30, 30); g.lineTo(x, y); } g.stroke(); }
    const t = mkTex(c, true); t.repeat.set((CITY + 200) / 14, (CITY + 200) / 14); return t;
  }
  function radialTex(stops, size) {
    const S = size || 128, c = mkCanvas(S, S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, S, S); return mkTex(c);
  }
  function cloudTex() {
    const c = mkCanvas(256, 128), g = c.getContext('2d');
    for (let k = 0; k < 16; k++) { const x = rnd(50, 206), y = rnd(46, 86), r = rnd(22, 46), gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }
    return mkTex(c);
  }
  function beamTex() {
    const c = mkCanvas(64, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,240,200,.95)'); gr.addColorStop(0.35, 'rgba(255,235,190,.35)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in'; const m = g.createLinearGradient(0, 0, 64, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, 64, 256); return mkTex(c);
  }
  function textTex(lines, w, h, bg) {
    const c = mkCanvas(w, h), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffd400'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(l => { g.font = l.font; g.fillStyle = l.color; g.shadowColor = l.glow || 'transparent'; g.shadowBlur = l.glow ? 18 : 0; g.fillText(l.t, w / 2, l.y); });
    return mkTex(c);
  }

  /* ---------- merged-geometry helpers ---------- */
  const GB = () => ({ p: [], n: [], u: [], c: [], i: [] });
  function quadV(g, a, b, c, d, nrm, uvs, col) {
    const o = g.p.length / 3;
    [a, b, c, d].forEach((v, k) => { g.p.push(v[0], v[1], v[2]); g.n.push(nrm[0], nrm[1], nrm[2]); g.u.push(uvs[k][0], uvs[k][1]); g.c.push(col[0], col[1], col[2]); });
    g.i.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  function toGeo(g) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.u, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(g.c, 3));
    geo.setIndex(g.p.length / 3 > 65000 ? new THREE.BufferAttribute(new Uint32Array(g.i), 1) : g.i); geo.computeBoundingSphere(); return geo;
  }
  function plainBox(g, cx, cy, cz, w, h, d, col) {                    // five visible faces, flat colour
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2, z = [[0, 0], [1, 0], [1, 1], [0, 1]];
    quadV(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], z, col); quadV(g, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], z, col);
    quadV(g, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], z, col); quadV(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], z, col);
    quadV(g, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], z, col);
  }
  function flatQuad(g, cx, cz, len, wid, ang, y, col) {               // len along heading `ang` (0 = +x), lying on the ground
    const c = Math.cos(ang), s = Math.sin(ang), hl = len / 2, hw = wid / 2, pt = (a, b) => [cx + a * c - b * s, y, cz + a * s + b * c];
    quadV(g, pt(-hl, hw), pt(hl, hw), pt(hl, -hw), pt(-hl, -hw), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], col);
  }
  function mergeInto(g, geo, mat, col) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, o = g.p.length / 3, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(mat);
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(mat); g.p.push(v.x, v.y, v.z); v.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); g.n.push(v.x, v.y, v.z);
      g.u.push(uv ? uv.getX(k) : 0, uv ? uv.getY(k) : 0); g.c.push(col[0], col[1], col[2]);
    }
    if (geo.index) for (let k = 0; k < geo.index.count; k++) g.i.push(o + geo.index.getX(k)); else for (let k = 0; k < pos.count; k++) g.i.push(o + k);
  }
  const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => { const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)), new THREE.Vector3(sx || 1, sy || 1, sz || 1)); return m; };

  /* ---------- collision grid ---------- */
  const CELL = 40, gk = (a, b) => a * 4096 + b;
  function addCollider(minx, maxx, minz, maxz) {
    const c = { minx, maxx, minz, maxz };
    for (let a = Math.floor((minx + HALF + 20) / CELL); a <= Math.floor((maxx + HALF + 20) / CELL); a++) for (let b = Math.floor((minz + HALF + 20) / CELL); b <= Math.floor((maxz + HALF + 20) / CELL); b++) { const k = gk(a, b); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); }
  }
  function nearColliders(x, z) { const a = Math.floor((x + HALF + 20) / CELL), b = Math.floor((z + HALF + 20) / CELL), out = []; for (let i = a - 1; i <= a + 1; i++) for (let j = b - 1; j <= b + 1; j++) { const l = grid.get(gk(i, j)); if (l) for (const c of l) if (!out.includes(c)) out.push(c); } return out; }

  /* ---------- sedan model for traffic & parked cars ---------- */
  function buildSedanGeo() {
    const sh = new THREE.Shape(); [[2.2, 0.32], [2.2, 0.86], [1.55, 0.98], [0.85, 1.4], [-0.55, 1.4], [-1.25, 0.98], [-2.2, 0.84], [-2.26, 0.5], [-2.0, 0.32]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.08, bevelSegments: 1 }); geo.translate(0, 0, -0.8); geo.rotateY(Math.PI / 2); geo.computeVertexNormals();
    const pos = geo.attributes.position, cols = [];
    for (let k = 0; k < pos.count; k++) { const y = pos.getY(k); cols.push(...(y > 0.99 ? [0.1, 0.13, 0.19] : y < 0.34 ? [0.05, 0.05, 0.06] : [1, 1, 1])); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const g = GB(); mergeInto(g, geo, new THREE.Matrix4(), [1, 1, 1]);
    // vertex colours were authored above — rebuild them in the merged buffer
    g.c = cols.slice();
    const wg = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12); wg.rotateZ(Math.PI / 2);
    [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]].forEach(([x, z]) => mergeInto(g, wg, M4(x, 0.38, z), [0.04, 0.04, 0.05]));
    return toGeo(g);
  }
  function buildLightGeo() {
    const g = GB(), hb = new THREE.BoxGeometry(0.46, 0.14, 0.08), tb = new THREE.BoxGeometry(0.55, 0.12, 0.08);
    [-0.58, 0.58].forEach(x => { mergeInto(g, hb, M4(x, 0.62, 2.27), [1, 0.96, 0.82]); mergeInto(g, tb, M4(x, 0.78, -2.3), [1, 0.1, 0.1]); });
    return toGeo(g);
  }

  /* ---------- world ---------- */
  function initPresets() {
    Object.keys(PRESETS).forEach(k => { const p = PRESETS[k], o = {}; NUM.forEach(n => { o[n] = p[n]; }); COL.forEach(n => { o[n] = new THREE.Color(p[n]); }); o.sunDir = new THREE.Vector3(...p.sunDir).normalize(); P[k] = o; });
  }
  function blend(a, b, t) {
    const o = {}; NUM.forEach(k => { o[k] = lerp(a[k], b[k], t); }); COL.forEach(k => { o[k] = a[k].clone().lerp(b[k], t); }); o.sunDir = a.sunDir.clone().lerp(b.sunDir, t).normalize(); return o;
  }
  function applyState(s) {
    const u = skyMat.uniforms; u.top.value.copy(s.top); u.mid.value.copy(s.mid); u.hor.value.copy(s.hor); u.sunC.value.copy(s.sunC); u.sunDir.value.copy(s.sunDir);
    scene.fog.color.copy(s.fog); scene.fog.density = s.fogD; renderer.setClearColor(s.fog);
    sunLight.color.copy(s.sunC); sunLight.intensity = s.sunI; hemi.color.copy(s.hemiS); hemi.groundColor.copy(s.hemiG); hemi.intensity = s.hemiI; renderer.toneMappingExposure = s.exp;
    wallMats.forEach(m => { m.emissiveIntensity = s.win; });
    lampHeadMat.color.setRGB(0.25, 0.25, 0.28).lerp(new THREE.Color(1, 0.88, 0.62), s.lamp); glowMat.opacity = 0.9 * s.lamp; poolMat.opacity = 0.5 * s.lamp; starPts.material.opacity = s.stars; beaconMat.opacity = 0.35 + 0.65 * Math.min(1, s.lamp + 0.3);
    cloudMats.forEach(m => { m.color.copy(s.cloud); m.opacity = s.cloudO; }); mtnMat.color.copy(s.mtn);
    spot.intensity = 1.9 * s.head; beam.material.opacity = 0.5 * s.head; headGlow.forEach(m => { m.material.opacity = 0.12 + 0.5 * s.head; });
    envMats.forEach(e => { e.m.envMapIntensity = e.k * s.envI; });
    applied = s;
  }
  function setTime(key, instant) {
    todKey = key; const ic = $id('dvTime'); if (ic) ic.textContent = TOD_ICON[key];
    if (instant || !applied) { applyState(P[key]); if (envs[key]) scene.environment = envs[key]; tween = null; }
    else tween = { from: applied, to: P[key], t: 0, env: false };
  }
  function cycleTime() { const k = TOD[(TOD.indexOf(todKey) + 1) % TOD.length]; setTime(k); tag({ night: 'Night', sunset: 'Sunset', day: 'Daytime' }[k]); }
  function cycleCam() { camMode = (camMode + 1) % CAMS.length; glassGroup.visible = camMode !== 2; if (camMode === 3) orbitA = camYaw + Math.PI; tag(CAMS[camMode]); }

  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunC: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 top, mid, hor, sunC, sunDir;
        void main(){ vec3 d = normalize(vP); float h = clamp(d.y, -0.3, 1.0);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.3, h)); c = mix(c, top, smoothstep(0.2, 0.95, h)); c = mix(c, hor * 0.5, 1.0 - smoothstep(-0.3, 0.0, d.y));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunC * (pow(s, 5.0) * 0.14 + pow(s, 40.0) * 0.38 + smoothstep(0.9988, 0.9994, s) * 2.2);
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), skyMat); skyMesh.frustumCulled = false; skyMesh.renderOrder = -10; scene.add(skyMesh);
    const sp = [], R = 1800; for (let k = 0; k < 900; k++) { const a = rand() * Math.PI * 2, e = Math.asin(rnd(0.04, 1)), r = Math.cos(e) * R; sp.push(Math.cos(a) * r, Math.sin(e) * R, Math.sin(a) * r); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    starPts = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, color: 0xdfe8ff, transparent: true, opacity: 1, fog: false, depthWrite: false })); starPts.frustumCulled = false; starPts.renderOrder = -9; scene.add(starPts);
    const ct = cloudTex();
    for (let k = 0; k < 26; k++) {
      const m = new THREE.SpriteMaterial({ map: ct, transparent: true, depthWrite: false, fog: false, opacity: 0.6 }), s = new THREE.Sprite(m), a = rand() * Math.PI * 2, r = rnd(500, 1500);
      s.position.set(Math.cos(a) * r, rnd(170, 420), Math.sin(a) * r); s.scale.set(rnd(280, 560), rnd(90, 170), 1); scene.add(s); cloudMats.push(m);
    }
    mtnMat = new THREE.MeshBasicMaterial({ color: 0x223, fog: false });
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * Math.PI * 2 + rnd(-0.08, 0.08), r = rnd(1250, 1550), h = rnd(110, 300), m = new THREE.Mesh(new THREE.ConeGeometry(rnd(130, 280), h, ri(5, 7)), mtnMat);
      m.position.set(Math.cos(a) * r, h / 2 - 12, Math.sin(a) * r); m.rotation.y = rand() * 3; scene.add(m);
    }
  }

  function skyEnvTex(p) {                                                                  // equirect sky painted on a canvas (robust everywhere, unlike a shader inside PMREM)
    const W = 512, H = 256, c = mkCanvas(W, H), g = c.getContext('2d'), css = (col, k) => { const q = col.clone().multiplyScalar(k || 1); return '#' + q.getHexString(); };
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, css(p.top)); gr.addColorStop(0.18, css(p.top)); gr.addColorStop(0.34, css(p.mid)); gr.addColorStop(0.5, css(p.hor)); gr.addColorStop(0.505, css(p.hor, 0.5)); gr.addColorStop(1, css(p.hor, 0.25));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const d = p.sunDir, th = Math.acos(d.y), ph = Math.atan2(d.z, -d.x), sx = ((ph / (Math.PI * 2)) % 1 + 1) % 1 * W, sy = th / Math.PI * H; g.globalCompositeOperation = 'lighter';
    for (const dx of [-W, 0, W]) { const rg = g.createRadialGradient(sx + dx, sy, 0, sx + dx, sy, 46); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.12, css(p.sunC)); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    return new THREE.CanvasTexture(c);
  }
  function makeEnvs() {
    try {
      const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(), dome = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false })); es.add(dome);
      const soft = (x, y, z, w, h, rx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); es.add(m); return m; };
      const boxes = [soft(0, 40, 0, 44, 18, Math.PI / 2, 0), soft(-40, 14, 0, 14, 40, 0, Math.PI / 2), soft(40, 14, 0, 14, 40, 0, Math.PI / 2), soft(0, 16, 46, 44, 14, 0, 0)];
      const tint = { night: [new THREE.Color(1, 0.8, 0.55), 1.3], sunset: [new THREE.Color(1, 0.75, 0.6), 1.5], day: [new THREE.Color(1, 1, 1), 1.7] };
      TOD.forEach(k => { dome.material.map = skyEnvTex(P[k]); dome.material.needsUpdate = true; boxes.forEach(b => b.material.color.copy(tint[k][0]).multiplyScalar(tint[k][1])); envs[k] = pm.fromScene(es, 0, 0.1, 500).texture; });
      pm.dispose();
      // sanity probe: a mirror ball must not render black, otherwise this GPU can't do it and we skip IBL
      const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.1, 50); cam.position.set(0, 0, 3); sc.environment = envs.day;
      sc.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.25 })));
      const rt = new THREE.WebGLRenderTarget(16, 16), old = renderer.getRenderTarget(), px = new Uint8Array(16 * 16 * 4); renderer.setRenderTarget(rt); renderer.render(sc, cam); renderer.readRenderTargetPixels(rt, 0, 0, 16, 16, px); renderer.setRenderTarget(old); rt.dispose();
      const i = (8 * 16 + 8) * 4; if (px[i] + px[i + 1] + px[i + 2] < 12) envs = {};
    } catch (e) { envs = {}; }
  }

  function buildCity() {
    const walls = { glass: GB(), office: GB(), apart: GB() }, roof = GB(), pad = GB(), mark = GB(), lamps = [], beacons = [], trees = [], parked = [];
    const ROOF = [0.2, 0.21, 0.25], YEL = [0.93, 0.78, 0.18], WHT = [0.82, 0.84, 0.88];
    const TINT = { glass: [[0.9, 1, 1.15], [0.8, 0.95, 1.1], [1, 1, 1], [1.1, 0.95, 0.9]], office: [[1, 1, 1], [1.1, 1.05, 0.95], [0.85, 0.9, 1], [0.9, 0.85, 0.8]], apart: [[1, 0.9, 0.85], [0.95, 0.9, 1], [1, 1, 0.9], [0.9, 1, 0.95]] };
    const T = 16;
    function building(style, cx, cz, w, d, y0, y1, ox) {
      const g = walls[style], col = pick(TINT[style]), x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, v0 = y0 / T, v1 = y1 / T;
      quadV(g, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 / T + ox, v0], [x1 / T + ox, v0], [x1 / T + ox, v1], [x0 / T + ox, v1]], col);
      quadV(g, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[x1 / T + ox, v0], [x0 / T + ox, v0], [x0 / T + ox, v1], [x1 / T + ox, v1]], col);
      quadV(g, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[z1 / T + ox, v0], [z0 / T + ox, v0], [z0 / T + ox, v1], [z1 / T + ox, v1]], col);
      quadV(g, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 / T + ox, v0], [z1 / T + ox, v0], [z1 / T + ox, v1], [z0 / T + ox, v1]], col);
      quadV(roof, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], ROOF);
    }
    function rooftop(cx, cz, w, d, y, tall) {
      for (let k = 0, n = ri(1, 3); k < n; k++) { const bw = rnd(2, 5), bd = rnd(2, 4), bh = rnd(1, 2.6); plainBox(roof, cx + rnd(-w / 2 + bw / 2 + 0.6, w / 2 - bw / 2 - 0.6), y + bh / 2, cz + rnd(-d / 2 + bd / 2 + 0.6, d / 2 - bd / 2 - 0.6), bw, bh, bd, [0.3, 0.32, 0.36]); }
      if (tall) { const ah = rnd(10, 22); plainBox(roof, cx, y + ah / 2, cz, 0.45, ah, 0.45, [0.5, 0.5, 0.55]); beacons.push(cx, y + ah + 0.4, cz); }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = rc(i) + ROAD / 2, z0 = rc(j) + ROAD / 2, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
      if (isPlazaBlock(i, j)) continue;
      const landmark = i === 6 && j === 2, isPark = !landmark && (chance(0.08) || (i === 3 && j === 9) || (i === 10 && j === 4));
      plainBox(pad, cx, 0.06, cz, BLOCK + 2 * CURB, 0.12, BLOCK + 2 * CURB, isPark ? [0.1, 0.27, 0.15] : [0.46, 0.47, 0.51]);
      mapBlocks.push({ x: x0, z: z0, w: BLOCK, park: isPark, mark: landmark });
      if (isPark) { for (let t = 0; t < 14; t++) trees.push(cx + rnd(-19, 19), cz + rnd(-19, 19), rnd(1.1, 1.7)); continue; }
      if (landmark) {
        const w = 30, d = 30; building('glass', cx, cz, w, d, 0.12, 150, 0.3); building('glass', cx, cz, w * 0.72, d * 0.72, 150, 205, 0.1); building('glass', cx, cz, w * 0.42, d * 0.42, 205, 240, 0.6);
        plainBox(roof, cx, 258, cz, 0.7, 36, 0.7, [0.7, 0.72, 0.78]); beacons.push(cx, 277, cz); addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2); continue;
      }
      const dist = Math.hypot(i - 6, j - 6) / 8.5, core = Math.max(0, 1 - dist), lots = pick([[1, 1], [2, 1], [1, 2], [2, 2], [2, 2], [3, 2], [2, 3]]);
      const lw = (BLOCK - 4) / lots[0], ld = (BLOCK - 4) / lots[1];
      for (let a = 0; a < lots[0]; a++) for (let b = 0; b < lots[1]; b++) {
        const w = lw - rnd(1.2, 3.2), d = ld - rnd(1.2, 3.2), px = x0 + 2 + lw * (a + 0.5), pz = z0 + 2 + ld * (b + 0.5);
        const h = rnd(9, 22) + Math.pow(core, 1.5) * rnd(30, 150) * (lots[0] * lots[1] <= 2 ? 1.2 : 0.8), style = h > 75 ? 'glass' : h > 35 ? pick(['glass', 'office', 'office']) : pick(['apart', 'apart', 'office']), ox = rand();
        building(style, px, pz, w, d, 0.12, h, ox); let top = h, tw = w, td = d;
        if (h > 48) { tw = w * 0.72; td = d * 0.72; building(style, px, pz, tw, td, h, h * 1.26, ox + 0.3); top = h * 1.26; }
        if (h > 100) { tw *= 0.6; td *= 0.6; building(style, px, pz, tw, td, top, top + h * 0.2, ox + 0.6); top += h * 0.2; }
        rooftop(px, pz, tw, td, top, h > 55); addCollider(px - w / 2, px + w / 2, pz - d / 2, pz + d / 2);
      }
      for (let side = 0; side < 4; side++) for (let k = 0; k < 5; k++) {                       // sidewalk trees
        if (!chance(0.42)) continue; const t = 6 + k * 8, tx = side < 2 ? x0 + t : (side === 2 ? x0 + 0.4 : x0 + BLOCK - 0.4), tz = side < 2 ? (side === 0 ? z0 + 0.4 : z0 + BLOCK - 0.4) : z0 + t; trees.push(tx, tz, rnd(0.9, 1.3));
      }
    }
    // plaza: wide concrete slab, painted rings, billboards
    plainBox(pad, 0, 0.02, 0, PZ * 2, 0.04, PZ * 2, [0.24, 0.25, 0.29]);
    const ring = (r, segs, len, wid, dash) => { for (let k = 0; k < segs; k++) { if (dash && k % 2) continue; const a = (k / segs) * Math.PI * 2; flatQuad(mark, Math.cos(a) * r, Math.sin(a) * r, len, wid, a + Math.PI / 2, 0.065, WHT); } };
    ring(30, 80, 2.4, 0.5, false); ring(31.2, 80, 2.4, 0.5, false); ring(16, 48, 2.0, 0.4, true);
    for (let k = 0; k < 9; k++) { flatQuad(mark, -70, -70 + k * 17.5, 14, 0.4, 0, 0.065, WHT); flatQuad(mark, 70, -70 + k * 17.5, 14, 0.4, 0, 0.065, WHT); }
    // road markings
    for (let k = 0; k <= N; k++) for (let i = 0; i < N; i++) {
      const mid = rc(i) + ROAD / 2 + BLOCK / 2;
      for (const dir of [0, 1]) {                                                    // 0: road runs along x, 1: along z
        const cx = dir ? rc(k) : mid, cz = dir ? mid : rc(k); if (inPlaza(cx, cz)) continue; const ang = dir ? Math.PI / 2 : 0, nx = dir ? 1 : 0, nz = dir ? 0 : 1;
        for (const s of [-0.2, 0.2]) flatQuad(mark, cx + nx * s, cz + nz * s, BLOCK - 3, 0.14, ang, 0.03, YEL);   // double yellow
        for (const s of [-5, 5]) flatQuad(mark, cx + nx * s, cz + nz * s, BLOCK - 3, 0.12, ang, 0.03, WHT);       // parking edge lines
      }
    }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {                       // crosswalks at every intersection arm
      const x = rc(i), z = rc(j); if (inPlaza(x, z)) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ax = x + dx * (ROAD / 2 + 1.6), az = z + dz * (ROAD / 2 + 1.6); if (Math.abs(ax) > HALF - 3 || Math.abs(az) > HALF - 3) continue;
        for (let m = -3; m <= 3; m++) flatQuad(mark, ax + (dz ? m * 1.5 : 0), az + (dx ? m * 1.5 : 0), 3.2, 0.75, dx ? 0 : Math.PI / 2, 0.03, WHT);
      }
      // street lamps at the four corners of the junction
      for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const lx = x + sx * (ROAD / 2 + 0.3), lz = z + sz * (ROAD / 2 + 0.3); if (inPlaza(lx, lz) || Math.abs(lx) > HALF + 2 || Math.abs(lz) > HALF + 2) continue; lamps.push([lx, lz, lx - sx * 1.1, lz - sz * 1.1]); }
    }
    for (let k = 0; k <= N; k++) for (let i = 0; i < N; i++) {                         // mid-block lamps + parked cars
      const mid = rc(i) + ROAD / 2 + BLOCK / 2;
      for (const s of [-1, 1]) {
        if (!inPlaza(mid, rc(k) + s * 8)) lamps.push([mid, rc(k) + s * (ROAD / 2 + 0.3), mid, rc(k) + s * (ROAD / 2 - 0.9)]);
        if (!inPlaza(rc(k) + s * 8, mid)) lamps.push([rc(k) + s * (ROAD / 2 + 0.3), mid, rc(k) + s * (ROAD / 2 - 0.9), mid]);
        for (let m = 0; m < 5; m++) {
          const t = rc(i) + ROAD / 2 + 8 + m * 7;
          if (chance(0.14) && !inPlaza(t, rc(k) + s * 6.4)) { parked.push([t, rc(k) + s * 6.4, Math.PI / 2 * (s > 0 ? 1 : 3) + (chance(0.5) ? Math.PI : 0)]); addCollider(t - 2.2, t + 2.2, rc(k) + s * 6.4 - 0.95, rc(k) + s * 6.4 + 0.95); }
          if (chance(0.14) && !inPlaza(rc(k) + s * 6.4, t)) { parked.push([rc(k) + s * 6.4, t, (s > 0 ? 0 : Math.PI) + (chance(0.5) ? Math.PI : 0)]); addCollider(rc(k) + s * 6.4 - 0.95, rc(k) + s * 6.4 + 0.95, t - 2.2, t + 2.2); }
        }
      }
    }
    for (const gx of [-63, -21, 21, 63]) for (const gz of [-63, -21, 21, 63]) lamps.push([gx, gz, gx, gz]);     // plaza floodlights
    // billboards at the plaza's north edge
    const bb = textTex([{ t: 'HUSTLEVILLE', font: '800 92px "Lilita One", Impact, sans-serif', color: '#ffd400', y: 100, glow: '#ff9a00' }, { t: 'BUSINESS · LIFE · CLICK', font: '600 34px Fredoka, Arial, sans-serif', color: '#e8f0ff', y: 190 }], 640, 256, ['#10204a', '#2a1650']);
    const bmat = new THREE.MeshBasicMaterial({ map: bb });
    for (const bx of [-38, 38]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(34, 13.6), bmat); m.position.set(bx, 19, -PZ + 2); scene.add(m);
      const back = new THREE.Mesh(new THREE.BoxGeometry(35, 14.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness: 0.7 })); back.position.set(bx, 19, -PZ + 1.6); back.castShadow = true; scene.add(back);
      for (const px of [-12, 12]) plainBox(roof, bx + px, 6, -PZ + 1.6, 0.8, 12, 0.8, [0.2, 0.21, 0.25]);
      addCollider(bx - 13, bx + 13, -PZ + 1, -PZ + 2.4);
    }
    // meshes ----------------------------------------------------------------
    const mats = {}, aniso = maxAniso;
    ['glass', 'office', 'apart'].forEach(style => {
      const f = facade(style), m = new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emi, emissive: 0xffffff, emissiveIntensity: 1, vertexColors: true, roughness: style === 'glass' ? 0.4 : 0.85, metalness: style === 'glass' ? 0.25 : 0.04, envMapIntensity: 0.5 });
      mats[style] = m; wallMats.push(m); envMats.push({ m, k: style === 'glass' ? 0.9 : 0.35 });
      const mesh = new THREE.Mesh(toGeo(walls[style]), m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
    });
    const std = (g, rough, k) => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0.02, envMapIntensity: k }); envMats.push({ m, k }); const mesh = new THREE.Mesh(toGeo(g), m); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); return mesh; };
    std(roof, 0.9, 0.2); std(pad, 0.95, 0.15); const mk = std(mark, 0.7, 0.3); mk.castShadow = false; mk.material.polygonOffset = true; mk.material.polygonOffsetFactor = -3;
    // asphalt
    const am = new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.58, metalness: 0.02, envMapIntensity: 0.8 }); envMats.push({ m: am, k: 0.8 }); am.map.anisotropy = aniso;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY + 200, CITY + 200), am); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), new THREE.MeshLambertMaterial({ color: 0x1d2a2a })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.2; scene.add(outer);
    // perimeter barriers (invisible walls get a visible jersey-barrier ring)
    const bar = GB(), E = HALF - 1.6; plainBox(bar, 0, 0.55, -E, CITY - 4, 1.1, 1.2, [0.55, 0.56, 0.6]); plainBox(bar, 0, 0.55, E, CITY - 4, 1.1, 1.2, [0.55, 0.56, 0.6]); plainBox(bar, -E, 0.55, 0, 1.2, 1.1, CITY - 4, [0.55, 0.56, 0.6]); plainBox(bar, E, 0.55, 0, 1.2, 1.1, CITY - 4, [0.55, 0.56, 0.6]);
    std(bar, 0.9, 0.2);
    // lamps ---------------------------------------------------------------
    const nL = lamps.length, poleGeo = new THREE.CylinderGeometry(0.13, 0.19, 7.4, 6), armGeo = new THREE.BoxGeometry(0.14, 0.14, 1), headGeo = new THREE.BoxGeometry(0.7, 0.16, 0.45);
    const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; scene.add(m); return m; };
    const poles = inst(poleGeo, new THREE.MeshStandardMaterial({ color: 0x4a5060, roughness: 0.6, metalness: 0.5 }), nL), arms = inst(armGeo, poles.material, nL);
    lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 }); const heads = inst(headGeo, lampHeadMat, nL);
    poles.castShadow = true; const gp = [], pp = []; const poolGeo = new THREE.PlaneGeometry(15, 15); poolGeo.rotateX(-Math.PI / 2);
    poolMat = new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(255,215,150,.85)'], [0.35, 'rgba(255,200,120,.32)'], [1, 'rgba(255,190,110,0)']]), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    poolMat.polygonOffset = true; poolMat.polygonOffsetFactor = -4; const pools = inst(poolGeo, poolMat, nL);
    lamps.forEach((l, k) => {
      const tall = Math.abs(l[0]) < PZ && Math.abs(l[1]) < PZ ? 1.25 : 1, ph = 7.2 * tall, ang = Math.atan2(l[2] - l[0], l[3] - l[1]), dl = Math.hypot(l[2] - l[0], l[3] - l[1]);
      poles.setMatrixAt(k, M4(l[0], ph / 2, l[1], 0, 0, 0, 1, tall, 1)); arms.setMatrixAt(k, M4((l[0] + l[2]) / 2, ph, (l[1] + l[3]) / 2, 0, ang, 0, 1, 1, Math.max(0.1, dl)));
      heads.setMatrixAt(k, M4(l[2], ph - 0.1, l[3], 0, ang, 0)); pools.setMatrixAt(k, M4(l[2], 0.05, l[3]));
      gp.push(l[2], ph - 0.25, l[3]); addCollider(l[0] - 0.25, l[0] + 0.25, l[1] - 0.25, l[1] + 0.25);
    });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    glowMat = new THREE.PointsMaterial({ size: 6.5, map: radialTex([[0, 'rgba(255,235,190,1)'], [0.25, 'rgba(255,210,140,.55)'], [1, 'rgba(255,190,110,0)']]), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const glow = new THREE.Points(gg, glowMat); glow.frustumCulled = false; scene.add(glow);
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(beacons, 3));
    beaconMat = new THREE.PointsMaterial({ size: 9, map: radialTex([[0, 'rgba(255,70,60,1)'], [0.3, 'rgba(255,40,40,.55)'], [1, 'rgba(255,40,40,0)']]), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const bpts = new THREE.Points(bg, beaconMat); bpts.frustumCulled = false; scene.add(bpts);
    // trees ---------------------------------------------------------------
    const nT = trees.length / 3, trunkG = new THREE.CylinderGeometry(0.22, 0.32, 3, 6), leafG = new THREE.IcosahedronGeometry(1.9, 0);
    const trunks = inst(trunkG, new THREE.MeshStandardMaterial({ color: 0x4a3322, roughness: 1 }), nT), leaves = inst(leafG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), nT * 2);
    trunks.castShadow = leaves.castShadow = true; trunks.receiveShadow = leaves.receiveShadow = true; const col = new THREE.Color();
    for (let k = 0; k < nT; k++) {
      const x = trees[k * 3], z = trees[k * 3 + 1], s = trees[k * 3 + 2]; trunks.setMatrixAt(k, M4(x, 1.5 * s, z, 0, 0, 0, s, s, s));
      leaves.setMatrixAt(k * 2, M4(x, 4.2 * s, z, 0, rand() * 3, 0, s, s * 1.1, s)); leaves.setMatrixAt(k * 2 + 1, M4(x + rnd(-0.4, 0.4), 5.6 * s, z + rnd(-0.4, 0.4), 0, rand() * 3, 0, s * 0.7, s * 0.8, s * 0.7));
      col.setHSL(rnd(0.27, 0.36), rnd(0.4, 0.6), rnd(0.2, 0.3)); leaves.setColorAt(k * 2, col); leaves.setColorAt(k * 2 + 1, col);
      addCollider(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
    }
    // parked cars ---------------------------------------------------------
    const sedan = buildSedanGeo(), parkM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.3, envMapIntensity: 1 }); envMats.push({ m: parkM, k: 1 });
    const pc = inst(sedan, parkM, parked.length); pc.castShadow = pc.receiveShadow = true; const cc = [0xd04a4a, 0x3a7bd5, 0xe7e7ea, 0x2f8f5b, 0x9a5fd0, 0xf09a3a, 0x444a58, 0x15171d, 0xb9bcc6];
    parked.forEach((p, k) => { pc.setMatrixAt(k, M4(p[0], 0, p[1], 0, p[2] + (p[2] % Math.PI === 0 ? 0 : 0), 0)); pc.setColorAt(k, col.setHex(pick(cc))); });
    // traffic -------------------------------------------------------------
    const lightGeo = buildLightGeo(), lightMat = new THREE.MeshBasicMaterial({ vertexColors: true }), nm = cc.slice(0, 7).map(c => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, color: c, roughness: 0.4, metalness: 0.3, envMapIntensity: 1 }); envMats.push({ m, k: 1 }); return m; });
    for (let k = 0; k < 26; k++) {
      const g = new THREE.Group(), b = new THREE.Mesh(sedan, pick(nm)), l = new THREE.Mesh(lightGeo, lightMat); b.castShadow = true; g.add(b, l); scene.add(g);
      npcs.push({ mesh: g, axis: 'x', dir: 1, line: 0, c: 0, speed: 0, v: 0, base: 0, yaw: 0 });
    }
    // knock-over cones in the plaza ---------------------------------------
    const cg = new THREE.ConeGeometry(0.42, 1.1, 10); cg.translate(0, 0.55, 0); const cm = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.6, emissive: 0x401800, emissiveIntensity: 0.4 });
    const cp = []; for (let k = 0; k < 14; k++) { cp.push([-60 + k * 8.6, 46], [-60 + k * 8.6, 56]); } for (let k = 0; k < 10; k++) { cp.push([46 + k * 3, -50 + k * 9]); } for (let a = 0; a < 20; a++) { const an = a / 20 * Math.PI * 2; cp.push([Math.cos(an) * 24, Math.sin(an) * 24]); }
    coneMesh = inst(cg, cm, cp.length); coneMesh.castShadow = true; cp.forEach(p => cones.push({ x: p[0], z: p[1], hx: p[0], hz: p[1], vx: 0, vz: 0, yaw: 0, tilt: 0, vt: 0, moving: false }));
    coneDirty = true; updateCones(0);
    // minimap plaza block
    mapBlocks.push({ x: -PZ, z: -PZ, w: PZ * 2, plaza: true });
  }

  function updateCones(dt) {
    let any = false;
    cones.forEach((c, k) => {
      if (c.moving) {
        c.x += c.vx * dt; c.z += c.vz * dt; const f = Math.exp(-2.2 * dt); c.vx *= f; c.vz *= f; c.tilt = Math.min(1.45, c.tilt + c.vt * dt); c.vt *= 0.96; c.yaw += c.vt * 0.2 * dt;
        if (Math.hypot(c.vx, c.vz) < 0.3 && c.tilt >= 1.4) c.moving = false; any = true;
      }
      coneMesh.setMatrixAt(k, M4(c.x, c.tilt > 0.1 ? 0.35 * Math.sin(c.tilt) : 0, c.z, 0, c.yaw, c.tilt * 1, 1, 1, 1));
    });
    if (any || coneDirty) { coneMesh.instanceMatrix.needsUpdate = true; coneDirty = false; }
  }

  /* ---------- the Lamborghini ---------- */
  function buildCar() {
    carGroup = new THREE.Group(); carBody = new THREE.Group(); glassGroup = new THREE.Group(); carGroup.add(carBody); carBody.add(glassGroup);
    const mkStd = (o, k) => { const m = new THREE.MeshStandardMaterial(o); if (k) envMats.push({ m, k }); return m; };
    const paint = new THREE.MeshPhysicalMaterial({ color: 0xffc200, metalness: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x2e2200, envMapIntensity: 1 }); envMats.push({ m: paint, k: 1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1424, metalness: 0.9, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.8, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }); envMats.push({ m: glass, k: 1.8 });
    const black = mkStd({ color: 0x0a0c12, metalness: 0.4, roughness: 0.5 }, 0.8), chrome = mkStd({ color: 0xdfe3ee, metalness: 1, roughness: 0.16 }, 1.4), tire = mkStd({ color: 0x15161b, roughness: 0.85 }, 0.2);
    const rimM = mkStd({ color: 0x9aa0b0, metalness: 0.95, roughness: 0.22 }, 1.3), caliper = mkStd({ color: 0xd8232a, roughness: 0.4 }, 0.5), inter = mkStd({ color: 0x16181e, roughness: 0.8 }, 0.3);
    const archM = new THREE.MeshBasicMaterial({ color: 0x050608, polygonOffset: true, polygonOffsetFactor: -2 });
    // body: side profile extruded across the width, then tapered in plan view to get the wedge
    const sh = new THREE.Shape(); [[2.3, 0.3], [2.38, 0.58], [2.1, 0.84], [1.5, 0.97], [0.8, 1.08], [0.2, 1.17], [-0.25, 1.2], [-1.15, 0.84], [-2.2, 0.57], [-2.36, 0.44], [-2.3, 0.3], [-1.2, 0.27], [1.2, 0.27]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.1, bevelSegments: 2 }); bodyGeo.translate(0, 0, -0.85); bodyGeo.rotateY(Math.PI / 2);
    const tp = (y, z) => (1 - (z > 0 ? sm(0.8, 2.45, z) * 0.4 : sm(1.2, 2.45, -z) * 0.16)) * (1 - Math.max(0, y - 0.7) * 0.2);
    const pos = bodyGeo.attributes.position; for (let k = 0; k < pos.count; k++) pos.setX(k, pos.getX(k) * tp(pos.getY(k), pos.getZ(k)));
    bodyGeo.computeVertexNormals(); const body = new THREE.Mesh(bodyGeo, paint); carBody.add(body);
    const add = (geo, mat, x, y, z, rx, ry, rz, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); (parent || carBody).add(m); return m; };
    // glass: windshield + side windows (flat polygons sitting just outside the body)
    const poly = (pts) => { const g = new THREE.BufferGeometry(), p = []; for (let k = 1; k < pts.length - 1; k++) p.push(...pts[0], ...pts[k], ...pts[k + 1]); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); return g; };
    const hw = (y, z) => 0.95 * tp(y, z);
    glassGroup.add(new THREE.Mesh(poly([[-0.74, 0.93, 1.18], [0.74, 0.93, 1.18], [0.6, 1.27, 0.25], [-0.6, 1.27, 0.25]]), glass));
    const sw = (y, z) => hw(y, z) + 0.012;
    [-1, 1].forEach(s2 => glassGroup.add(new THREE.Mesh(poly(s2 > 0 ? [[sw(0.9, 0.9), 0.9, 0.9], [sw(0.97, -0.85), 0.97, -0.85], [sw(1.06, -0.5), 1.06, -0.5], [sw(1.12, 0.15), 1.12, 0.15]] : [[-sw(0.97, -0.85), 0.97, -0.85], [-sw(0.9, 0.9), 0.9, 0.9], [-sw(1.12, 0.15), 1.12, 0.15], [-sw(1.06, -0.5), 1.06, -0.5]]), glass)));
    // trim, intakes, lights
    add(new THREE.BoxGeometry(1.4, 0.06, 0.32), black, 0, 0.27, 2.28);                                           // splitter
    [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.1, 0.1, 2.2), black, s * 0.93, 0.33, 0));                    // side skirts
    add(new THREE.BoxGeometry(1.0, 0.13, 0.08), black, 0, 0.38, 2.37);                                          // nose intake
    add(new THREE.PlaneGeometry(0.42, 0.34), black, 0, 0.8, 1.72, -Math.PI / 2 + 0.25);                      // hood vent
    [-1, 1].forEach(s => {
      add(new THREE.BoxGeometry(0.04, 0.34, 0.85), black, s * 0.955, 0.62, -1.15);                              // side intakes
      add(new THREE.BoxGeometry(0.16, 0.07, 0.1), paint, s * 1.0, 0.96, 0.84); add(new THREE.BoxGeometry(0.05, 0.08, 0.05), black, s * 0.92, 0.92, 0.82);   // mirrors
      const hl = add(new THREE.BoxGeometry(0.42, 0.07, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.4, 0.59, 2.22, 0, -s * 0.3, s * 0.14); frontPts.push(hl);
      const ex = add(new THREE.CylinderGeometry(0.085, 0.085, 0.26, 14), chrome, s * 0.4, 0.46, -2.42, Math.PI / 2, 0, 0); add(new THREE.CircleGeometry(0.06, 12), black, s * 0.4, 0.46, -2.552, 0, Math.PI, 0);
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.5, 10), new THREE.MeshBasicMaterial({ color: 0xff9a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.set(s * 0.4, 0.46, -3.2); fl.rotation.x = -Math.PI / 2; fl.visible = false; carBody.add(fl); flames.push(fl);
    });
    for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.9, 0.03, 0.05), paint, 0, 1.135 - k * 0.046, -0.98 - k * 0.24, -0.18);   // engine-cover ribs
    add(new THREE.PlaneGeometry(0.9, 1.1), black, 0, 1.03, -1.45, -Math.PI / 2 - 0.18);                   // engine bay
    tailMat = new THREE.MeshBasicMaterial({ color: 0x9a1018 }); add(new THREE.BoxGeometry(1.3, 0.1, 0.05), tailMat, 0, 0.66, -2.42);    // tail light bar
    [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.3, 0.1, 0.05), tailMat, s * 0.5, 0.55, -2.41));
    add(new THREE.BoxGeometry(1.3, 0.2, 0.5), black, 0, 0.32, -2.2);                                          // diffuser
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.13), new THREE.MeshBasicMaterial({ map: textTex([{ t: 'HUSTLE', font: '700 64px Arial, sans-serif', color: '#111', y: 40 }], 200, 80, ['#f5f5f0', '#e4e4dc']) })); pl.position.set(0, 0.42, -2.42); pl.rotation.y = Math.PI; carBody.add(pl);
    // cockpit: dash + steering wheel (visible from the hood cam and through the glass)
    add(new THREE.BoxGeometry(1.5, 0.08, 0.4), inter, 0, 0.72, 0.62); add(new THREE.TorusGeometry(0.11, 0.02, 8, 18), black, 0.38, 0.8, 0.38, -1.15, 0, 0);
    [-0.38, 0.38].forEach(x => add(new THREE.BoxGeometry(0.42, 0.5, 0.18), inter, x, 0.82, -0.55));
    // wheels
    const tireG = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 28), discG = new THREE.CylinderGeometry(0.23, 0.23, 0.03, 18), faceG = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24), spokeG = new THREE.BoxGeometry(0.03, 0.045, 0.52), capG = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10);
    [[1, 1.4, true], [-1, 1.4, true], [1, -1.4, false], [-1, -1.4, false]].forEach(([s, z, front]) => {
      const holder = new THREE.Group(), spin = new THREE.Group(); holder.position.set(s * 0.88, 0.4, z); holder.add(spin);
      const t = new THREE.Mesh(tireG, tire); t.rotation.z = Math.PI / 2; spin.add(t);
      const f = new THREE.Mesh(faceG, rimM); f.rotation.z = Math.PI / 2; f.position.x = s * 0.13; spin.add(f);
      for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(spokeG, chrome); sp.position.x = s * 0.155; sp.rotation.x = k * Math.PI / 5; spin.add(sp); }
      const cap = new THREE.Mesh(capG, black); cap.rotation.z = Math.PI / 2; cap.position.x = s * 0.17; spin.add(cap);
      const dsc = new THREE.Mesh(discG, chrome); dsc.rotation.z = Math.PI / 2; dsc.position.x = s * 0.04; spin.add(dsc);
      add(new THREE.BoxGeometry(0.07, 0.14, 0.12), caliper, s * 0.09, 0.14, 0.15, 0, 0, 0, holder);
      carBody.add(holder); wheelSpin.push(spin); if (front) wheelSteer.push(holder);
      add(new THREE.CircleGeometry(0.49, 24), archM, s * 0.953, 0.4, z, 0, s * Math.PI / 2, 0);
    });
    // lights: spot + ground beam + glows
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.2), new THREE.MeshBasicMaterial({ map: radialTex([[0, 'rgba(0,0,0,.6)'], [0.6, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, fog: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.045; carGroup.add(blob);
    spot = new THREE.SpotLight(0xfff0cc, 3, 140, 0.5, 0.65, 1.2); spot.position.set(0, 0.8, 2.2); spot.target.position.set(0, 0, 30); carGroup.add(spot, spot.target);
    beam = new THREE.Mesh(new THREE.PlaneGeometry(10, 30), new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(0, 0.07, 2.6 + 15); beam.material.polygonOffset = true; beam.material.polygonOffsetFactor = -5; carGroup.add(beam);
    const gt = radialTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]);
    [-0.45, 0.45].forEach(x => {
      const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xfff1c8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); h.scale.set(1.5, 1.5, 1); h.position.set(x, 0.68, 2.5); carBody.add(h); headGlow.push(h);
      const t = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: 0xff2a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.55 })); t.scale.set(1.9, 1.9, 1); t.position.set(x * 1.1, 0.72, -2.55); carBody.add(t); tailGlow.push(t);
    });
    carGroup.traverse(m => { if (m.isMesh && m.material !== archM && !m.geometry.isCircleGeometry) { m.castShadow = m !== glassGroup; } }); carBody.traverse(m => { if (m.isMesh) m.receiveShadow = false; }); body.receiveShadow = true;
    scene.add(carGroup);
  }

  /* ---------- effects ---------- */
  function buildFx() {
    const g = new THREE.PlaneGeometry(0.34, 1.0); g.rotateX(-Math.PI / 2);
    skidMesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, fog: true }), 700); skidMesh.frustumCulled = false;
    const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let k = 0; k < 700; k++) skidMesh.setMatrixAt(k, z); scene.add(skidMesh);
    const stx = radialTex([[0, 'rgba(235,235,240,.7)'], [0.5, 'rgba(210,210,220,.3)'], [1, 'rgba(200,200,210,0)']]);
    for (let k = 0; k < 40; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: stx, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); smokes.push({ s, life: 0, max: 1, vx: 0, vz: 0, vy: 0 }); }
  }
  function skid(x, z, h, side) {
    const l = skidLast[side]; if (l && Math.hypot(x - l[0], z - l[1]) < 0.85) return; skidLast[side] = [x, z];
    skidMesh.setMatrixAt(skidIdx = (skidIdx + 1) % 700, M4(x, 0.045, z, 0, h, 0, 1, 1, 1.2)); skidMesh.instanceMatrix.needsUpdate = true;
  }
  function puff(x, z, big) {
    const p = smokes.find(s => s.life <= 0); if (!p) return; p.life = p.max = rnd(0.7, 1.2); p.vx = Math.random() * 1.6 - 0.8 + st.vx * 0.06; p.vz = Math.random() * 1.6 - 0.8 + st.vz * 0.06; p.vy = 1 + Math.random(); p.s.position.set(x, 0.4, z); p.s.scale.setScalar(big ? 2.4 : 1.6); p.s.visible = true; p.s.material.opacity = 0.5;
  }
  function updateFx(dt) {
    for (const p of smokes) { if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { p.s.visible = false; continue; } const k = 1 - p.life / p.max; p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y += p.vy * dt * 0.6; p.s.scale.setScalar(1.6 + k * 4.2); p.s.material.opacity = 0.5 * (1 - k); }
  }

  /* ---------- audio (all synthesised) ---------- */
  let au = null, muted = false;
  function audioInit() {
    if (au) { if (au.C.state === 'suspended') au.C.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      const C = new AC(), master = C.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(C.destination);
      const filt = C.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 600; filt.Q.value = 1.4; const eg = C.createGain(); eg.gain.value = 0; filt.connect(eg); eg.connect(master);
      const mk = (type, mul) => { const o = C.createOscillator(); o.type = type; o.frequency.value = 40; const g = C.createGain(); g.gain.value = mul; o.connect(g); g.connect(filt); o.start(); return o; };
      const o1 = mk('sawtooth', 0.5), o2 = mk('square', 0.2), o3 = mk('triangle', 0.5);
      const nb = C.createBuffer(1, C.sampleRate, C.sampleRate), d = nb.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      const noise = (freq, q, type) => { const s = C.createBufferSource(); s.buffer = nb; s.loop = true; const f = C.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = C.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { f, g }; };
      au = { C, master, filt, eg, o1, o2, o3, nb, squeal: noise(1400, 6, 'bandpass'), wind: noise(500, 0.5, 'lowpass'), horn: null };
    } catch (e) { au = null; }
  }
  function audioUpdate(rpm, thr, slip, sp) {
    if (!au) return; const t = au.C.currentTime, base = 34 + rpm * 120;
    au.o1.frequency.setTargetAtTime(base, t, 0.03); au.o2.frequency.setTargetAtTime(base * 2.01, t, 0.03); au.o3.frequency.setTargetAtTime(base * 0.5, t, 0.03);
    au.filt.frequency.setTargetAtTime(280 + rpm * 1500 + thr * 700, t, 0.05); au.eg.gain.setTargetAtTime(0.16 + thr * 0.2 + rpm * 0.06, t, 0.05);
    au.squeal.g.gain.setTargetAtTime(clampv(slip - 3, 0, 8) / 8 * 0.16, t, 0.05); au.squeal.f.frequency.setTargetAtTime(1100 + slip * 60, t, 0.1); au.wind.g.gain.setTargetAtTime(Math.min(0.16, sp / 72 * 0.14), t, 0.1);
  }
  function thud(v) {
    if (!au || muted) return; const C = au.C, s = C.createBufferSource(), f = C.createBiquadFilter(), g = C.createGain(); s.buffer = au.nb; f.type = 'lowpass'; f.frequency.value = 260 + v * 8; g.gain.setValueAtTime(clampv(v / 22, 0.15, 0.8), C.currentTime); g.gain.exponentialRampToValueAtTime(0.001, C.currentTime + 0.35);
    s.connect(f); f.connect(g); g.connect(au.master); s.start(); s.stop(C.currentTime + 0.4);
  }
  function horn(on) {
    if (!au) return; if (on && !au.horn) { const C = au.C, g = C.createGain(); g.gain.value = muted ? 0 : 0.12; g.connect(au.master); const a = C.createOscillator(), b = C.createOscillator(); a.type = b.type = 'square'; a.frequency.value = 392; b.frequency.value = 494; a.connect(g); b.connect(g); a.start(); b.start(); au.horn = { a, b, g }; }
    else if (!on && au.horn) { au.horn.a.stop(); au.horn.b.stop(); au.horn = null; }
  }
  function toggleMute() { muted = !muted; const b = $id('dvSnd'); if (b) b.textContent = muted ? '🔇' : '🔊'; if (au) au.master.gain.value = muted ? 0 : 0.5; }

  /* ---------- state ---------- */
  function onSidewalk(x, z) {
    if (inPlaza(x, z) || Math.abs(x) > HALF - 2 || Math.abs(z) > HALF - 2) return false;
    const ux = ((x + HALF - ROAD + CURB) % STEP + STEP) % STEP, uz = ((z + HALF - ROAD + CURB) % STEP + STEP) % STEP; return ux <= BLOCK + 2 * CURB && uz <= BLOCK + 2 * CURB;
  }
  function resetCar() {
    st = { x: 0, z: 70, h: Math.PI, vx: 0, vz: 0, steer: 0, boost: 1, crashes: 0, shake: 0, wheelRot: 0, cool: 0, dist: 0, top: 0, time: 0, rpm: 0.2, gear: 1, pitch: 0, roll: 0, ax: 0, brakeOn: false, sideWalk: false };
    camYaw = st.h; orbitA = camYaw + Math.PI; skidLast = [null, null];
    if (camera) { camera.position.set(st.x - Math.sin(camYaw) * 9, 4, st.z - Math.cos(camYaw) * 9); }
    npcs.forEach(placeNpc); cones.forEach(c => { c.x = c.hx; c.z = c.hz; c.tilt = 0; c.vx = c.vz = 0; c.moving = false; c.yaw = 0; }); coneDirty = true; if (coneMesh) updateCones(0);
    const f = $id('dvFlash'); if (f) f.classList.remove('hit');
  }
  function placeNpc(n) {
    for (let tries = 0; tries < 20; tries++) {
      n.axis = chance(0.5) ? 'x' : 'z'; n.dir = chance(0.5) ? 1 : -1; n.line = ri(0, N); n.c = rnd(-HALF + 30, HALF - 30); n.speed = rnd(9, 17); n.v = n.speed;
      const p = npcPose(n); if (!inPlaza(p.x, p.z)) { n.mesh.position.set(p.x, 0, p.z); n.mesh.rotation.y = p.h; n.yaw = p.h; return; }
    }
  }
  function npcPose(n) {
    const lane = n.dir * 2.6, line = rc(n.line);
    return n.axis === 'x' ? { x: n.c, z: line + lane, h: n.dir > 0 ? Math.PI / 2 : -Math.PI / 2 } : { x: line - lane, z: n.c, h: n.dir > 0 ? 0 : Math.PI };
  }

  /* ---------- physics ---------- */
  function input() {
    const L = keys.ArrowLeft || keys.KeyA || touch.left, R = keys.ArrowRight || keys.KeyD || touch.right;
    return { throttle: (keys.ArrowUp || keys.KeyW || touch.gas) ? 1 : 0, brake: (keys.ArrowDown || keys.KeyS || touch.brake) ? 1 : 0, steer: (R ? 1 : 0) - (L ? 1 : 0), boost: !!(keys.ShiftLeft || keys.ShiftRight || touch.boost), hand: !!(keys.Space || touch.hand) };
  }
  function bump(nx, nz, strength) {
    const vn = st.vx * nx + st.vz * nz; if (vn < 0) { st.vx -= 1.3 * vn * nx; st.vz -= 1.3 * vn * nz; } st.vx *= 0.78; st.vz *= 0.78;
    if (strength > 6 && st.cool <= 0) { st.crashes++; st.cool = 0.5; st.shake = Math.min(0.9, 0.2 + strength / 40); thud(strength); const f = $id('dvFlash'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
  }
  function wheelPos(lx, lz) { return [st.x + lx * Math.cos(st.h) + lz * Math.sin(st.h), st.z - lx * Math.sin(st.h) + lz * Math.cos(st.h)]; }
  function step(dt) {
    const inp = input(), fx = Math.sin(st.h), fz = Math.cos(st.h), rx = -Math.cos(st.h), rz = Math.sin(st.h);
    let fwd = st.vx * fx + st.vz * fz, lat = st.vx * rx + st.vz * rz; const prev = fwd;
    const boosting = inp.boost && st.boost > 0.02 && inp.throttle && fwd > -1;
    st.boost = boosting ? Math.max(0, st.boost - dt * 0.4) : Math.min(1, st.boost + dt * 0.1);
    const maxV = boosting ? MAXV * 1.4 : MAXV, spd = Math.max(0, fwd) / MAXV;
    if (inp.throttle) fwd += (boosting ? ACC * 2.4 : ACC) * dt * (1 - Math.max(0, fwd) / (maxV + 10)) * (fwd < 0 ? 2.4 : 1);
    if (inp.brake) fwd += fwd > 1 ? -BRAKE * dt : -22 * dt;
    fwd -= fwd * 0.2 * dt + Math.sign(fwd) * 1.6 * dt; if (Math.abs(fwd) < 0.35 && !inp.throttle && !inp.brake) fwd = 0;
    if (st.sideWalk) fwd *= Math.exp(-0.45 * dt);
    fwd = clampv(fwd, -18, maxV + 6);
    const grip = inp.hand ? 0.9 : 6.5 - Math.abs(st.steer) * spd * 3.6; lat *= Math.exp(-grip * dt); if (inp.hand) fwd *= Math.exp(-0.25 * dt);
    st.steer += (inp.steer - st.steer) * Math.min(1, dt * 9);
    const sf = Math.min(1, Math.abs(fwd) / 14), rate = 1.9 * sf * (1 - 0.42 * Math.min(1, Math.abs(fwd) / MAXV)) * (inp.hand ? 1.5 : 1);
    st.h -= st.steer * rate * dt * (fwd >= 0 ? 1 : -1);
    const nfx = Math.sin(st.h), nfz = Math.cos(st.h), nrx = -Math.cos(st.h), nrz = Math.sin(st.h);
    st.vx = nfx * fwd + nrx * lat; st.vz = nfz * fwd + nrz * lat; st.x += st.vx * dt; st.z += st.vz * dt;
    // world bounds
    const lim = HALF - 3.4; if (st.x > lim) { st.x = lim; bump(-1, 0, Math.abs(st.vx)); } if (st.x < -lim) { st.x = -lim; bump(1, 0, Math.abs(st.vx)); } if (st.z > lim) { st.z = lim; bump(0, -1, Math.abs(st.vz)); } if (st.z < -lim) { st.z = -lim; bump(0, 1, Math.abs(st.vz)); }
    // buildings, lamps, trees, parked cars: two circles along the car
    for (const off of [1.35, -1.35]) {
      const px = st.x + fx * off, pz = st.z + fz * off, Rr = 1.05;
      for (const b of nearColliders(px, pz)) {
        if (px < b.minx - Rr || px > b.maxx + Rr || pz < b.minz - Rr || pz > b.maxz + Rr) continue;
        const cx = clampv(px, b.minx, b.maxx), cz = clampv(pz, b.minz, b.maxz); let dx = px - cx, dz = pz - cz, d = Math.hypot(dx, dz);
        if (d < Rr) { if (d < 0.001) { dx = px - (b.minx + b.maxx) / 2; dz = pz - (b.minz + b.maxz) / 2; d = Math.hypot(dx, dz) || 1; } const nx = dx / d, nz = dz / d; st.x += nx * (Rr - d); st.z += nz * (Rr - d); bump(nx, nz, Math.abs(st.vx * nx + st.vz * nz)); }
      }
    }
    // traffic
    const queue = npcs.map(n => npcPose(n));
    npcs.forEach((n, k) => {
      const p = queue[k]; let want = n.speed;
      for (let o = 0; o < npcs.length; o++) {                                                      // brake behind whatever is in front (other cars or the player)
        const q = o === k ? { x: st.x, z: st.z } : queue[o], dx = q.x - n.mesh.position.x, dz = q.z - n.mesh.position.z, fwdx = Math.sin(n.yaw), fwdz = Math.cos(n.yaw), ahead = dx * fwdx + dz * fwdz, side = Math.abs(dx * fwdz - dz * fwdx);
        if (o !== k && o < k && ahead > 0 && ahead < 12 && side < 2.4) want = Math.min(want, Math.max(0, (ahead - 5) * 1.6));
        if (o === k && ahead > 0 && ahead < 12 && side < 2.4) want = Math.min(want, Math.max(0, (ahead - 5.5) * 1.6));
      }
      n.v += (want - n.v) * Math.min(1, dt * 2.2); n.prev = n.c; n.c += n.dir * n.v * dt;
      for (let q = 0; q <= N; q++) { const pp = rc(q); if ((n.prev < pp) !== (n.c < pp) && chance(0.35)) { n.axis = n.axis === 'x' ? 'z' : 'x'; const old = n.line; n.line = q; n.c = rc(old); n.dir = chance(0.5) ? 1 : -1; break; } }
      if (n.c > HALF - 10 || n.c < -HALF + 10) { n.dir *= -1; n.c = clampv(n.c, -HALF + 10, HALF - 10); }
      const pose = npcPose(n), m = n.mesh, e = Math.min(1, dt * 5); m.position.x += (pose.x - m.position.x) * e; m.position.z += (pose.z - m.position.z) * e; n.yaw += dang(n.yaw, pose.h) * e; m.rotation.y = n.yaw;
      for (const off of [1.35, -1.35]) { const px = st.x + fx * off, pz = st.z + fz * off, dx = px - m.position.x, dz = pz - m.position.z, d = Math.hypot(dx, dz); if (d < 2.8) { const nx = dx / (d || 1), nz = dz / (d || 1); st.x += nx * (2.8 - d) * 0.9; st.z += nz * (2.8 - d) * 0.9; bump(nx, nz, Math.abs(st.vx * nx + st.vz * nz) + 3); n.v *= 0.3; } }
    });
    // cones
    let hit = false;
    for (const c of cones) {
      const dx = c.x - st.x, dz = c.z - st.z, d = Math.hypot(dx, dz); if (d < 3.2 && Math.abs(fwd) > 2 && c.tilt < 1) { const sp = Math.max(4, Math.abs(fwd) * 0.8), nx = dx / (d || 1), nz = dz / (d || 1); c.vx = nx * sp + st.vx * 0.4; c.vz = nz * sp + st.vz * 0.4; c.vt = 5 + Math.random() * 4; c.moving = true; hit = true; }
    }
    if (hit) { coneDirty = true; }
    st.cool -= dt; st.shake = Math.max(0, st.shake - dt * 1.7); st.sideWalk = onSidewalk(st.x, st.z); if (st.sideWalk && Math.abs(fwd) > 6) st.shake = Math.max(st.shake, 0.06);
    st.dist += Math.abs(fwd) * dt; st.time += dt; st.top = Math.max(st.top, Math.abs(fwd) * 4);
    // gearbox
    let g = 1; if (fwd >= 0) { for (g = 1; g < 6 && fwd > GEARS[g]; g++); } const lo = GEARS[g - 1] * 0.7, tr = fwd < -0.5 ? 0.3 : (inp.throttle ? 0.22 : 0.18) + clampv((Math.abs(fwd) - lo) / (GEARS[g] - lo), 0, 1) * 0.76;
    st.rpm += (clampv(tr + (inp.throttle && fwd < 4 ? 0.35 : 0), 0.15, 1) - st.rpm) * Math.min(1, dt * 9); st.gear = fwd < -0.5 ? 'R' : (Math.abs(fwd) < 0.5 && !inp.throttle ? 'N' : g);
    // body dynamics
    st.ax += ((fwd - prev) / dt - st.ax) * Math.min(1, dt * 8); st.pitch += (clampv(-st.ax * 0.0016, -0.05, 0.05) - st.pitch) * Math.min(1, dt * 8); st.roll += (-st.steer * sf * 0.055 - lat * 0.004 - st.roll) * Math.min(1, dt * 7);
    st.braking = inp.brake && fwd > 1; st.lat = lat; st.thr = inp.throttle; st.boosting = boosting; st.fwd = fwd;
    // skid marks & smoke
    const slip = Math.abs(lat), sliding = (slip > 3.2 || (inp.brake && fwd > 24) || (inp.hand && fwd > 8) || (inp.throttle && fwd < 6 && Math.abs(st.steer) > 0.5 && fwd > 1)) && !st.sideWalk;
    if (sliding) { const a = wheelPos(-0.88, -1.4), b = wheelPos(0.88, -1.4); skid(a[0], a[1], st.h, 0); skid(b[0], b[1], st.h, 1); if (frame % 3 === 0) { puff(a[0], a[1], slip > 6); puff(b[0], b[1], slip > 6); } } else { skidLast[0] = skidLast[1] = null; }
    st.slip = sliding ? Math.max(slip, 4) : slip;
    return Math.abs(fwd);
  }

  /* ---------- per-frame visuals ---------- */
  function visuals(dt, sp) {
    carGroup.position.set(st.x, 0, st.z); carGroup.rotation.y = st.h;
    const idle = Math.sin(performance.now() / 55) * 0.0012 * (1 - Math.min(1, sp / 8)) + (st.sideWalk ? Math.sin(performance.now() / 30) * 0.01 * Math.min(1, sp / 20) : 0);
    carBody.rotation.x = st.pitch + idle; carBody.rotation.z = st.roll;
    st.wheelRot += st.fwd * dt / 0.4; wheelSpin.forEach(w => { w.rotation.x = st.wheelRot; }); wheelSteer.forEach(w => { w.rotation.y = -st.steer * 0.5; });
    tailMat.color.setHex(st.braking ? 0xff2a2a : 0x9a1018); tailGlow.forEach(t => { t.material.opacity = st.braking ? 0.95 : 0.4 * (0.3 + 0.7 * applied.head + 0.2); });
    const fl = 0.7 + Math.random() * 0.6; flames.forEach(f => { f.visible = !!st.boosting; f.scale.set(fl * 0.9, fl, fl * 0.9); });
    // sun/moon shadow frustum follows the car
    const sd = applied.sunDir; sunLight.position.set(st.x + sd.x * 220, Math.max(60, sd.y * 220), st.z + sd.z * 220); sunLight.target.position.set(st.x, 0, st.z); sunLight.target.updateMatrixWorld();
    skyMesh.position.copy(camera.position); starPts.position.copy(camera.position);
    // camera
    const fwdx = Math.sin(st.h), fwdz = Math.cos(st.h); camYaw += dang(camYaw, st.h) * Math.min(1, dt * (sp > 3 ? 3.2 : 1.6));
    let fov = 62 + Math.min(1, sp / MAXV) * 14 + (st.boosting ? 9 : 0), tx, ty, tz, lx, ly, lz, k = Math.min(1, dt * 7);
    if (camMode === 0 || camMode === 1) {
      const back = (camMode === 0 ? 8.6 : 16) + sp * 0.05, hgt = (camMode === 0 ? 3.5 : 8.5) + sp * 0.012;
      tx = st.x - Math.sin(camYaw) * back; tz = st.z - Math.cos(camYaw) * back; ty = hgt; lx = st.x + fwdx * 6; ly = 1.3; lz = st.z + fwdz * 6;
      camera.position.x += (tx - camera.position.x) * k; camera.position.z += (tz - camera.position.z) * k; camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 4);
    } else if (camMode === 2) {
      const lx0 = 0.38, ly0 = 1.12, lz0 = 0.02; camera.position.set(st.x + lx0 * Math.cos(st.h) + lz0 * Math.sin(st.h), ly0 + (carBody.rotation.x * -0.3), st.z - lx0 * Math.sin(st.h) + lz0 * Math.cos(st.h));
      lx = camera.position.x + fwdx * 10; lz = camera.position.z + fwdz * 10; ly = 1.0; fov += 12;
    } else {
      if (!drag && orbitAuto) orbitA += dt * 0.35; const R = orbitR; tx = st.x + Math.sin(orbitA) * R; tz = st.z + Math.cos(orbitA) * R; ty = 2.6 + Math.sin(performance.now() / 2600) * 0.5;
      camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 10); camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 10); camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 4); lx = st.x; ly = 0.9; lz = st.z; fov = 55;
    }
    if (st.shake > 0.01 && camMode !== 2) { camera.position.x += (Math.random() - 0.5) * st.shake; camera.position.y += (Math.random() - 0.5) * st.shake * 0.6; }
    camera.lookAt(lx, ly, lz); camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
    $id('dvStreak').style.opacity = st.boosting ? 0.85 : Math.max(0, (sp - 55) / 60);
  }
  let lastSpd = -1, lastGear = '';
  function hud(sp) {
    const kmh = Math.round(sp * 4), gear = String(st.gear); if (kmh !== lastSpd) { $id('dvSpeed').textContent = kmh; lastSpd = kmh; } if (gear !== lastGear) { $id('dvGear').textContent = gear; lastGear = gear; }
    $id('dvRpm').style.width = st.rpm * 100 + '%'; $id('dvRpm').parentNode.classList.toggle('red', st.rpm > 0.92); $id('dvBoost').style.width = st.boost * 100 + '%';
    if (frame % 3 === 0 && mapCtx) drawMap();
  }
  function drawMap() {
    const c = mapCtx, W = 240, s = 0.86; c.clearRect(0, 0, W, W); c.save(); c.beginPath(); c.arc(120, 120, 118, 0, 7); c.clip(); c.fillStyle = '#131a30'; c.fillRect(0, 0, W, W);
    c.translate(120, 120); c.rotate(st.h + Math.PI); c.scale(s, s); c.translate(-st.x, -st.z);
    for (const b of mapBlocks) { if (Math.abs(b.x + b.w / 2 - st.x) > 200 + b.w / 2 || Math.abs(b.z + b.w / 2 - st.z) > 200 + b.w / 2) continue; c.fillStyle = b.mark ? '#7a6420' : b.park ? '#1f4a33' : b.plaza ? '#34405e' : '#2a3558'; c.fillRect(b.x, b.z, b.w, b.w); }
    c.fillStyle = '#9fb3dd'; npcs.forEach(n => { c.beginPath(); c.arc(n.mesh.position.x, n.mesh.position.z, 3.6, 0, 7); c.fill(); });
    c.restore(); c.save(); c.translate(120, 120); c.fillStyle = '#ffd400'; c.strokeStyle = '#3a2a00'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 11); c.lineTo(0, 5); c.lineTo(-10, 11); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  function loop(t) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const raw = (t - last) / 1000 || 0.016, dt = Math.min(0.033, raw); last = t; frame++;
    if (tween) {                                                                                         // time-of-day cross-fade
      tween.t = Math.min(1, tween.t + Math.min(raw, 0.25) / 1.3); const e = tween.t * tween.t * (3 - 2 * tween.t); applyState(blend(tween.from, tween.to, e));
      if (tween.t >= 0.5 && !tween.env) { tween.env = true; if (envs[todKey]) scene.environment = envs[todKey]; } if (tween.t >= 1) tween = null;
    }
    const sp = step(dt); visuals(dt, sp); hud(sp); updateFx(dt); updateCones(dt); audioUpdate(st.rpm, st.thr || 0, st.slip || 0, sp);
    beaconMat.size = 7 + Math.sin(t / 380) * 2;
    renderer.render(scene, camera);
    adaptT += raw; adaptN++; if (adaptN >= 90) { const avg = adaptT / adaptN; if (avg > 0.034 && pr > 0.8) { pr = Math.max(0.8, pr - 0.25); renderer.setPixelRatio(pr); fit(); } adaptT = adaptN = 0; }
  }

  /* ---------- flow ---------- */
  function buildWorld() {
    scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x172250, 0.0017);
    camera = new THREE.PerspectiveCamera(62, 1, 0.3, 3200);
    renderer = new THREE.WebGLRenderer({ canvas: $id('dvCanvas'), antialias: true, powerPreference: 'high-performance' });
    pr = Math.min(window.devicePixelRatio || 1, 1.75); renderer.setPixelRatio(pr); maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    hemi = new THREE.HemisphereLight(0xffffff, 0x333344, 0.8); scene.add(hemi);
    sunLight = new THREE.DirectionalLight(0xffffff, 1); sunLight.castShadow = true; sunLight.shadow.mapSize.set(2048, 2048);
    const sc = sunLight.shadow.camera; sc.left = -75; sc.right = 75; sc.top = 75; sc.bottom = -75; sc.near = 1; sc.far = 600; sunLight.shadow.bias = -0.0006; sunLight.shadow.normalBias = 0.35; scene.add(sunLight, sunLight.target);
    initPresets(); buildSky(); buildCity(); buildCar(); buildFx(); makeEnvs();
    mapCtx = $id('dvMap').getContext('2d'); setTime(todKey, true); built = true;
  }
  function close() {
    if (!running) return; horn(false);
    const res = { crashes: st ? st.crashes : 0, dist: st ? Math.round(st.dist) : 0, top: st ? Math.round(st.top) : 0, time: st ? Math.round(st.time) : 0 };
    running = false; cancelAnimationFrame(raf); el.classList.remove('open'); Object.keys(keys).forEach(k => { keys[k] = false; }); Object.keys(touch).forEach(k => { touch[k] = false; });
    if (au) { au.eg.gain.value = 0; au.squeal.g.gain.value = 0; au.wind.g.gain.value = 0; setTimeout(() => { if (!running && au) au.C.suspend(); }, 300); }
    setTimeout(() => { if (!running) el.style.visibility = 'hidden'; }, 600);
    if (window.driveFinished) window.driveFinished(asset, res);
  }
  async function open(a) {
    asset = a; if (!el) buildDom();
    el.style.visibility = 'visible'; $id('dvLoad').style.display = built ? 'none' : 'grid'; $id('dvHelp').classList.remove('gone');
    requestAnimationFrame(() => el.classList.add('open'));                                              // slide in
    audioInit();
    try { THREE = await loadThree(); } catch (e) { el.classList.remove('open'); if (window.toast) toast('The 3D engine could not load.'); return; }
    if (!built) { await new Promise(r => setTimeout(r, 650)); try { buildWorld(); } catch (e) { console.error(e); el.classList.remove('open'); if (window.toast) toast('3D is not supported on this device.'); return; } }
    $id('dvLoad').style.display = 'none'; fit(); resetCar(); running = true; last = performance.now(); raf = requestAnimationFrame(loop);
    if (au && au.C.state === 'suspended') au.C.resume();
  }
  const api = { setOrbit: (r, a) => { orbitR = r; if (a !== undefined) { orbitA = camYaw + a; orbitAuto = false; } else orbitAuto = true; }, setTime, setCam: (m) => { camMode = m; glassGroup.visible = m !== 2; }, teleport: (x, z, h) => { st.x = x; st.z = z; st.h = h; camYaw = h; }, skipLoad: () => 0 };
  return { open, close, get running() { return running; }, _state: () => st, _api: api, _dbg: () => ({ envKeys: Object.keys(envs), scene, renderer, camera, sunLight, hemi, envs, P, applied }) };
})();
