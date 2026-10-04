/* Hustleville — gym workout rhythm game: push-ups, squats, jumping jacks. A stick figure moves to a beat;
   tap on the beat (button, screen or Space) to land each rep. Skippable. Loaded before game.js. */
'use strict';

const GYM_LV = [['Easy', 0.6], ['Medium', 1], ['Hard', 1.4]], GYM_SETS = 2, GYM_REST = 15;
let gyLevel = 1, gyMute = false;
const GYM_POSE = {                                                    // joint positions in a 200x150 box: [up, down]
  push: { n: 'Push-ups', icon: '💪', per: 2.2, reps: [6, 10, 15], tip: 'Hands under shoulders, body in a straight line. Knees down is fine!', d: 'Do real push-ups — the coach counts for you',
    p: [{ hd: [48, 52], sh: [58, 66], hp: [112, 80], kL: [146, 90], kR: [146, 90], fL: [178, 112], fR: [178, 112], eL: [60, 90], eR: [60, 90], hL: [60, 118], hR: [60, 118] },
        { hd: [44, 98], sh: [56, 108], hp: [112, 112], kL: [146, 114], kR: [146, 114], fL: [178, 116], fR: [178, 116], eL: [76, 118], eR: [76, 118], hL: [60, 118], hR: [60, 118] }] },
  squat: { n: 'Squats', icon: '🦵', per: 2.6, reps: [10, 15, 25], tip: 'Feet shoulder-width, chest up, push your hips back.', d: 'Do real squats — the coach counts for you',
    p: [{ hd: [100, 20], sh: [100, 38], hp: [100, 82], kL: [92, 108], kR: [108, 108], fL: [90, 136], fR: [110, 136], eL: [86, 62], eR: [114, 62], hL: [84, 86], hR: [116, 86] },
        { hd: [100, 56], sh: [100, 72], hp: [100, 108], kL: [74, 106], kR: [126, 106], fL: [78, 136], fR: [122, 136], eL: [84, 80], eR: [116, 80], hL: [94, 62], hR: [106, 62] }] },
  jack: { n: 'Jumping jacks', icon: '🤸', per: 1.0, reps: [15, 25, 40], tip: 'Land softly on the balls of your feet. Arms up and out!', d: 'Do real jumping jacks — the coach counts for you',
    p: [{ hd: [100, 20], sh: [100, 38], hp: [100, 82], kL: [94, 108], kR: [106, 108], fL: [92, 136], fR: [108, 136], eL: [82, 60], eR: [118, 60], hL: [78, 84], hR: [122, 84] },
        { hd: [100, 22], sh: [100, 40], hp: [100, 84], kL: [76, 108], kR: [124, 108], fL: [60, 134], fR: [140, 134], eL: [72, 26], eR: [128, 26], hL: [62, 6], hR: [138, 6] }] }
};
let gyEl = null, gyRaf = 0, gyAudio = null;

function gyClose() { cancelAnimationFrame(gyRaf); try { speechSynthesis.cancel(); } catch (e) { /* no speech */ } try { gyAudio && gyAudio.close(); } catch (e) { /* ignore */ } gyAudio = null; if (gyEl) { gyEl.remove(); gyEl = null; } }
function gyBeep(f, d) {
  if (gyMute) return; try { gyAudio = gyAudio || new (window.AudioContext || window.webkitAudioContext)(); const o = gyAudio.createOscillator(), g = gyAudio.createGain(), t = gyAudio.currentTime;
    o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + (d || 0.12)); o.connect(g); g.connect(gyAudio.destination); o.start(t); o.stop(t + (d || 0.12) + 0.02); } catch (e) { /* no audio */ }
}
function gySay(txt) { if (gyMute) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.rate = 1.1; u.volume = 0.9; speechSynthesis.speak(u); } catch (e) { /* no speech */ } }

function gyFinish(done, mult) {                                       // skipping pays the plain workout; actually finishing every set pays extra
  const cost = ACTIVITIES.find(a => a.id === 'gym').cost;
  const fx = { health: 6 + (done ? Math.round(5 * mult) : 0), looks: 3 + (done ? Math.round(3 * mult) : 0), happy: 2 + (done ? 3 : 0) };
  S.cash -= cost; S.done.gym = true; S.hobbies = (S.hobbies || 0) + 1;
  S.health = clamp(S.health + fx.health); S.looks = clamp(S.looks + fx.looks); S.happy = clamp(S.happy + fx.happy);
  say('🏋️', done ? 'You did a full real workout. You feel strong!' : 'You got a quick workout in.', 'good');
  save(); refresh(); renderFeed(); return fx;
}

