/* Hustleville — "run a phone scam" mini game: a cartoon phone call with a silly fictional mark. Pick one of three tactics each
   turn, read how the mark reacts, fill the Convinced bar before Suspicion maxes out. cb(true) won, cb(false) busted, cb(null) skipped. */
'use strict';

const SCAM_MARKS = [
  { n: 'Gullible Gary', e: '🧔', bio: 'Loves a bargain. Terrified of missing out.', pitch: 'the Cheese-of-the-Month Grand Prize', hello: 'Hello? Who is this?', aff: { charm: [14, 4], urg: [26, 2], proof: [16, 3] } },
  { n: 'Suspicious Sue', e: '👵', bio: 'Trusts nobody. Reads every label twice.', pitch: 'an unclaimed inheritance from the Duke of Valmar', hello: 'Yes? Make it quick, I am watching my programs.', aff: { charm: [5, 16], urg: [0, 28], proof: [28, 4] } },
  { n: 'Lonely Larry', e: '🧓', bio: 'Loves to chat. Nobody calls him anymore.', pitch: 'a free luxury yacht (some assembly required)', hello: 'Oh! A phone call! Hello, hello! Who is this?', aff: { charm: [30, 0], urg: [4, 18], proof: [12, 8] } },
  { n: 'Know-it-all Nancy', e: '👩‍💼', bio: 'Thinks she has never been fooled. Loves being right.', pitch: 'a guaranteed investment in singing parrots', hello: 'Whoever you are, I have seen every trick in the book.', aff: { charm: [20, 6], urg: [10, 14], proof: [0, 24] } }
];
const SCAM_OPT = {
  charm: ['😊 Charm', ['You sound like such a wonderful person — I just had to call you first!', 'I am having a great day and wanted to share the luck with someone kind.', 'Between us? You have the friendliest voice I have heard all week.']],
  urg: ['⏰ Urgency', ['This offer ends in ten minutes, then it goes to the next name on my list!', 'I can only hold your prize until the end of today.', 'Three other people are on hold for this. I need a decision now!']],
  proof: ['📋 Official talk', ['My file shows reference code CHZ-7741-B, stamped by the Grand Board.', 'Compliance has already approved everything on my end.', 'It is all documented — I can read you the certified details.']]
};
const SCAM_REPLY = { good: ['Oh wow… that actually sounds right!', 'Hmm, you know, I like the sound of that.', 'Well, when you put it like that…', 'Go on, I am listening!'], ok: ['Hmm. Maybe. Tell me more.', 'I suppose that could be true…', 'Interesting. I am not totally sold yet.'], bad: ['That sounds fishy to me…', 'Wait. Why are you pushing me?', 'Hmm, I am not so sure about this.', 'Are you reading that from a script?'] };
const SCAM_TURNS = 8;
let scEl = null, scTimer = 0;
function scClose() { clearInterval(scTimer); if (scEl) { scEl.remove(); scEl = null; } }
function scBeep(f, d) { try { const a = scBeep.a = scBeep.a || new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02); } catch (e) { /* no audio */ } }

