import { useMemo, useState, useEffect } from "react";
import "./App.css";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const stocks = [
  { name: "Apple", ticker: "AAPL", sector: "Technology", price: 175.43, change: 1.18, popularity: 98 },
  { name: "Microsoft", ticker: "MSFT", sector: "Technology", price: 343.8, change: -0.92, popularity: 95 },
  { name: "NVIDIA", ticker: "NVDA", sector: "Technology", price: 949.5, change: 2.35, popularity: 99 },
  { name: "Salesforce", ticker: "CRM", sector: "Technology", price: 248.6, change: -2.36, popularity: 74 },
  { name: "Visa", ticker: "V", sector: "Finance", price: 278.4, change: 0.11, popularity: 83 },
  { name: "Exxon Mobil", ticker: "XOM", sector: "Energy", price: 117.3, change: -0.32, popularity: 65 },
  { name: "Chevron", ticker: "CVX", sector: "Energy", price: 156.4, change: 0.27, popularity: 62 },
  { name: "Enphase Energy", ticker: "ENPH", sector: "Energy", price: 60.5, change: 13.84, popularity: 88 },
  { name: "NextEra Energy", ticker: "NEE", sector: "Energy", price: 73.4, change: 1.12, popularity: 59 },
  { name: "Shell", ticker: "SHEL", sector: "Energy", price: 71.6, change: -0.48, popularity: 61 },
  { name: "Airbnb", ticker: "ABNB", sector: "Travel", price: 147.2, change: 1.44, popularity: 78 },
  { name: "Delta Air Lines", ticker: "DAL", sector: "Travel", price: 51.8, change: -0.73, popularity: 58 },
  { name: "Booking Holdings", ticker: "BKNG", sector: "Travel", price: 3820.1, change: 0.84, popularity: 68 },
  { name: "Marriott", ticker: "MAR", sector: "Travel", price: 238.9, change: 0.36, popularity: 57 },
  { name: "Carnival", ticker: "CCL", sector: "Travel", price: 16.2, change: -1.82, popularity: 63 },
  { name: "UnitedHealth", ticker: "UNH", sector: "Healthcare", price: 512.9, change: 1.05, popularity: 76 },
  { name: "Pfizer", ticker: "PFE", sector: "Healthcare", price: 28.4, change: -0.22, popularity: 64 },
  { name: "Johnson & Johnson", ticker: "JNJ", sector: "Healthcare", price: 148.7, change: 0.41, popularity: 71 },
  { name: "Eli Lilly", ticker: "LLY", sector: "Healthcare", price: 825.3, change: 1.9, popularity: 86 },
  { name: "Moderna", ticker: "MRNA", sector: "Healthcare", price: 134.5, change: -2.45, popularity: 60 },
  { name: "JPMorgan", ticker: "JPM", sector: "Finance", price: 198.4, change: 0.72, popularity: 84 },
  { name: "Bank of America", ticker: "BAC", sector: "Finance", price: 38.7, change: -0.41, popularity: 72 },
  { name: "Goldman Sachs", ticker: "GS", sector: "Finance", price: 463.2, change: 0.68, popularity: 66 },
  { name: "PayPal", ticker: "PYPL", sector: "Finance", price: 62.9, change: -0.7, popularity: 73 },
  { name: "Amazon", ticker: "AMZN", sector: "E-Commerce", price: 3275.1, change: 0.45, popularity: 92 },
  { name: "Alibaba", ticker: "BABA", sector: "E-Commerce", price: 78.2, change: -0.88, popularity: 70 },
  { name: "Shopify", ticker: "SHOP", sector: "E-Commerce", price: 64.4, change: 1.7, popularity: 80 },
  { name: "MercadoLibre", ticker: "MELI", sector: "E-Commerce", price: 1680.8, change: 2.02, popularity: 67 },
  { name: "eBay", ticker: "EBAY", sector: "E-Commerce", price: 52.1, change: -0.36, popularity: 55 },
  { name: "Nike", ticker: "NKE", sector: "Consumer Goods", price: 93.5, change: 0.58, popularity: 70 },
  { name: "Coca-Cola", ticker: "KO", sector: "Consumer Goods", price: 62.1, change: 0.18, popularity: 75 },
  { name: "PepsiCo", ticker: "PEP", sector: "Consumer Goods", price: 171.3, change: -0.12, popularity: 69 },
  { name: "Procter & Gamble", ticker: "PG", sector: "Consumer Goods", price: 164.8, change: 0.39, popularity: 66 },
  { name: "Costco", ticker: "COST", sector: "Consumer Goods", price: 812.4, change: 0.95, popularity: 82 },
  { name: "Peloton", ticker: "PTON", sector: "Health & Fitness", price: 4.1, change: -2.1, popularity: 55 },
  { name: "Lululemon", ticker: "LULU", sector: "Health & Fitness", price: 337.6, change: 0.92, popularity: 67 },
  { name: "Planet Fitness", ticker: "PLNT", sector: "Health & Fitness", price: 68.9, change: 1.21, popularity: 52 },
  { name: "Garmin", ticker: "GRMN", sector: "Health & Fitness", price: 162.2, change: 0.77, popularity: 54 },
  { name: "DexCom", ticker: "DXCM", sector: "Health & Fitness", price: 121.3, change: -1.1, popularity: 56 },
];

