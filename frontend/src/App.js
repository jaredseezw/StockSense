import { useMemo, useState } from "react";
import "./App.css";

const stocks = [
  { name: "Apple", ticker: "AAPL", sector: "Technology", price: 175.43, change: 1.18, popularity: 98 },
  { name: "Microsoft", ticker: "MSFT", sector: "Technology", price: 343.8, change: 0.86, popularity: 95 },
  { name: "NVIDIA", ticker: "NVDA", sector: "Technology", price: 949.5, change: 2.35, popularity: 99 },
  { name: "Tesla", ticker: "TSLA", sector: "Technology", price: 225.92, change: -1.24, popularity: 90 },
  { name: "Amazon", ticker: "AMZN", sector: "E-Commerce", price: 3275.1, change: 0.45, popularity: 92 },
  { name: "Alibaba", ticker: "BABA", sector: "E-Commerce", price: 78.2, change: -0.88, popularity: 70 },
  { name: "Exxon Mobil", ticker: "XOM", sector: "Energy", price: 117.3, change: -0.32, popularity: 65 },
  { name: "Chevron", ticker: "CVX", sector: "Energy", price: 156.4, change: 0.27, popularity: 62 },
  { name: "JPMorgan", ticker: "JPM", sector: "Finance", price: 198.4, change: 0.72, popularity: 84 },
  { name: "Bank of America", ticker: "BAC", sector: "Finance", price: 38.7, change: -0.41, popularity: 72 },
  { name: "UnitedHealth", ticker: "UNH", sector: "Healthcare", price: 512.9, change: 1.05, popularity: 76 },
  { name: "Pfizer", ticker: "PFE", sector: "Healthcare", price: 28.4, change: -0.22, popularity: 64 },
  { name: "Nike", ticker: "NKE", sector: "Consumer Goods", price: 93.5, change: 0.58, popularity: 70 },
  { name: "Coca-Cola", ticker: "KO", sector: "Consumer Goods", price: 62.1, change: 0.18, popularity: 75 },
  { name: "Airbnb", ticker: "ABNB", sector: "Travel", price: 147.2, change: 1.44, popularity: 78 },
  { name: "Delta Air Lines", ticker: "DAL", sector: "Travel", price: 51.8, change: -0.73, popularity: 58 },
  { name: "Peloton", ticker: "PTON", sector: "Health & Fitness", price: 4.1, change: -2.1, popularity: 55 },
  { name: "Lululemon", ticker: "LULU", sector: "Health & Fitness", price: 337.6, change: 0.92, popularity: 67 },
];

