/* Hustleville — gym workout rhythm game: push-ups, squats, jumping jacks. A stick figure moves to a beat;
   tap on the beat (button, screen or Space) to land each rep. Skippable. Loaded before game.js. */
'use strict';

const GYM_N = 16;                                                      // beats per set
const GYM_POSE = {                                                    // joint positions in a 200x150 box: [up, down]
  push: { n: 'Push-ups', icon: '💪', beat: 1.1, d: 'Side view · tap at the bottom of each rep',
    p: [{ hd: [48, 52], sh: [58, 66], hp: [112, 80], kL: [146, 90], kR: [146, 90], fL: [178, 112], fR: [178, 112], eL: [60, 90], eR: [60, 90], hL: [60, 118], hR: [60, 118] },
        { hd: [44, 98], sh: [56, 108], hp: [112, 112], kL: [146, 114], kR: [146, 114], fL: [178, 116], fR: [178, 116], eL: [76, 118], eR: [76, 118], hL: [60, 118], hR: [60, 118] }] },
  squat: { n: 'Squats', icon: '🦵', beat: 1.0, d: 'Front view · tap at the bottom of each squat',
    p: [{ hd: [100, 20], sh: [100, 38], hp: [100, 82], kL: [92, 108], kR: [108, 108], fL: [90, 136], fR: [110, 136], eL: [86, 62], eR: [114, 62], hL: [84, 86], hR: [116, 86] },
        { hd: [100, 56], sh: [100, 72], hp: [100, 108], kL: [74, 106], kR: [126, 106], fL: [78, 136], fR: [122, 136], eL: [84, 80], eR: [116, 80], hL: [94, 62], hR: [106, 62] }] },
  jack: { n: 'Jumping jacks', icon: '🤸', beat: 0.8, d: 'Front view · tap each time you jump out',
    p: [{ hd: [100, 20], sh: [100, 38], hp: [100, 82], kL: [94, 108], kR: [106, 108], fL: [92, 136], fR: [108, 136], eL: [82, 60], eR: [118, 60], hL: [78, 84], hR: [122, 84] },
        { hd: [100, 22], sh: [100, 40], hp: [100, 84], kL: [76, 108], kR: [124, 108], fL: [60, 134], fR: [140, 134], eL: [72, 26], eR: [128, 26], hL: [62, 6], hR: [138, 6] }] }
};
let gyEl = null, gyRaf = 0, gyKey = null;

function gyClose() { cancelAnimationFrame(gyRaf); if (gyEl) { gyEl.remove(); gyEl = null; } if (gyKey) { document.removeEventListener('keydown', gyKey); gyKey = null; } }

function gyFinish(reps, perfect) {                                    // skipping pays the plain workout; landing reps earns up to double
  const cost = ACTIVITIES.find(a => a.id === 'gym').cost, r = reps / GYM_N;
  const fx = { health: 6 + Math.round(5 * r), looks: 3 + Math.round(3 * r), happy: 2 + (perfect >= GYM_N * 0.6 ? 2 : 0) };
  S.cash -= cost; S.done.gym = true; S.hobbies = (S.hobbies || 0) + 1;
  S.health = clamp(S.health + fx.health); S.looks = clamp(S.looks + fx.looks); S.happy = clamp(S.happy + fx.happy);
  say('🏋️', reps ? `You smashed ${reps} reps (${perfect} perfect). Solid workout!` : 'You got a quick workout in.', 'good');
  save(); refresh(); renderFeed(); return fx;
}

