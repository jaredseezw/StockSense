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
            def _fetch_one(etf_ticker=etf_ticker, sector=sector):
                price = None
                prev = None
                try:
                    t = yf.Ticker(etf_ticker)
                    info = t.info
                    price = _safe(info.get("regularMarketPrice") or info.get("currentPrice"))
                    prev = _safe(info.get("previousClose") or info.get("regularMarketPreviousClose"))
                except Exception:
                    pass

                if price is None:
                    try:
                        from fetcher import _yahoo_quote
                        q = _yahoo_quote(etf_ticker)
                        price = _safe(q.get("regularMarketPrice"))
                        prev = _safe(q.get("regularMarketPreviousClose"))
                    except Exception:
                        pass

                if price is None:
                    # Yahoo fully blocked — Finnhub quotes ETFs directly, no
                    # proxy needed here (unlike raw indices).
                    try:
                        from fetcher import _finnhub_quote
                        fh = _finnhub_quote(etf_ticker)
                        price = _safe(fh.get("c"))
                        prev = _safe(fh.get("pc"))
                    except Exception:
                        pass

                if price is None:
                    # Finnhub also failed (often just a missing/rate-limited
                    # FINNHUB_API_KEY on this deploy) — Stooq needs no key
                    # at all, so try it before giving up entirely.
                    try:
                        from fetcher import _stooq_quote
                        sq = _stooq_quote(etf_ticker)
                        price = _safe(sq.get("c"))
                        prev = _safe(sq.get("pc"))
                    except Exception:
                        pass

                if price is None:
                    raise ValueError(f"No price for {etf_ticker}")

                change_pct = round((price - prev) / prev * 100, 2) if price and prev else 0.0

                return {
                    "sector":    sector,
                    "etf":       etf_ticker,
                    "change":    change_pct,
                    "price":     price,
                    "price_fmt": f"${price:,.2f}",
                }

            try:
                results.append(cache.cached(f"market:sector:{etf_ticker}", cache.TTL_INDICES, _fetch_one))
            except Exception:
                # Live sources AND the persisted last-good cache both came up
                # empty — very rare (e.g. brand-new deploy, never fetched
                # successfully before). Label clearly instead of bare "N/A".
                results.append({"sector": sector, "etf": etf_ticker, "change": 0.0, "price": None, "price_fmt": "Unavailable", "unavailable": True})

        # Sort by change descending (best sector first)
        results.sort(key=lambda r: r["change"], reverse=True)
        return results

    try:
        data = cache.cached("market:sectors", cache.TTL_INDICES, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/market/news
# General daily market/finance headlines for the dashboard "Market News" card.
# ---------------------------------------------------------------------------

@market_bp.route("/market/news")
def get_market_news():
    from fetcher import fetch_market_news

    def _fetch():
        return fetch_market_news(limit=8)

    try:
        data = cache.cached("market:news", cache.TTL_INDICES * 15, _fetch)  # ~15 min
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