const holdings = [
  { ticker: "AAPL", name: "Apple Inc.", qty: 25, change: 1.18, price: 175.43, value: 4385.75, unrealised: 730.75, realised: 120.5 },
  { ticker: "MSFT", name: "Microsoft Corp.", qty: 15, change: -0.92, price: 343.8, value: 5157.0, unrealised: 670.5, realised: 88.2 },
  { ticker: "TSLA", name: "Tesla Inc.", qty: 8, change: -1.24, price: 225.92, value: 1807.36, unrealised: -43.36, realised: 210.0 },
  { ticker: "AMZN", name: "Amazon.com", qty: 5, change: 0.45, price: 3275.1, value: 16375.5, unrealised: 875.5, realised: 0 },
];

const metricInfo = [
  {
    key: "price",
    name: "Price",
    tag: "Market data",
    value: "$175.43",
    short: "What you pay for one share right now.",
    detail: "Think of stock price like the price tag on a product at a store. If Apple's stock is $175, that's how much it costs to buy one tiny slice of the company. But here's the important thing: a high price doesn't mean a stock is expensive, and a low price doesn't mean it's cheap. A $5 stock can be overpriced, and a $1,000 stock can be a bargain. Price only becomes meaningful when you compare it to what the company actually earns (that's where P/E Ratio comes in).",
    visual: "line",
    yf: "info['currentPrice']",
    vizPrompt: "A 1-year line chart with the price moving up and down like a heartbeat. Shade the area below the line in light green. Mark today's price with a glowing dot.",
  },
  {
    key: "pe",
    name: "P/E Ratio",
    tag: "Valuation",
    value: "28.4",
    short: "How much you pay for every $1 the company earns.",
    detail: "P/E stands for Price-to-Earnings. Here's the simplest way to think about it: if a company earns $1 of profit per share, and the stock costs $28, the P/E is 28. You're paying $28 for every $1 of profit. Is that a lot? The average for the S&P 500 is around 20–25. Tech companies often have higher P/E (like 40–60) because people expect them to grow fast. A very low P/E can mean the stock is cheap — or that something is wrong. Always compare P/E with other companies in the same industry, not across different sectors.",
    visual: "scale",
    yf: "info['trailingPE']",
    vizPrompt: "A horizontal number line from 0 to 60 with coloured zones: green (0-12 'Cheap?'), grey (12-25 'Fair'), amber (25-40 'Premium'), red (40+ 'Very expensive'). A dot marks the current P/E. A second dot marks S&P 500 average at 22.",
  },
  {
    key: "marketCap",
    name: "Market Cap",
    tag: "Company size",
    value: "$2.8T",
    short: "The total value of the whole company on the market.",
    detail: "Market Cap = Stock Price × Total Number of Shares. If Apple has 15 billion shares and each is worth $175, the market cap is about $2.6 trillion — meaning the market values the entire company at $2.6 trillion. It's like asking 'how much would it cost to buy the whole company?'. Large-cap companies (above $10 billion) like Apple or Microsoft are usually more stable and predictable. Small-cap companies (under $2 billion) can grow much faster but can also crash harder. This is how stock market indexes like the S&P 500 decide which companies to include.",
    visual: "bubble",
    yf: "info['marketCap']",
    vizPrompt: "Three bubbles side by side growing in size: small (Small Cap <$2B), medium (Mid Cap $2-10B), large (Large Cap $10B+). The current stock's bubble is highlighted. Labels inside each bubble.",
  },
  {
    key: "volume",
    name: "Volume",
    tag: "Market activity",
    value: "58.2M",
    short: "How many shares were bought and sold today.",
    detail: "Volume tells you how busy the trading was today. If NVIDIA normally trades 40 million shares per day and today it traded 120 million — that's a signal that something big is happening (maybe earnings news, a big analyst upgrade, or a major announcement). On its own, volume doesn't tell you if the stock will go up or down. But combined with a price move, it's very telling: if the price jumps up AND volume is 3× normal, that move is probably real and backed by a lot of buyers. If the price jumps but volume is low, the move might reverse tomorrow.",
    visual: "bars",
    yf: "info['volume'] and info['averageVolume']",
    vizPrompt: "A 90-day bar chart of daily volume. Bars coloured teal when price went up that day, coral when it went down. A dashed horizontal line shows the 90-day average. Days with 2× average volume get a small star above.",
  },
  {
    key: "dividend",
    name: "Dividend Yield",
    tag: "Income",
    value: "0.6%",
    short: "Yearly cash the company pays you just for holding the stock.",
    detail: "Some companies share their profits with shareholders by paying dividends — regular cash payments, usually every quarter. Dividend yield shows this as a percentage of the stock price. Example: if a stock costs $100 and pays $3 per year in dividends, the yield is 3%. You earn that money just for holding the stock, like interest in a savings account. Retirees and income investors love dividend stocks because of this steady cash flow. But watch out: a very high yield (like 10%+) can sometimes mean the stock price dropped a lot, which might mean the company is struggling.",
    visual: "yield",
    yf: "info['dividendYield']",
    vizPrompt: "Three vertical bar indicators labelled 'Low <1%' (grey), 'Decent 2-4%' (green), 'High 5%+' (amber). The current stock's dividend is highlighted. Below, show a simple formula: Stock Price × Yield% = Cash per year.",
  },
  {
    key: "eps",
    name: "EPS — Earnings Per Share",
    tag: "Profitability",
    value: "$6.20",
    short: "Profit the company made, divided by each share.",
    detail: "Imagine a company made $10 billion in profit last year, and there are 1 billion shares outstanding. EPS = $10 billion ÷ 1 billion shares = $10 per share. That $10 is how much profit each share 'earned'. Higher EPS generally means a more profitable company. But what's even more important is whether EPS is growing quarter by quarter. If EPS was $1, then $2, then $3, then $4 — that's a company whose profits are accelerating. That's what investors love to see. EPS is also used to calculate P/E ratio (Price ÷ EPS).",
    visual: "eps",
    yf: "info['trailingEps']",
    vizPrompt: "A bar chart showing the last 8 quarters of EPS. Bars that grew vs the previous quarter are teal, bars that shrank are coral. Each bar is labelled with its value. A trend arrow shows overall direction.",
  },
  {
    key: "highlow",
    name: "52-Week High / Low",
    tag: "Price context",
    value: "$124 – $199",
    short: "The highest and lowest price the stock hit in the past year.",
    detail: "This is one of the easiest ways to put the current price in context. If a stock is at $80 and its 52-week range is $60–$120, you can see it's sitting in the middle of its yearly range. Near the high might mean the stock has strong momentum — or it might be getting overpriced. Near the low could mean it's a bargain — or that something is genuinely wrong with the company. Neither extreme is automatically good or bad, but the range helps you ask the right questions. Always check why a stock is near its high or low.",
    visual: "range",
    yf: "info['fiftyTwoWeekHigh'] and info['fiftyTwoWeekLow']",
    vizPrompt: "A horizontal range bar from 52-week low to high. A dot shows the current price on the bar. The section below the current price is filled teal, above is grey. Labels show % distance from low and from high on each end.",
  },
  {
    key: "beta",
    name: "Beta",
    tag: "Volatility / Risk",
    value: "1.2",
    short: "How wildly the stock moves compared to the overall market.",
    detail: "Beta compares a stock's daily price swings to the S&P 500 (the overall market). Beta = 1.0 means the stock moves exactly with the market. If the market goes up 2%, the stock goes up 2%. Beta = 1.5 means 50% more volatile: if the market goes up 2%, the stock goes up 3% — but if the market drops 2%, the stock drops 3%. Beta = 0.5 means much calmer: half the swings of the market. High-beta stocks can make you more money during bull markets but also lose more during crashes. Low-beta stocks are boring but stable — think utility companies and consumer staples.",
    visual: "gauge",
    yf: "info['beta']",
    vizPrompt: "A semicircle gauge from 0 to 3. Coloured zones: green (0-0.8 Calm), grey (0.8-1.2 Market-like), amber (1.2-2.0 Aggressive), red (2+ Very risky). A needle points to the stock's beta. The value is shown in the centre.",
  },
  {
    key: "debt",
    name: "Debt-to-Equity",
    tag: "Financial health",
    value: "1.4",
    short: "How much the company borrowed vs what it actually owns.",
    detail: "Debt-to-Equity (D/E) ratio compares how much money a company borrowed (debt) to how much it owns outright (equity). D/E = 1.0 means equal debt and equity. D/E = 2.0 means the company borrowed twice as much as it owns. High debt isn't automatically bad — banks and construction companies naturally carry more debt. But during tough economic times, high-debt companies struggle because they still owe interest payments even when revenue drops. A company with low debt is more financially flexible and safer during recessions. Warren Buffett prefers companies with low and manageable debt.",
    visual: "stack",
    yf: "info['debtToEquity']",
    vizPrompt: "A stacked horizontal bar showing Equity (teal) vs Debt (coral) as proportions of total capital. Numbers show actual equity and debt amounts. A label indicates whether D/E is 'Healthy', 'Moderate', or 'High Risk'.",
  },
  {
    key: "roe",
    name: "ROE — Return on Equity",
    tag: "Efficiency",
    value: "22%",
    short: "How good the company is at turning your investment into profit.",
    detail: "ROE = Net Profit ÷ Shareholders' Equity. If shareholders put in $100 and the company made $20 in profit, ROE = 20%. It measures how efficiently management uses the money invested to generate returns. Think of it like this: if you gave $100 to two different friends to invest, and one returned $8 while the other returned $22 — you'd want more of your money with the second friend. Warren Buffett famously looks for companies with consistent ROE above 15%. Low ROE means management isn't making the most of investors' money. Always compare ROE within the same industry.",
    visual: "donut",
    yf: "info['returnOnEquity']",
    vizPrompt: "A circular arc/donut chart where the full circle represents 30% ROE (excellent). The arc fills proportionally and is green if ROE > 15%, amber if 8-15%, red if under 8%. The exact % is shown in the centre. Below: Net Profit ÷ Equity = ROE%.",
  },
];

