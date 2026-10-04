/* Hustleville — jewelry store heist mini game: pick the lock (3 pins, timing), then smash the showcase and grab the
   diamond before the alarm. Calls cb(true) on a clean job, cb(false) when the alarm wins, cb(null) when skipped. Loaded before game.js. */
'use strict';

let htEl = null, htRaf = 0, htAudio = null;
function htClose() { cancelAnimationFrame(htRaf); document.removeEventListener('keydown', htKey); try { htAudio && htAudio.close(); } catch (e) { /* ignore */ } htAudio = null; if (htEl) { htEl.remove(); htEl = null; } }
let htKey = () => {};
function htSfx(kind) {
  try {
    htAudio = htAudio || new (window.AudioContext || window.webkitAudioContext)(); const a = htAudio, t = a.currentTime, g = a.createGain(); g.connect(a.destination);
    if (kind === 'smash') { const n = a.createBufferSource(), buf = a.createBuffer(1, a.sampleRate * 0.35, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); n.buffer = buf; g.gain.value = 0.35; n.connect(g); n.start(t); return; }
    const o = a.createOscillator(); o.connect(g);
    const S2 = { click: [1800, 0.06, 'square', 0.07], pin: [900, 0.12, 'triangle', 0.12], snap: [180, 0.2, 'sawtooth', 0.12], alarm: [740, 0.18, 'square', 0.08], win: [1320, 0.35, 'sine', 0.12] }[kind] || [800, 0.1, 'sine', 0.1];
    o.type = S2[2]; o.frequency.setValueAtTime(S2[0], t); if (kind === 'win') o.frequency.exponentialRampToValueAtTime(2000, t + 0.3); g.gain.setValueAtTime(S2[3], t); g.gain.exponentialRampToValueAtTime(0.001, t + S2[1]); o.start(t); o.stop(t + S2[1] + 0.02);
  } catch (e) { /* audio unavailable */ }
}

