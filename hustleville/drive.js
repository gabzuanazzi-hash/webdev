/* Hustleville — 3D drive. A yellow Lamborghini in a night city (Three.js, loaded on first use).
   Coin Rush: collect coins, dodge traffic and buildings, use boost. Rewards go to the player on exit. */
'use strict';

const Drive = (() => {
  const BLOCK = 44, ROAD = 16, N = 9, STEP = BLOCK + ROAD, CITY = N * STEP + ROAD, HALF = CITY / 2;
  const rc = (i) => -HALF + ROAD / 2 + i * STEP;                    // road centre line i (0..N)
  const MAXV = 70, ACC = 38, BRAKE = 62, COIN_VALUE = 250, START_TIME = 90;
  let THREE = null, el = null, renderer, scene, camera, carGroup, carBody, wheels = [], frontWheels = [], spot;
  let colliders = [], coins = [], npcs = [], lamps = null, mapBase = null, mapCtx = null;
  let st = null, raf = 0, last = 0, running = false, asset = null, built = false, frame = 0;
  const keys = {}, touch = {};

  /* ---------- loading ---------- */
  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'assets/vendor/three.min.js';
      s.onload = () => res(window.THREE); s.onerror = () => rej(new Error('3D engine failed to load')); document.head.appendChild(s);
    });
  }

  /* ---------- DOM ---------- */
  function buildDom() {
    el = document.createElement('div'); el.id = 'drive'; el.className = 'drive';
    el.innerHTML = `
      <canvas id="dvCanvas"></canvas>
      <div class="dv-top">
        <div class="dv-speed"><b id="dvSpeed">0</b><small>km/h</small></div>
        <div class="dv-mid"><div class="dv-time" id="dvTime">90</div><div class="dv-coins">🪙 <b id="dvCoins">0</b></div></div>
        <div class="dv-right"><canvas id="dvMap" width="120" height="120"></canvas><button class="dv-exit" id="dvExit">✕ Exit</button></div>
      </div>
      <div class="dv-boost"><i id="dvBoost"></i><span>BOOST</span></div>
      <div class="dv-flash" id="dvFlash"></div>
      <div class="dv-help" id="dvHelp">WASD / arrows to drive · Shift boost · Space drift</div>
      <div class="dv-pad">
        <div class="dv-lr"><button data-k="left">◀</button><button data-k="right">▶</button></div>
        <div class="dv-bt"><button data-k="boost" class="b">⚡</button><button data-k="brake">⏹</button><button data-k="gas" class="g">GAS</button></div>
      </div>
      <div class="dv-end" id="dvEnd" hidden><div class="dv-card"><h3 id="dvEndTitle">Time's up!</h3><p id="dvEndText"></p><button class="btn gold big" id="dvCollect">Collect &amp; exit</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector('#dvExit').onclick = () => finish('exit');
    el.querySelector('#dvCollect').onclick = () => close();
    el.querySelectorAll('.dv-pad button').forEach(b => {
      const k = b.dataset.k, on = (e) => { e.preventDefault(); touch[k] = true; b.classList.add('on'); }, off = () => { touch[k] = false; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    window.addEventListener('keydown', (e) => { if (!running) return; keys[e.code] = true; if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); const h = $('dvHelp'); if (h) h.classList.add('gone'); });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('resize', fit);
  }
  const fit = () => { if (!renderer || !el) return; const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };

  /* ---------- procedural textures ---------- */
  function windowTexture(seed) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#10182c'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const lit = Math.random() < 0.55, col = lit ? pick(['#ffe9a3', '#fff6d8', '#9fd6ff', '#ffd27a']) : '#1a2744';
      g.fillStyle = col; g.fillRect(x * 32 + 6, y * 32 + 7, 20, 18);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
  }
  function groundTexture() {
    const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), k = S / (CITY + 120), o = (CITY + 120) / 2;
    g.fillStyle = '#20232e'; g.fillRect(0, 0, S, S);
    const X = (x) => (x + o) * k;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {          // sidewalks / blocks
      const x0 = rc(i) + ROAD / 2, z0 = rc(j) + ROAD / 2; g.fillStyle = '#3a3f4f'; g.fillRect(X(x0 - 1.5), X(z0 - 1.5), (BLOCK + 3) * k, (BLOCK + 3) * k);
    }
    g.strokeStyle = '#e9d36a'; g.lineWidth = 0.35 * k; g.setLineDash([3 * k, 3 * k]);   // lane markings
    for (let i = 0; i <= N; i++) { g.beginPath(); g.moveTo(X(rc(i)), X(-HALF)); g.lineTo(X(rc(i)), X(HALF)); g.stroke(); g.beginPath(); g.moveTo(X(-HALF), X(rc(i))); g.lineTo(X(HALF), X(rc(i))); g.stroke(); }
    g.setLineDash([]); g.fillStyle = '#d8dce8';
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) for (let s = -1; s <= 1; s += 2) {   // crosswalk stripes
      for (let m = -3; m <= 3; m++) { g.fillRect(X(rc(i) + m * 1.9 - 0.4), X(rc(j) + s * (ROAD / 2 - 1.2)), 0.8 * k, 2 * k); g.fillRect(X(rc(i) + s * (ROAD / 2 - 1.2)), X(rc(j) + m * 1.9 - 0.4), 2 * k, 0.8 * k); }
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  /* ---------- world ---------- */
  function buildWorld() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1226); scene.fog = new THREE.Fog(0x0b1226, 70, 430);
    camera = new THREE.PerspectiveCamera(65, 1, 0.5, 700);
    renderer = new THREE.WebGLRenderer({ canvas: $('dvCanvas'), antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene.add(new THREE.HemisphereLight(0x9ab8ff, 0x2a3048, 1.05));
    const moon = new THREE.DirectionalLight(0xbcd0ff, 0.55); moon.position.set(-120, 220, -80); scene.add(moon);
    // moon
    const m = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshBasicMaterial({ color: 0xf4f1d8, fog: false })); m.position.set(-300, 260, -520); m.lookAt(0, 0, 0); scene.add(m);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY + 120, CITY + 120), new THREE.MeshLambertMaterial({ map: groundTexture() })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: 0x0f1424 })); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.05; scene.add(outer);

    // buildings
    const winMats = [0, 1, 2, 3].map(() => windowTexture());
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x232a3d });
    const tints = [0xffffff, 0xd6e4ff, 0xffe9d0, 0xe0d6ff];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = rc(i) + ROAD / 2, z0 = rc(j) + ROAD / 2, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
      const park = Math.random() < 0.1 || (i === 4 && j === 4);
      if (park) { // small park with trees
        const gr = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK - 4, BLOCK - 4), new THREE.MeshLambertMaterial({ color: 0x1e4a30 })); gr.rotation.x = -Math.PI / 2; gr.position.set(cx, 0.06, cz); scene.add(gr);
        for (let t = 0; t < 9; t++) { const tx = cx + rnd(-16, 16), tz = cz + rnd(-16, 16);
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), new THREE.MeshLambertMaterial({ color: 0x4a3322 })); trunk.position.set(tx, 1.5, tz); scene.add(trunk);
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(2.6, 6, 7), new THREE.MeshLambertMaterial({ color: 0x1f6b3a })); leaf.position.set(tx, 5.5, tz); scene.add(leaf); }
        continue;
      }
      const dist = Math.hypot(i - 4, j - 4) / 5.6, tall = 1 - dist;
      const lots = pick([[1, 1], [2, 1], [1, 2], [2, 2], [2, 2]]);
      const lw = (BLOCK - 4) / lots[0], ld = (BLOCK - 4) / lots[1];
      for (let a = 0; a < lots[0]; a++) for (let b = 0; b < lots[1]; b++) {
        const w = lw - rnd(1, 3), d = ld - rnd(1, 3), h = rnd(10, 22) + tall * rnd(20, 80), px = x0 + 2 + lw * (a + 0.5), pz = z0 + 2 + ld * (b + 0.5);
        const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
        for (let v = 0; v < uv.count; v++) { const face = Math.floor(v / 4); const horiz = face < 2 ? d : w; if (face < 2 || face > 3) { uv.setXY(v, uv.getX(v) * horiz / 8, uv.getY(v) * h / 8); } }
        const side = new THREE.MeshLambertMaterial({ map: pick(winMats), color: pick(tints) });
        const mesh = new THREE.Mesh(geo, [side, side, roofMat, roofMat, side, side]); mesh.position.set(px, h / 2, pz); scene.add(mesh);
        colliders.push({ minx: px - w / 2, maxx: px + w / 2, minz: pz - d / 2, maxz: pz + d / 2 });
      }
    }
    // street lamps (instanced)
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 7, 5), headGeo = new THREE.SphereGeometry(0.55, 8, 6);
    const lampCount = (N + 1) * (N + 1) * 4;
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x555b6b }), lampCount), heads = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffe6a8 }), lampCount);
    let q = 0; const mx = new THREE.Matrix4();
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const x = rc(i) + sx * (ROAD / 2 + 0.5), z = rc(j) + sz * (ROAD / 2 + 0.5);
      mx.makeTranslation(x, 3.5, z); poles.setMatrixAt(q, mx); mx.makeTranslation(x, 7.2, z); heads.setMatrixAt(q, mx); q++;
    }
    scene.add(poles, heads);
    // coins
    const coinGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.25, 18), coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0x8a5a00, metalness: 0.7, roughness: 0.3 });
    for (let k = 0; k < 40; k++) { const c = new THREE.Mesh(coinGeo, coinMat); c.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(c); scene.add(g); coins.push({ g, c, x: 0, z: 0, on: true }); }
    // npc cars
    const cols = [0xd04a4a, 0x3a7bd5, 0xe7e7ea, 0x2f8f5b, 0x9a5fd0, 0xf09a3a, 0x444a58];
    for (let k = 0; k < 16; k++) { const mesh = simpleCar(pick(cols)); scene.add(mesh); npcs.push({ mesh, axis: 'x', dir: 1, line: 0, c: 0, speed: 0 }); }
    buildCar();
    // minimap base
    mapBase = document.createElement('canvas'); mapBase.width = mapBase.height = 120; const g = mapBase.getContext('2d');
    g.fillStyle = '#12182b'; g.fillRect(0, 0, 120, 120); g.fillStyle = '#2a3350';
    const s = 120 / CITY; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) g.fillRect((rc(i) + ROAD / 2 + HALF) * s, (rc(j) + ROAD / 2 + HALF) * s, BLOCK * s, BLOCK * s);
    mapCtx = $('dvMap').getContext('2d');
    built = true;
  }

  function simpleCar(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.2), new THREE.MeshLambertMaterial({ color })); body.position.y = 0.75; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2.2), new THREE.MeshLambertMaterial({ color: 0x1a2236 })); cab.position.set(0, 1.4, -0.2); g.add(cab);
    for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0x111111 })); w.rotation.z = Math.PI / 2; w.position.set(x, 0.4, z); g.add(w); }
    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); tl.position.set(0, 0.9, -2.1); g.add(tl);
    return g;
  }

  function buildCar() {
    carGroup = new THREE.Group();
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd800, emissive: 0x5a4600, emissiveIntensity: 0.55, metalness: 0.08, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0f18, metalness: 0.3, roughness: 0.4 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x0a1630, metalness: 0.8, roughness: 0.1 });
    // side profile of the body (x = length, nose at -x), extruded across the width
    const sh = new THREE.Shape(); [[2.3, 0.28], [2.3, 0.82], [1.7, 0.98], [0.7, 1.12], [-0.25, 1.26], [-1.05, 0.9], [-2.25, 0.6], [-2.32, 0.36], [-2.05, 0.26], [-1.2, 0.3], [1.2, 0.3]].forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]));
    const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: 1.7, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }); bodyGeo.translate(0, 0, -0.85); bodyGeo.rotateY(Math.PI / 2);
    carBody = new THREE.Mesh(bodyGeo, yellow); carGroup.add(carBody);
    const gs = new THREE.Shape(); [[-0.95, 0.93], [-0.28, 1.24], [0.6, 1.18], [1.0, 0.96]].forEach((p, i) => i ? gs.lineTo(p[0], p[1]) : gs.moveTo(p[0], p[1]));
    const glassGeo = new THREE.ExtrudeGeometry(gs, { depth: 1.55, bevelEnabled: false }); glassGeo.translate(0, 0.02, -0.775); glassGeo.rotateY(Math.PI / 2);
    carBody.add(new THREE.Mesh(glassGeo, glass));
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); carBody.add(m); return m; };
    add(new THREE.BoxGeometry(2.15, 0.12, 0.7), dark, 0, 0.3, 2.5);                // front splitter
    add(new THREE.BoxGeometry(0.1, 0.34, 1.1), dark, -1.02, 0.62, 0.3);           // side intakes
    add(new THREE.BoxGeometry(0.1, 0.34, 1.1), dark, 1.02, 0.62, 0.3);
    add(new THREE.BoxGeometry(0.6, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }), -0.62, 0.56, 2.46);  // headlights
    add(new THREE.BoxGeometry(0.6, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.62, 0.56, 2.46);
    add(new THREE.BoxGeometry(1.75, 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), 0, 0.74, -2.46);    // tail light bar
    add(new THREE.BoxGeometry(1.3, 0.05, 0.9), dark, 0, 1.0, -1.75);              // engine cover slats
    [-0.55, 0.55].forEach(x => { const ex = add(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0xc8ccd8, metalness: 0.9, roughness: 0.2 }), x, 0.45, -2.5); ex.rotation.x = Math.PI / 2; });
    add(new THREE.BoxGeometry(1.95, 0.2, 0.5), dark, 0, 0.3, -2.3);               // diffuser
    const wGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.36, 18), rGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.38, 10), tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }), rim = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.9, roughness: 0.2 });
    [[-0.98, 1.45, true], [0.98, 1.45, true], [-0.98, -1.4, false], [0.98, -1.4, false]].forEach(([x, z, front]) => {
      const w = new THREE.Group(), t = new THREE.Mesh(wGeo, tire), r = new THREE.Mesh(rGeo, rim); t.rotation.z = r.rotation.z = Math.PI / 2; w.add(t, r); w.position.set(x, 0.43, z); carGroup.add(w); wheels.push(t); wheels.push(r); if (front) frontWheels.push(w);
    });
    const blob = new THREE.Mesh(new THREE.CircleGeometry(2.8, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.04; blob.scale.set(0.8, 1.3, 1); carGroup.add(blob);
    spot = new THREE.SpotLight(0xfff0cc, 1.4, 130, 0.5, 0.6); spot.position.set(0, 1, 2.2); spot.target.position.set(0, 0, 30); carGroup.add(spot, spot.target);
    scene.add(carGroup);
  }

  /* ---------- game state ---------- */
  function placeCoin(c) {
    const horizontal = chance(0.5), i = ri(0, N), k = ri(0, N - 1), t = rc(k) + ri(4, STEP - 6), off = rnd(-ROAD / 2 + 2, ROAD / 2 - 2);
    c.x = horizontal ? t : rc(i) + off; c.z = horizontal ? rc(i) + off : t; c.on = true; c.g.visible = true; c.g.position.set(c.x, 1.6, c.z);
  }
  function placeNpc(n) {
    n.axis = chance(0.5) ? 'x' : 'z'; n.dir = chance(0.5) ? 1 : -1; n.line = ri(0, N); n.c = rnd(-HALF + 20, HALF - 20); n.speed = rnd(11, 20);
  }
  function reset() {
    st = { x: 0, z: -STEP * 0.5 + 8, h: 0, vx: 0, vz: 0, steer: 0, boost: 1, coins: 0, crashes: 0, time: START_TIME, coolCrash: 0, shake: 0, ended: false, wheelRot: 0 };
    st.x = rc(4); st.z = rc(4) + 20; st.h = 0;
    camera.position.set(st.x, 5, st.z - 10);
    coins.forEach(placeCoin); npcs.forEach(placeNpc);
    $('dvBoost').style.width = '100%'; $('dvEnd').hidden = true; $('dvHelp').classList.remove('gone');
  }
  function npcPose(n) {
    const lane = (n.dir > 0 ? 1 : -1) * ROAD / 4 * (n.axis === 'x' ? 1 : -1), line = rc(n.line);
    return n.axis === 'x' ? { x: n.c, z: line + lane, h: n.dir > 0 ? Math.PI / 2 : -Math.PI / 2 } : { x: line + lane, z: n.c, h: n.dir > 0 ? 0 : Math.PI };
  }

  /* ---------- update ---------- */
  function input() {
    const L = keys.ArrowLeft || keys.KeyA || touch.left, R = keys.ArrowRight || keys.KeyD || touch.right;
    return { throttle: (keys.ArrowUp || keys.KeyW || touch.gas) ? 1 : 0, brake: (keys.ArrowDown || keys.KeyS || touch.brake) ? 1 : 0, steer: (R ? 1 : 0) - (L ? 1 : 0), boost: !!(keys.ShiftLeft || keys.ShiftRight || touch.boost), hand: !!keys.Space };
  }
  function bump(nx, nz, strength) {
    const vn = st.vx * nx + st.vz * nz; if (vn < 0) { st.vx -= (1.35) * vn * nx; st.vz -= 1.35 * vn * nz; }
    st.vx *= 0.7; st.vz *= 0.7;
    if (strength > 7 && st.coolCrash <= 0) { st.crashes++; st.coolCrash = 0.6; st.shake = 0.5; const f = $('dvFlash'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); }
  }
  function step(dt) {
    const inp = input(), fx = Math.sin(st.h), fz = Math.cos(st.h), rx = -Math.cos(st.h), rz = Math.sin(st.h);
    let fwd = st.vx * fx + st.vz * fz, lat = st.vx * rx + st.vz * rz;
    const boosting = inp.boost && st.boost > 0.02 && inp.throttle; if (boosting) st.boost = Math.max(0, st.boost - dt * 0.45); else st.boost = Math.min(1, st.boost + dt * 0.12);
    const maxV = boosting ? MAXV * 1.4 : MAXV;
    if (inp.throttle) fwd += (boosting ? ACC * 2.4 : ACC) * dt * (1 - Math.max(0, fwd) / (maxV + 8));
    if (inp.brake) fwd += fwd > 1 ? -BRAKE * dt : -22 * dt;
    fwd -= fwd * 0.28 * dt + Math.sign(fwd) * 2.2 * dt; if (Math.abs(fwd) < 0.4 && !inp.throttle && !inp.brake) fwd = 0;
    fwd = Math.max(-18, Math.min(maxV + 6, fwd));
    lat *= Math.exp(-(inp.hand ? 1.1 : 6.5) * dt);
    st.steer += (inp.steer - st.steer) * Math.min(1, dt * 9);
    const sf = Math.min(1, Math.abs(fwd) / 16), rate = 1.95 * sf * (1 - 0.4 * Math.min(1, Math.abs(fwd) / MAXV)) * (inp.hand ? 1.45 : 1);
    st.h -= st.steer * rate * dt * (fwd >= 0 ? 1 : -1);
    const nfx = Math.sin(st.h), nfz = Math.cos(st.h), nrx = -Math.cos(st.h), nrz = Math.sin(st.h);
    st.vx = nfx * fwd + nrx * lat; st.vz = nfz * fwd + nrz * lat;
    st.x += st.vx * dt; st.z += st.vz * dt;
    // world bounds
    const lim = HALF - 3; if (st.x > lim) { st.x = lim; bump(-1, 0, Math.abs(st.vx)); } if (st.x < -lim) { st.x = -lim; bump(1, 0, Math.abs(st.vx)); } if (st.z > lim) { st.z = lim; bump(0, -1, Math.abs(st.vz)); } if (st.z < -lim) { st.z = -lim; bump(0, 1, Math.abs(st.vz)); }
    // buildings
    const R = 2.1;
    for (const b of colliders) {
      if (st.x < b.minx - R || st.x > b.maxx + R || st.z < b.minz - R || st.z > b.maxz + R) continue;
      const cx = Math.max(b.minx, Math.min(st.x, b.maxx)), cz = Math.max(b.minz, Math.min(st.z, b.maxz)); let dx = st.x - cx, dz = st.z - cz, d = Math.hypot(dx, dz);
      if (d < R) {
        if (d < 0.001) { dx = st.x - (b.minx + b.maxx) / 2; dz = st.z - (b.minz + b.maxz) / 2; d = Math.hypot(dx, dz) || 1; }
        const nx = dx / d, nz = dz / d; st.x += nx * (R - d); st.z += nz * (R - d); bump(nx, nz, Math.abs(st.vx * nx + st.vz * nz));
      }
    }
    // traffic
    for (const n of npcs) {
      n.prev = n.c; n.c += n.dir * n.speed * dt;
      for (let k = 0; k <= N; k++) { const p = rc(k); if ((n.prev < p) !== (n.c < p) && chance(0.35)) { n.axis = n.axis === 'x' ? 'z' : 'x'; const old = n.line; n.line = k; n.c = rc(old); n.dir = chance(0.5) ? 1 : -1; break; } }
      if (n.c > HALF - 8 || n.c < -HALF + 8) { n.dir *= -1; n.c = Math.max(-HALF + 8, Math.min(HALF - 8, n.c)); }
      const p = npcPose(n); n.mesh.position.set(p.x, 0, p.z); n.mesh.rotation.y = p.h;
      const dx = st.x - p.x, dz = st.z - p.z, d = Math.hypot(dx, dz);
      if (d < 3.6) { const nx = dx / (d || 1), nz = dz / (d || 1); st.x += nx * (3.6 - d); st.z += nz * (3.6 - d); bump(nx, nz, Math.abs(st.vx * nx + st.vz * nz) + 4); }
    }
    // coins
    for (const c of coins) {
      c.g.rotation.y += dt * 3; c.g.position.y = 1.6 + Math.sin(performance.now() / 300 + c.x) * 0.25;
      if (c.on && Math.abs(c.x - st.x) < 3.6 && Math.abs(c.z - st.z) < 3.6) { c.on = false; c.g.visible = false; st.coins++; st.time = Math.min(START_TIME, st.time + 2); setTimeout(() => placeCoin(c), 4000); const e = $('dvCoins'); e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
    }
    st.coolCrash -= dt; st.shake = Math.max(0, st.shake - dt * 1.6);
    st.time -= dt; if (st.time <= 0 && !st.ended) finish('time');
    // car visuals
    carGroup.position.set(st.x, 0, st.z); carGroup.rotation.y = st.h;
    carBody.rotation.z = -st.steer * 0.05 * sf - lat * 0.004; carBody.rotation.x = -(inp.throttle - inp.brake) * 0.012;
    st.wheelRot += fwd * dt / 0.43; wheels.forEach(w => { w.rotation.x = st.wheelRot; }); frontWheels.forEach(w => { w.rotation.y = -st.steer * 0.45; });
    // camera
    const sp = Math.abs(fwd), back = 9.5 + sp * 0.06, hgt = 4.2 + sp * 0.015;
    const tx = st.x - Math.sin(st.h) * back + (Math.random() - 0.5) * st.shake, tz = st.z - Math.cos(st.h) * back + (Math.random() - 0.5) * st.shake;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 6); camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 6); camera.position.y += (hgt - camera.position.y) * Math.min(1, dt * 4);
    camera.lookAt(st.x + Math.sin(st.h) * 8, 1.6, st.z + Math.cos(st.h) * 8);
    const fov = 62 + Math.min(1, sp / MAXV) * 16 + (boosting ? 8 : 0); camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
    return sp;
  }
  function hud(sp) {
    $('dvSpeed').textContent = Math.round(sp * 5); $('dvTime').textContent = Math.max(0, Math.ceil(st.time)); $('dvTime').classList.toggle('low', st.time < 10);
    $('dvCoins').textContent = st.coins; $('dvBoost').style.width = st.boost * 100 + '%';
    if (frame % 4 === 0 && mapCtx) {
      mapCtx.drawImage(mapBase, 0, 0); const s = 120 / CITY, X = (x) => (x + HALF) * s;
      mapCtx.fillStyle = '#ffc83d'; coins.forEach(c => { if (c.on) mapCtx.fillRect(X(c.x) - 1.5, X(c.z) - 1.5, 3, 3); });
      mapCtx.fillStyle = '#8aa0c8'; npcs.forEach(n => { const p = npcPose(n); mapCtx.fillRect(X(p.x) - 1, X(p.z) - 1, 2, 2); });
      mapCtx.save(); mapCtx.translate(X(st.x), X(st.z)); mapCtx.rotate(-st.h + Math.PI); mapCtx.fillStyle = '#ffd400'; mapCtx.beginPath(); mapCtx.moveTo(0, -6); mapCtx.lineTo(4, 5); mapCtx.lineTo(-4, 5); mapCtx.closePath(); mapCtx.fill(); mapCtx.restore();
    }
  }
  function loop(t) {
    if (!running) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016); last = t; frame++;
    if (!st.ended) { const sp = step(dt); hud(sp); }
    renderer.render(scene, camera);
  }

  /* ---------- flow ---------- */
  function finish(reason) {
    if (st.ended) return; st.ended = true;
    const reward = st.coins * COIN_VALUE;
    $('dvEndTitle').textContent = reason === 'time' ? "Time's up!" : 'Nice drive!';
    $('dvEndText').innerHTML = `🪙 <b>${st.coins}</b> coins · 💥 <b>${st.crashes}</b> crashes<br>Prize money <b class="g">${typeof fmt === 'function' ? fmt(reward) : '$' + reward}</b>`;
    $('dvEnd').hidden = false;
  }
  function close() {
    const res = { coins: st ? st.coins : 0, crashes: st ? st.crashes : 0 };
    running = false; cancelAnimationFrame(raf); el.classList.remove('open'); Object.keys(keys).forEach(k => { keys[k] = false; }); Object.keys(touch).forEach(k => { touch[k] = false; });
    setTimeout(() => { if (!running) el.style.visibility = 'hidden'; }, 600);
    if (window.driveFinished) window.driveFinished(asset, res);
  }
  async function open(a) {
    asset = a; if (!el) buildDom();
    el.style.visibility = 'visible';
    requestAnimationFrame(() => el.classList.add('open'));                 // slide in
    try { THREE = await loadThree(); } catch (e) { el.classList.remove('open'); if (window.toast) toast('The 3D engine could not load.'); return; }
    if (!built) buildWorld();
    fit(); reset(); running = true; last = performance.now(); raf = requestAnimationFrame(loop);
  }
  return { open, close, get running() { return running; }, _state: () => st };
})();
