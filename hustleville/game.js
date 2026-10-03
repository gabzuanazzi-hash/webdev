const state = { cash: 12480, perTap: 1, perSec: 3 };

const cashEl = document.getElementById('cash');
const coin = document.getElementById('coin');

const render = () => { cashEl.textContent = '$' + Math.floor(state.cash).toLocaleString(); };

function earn() {
  state.cash += state.perTap;
  render();
}

function pop(e) {
  const p = document.createElement('div');
  p.className = 'pop';
  p.textContent = '+$' + state.perTap;
  const box = coin.parentElement.getBoundingClientRect();
  p.style.left = (e.clientX - box.left) + 'px';
  p.style.top = (e.clientY - box.top - 20) + 'px';
  coin.parentElement.appendChild(p);
  setTimeout(() => p.remove(), 800);
}

coin.addEventListener('click', (e) => { earn(); pop(e); });
document.getElementById('go').addEventListener('click', () => coin.click());

setInterval(() => { state.cash += state.perSec; render(); }, 1000);
render();
