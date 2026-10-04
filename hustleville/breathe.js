/* Hustleville — guided breathing mini game for the Meditate activity. Bubble grows on the in-breath,
   holds its size on a hold, shrinks on the out-breath. Can be skipped at any time. Loaded before game.js. */
'use strict';

const BREATH = [
  { id: 'calm', n: 'Calm breathing', icon: '🌿', d: 'In 4 · Out 6 — slow and soothing', cycles: 6, ph: [['in', 4], ['out', 6]], fx: { happy: 4, health: 1 } },
  { id: 'box', n: 'Box breathing', icon: '🟦', d: 'In 4 · Hold 4 · Out 4 · Hold 4 — focus', cycles: 4, ph: [['in', 4], ['hold', 4], ['out', 4], ['hold', 4]], fx: { smarts: 2, happy: 2 } },
  { id: '478', n: '4-7-8 sleep breath', icon: '🌙', d: 'In 4 · Hold 7 · Out 8 — deep relax', cycles: 4, ph: [['in', 4], ['hold', 7], ['out', 8]], fx: { happy: 3, health: 2 } }
];
const BR_TXT = { in: 'Breathe in', hold: 'Hold', out: 'Breathe out' };
const BR_COL = { in: ['#7be7ff', '#2a7fff'], hold: ['#d8b6ff', '#7a4fd6'], out: ['#8cf5c8', '#1d9d86'] };

let brEl = null, brRaf = 0, brAudio = null, brOsc = null, brGain = null, brMute = false;

function brTone(on, freq) {                                          // a soft pad that rises with the in-breath and falls with the out-breath
  if (brMute) return;
  try {
    if (on && !brAudio) {
      brAudio = new (window.AudioContext || window.webkitAudioContext)(); brOsc = brAudio.createOscillator(); brGain = brAudio.createGain();
      brOsc.type = 'sine'; brOsc.frequency.value = 160; brGain.gain.value = 0; brOsc.connect(brGain); brGain.connect(brAudio.destination); brOsc.start();
    }
    if (brAudio && brOsc) { const t = brAudio.currentTime; brOsc.frequency.setTargetAtTime(freq, t, 0.25); brGain.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.3); }
  } catch (e) { /* audio unavailable */ }
}
function brStopAudio() { try { if (brOsc) { brOsc.stop(); } if (brAudio) brAudio.close(); } catch (e) { /* ignore */ } brAudio = brOsc = brGain = null; }

function brClose() { cancelAnimationFrame(brRaf); brStopAudio(); if (brEl) { brEl.remove(); brEl = null; } }

function brFinish(tech, completed) {                                  // shared by skip and completion: skipping still meditates, a full session pays a bonus
  const fx = { happy: 6, health: 2, smarts: 0 }; if (completed) { for (const k in tech.fx) fx[k] = (fx[k] || 0) + tech.fx[k]; fx.happy += 2; }
  const lu = completed ? 6 : 3, ka = completed ? 3 : 1; S.luck = clamp((S.luck == null ? 50 : S.luck) + lu); addKarma(ka); fx.luck = lu; fx.karma = ka;
  S.done.meditate = true; S.hobbies = (S.hobbies || 0) + 1;
  S.happy = clamp(S.happy + fx.happy); S.health = clamp(S.health + fx.health); S.smarts = clamp(S.smarts + (fx.smarts || 0));
  say('🧘', completed ? `You finished a full ${tech.n.toLowerCase()} session and feel completely at peace.` : 'You took a quiet moment to meditate.', 'good');
  save(); refresh(); renderFeed();
  return fx;
}