function openGym() {
  gyClose();
  const el = gyEl = document.createElement('div'); el.className = 'brx gyx'; const cost = ACTIVITIES.find(a => a.id === 'gym').cost;
  const fxHTML = (fx) => `😊 +${fx.happy} Happy · ❤️ +${fx.health} Health · ✨ +${fx.looks} Looks`;
  const intro = () => {
    el.innerHTML = `<div class="brin"><div class="brtitle">🏋️ Hit the gym</div>
      <p>A real workout — <b>you do the reps</b>, your coach guides the pace and counts. Find a bit of floor space.</p>
      <div class="gylv">${GYM_LV.map(([n], i) => `<button class="${i === gyLevel ? 'on' : ''}" data-lv="${i}">${n}</button>`).join('')}</div>
      ${Object.entries(GYM_POSE).map(([k, t]) => `<button class="brcard" data-k="${k}"><span>${t.icon}</span><div><b>${t.n}</b><small>${GYM_SETS} sets × ${t.reps[gyLevel]} reps · ${t.d}</small></div></button>`).join('')}
      <button class="brskip" data-skip>Skip — just work out ($${cost})</button><button class="brx-close" data-close>✕</button></div>`;
    el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { gyLevel = +b.dataset.lv; intro(); });
    el.querySelectorAll('.brcard').forEach(b => b.onclick = () => run(b.dataset.k));
    el.querySelector('[data-skip]').onclick = () => outro(gyFinish(false, 1), false);
    el.querySelector('[data-close]').onclick = gyClose;
  };
  const outro = (fx, done) => {
    cancelAnimationFrame(gyRaf); try { speechSynthesis.cancel(); } catch (e) { /* none */ }
    el.innerHTML = `<div class="brin"><div class="gyemoji">${done ? '🏆' : '🏋️'}</div><div class="brtitle">${done ? 'Workout complete!' : 'Workout done'}</div>
      <p>${done ? 'Real reps, real results. Drink some water!' : 'A quick session, no fuss.'}</p><div class="brfx">${fxHTML(fx)}</div><button class="gbtn" data-close>DONE</button></div>`;
    el.querySelector('[data-close]').onclick = gyClose;
  };
  const run = (k) => {
    const T = GYM_POSE[k], pts = Object.keys(T.p[0]), reps = T.reps[gyLevel], mult = GYM_LV[gyLevel][1];
    const segs = [{ t: 'ready', d: 6 }]; for (let i = 0; i < GYM_SETS; i++) { segs.push({ t: 'set', n: i + 1, d: reps * T.per }); if (i < GYM_SETS - 1) segs.push({ t: 'rest', d: GYM_REST }); }
    el.innerHTML = `<div class="brstage"><div class="brname">${T.icon} ${T.n}</div>
      <div class="gyhud"><span id="gySet">Get ready</span><span>Rep <b id="gyR">0</b>/${reps}</span></div>
      <div class="gyfig"><svg viewBox="0 0 200 150"><line x1="0" y1="140" x2="200" y2="140" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
        <g stroke="#9fd8ff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"><polyline id="gyL1"/><polyline id="gyL2"/><polyline id="gyA1"/><polyline id="gyA2"/><line id="gyT"/></g><circle id="gyH" r="12" fill="#ffd9a8" stroke="#9fd8ff" stroke-width="3"/></svg></div>
      <div class="gycoach" id="gyCoach">Get into position</div><div class="gysub" id="gySub">${T.tip}</div>
      <div class="gybar"><i id="gyBar"></i></div>
      <div class="brbar"><button class="brmini" id="gyMute">${gyMute ? '🔇' : '🔊'}</button><button class="brmini" id="gyPause">⏸</button><button class="brskip" id="gySkip">Skip</button></div></div>`;
    const $ = (id) => el.querySelector('#' + id), COACH = $('gyCoach'), SUB = $('gySub'), BAR = $('gyBar'), SETL = $('gySet'), REPL = $('gyR');
    const L1 = $('gyL1'), L2 = $('gyL2'), A1 = $('gyA1'), A2 = $('gyA2'), TR = $('gyT'), HD = $('gyH'), lerp = (a, b, t) => a + (b - a) * t;
    const draw = (depth) => {
      const q = {}; pts.forEach(j => q[j] = [lerp(T.p[0][j][0], T.p[1][j][0], depth), lerp(T.p[0][j][1], T.p[1][j][1], depth)]); const s = (a) => a.join(',');
      L1.setAttribute('points', [q.hp, q.kL, q.fL].map(s).join(' ')); L2.setAttribute('points', [q.hp, q.kR, q.fR].map(s).join(' '));
      A1.setAttribute('points', [q.sh, q.eL, q.hL].map(s).join(' ')); A2.setAttribute('points', [q.sh, q.eR, q.hR].map(s).join(' '));
      TR.setAttribute('x1', q.sh[0]); TR.setAttribute('y1', q.sh[1]); TR.setAttribute('x2', q.hp[0]); TR.setAttribute('y2', q.hp[1]); HD.setAttribute('cx', q.hd[0]); HD.setAttribute('cy', q.hd[1]);
    };
    let paused = false, clock = 0, last = performance.now(), key = '';
    $('gyMute').onclick = (e) => { gyMute = !gyMute; e.target.textContent = gyMute ? '🔇' : '🔊'; if (gyMute) try { speechSynthesis.cancel(); } catch (x) { /* none */ } };
    $('gyPause').onclick = (e) => { paused = !paused; e.target.textContent = paused ? '▶' : '⏸'; COACH.textContent = paused ? 'Paused' : COACH.textContent; };
    $('gySkip').onclick = () => outro(gyFinish(false, 1), false);
    const total = segs.reduce((sum, g) => sum + g.d, 0);
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; if (!paused) clock += dt;
      if (clock >= total) { outro(gyFinish(true, mult), true); return; }
      let r = clock, si = 0; while (r >= segs[si].d) { r -= segs[si].d; si++; } const g = segs[si];
      BAR.style.width = (clock / total * 100).toFixed(1) + '%';
      if (g.t === 'ready') {
        const c = Math.ceil(g.d - r); draw(0); SETL.textContent = 'Get ready'; if (key !== 'r' + c) { key = 'r' + c; COACH.textContent = c > 3 ? 'Get into position' : String(c); SUB.textContent = T.tip; if (c <= 3) { gyBeep(520, 0.15); gySay(String(c)); } }
      } else if (g.t === 'rest') {
        draw(0); const c = Math.ceil(g.d - r); SETL.textContent = 'Rest'; if (key !== 'rest' + c) { key = 'rest' + c; COACH.textContent = `Rest · ${c}s`; SUB.textContent = c > g.d - 2 ? 'Shake it out, breathe deep' : c <= 3 ? 'Next set starting…' : 'Shake it out, breathe deep'; if (c === 3) gySay('Next set'); }
      } else {
        const rep = Math.floor(r / T.per), ph = (r % T.per) / T.per;
        draw(0.5 - 0.5 * Math.cos(2 * Math.PI * ph)); SETL.textContent = `Set ${g.n}/${GYM_SETS}`; REPL.textContent = Math.min(reps, rep + (ph > 0.97 ? 1 : 0));
        const half = ph < 0.5, cue = k === 'jack' ? (half ? 'Jump out!' : 'Jump in') : (half ? 'Down…' : 'Up!'), kk = `s${g.n}-${rep}-${half ? 0 : 1}`;
        if (key !== kk) { key = kk; COACH.textContent = cue; SUB.textContent = `${rep + 1} of ${reps}`; gyBeep(half ? 300 : 440, 0.1); try { navigator.vibrate && navigator.vibrate(half ? 10 : 20); } catch (e) { /* none */ }
          if (half && rep >= 1) gySay(String(rep)); if (rep === reps - 1 && !half) SUB.textContent = 'Last one!'; }
      }
      gyRaf = requestAnimationFrame(frame);
    };
    gyRaf = requestAnimationFrame(frame);
  };
  document.body.appendChild(el); intro();
}
