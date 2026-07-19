import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  runTransaction,
  addDoc,
  serverTimestamp,
  query as firestoreQuery,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const STARTING_CASH = 10000;

//const API = process.env.REACT_APP_API_URL || "http://localhost:8000/api";
function getApiBaseUrl() {
  const hostname = window.location.hostname;

  if (hostname.includes(".app.github.dev")) {
    return `https://${hostname.replace("-3000.app.github.dev", "-8000.app.github.dev")}/api`;
  }

  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  return "http://localhost:8000/api";
}

const API = getApiBaseUrl();

console.log("API URL being used:", API); //for debugging

// Expanded sector universe - 10 well-known tickers per sector
// Backend will fetch live prices + sort by volume ratio (trending)
const SECTOR_UNIVERSE = {
  "ETFs":           ["VOO","SPY","QQQ","VTI","IWM","ARKK","DIA","VUG","SCHD","VYM"],
  "Technology":     ["AAPL","MSFT","NVDA","GOOGL","META","TSLA","CRM","ORCL","AMD","INTC"],
  "Energy":         ["XOM","CVX","SHEL","BP","COP","SLB","EOG","PSX","VLO","MPC"],
  "Travel":         ["ABNB","DAL","UAL","AAL","BKNG","MAR","HLT","CCL","RCL","LUV"],
  "Healthcare":     ["UNH","JNJ","LLY","PFE","ABBV","MRK","TMO","ABT","MRNA","BMY"],
  "Finance":        ["JPM","BAC","GS","MS","WFC","C","V","MA","AXP","PYPL"],
  "E-Commerce":     ["AMZN","BABA","SHOP","MELI","EBAY","ETSY","JD","PDD","W","CHWY"],
  "Consumer Goods": ["KO","PEP","PG","NKE","MCD","SBUX","COST","WMT","TGT","AMZN"],
  "Health & Fitness":["PTON","LULU","PLNT","NKE","GRMN","DXCM","ISRG","SYK","EW","HOLX"],
};

const TIMEFRAMES = [
  { label: "1D",  display: "1D"  },
  { label: "1W",  display: "1W"  },
  { label: "1M",  display: "1M"  },
  { label: "3M",  display: "3M"  },
  { label: "YTD", display: "YTD" },
  { label: "1Y",  display: "1Y"  },
  { label: "5Y",  display: "5Y"  },
  { label: "ALL", display: "All" },
];

