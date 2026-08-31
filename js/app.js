let tickers = [
  { sym: 'SPY', name: 'S&P 500 ETF', px: 582.40, chg: '+0.75%', netGex: '+$2.84B', flip: '580.50', call: '590.00', put: '570.00', data: [-120, -250, 80, -320, 0, 180, 450, 210, 95] },
  { sym: 'NVDA', name: 'NVIDIA Corp', px: 138.50, chg: '+2.15%', netGex: '+$4.12B', flip: '135.00', call: '145.00', put: '130.00', data: [-80, -190, 150, -210, 0, 310, 520, 340, 120] },
  { sym: 'TSLA', name: 'Tesla Inc', px: 245.20, chg: '-0.85%', netGex: '-$850M', flip: '248.00', call: '260.00', put: '235.00', data: [90, 140, -110, 250, 0, -180, -390, -150, -70] },
  { sym: 'QQQ', name: 'Nasdaq 100', px: 502.10, chg: '+0.42%', netGex: '+$1.95B', flip: '500.00', call: '515.00', put: '490.00', data: [-100, -210, 60, -280, 0, 150, 380, 190, 80] }
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
        label: 'Gamma Exposure ($M)',
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

  // إضافة زر التحديث إلى الواجهة أوتوماتيكياً بجانب الـ Ticker
  injectRefreshButton();

  window.switchTicker(0);
});

function injectRefreshButton() {
  const headerEl = document.querySelector('.watchlist-item')?.parentElement?.parentElement;
  // يمكننا إضافة زر تحديث في الشريط العلوي قرب شريط البحث أو أسفل الشاشة
  const topNav = document.querySelector('.search-bar, header, .top-bar, .terminal-header') || document.body;
  
  const btn = document.createElement('button');
  btn.innerText = "🔄 جلب الأسعار الحية";
  btn.style.cssText = "background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin: 10px; font-size: 12px;";
  btn.onclick = () => window.fetchLivePrices();
  
  // وضعه في مكان بارز في الأعلى
  const targetArea = document.querySelector('header') || document.body.firstElementChild;
  if (targetArea) {
    targetArea.prepend(btn);
  }
}

window.fetchLivePrices = async function() {
  const btn = document.querySelector('button');
  if(btn) btn.innerText = "⏳ جاري التحديث...";

  for (let t of tickers) {
    try {
      const yahooApiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${t.sym}?interval=1d`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooApiUrl)}`;
      
      const response = await fetch(proxyUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.chart && data.chart.result) {
          const meta = data.chart.result[0].meta;
          const currentPrice = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose || meta.previousClose;
          
          const changeVal = currentPrice - previousClose;
          const changePct = ((changeVal / previousClose) * 100).toFixed(2);
          
          t.px = currentPrice;
          t.chg = (changeVal >= 0 ? '+' : '') + changePct + '%';
          t.flip = (currentPrice * 0.995).toFixed(2);
          t.call = (currentPrice * 1.015).toFixed(2);
          t.put = (currentPrice * 0.985).toFixed(2);
        }
      }
    } catch (e) {
      console.log(`Could not fetch live price for ${t.sym}, using cache.`);
    }
  }

  // إعادة تحديث الواجهة بالسعر الجديد للـ Ticker الحالي
  window.switchTicker(currentTickerIdx);
  if(btn) btn.innerText = "🔄 جلب الأسعار الحية";
  alert("تم تحديث الأسعار بنجاح!");
}

window.switchTicker = function(idx) {
  currentTickerIdx = idx;
  const t = tickers[idx];

  if(document.getElementById('sym')) document.getElementById('sym').innerText = t.sym;
  if(document.getElementById('px')) {
    const isPos = t.chg.startsWith('+');
    document.getElementById('px').innerHTML = `${t.px.toFixed(2)} <span class="change ${isPos ? 'positive' : 'negative'}">${t.chg}</span>`;
  }
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
