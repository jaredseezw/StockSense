import { useState } from "react";
import "./App.css";

function App() {
  const [ticker, setTicker] = useState("");
  const [searchedTicker, setSearchedTicker] = useState(null);

  function handleSearch() {
    if (ticker.trim() === "") return;
    setSearchedTicker(ticker.toUpperCase());
  }

  if (searchedTicker) {
    return (
      <div className="app">
        <button onClick={() => setSearchedTicker(null)}>← Back</button>

        <h1>{searchedTicker}</h1>
        <p>Stock detail page</p>

        <div className="detailGrid">
          <div className="card">
            <h3>Price Chart</h3>
            <div className="bigChart">📈</div>
          </div>

          <div className="card">
            <h3>Key Metrics</h3>
            <p>P/E Ratio: Coming soon</p>
            <p>Market Cap: Coming soon</p>
            <p>Volume: Coming soon</p>
          </div>

          <div className="card">
            <h3>Beginner Explanation</h3>
            <p>
              This page will explain what the stock data means in simple English.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <section className="hero">
        <div>
          <h1>StockSense</h1>
          <p className="tagline">Learn. Invest. Grow.</p>

          <h2>Investing, made simple.</h2>
          <p className="desc">
            Search a stock, understand the basics, and practise without risk.
          </p>

          <div className="searchBox">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Enter stock ticker e.g. AAPL"
            />
            <button onClick={handleSearch}>Search</button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="problem">
          <h3>The Problem</h3>
          <p>Platforms overwhelm beginners.</p>
          <p>Resources are too theoretical.</p>
          <p>No safe way to practise.</p>
        </div>

        <div className="solution">
          <h3>Our Solution</h3>
          <div className="features">
            <div>🔍 Search & Charts</div>
            <div>📖 Metric Explainers</div>
            <div>💼 Virtual Portfolio</div>
            <div>🤖 AI Explanations</div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;