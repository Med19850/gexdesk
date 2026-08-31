let tickers = [
  { sym: 'SPY', name: 'S&P 500 ETF', px: 582.40, chg: '+0.75%', netGex: '+$2.84B', vanna: '+$142M', io: '4.2M', vol: '1.2M', flow: 'Call', flip: '580.50', call: '590.00', put: '570.00', data: [-120, -250, 80, -320, 0, 180, 450, 210, 95] },
  { sym: 'NVDA', name: 'NVIDIA Corp', px: 138.50, chg: '+2.15%', netGex: '+$4.12B', vanna: '+$210M', io: '8.5M', vol: '3.4M', flow: 'Call', flip: '135.00', call: '145.00', put: '130.00', data: [-80, -190, 150, -210, 0, 310, 520, 340, 120] },
  { sym: 'TSLA', name: 'Tesla Inc', px: 245.20, chg: '-0.85%', netGex: '-$850M', vanna: '-$65M', io: '6.1M', vol: '2.1M', flow: 'Put', flip: '248.00', call: '260.00', put: '235.00', data: [90, 140, -110, 250, 0, -180, -390, -150, -70] },
  { sym: 'QQQ', name: 'Nasdaq 100', px: 502.10, chg: '+0.42%', netGex: '+$1.95B', vanna: '+$95M', io: '3.3M', vol: '980K', flow: 'Call', flip: '500.00', call: '515.00', put: '490.00', data: [-100, -210, 60, -280, 0, 150, 380, 190, 80] }
];

let currentTickerIdx = 0;
let currentMetric = 'gex';
let currentTenor = 'all';
let mainChart;

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById('mainChart').getContext('2d');
  mainChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['-5%', '-3%', '-1%', 'Flip', 'Spot', '+1%', '+3%', '+5%'],
      datasets: [{
        label: 'Exposure Metrics ($M)',
        data: tickers[0].data,
        backgroundColor: context => context.raw < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)',
        borderColor: context => context.raw < 0 ? '#ef4444' : '#10b981',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(38, 51, 77, 0.3)' }, ticks: { color: '#9ca3af', font: { size: 9 } } },
        y: { grid: { color: 'rgba(38, 51, 77, 0.3)' }, ticks: { color: '#9ca3af', font: { size: 9 } } }
      }
    }
  });

  injectAdvancedToolbar();
  window.switchTicker(0);
});

function injectAdvancedToolbar() {
  const targetArea = document.querySelector('header') || document.body.firstElementChild;
  if (!targetArea) return;

  const container = document.createElement('div');
  container.style.cssText = "display: flex; gap: 10px; padding: 8px 15px; background: #131b2e; align-items: center; border-bottom: 1px solid #222d42;";
  
  const btn = document.createElement('button');
  btn.innerText = "🔄 جلب الأسعار الحية";
  btn.style.cssText = "background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px;";
  btn.onclick = () => window.fetchLivePrices();

  container.appendChild(btn);
  targetArea.prepend(container);
}

window.fetchLivePrices = async function() {
  for (let t of tickers) {
    try {
      const yahooApiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${t.sym}?interval=1d`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooApiUrl)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const data = await response.json();
        if (data?.chart?.result) {
          const meta = data.chart.result[0].meta;
          const currentPrice = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || meta.previousClose;
          const changeVal = currentPrice - prevClose;
          const changePct = ((changeVal / prevClose) * 100).toFixed(2);
          
          t.px = currentPrice;
          t.chg = (changeVal >= 0 ? '+' : '') + changePct + '%';
        }
      }
    } catch (e) {
      console.log(`Using cached data for ${t.sym}`);
    }
  }
  window.switchTicker(currentTickerIdx);
  alert("تم تحديث بيانات السوق بنجاح!");
}

window.switchTicker = function(idx) {
  currentTickerIdx = idx;
  const t = tickers[idx];

  if(document.getElementById('sym')) document.getElementById('sym').innerText = t.sym;
  if(document.getElementById('px')) {
    const isPos = t.chg.startsWith('+');
    document.getElementById('px').innerHTML = `${t.px.toFixed(2)} <span class="change ${isPos ? 'positive' : 'negative'}">${t.chg}</span>`;
  }
  
  // تحديث المستويات والتحليلات المتقدمة في اللوحة الجانبية
  if(document.getElementById('lvl-flip')) document.getElementById('lvl-flip').innerText = t.flip;
  if(document.getElementById('lvl-call')) document.getElementById('lvl-call').innerText = t.call;
  if(document.getElementById('lvl-put')) document.getElementById('lvl-put').innerText = t.put;

  document.querySelectorAll('.watchlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  if (mainChart) {
    mainChart.data.datasets[0].data = [...t.data];
    mainChart.update();
  }
}

window.setMetric = function(m) {
  currentMetric = m;
  document.querySelectorAll('#metricSeg button').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(m)));
}

window.setTenor = function(t) {
  currentTenor = t;
  document.querySelectorAll('#tenorSeg button').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(t)));
}

window.runScenario = function(pct) {
  const t = tickers[currentTickerIdx];
  const shifted = t.data.map(val => Math.round(val * (1 + pct * 2)));
  if (mainChart) {
    mainChart.data.datasets[0].data = shifted;
    mainChart.update();
  }
}

window.togglePanel = function(side) {
  const shell = document.getElementById('shell');
  if (!shell) return;
  if (side === 'left') shell.classList.toggle('collapse-left');
  else if (side === 'right') shell.classList.toggle('collapse-right');
}

window.toggleTheme = function() {
  document.body.classList.toggle('light-theme');
}

window.openCommandPalette = function() {
  const modal = document.getElementById('cmdModal');
  const input = document.getElementById('cmdInput');
  if(modal) modal.style.display = 'flex';
  if(input) input.focus();
}

window.closeCommandPalette = function(e) {
  if(!e || e.target.id === 'cmdModal') {
    const modal = document.getElementById('cmdModal');
    if(modal) modal.style.display = 'none';
  }
}

window.selectCommand = function(cmd) {
  if(cmd === 'TOGGLE_THEME') {
    window.toggleTheme();
  } else {
    const idx = tickers.findIndex(t => t.sym === cmd);
    if(idx !== -1) window.switchTicker(idx);
  }
  window.closeCommandPalette();
}

window.filterCommands = function() {
  const query = document.getElementById('cmdInput').value.toUpperCase();
  document.querySelectorAll('.modal-item').forEach(item => {
    item.style.display = item.innerText.toUpperCase().includes(query) ? 'flex' : 'none';
  });
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    window.openCommandPalette();
  }
  if (e.key >= '1' && e.key <= '4') {
    const idx = parseInt(e.key) - 1;
    if(tickers[idx]) window.switchTicker(idx);
  }
  if (e.key === 'Escape') {
    const modal = document.getElementById('cmdModal');
    if(modal) modal.style.display = 'none';
  }
});