const holdings = [
  { ticker: "AAPL", name: "Apple Inc.", qty: 25, change: 1.18, price: 175.43, value: 4385.75, unrealised: 730.75, realised: 120.5 },
  { ticker: "MSFT", name: "Microsoft Corp.", qty: 15, change: 0.86, price: 343.8, value: 5157.0, unrealised: 670.5, realised: 88.2 },
  { ticker: "TSLA", name: "Tesla Inc.", qty: 8, change: -1.24, price: 225.92, value: 1807.36, unrealised: -43.36, realised: 210.0 },
  { ticker: "AMZN", name: "Amazon.com", qty: 5, change: 0.45, price: 3275.1, value: 16375.5, unrealised: 875.5, realised: 0 },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [recent, setRecent] = useState(["NVDA", "AMZN", "AAPL"]);
  const [sortKey, setSortKey] = useState("value");
  const [userName, setUserName] = useState("Rann");
  const [timeFrame, setTimeFrame] = useState("1M");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const messages = [
    "Ready to grow your portfolio today?",
    "Learn before risking real money.",
    "Search. Understand. Practise.",
  ];
  const message = messages[new Date().getDate() % messages.length];

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return stocks.filter(
      (s) => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  function goStock(stock) {
    setSelectedStock(stock);
    setRecent((prev) => [stock.ticker, ...prev.filter((x) => x !== stock.ticker)].slice(0, 5));
    setPage("stock");
    setQuery("");
  }

  function searchStock() {
    const q = query.toLowerCase().trim();
    const found = stocks.find(
      (s) => s.ticker.toLowerCase() === q || s.name.toLowerCase() === q
    );
    if (found) goStock(found);
  }

  const sortedHoldings = [...holdings].sort((a, b) => b[sortKey] - a[sortKey]);

  const navItems = [
    ["dashboard", "📊", "Dashboard"],
    ["search", "🔍", "Search"],
    ["portfolio", "💼", "Portfolio"],
    ["simulator", "🚀", "Simulator"],
    ["ai", "🤖", "AI Assistant"],
    ["learn", "📖", "Learn"],
    ["leaderboard", "🏆", "Leaderboard"],
  ];

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

            <div className="dashboardGrid">
              <div className="card welcome">
                <h2>{message}</h2>
                <p>Understand stocks through simple explanations and risk-free practice.</p>
              </div>

              <div className="card">
                <p>Portfolio Value</p>
                <h2>$12,736.40</h2>
                <b className="green">↑ +27.25%</b>
                <div className="miniLine">⌁⌁╱╲╱╲╱╲</div>
              </div>

              <div className="card">
                <h3>Biggest Holding</h3>
                <h2>AAPL</h2>
                <p>Apple Inc.</p>
                <b className="green">↑ +1.18%</b>
                <div className="miniLine">╱╲╱╲╱</div>
              </div>

              <div className="card">
                <h3>Holdings Mix</h3>
                <div className="pie"></div>
                <p>🟢 AAPL 45% &nbsp; 🟡 MSFT 30% &nbsp; 🔵 TSLA 15%</p>
              </div>

              <div className="card">
                <h3>Top Movers Today</h3>
                {stocks.slice().sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 4).map((s) => (
                  <div className="mover" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b>
                    <span className={s.change >= 0 ? "green" : "red"}>
                      {s.change >= 0 ? "↑" : "↓"} {s.change}%
                    </span>
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

            <h3>Recent Searches</h3>
            <div className="chips">
              {recent.map((t) => {
                const s = stocks.find((x) => x.ticker === t);
                return <button key={t} onClick={() => s && goStock(s)}>{t}</button>;
              })}
            </div>

            <h3>Browse by Sector</h3>
            {["Technology", "Energy", "Travel", "Healthcare", "Finance", "E-Commerce", "Consumer Goods", "Health & Fitness"].map((sector) => (
              <div className="category" key={sector}>
                <h4>{sector}</h4>
                {stocks.filter((s) => s.sector === sector).map((s) => (
                  <div className="stockRow" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.name}</b><span>{s.ticker}</span><span>${s.price}</span>
                    <span className={s.change >= 0 ? "green" : "red"}>{s.change >= 0 ? "↑" : "↓"} {s.change}%</span>
                  </div>
                ))}
              </div>
            ))}

            <h3>Daily Top Movers</h3>
            <div className="twoCols">
              <div className="category">
                <h4>Top Gainers</h4>
                {stocks.filter(s => s.change > 0).sort((a, b) => b.change - a.change).slice(0, 5).map(s => (
                  <div className="stockRow small" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b><span className="green">↑ {s.change}%</span>
                  </div>
                ))}
              </div>
              <div className="category">
                <h4>Top Losers</h4>
                {stocks.filter(s => s.change < 0).sort((a, b) => a.change - b.change).slice(0, 5).map(s => (
                  <div className="stockRow small" key={s.ticker} onClick={() => goStock(s)}>
                    <b>{s.ticker}</b><span className="red">↓ {s.change}%</span>
                  </div>
                ))}
              </div>
            </div>

            <h3>Trending Searches</h3>
            <div className="chips">
              {stocks.slice().sort((a, b) => b.popularity - a.popularity).slice(0, 8).map(s => (
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
                <p>Selected range: {timeFrame}. Real chart connects after Jared's backend.</p>
              </div>

              <div className="card">
                <h3>Key Metrics</h3>
                <p><b>Price <span className="tip" title="Current market price of one share.">?</span>:</b> ${selectedStock.price}</p>
                <p><b>P/E Ratio <span className="tip" title="Shows how expensive a stock is compared to earnings.">?</span>:</b> 28.4</p>
                <p><b>Market Cap <span className="tip" title="Total value of the company in the market.">?</span>:</b> $2.8T</p>
                <p><b>Volume <span className="tip" title="Number of shares traded today.">?</span>:</b> 58.2M</p>
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

        {["simulator", "ai", "learn", "leaderboard"].includes(page) && (
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