function MetricVisualFull({ type }) {
  if (type === "line") return (
    <div className="vizFull lineVizFull">
      <svg viewBox="0 0 300 120" className="chartSvg">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f7d4c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1f7d4c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,90 C20,85 30,70 50,65 C70,60 80,75 100,60 C120,45 130,50 150,40 C170,30 180,50 200,35 C220,20 240,30 260,20 C270,15 285,18 300,10" fill="none" stroke="#1f7d4c" strokeWidth="2.5" />
        <path d="M0,90 C20,85 30,70 50,65 C70,60 80,75 100,60 C120,45 130,50 150,40 C170,30 180,50 200,35 C220,20 240,30 260,20 C270,15 285,18 300,10 L300,120 L0,120 Z" fill="url(#lineGrad)" />
        <circle cx="295" cy="10" r="5" fill="#1f7d4c" />
        <text x="240" y="10" fontSize="9" fill="#1f7d4c" fontWeight="700">$175.43</text>
      </svg>
      <div className="vizLabels"><span>1 year ago</span><span>Today</span></div>
    </div>
  );
  if (type === "scale") return (
    <div className="vizFull">
      <div className="peScale">
        <div className="peZone" style={{ background: "#d4f7e5", flex: 1.2 }}><span>Cheap?</span><small>0–12</small></div>
        <div className="peZone" style={{ background: "#e8f0e8", flex: 1.3 }}><span>Fair</span><small>12–25</small></div>
        <div className="peZone" style={{ background: "#fff4d6", flex: 1.5 }}><span>Premium</span><small>25–40</small></div>
        <div className="peZone" style={{ background: "#fde8e8", flex: 1 }}><span>Very Exp.</span><small>40+</small></div>
      </div>
      <div className="peTrack">
        <div className="peDot" style={{ left: "58%" }}><div className="peDotInner peThis" /><div className="peDotLabel">This stock<br />28.4</div></div>
        <div className="peDot" style={{ left: "36%" }}><div className="peDotInner peAvg" /><div className="peDotLabel peAvgLabel">S&P avg<br />~22</div></div>
      </div>
    </div>
  );
  if (type === "bubble") return (
    <div className="vizFull bubbleVizFull">
      <div className="bubbleItem"><div className="bubbleCircle" style={{ width: 48, height: 48, background: "#a8e6bc" }}><span>Small</span></div><small>&lt;$2B</small></div>
      <div className="bubbleItem"><div className="bubbleCircle" style={{ width: 80, height: 80, background: "#4caf50" }}><span>Mid</span></div><small>$2–10B</small></div>
      <div className="bubbleItem highlighted"><div className="bubbleCircle" style={{ width: 120, height: 120, background: "#1f7d4c" }}><span>Large</span></div><small>$10B+</small></div>
      <div className="bubbleArrow">← This stock: $2.8T (Mega-cap)</div>
    </div>
  );
  if (type === "bars") return (
    <div className="vizFull volVizFull">
      <div className="volChartWrap">
        <div className="volBars">
          {[35, 50, 40, 80, 30, 120, 45, 60, 38, 90, 55, 42, 70, 110, 48, 65, 30, 85, 95, 40, 60, 50, 75, 88, 45, 70, 55, 130, 60, 45].map((h, i) => {
            const isUp = i % 3 !== 2;
            const isHighlight = i === 27;
            return (
              <div key={i} className="volBarCol">
                {isHighlight && <div className="volHighlightStar">★</div>}
                <div className="volBar" style={{
                  height: `${Math.round(h * 0.72)}%`,
                  background: isHighlight ? "#f4a623" : isUp ? "#4caf50" : "#e87070",
                  opacity: isHighlight ? 1 : 0.7,
                }} />
              </div>
            );
          })}
        </div>
        <div className="volAvgLineOverlay" />
      </div>
      <div className="volLegend">
        <span className="volLegendItem"><i style={{ background: "#4caf50" }} />Up day</span>
        <span className="volLegendItem"><i style={{ background: "#e87070" }} />Down day</span>
        <span className="volLegendItem"><i style={{ background: "#f4a623" }} />2× avg ★</span>
        <span className="volAvgDashLabel">- - avg</span>
      </div>
      <div className="vizLabels"><span>90 days ago</span><span>Today</span></div>
    </div>
  );
  if (type === "yield") return (
    <div className="vizFull yieldVizFull">
      <div className="yieldZoneTrack">
        <div className="yieldZone" style={{ background: "#f0f0f0", flex: 1 }}>
          <span className="yieldZoneLabel">Low</span>
          <span className="yieldZoneRange">&lt;1%</span>
        </div>
        <div className="yieldZone" style={{ background: "#d4f7e5", flex: 1.5 }}>
          <span className="yieldZoneLabel" style={{ color: "#1f7d4c" }}>Good ✓</span>
          <span className="yieldZoneRange" style={{ color: "#1f7d4c" }}>2–4%</span>
        </div>
        <div className="yieldZone" style={{ background: "#fff4d6", flex: 1 }}>
          <span className="yieldZoneLabel" style={{ color: "#b07a00" }}>High</span>
          <span className="yieldZoneRange" style={{ color: "#b07a00" }}>5%+</span>
        </div>
      </div>
      <div className="yieldPointerRow">
        <div className="yieldPointer" style={{ left: "18%" }}>
          <div className="yieldPointerDot" />
          <div className="yieldPointerLabel">This stock<br /><b>0.6%</b></div>
        </div>
      </div>
      <div className="yieldZoneDesc">
        <span>Almost no income</span>
        <span style={{ color: "#1f7d4c" }}>Steady passive income</span>
        <span style={{ color: "#b07a00" }}>Check why it's so high</span>
      </div>
      <div className="yieldFormula">📐 $175 × 0.6% = <b>$1.05/year per share</b></div>
    </div>
  );
  if (type === "eps") return (
    <div className="vizFull">
      <div className="epsBars">
        {[{ q: "Q1 '23", v: 1.4, up: true }, { q: "Q2 '23", v: 1.8, up: true }, { q: "Q3 '23", v: 2.1, up: true }, { q: "Q4 '23", v: 1.9, up: false }, { q: "Q1 '24", v: 2.4, up: true }, { q: "Q2 '24", v: 2.8, up: true }, { q: "Q3 '24", v: 3.2, up: true }, { q: "Q4 '24", v: 3.8, up: true }].map((d, i) => (
          <div key={i} className="epsBarWrap">
            <div className="epsBarFill" style={{ height: `${d.v * 22}%`, background: d.up ? "#1f7d4c" : "#e87070" }}><small>${d.v}</small></div>
            <span>{d.q}</span>
          </div>
        ))}
      </div>
      <div className="epsTrend">📈 EPS growing from $1.40 → $3.80 over 8 quarters</div>
    </div>
  );
  if (type === "range") return (
    <div className="vizFull rangeVizFull">
      <div className="rangeRow">
        <div className="rangeLabel low">$124<br /><small>52W Low</small></div>
        <div className="rangeTrack">
          <div className="rangeFilled" style={{ width: "68%" }} />
          <div className="rangeDot" style={{ left: "68%" }}><div className="rangeDotLabel">$175<br />Now</div></div>
        </div>
        <div className="rangeLabel high">$199<br /><small>52W High</small></div>
      </div>
      <div className="rangeStats">
        <span className="green">+41% from low</span>
        <span className="red">-12% from high</span>
      </div>
    </div>
  );
  if (type === "gauge") return (
    <div className="vizFull gaugeVizFull">
      <svg viewBox="0 0 200 120" className="gaugeSvg">
        {/* Semicircle arcs: total span 0→3 mapped over 180deg, left=0, right=3 */}
        {/* Calm 0–0.8: 0–48deg of 180 */}
        <path d="M20,100 A80,80 0 0,1 62,28" fill="none" stroke="#d4f7e5" strokeWidth="16" strokeLinecap="butt" />
        {/* Market-like 0.8–1.2: 48–72deg */}
        <path d="M62,28 A80,80 0 0,1 94,21" fill="none" stroke="#e8f0e8" strokeWidth="16" strokeLinecap="butt" />
        {/* Aggressive 1.2–2.0: 72–120deg */}
        <path d="M94,21 A80,80 0 0,1 153,38" fill="none" stroke="#fff4d6" strokeWidth="16" strokeLinecap="butt" />
        {/* Very risky 2.0–3.0: 120–180deg */}
        <path d="M153,38 A80,80 0 0,1 180,100" fill="none" stroke="#fde8e8" strokeWidth="16" strokeLinecap="butt" />
        {/* Needle for beta=1.2 → 72deg from left → angle from bottom = 180-72=108deg → pointing to ~(100-80*sin72, 100-80*cos72) */}
        {/* At 72deg: x=100+80*cos(108°)=100-24.7=75.3, y=100-80*sin(108°)=100-76.1=23.9 */}
        <line x1="100" y1="100" x2="75" y2="24" stroke="#173427" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="#173427" />
        {/* Value label below needle pivot */}
        <text x="100" y="116" textAnchor="middle" fontSize="12" fontWeight="800" fill="#173427">β 1.2</text>
        <text x="14" y="112" fontSize="8" fill="#888">Calm</text>
        <text x="158" y="112" fontSize="8" fill="#888">Risky</text>
      </svg>
    </div>
  );
  if (type === "stack") return (
    <div className="vizFull stackVizFull">
      <div className="stackBarFull">
        <div className="stackEquity" style={{ flex: 59 }}><span>Equity<br />59%</span></div>
        <div className="stackDebt" style={{ flex: 41 }}><span>Debt<br />41%</span></div>
      </div>
      <div className="stackLegend">
        <span><i style={{ background: "#4caf50" }} />Equity — what the company actually owns</span>
        <span><i style={{ background: "#e87070" }} />Debt — what it borrowed &amp; must repay</span>
      </div>
      <div className="stackRating">D/E 1.4 → <b style={{ color: "#f4a623" }}>Moderate — watch this number</b></div>
    </div>
  );
  if (type === "donut") return (
    <div className="vizFull donutVizFull">
      <svg viewBox="0 0 160 160" className="donutSvg">
        <circle cx="80" cy="80" r="60" fill="none" stroke="#e8f4ec" strokeWidth="22" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="#1f7d4c" strokeWidth="22"
          strokeDasharray={`${22 / 30 * 376.99} ${376.99}`} strokeDashoffset="94.25" strokeLinecap="round" />
        <text x="80" y="75" textAnchor="middle" fontSize="22" fontWeight="800" fill="#173427">22%</text>
        <text x="80" y="92" textAnchor="middle" fontSize="10" fill="#6c8373">ROE</text>
      </svg>
      <div className="donutFormula">Net Profit ÷ Equity = <b>22%</b> &nbsp;✅ Excellent (target: &gt;15%)</div>
    </div>
  );
  return null;
}

