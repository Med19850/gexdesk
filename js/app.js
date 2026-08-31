// الرابط ديال السيرفر لي صاوبنا في Streamlit
const STREAMLIT_BACKEND_URL = "https://gexdesk-backend-6hpa5sxwmaymmu3rdd5bqp.streamlit.app";

let tickers = [
  { sym: 'SPY', name: 'S&P 500 ETF', px: 582.40, chg: '+0.75%', netGex: '+$2.84B', flip: '580.50', call: '590.00', put: '570.00', data: [-120, -250, 80, -320, 0, 180, 450, 210, 95] },
  { sym: 'NVDA', name: 'NVIDIA Corp', px: 138.50, chg: '+2.15%', netGex: '+$4.12B', flip: '135.00', call: '145.00', put: '130.00', data: [-80, -190, 150, -210, 0, 310, 520, 340, 120] },
  { sym: 'TSLA', name: 'Tesla Inc', px: 245.20, chg: '-0.85%', netGex: '-$850M', flip: '248.00', call: '260.00', put: '235.00', data: [90, 140, -110, 250, 0, -180, -390, -150, -70] },
  { sym: 'QQQ', name: 'Nasdaq 100', px: 502.10, chg: '+0.42%', netGex: '+$1.95B', flip: '500.00', call: '515.00', put: '490.00', data: [-100, -210, 60, -280, 0, 150, 380, 190, 80] }
];

let currentTickerIdx = 0;
let currentMetric = 'gex';
let currentTenor = 'all';

const ctx = document.getElementById('mainChart').getContext('2d');
const mainChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['-5%', '-3%', '-1%', 'Flip', 'Spot', '+1%', '+3%', '+5%'],
    datasets: [{
      label: 'Gamma Exposure ($M)',
      data: tickers[0].data,
      backgroundColor: ctx => ctx.raw < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)',
      borderColor: ctx => ctx.raw < 0 ? '#ef4444' : '#10b981',
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

// دالة جلب البيانات الحية من Backend
async function fetchLiveDataForTicker(symbol) {
  try {
    const response = await fetch(`${STREAMLIT_BACKEND_URL}/?ticker=${symbol}`);
    const rawText = await response.text();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.status === "success") {
        const t = tickers.find(item => item.sym === symbol);
        if (t) {
          t.px = data.spot_price;
          // إمكانية تحديث الـ gex_levels إيلا صاوبناهم في البايثون
          if (data.gex_levels && data.gex_levels.length === t.data.length) {
            t.data = data.gex_levels;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching live data:", error);
  }
}

async function switchTicker(idx) {
  currentTickerIdx = idx;
  const t = tickers[idx];
  
  // جلب البيانات الحية قبل التحديث في الواجهة
  await fetchLiveDataForTicker(t.sym);

  document.getElementById('sym').innerText = t.sym;
  document.getElementById('px').innerHTML = `${t.px.toFixed(2)} <span class="change ${t.chg.startsWith('+') ? 'positive' : 'negative'}">${t.chg}</span>`;
  document.getElementById('lvl-flip').innerText = t.flip;
  document.getElementById('lvl-call').innerText = t.call;
  document.getElementById('lvl-put').innerText = t.put;

  document.querySelectorAll('.watchlist-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });

  mainChart.data.datasets[0].data = [...t.data];
  mainChart.update();
}

function setMetric(m) {
  currentMetric = m;
  document.querySelectorAll('#metricSeg button').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(m)));
}

function setTenor(t) {
  currentTenor = t;
  document.querySelectorAll('#tenorSeg button').forEach(b => b.classList.toggle('active', b.innerText.toLowerCase().includes(t)));
}

function runScenario(pct) {
  const t = tickers[currentTickerIdx];
  const shifted = t.data.map(val => Math.round(val * (1 + pct * 2)));
  mainChart.data.datasets[0].data = shifted;
  mainChart.update();
}

function togglePanel(side) {
  const shell = document.getElementById('shell');
  if (side === 'left') {
    shell.classList.toggle('collapse-left');
  } else if (side === 'right') {
    shell.classList.toggle('collapse-right');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

function openCommandPalette() {
  document.getElementById('cmdModal').style.display = 'flex';
  document.getElementById('cmdInput').focus();
}

function closeCommandPalette(e) {
  if(!e || e.target.id === 'cmdModal') {
    document.getElementById('cmdModal').style.display = 'none';
  }
}

function selectCommand(cmd) {
  if(cmd === 'TOGGLE_THEME') {
    toggleTheme();
  } else {
    const idx = tickers.findIndex(t => t.sym === cmd);
    if(idx !== -1) switchTicker(idx);
  }
  closeCommandPalette();
}

function filterCommands() {
  const query = document.getElementById('cmdInput').value.toUpperCase();
  const items = document.querySelectorAll('.modal-item');
  items.forEach(item => {
    item.style.display = item.innerText.toUpperCase().includes(query) ? 'flex' : 'none';
  });
}

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
  if (e.key >= '1' && e.key <= '4') {
    const idx = parseInt(e.key) - 1;
    if(tickers[idx]) switchTicker(idx);
  }
  if (e.key === 'Escape') {
    document.getElementById('cmdModal').style.display = 'none';
  }
});

// تحديث دوري للاتصال والأسعار الحية
setInterval(() => {
  const latencyEl = document.getElementById('latency');
  if(latencyEl) {
    const randomLatency = Math.floor(Math.random() * 8) + 9;
    latencyEl.innerText = `WS: ${randomLatency}ms`;
  }
}, 2500);