const stocks = [
  // ETFs & Index Funds
  { name: "S&P 500 ETF (Vanguard)", ticker: "VOO", sector: "ETF", price: 510.0, change: 0.51, popularity: 97 },
  { name: "SPDR S&P 500 ETF", ticker: "SPY", sector: "ETF", price: 524.0, change: 0.51, popularity: 96 },
  { name: "Invesco QQQ ETF (Nasdaq 100)", ticker: "QQQ", sector: "ETF", price: 455.0, change: 0.73, popularity: 94 },
  { name: "Vanguard Total Stock Market ETF", ticker: "VTI", sector: "ETF", price: 240.0, change: 0.45, popularity: 90 },
  { name: "iShares Russell 2000 ETF", ticker: "IWM", sector: "ETF", price: 205.0, change: 0.22, popularity: 82 },
  { name: "ARK Innovation ETF", ticker: "ARKK", sector: "ETF", price: 48.0, change: 1.2, popularity: 78 },
  { name: "SPDR Dow Jones ETF", ticker: "DIA", sector: "ETF", price: 385.0, change: 0.32, popularity: 75 },
  { name: "Vanguard Growth ETF", ticker: "VUG", sector: "ETF", price: 330.0, change: 0.6, popularity: 72 },
  // Stocks
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

function BasicsVisual({ type }) {
  if (type === "stock") return (
    <div className="basicsViz stockViz">
      <div className="stockSliceWrap">
        <svg viewBox="0 0 200 140" className="stockPieViz">
          <circle cx="70" cy="70" r="58" fill="#e8f6ec" stroke="#1f7d4c" strokeWidth="2" />
          {/* Pie slices */}
          <path d="M70,70 L70,12 A58,58 0 0,1 128,70 Z" fill="#1f7d4c" opacity="0.85" />
          <path d="M70,70 L128,70 A58,58 0 0,1 97,122 Z" fill="#4caf50" opacity="0.7" />
          <path d="M70,70 L97,122 A58,58 0 0,1 12,70 Z" fill="#a8e6bc" opacity="0.8" />
          <path d="M70,70 L12,70 A58,58 0 0,1 70,12 Z" fill="#d4f7e5" opacity="0.9" />
          <circle cx="70" cy="70" r="26" fill="white" />
          <text x="70" y="67" textAnchor="middle" fontSize="9" fontWeight="800" fill="#1f7d4c">YOU</text>
          <text x="70" y="79" textAnchor="middle" fontSize="7" fill="#6c8373">own a slice</text>
          {/* Legend */}
          <rect x="145" y="25" width="10" height="10" rx="2" fill="#1f7d4c" />
          <text x="159" y="34" fontSize="8" fill="#334d3c">Investors</text>
          <rect x="145" y="42" width="10" height="10" rx="2" fill="#4caf50" />
          <text x="159" y="51" fontSize="8" fill="#334d3c">Founders</text>
          <rect x="145" y="59" width="10" height="10" rx="2" fill="#a8e6bc" />
          <text x="159" y="68" fontSize="8" fill="#334d3c">Employees</text>
          <rect x="145" y="76" width="10" height="10" rx="2" fill="#d4f7e5" />
          <text x="159" y="85" fontSize="8" fill="#334d3c">Public</text>
        </svg>
      </div>
      <div className="stockVizCaption">Each share = a tiny ownership slice of a real company</div>
    </div>
  );

  if (type === "why") return (
    <div className="basicsViz whyViz">
      <div className="whyBars">
        {[
          { label: "Savings\naccount", val: 22, pct: "2.2%/yr", color: "#d4f7e5", text: "#1f7d4c" },
          { label: "Bonds", val: 46, pct: "4.6%/yr", color: "#a8e6bc", text: "#1f7d4c" },
          { label: "S&P 500\navg", val: 100, pct: "~10%/yr", color: "#1f7d4c", text: "white" },
        ].map((b, i) => (
          <div key={i} className="whyBarCol">
            <div className="whyBarFill" style={{ height: `${b.val}%`, background: b.color }}>
              <span style={{ color: b.text, fontSize: "9px", fontWeight: 800 }}>{b.pct}</span>
            </div>
            <div className="whyBarLabel">{b.label}</div>
          </div>
        ))}
      </div>
      <div className="whyCaption">$10,000 invested for 30 years at these rates</div>
    </div>
  );

  if (type === "choose") return (
    <div className="basicsViz chooseViz">
      <div className="chooseSteps">
        {[
          { icon: "💡", step: "1", text: "Pick a company you use or understand" },
          { icon: "📊", step: "2", text: "Check its revenue is growing" },
          { icon: "⚖️", step: "3", text: "Look at P/E vs sector average" },
          { icon: "📉", step: "4", text: "Check the 52-week price range" },
          { icon: "✅", step: "5", text: "Start small — 1-2 shares is fine" },
        ].map((s, i) => (
          <div key={i} className="chooseStep">
            <div className="chooseStepNum">{s.step}</div>
            <div className="chooseStepText">{s.icon} {s.text}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (type === "diversify") return (
    <div className="basicsViz diversifyViz">
      <div className="basketRow">
        <div className="basketWrap">
          <div className="basketIcon">🧺</div>
          <div className="basketChips">
            {[
              { t: "AAPL", c: "#e8f6ec" }, { t: "XOM", c: "#fff4d6" },
              { t: "JPM", c: "#fde8e8" }, { t: "UNH", c: "#e8edf6" },
              { t: "VOO", c: "#f0e8f6" }, { t: "AMZN", c: "#e8f6ec" },
            ].map((chip, i) => (
              <div key={i} className="basketChip" style={{ background: chip.c }}>{chip.t}</div>
            ))}
          </div>
        </div>
        <div className="diversifyArrow">vs</div>
        <div className="basketWrap singleStock">
          <div className="basketIcon">🥚</div>
          <div className="singleBubble">TSLA only</div>
          <div className="singleWarning">⚠️ All eggs in one basket</div>
        </div>
      </div>
      <div className="diversifyCaption">Spreading across sectors reduces risk without sacrificing growth</div>
    </div>
  );

  if (type === "buysell") return (
    <div className="basicsViz buysellViz">
      <div className="buysellTrack">
        <div className="bsZone" style={{ background: "#d4f7e5" }}>
          <span className="bsZoneIcon">🟢</span>
          <span className="bsZoneLabel">Consider Buying</span>
          <small>Price dips, strong earnings, long-term thesis intact</small>
        </div>
        <div className="bsDivider">⚖️</div>
        <div className="bsZone" style={{ background: "#fde8e8" }}>
          <span className="bsZoneIcon">🔴</span>
          <span className="bsZoneLabel">Consider Selling</span>
          <small>Business fundamentally changed, or you need the cash</small>
        </div>
      </div>
      <div className="buysellCaption">💡 "Be fearful when others are greedy, greedy when others are fearful" — Warren Buffett</div>
    </div>
  );

  if (type === "portfolio") return (
    <div className="basicsViz portfolioViz">
      <div className="pvFormula">
        <div className="pvBox">
          <div className="pvBoxLabel">Holdings Value</div>
          <div className="pvBoxVal" style={{ color: "#1f7d4c" }}>$7,430</div>
          <div className="pvBoxSub">AAPL + MSFT + VOO</div>
        </div>
        <div className="pvPlus">+</div>
        <div className="pvBox">
          <div className="pvBoxLabel">Cash Balance</div>
          <div className="pvBoxVal" style={{ color: "#4caf50" }}>$2,570</div>
          <div className="pvBoxSub">Ready to invest</div>
        </div>
        <div className="pvEquals">=</div>
        <div className="pvBox pvTotal">
          <div className="pvBoxLabel">Total Value</div>
          <div className="pvBoxVal">$10,000</div>
          <div className="pvBoxSub">Your demo portfolio</div>
        </div>
      </div>
      <div className="pvPnl">
        <span className="pvPnlLabel">Unrealised P&L: </span>
        <span className="green">↑ $430.00 (+4.3%)</span>
        <span className="pvPnlHint"> — would be yours if you sold today</span>
      </div>
    </div>
  );

  if (type === "mistakes") return (
    <div className="basicsViz mistakesViz">
      {[
        { icon: "😱", label: "Panic selling on dips", fix: "Zoom out — short-term dips are normal" },
        { icon: "🎰", label: "Betting on one stock", fix: "Diversify across sectors and asset types" },
        { icon: "📰", label: "Trading on news headlines", fix: "News is priced in fast — focus on fundamentals" },
        { icon: "⏱️", label: "Trying to time the market", fix: "Time IN the market beats timing the market" },
      ].map((m, i) => (
        <div key={i} className="mistakeRow">
          <div className="mistakeIcon">{m.icon}</div>
          <div className="mistakeText">
            <div className="mistakeLabel">{m.label}</div>
            <div className="mistakeFix">✅ {m.fix}</div>
          </div>
        </div>
      ))}
    </div>
  );

  if (type === "longterm") return (
    <div className="basicsViz longtermViz">
      <div className="ltCompare">
        <div className="ltSide">
          <div className="ltTitle" style={{ color: "#1f7d4c" }}>📈 Long-Term Investing</div>
          <div className="ltPoints">
            {["Hold for years", "Ride out dips", "Compound growth", "Lower stress", "Tax efficient"].map((p, i) => (
              <div key={i} className="ltPoint">✓ {p}</div>
            ))}
          </div>
        </div>
        <div className="ltDivider">vs</div>
        <div className="ltSide">
          <div className="ltTitle" style={{ color: "#e87070" }}>⚡ Trading</div>
          <div className="ltPoints">
            {["Buy/sell daily", "Needs full attention", "High fees + taxes", "High stress", "Most traders lose"].map((p, i) => (
              <div key={i} className="ltPoint ltPointBad">✗ {p}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (type === "firststock") return (
    <div className="basicsViz firststockViz">
      <div className="fsRoadmap">
        {[
          { icon: "✅", label: "Bought your first share!", done: true },
          { icon: "📖", label: "Learn what you own — check Key Metrics", done: false },
          { icon: "🧺", label: "Add 2–3 more stocks to diversify", done: false },
          { icon: "📅", label: "Check in monthly, not daily", done: false },
          { icon: "🔄", label: "Reinvest any dividends you earn", done: false },
          { icon: "🎯", label: "Set a 1-year goal and stick to it", done: false },
        ].map((s, i) => (
          <div key={i} className="fsStep">
            <div className={`fsStepDot ${s.done ? "fsDone" : ""}`}>{s.done ? "✓" : i + 1}</div>
            <div className={`fsStepLabel ${s.done ? "fsDoneLabel" : ""}`}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}

const basicsData = [
  {
    key: "stock",
    emoji: "🌱",
    title: "What is a stock?",
    tag: "Foundations",
    short: "A tiny ownership slice of a real company.",
    detail: "When a company like Apple wants to raise money to grow, it splits itself into millions (or billions) of tiny pieces called shares, then sells them to the public on a stock exchange. When you buy one share of Apple, you literally own a small piece of the company — you're entitled to a proportional share of profits and have a vote at shareholder meetings. If Apple does well and becomes more valuable, your slice is worth more. If it struggles, your slice is worth less. That's it — stocks are ownership.",
    visual: "stock",
    cta: "Head to Search to browse real companies →",
  },
  {
    key: "why",
    emoji: "💡",
    title: "Why do people invest?",
    tag: "Motivation",
    short: "To grow money faster than inflation eats it.",
    detail: "Money sitting in a bank savings account earns around 2-4% per year. Inflation runs at ~3% per year. That means your savings are barely keeping pace — in real terms, you're not growing wealth. The S&P 500 (the top 500 US companies) has returned about 10% per year on average since 1957. Over 30 years, $10,000 at 2% becomes $18,000. At 10% it becomes $174,000. That's the power of compounding — your gains earn gains, year after year. Most people invest to build retirement savings, a home deposit, or generational wealth.",
    visual: "why",
    cta: "Try the Simulator to see compounding in action →",
  },
  {
    key: "choose",
    emoji: "🎯",
    title: "How do I choose my first stock?",
    tag: "Getting started",
    short: "Start with a company you already know and use.",
    detail: "The best first stock is a company you already understand. If you use an iPhone every day, you understand Apple's product and business. Warren Buffett's rule: only invest in businesses you can understand. After that, check a few numbers: Is revenue growing year over year? Is the company profitable (positive EPS)? Is the P/E ratio reasonable compared to competitors? Is debt manageable? In StockSense, all of these are available on every stock's detail page. Start small — even 1 fractional share gets you learning by doing.",
    visual: "choose",
    cta: "Click any stock to see its metrics →",
  },
  {
    key: "diversify",
    emoji: "🧺",
    title: "What is diversification?",
    tag: "Risk management",
    short: "Don't put all your eggs in one basket.",
    detail: "Diversification means spreading your money across different companies, sectors, and even asset types — so that if one crashes, the others cushion the blow. If you put everything into Tesla and Tesla drops 40%, your whole portfolio drops 40%. But if you hold Tesla, Apple, JPMorgan, and a healthcare ETF, a Tesla crash only affects 25% of your portfolio. The easiest way to diversify instantly is to buy an index ETF like VOO (S&P 500) — one purchase gives you exposure to 500 companies at once. For a virtual portfolio, aim for 5-10 stocks across at least 3 different sectors.",
    visual: "diversify",
    cta: "Browse by Sector in Search to spread your picks →",
  },
  {
    key: "buysell",
    emoji: "💵",
    title: "When should I buy or sell?",
    tag: "Timing",
    short: "Buy when value is clear. Sell when fundamentals change.",
    detail: "There's no perfect timing — even professional fund managers can't consistently time the market. What matters more: WHY you're buying or selling. Good reasons to buy: the price has dipped but the business hasn't changed, you're adding to a long-term position, or you've just started and want to begin building. Good reasons to sell: the reason you bought no longer holds (e.g. the company's growth has stalled), you need the cash, or one stock has grown so large it's unbalancing your portfolio. Bad reasons: panic because the news is scary, or excitement because a stock is 'hot'. In StockSense demo mode, you can buy and sell any time — use that freedom to practice without real consequences.",
    visual: "buysell",
    cta: "Practice buying on any stock's detail page →",
  },
  {
    key: "portfolio",
    emoji: "📈",
    title: "What does my portfolio value mean?",
    tag: "Portfolio",
    short: "The total worth of everything you own — live.",
    detail: "Your portfolio value = the current market value of all your holdings + your remaining cash. Every time a stock's price moves, your portfolio value updates. In StockSense, your Portfolio page shows this in real time using live prices from the market. Unrealised P&L is profit or loss you'd make IF you sold right now — it's not real until you sell. Realised P&L is money you've actually locked in by selling. Your goal should be to grow total portfolio value over time, not obsess over daily ups and downs. Check your portfolio weekly or monthly, not every hour.",
    visual: "portfolio",
    cta: "See your live portfolio value in the Portfolio tab →",
  },
  {
    key: "mistakes",
    emoji: "⚠️",
    title: "Common beginner mistakes",
    tag: "Risk",
    short: "What trips up 90% of new investors.",
    detail: "The biggest enemy of new investors is emotion — fear and greed cause most beginner losses. Panic selling when a stock drops 10% is how people turn a temporary dip into a permanent loss. Chasing 'hot' stocks after they've already doubled usually means buying at the top. Checking your portfolio every hour creates anxiety and leads to overtrading. Over-concentrating in one exciting stock (like a meme stock) can wipe out months of gains. The solution? Write down WHY you bought each stock before you buy. Then only sell if that reason is no longer true — not because the price moved.",
    visual: "mistakes",
    cta: "Use the Learn → Key Metrics tab to invest with confidence →",
  },
  {
    key: "longterm",
    emoji: "🧠",
    title: "Long-term investing vs trading",
    tag: "Strategy",
    short: "Two very different games — most should play one.",
    detail: "Long-term investing (also called 'buy and hold') means buying quality companies or index funds and holding for years or decades. It's low effort, tax-efficient, and has historically worked for ordinary people building wealth. Day trading is trying to profit from short-term price swings — buying and selling within days or hours. It requires enormous time, tools, and psychological discipline. Studies show that roughly 70–80% of active day traders lose money over a 1-year period. For the vast majority of people, long-term investing in diversified funds is the winning strategy. The StockSense Simulator lets you explore both approaches without risk.",
    visual: "longterm",
    cta: "Try the Simulator to test long-term strategies →",
  },
  {
    key: "firststock",
    emoji: "🚀",
    title: "What should I do after buying my first stock?",
    tag: "Next steps",
    short: "Stay calm, stay curious, keep learning.",
    detail: "Buying your first stock (or making your first virtual trade in StockSense) is the best way to start learning. Once you own something, you'll naturally pay more attention to the company and the market. Now: check the Key Metrics tab to understand what you own. Add 2-3 more stocks in different sectors to begin diversifying. Set a calendar reminder to review your portfolio once a month — not every day. Read StockSense's daily insights and metric explanations. And remember: even a 10% dip in your first week is completely normal — the question is whether the business itself is still strong.",
    visual: "firststock",
    cta: "Go to Portfolio to track your progress →",
  },
];

// Static quiz bank — 3 difficulty levels, each with a few question sets so
// retakes (and AI-fallback moments) don't always show the exact same 10.
const quizData = {
  basic: {
    label: "Basic",
    desc: "Start here if you're new to investing.",
    questionSets: [
      [
        { q: "What does it mean to 'buy a stock'?", options: ["Lending money to a bank", "Buying a small ownership share in a company", "Buying a government bond", "Opening a savings account"], correct: 1 },
        { q: "What is a stock market index like the S&P 500?", options: ["A single company's stock", "A basket that tracks many companies together", "A type of bank account", "A government tax"], correct: 1 },
        { q: "If a stock's price goes up after you buy it, you have a...", options: ["Realized loss", "Unrealized gain", "Dividend", "Margin call"], correct: 1 },
        { q: "What is diversification?", options: ["Putting all your money in one stock", "Spreading investments across different assets", "Buying only ETFs", "Day trading frequently"], correct: 1 },
        { q: "What is an ETF?", options: ["A single stock", "A fund that holds a basket of stocks/assets, tradable like a stock", "A type of savings bond", "A crypto coin"], correct: 1 },
        { q: "What does 'volume' refer to for a stock?", options: ["The number of shares traded in a period", "The company's total profit", "The stock's price", "The number of employees"], correct: 0 },
        { q: "What is a dividend?", options: ["A fee charged by brokers", "A portion of company profit paid to shareholders", "A type of stock split", "A government tax on shares"], correct: 1 },
        { q: "Why might someone hold cash instead of investing all of it?", options: ["Cash always earns more than stocks", "For safety, emergencies, and flexibility", "It's required by law", "Stocks can't be sold quickly"], correct: 1 },
        { q: "What generally happens to a stock's price when a company reports much higher profit than expected?", options: ["It usually stays exactly flat", "It often tends to rise", "It always crashes", "Nothing, price only depends on volume"], correct: 1 },
        { q: "What is 'risk' in investing?", options: ["The guarantee of losing money", "The chance that an investment's value could go down", "A fee charged by the stock exchange", "The interest rate on a savings account"], correct: 1 },
      ],
      [
        { q: "What is a 'ticker symbol'?", options: ["A company's phone number", "The short code used to identify a stock (e.g. AAPL)", "A type of bond", "A trading fee"], correct: 1 },
        { q: "What does it mean if a stock 'goes public' (IPO)?", options: ["It's delisted from the market", "It sells shares to the public for the first time", "It stops trading forever", "It merges with another company"], correct: 1 },
        { q: "What is a brokerage account used for?", options: ["Storing cash only, like a bank", "Buying and selling investments like stocks and ETFs", "Paying taxes directly", "Getting a loan"], correct: 1 },
        { q: "What's the difference between a stock and a bond, broadly?", options: ["A stock is ownership; a bond is a loan to a company/government", "They are exactly the same thing", "Bonds are riskier than stocks", "Stocks always pay fixed interest"], correct: 0 },
        { q: "What does 'market cap' roughly represent?", options: ["The company's annual profit", "The total value of all a company's outstanding shares", "The number of employees", "The stock's daily trading volume"], correct: 1 },
        { q: "Why is it generally risky to invest money you'll need very soon (e.g. next month's rent)?", options: ["It isn't risky at all", "Stock prices can drop in the short term, right when you need the cash", "Stocks are illegal to sell quickly", "Short-term investing is always profitable"], correct: 1 },
        { q: "What is compound growth?", options: ["Earning returns only on your original investment", "Earning returns on both your original investment and past returns", "A type of stock split", "A one-time bonus payment"], correct: 1 },
        { q: "What does 'long-term investing' generally mean?", options: ["Holding investments for years, riding out short-term ups and downs", "Selling within a few hours", "Only buying penny stocks", "Avoiding the stock market entirely"], correct: 0 },
        { q: "What is a 'bear market'?", options: ["A period of generally rising prices", "A period of generally falling prices", "A market that's closed", "A market for bonds only"], correct: 1 },
        { q: "Why do many beginners start with broad index ETFs (like VOO or QQQ)?", options: ["They guarantee profits", "They spread risk across many companies at once, in one purchase", "They're the only legal option", "They never lose value"], correct: 1 },
      ],
    ],
  },
  intermediate: {
    label: "Intermediate",
    desc: "For those comfortable with the basics.",
    questionSets: [
      [
        { q: "What does the P/E ratio compare?", options: ["Price to Earnings", "Profit to Expenses", "Price to Equity only", "Earnings to Employees"], correct: 0 },
        { q: "A high Beta (e.g. 1.5) means a stock is generally...", options: ["Less volatile than the market", "More volatile than the market", "Guaranteed to outperform", "Immune to market crashes"], correct: 1 },
        { q: "What is market capitalization?", options: ["Share price × total shares outstanding", "Total company debt", "Annual revenue", "The company's cash balance"], correct: 0 },
        { q: "What does EPS stand for?", options: ["Equity Per Share", "Earnings Per Share", "Expense Per Sale", "Estimated Profit Summary"], correct: 1 },
        { q: "What is a bull market?", options: ["A period of falling prices", "A period of generally rising prices", "A market with no trading", "A market for bonds only"], correct: 1 },
        { q: "What is dollar-cost averaging?", options: ["Investing a lump sum all at once", "Investing a fixed amount at regular intervals regardless of price", "Only buying when prices fall", "Averaging two currencies"], correct: 1 },
        { q: "What does a stock split (e.g. 2-for-1) do to share price and share count?", options: ["Price doubles, shares stay the same", "Price is halved, share count doubles", "Nothing changes", "Company value doubles"], correct: 1 },
        { q: "What is a sector ETF (e.g. XLK)?", options: ["An ETF tracking a single stock", "An ETF focused on companies within one industry", "A bond fund", "A currency fund"], correct: 1 },
        { q: "If a company's 52-week high is much higher than its current price, that could suggest...", options: ["The stock has definitely failed permanently", "The stock has pulled back from its yearly peak", "The company has no revenue", "The stock split recently"], correct: 1 },
        { q: "What's a key risk of investing only in one sector?", options: ["No risk, sectors are always safe", "Concentration risk — a downturn in that sector hits your whole portfolio", "You'll automatically lose money", "It's not possible to do this"], correct: 1 },
      ],
      [
        { q: "What does 'dividend yield' measure?", options: ["Annual dividend as a percentage of share price", "Total company profit", "The number of dividends paid per year, regardless of amount", "Stock price growth rate"], correct: 0 },
        { q: "What is 'debt-to-equity ratio' used to assess?", options: ["How much a company relies on debt vs shareholder funding", "A company's daily trading volume", "How many shares a company has issued", "The company's dividend history"], correct: 0 },
        { q: "What does it mean when a stock trades 'ex-dividend'?", options: ["It will never pay dividends again", "Buyers from that date on won't receive the upcoming declared dividend", "The dividend just doubled", "The stock is being delisted"], correct: 1 },
        { q: "What is a 'limit order'?", options: ["An order executed immediately at the current market price", "An order that only executes at a specified price or better", "A type of dividend", "A tax on trades"], correct: 1 },
        { q: "What does 'return on equity' (ROE) broadly measure?", options: ["How efficiently a company generates profit from shareholders' equity", "The company's total debt", "The stock's trading volume", "The number of shares outstanding"], correct: 0 },
        { q: "Why might an investor rebalance their portfolio periodically?", options: ["To keep their target mix of assets after some have grown faster than others", "It's required by law every year", "To guarantee higher returns", "To avoid ever paying taxes"], correct: 0 },
        { q: "What does 'volatility' describe?", options: ["How much a stock's price swings over time", "A stock's dividend amount", "The company's total revenue", "The number of analysts covering a stock"], correct: 0 },
        { q: "What is a 'blue-chip' stock generally considered to be?", options: ["A brand-new, unproven startup", "A large, well-established, financially stable company", "A penny stock under $1", "A stock that only trades once a year"], correct: 1 },
        { q: "What's the main idea behind 'buy and hold' investing?", options: ["Frequently trading in and out based on daily news", "Holding quality investments for the long run rather than reacting to short-term noise", "Selling everything at the first sign of a dip", "Only holding cash"], correct: 1 },
        { q: "What does a stock buyback (share repurchase) typically do to shares outstanding?", options: ["Increases them", "Decreases them", "Has no effect", "Converts them to bonds"], correct: 1 },
      ],
    ],
  },
  advanced: {
    label: "Advanced",
    desc: "Test deeper investing knowledge.",
    questionSets: [
      [
        { q: "What does a negative correlation between two assets suggest for a portfolio?", options: ["They always move together, increasing risk", "They tend to move in opposite directions, which can reduce overall volatility", "They are the same asset", "One of them is worthless"], correct: 1 },
        { q: "What is 'market cap weighting' in an index like the S&P 500?", options: ["Every company has equal weight", "Larger companies by market cap make up a bigger share of the index", "Weighting is random", "Weighting is based on stock price alone"], correct: 1 },
        { q: "What does a rising bond yield generally pressure growth/tech stocks toward?", options: ["Higher valuations, since future earnings become more valuable", "Lower valuations, since future earnings are discounted more heavily", "No effect at all", "Automatic bankruptcy"], correct: 1 },
        { q: "What is 'shorting' a stock?", options: ["Buying and holding for a short time", "Borrowing shares to sell now, hoping to buy back cheaper later", "Buying only fractional shares", "A type of dividend reinvestment"], correct: 1 },
        { q: "What does 'expense ratio' refer to for an ETF/fund?", options: ["The fund's daily trading volume", "The annual fee charged as a percentage of your investment", "The number of stocks in the fund", "The fund's dividend yield"], correct: 1 },
        { q: "What is a common effect of unexpectedly high inflation data on markets?", options: ["Markets are always unaffected", "It can raise expectations of higher interest rates, often pressuring stock valuations", "It guarantees a bull market", "It only affects currency markets"], correct: 1 },
        { q: "What does 'liquidity' refer to for a stock?", options: ["How easily it can be bought/sold without moving the price much", "The company's cash reserves only", "The stock's dividend amount", "How many employees the company has"], correct: 0 },
        { q: "What's a key difference between growth and value investing styles?", options: ["Growth focuses on high expected future earnings growth; value looks for stocks priced below perceived worth", "They are the same strategy", "Value investing avoids all stocks", "Growth investing avoids risk entirely"], correct: 0 },
        { q: "What does a yield curve inversion (short-term rates above long-term) often historically precede?", options: ["Guaranteed market crashes within a week", "Has often preceded economic slowdowns, though timing varies", "Nothing of note", "Immediate interest rate cuts to zero"], correct: 1 },
        { q: "Why can concentrated single-stock positions carry more risk than diversified holdings, even for a 'great' company?", options: ["Great companies can never lose value", "Company-specific events (fraud, product failure, competition) can hurt one stock far more than a diversified basket", "Single stocks are always more liquid", "Diversification always underperforms"], correct: 1 },
      ],
      [
        { q: "What does 'alpha' represent in portfolio performance?", options: ["Total portfolio value", "Excess return relative to a benchmark, after adjusting for risk", "A stock's beta", "The number of holdings"], correct: 1 },
        { q: "What is 'sector rotation'?", options: ["Randomly swapping brokers", "Shifting investments between sectors based on the economic cycle", "A type of stock split", "Delisting a stock from an exchange"], correct: 1 },
        { q: "Why might a company with strong earnings still see its stock price fall after reporting?", options: ["This never happens", "Results can miss elevated market expectations, or guidance disappoints", "Earnings reports never affect price", "It's a pricing error every time"], correct: 1 },
        { q: "What does 'diworsification' refer to?", options: ["Ideal diversification", "Over-diversifying to the point where it dilutes returns without meaningfully reducing risk", "Investing in only one stock", "A tax strategy"], correct: 1 },
        { q: "What is 'quantitative easing' broadly intended to do?", options: ["Raise interest rates sharply", "Increase money supply/liquidity to stimulate the economy", "Shrink the stock market", "Eliminate all government debt"], correct: 1 },
        { q: "What does a 'moat' mean in company analysis?", options: ["A company's physical office perimeter", "A durable competitive advantage that protects profits from competitors", "A type of bond", "A trading fee"], correct: 1 },
        { q: "How does duration risk generally relate to bonds?", options: ["Longer-duration bonds are typically more sensitive to interest rate changes", "Duration has no effect on bond prices", "Shorter-duration bonds are always riskier", "Duration only matters for stocks"], correct: 0 },
        { q: "What is 'survivorship bias' in the context of historical index/stock performance?", options: ["Considering only currently-listed companies, ignoring those that failed or were delisted, which can overstate past returns", "A bias toward small-cap stocks", "A tax rule for surviving heirs", "A type of stock order"], correct: 0 },
        { q: "What does 'free cash flow' roughly measure?", options: ["Cash a company generates after operating expenses and capital expenditures", "Total revenue before any costs", "The company's stock price", "Dividends paid to shareholders only"], correct: 0 },
        { q: "Why can high-frequency news reactions be misleading for long-term investors?", options: ["News never affects prices", "Short-term price moves often reflect sentiment/noise rather than a company's underlying long-term value", "Reacting quickly always beats holding", "It guarantees better timing"], correct: 1 },
      ],
    ],
  },
};

// Renders simple AI-generated markdown (just **bold** + line breaks) as real
// HTML instead of dumping raw asterisks on screen.
function FormattedText({ text }) {
  if (!text) return null;
  const lines = String(text).split("\n").filter((l) => l.trim() !== "");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <p key={i} className="aiTextLine">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      })}
    </>
  );
}

// Static quiz flow: menu → in-progress → results. Tracks a per-difficulty
// best score locally (localStorage) so users can retake and improve.
function QuizSection() {
  const [difficulty, setDifficulty] = useState(null); // null = showing menu
  const [activeQuestions, setActiveQuestions] = useState(null); // resolved question list in use
  const [loadingDiff, setLoadingDiff] = useState(null); // which difficulty is currently loading
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]); // [{selected, correct}]
  const [selected, setSelected] = useState(null);
  const [showResults, setShowResults] = useState(false);

  function bestScore(diff) {
    try {
      return localStorage.getItem(`quizBest_${diff}`);
    } catch {
      return null;
    }
  }

  function pickStaticSet(diff) {
    const sets = quizData[diff].questionSets;
    return sets[Math.floor(Math.random() * sets.length)];
  }

  // Single entry point: try to generate a fresh AI quiz, and if that fails
  // or takes too long, fall back to a random static question set — quietly,
  // with no "AI generated" labeling either way.
  async function startQuiz(diff) {
    setLoadingDiff(diff);
    setStep(0);
    setAnswers([]);
    setSelected(null);
    setShowResults(false);

    try {
      const response = await fetch(`${API}/ai/quiz-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: diff }),
      });
      const data = await response.json();

      if (!response.ok || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data.error || "Could not generate quiz");
      }

      setActiveQuestions(data.questions);
    } catch (err) {
      setActiveQuestions(pickStaticSet(diff));
    } finally {
      setDifficulty(diff);
      setLoadingDiff(null);
    }
  }

  function pickAnswer(idx) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function nextQuestion() {
    const questions = activeQuestions;
    const isCorrect = questions[step].correct === selected;
    const newAnswers = [...answers, { selected, correct: isCorrect }];
    setAnswers(newAnswers);
    setSelected(null);

    if (step + 1 >= questions.length) {
      const score = newAnswers.filter((a) => a.correct).length;
      try {
        const prevBest = Number(localStorage.getItem(`quizBest_${difficulty}`) || 0);
        if (score > prevBest) localStorage.setItem(`quizBest_${difficulty}`, String(score));
      } catch {
        // localStorage unavailable — skip persisting best score
      }
      setShowResults(true);
    } else {
      setStep(step + 1);
    }
  }

  function backToMenu() {
    setDifficulty(null);
    setActiveQuestions(null);
  }

  // ── Menu ──────────────────────────────────────────────────────────────
  if (!difficulty) {
    return (
      <div className="quizMenuGrid">
        {Object.entries(quizData).map(([key, d]) => (
          <div className="quizDiffCard" key={key}>
            <h3>{d.label}</h3>
            <p>{d.desc}</p>
            <div className="quizDiffBest">Best score: {bestScore(key) ?? "—"}/10</div>
            <div className="quizDiffActions">
              <button className="quizStartBtn" onClick={() => startQuiz(key)} disabled={loadingDiff === key}>
                {loadingDiff === key ? "Loading..." : "Start quiz"}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activeQuestions) return null;
  const questions = activeQuestions;

  // ── Results ───────────────────────────────────────────────────────────
  if (showResults) {
    const score = answers.filter((a) => a.correct).length;
    return (
      <div className="quizCard">
        <h3>{quizData[difficulty].label} quiz — complete!</h3>
        <div className="quizResultsScore">{score} / {questions.length}</div>
        <p>
          {score === questions.length
            ? "Perfect score! 🎉"
            : score >= questions.length * 0.7
            ? "Nice work — you know this well."
            : "Good effort — review the answers below to sharpen up."}
        </p>

        {answers.map((a, i) => (
          <div className="quizReviewItem" key={i}>
            <div className="quizReviewQ">{i + 1}. {questions[i].q}</div>
            <div className={`quizReviewAns ${a.correct ? "right" : "wrong"}`}>
              Your answer: {questions[i].options[a.selected] ?? "No answer"} {a.correct ? "✓" : "✗"}
            </div>
            {!a.correct && (
              <div className="quizReviewAns right">
                Correct answer: {questions[i].options[questions[i].correct]}
              </div>
            )}
          </div>
        ))}

        <div className="quizActionsRow">
          <button className="quizRetakeBtn" onClick={() => startQuiz(difficulty)}>Retake quiz</button>
          <button className="quizBackBtn" onClick={backToMenu}>Back to quizzes</button>
        </div>
      </div>
    );
  }

  // ── In-progress question ────────────────────────────────────────────
  const question = questions[step];

  return (
    <div className="quizCard">
      <div className="quizProgress">
        {quizData[difficulty].label} · Question {step + 1} of {questions.length}
      </div>
      <div className="quizQuestion">{question.q}</div>
      <div className="quizOptions">
        {question.options.map((opt, i) => {
          let cls = "quizOption";
          if (selected !== null) {
            cls += " disabledOpt";
            if (i === question.correct) cls += " correct";
            else if (i === selected) cls += " incorrect";
          }
          return (
            <button key={i} className={cls} onClick={() => pickAnswer(i)}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="quizNextRow">
          <button className="quizNextBtn" onClick={nextQuestion}>
            {step + 1 >= questions.length ? "See results" : "Next question"}
          </button>
        </div>
      )}

      <div className="quizActionsRow">
        <button className="quizBackBtn" onClick={backToMenu}>Exit quiz</button>
      </div>
    </div>
  );
}

function BasicsCard({ item, onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`basicsCard ${expanded ? "basicsCardExpanded" : ""}`} onClick={() => setExpanded(e => !e)}>
      <div className="basicsCardHeader">
        <div className="basicsCardLeft">
          <span className="basicsEmoji">{item.emoji}</span>
          <div>
            <h3 className="basicsTitle">{item.title}</h3>
            {!expanded && <p className="basicsShort">{item.short}</p>}
          </div>
        </div>
        <div className="basicsCardRight">
          <span className="basicsTag">{item.tag}</span>
          <span className="basicsChevron">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="basicsExpanded" onClick={e => e.stopPropagation()}>
          <BasicsVisual type={item.key} />
          <div className="basicsDetail">
            <p>{item.detail}</p>
          </div>
          <div className="basicsCta" onClick={() => {
            if (item.key === "why" || item.key === "longterm" || item.key === "firststock") onNavigate("simulator");
            else if (item.key === "portfolio") onNavigate("portfolio");
            else onNavigate("search");
          }}>
            {item.cta}
          </div>
        </div>
      )}

      {!expanded && <div className="basicsClickHint">Click to learn more →</div>}
    </div>
  );
}

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
        <div className="peDot" style={{ left: "36%" }}><div className="peDotInner peAvg" /><div className="peDotLabel peAvgLabel">S&P 500<br />~22</div></div>
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
          <div className="yieldPointerLabel">This stock <b>0.6%</b></div>
          <div className="yieldPointerDot" />
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
        {/* Calm 0–0.8: bold green */}
        <path d="M20,100 A80,80 0 0,1 62,28" fill="none" stroke="#2ecc71" strokeWidth="16" strokeLinecap="butt" />
        {/* Market-like 0.8–1.2: steel blue */}
        <path d="M62,28 A80,80 0 0,1 94,21" fill="none" stroke="#95a5a6" strokeWidth="16" strokeLinecap="butt" />
        {/* Aggressive 1.2–2.0: amber */}
        <path d="M94,21 A80,80 0 0,1 153,38" fill="none" stroke="#f39c12" strokeWidth="16" strokeLinecap="butt" />
        {/* Very risky 2.0–3.0: bold red */}
        <path d="M153,38 A80,80 0 0,1 180,100" fill="none" stroke="#e74c3c" strokeWidth="16" strokeLinecap="butt" />
        {/* Needle pointing to beta=1.2 */}
        <line x1="100" y1="100" x2="75" y2="24" stroke="#173427" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="7" fill="#173427" />
        <text x="100" y="116" textAnchor="middle" fontSize="12" fontWeight="800" fill="#173427">β 1.2</text>
        <text x="14" y="112" fontSize="8" fill="#2ecc71" fontWeight="700">Calm</text>
        <text x="152" y="112" fontSize="8" fill="#e74c3c" fontWeight="700">Risky</text>
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
      </div>
    </div>
  );
}
function SimulatorChart({ history, buyIndex, currentIndex }) {
  if (!history || !history.prices || history.prices.length === 0) {
    return null;
  }

  const chartData = history.dates
    .slice(buyIndex, currentIndex + 1)
    .map((date, index) => {
      const actualIndex = buyIndex + index;

      return {
        date,
        price: history.prices[actualIndex],
      };
    });

  if (chartData.length === 0) {
    return null;
  }

  const buyPrice = history.prices[buyIndex];
  const latestPrice = history.prices[currentIndex];
  const isLoss = buyPrice != null && latestPrice != null && latestPrice < buyPrice;
  const lineColor = isLoss ? "#d64545" : "#15975b";

  return (
    <div className="sim-chart-box">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit",
              });
            }}
            minTickGap={40}
          />

          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />

          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Price"]}
            labelFormatter={(date) => {
              const d = new Date(date);
              return d.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
            }}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
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
  const [userName, setUserName] = useState("Guest");
  const [timeFrame, setTimeFrame] = useState("1D");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [learnSection, setLearnSection] = useState("basics");
  const [openMetric, setOpenMetric] = useState(null);
  const [insightIndex, setInsightIndex] = useState(0);
  const [authUser, setAuthUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Market indices strip (live) ─────────────────────────────────────────
  const [marketIndices, setMarketIndices] = useState([
    { name: "S&P 500", value: "—", change: 0 },
    { name: "NASDAQ", value: "—", change: 0 },
    { name: "DOW JONES", value: "—", change: 0 },
  ]);

  // ── AI Assistant chat state ─────────────────────────────────────────────
  const AI_CHAT_WELCOME = {
    role: "assistant",
    text: "Hi! I'm the StockSense AI Assistant. Ask me anything about investing, the stock market, or how a metric works — I'll keep it beginner-friendly. This is educational only, not financial advice."
  };
  const AI_CHAT_MAX_MESSAGES = 30; // auto-trim so history/localStorage never grows unbounded
  const [aiChatMessages, setAiChatMessages] = useState([AI_CHAT_WELCOME]);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatLevel, setAiChatLevel] = useState("");
  const aiChatSuggestions = [
    "What's a P/E ratio in simple terms?",
    "What does diversification mean?",
    "How is an ETF different from a single stock?",
    "What's the difference between growth and value investing?",
  ];

  function clearAiChat() {
    setAiChatMessages([AI_CHAT_WELCOME]);
  }

  // ── Leaderboard state ────────────────────────────────────────────────
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // ── Portfolio / Firestore state ─────────────────────────────────────────
  const [cash, setCash] = useState(null);            // null = not loaded yet
  const [positions, setPositions] = useState([]);     // [{ticker, shares, avgCost}]
  const [positionQuotes, setPositionQuotes] = useState({}); // ticker -> live quote
  const [txLog, setTxLog] = useState([]);
  const [tradeShares, setTradeShares] = useState("");
  const [tradeError, setTradeError] = useState("");
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeMsg, setTradeMsg] = useState("");

  // ── Chart state ─────────────────────────────────────────────────────────
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const canvasRef = useRef(null);

  // ── Live data from backend ──────────────────────────────────────────────
  const [searchIndex, setSearchIndex] = useState([]);   // full ticker list for autocomplete
  const [movers, setMovers] = useState({ gainers: [], losers: [] });
  const [moversLoading, setMoversLoading] = useState(true);
  const [sectorStocks, setSectorStocks] = useState([]);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [stockDetail, setStockDetail] = useState(null);  // real data for selected stock
  const [stockLoading, setStockLoading] = useState(false);

  // ── Live search fallback state ──────────────────────────────────────────
  const [liveResults, setLiveResults] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveSearched, setLiveSearched] = useState(false); // has user triggered live search?
  const liveSearchTimer = useRef(null);
  // ── Simulator state ─────────────────────────────────────────────────────
  const [, setSimTicker] = useState("");
  const [simSearch, setSimSearch] = useState("");
  const [showSimDropdown, setShowSimDropdown] = useState(false);
  const [simHistory, setSimHistory] = useState(null);
  const [buyIndex, setBuyIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [investmentAmount, setInvestmentAmount] = useState(10000);
  const [hasInvested, setHasInvested] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [simAiMessages, setSimAiMessages] = useState([
    {
      role: "assistant",
      text: "I can explain what happened to your historical investment once you load a stock, invest virtual money, and scrub forward."
    }
  ]);

  const [simAiLoading, setSimAiLoading] = useState(false);

  const buyPrice = simHistory ? simHistory.prices[buyIndex] : 0;
  const currentPrice = simHistory ? simHistory.prices[currentIndex] : 0;
  const currentVolume = simHistory ? simHistory.volumes[currentIndex] : 0;

  const sharesBought = hasInvested && buyPrice
    ? investmentAmount / buyPrice
    : 0;

  const portfolioValue = hasInvested
    ? sharesBought * currentPrice
    : 0;

  const profitLoss = hasInvested
    ? portfolioValue - investmentAmount
    : 0;

  const returnPercentage = hasInvested && investmentAmount
    ? (profitLoss / investmentAmount) * 100
    : 0;
    const cleanSimSearch = simSearch.trim().toUpperCase();

    const simSearchResults = useMemo(() => {
      const searchText = simSearch.trim().toLowerCase();

      if (!searchText) {
        return [];
      }

const source = searchIndex.length > 0 ? searchIndex : stocks;

return source
  .filter((stock) =>
    stock.ticker.toLowerCase().includes(searchText) ||
    stock.name.toLowerCase().includes(searchText) ||
    (stock.sector || "").toLowerCase().includes(searchText)
  )
  .slice(0, 6);
}, [simSearch, searchIndex]);

const hasExactSimTickerMatch = simSearchResults.some(
  (stock) => stock.ticker.toUpperCase() === cleanSimSearch
);

const showRawTickerOption =
  cleanSimSearch.length >= 1 &&
  /^[A-Z0-9.-]+$/.test(cleanSimSearch) &&
  !hasExactSimTickerMatch;

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
  }, [dailyInsights.length]);

  // Fetch live index prices (S&P 500, NASDAQ, DOW) once on mount.
  // Backend already fetches these live via yfinance — just wire it up.
  useEffect(() => {
    fetch(`${API}/market/indices`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMarketIndices(data);
        }
      })
      .catch(() => {
        // keep the "—" placeholders — better than showing stale hardcoded numbers
      });
  }, []);

  // Daily market news for the dashboard "Market News" card.
  const [marketNews, setMarketNews] = useState([]);
  const [marketNewsLoading, setMarketNewsLoading] = useState(true);
  useEffect(() => {
    setMarketNewsLoading(true);
    fetch(`${API}/market/news`)
      .then((r) => r.json())
      .then((data) => {
        setMarketNews(Array.isArray(data) ? data : []);
        setMarketNewsLoading(false);
      })
      .catch(() => setMarketNewsLoading(false));
  }, []);

  // Fetch search index once on mount — used for autocomplete
  // Merges API results with local stocks so local data always works even if API is down
  useEffect(() => {
    fetch(`${API}/search/index`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return; // keep local stocks as fallback
        // Normalize API items — backend may return { ticker, name, sector } or similar
        const normalized = data.map(item => ({
          ticker: item.ticker || item.symbol || "",
          name:   item.name   || item.longName || item.ticker || "",
          sector: item.sector || "Unknown",
        })).filter(item => item.ticker);
        // Merge: local stocks first (trusted), then API items not already in local list
        const localTickers = new Set(stocks.map(s => s.ticker));
        const apiOnly = normalized.filter(item => !localTickers.has(item.ticker));
        setSearchIndex([...stocks, ...apiOnly]);
      })
      .catch(() => {
        // API down — just use local stocks for autocomplete
        setSearchIndex(stocks);
      });
  }, []);

  // Fetch movers whenever search page is opened
  useEffect(() => {
    if (page !== "search") return;
    setMoversLoading(true);
    fetch(`${API}/stocks/movers?n=6`)
      .then(r => r.json())
      .then(data => {
        const gainers = Array.isArray(data?.gainers) ? data.gainers : [];
        const losers  = Array.isArray(data?.losers)  ? data.losers  : [];
        if (gainers.length === 0 && losers.length === 0) {
          // API returned empty or wrong shape — fall back to local stocks
          const sorted = [...stocks].sort((a, b) => b.change - a.change);
          setMovers({ gainers: sorted.slice(0, 6), losers: sorted.slice(-6).reverse() });
        } else {
          setMovers({ gainers, losers });
        }
        setMoversLoading(false);
      })
      .catch(() => {
        // API down — derive movers from local static stocks
        const sorted = [...stocks].sort((a, b) => b.change - a.change);
        setMovers({ gainers: sorted.slice(0, 6), losers: sorted.slice(-6).reverse() });
        setMoversLoading(false);
      });
  }, [page]);

  // Fetch sector stocks when sector tab changes - uses expanded universe, returns top 10 by volume ratio
  useEffect(() => {
    if (page !== "search") return;
    setSectorLoading(true);
    const tickers = (SECTOR_UNIVERSE[selectedSector] || []).join(",");
    fetch(`${API}/stocks/trending?tickers=${encodeURIComponent(tickers)}&n=10`)
      .then(r => r.json())
      .then(data => { setSectorStocks(Array.isArray(data) ? data : []); setSectorLoading(false); })
      .catch(() => {
        // Fallback to old sector endpoint
        fetch(`${API}/stocks/list?sector=${encodeURIComponent(selectedSector)}`)
          .then(r => r.json())
          .then(data => { setSectorStocks(data.slice(0, 10)); setSectorLoading(false); })
          .catch(() => setSectorLoading(false));
      });
  }, [selectedSector, page]);

  // Fetch full stock detail when a stock is selected
  useEffect(() => {
    if (!selectedStock) return;
    setStockLoading(true);
    fetch(`${API}/stock/${selectedStock.ticker}`)
      .then(r => r.json())
      .then(data => { setStockDetail(data); setStockLoading(false); })
      .catch(() => setStockLoading(false));
  }, [selectedStock]);

  // Fetch recent news for the selected stock (last 30 days)
  const [stockNews, setStockNews] = useState([]);
  const [stockNewsLoading, setStockNewsLoading] = useState(false);
  useEffect(() => {
    if (!selectedStock) return;
    setStockNews([]);
    setStockNewsLoading(true);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d) => d.toISOString().slice(0, 10);
    fetch(`${API}/news/${selectedStock.ticker}?from=${fmt(from)}&to=${fmt(to)}`)
      .then(r => r.json())
      .then(data => {
        setStockNews(Array.isArray(data.articles) ? data.articles : []);
        setStockNewsLoading(false);
      })
      .catch(() => setStockNewsLoading(false));
  }, [selectedStock]);

  // Fetch chart data when stock or timeframe changes
  useEffect(() => {
    if (!selectedStock || page !== "stock") return;
    setChartLoading(true);
    setChartData(null);
    fetch(`${API}/stock/${selectedStock.ticker}/chart?range=${timeFrame}`)
      .then(r => r.json())
      .then(data => { setChartData(data); setChartLoading(false); })
      .catch(() => setChartLoading(false));
  }, [selectedStock, timeFrame, page]);

  // ── Chart hover state ──────────────────────────────────────────────────
  const [hoverInfo, setHoverInfo] = useState(null);
  const chartMetaRef = useRef(null);

  function drawChart(canvas, data) {
    if (!canvas || !data || data.error) return;
    const ctx = canvas.getContext("2d");
    const { closes, labels, period_change } = data;
    if (!closes || closes.length === 0) return;

    canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const padL = 60, padR = 18, padT = 24, padB = 40;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const minP = Math.min(...closes);
    const maxP = Math.max(...closes);
    const range = maxP - minP || 1;

    const xOf = i => padL + (i / (closes.length - 1)) * chartW;
    const yOf = v => padT + (1 - (v - minP) / range) * chartH;

    const isUp = period_change >= 0;
    const lineColor = isUp ? "#1a9e5c" : "#e74c3c";

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
    grad.addColorStop(0, isUp ? "rgba(26,158,92,0.20)" : "rgba(231,76,60,0.16)");
    grad.addColorStop(1, isUp ? "rgba(26,158,92,0.01)" : "rgba(231,76,60,0.01)");
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(closes[0]));
    closes.forEach((v, i) => ctx.lineTo(xOf(i), yOf(v)));
    ctx.lineTo(xOf(closes.length - 1), padT + chartH);
    ctx.lineTo(xOf(0), padT + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(closes[0]));
    closes.forEach((v, i) => ctx.lineTo(xOf(i), yOf(v)));
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // End dot
    ctx.beginPath();
    ctx.arc(xOf(closes.length - 1), yOf(closes[closes.length - 1]), 5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    // Y gridlines + labels (5 levels)
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = minP + (range * i) / 4;
      const y = yOf(v);
      ctx.fillStyle = "#8a9e90";
      ctx.fillText(`$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(2)}`, padL - 6, y + 4);
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = "rgba(0,0,0,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // X axis labels (up to 5)
    ctx.textAlign = "center";
    ctx.fillStyle = "#8a9e90";
    const xTicks = Math.min(5, labels.length);
    for (let i = 0; i < xTicks; i++) {
      const idx = Math.round((i / (xTicks - 1)) * (labels.length - 1));
      ctx.fillText(labels[idx], xOf(idx), h - 8);
    }

    // Store meta for hover
    chartMetaRef.current = { xOf, yOf, closes, labels, padL, padR, padT, chartW, chartH, w, h };
  }

  // Draw chart on canvas whenever chartData changes
  useEffect(() => {
    if (!chartData || !canvasRef.current || chartData.error) return;
    drawChart(canvasRef.current, chartData);
    setHoverInfo(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData]);

  const handleChartMouseMove = useCallback((e) => {
    const meta = chartMetaRef.current;
    if (!meta || !chartData || chartData.error) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { xOf, yOf, closes, labels, padL, padR, padT, chartW, chartH, w } = meta;
    if (mx < padL || mx > w - padR || my < padT || my > padT + chartH) { setHoverInfo(null); return; }
    const idx = Math.max(0, Math.min(closes.length - 1, Math.round(((mx - padL) / chartW) * (closes.length - 1))));
    const hoverPrice = closes[idx];
    const openPrice = closes[0];
    const pctChange = openPrice > 0 ? ((hoverPrice - openPrice) / openPrice) * 100 : 0;
    setHoverInfo({ x: xOf(idx), y: yOf(hoverPrice), price: hoverPrice, label: labels[idx], pctChange });
  }, [chartData]);

  const handleChartMouseLeave = useCallback(() => setHoverInfo(null), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        setUserName(user.displayName || user.email.split("@")[0]);
      } else {
        setCash(null);
        setPositions([]);
        setTxLog([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Live subscription to the user's cash balance + positions + recent trades.
  // Firestore pushes updates automatically, so buying/selling on any tab/device
  // keeps everything in sync without manual refetching.
  useEffect(() => {
    if (!authUser) return;

    const userRef = doc(db, "users", authUser.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setCash(snap.data().cash ?? 0);
        setLeaderboardOptIn(snap.data().leaderboardOptIn ?? false);
      }
    });

    const positionsRef = collection(db, "users", authUser.uid, "positions");
    const unsubPositions = onSnapshot(positionsRef, (snap) => {
      setPositions(snap.docs.map((d) => ({ ticker: d.id, ...d.data() })));
    });

    const txRef = firestoreQuery(
      collection(db, "users", authUser.uid, "transactions"),
      orderBy("timestamp", "desc"),
      limit(25)
    );
    const unsubTx = onSnapshot(txRef, (snap) => {
      setTxLog(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUser();
      unsubPositions();
      unsubTx();
    };
  }, [authUser]);

  // Total account value (cash + live holdings) — used to power the leaderboard.
  const netWorth = useMemo(() => {
    const holdingsValue = positions.reduce((sum, p) => {
      const q = positionQuotes[p.ticker];
      const price = q?.price ?? p.avgCost;
      return sum + price * p.shares;
    }, 0);
    return (cash || 0) + holdingsValue;
  }, [cash, positions, positionQuotes]);

  // Keep the public "leaderboard" collection in sync with this user's opt-in
  // choice and net worth. Only ticker-agnostic display info is written here —
  // never email or cash/position breakdowns — since anyone can read this
  // collection to render the board.
  useEffect(() => {
    if (!authUser) return;
    if (cash === null) return; // wait until real data has loaded, avoid writing $0

    const lbRef = doc(db, "leaderboard", authUser.uid);
    const timer = setTimeout(() => {
      if (leaderboardOptIn) {
        setDoc(lbRef, {
          displayName: userName || "Investor",
          netWorth,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } else {
        deleteDoc(lbRef).catch(() => {});
      }
    }, 1200); // small debounce so rapid trades don't spam writes

    return () => clearTimeout(timer);
  }, [authUser, leaderboardOptIn, netWorth, userName, cash]);

  // Subscribe to the public leaderboard while that page is open.
  useEffect(() => {
    if (page !== "leaderboard") return;
    setLeaderboardLoading(true);

    const unsub = onSnapshot(
      collection(db, "leaderboard"),
      (snap) => {
        const rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        rows.sort((a, b) => (b.netWorth || 0) - (a.netWorth || 0));
        setLeaderboardRows(rows);
        setLeaderboardLoading(false);
      },
      () => setLeaderboardLoading(false)
    );

    return () => unsub();
  }, [page]);

  const [leaderboardJustToggled, setLeaderboardJustToggled] = useState(false);

  function toggleLeaderboardOptIn() {
    if (!authUser) return;
    const next = !leaderboardOptIn;
    setLeaderboardOptIn(next);
    setDoc(doc(db, "users", authUser.uid), { leaderboardOptIn: next }, { merge: true }).catch(() => {});
    setLeaderboardJustToggled(true);
    setTimeout(() => setLeaderboardJustToggled(false), 400);
  }

  // Live quotes for everything currently held — powers the Positions table.
  useEffect(() => {
    if (positions.length === 0) {
      setPositionQuotes({});
      return;
    }
    const tickers = positions.map((p) => p.ticker).join(",");
    fetch(`${API}/stocks/trending?tickers=${encodeURIComponent(tickers)}&n=${positions.length}`)
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        (Array.isArray(data) ? data : []).forEach((q) => { map[q.ticker] = q; });
        setPositionQuotes(map);
      })
      .catch(() => {});
  }, [positions]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Autocomplete from live search index (falls back to local stocks if index not loaded yet)
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const source = searchIndex.length > 0 ? searchIndex : stocks;
    return source
      .filter(s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, searchIndex]);

  // Live results deduped against local suggestions (no duplicates in dropdown)
  const dedupedLiveResults = useMemo(() => {
    const localTickers = new Set(suggestions.map(s => s.ticker));
    return liveResults.filter(s => !localTickers.has(s.ticker));
  }, [liveResults, suggestions]);

  // Reset live search whenever query changes; auto-trigger if no local results after delay
  useEffect(() => {
    setLiveResults([]);
    setLiveSearched(false);
    clearTimeout(liveSearchTimer.current);

    if (!query.trim()) return;

    // Auto-trigger live search after 600ms if no local results
    liveSearchTimer.current = setTimeout(() => {
      const source = searchIndex.length > 0 ? searchIndex : stocks;
      const hasLocal = source.some(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.ticker.toLowerCase().includes(query.toLowerCase())
      );
      if (!hasLocal) {
        setLiveLoading(true);
        setLiveSearched(true);
        fetch(`${API}/search?q=${encodeURIComponent(query.trim())}&limit=10`)
          .then(r => r.json())
          .then(data => {
            setLiveResults(Array.isArray(data) ? data : (data.results || []));
            setLiveLoading(false);
          })
          .catch(() => setLiveLoading(false));
      }
    }, 600);
  }, [query, searchIndex]);

  function triggerLiveSearch() {
    if (!query.trim() || liveLoading) return;
    setLiveLoading(true);
    setLiveSearched(true);
    fetch(`${API}/search?q=${encodeURIComponent(query.trim())}&limit=10`)
      .then(r => r.json())
      .then(data => {
        setLiveResults(Array.isArray(data) ? data : (data.results || []));
        setLiveLoading(false);
      })
      .catch(() => setLiveLoading(false));
  }

  const topGainers = movers.gainers || [];
  const topLosers = movers.losers || [];

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function goStock(stock) {
    // stock may come from local index (no price) or movers (has price) — normalise
    const base = stocks.find(s => s.ticker === stock.ticker) || stock;
    setSelectedStock({ ...base, ...stock });
    setStockDetail(null); // clear previous detail while new one loads
    setRecent((prev) => [stock.ticker, ...prev.filter((x) => x !== stock.ticker)].slice(0, 5));
    setPage("stock");
    setQuery("");
    setTradeShares("");
    setTradeError("");
    setTradeMsg("");
  }

  function searchStock() {
    const q = query.toLowerCase().trim();
    if (!q) return;
    // Search live index first, fall back to local stocks
    const source = searchIndex.length > 0 ? searchIndex : stocks;
    const found = source.find(s => s.ticker.toLowerCase() === q || s.name.toLowerCase() === q);
    if (found) { goStock(found); return; }
    // Also try partial name match
    const partial = source.find(s => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    if (partial) { goStock(partial); return; }
    // Try the search API (handles partial/fuzzy matches the local index might miss)
    fetch(`${API}/search?q=${encodeURIComponent(query.trim())}&limit=1`)
      .then(r => r.json())
      .then(data => {
        const results = Array.isArray(data) ? data : (data.results || []);
        if (results.length > 0) { goStock(results[0]); return; }
        // Last resort: try direct API lookup for an exact ticker
        const upperQ = query.trim().toUpperCase();
        fetch(`${API}/stock/${upperQ}`)
          .then(r => r.json())
          .then(detail => {
            if (detail && detail.price) {
              const synth = { ticker: upperQ, name: detail.name || upperQ, sector: detail.sector || "Stock", price: detail.price, change: detail.change || 0 };
              goStock(synth);
            }
          })
          .catch(() => {});
      })
      .catch(() => {});
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

  const sectors = ["ETFs", "Technology", "Energy", "Travel", "Healthcare", "Finance", "E-Commerce", "Consumer Goods", "Health & Fitness"];

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
          setUserName(displayName.trim());
        }
        // Grant the $10,000 demo balance — only happens once, right here at signup.
        await setDoc(doc(db, "users", cred.user.uid), {
          email: cred.user.email,
          displayName: displayName.trim() || cred.user.email.split("@")[0],
          cash: STARTING_CASH,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail(""); setPassword(""); setDisplayName("");
    } catch (error) {
      setAuthError(error.message.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim());
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setUserName("Guest");
    setPage("account");
  }

  function getMyPosition(ticker) {
    return positions.find((p) => p.ticker === ticker);
  }

  async function executeTrade(type, ticker, name, shares, price) {
    if (!authUser) { setTradeError("Sign in to trade."); return; }
    const numShares = Number(shares);
    if (!numShares || numShares <= 0) { setTradeError("Enter a valid number of shares."); return; }
    if (!price || price <= 0) { setTradeError("Price unavailable — try again in a moment."); return; }

    setTradeBusy(true);
    setTradeError("");
    setTradeMsg("");

    const userRef = doc(db, "users", authUser.uid);
    const positionRef = doc(db, "users", authUser.uid, "positions", ticker);
    const total = Math.round(numShares * price * 100) / 100;

    try {
      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const posSnap = await tx.get(positionRef);
        const currentCash = userSnap.exists() ? (userSnap.data().cash || 0) : 0;
        const currentPos = posSnap.exists() ? posSnap.data() : null;

        if (type === "buy") {
          if (total > currentCash) {
            throw new Error(`Not enough cash. You have $${currentCash.toFixed(2)}, this trade costs $${total.toFixed(2)}.`);
          }
          const newShares = (currentPos?.shares || 0) + numShares;
          const newCost = ((currentPos?.shares || 0) * (currentPos?.avgCost || 0) + total) / newShares;
          tx.set(positionRef, { ticker, name, shares: newShares, avgCost: newCost, updatedAt: serverTimestamp() });
          tx.update(userRef, { cash: currentCash - total });
        } else {
          // sell — no shorting, can only sell what you own
          const ownedShares = currentPos?.shares || 0;
          if (numShares > ownedShares + 1e-9) {
            throw new Error(`You only own ${ownedShares} shares of ${ticker}.`);
          }
          const remaining = ownedShares - numShares;
          if (remaining < 1e-6) {
            tx.delete(positionRef);
          } else {
            tx.update(positionRef, { shares: remaining, updatedAt: serverTimestamp() });
          }
          tx.update(userRef, { cash: currentCash + total });
        }
      });

      await addDoc(collection(db, "users", authUser.uid, "transactions"), {
        ticker, name, type, shares: numShares, price, total, timestamp: serverTimestamp(),
      });

      setTradeMsg(`${type === "buy" ? "Bought" : "Sold"} ${numShares} share${numShares === 1 ? "" : "s"} of ${ticker} at $${price.toFixed(2)}.`);
      setTradeShares("");
    } catch (err) {
      setTradeError(err.message || "Trade failed.");
    } finally {
      setTradeBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteUser(authUser);
      setConfirmDelete(false);
      setUserName("Guest");
      setPage("account");
    } catch {
      setAuthError("Please log out and log back in before deleting. (Firebase requires recent login)");
      setConfirmDelete(false);
    }
  }
  async function loadSimulationHistory(tickerOverride) {
  setSimLoading(true);
  setSimError("");
  setSimHistory(null);
  setHasInvested(false);

  try {
    let tickerToLoad = tickerOverride;

    if (!tickerToLoad) {
      const source = searchIndex.length > 0 ? searchIndex : stocks;
      const q = simSearch.trim().toLowerCase();

      const match = source.find((s) =>
        s.ticker.toLowerCase() === q ||
        s.name.toLowerCase() === q ||
        s.name.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q)
      );

      if (match) {
        tickerToLoad = match.ticker;
      } else {
        try {
          const searchRes = await fetch(
            `${API}/search?q=${encodeURIComponent(simSearch.trim())}&limit=1`
          );

          const searchData = await searchRes.json();
          const results = Array.isArray(searchData)
            ? searchData
            : (searchData.results || []);

          tickerToLoad = results.length > 0
            ? results[0].ticker
            : simSearch.trim().split(" ")[0].toUpperCase();
        } catch {
          tickerToLoad = simSearch
            .trim()
            .split(" ")[0]
            .toUpperCase();
        }
      }
    }

    tickerToLoad = tickerToLoad.trim().toUpperCase();

    const response = await fetch(
      `${API}/simulation/history/${encodeURIComponent(tickerToLoad)}`
    );

    const data = await response.json();

    if (!response.ok) {
      setSimError(data.error || `No historical data found for "${tickerToLoad}" — check the name or ticker and try again.`);
      return;
    }

    setSimHistory(data);
    setSimTicker(data.ticker);
    setSimSearch(data.ticker);
    setBuyIndex(0);
    setCurrentIndex(0);
  } catch (error) {
    console.error("Simulation fetch error:", error);
    setSimError(`Could not connect to backend: ${error.message}`);
  } finally {
    setSimLoading(false);
  }
}
  async function sendAiChatMessage(text) {
    const message = (text ?? aiChatInput).trim();
    if (!message || aiChatLoading) return;

    // Only send recent history to the backend — keeps requests small and
    // avoids re-sending an ever-growing transcript.
    const history = aiChatMessages.slice(-12).map((m) => ({ role: m.role, text: m.text }));

    const trim = (msgs) =>
      msgs.length > AI_CHAT_MAX_MESSAGES ? [AI_CHAT_WELCOME, ...msgs.slice(-(AI_CHAT_MAX_MESSAGES - 1))] : msgs;

    setAiChatMessages((prev) => trim([...prev, { role: "user", text: message }]));
    setAiChatInput("");
    setAiChatLoading(true);

    try {
      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, level: aiChatLevel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI chat failed");
      }

      setAiChatMessages((prev) => trim([...prev, { role: "assistant", text: data.reply }]));
    } catch (error) {
      setAiChatMessages((prev) => trim([
        ...prev,
        { role: "assistant", text: `Sorry, I couldn't reply just now. ${error.message}` },
      ]));
    } finally {
      setAiChatLoading(false);
    }
  }

  async function askSimulatorAI() {
    if (!simHistory || !hasInvested) {
      setSimAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Load a stock, choose a buy date, enter an investment amount, and click Invest first. Then I can explain the result."
        }
      ]);
      return;
    }

    const payload = {
      ticker: simHistory.ticker,
      buyDate: simHistory.dates[buyIndex],
      currentDate: simHistory.dates[currentIndex],
      buyPrice: Number(buyPrice).toFixed(2),
      currentPrice: Number(currentPrice).toFixed(2),
      investmentAmount: Number(investmentAmount).toFixed(2),
      portfolioValue: Number(portfolioValue).toFixed(2),
      profitLoss: Number(profitLoss).toFixed(2),
      returnPercentage: Number(returnPercentage).toFixed(2),
    };

    setSimAiMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: `Explain my ${payload.ticker} simulation from ${payload.buyDate} to ${payload.currentDate}.`
      }
    ]);

    setSimAiLoading(true);

    try {
      const response = await fetch(`${API}/ai/simulator-explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI explanation failed");
      }

      setSimAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply
        }
      ]);
    } catch (error) {
      setSimAiMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Sorry, I could not generate the AI explanation yet. ${error.message}`
        }
      ]);
    } finally {
      setSimAiLoading(false);
    }
  }