function openBreathe() {
  brClose();
  const el = brEl = document.createElement('div'); el.className = 'brx';
  const stars = Array.from({ length: 22 }, () => `<i style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${(Math.random() * 6).toFixed(1)}s;--s:${(0.5 + Math.random() * 1.5).toFixed(1)}px"></i>`).join('');
  const intro = () => {
    el.innerHTML = `<div class="brstars">${stars}</div><div class="brin"><div class="brtitle">🧘 Meditate</div>
      <p>Pick a breathing style. Follow the bubble: <b>breathe in</b> as it grows, <b>hold</b> while it stays still, <b>breathe out</b> as it shrinks.</p>
      ${BREATH.map((t, i) => `<button class="brcard" data-i="${i}"><span>${t.icon}</span><div><b>${t.n}</b><small>${t.d} · ${t.cycles} rounds</small></div></button>`).join('')}
      <button class="brskip" data-skip>Skip — just meditate</button><button class="brx-close" data-close>✕</button></div>`;
    el.querySelectorAll('.brcard').forEach(b => b.onclick = () => run(BREATH[+b.dataset.i]));
    el.querySelector('[data-skip]').onclick = () => { const fx = brFinish(BREATH[0], false); outro(BREATH[0], fx, false); };
    el.querySelector('[data-close]').onclick = brClose;
  };
  const outro = (tech, fx, done) => {
    cancelAnimationFrame(brRaf); brTone(false, 160);
    el.innerHTML = `<div class="brstars">${stars}</div><div class="brin"><div class="brbubble done"></div><div class="brtitle">${done ? 'Session complete' : 'Meditation done'}</div>
      <p>${done ? 'Your mind is clear and your body is calm.' : 'A quiet moment, taken.'}</p><div class="brfx">${fx.happy ? `😊 +${fx.happy} Happy ` : ''}${fx.health ? `❤️ +${fx.health} Health ` : ''}${fx.smarts ? `🧠 +${fx.smarts} Smarts ` : ''}<br>🍀 +${fx.luck} Luck · ☯️ +${fx.karma} Karma</div>
      <button class="gbtn" data-close>DONE</button></div>`;
    el.querySelector('[data-close]').onclick = brClose;
  };
  const run = (tech) => {
    el.innerHTML = `<div class="brstars">${stars}</div><div class="brstage"><div class="brname">${tech.icon} ${tech.n}</div>
      <div class="brwrap"><svg class="brring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.2"/><circle id="brArc" cx="50" cy="50" r="48" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="301.6" stroke-dashoffset="301.6" transform="rotate(-90 50 50)"/></svg><div class="brbubble" id="brB"><span id="brSec">4</span></div></div>
      <div class="brlabel" id="brL">Get ready…</div><div class="brdots">${Array.from({ length: tech.cycles }, () => '<i></i>').join('')}</div>
      <div class="brbar"><button class="brmini" id="brMute">${brMute ? '🔇' : '🔊'}</button><button class="brskip" id="brSkip">Skip</button></div></div>`;
    const B = el.querySelector('#brB'), L = el.querySelector('#brL'), SEC = el.querySelector('#brSec'), ARC = el.querySelector('#brArc'), dots = [...el.querySelectorAll('.brdots i')];
    el.querySelector('#brMute').onclick = (e) => { brMute = !brMute; e.target.textContent = brMute ? '🔇' : '🔊'; if (brMute) brTone(false, 160); };
    el.querySelector('#brSkip').onclick = () => { const fx = brFinish(tech, false); outro(tech, fx, false); };
    brTone(true, 160);
    const SMALL = 0.42, ease = (x) => x * x * (3 - 2 * x), t0 = performance.now() + 2200;   // 2.2 s settle-in before the first breath
    let last = -1, scale = SMALL;
    const total = tech.ph.reduce((s, p) => s + p[1], 0);
    const frame = (now) => {
      const t = (now - t0) / 1000;
      if (t < 0) { SEC.textContent = Math.ceil(-t); B.style.transform = `scale(${SMALL})`; brRaf = requestAnimationFrame(frame); return; }
      const cyc = Math.floor(t / total);
      if (cyc >= tech.cycles) { const fx = brFinish(tech, true); outro(tech, fx, true); return; }
      let r = t - cyc * total, pi = 0; while (r >= tech.ph[pi][1]) { r -= tech.ph[pi][1]; pi++; }
      const [k, dur] = tech.ph[pi], p = r / dur;
      if (k === 'in') scale = SMALL + (1 - SMALL) * ease(p); else if (k === 'out') scale = 1 - (1 - SMALL) * ease(p);   // hold keeps the size it already has
      const id = cyc * 10 + pi;
      if (id !== last) {
        last = id; L.textContent = BR_TXT[k]; L.className = 'brlabel ' + k; const [c1, c2] = BR_COL[k];
        B.style.setProperty('--c1', c1); B.style.setProperty('--c2', c2); ARC.style.stroke = c1;
        dots.forEach((d, i) => d.className = i < cyc ? 'on' : i === cyc ? 'cur' : '');
        brTone(true, k === 'in' ? 300 : k === 'out' ? 150 : brOsc ? brOsc.frequency.value : 220);
        try { navigator.vibrate && navigator.vibrate(k === 'hold' ? 8 : 18); } catch (e) { /* no haptics */ }
      }
      B.style.transform = `scale(${scale.toFixed(3)})`; B.classList.toggle('holding', k === 'hold');
      SEC.textContent = Math.max(1, Math.ceil(dur - r)); ARC.style.strokeDashoffset = (301.6 * (1 - p)).toFixed(1);
      brRaf = requestAnimationFrame(frame);
    };
    brRaf = requestAnimationFrame(frame);
  };
  document.body.appendChild(el); intro();
}