function MetricModal({ metric, onClose }) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalBox" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <span className="modalTag">{metric.tag}</span>
            <h2 className="modalTitle">{metric.name}</h2>
            <p className="modalShort">{metric.short}</p>
          </div>
          <button className="modalClose" onClick={onClose}>✕</button>
        </div>
        <MetricVisualFull type={metric.visual} />
        <div className="modalDetail">
          <h4>Detailed Explanation</h4>
          <p>{metric.detail}</p>
        </div>
        <div className="modalYf">
          <small>yfinance key:</small>
          <code>{metric.yf}</code>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [recent, setRecent] = useState(["NVDA", "AMZN", "AAPL"]);
  const [sortKey, setSortKey] = useState("change");
  const [sortDir, setSortDir] = useState("desc");
  const [userName, setUserName] = useState("Rann");
  const [timeFrame, setTimeFrame] = useState("1M");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [learnSection, setLearnSection] = useState("basics");
  const [openMetric, setOpenMetric] = useState(null);
  const [insightIndex, setInsightIndex] = useState(0);
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const dailyInsights = [
    { tip: "When volume spikes 3× the usual, it almost always means big news — earnings surprises, analyst upgrades, or major announcements. A price move on high volume is far more trustworthy than one on low volume.", tag: "Volume", emoji: "📊" },
    { tip: "A P/E ratio above 40 isn't automatically bad — it just means the market expects fast future growth. Tesla traded above P/E 100 for years. But if growth doesn't materialise, those valuations can collapse fast.", tag: "P/E Ratio", emoji: "⚖️" },
    { tip: "Dividends compound powerfully over time. If you reinvest a 3% dividend yield every year, you double your income stream roughly every 24 years — before any stock price growth.", tag: "Dividends", emoji: "💸" },
    { tip: "Beta below 1.0 doesn't mean a stock is boring — it means it moves less than the market. Gold miners, utilities, and consumer staples often have low beta. They're your shock absorbers during crashes.", tag: "Beta", emoji: "🛡️" },
    { tip: "EPS growth matters more than the EPS number itself. A company growing EPS from $1 → $2 → $4 is accelerating — and markets pay a huge premium for acceleration.", tag: "EPS", emoji: "📈" },
    { tip: "The 52-week high isn't a ceiling — stocks break new highs all the time. But buying near the 52-week low just because it's 'cheap' can be a trap if the business is actually deteriorating.", tag: "52W Range", emoji: "📉" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setInsightIndex(i => (i + 1) % dailyInsights.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);

      if (user?.email) {
        setUserName(user.email.split("@")[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks.filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  const topGainers = [...stocks].sort((a, b) => b.change - a.change).slice(0, 6);
  const topLosers = [...stocks].sort((a, b) => a.change - b.change).slice(0, 6);

  const sortedHoldings = [...holdings].sort((a, b) => {
    let val;
    if (sortKey === "ticker") val = a.ticker.localeCompare(b.ticker);
    else val = b[sortKey] - a[sortKey];
    return sortDir === "desc" ? val : -val;
  });

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function goStock(stock) {
    setSelectedStock(stock);
    setRecent((prev) => [stock.ticker, ...prev.filter((x) => x !== stock.ticker)].slice(0, 5));
    setPage("stock");
    setQuery("");
  }

  function searchStock() {
    const q = query.toLowerCase().trim();
    const found = stocks.find((s) => s.ticker.toLowerCase() === q || s.name.toLowerCase() === q);
    if (found) goStock(found);
  }

  function goLearnMetrics() {
    setLearnSection("metrics");
    setPage("learn");
  }

  const navItems = [
    ["dashboard", "📊", "Dashboard"],
    ["search", "🔍", "Search"],
    ["portfolio", "💼", "Portfolio"],
    ["simulator", "🚀", "Simulator"],
    ["ai", "🤖", "AI Assistant"],
    ["learn", "📖", "Learn"],
    ["leaderboard", "🏆", "Leaderboard"],
  ];

  const sectors = ["Technology", "Energy", "Travel", "Healthcare", "Finance", "E-Commerce", "Consumer Goods", "Health & Fitness"];

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      setEmail("");
      setPassword("");
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUserName("Guest");
  }

  return (
    <div className="app">
      {openMetric && <MetricModal metric={openMetric} onClose={() => setOpenMetric(null)} />}

      <aside className="sidebar">
        <div className="brand">📈 StockSense</div>
        {navItems.map(([id, icon, label]) => (
          <button key={id} className={`nav ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>
            <span>{icon}</span>{label}
          </button>
        ))}
        <button className="userBox" onClick={() => setPage("account")}>
          <span className="avatar">👤</span>
          <div><b>{userName}</b><small>Demo Account</small></div>
        </button>
      </aside>

      <main className="main">
        {page === "dashboard" && (
          <>
            <div className="topbar">
              <h1>{greeting}, {userName}! 👋</h1>
              <div className="balance"><small>Demo Balance</small><b>$10,000.00</b></div>
            </div>

            {/* Market Overview Strip */}
            <div className="marketStrip">
              {[
                { name: "S&P 500", value: "5,304.72", change: +0.51 },
                { name: "NASDAQ", value: "16,742.39", change: +0.87 },
                { name: "DOW", value: "39,069.53", change: +0.20 },
              ].map((idx) => (
                <div className="marketStripItem" key={idx.name}>
                  <span className="marketStripName">{idx.name}</span>
                  <span className="marketStripValue">{idx.value}</span>
                  <span className={idx.change >= 0 ? "green marketStripChange" : "red marketStripChange"}>
                    {idx.change >= 0 ? "▲" : "▼"} {Math.abs(idx.change)}%
                  </span>
                </div>
              ))}
            </div>

            <div className="dashboardGrid priority">
              <div className="insightBar" onClick={() => setPage("learn")}>
                💡 Unsure what P/E Ratio means? Learn key metrics in simple English.
              </div>
              <div className="card focusCard clickCard" onClick={() => setPage("portfolio")}>
                <p>Portfolio Value</p>
                <h2>$12,736.40</h2>
                <b className="green">↑ +27.25%</b>
                <div className="miniLine">⌁⌁╱╲╱╲╱╲</div>
              </div>
              <div className="card clickCard" onClick={() => setPage("portfolio")}>
                <h3>Biggest Holding</h3>
                <h2>AAPL</h2>
                <p>Apple Inc.</p>
                <b className="green">↑ +1.18%</b>
                <div className="miniLine">╱╲╱╲╱</div>
              </div>
              <div className="card clickCard" onClick={() => setPage("portfolio")}>
                <h3>Holdings Mix</h3>
                <div className="pie"></div>
                <p>🟢 AAPL 45% &nbsp; 🟡 MSFT 30% &nbsp; 🔵 TSLA 15%</p>
              </div>
              <div className="card">
                <h3>Top Movers Today</h3>
                {[...stocks].sort((a, b) => b.change - a.change).slice(0, 5).map((s) => (
                  <div className="mover" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "▲" : "▼"} {s.change}%</span>
                  </div>
                ))}
              </div>

              {/* Daily Insight card - rotating */}
              <div className="card dailyInsightCard">
                <div className="dailyInsightLabel">{dailyInsights[insightIndex].emoji} Daily Insight</div>
                <h3 className="dailyInsightTitle">Did you know?</h3>
                <p className="dailyInsightText">{dailyInsights[insightIndex].tip}</p>
                <div className="dailyInsightFooter">
                  <div className="dailyInsightTag">Today's tip • {dailyInsights[insightIndex].tag}</div>
                  <div className="dailyInsightDots">
                    {dailyInsights.map((_, i) => (
                      <button key={i} className={`insightDot ${i === insightIndex ? "active" : ""}`} onClick={() => setInsightIndex(i)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {page === "search" && (
          <section className="page">
            <h1>Search Stocks</h1>
            <p>Search by company name or ticker. Example: Apple or AAPL.</p>

            <div className="searchWrap">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Apple, AAPL, Tesla..." onKeyDown={e => e.key === "Enter" && searchStock()} />
              <button onClick={searchStock}>Search</button>
              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <div key={s.ticker} onClick={() => goStock(s)}>
                      <div className="suggestionRow">
                        <span className="suggTicker">{s.ticker}</span>
                        <span className="suggName">{s.name}</span>
                      </div>
                      <span className="suggSector">{s.sector}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3>Daily Top Movers</h3>
            <div className="moversGrid">
              <div className="moversPanel">
                <div className="moversPanelHeader gainers">▲ Top Gainers</div>
                {topGainers.map((s) => (
                  <div className="stockRow" key={s.ticker} onClick={() => goStock(s)}>
                    <b className="stockRowName">
                      <span className="rowTicker">{s.ticker}</span>
                      <span className="rowName">{s.name}</span>
                    </b>
                    <span className="rowPrice">${s.price}</span>
                    <span className="green rowChange">▲ {s.change}%</span>
                  </div>
                ))}
              </div>
              <div className="moversPanel">
                <div className="moversPanelHeader losers">▼ Top Losers</div>
                {topLosers.map((s) => (
                  <div className="stockRow" key={s.ticker} onClick={() => goStock(s)}>
                    <b className="stockRowName">
                      <span className="rowTicker">{s.ticker}</span>
                      <span className="rowName">{s.name}</span>
                    </b>
                    <span className="rowPrice">${s.price}</span>
                    <span className="red rowChange">▼ {Math.abs(s.change)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sectionGap" />

            <h3>Browse by Sector</h3>
            <div className="sectorBrowser">
              <div className="sectorTabs">
                {sectors.map((sector) => (
                  <button key={sector} className={selectedSector === sector ? "activeSector" : ""} onClick={() => setSelectedSector(sector)}>
                    {sector}
                  </button>
                ))}
              </div>
              <div className="sectorList">
                {stocks.filter((s) => s.sector === selectedSector).slice(0, 5).map((s) => (
                  <div className="sectorStock" key={s.ticker} onClick={() => goStock(s)}>
                    <div className="logoBubble">{s.ticker[0]}</div>
                    <div>
                      <b className="rowTicker">{s.ticker}</b>
                      <small className="rowName">{s.name}</small>
                    </div>
                    <span>${s.price}</span>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sectionGap" />

            <h3>Recent Searches</h3>
            <div className="chips">
              {recent.map((t) => {
                const s = stocks.find((x) => x.ticker === t);
                return (
                  <button key={t} onClick={() => s && goStock(s)} className="chipBtn">
                    <span className="chipTicker">{t}</span>
                    {s && <span className="chipName">{s.name}</span>}
                  </button>
                );
              })}
            </div>

            <h3>Trending Searches</h3>
            <div className="chips">
              {stocks.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 8).map(s => (
                <button key={s.ticker} onClick={() => goStock(s)} className="chipBtn">
                  <span className="chipTicker">{s.ticker}</span>
                  <span className="chipName">{s.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === "stock" && selectedStock && (
          <section className="page">
            <button className="backBtn" onClick={() => setPage("search")}>← Back</button>
            <h1>
              <span className="stockPageName">{selectedStock.name}</span>
              <span className="stockPageTicker">{selectedStock.ticker}</span>
            </h1>

            <div className="timeframes">
              {["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y"].map((t) => (
                <button key={t} className={timeFrame === t ? "selected" : ""} onClick={() => setTimeFrame(t)}>{t}</button>
              ))}
            </div>

            <div className="stockPageGrid">
              <div className="card stockChartCard">
                <h3>Historical Price Chart</h3>
                <div className="largeChart">📈</div>
                <p>Selected range: {timeFrame}. Real chart connects after backend integration.</p>
              </div>

              <div className="card stockMetricsCard">
                <div className="keyMetricsHeader">
                  <h3>Key Metrics</h3>
                  <button className="viewGuideBtn" onClick={(e) => { e.stopPropagation(); setLearnSection("metrics"); setPage("learn"); }}>View full guide →</button>
                </div>

                {metricInfo.map((m) => (
                  <div key={m.key} className="metricLine">
                    <b>
                      {m.name}
                      <button className="metricBubble" onClick={(e) => { e.stopPropagation(); setOpenMetric(m); }}>?
                        <span className="metricBubbleTip">{m.short}</span>
                      </button>
                    </b>
                    <span className="metricValue">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {page === "portfolio" && (
          <section className="page">
            <h1>My Portfolio</h1>
            <div className="stats">
              <div className="card"><p>Total Value</p><h2>$12,736.40</h2></div>
              <div className="card"><p>Daily P&L</p><h2 className="green">↑ +$263.20</h2></div>
              <div className="card"><p>Cash Balance</p><h2>$1,234.50</h2></div>
            </div>
            <div className="card">
              <h3>Portfolio Allocation</h3>
              <div className="pie bigPie"></div>
            </div>
            <div className="card">
              <h3>Positions</h3>
              <div className="table head">
                {[
                  ["ticker", "Stock"],
                  ["change", "% Change"],
                  ["price", "Current Price"],
                  ["value", "Value"],
                  ["unrealised", "Unrealised P&L"],
                  ["realised", "Realised P&L"],
                  ["qty", "Qty"],
                ].map(([key, label]) => (
                  <button key={key} onClick={() => handleSort(key)}>
                    {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                  </button>
                ))}
              </div>
              {sortedHoldings.map((h) => (
                <div className="table" key={h.ticker}>
                  <b>
                    <span className="rowTicker">{h.ticker}</span>
                    <small className="rowName">{h.name}</small>
                  </b>
                  <span className={h.change >= 0 ? "green" : "red"}>{h.change >= 0 ? "↑" : "↓"} {h.change}%</span>
                  <span>${h.price}</span>
                  <span>${h.value.toFixed(2)}</span>
                  <span className={h.unrealised >= 0 ? "green" : "red"}>{h.unrealised >= 0 ? "↑" : "↓"} ${Math.abs(h.unrealised)}</span>
                  <span>${h.realised}</span>
                  <span>{h.qty}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {page === "learn" && (
          <section className="page">
            <h1>Learn Investing</h1>
            <div className="chips">
              <button className={learnSection === "basics" ? "chipActive" : ""} onClick={() => setLearnSection("basics")}>Basics</button>
              <button className={learnSection === "metrics" ? "chipActive" : ""} onClick={() => setLearnSection("metrics")}>Key Metrics</button>
            </div>

            {learnSection === "basics" && (
              <div className="card">
                <h3>Coming Soon</h3>
                <p>This learning section will be developed in a later milestone.</p>
              </div>
            )}

            {learnSection === "metrics" && (
              <div className="metricGrid">
                {metricInfo.map((m) => (
                  <div className="metricCard" key={m.key} onClick={() => setOpenMetric(m)}>
                    <div className="metricHeader">
                      <h3>{m.name}</h3>
                      <span>{m.tag}</span>
                    </div>
                    <MetricVisualFull type={m.visual} />
                    <p className="metricShortLearn"><b>{m.short}</b></p>
                    <div className="metricClickHint">Click to read full explanation →</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {page === "account" && (
          <section className="page">
            <h1>My Account</h1>

            <div className="card account">
              {authUser ? (
                <>
                  <h3>Logged in</h3>
                  <p>You are signed in as:</p>
                  <h2>{authUser.email}</h2>

                  <label>Display Name</label>
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />

                  <label>Account Type</label>
                  <input value="Firebase Email/Password Account" readOnly />

                  <button onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <h3>{authMode === "login" ? "Login" : "Create Account"}</h3>
                  <p>
                    Sign in to save your StockSense demo account and future portfolio data.
                  </p>

                  <form onSubmit={handleAuthSubmit}>
                    <label>Email</label>
                    <input
                      type="email"
                      value={email}
                      placeholder="you@example.com"
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />

                    <label>Password</label>
                    <input
                      type="password"
                      value={password}
                      placeholder="Minimum 6 characters"
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />

                    {authError && <p className="authError">{authError}</p>}

                    <button type="submit">
                      {authMode === "login" ? "Login" : "Sign Up"}
                    </button>
                  </form>

                  <button
                    className="switchAuthBtn"
                    onClick={() =>
                      setAuthMode(authMode === "login" ? "signup" : "login")
                    }
                  >
                    {authMode === "login"
                      ? "New user? Create an account"
                      : "Already have an account? Login"}
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {["simulator", "ai", "leaderboard"].includes(page) && (
          <section className="page">
            <h1>{page.toUpperCase()}</h1>
            <div className="card">
              <p>This page is a Milestone 1 placeholder.</p>
              <p>Full feature will be developed later.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;