function openHeist(cb) {
  htClose();
  const el = htEl = document.createElement('div'); el.className = 'brx htx'; let finished = false;
  const lucky = 1 + luckAdj() * 0.3;                                    // good luck = wider sweet spots, longer alarm fuse
  const end = (ok, title, text, icon) => {
    if (finished) return; finished = true; cancelAnimationFrame(htRaf); document.removeEventListener('keydown', htKey);
    htSfx(ok ? 'win' : 'alarm'); cb(ok);
    el.innerHTML = `<div class="brin"><div class="gyemoji">${icon}</div><div class="brtitle">${title}</div><p>${text}</p><button class="gbtn" data-close>${ok === true ? 'ESCAPE' : 'CONTINUE'}</button></div>`;
    el.querySelector('[data-close]').onclick = htClose;
  };
  const skipBtn = `<button class="brskip" data-skip>Skip — wing it</button>`, bindSkip = () => { const s = el.querySelector('[data-skip]'); if (s) s.onclick = () => { if (finished) return; finished = true; cancelAnimationFrame(htRaf); document.removeEventListener('keydown', htKey); cb(null); htClose(); }; };

  /* ---- stage 1: lock pick ---- */
  const lockStage = () => {
    const pins = 3, zones = [0.24, 0.18, 0.13].map(w => w * lucky), speeds = [0.9, 1.25, 1.6]; let pin = 0, picks = 3, ph = 0, zc = 0.5, set = 0, last = performance.now(), dead = false;
    el.innerHTML = `<div class="brstage"><div class="brname">🔓 Pick the lock</div><p class="htp">Tap <b>PICK</b> when the marker is in the green zone. Set all 3 pins.</p>
      <svg class="htlock" viewBox="0 0 220 150"><rect x="20" y="30" width="180" height="90" rx="14" fill="#6b7384" stroke="#c9d0dc" stroke-width="3"/><circle cx="110" cy="96" r="0"/>
        ${[0, 1, 2].map(i => `<g class="htpin" id="htp${i}"><rect x="${54 + i * 46}" y="50" width="26" height="30" rx="4" fill="#2a2f3a"/><rect x="${60 + i * 46}" y="58" width="14" height="22" rx="3" fill="#e0b84a" class="htpinr"/></g>`).join('')}
        <line x1="26" y1="46" x2="194" y2="46" stroke="#ff5a5a" stroke-width="1.5" stroke-dasharray="4 4"/><rect x="38" y="96" width="144" height="14" rx="7" fill="#222"/>
        <g id="htpick"><rect x="40" y="99" width="120" height="5" rx="2.5" fill="#d7dde8"/><rect x="152" y="96" width="30" height="11" rx="5" fill="#8e3b2b"/></g></svg>
      <div class="httrack"><i class="htzone" id="htZ"></i><b class="htmark" id="htM"></b></div>
      <div class="htpicks" id="htPk">🔧🔧🔧</div><button class="gytap htbtn" id="htBtn">PICK</button><div class="brbar">${skipBtn}</div></div>`;
    bindSkip();
    const Z = el.querySelector('#htZ'), M = el.querySelector('#htM'), PK = el.querySelector('#htPk');
    const newZone = () => { zc = 0.15 + Math.random() * 0.7; Z.style.left = ((zc - zones[pin] / 2) * 100) + '%'; Z.style.width = (zones[pin] * 100) + '%'; };
    newZone();
    const press = () => {
      if (dead || finished) return; const x = (1 - Math.cos(ph)) / 2;
      if (Math.abs(x - zc) <= zones[pin] / 2) {
        htSfx('pin'); const g = el.querySelector('#htp' + pin); g.classList.add('set'); try { navigator.vibrate && navigator.vibrate(15); } catch (e) { /* none */ }
        pin++; if (pin >= pins) { dead = true; htSfx('win'); setTimeout(() => smashStage(), 900); el.querySelector('.htp').textContent = '🔓 Click — the door swings open…'; return; }
        newZone();
      } else {
        htSfx('snap'); picks--; PK.textContent = '🔧'.repeat(Math.max(0, picks)) + '💥'.repeat(3 - picks); el.querySelector('#htpick').classList.add('snap'); setTimeout(() => { const p = el.querySelector('#htpick'); p && p.classList.remove('snap'); }, 400);
        if (picks <= 0) { dead = true; setTimeout(() => end(false, '🚨 Alarm!', 'Your last pick snapped and the silent alarm went off.', '🚨'), 500); }
      }
    };
    el.querySelector('#htBtn').onpointerdown = (e) => { e.preventDefault(); press(); };
    htKey = (e) => { if (e.code === 'Space') { e.preventDefault(); press(); } }; document.addEventListener('keydown', htKey);
    const frame = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!dead) ph += dt * Math.PI * speeds[Math.min(pin, 2)] * 1.3; M.style.left = ((1 - Math.cos(ph)) / 2 * 100) + '%'; if (!finished) htRaf = requestAnimationFrame(frame); };
    htRaf = requestAnimationFrame(frame);
  };

  /* ---- stage 2: smash the case, grab the diamond ---- */
  const smashStage = () => {
    document.removeEventListener('keydown', htKey); let state = 0, t1 = 0; const fuse = 2400 * lucky;
    el.innerHTML = `<div class="brstage"><div class="brname">💎 The showcase</div><p class="htp" id="htT">Tap the glass to <b>smash</b> it.</p>
      <div class="htcase" id="htCase"><svg viewBox="0 0 200 200"><rect x="40" y="150" width="120" height="36" rx="6" fill="#3a2f55" stroke="#7d6bb0" stroke-width="2"/>
        <g id="htDia" class="htdia"><polygon points="100,62 128,86 100,140 72,86" fill="#7be7ff" stroke="#fff" stroke-width="3"/><polygon points="72,86 128,86 100,62" fill="#d7f6ff"/><polygon points="72,86 100,86 100,140" fill="#4fc0e8"/></g>
        <rect id="htGlass" x="46" y="40" width="108" height="112" rx="8" fill="rgba(160,220,255,.18)" stroke="rgba(220,245,255,.8)" stroke-width="3"/><g id="htCracks" stroke="#fff" stroke-width="2" fill="none" opacity="0"><path d="M100 90 L70 55 M100 90 L140 60 M100 90 L148 120 M100 90 L58 125 M100 90 L100 150 M70 55 L52 62 M148 120 L152 100"/></g></svg>
        <div class="htflash" id="htFl"></div></div>
      <div class="htfuse" id="htFu" style="opacity:0"><i id="htFi"></i></div><button class="gytap htbtn" id="htBtn2">SMASH</button><div class="brbar">${skipBtn}</div></div>`;
    bindSkip();
    const T = el.querySelector('#htT'), BTN = el.querySelector('#htBtn2'), Fi = el.querySelector('#htFi'), Fu = el.querySelector('#htFu');
    const tap = (e) => {
      if (e) e.preventDefault(); if (finished) return; const now = performance.now();
      if (state === 0) {
        state = 1; t1 = now; htSfx('smash'); try { navigator.vibrate && navigator.vibrate([40, 30, 60]); } catch (x) { /* none */ }
        el.querySelector('#htGlass').style.opacity = '0'; el.querySelector('#htCracks').style.opacity = '1'; el.querySelector('#htCase').classList.add('broken');
        T.innerHTML = '🚨 <b>GRAB IT!</b> Tap again before the cops arrive!'; BTN.textContent = 'GRAB'; Fu.style.opacity = 1;
        const loop = (n) => { const left = 1 - (n - t1) / fuse; Fi.style.width = Math.max(0, left * 100) + '%'; if (Math.floor((n - t1) / 280) % 2 === 0 && Math.floor((n - t1 - 16) / 280) % 2 !== 0) htSfx('alarm');
          if (state === 1 && left <= 0) { state = 3; end(false, '🚨 Too slow!', 'The alarm blared and the cops were on you before you could grab it.', '🚔'); return; } if (state === 1) htRaf = requestAnimationFrame(loop); };
        htRaf = requestAnimationFrame(loop);
      } else if (state === 1 && now - t1 > 220) {
        state = 2; cancelAnimationFrame(htRaf); el.querySelector('#htDia').classList.add('grab'); htSfx('win');
        setTimeout(() => end(true, '💎 Got it!', 'You snatched the diamond and slipped out into the night.', '💎'), 700);
      }
    };
    BTN.onpointerdown = tap; el.querySelector('#htCase').onpointerdown = tap;
    htKey = (e) => { if (e.code === 'Space') tap(e); }; document.addEventListener('keydown', htKey);
  };

  const intro = () => {
    el.innerHTML = `<div class="brin"><div class="brtitle">💎 Jewelry store heist</div><p>Two steps: <b>pick the lock</b> with perfect timing, then <b>tap once to smash</b> the showcase and <b>tap again to grab</b> the diamond before the alarm.</p>
      <button class="gbtn" data-go>START THE JOB</button>${skipBtn}<button class="brx-close" data-close>✕</button></div>`;
    el.querySelector('[data-go]').onclick = lockStage; el.querySelector('[data-close]').onclick = htClose; bindSkip();
  };
  document.body.appendChild(el); intro();
}
