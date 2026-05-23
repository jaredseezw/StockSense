import { useMemo, useState } from "react";
import "./App.css";

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
    short: "Current cost of one share.",
    detail: "Price tells you what one share costs now. On its own, it does not tell you if a stock is cheap or expensive.",
    visual: "line",
  },
  {
    key: "pe",
    name: "P/E Ratio",
    tag: "Valuation",
    value: "28.4",
    short: "How much investors pay for $1 of earnings.",
    detail: "A P/E of 20 means investors pay $20 for every $1 the company earns. Compare it within the same industry.",
    visual: "scale",
  },
  {
    key: "marketCap",
    name: "Market Cap",
    tag: "Company size",
    value: "$2.8T",
    short: "Total market value of the company.",
    detail: "Large caps are usually more stable. Smaller companies may grow faster but can be riskier.",
    visual: "bubble",
  },
  {
    key: "volume",
    name: "Volume",
    tag: "Market activity",
    value: "58.2M",
    short: "How many shares traded today.",
    detail: "High volume during a big move may show stronger market interest.",
    visual: "bars",
  },
  {
    key: "dividend",
    name: "Dividend Yield",
    tag: "Income",
    value: "0.6%",
    short: "Cash paid yearly as % of stock price.",
    detail: "Useful for income-focused investors. Very high yield can sometimes signal trouble.",
    visual: "yield",
  },
  {
    key: "eps",
    name: "EPS",
    tag: "Profitability",
    value: "$6.20",
    short: "Profit earned per share.",
    detail: "Higher EPS usually means stronger earning power, but compare against peers.",
    visual: "eps",
  },
  {
    key: "highlow",
    name: "52-Week High / Low",
    tag: "Price context",
    value: "$124 / $199",
    short: "Past year trading range.",
    detail: "Shows whether current price is near its yearly high or low.",
    visual: "range",
  },
  {
    key: "beta",
    name: "Beta",
    tag: "Volatility",
    value: "1.2",
    short: "How volatile the stock is vs market.",
    detail: "Beta above 1 means bigger swings than the market. Below 1 is calmer.",
    visual: "gauge",
  },
  {
    key: "debt",
    name: "Debt-to-Equity",
    tag: "Financial health",
    value: "1.4",
    short: "Debt compared to shareholder equity.",
    detail: "High D/E can mean more financial risk, especially during weak business periods.",
    visual: "stack",
  },
  {
    key: "roe",
    name: "ROE",
    tag: "Efficiency",
    value: "22%",
    short: "How efficiently equity creates profit.",
    detail: "Higher ROE suggests the company uses shareholder money efficiently.",
    visual: "donut",
  },
];