function openGym() {
  gyClose();
  const el = gyEl = document.createElement('div'); el.className = 'brx gyx';
  const fxHTML = (fx) => `😊 +${fx.happy} Happy · ❤️ +${fx.health} Health · ✨ +${fx.looks} Looks`;
  const intro = () => {
    el.innerHTML = `<div class="brin"><div class="brtitle">🏋️ Hit the gym</div>
      <p>Pick an exercise. A beat counts you in — <b>tap on the beat</b> as the ring closes. ${GYM_N} reps, no weights, all heart.</p>
      ${Object.entries(GYM_POSE).map(([k, t]) => `<button class="brcard" data-k="${k}"><span>${t.icon}</span><div><b>${t.n}</b><small>${t.d}</small></div></button>`).join('')}
      <button class="brskip" data-skip>Skip — just work out ($${ACTIVITIES.find(a => a.id === 'gym').cost})</button><button class="brx-close" data-close>✕</button></div>`;
    el.querySelectorAll('.brcard').forEach(b => b.onclick = () => run(b.dataset.k));
    el.querySelector('[data-skip]').onclick = () => outro(gyFinish(0, 0), 0, 0, 0);
    el.querySelector('[data-close]').onclick = gyClose;
  };
  const outro = (fx, reps, perfect, best) => {
    cancelAnimationFrame(gyRaf); if (gyKey) { document.removeEventListener('keydown', gyKey); gyKey = null; }
    el.innerHTML = `<div class="brin"><div class="gyemoji">${reps >= GYM_N * 0.8 ? '🏆' : reps ? '💪' : '🏋️'}</div><div class="brtitle">${reps ? 'Set complete!' : 'Workout done'}</div>
      ${reps ? `<p>${reps}/${GYM_N} reps · ${perfect} perfect · best combo ${best}</p>` : '<p>A quick session, no fuss.</p>'}<div class="brfx">${fxHTML(fx)}</div><button class="gbtn" data-close>DONE</button></div>`;
    el.querySelector('[data-close]').onclick = gyClose;
  };
  const run = (k) => {
    const T = GYM_POSE[k], pts = Object.keys(T.p[0]);
    el.innerHTML = `<div class="brstage"><div class="brname">${T.icon} ${T.n}</div>
      <div class="gyhud"><span>Reps <b id="gyR">0</b>/${GYM_N}</span><span>Combo <b id="gyC">0</b></span></div>
      <div class="gyfig"><svg viewBox="0 0 200 150" id="gySvg"><line x1="0" y1="140" x2="200" y2="140" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
        <g stroke="#9fd8ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"><polyline id="gyL1"/><polyline id="gyL2"/><polyline id="gyA1"/><polyline id="gyA2"/><line id="gyT"/></g><circle id="gyH" r="12" fill="#ffd9a8" stroke="#9fd8ff" stroke-width="3"/></svg>
        <div class="gycue"><i id="gyRing"></i><b id="gyMsg"></b></div></div>
      <button class="gytap" id="gyTap">TAP</button><div class="gybeats">${Array.from({ length: GYM_N }, () => '<i></i>').join('')}</div>
      <div class="brbar"><button class="brskip" id="gySkip">Skip</button></div></div>`;
    const $ = (id) => el.querySelector('#' + id), dots = [...el.querySelectorAll('.gybeats i')], MSG = $('gyMsg'), RING = $('gyRing');
    const L1 = $('gyL1'), L2 = $('gyL2'), A1 = $('gyA1'), A2 = $('gyA2'), TR = $('gyT'), HD = $('gyH');
    const lerp = (a, b, t) => a + (b - a) * t, T0 = performance.now() + 3200, beat = T.beat * 1000;
    let reps = 0, perfect = 0, combo = 0, best = 0, shown = -1; const hit = new Array(GYM_N).fill(null);
    const say2 = (txt, cls) => { MSG.textContent = txt; MSG.className = cls; MSG.style.animation = 'none'; void MSG.offsetWidth; MSG.style.animation = ''; };
    const draw = (depth) => {
      const q = {}; pts.forEach(j => q[j] = [lerp(T.p[0][j][0], T.p[1][j][0], depth), lerp(T.p[0][j][1], T.p[1][j][1], depth)]);
      const s = (a) => a.join(',');
      L1.setAttribute('points', [q.hp, q.kL, q.fL].map(s).join(' ')); L2.setAttribute('points', [q.hp, q.kR, q.fR].map(s).join(' '));
      A1.setAttribute('points', [q.sh, q.eL, q.hL].map(s).join(' ')); A2.setAttribute('points', [q.sh, q.eR, q.hR].map(s).join(' '));
      TR.setAttribute('x1', q.sh[0]); TR.setAttribute('y1', q.sh[1]); TR.setAttribute('x2', q.hp[0]); TR.setAttribute('y2', q.hp[1]);
      HD.setAttribute('cx', q.hd[0]); HD.setAttribute('cy', q.hd[1]);
    };
    const judge = () => {
      const now = performance.now(), i = Math.round((now - T0) / beat); if (now < T0 - 700) return;
      const dt = Math.abs(now - T0 - i * beat);
      if (i < 0 || i >= GYM_N || hit[i] !== null || dt > 330) { combo = 0; say2('Off beat', 'miss'); return; }
      if (dt <= 150) { hit[i] = 'p'; perfect++; reps++; combo++; say2('PERFECT', 'perfect'); }
      else { hit[i] = 'g'; reps++; combo++; say2('Good', 'good'); }
      best = Math.max(best, combo); $('gyR').textContent = reps; $('gyC').textContent = combo;
      dots[i].className = hit[i] === 'p' ? 'p' : 'g'; try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* no haptics */ }
    };
    $('gyTap').onpointerdown = (e) => { e.preventDefault(); judge(); };
    gyKey = (e) => { if (e.code === 'Space') { e.preventDefault(); judge(); } }; document.addEventListener('keydown', gyKey);
    $('gySkip').onclick = () => outro(gyFinish(0, 0), 0, 0, 0);
    const frame = (now) => {
      const t = now - T0;
      if (t < 0) { draw(0); const c = Math.ceil(-t / 1000); if (shown !== c) { shown = c; say2(c > 3 ? 'Get ready' : String(c), 'count'); } RING.style.transform = 'scale(0)'; gyRaf = requestAnimationFrame(frame); return; }
      if (shown !== -2) { shown = -2; say2('GO!', 'perfect'); }
      const ph = (t % beat) / beat;                                  // 0 right on the beat
      draw(0.5 + 0.5 * Math.cos(2 * Math.PI * ph));                  // bottom of the rep falls exactly on the beat
      const toNext = 1 - ph; RING.style.transform = `scale(${(1 + 1.6 * toNext).toFixed(3)})`; RING.style.opacity = (1 - toNext * 0.6).toFixed(2);
      const idx = Math.floor((t + 330) / beat);
      for (let i = 0; i < Math.min(idx, GYM_N); i++) if (hit[i] === null && t - i * beat > 330) { hit[i] = 'm'; combo = 0; dots[i].className = 'm'; $('gyC').textContent = 0; }
      if (t > (GYM_N - 1) * beat + 400) { outro(gyFinish(reps, perfect), reps, perfect, best); return; }
      gyRaf = requestAnimationFrame(frame);
    };
    gyRaf = requestAnimationFrame(frame);
  };
  document.body.appendChild(el); intro();
}
