async function fetchLiveDataForTicker(symbol) {
  try {
    const targetUrl = `${STREAMLIT_BACKEND_URL}/?ticker=${symbol}`;
    // استعمال Proxy مجاني لتجاوز حظر CORS بين GitHub و Streamlit
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    
    const response = await fetch(proxyUrl);
    const jsonResult = await response.json();
    
    if (jsonResult && jsonResult.contents) {
      const rawText = jsonResult.contents;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.status === "success") {
          const t = tickers.find(item => item.sym === symbol);
          if (t) {
            t.px = data.spot_price;
            if (data.gex_levels && data.gex_levels.length === t.data.length) {
              t.data = data.gex_levels;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching live data via proxy:", error);
  }
}
