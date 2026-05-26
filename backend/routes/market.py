"""
routes/market.py
=================
Endpoints:
  GET /api/market/indices              — S&P 500, NASDAQ, DOW
  GET /api/market/sectors              — sector performance (for future sector heatmap)
"""

from flask import Blueprint, jsonify
import yfinance as yf
import cache
from fetcher import fetch_indices, _safe, _fmt_large

market_bp = Blueprint("market", __name__)


# ---------------------------------------------------------------------------
# GET /api/market/indices
# Powers the market strip at the top of the dashboard.
# Returns S&P 500, NASDAQ, DOW with current price + daily % change.
# ---------------------------------------------------------------------------

@market_bp.route("/market/indices")
def get_indices():
    def _fetch():
        return fetch_indices()

    try:
        data = cache.cached("market:indices", cache.TTL_INDICES, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/market/sectors
# Daily % change per sector — ready for the sector performance tab / heatmap.
# Uses one ETF per sector as a proxy:
#   Technology → XLK, Healthcare → XLV, Finance → XLF, etc.
# ---------------------------------------------------------------------------

SECTOR_ETFS = {
    "Technology":      "XLK",
    "Healthcare":      "XLV",
    "Finance":         "XLF",
    "Energy":          "XLE",
    "Consumer Goods":  "XLP",
    "E-Commerce":      "XLY",
    "Travel":          "XTN",
    "Health & Fitness": "XLP",   # closest proxy
    "Industrials":     "XLI",
    "Real Estate":     "XLRE",
    "Utilities":       "XLU",
    "Materials":       "XLB",
    "Communication":   "XLC",
}

@market_bp.route("/market/sectors")
def get_sectors():
    def _fetch():
        results = []
        for sector, etf_ticker in SECTOR_ETFS.items():
            try:
                t = yf.Ticker(etf_ticker)
                info = t.info
                price = _safe(info.get("regularMarketPrice") or info.get("currentPrice"))
                prev  = _safe(info.get("previousClose") or info.get("regularMarketPreviousClose"))

                if price and prev:
                    change_pct = round((price - prev) / prev * 100, 2)
                else:
                    change_pct = 0.0

                results.append({
                    "sector":     sector,
                    "etf":        etf_ticker,
                    "change":     change_pct,
                    "price":      price,
                    "price_fmt":  f"${price:,.2f}" if price else "N/A",
                })
            except Exception:
                results.append({"sector": sector, "etf": etf_ticker, "change": 0.0})

        # Sort by change descending (best sector first)
        results.sort(key=lambda r: r["change"], reverse=True)
        return results

    try:
        data = cache.cached("market:sectors", cache.TTL_INDICES, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