function MetricVisual({ type }) {
  if (type === "line") return <div className="viz lineViz">╱╲╱╲╱╲</div>;
  if (type === "scale") return <div className="viz scaleViz"><span>Cheap</span><div><b style={{ left: "48%" }}></b></div><span>Expensive</span></div>;
  if (type === "bubble") return <div className="viz bubbleViz"><span></span><b></b><i></i></div>;
  if (type === "bars") return <div className="viz barsViz"><span></span><span></span><span></span><span></span><span></span></div>;
  if (type === "yield") return <div className="viz yieldViz"><div>1%</div><div>3%</div><div>5%</div></div>;
  if (type === "eps") return <div className="viz epsViz"><span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span></div>;
  if (type === "range") return <div className="viz rangeViz"><span></span><b></b></div>;
  if (type === "gauge") return <div className="viz gaugeViz"><span></span></div>;
  if (type === "stack") return <div className="viz stackViz"><span>Equity</span><b>Debt</b></div>;
  if (type === "donut") return <div className="viz donutViz"></div>;
  return null;
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [recent, setRecent] = useState(["NVDA", "AMZN", "AAPL"]);
  const [sortKey, setSortKey] = useState("value");
  const [userName, setUserName] = useState("Rann");
  const [timeFrame, setTimeFrame] = useState("1M");
  const [selectedSector, setSelectedSector] = useState("Technology");
  const [learnSection, setLearnSection] = useState("basics");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks
      .filter((s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query]);

  const topMovers = [...stocks].sort((a, b) => b.change - a.change);
  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortKey === "ticker") return a.ticker.localeCompare(b.ticker);
    return b[sortKey] - a[sortKey];
  });

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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">📈 StockSense</div>

        {navItems.map(([id, icon, label]) => (
          <button key={id} className={`nav ${page === id ? "active" : ""}`} onClick={() => setPage(id)}>
            <span>{icon}</span>{label}
          </button>
        ))}

        <button className="userBox" onClick={() => setPage("account")}>
          <span className="avatar">👤</span>
          <div>
            <b>{userName}</b>
            <small>Demo Account</small>
          </div>
        </button>
      </aside>

      <main className="main">
        {page === "dashboard" && (
          <>
            <div className="topbar">
              <h1>{greeting}, {userName}! 👋</h1>
              <div className="balance"><small>Demo Balance</small><b>$10,000.00</b></div>
            </div>

            <div className="dashboardGrid priority">
              <div className="card heroMini">
                <h3>Learn before risking real money.</h3>
                <p>Simple explanations, real market data, and risk-free practice.</p>
              </div>

              <div className="card focusCard">
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
                {topMovers.slice(0, 5).map((s) => (
                  <div className="mover" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "↑" : "↓"} {s.change}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {page === "search" && (
          <section className="page">
            <h1>Search Stocks</h1>
            <p>Search by company name or ticker. Example: Apple or AAPL.</p>

            <div className="searchWrap">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Apple, AAPL, Tesla..." />
              <button onClick={searchStock}>Search</button>

              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <div key={s.ticker} onClick={() => goStock(s)}>
                      <b>{s.name}</b><span>{s.ticker}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <h3>Daily Top Movers</h3>
            <div className="category">
              {topMovers.slice(0, 6).map((s) => (
                <div className="stockRow" key={s.ticker} onClick={() => goStock(s)}>
                  <b>{s.name}</b><span>{s.ticker}</span><span>${s.price}</span>
                  <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "↑" : "↓"} {s.change}%</span>
                </div>
              ))}
            </div>

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
                    <div><b>{s.ticker}</b><small>{s.name}</small></div>
                    <span>${s.price}</span>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <h3>Recent Searches</h3>
            <div className="chips">
              {recent.map((t) => {
                const s = stocks.find((x) => x.ticker === t);
                return <button key={t} onClick={() => s && goStock(s)}>{t}</button>;
              })}
            </div>

            <h3>Trending Searches</h3>
            <div className="chips">
              {stocks.slice().sort((a,b)=>b.popularity-a.popularity).slice(0,8).map(s => (
                <button key={s.ticker} onClick={() => goStock(s)}>{s.ticker}</button>
              ))}
            </div>
          </section>
        )}

        {page === "stock" && selectedStock && (
          <section className="page">
            <button className="backBtn" onClick={() => setPage("search")}>← Back</button>
            <h1>{selectedStock.name} <span>{selectedStock.ticker}</span></h1>

            <div className="timeframes">
              {["1D", "1W", "1M", "3M", "YTD", "1Y", "5Y"].map((t) => (
                <button key={t} className={timeFrame === t ? "selected" : ""} onClick={() => setTimeFrame(t)}>{t}</button>
              ))}
            </div>

            <div className="dashboardGrid">
              <div className="card wide">
                <h3>Historical Price Chart</h3>
                <div className="largeChart">📈</div>
                <p>Selected range: {timeFrame}. Real chart connects after backend integration.</p>
              </div>

              <div className="card">
                <h3>
                  Key Metrics
                  <button className="learnIcon" onClick={goLearnMetrics}>?</button>
                </h3>

                {metricInfo.map((m) => (
                  <p key={m.key} className="metricLine">
                    <b>{m.name}</b>
                    <span className="customTip">
                      ?
                      <em>{m.short}<br />Click ? near title for detailed guide.</em>
                    </span>
                    <span>{m.value}</span>
                  </p>
                ))}
              </div>

              <div className="card wide">
                <h3>Beginner Explanation</h3>
                <p>This page explains stock movement and key metrics in plain English.</p>
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
                  <button key={key} onClick={() => setSortKey(key)}>
                    {label} {sortKey === key ? "↓" : ""}
                  </button>
                ))}
              </div>

              {sortedHoldings.map((h) => (
                <div className="table" key={h.ticker}>
                  <b>{h.ticker}<small>{h.name}</small></b>
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
              <button onClick={() => setLearnSection("basics")}>Basics</button>
              <button onClick={() => setLearnSection("metrics")}>Key Metrics</button>
            </div>

            {learnSection === "basics" && (
              <div className="dashboardGrid">
                <div className="card"><h3>What is a Stock?</h3><p>A small ownership stake in a company.</p></div>
                <div className="card"><h3>Diversification</h3><p>Spreading money across different investments.</p></div>
                <div className="card"><h3>Reading Charts</h3><p>Understanding price movement over time.</p></div>
              </div>
            )}

            {learnSection === "metrics" && (
              <div className="metricGrid">
                {metricInfo.map((m) => (
                  <div className="metricCard" key={m.key}>
                    <div className="metricHeader">
                      <h3>{m.name}</h3>
                      <span>{m.tag}</span>
                    </div>
                    <MetricVisual type={m.visual} />
                    <p><b>{m.short}</b></p>
                    <p>{m.detail}</p>
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
              <label>Name</label>
              <input value={userName} onChange={(e) => setUserName(e.target.value)} />
              <label>Email</label>
              <input value="rann@example.com" readOnly />
              <label>Date Created</label>
              <input value="May 2026" readOnly />
              <button>Login / Logout Placeholder</button>
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