function skipMonths(monthsToSkip) {
  if (!simHistory) return;

  const currentDate = new Date(simHistory.dates[currentIndex]);
  const targetDate = new Date(currentDate);
  targetDate.setMonth(targetDate.getMonth() + monthsToSkip);

  let nextIndex = currentIndex;

  for (let i = currentIndex; i < simHistory.dates.length; i++) {
    const date = new Date(simHistory.dates[i]);

    if (date >= targetDate) {
      nextIndex = i;
      break;
    }

    nextIndex = i;
  }

  setCurrentIndex(nextIndex);
}

  return (
    <div className="app">
      {openMetric && <MetricModal metric={openMetric} onClose={() => setOpenMetric(null)} />}

      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="StockSense" className="brandLogo" />
          StockSense
        </div>
        {navItems.map(([id, icon, label]) => (
          <button key={id} className={`nav ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>
            <span>{icon}</span>{label}
          </button>
        ))}
        <button className="userBox" onClick={() => setPage("account")}>
          <span className="avatar">👤</span>
          <div><b>{authUser ? userName : "Guest"}</b><small>{authUser ? "Signed in" : "Sign in →"}</small></div>
        </button>
      </aside>

      <main className="main">
        {page === "dashboard" && (
          <>
            <div className="topbar">
              <h1>{greeting}, {authUser ? userName : "there"}! 👋</h1>
            </div>

            {/* Market Overview Strip */}
            <div className="marketStrip">
              {marketIndices.map((idx) => (
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
              {authUser ? (() => {
                const livePos = positions.map(p => {
                  const q = positionQuotes[p.ticker];
                  const price = q?.price ?? p.avgCost;
                  const value = price * p.shares;
                  const change = q?.change ?? 0;
                  const dayChange = value * change / 100;
                  return { ...p, price, value, change, dayChange, name: q?.name || p.name || p.ticker };
                });
                const holdingsValue = livePos.reduce((sum, p) => sum + p.value, 0);
                const totalValue = (cash || 0) + holdingsValue;
                const totalDayChange = livePos.reduce((sum, p) => sum + p.dayChange, 0);
                const totalDayPct = holdingsValue > 0 ? (totalDayChange / (holdingsValue - totalDayChange)) * 100 : 0;
                const biggest = [...livePos].sort((a, b) => b.value - a.value)[0];

                // Build donut pie by stock (top 4 + Others)
                const STOCK_COLORS = ["#1f7d4c","#4caf50","#f4a623","#3498db","#9b59b6","#e67e22","#e87070","#1abc9c"];
                const sorted4 = [...livePos].sort((a,b) => b.value - a.value);
                const top4 = sorted4.slice(0, 4);
                const othersVal = sorted4.slice(4).reduce((s,p) => s + p.value, 0);
                const pieItems = othersVal > 0 ? [...top4, { ticker: "Others", value: othersVal }] : top4;
                const pieTotal = pieItems.reduce((s,p) => s + p.value, 0) || 1;
                let cumAngle = -Math.PI / 2;
                const pieSlices = pieItems.map((p, i) => {
                  const frac = p.value / pieTotal;
                  const start = cumAngle;
                  cumAngle += frac * 2 * Math.PI;
                  const end = cumAngle;
                  const r = 52, cx = 60, cy = 60;
                  const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
                  const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
                  const large = frac > 0.5 ? 1 : 0;
                  const d = pieItems.length === 1
                    ? `M${cx},${cy-r} A${r},${r} 0 1,1 ${cx-0.01},${cy-r} Z`
                    : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                  return { ...p, frac, color: i === pieItems.length-1 && othersVal > 0 ? "#c8d8d0" : STOCK_COLORS[i], d };
                });

                return (
                  <>
                    <div className="card focusCard clickCard dashPortfolioCard" onClick={() => setPage("portfolio")}>
                      <p className="dashPortLabel">Portfolio Value</p>
                      <h2 className="dashPortValue">${totalValue.toFixed(2)}</h2>
                      <div className="dashPortRow">
                        <span className="dashPortCash">Cash ${(cash || 0).toFixed(2)}</span>
                        {holdingsValue > 0 && (
                          <span className={totalDayChange >= 0 ? "green dashPortChange" : "red dashPortChange"}>
                            {totalDayChange >= 0 ? "▲" : "▼"} ${Math.abs(totalDayChange).toFixed(2)} ({Math.abs(totalDayPct).toFixed(2)}%) today
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="card clickCard dashBiggestCard" onClick={() => biggest && goStock(biggest)}>
                      <h3 className="dashBiggestLabel">Biggest Holding</h3>
                      {biggest ? (
                        <>
                          <div className="dashBiggestTop">
                            <div>
                              <div className="dashBiggestTicker">{biggest.ticker}</div>
                              <div className="dashBiggestName">{biggest.name}</div>
                            </div>
                            <span className={biggest.change >= 0 ? "green dashBiggestChg" : "red dashBiggestChg"}>
                              {biggest.change >= 0 ? "▲" : "▼"} {Math.abs(biggest.change).toFixed(2)}%
                            </span>
                          </div>
                          <svg viewBox="0 0 120 40" className="dashSparkline">
                            <polyline
                              points={[10,30, 25,22, 40,26, 55,18, 70,20, 85,12, 100,8, 115,10].map((v,i)=>i%2===0?v:biggest.change>=0?v:40-v+8).join(" ")}
                              fill="none"
                              stroke={biggest.change >= 0 ? "#1f7d4c" : "#e87070"}
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </>
                      ) : (
                        <p className="sim-muted">No positions yet</p>
                      )}
                    </div>

                    {livePos.length > 0 ? (
                      <div className="card clickCard dashMixCard" onClick={() => setPage("portfolio")}>
                        <h3>Holdings Mix</h3>
                        <div className="dashMixInner">
                          <svg viewBox="0 0 120 120" className="dashMixPie">
                            {pieSlices.map((s, i) => (
                              <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="1.5">
                                <title>{s.ticker}: {(s.frac*100).toFixed(1)}%</title>
                              </path>
                            ))}
                            <circle cx="60" cy="60" r="26" fill="white" />
                          </svg>
                          <div className="dashMixLegend">
                            {pieSlices.map((s, i) => (
                              <div key={i} className="dashMixRow">
                                <span className="dashMixDot" style={{ background: s.color }} />
                                <span className="dashMixLabel">{s.ticker}</span>
                                <span className="dashMixPct">{(s.frac*100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="card clickCard" onClick={() => setPage("portfolio")}>
                        <h3>Holdings</h3>
                        <p className="sim-muted">Search for a stock to make your first trade.</p>
                      </div>
                    )}
                  </>
                );
              })() : (
                <div className="card focusCard clickCard tradeSignupCard" onClick={() => { setAuthMode("signup"); setPage("account"); }}>
                  <h3>Sign up to get $10,000 demo cash 💰</h3>
                  <p>Create a free account to start buying and selling real stocks at live prices.</p>
                  <button className="sim-primary-btn">Sign up →</button>
                </div>
              )}
              <div className="card">
                <h3>Top Movers Today</h3>
                {[...stocks].sort((a, b) => b.change - a.change).slice(0, 5).map((s) => (
                  <div className="mover" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "▲" : "▼"} {s.change}%</span>
                  </div>
                ))}
              </div>

              {/* Market News card */}
              <div className="card dashNewsCard">
                <h3>📰 Market News</h3>
                {marketNewsLoading ? (
                  <p className="sim-muted">Loading news...</p>
                ) : marketNews.length === 0 ? (
                  <p className="sim-muted">No news available right now.</p>
                ) : (
                  marketNews.slice(0, 5).map((n, i) => (
                    <a key={i} className="dashNewsItem" href={n.url} target="_blank" rel="noopener noreferrer">
                      <span className="dashNewsHeadline">{n.headline}</span>
                      <span className="dashNewsSource">{n.source}</span>
                    </a>
                  ))
                )}
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
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Apple, AAPL, Tesla, VOO..." onKeyDown={e => e.key === "Enter" && searchStock()} />
              <button onClick={searchStock}>Search</button>
              {query.trim().length > 0 && (
                <div className="suggestions">
                  {/* Popular universe results */}
                  {suggestions.map((s) => (
                    <div key={s.ticker} className="suggestionItem" onMouseDown={() => goStock(s)}>
                      <div className="suggTickerBubble">{s.ticker[0]}</div>
                      <div className="suggMid">
                        <span className="suggTicker">{s.ticker}</span>
                        <span className="suggName">{s.name}</span>
                      </div>
                      <span className="suggSectorTag">{s.sector}</span>
                    </div>
                  ))}

                  {/* Live search results — deduped so no duplicates with local results */}
                  {dedupedLiveResults.map((s) => (
                    <div key={s.ticker} className="suggestionItem suggestionLive" onMouseDown={() => goStock(s)}>
                      <div className="suggTickerBubble liveTickerBubble">{s.ticker[0]}</div>
                      <div className="suggMid">
                        <span className="suggTicker">{s.ticker}</span>
                        <span className="suggName">{s.name}</span>
                      </div>
                      <span className="suggSectorTag liveSectorTag">
                        {s.price != null ? `$${s.price}` : s.sector}
                      </span>
                    </div>
                  ))}

                  {/* Fallback prompt — shown when no local results and live search not yet triggered */}
                  {suggestions.length === 0 && !liveSearched && !liveLoading && (
                    <div className="suggFallback" onMouseDown={triggerLiveSearch}>
                      <span className="suggFallbackIcon">🔍</span>
                      <div className="suggFallbackText">
                        <span>Can't find "<b>{query}</b>"?</span>
                        <small>Search all markets including penny stocks →</small>
                      </div>
                    </div>
                  )}

                  {/* Loading spinner while live search runs */}
                  {liveLoading && (
                    <div className="suggLiveLoading">
                      <span className="suggLiveSpinner" /> Searching all markets...
                    </div>
                  )}

                  {/* No results at all after live search */}
                  {liveSearched && !liveLoading && dedupedLiveResults.length === 0 && suggestions.length === 0 && (
                    <div className="suggNoResults">
                      No results found for "<b>{query}</b>" — check the ticker and try again.
                    </div>
                  )}

                  {/* After local results, show live search option */}
                  {suggestions.length > 0 && !liveSearched && !liveLoading && (
                    <div className="suggFallbackSmall" onMouseDown={triggerLiveSearch}>
                      🔍 Search all markets for "<b>{query}</b>" →
                    </div>
                  )}
                </div>
              )}
            </div>

            <h3 style={{marginBottom: "12px"}}>Daily Top Movers</h3>
            {moversLoading ? (
              <div className="moversLoading">Loading live market data...</div>
            ) : (
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
            )}

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
                {sectorLoading
                  ? <div className="moversLoading">Loading trending stocks...</div>
                  : (sectorStocks.length > 0 ? sectorStocks : stocks.filter(s => s.sector === selectedSector))
                    .map((s) => (
                  <div className="sectorStock" key={s.ticker} onClick={() => goStock(s)}>
                    <div className="logoBubble">{s.ticker[0]}</div>
                    <div className="sectorStockInfo">
                      <b className="rowTicker">{s.ticker}</b>
                      <small className="rowName">{s.name}</small>
                    </div>
                    <div className="sectorStockRight">
                      <span className="sectorPrice">${s.price ?? "—"}</span>
                      <span className={s.change >= 0 ? "green sectorChange" : "red sectorChange"}>{s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change ?? 0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sectionGap" />

            <h3>Recent Searches</h3>
            <div className="chips">
              {recent.map((t) => {
                const source = searchIndex.length > 0 ? searchIndex : stocks;
                const s = source.find((x) => x.ticker === t);
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
              {(searchIndex.length > 0 ? searchIndex : stocks).slice(0, 8).map(s => (
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
              <span className="stockPageName">{stockDetail?.name || selectedStock.name}</span>
              <span className="stockPageTicker">{selectedStock.ticker}</span>
            </h1>
            {stockLoading && <div className="moversLoading">Loading live data...</div>}
            {stockDetail && stockDetail.price && (
              <div className="stockPriceRow">
                <span className="stockBigPrice">{stockDetail.price_fmt}</span>
                {stockDetail.change != null && (
                  <span className={stockDetail.change >= 0 ? "green stockBigChange" : "red stockBigChange"}>
                    {stockDetail.change >= 0 ? "▲" : "▼"} {Math.abs(stockDetail.change).toFixed(2)}%
                    {stockDetail.change_abs != null && ` (${stockDetail.change_abs >= 0 ? "+" : ""}${stockDetail.change_abs})`}
                  </span>
                )}
              </div>
            )}
            {stockDetail && stockDetail.stale && (
              <div className="staleNotice">
                Showing last known data as of {new Date(stockDetail.as_of).toLocaleString()} — live data unavailable right now.
              </div>
            )}

            <div className="timeframes">
              {TIMEFRAMES.map((t) => (
                <button key={t.label} className={timeFrame === t.label ? "selected" : ""} onClick={() => setTimeFrame(t.label)}>{t.display}</button>
              ))}
            </div>

            <div className="stockPageGrid">
              <div className="card stockChartCard">
                <div className="chartHeader">
                  <div>
                    <h3>{stockDetail?.name || selectedStock.name || selectedStock.ticker}</h3>
                    {chartData && !chartData.error && (
                      <span className={chartData.period_change >= 0 ? "green chartPeriodChange" : "red chartPeriodChange"}>
                        {chartData.period_change >= 0 ? "▲" : "▼"} {Math.abs(chartData.period_change)}% this period
                      </span>
                    )}
                  </div>
                  {hoverInfo && (
                    <div className="chartHoverBadge">
                      <span className="chartHoverPrice">${hoverInfo.price?.toFixed(2)}</span>
                      <span className="chartHoverLabel">{hoverInfo.label}</span>
                      <span className={`chartHoverPct ${hoverInfo.pctChange >= 0 ? "green" : "red"}`}>
                        {hoverInfo.pctChange >= 0 ? "▲" : "▼"} {Math.abs(hoverInfo.pctChange).toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
                {chartLoading && <div className="chartLoading">Loading chart...</div>}
                {!chartLoading && chartData?.error && (
                  <div className="chartNoData">No data for this range — intraday (5m/15m/1h) is unavailable on weekends or after market hours.</div>
                )}
                <div className="chartWrap" style={{ display: chartLoading || chartData?.error ? "none" : "block" }}>
                  <canvas
                    ref={canvasRef}
                    className="realChart"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={handleChartMouseLeave}
                  />
                  {hoverInfo && (
                    <div className="chartCrosshair" style={{ left: hoverInfo.x }}>
                      <div className="chartCrosshairDot" style={{ top: hoverInfo.y }} />
                    </div>
                  )}
                </div>
              </div>

              {authUser ? (
                <div className="card tradeCard">
                  <h3>Trade {selectedStock.ticker}</h3>
                  <p className="tradeHint">
                    Demo trading — trades execute instantly at the current price shown above.
                    Real markets only trade during market hours; here you can buy or sell any time, and fractional shares are fine.
                  </p>

                  <div className="tradeRow">
                    <div className="tradeCashInfo">
                      <span>Cash available</span>
                      <strong>{cash != null ? `$${cash.toFixed(2)}` : "—"}</strong>
                    </div>
                    <div className="tradeCashInfo">
                      <span>You own</span>
                      <strong>{getMyPosition(selectedStock.ticker)?.shares ?? 0} shares</strong>
                    </div>
                  </div>

                  <div className="sim-form">
                    <div className="sim-field">
                      <label>Shares</label>
                      <input
                        className="sim-input"
                        type="number"
                        min="0"
                        step="0.0001"
                        placeholder="e.g. 2.5"
                        value={tradeShares}
                        onChange={(e) => setTradeShares(e.target.value)}
                      />
                    </div>
                    <button
                      className="sim-primary-btn"
                      disabled={tradeBusy}
                      onClick={() => executeTrade("buy", selectedStock.ticker, stockDetail?.name || selectedStock.name, tradeShares, stockDetail?.price)}
                    >
                      Buy at ${stockDetail?.price_fmt || "—"}
                    </button>
                    <button
                      className="sim-primary-btn tradeSellBtn"
                      disabled={tradeBusy}
                      onClick={() => executeTrade("sell", selectedStock.ticker, stockDetail?.name || selectedStock.name, tradeShares, stockDetail?.price)}
                    >
                      Sell
                    </button>
                  </div>

                  {tradeShares && stockDetail?.price && (
                    <p className="sim-muted">
                      Estimated total: ${(Number(tradeShares) * stockDetail.price).toFixed(2)}
                    </p>
                  )}
                  {tradeError && <p className="sim-error">{tradeError}</p>}
                  {tradeMsg && <p className="sim-positive">{tradeMsg}</p>}
                </div>
              ) : (
                <div className="card tradeCard tradeSignupCard">
                  <h3>Want to trade {selectedStock.ticker}?</h3>
                  <p>Sign up free to get $10,000 in demo cash and start buying and selling real stocks at live prices.</p>
                  <button className="sim-primary-btn" onClick={() => { setAuthMode("signup"); setPage("account"); }}>
                    Sign up to get $10,000 →
                  </button>
                </div>
              )}

              <div className="card stockMetricsCard">
                <div className="keyMetricsHeader">
                  <h3>Key Metrics</h3>
                  <button className="viewGuideBtn" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setLearnSection("metrics"); setPage("learn"); }}>View full guide →</button>
                </div>

                {metricInfo.map((m) => {
                  const liveValues = {
                    price:    stockDetail?.price_fmt,
                    pe:       stockDetail?.pe_fmt,
                    marketCap: stockDetail?.market_cap_fmt,
                    volume:   stockDetail?.volume_fmt,
                    dividend: stockDetail?.div_yield_fmt,
                    eps:      stockDetail?.eps_fmt,
                    highlow:  stockDetail?.week52_high && stockDetail?.week52_low
                                ? `$${stockDetail.week52_low.toFixed(2)} – $${stockDetail.week52_high.toFixed(2)}`
                                : stockDetail?.week52_fmt,
                    beta:     stockDetail?.beta_fmt,
                    debt:     stockDetail?.debt_to_equity_fmt,
                    roe:      stockDetail?.roe_fmt,
                  };
                  const rawValue = stockDetail ? liveValues[m.key] : null;

                  const displayValue =
                    rawValue === null ||
                    rawValue === undefined ||
                    rawValue === "" ||
                    String(rawValue).toLowerCase().includes("nan")
                      ? "—"
                      : rawValue;
                  return (
                  <div key={m.key} className="metricLine">
                    <b>
                      {m.name}
                      <button className="metricBubble" onClick={(e) => { e.stopPropagation(); setOpenMetric(m); }}
                        onMouseEnter={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          const tip = e.currentTarget.querySelector('.metricBubbleTip');
                          if (tip) { tip.style.top = r.top + r.height/2 + 'px'; tip.style.left = (r.left - 230) + 'px'; }
                        }}>?
                        <span className="metricBubbleTip">{m.short}</span>
                      </button>
                    </b>
                    <span className="metricValue">{displayValue}</span>
                  </div>
                  );
                })}
              </div>

              <div className="card stockNewsCard">
                <h3>📰 Recent News — {selectedStock.ticker}</h3>
                {stockNewsLoading ? (
                  <p className="sim-muted">Loading news...</p>
                ) : stockNews.length === 0 ? (
                  <p className="sim-muted">No recent news found for this stock.</p>
                ) : (
                  stockNews.slice(0, 6).map((n, i) => (
                    <a key={i} className="stockNewsItem" href={n.url} target="_blank" rel="noopener noreferrer">
                      <span className="stockNewsHeadline">{n.headline}</span>
                      <span className="stockNewsMeta">
                        {n.source}
                        {n.date ? ` · ${new Date(n.date * 1000).toLocaleDateString()}` : ""}
                      </span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {page === "portfolio" && (
          <section className="page">
            <h1>My Portfolio</h1>

            {!authUser ? (
              <div className="card tradeSignupCard">
                <h2>Sign up now to get $10,000 demo cash 💰</h2>
                <p>Create a free account and start buying and selling real stocks at live prices — no real money, no risk, just practice.</p>
                <button className="sim-primary-btn" onClick={() => { setAuthMode("signup"); setPage("account"); }}>
                  Sign up to get $10,000 →
                </button>
              </div>
            ) : (
              <>
                {(() => {
                  const livePositions = positions.map((p) => {
                    const q = positionQuotes[p.ticker];
                    const price = q?.price ?? p.avgCost;
                    const value = price * p.shares;
                    const unrealised = (price - p.avgCost) * p.shares;
                    return { ...p, price, change: q?.change ?? 0, value, unrealised, name: q?.name || p.name || p.ticker };
                  });
                  const holdingsValue = livePositions.reduce((sum, p) => sum + p.value, 0);
                  const totalValue = (cash || 0) + holdingsValue;
                  const totalUnrealised = livePositions.reduce((sum, p) => sum + p.unrealised, 0);

                  const sorted = [...livePositions].sort((a, b) => {
                    let val;
                    if (sortKey === "ticker") val = a.ticker.localeCompare(b.ticker);
                    else val = (b[sortKey] ?? 0) - (a[sortKey] ?? 0);
                    return sortDir === "desc" ? val : -val;
                  });

                  return (
                    <>
                      <div className="stats">
                        <div className="card"><p>Total Value</p><h2>${totalValue.toFixed(2)}</h2></div>
                        <div className="card">
                          <p>Unrealised P&L</p>
                          <h2 className={totalUnrealised >= 0 ? "green" : "red"}>
                            {totalUnrealised >= 0 ? "↑" : "↓"} ${Math.abs(totalUnrealised).toFixed(2)}
                          </h2>
                        </div>
                        <div className="card"><p>Cash Balance</p><h2>${(cash || 0).toFixed(2)}</h2></div>
                      </div>

                      <div className="portfolioMainRow">
                        <div className="card portfolioPositionsCard">
                          <h3>Positions</h3>
                          {livePositions.length === 0 ? (
                            <p className="sim-muted">No positions yet — search for a stock and buy your first share.</p>
                          ) : (
                            <>
                              <div className="table head">
                                {[
                                  ["ticker", "Stock"],
                                  ["change", "% Change"],
                                  ["price", "Current Price"],
                                  ["value", "Value"],
                                  ["unrealised", "Unrealised P&L"],
                                  ["shares", "Qty"],
                                ].map(([key, label]) => (
                                  <button key={key} onClick={() => handleSort(key)}>
                                    {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
                                  </button>
                                ))}
                              </div>
                              {sorted.map((h) => (
                                <div className="table tableClickable" key={h.ticker} onClick={() => goStock(h)}>
                                  <b>
                                    <span className="rowTicker">{h.ticker}</span>
                                    <small className="rowName">{h.name}</small>
                                  </b>
                                  <span className={h.change >= 0 ? "green" : "red"}>{h.change >= 0 ? "↑" : "↓"} {h.change}%</span>
                                  <span>${Number(h.price).toFixed(2)}</span>
                                  <span>${h.value.toFixed(2)}</span>
                                  <span className={h.unrealised >= 0 ? "green" : "red"}>{h.unrealised >= 0 ? "↑" : "↓"} ${Math.abs(h.unrealised).toFixed(2)}</span>
                                  <span>{h.shares}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>

                        {livePositions.length > 0 && (() => {
                          const STOCK_COLORS = ["#1f7d4c","#4caf50","#f4a623","#3498db","#9b59b6","#e67e22","#e87070","#1abc9c"];
                          const sorted = [...livePositions].sort((a,b) => b.value - a.value);
                          const top4 = sorted.slice(0, 4);
                          const othersVal = sorted.slice(4).reduce((s,p) => s + p.value, 0);
                          const pieItems = othersVal > 0 ? [...top4, { ticker: "Others", name: "Others", value: othersVal }] : top4;
                          const pieTotal = pieItems.reduce((s,p) => s + p.value, 0) || 1;
                          let cumAngle = -Math.PI / 2;
                          const slices = pieItems.map((p, i) => {
                            const frac = p.value / pieTotal;
                            const start = cumAngle;
                            cumAngle += frac * 2 * Math.PI;
                            const end = cumAngle;
                            const r = 70, cx = 80, cy = 80;
                            const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
                            const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
                            const large = frac > 0.5 ? 1 : 0;
                            const d = pieItems.length === 1
                              ? `M${cx},${cy-r} A${r},${r} 0 1,1 ${cx-0.01},${cy-r} Z`
                              : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                            const color = (i === pieItems.length-1 && othersVal > 0) ? "#c8d8d0" : STOCK_COLORS[i];
                            return { ticker: p.ticker, frac, color, d };
                          });
                          return (
                            <div className="card portfolioAllocationCard">
                              <h3>Allocation</h3>
                              <svg viewBox="0 0 160 160" className="allocPie">
                                {slices.map((s, i) => (
                                  <path key={i} d={s.d} fill={s.color} stroke="white" strokeWidth="2">
                                    <title>{s.ticker}: {(s.frac*100).toFixed(1)}%</title>
                                  </path>
                                ))}
                                <circle cx="80" cy="80" r="36" fill="white" />
                                <text x="80" y="76" textAnchor="middle" fontSize="9" fontWeight="700" fill="#173427">Holdings</text>
                                <text x="80" y="90" textAnchor="middle" fontSize="8" fill="#6c8373">${holdingsValue.toFixed(0)}</text>
                              </svg>
                              <div className="allocLegend">
                                {slices.map((s, i) => (
                                  <div key={i} className="allocLegendRow">
                                    <span className="allocDot" style={{ background: s.color }} />
                                    <span className="allocName">{s.ticker}</span>
                                    <span className="allocPct">{(s.frac*100).toFixed(1)}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}

                <div className="card">
                  <h3>Recent Trades</h3>
                  {txLog.length === 0 ? (
                    <p className="sim-muted">No trades yet.</p>
                  ) : (
                    <>
                      <div className="table head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                        <span>Action</span>
                        <span>Stock</span>
                        <span>Qty</span>
                        <span>Price</span>
                        <span>Total</span>
                      </div>
                      {txLog.map((t) => (
                        <div className="table" key={t.id} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr" }}>
                          <span className={t.type === "buy" ? "green" : "red"}>{t.type === "buy" ? "Bought" : "Sold"}</span>
                          <b>{t.ticker}</b>
                          <span>{Number(t.shares).toFixed(4).replace(/\.?0+$/, "")} shares</span>
                          <span>@ ${Number(t.price).toFixed(2)}</span>
                          <span>${Number(t.total).toFixed(2)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {page === "learn" && (
          <section className="page">
            <h1>Learn Investing</h1>
            <div className="chips">
              <button className={learnSection === "basics" ? "chipActive" : ""} onClick={() => setLearnSection("basics")}>Basics</button>
              <button className={learnSection === "metrics" ? "chipActive" : ""} onClick={() => setLearnSection("metrics")}>Key Metrics</button>
              <button className={learnSection === "quiz" ? "chipActive" : ""} onClick={() => setLearnSection("quiz")}>Quizzes</button>
            </div>

            {learnSection === "basics" && (
              <div className="basicsGrid">
                <div className="basicsIntro">
                  <span className="basicsIntroIcon">🌱</span>
                  <div>
                    <h3>Investing basics, explained simply</h3>
                    <p>Click any card to expand a beginner-friendly explanation with visuals. Start here if you're new to investing.</p>
                  </div>
                </div>
                {basicsData.map((item) => (
                  <BasicsCard key={item.key} item={item} onNavigate={(p) => setPage(p)} />
                ))}
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

            {learnSection === "quiz" && <QuizSection />}
          </section>
        )}

        {page === "account" && (
          <section className="page">
            <h1>My Account</h1>

            <div className="card account">
              {authUser ? (
                <>
                  <div className="accountAvatar">{(userName || "?")[0].toUpperCase()}</div>
                  <h2 className="accountName">{userName}</h2>
                  <p className="accountEmail">{authUser.email}</p>

                  <div className="accountField">
                    <label>Display Name</label>
                    <div className="accountFieldRow">
                      <input value={userName} onChange={(e) => setUserName(e.target.value)} />
                      <button className="saveNameBtn" onClick={async () => {
                        if (authUser && userName.trim()) {
                          await updateProfile(authUser, { displayName: userName.trim() });
                        }
                      }}>Save</button>
                    </div>
                  </div>

                  <div className="accountField">
                    <label>Email</label>
                    <input value={authUser.email} readOnly className="readonlyInput"/>
                  </div>

                  <div className="accountField">
                    <label>Account Type</label>
                    <input value="Email / Password" readOnly className="readonlyInput"/>
                  </div>

                  <button className="logoutBtn" onClick={handleLogout}>Log Out</button>

                  <div className="dangerZone">
                    {confirmDelete
                      ? <div className="confirmDeleteRow">
                          <span>Are you sure? This cannot be undone.</span>
                          <button className="deleteBtn" onClick={handleDeleteAccount}>Yes, delete my account</button>
                          <button className="cancelDeleteBtn" onClick={() => setConfirmDelete(false)}>Cancel</button>
                        </div>
                      : <button className="deleteBtn" onClick={handleDeleteAccount}>Delete Account</button>
                    }
                  </div>
                </>
              ) : (
                <>
                  <h3>{authMode === "login" ? "Welcome back" : "Create your account"}</h3>
                  <p>Sign in to save your StockSense profile and future portfolio data.</p>

                  <form onSubmit={handleAuthSubmit}>
                    {authMode === "signup" && (
                      <>
                        <label>Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          placeholder="What should we call you?"
                          onChange={(e) => setDisplayName(e.target.value)}
                          required
                        />
                      </>
                    )}
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
                    <button type="submit" className="authSubmitBtn">
                      {authMode === "login" ? "Log In" : "Create Account"}
                    </button>
                  </form>

                  <button className="switchAuthBtn" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}>
                    {authMode === "login" ? "New here? Create an account →" : "Already have an account? Log in →"}
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {page === "simulator" && (
          <section className="page">
            <h1>SIMULATOR</h1>

            <div className="sim-layout">
              <div className="sim-main-column">
                <div className="card simulator-card">
              <h2>Historical Investment Simulator</h2>
              <p>
                Pick a stock, choose a buy date, invest virtual money, then scrub forward
                to see how the price and your portfolio would have changed.
              </p>

              <div className="sim-form">
                <div className="sim-field sim-search-field">
                  <label>Search by company name or ticker</label>
  
                  <input
                  className="sim-input"
                  value={simSearch}
                  onFocus={() => setShowSimDropdown(true)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSimSearch(value);
                    setSimTicker(value.trim().split(" ")[0].toUpperCase());
                    setShowSimDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowSimDropdown(false);
                      loadSimulationHistory();
                    }
                  }}
                  placeholder="e.g. Apple, Tesla, VOO, MSFT..."
                />

                  {showSimDropdown && simSearch.trim() && (
                    <div className="sim-search-dropdown">
                      {simSearchResults.map((stock) => (
                        <button
                          key={stock.ticker}
                          type="button"
                          className="sim-search-option"
                          onClick={() => {
                            setSimTicker(stock.ticker);
                            setSimSearch(stock.ticker);
                            setShowSimDropdown(false);
                            setSimHistory(null);
                            setHasInvested(false);
                            loadSimulationHistory(stock.ticker);
                          }}
                        >
                          <div className="sim-search-left">
                            <div className="sim-search-avatar">
                              {stock.ticker[0]}
                            </div>

                            <div className="sim-search-text">
                              <div className="sim-search-topline">
                                <span className="sim-search-ticker">{stock.ticker}</span>
                                <span className="sim-search-name">{stock.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="sim-search-sector">
                            {stock.sector}
                          </div>
                        </button>
                      ))}

                      {showRawTickerOption && (
                        <button
                          type="button"
                          className="sim-search-option"
                          onClick={() => {
                            setSimTicker(cleanSimSearch);
                            setSimSearch(cleanSimSearch);
                            setShowSimDropdown(false);
                            setSimHistory(null);
                            setHasInvested(false);
                          }}
                        >
                          <div className="sim-search-left">
                            <div className="sim-search-avatar">
                              {cleanSimSearch[0]}
                            </div>

                            <div className="sim-search-text">
                              <div className="sim-search-topline">
                                <span className="sim-search-ticker">{cleanSimSearch}</span>
                                <span className="sim-search-name">Use this ticker</span>
                              </div>
                            </div>
                          </div>

                          <div className="sim-search-sector">
                            Custom
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button className="sim-primary-btn" onClick={() => loadSimulationHistory()}>
                  Load 10-Year History
                </button>
              </div>

              {simLoading && <p className="sim-muted">Loading historical stock data...</p>}
              {simError && <p className="sim-error">{simError}</p>}

              {simHistory && (
                <>
                  <div className="sim-loaded-header">
                    <div>
                      <span className="sim-loaded-name">{simHistory.name || simHistory.ticker}</span>
                      <span className="sim-loaded-ticker">{simHistory.ticker}</span>
                    </div>
                    <div className="sim-current-price sim-current-price--inline">
                      <span>Current Price</span>
                      <strong>${simHistory.prices[simHistory.prices.length - 1]}</strong>
                    </div>
                  </div>

                  <h3>1. Choose your buy date</h3>

                  <input
                    className="sim-slider"
                    type="range"
                    min="0"
                    max={simHistory.dates.length - 1}
                    value={buyIndex}
                    onChange={(e) => {
                      const newIndex = Number(e.target.value);
                      setBuyIndex(newIndex);
                      setCurrentIndex(newIndex);
                      setHasInvested(false);
                    }}
                  />

                  <p>
                    Buy Date: {simHistory.dates[buyIndex]} | Buy Price: ${buyPrice}
                  </p>

                  <h3>2. Choose investment amount</h3>

                  <div className="sim-form">
                    <div className="sim-field">
                      <label>Investment Amount</label>
                      <input
                      className="sim-input"
                      type="number"
                      value={investmentAmount}
                      onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                    />
                    </div>

                    <button className="sim-primary-btn" onClick={() => setHasInvested(true)}>
                      Invest ${investmentAmount}
                    </button>
                  </div>

                  {hasInvested && (
                    <>
                      <div className="card sim-chart-card">
                        <div className="sim-chart-header">
                          <div>
                            <h3>Price Chart</h3>
                            <p>
                              {simHistory.dates[buyIndex]} to {simHistory.dates[currentIndex]}
                            </p>
                          </div>

                          <div className="sim-current-price">
                            <span>Current Price</span>
                            <strong>${currentPrice}</strong>
                          </div>
                        </div>

                        <SimulatorChart
                          history={simHistory}
                          buyIndex={buyIndex}
                          currentIndex={currentIndex}
                        />

                        <div className="sim-scrubber-panel">
                          <div className="sim-scrubber-top">
                            <h3>Scrub forward through history</h3>
                            <p>
                              Current Date: {simHistory.dates[currentIndex]}
                            </p>
                          </div>

                          <input
                            className="sim-slider"
                            type="range"
                            min={buyIndex}
                            max={simHistory.dates.length - 1}
                            value={currentIndex}
                            onChange={(e) => setCurrentIndex(Number(e.target.value))}
                          />

                          <div className="skip-buttons">
                            <button onClick={() => skipMonths(1)}>+1M</button>
                            <button onClick={() => skipMonths(4)}>+4M</button>
                            <button onClick={() => skipMonths(6)}>+6M</button>
                            <button onClick={() => skipMonths(12)}>+1Y</button>
                          </div>
                        </div>
                      </div>

                      <div className="metric-grid">
                        <div className="card">
                          <h3>Shares Bought</h3>
                          <p>{sharesBought.toFixed(4)}</p>
                        </div>

                        <div className="card">
                          <h3>Portfolio Value</h3>
                          <p>${portfolioValue.toFixed(2)}</p>
                        </div>

                        <div className="card">
                          <h3>Profit / Loss</h3>
                          <p className={profitLoss >= 0 ? "sim-positive" : "sim-negative"}>
                            {profitLoss >= 0 ? "+" : "-"}${Math.abs(profitLoss).toFixed(2)}
                          </p>
                        </div>

                        <div className="card">
                          <h3>Return</h3>
                          <p className={returnPercentage >= 0 ? "sim-positive" : "sim-negative"}>
                            {returnPercentage >= 0 ? "+" : "-"}{Math.abs(returnPercentage).toFixed(2)}%
                          </p>
                        </div>

                        <div className="card">
                          <h3>Volume</h3>
                          <p>{currentVolume.toLocaleString()}</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              </div>
            </div>

            <aside className="sim-ai-panel sim-ai-side">
              <div className="sim-ai-header">
                <div>
                  <h3>StockSense AI Coach</h3>
                  <p>Ask AI to explain your simulator result in simple English.</p>
                </div>
                <span className="sim-ai-badge">AI</span>
              </div>

              <div className="sim-ai-chat">
                {simAiMessages.map((message, index) => (
                  <div
                    key={index}
                    className={
                      message.role === "user"
                        ? "sim-ai-message user"
                        : "sim-ai-message assistant"
                    }
                  >
                    <FormattedText text={message.text} />
                  </div>
                ))}

                {simAiLoading && (
                  <div className="sim-ai-message assistant">
                    Thinking through your simulation...
                  </div>
                )}
              </div>

              <button
                className="sim-ai-button"
                onClick={askSimulatorAI}
                disabled={simAiLoading}
              >
                {simAiLoading ? "Explaining..." : "Explain this move"}
              </button>

              <button
                className="sim-ai-secondary"
                onClick={() =>
                  setSimAiMessages([
                    {
                      role: "assistant",
                      text: "I can explain what happened to your historical investment once you load a stock, invest virtual money, and scrub forward."
                    }
                  ])
                }
              >
                Clear chat
              </button>
            </aside>
            </div>
            </section>
          
        )}

        {page === "ai" && (
          <section className="page aiChatPage">
            <div className="aiChatHeaderRow">
              <h1>AI Assistant</h1>
              {aiChatMessages.length > 1 && (
                <button className="aiChatClearBtn" onClick={clearAiChat}>🗑 Clear chat</button>
              )}
            </div>
            <p className="aiChatIntro">
              Ask about investing concepts, key metrics, or how to use StockSense. Beginner-friendly, always.
            </p>

            <div className="aiChatLevelRow">
              <span>Your level:</span>
              {["beginner", "intermediate", "advanced"].map((lvl) => (
                <button
                  key={lvl}
                  className={`aiLevelChip ${aiChatLevel === lvl ? "chipActive" : ""}`}
                  onClick={() => setAiChatLevel(aiChatLevel === lvl ? "" : lvl)}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>

            <div className="aiChatCard">
              {aiChatMessages.length >= 20 && (
                <div className="aiChatLongHint">
                  <span>This chat is getting long — clearing it keeps things fast.</span>
                  <button className="aiChatClearBtn" onClick={clearAiChat}>Clear now</button>
                </div>
              )}
              <div className="aiChatMessages">
                {aiChatMessages.map((m, i) => (
                  <div key={i} className={`aiChatMessage ${m.role}`}>
                    <FormattedText text={m.text} />
                  </div>
                ))}
                {aiChatLoading && (
                  <div className="aiChatMessage assistant">Thinking...</div>
                )}
              </div>

              {aiChatMessages.length <= 1 && (
                <div className="aiChatSuggestions">
                  {aiChatSuggestions.map((s) => (
                    <button key={s} className="aiChatSuggestion" onClick={() => sendAiChatMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="aiChatInputRow">
                <input
                  value={aiChatInput}
                  placeholder="Ask a question about investing..."
                  onChange={(e) => setAiChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAiChatMessage()}
                  disabled={aiChatLoading}
                />
                <button onClick={() => sendAiChatMessage()} disabled={aiChatLoading || !aiChatInput.trim()}>
                  {aiChatLoading ? "..." : "Send"}
                </button>
              </div>
            </div>

            <p className="aiDisclaimer">Educational only — not financial advice.</p>
          </section>
        )}

        {page === "leaderboard" && (
          <section className="page">
            <h1>Leaderboard</h1>
            <p className="leaderboardIntro">
              Ranked by total portfolio value. Everyone starts with ${STARTING_CASH.toLocaleString()} — it's all skill (and nerve) from there.
            </p>

            {authUser ? (
              <div className="leaderboardOptCard">
                <div className="leaderboardOptText">
                  <h4>Show me on the leaderboard</h4>
                  <p>Off by default. Turn this on to display your name and portfolio value publicly.</p>
                </div>
                <button
                  className={`leaderboardToggle ${leaderboardOptIn ? "on" : "off"} ${leaderboardJustToggled ? "justToggled" : ""}`}
                  onClick={toggleLeaderboardOptIn}
                >
                  {leaderboardOptIn ? "Visible ✓" : "Hidden"}
                </button>
              </div>
            ) : (
              <div className="leaderboardOptCard">
                <div className="leaderboardOptText">
                  <h4>Sign in to join</h4>
                  <p>Create an account to get your $10,000 virtual portfolio and (optionally) join the board.</p>
                </div>
                <button className="leaderboardToggle off" onClick={() => setPage("account")}>Sign in</button>
              </div>
            )}

            <div className="leaderboardTable">
              {leaderboardLoading ? (
                <div className="leaderboardEmpty">Loading leaderboard...</div>
              ) : leaderboardRows.length === 0 ? (
                <div className="leaderboardEmpty">No one's on the board yet — be the first to opt in!</div>
              ) : (
                leaderboardRows.map((row, i) => (
                  <div key={row.uid} className={`leaderboardRow ${authUser && row.uid === authUser.uid ? "me" : ""}`}>
                    <span className={`leaderboardRank ${i === 0 ? "top1" : i === 1 ? "top2" : i === 2 ? "top3" : ""}`}>
                      #{i + 1}
                    </span>
                    <span className="leaderboardName">
                      {row.displayName || "Investor"}
                      {authUser && row.uid === authUser.uid && <span className="leaderboardYou">YOU</span>}
                    </span>
                    <span className="leaderboardValue">${(row.netWorth || 0).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;