function openScam(cb) {
  scClose();
  const el = scEl = document.createElement('div'); el.className = 'brx scx'; let finished = false;
  const mark = SCAM_MARKS[Math.floor(Math.random() * SCAM_MARKS.length)], luck = 1 + luckAdj() * 0.15;
  let conv = 0, susp = 0, turn = 0, lastT = '', secs = 0;
  const close = () => scClose();
  const end = (ok, title, text, icon) => {
    if (finished) return; finished = true; clearInterval(scTimer); scBeep(ok ? 880 : 200, 0.4); cb(ok);
    el.innerHTML = `<div class="brin"><div class="gyemoji">${icon}</div><div class="brtitle">${title}</div><p>${text}</p><button class="gbtn" data-close>${ok ? 'COUNT THE CASH' : 'CONTINUE'}</button></div>`;
    el.querySelector('[data-close]').onclick = close;
  };
  const skipBtn = `<button class="brskip" data-skip>Skip — improvise</button>`;
  const bindSkip = () => { const s = el.querySelector('[data-skip]'); if (s) s.onclick = () => { if (finished) return; finished = true; clearInterval(scTimer); cb(null); close(); }; };

  const call = () => {
    el.innerHTML = `<div class="brstage"><div class="scid"><span class="scav">${mark.e}</span><div><b>${mark.n}</b><small id="scT">00:00</small></div></div>
      <div class="scbio">📇 ${mark.bio}</div>
      <div class="scbars"><label>🙂 Convinced</label><div class="scbar"><i id="scC" class="c"></i></div><label>🤨 Suspicion</label><div class="scbar"><i id="scS" class="s"></i></div></div>
      <div class="scchat" id="scChat"></div><div class="scturn" id="scTurn"></div><div class="scopts" id="scO"></div><div class="brbar">${skipBtn}</div></div>`;
    bindSkip();
    const chat = el.querySelector('#scChat'), O = el.querySelector('#scO'), C = el.querySelector('#scC'), Sx = el.querySelector('#scS'), TT = el.querySelector('#scTurn');
    scTimer = setInterval(() => { secs++; const m = el.querySelector('#scT'); if (m) m.textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'); }, 1000);
    const bubble = (who, txt) => { const d = document.createElement('div'); d.className = 'scb ' + who; d.textContent = txt; chat.appendChild(d); chat.scrollTop = chat.scrollHeight; };
    const bars = () => { C.style.width = Math.min(100, conv) + '%'; Sx.style.width = Math.min(100, susp) + '%'; };
    const options = () => {
      TT.textContent = `Turn ${turn + 1} of ${SCAM_TURNS}`;
      O.innerHTML = Object.keys(SCAM_OPT).sort(() => Math.random() - 0.5).map(k => { const v = SCAM_OPT[k][1]; return `<button class="scopt" data-k="${k}"><b>${SCAM_OPT[k][0]}</b><span>${v[Math.floor(Math.random() * v.length)]}</span></button>`; }).join('');
      O.querySelectorAll('.scopt').forEach(b => b.onclick = () => pick(b.dataset.k, b.querySelector('span').textContent));
    };
    const pick = (k, line) => {
      if (finished) return; O.innerHTML = ''; bubble('me', line);
      let [g, s] = mark.aff[k]; if (k === lastT) { g *= 0.45; s += 6; bubble('note', 'They noticed you repeating yourself…'); }           // vary your approach
      lastT = k; g = Math.round(g * rnd(0.8, 1.2) * luck); s = Math.round(s * rnd(0.8, 1.2) / luck);
      conv += g; susp += s; turn++; bars(); scBeep(g >= s ? 660 : 260, 0.12);
      const q = g >= 20 ? 'good' : g >= 10 ? 'ok' : 'bad';
      setTimeout(() => {
        bubble('mark', SCAM_REPLY[q][Math.floor(Math.random() * SCAM_REPLY[q].length)]);
        if (conv >= 100) return setTimeout(() => end(true, 'Sold!', `${mark.n} agreed to send the money for ${mark.pitch}. What a performance.`, '💸'), 900);
        if (susp >= 100) return setTimeout(() => end(false, 'They hung up!', `${mark.n} got suspicious and reported the call. The trail leads straight to you.`, '📵'), 900);
        if (turn >= SCAM_TURNS) return setTimeout(() => end(false, 'Out of time', `${mark.n} lost interest and hung up. No deal — and the call was traced.`, '⌛'), 900);
        setTimeout(options, 500);
      }, 650);
    };
    bubble('mark', mark.hello); setTimeout(() => { bubble('me', `Hello! I am calling about ${mark.pitch}!`); setTimeout(() => { bubble('mark', 'Oh? Go on…'); setTimeout(options, 500); }, 700); }, 700);
  };

  const ring = () => {
    el.innerHTML = `<div class="brin"><div class="scring">${mark.e}</div><div class="brtitle">📞 Calling ${mark.n}…</div><p>${mark.bio}</p></div>`;
    let n = 0; const iv = setInterval(() => { scBeep(480, 0.25); if (++n >= 3) { clearInterval(iv); call(); } }, 800); scBeep(480, 0.25);
  };
  const intro = () => {
    el.innerHTML = `<div class="brin"><div class="brtitle">📞 Phone scam</div><p>A cartoonish call with a made-up mark. Each turn, choose <b>one of three tactics</b>. Read how they react — fill the <b>Convinced</b> bar to 100 before <b>Suspicion</b> does. Repeating a tactic works worse.</p>
      <button class="gbtn" data-go>MAKE THE CALL</button>${skipBtn}<button class="brx-close" data-close>✕</button></div>`;
    el.querySelector('[data-go]').onclick = ring; el.querySelector('[data-close]').onclick = close; bindSkip();
  };
  document.body.appendChild(el); intro();
}
