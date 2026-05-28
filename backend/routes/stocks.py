"""
routes/stocks.py
=================
Endpoints:
  GET /api/stock/<ticker>              — full detail for stock page
  GET /api/stock/<ticker>/chart        — OHLCV for chart (?range=1M)
  GET /api/stock/<ticker>/eps          — quarterly EPS history
  GET /api/stock/<ticker>/volume       — 90-day volume history
  GET /api/stocks/movers               — top gainers + losers
  GET /api/stocks/list                 — all stocks with live quote
"""

from flask import Blueprint, jsonify, request
from fetcher import (
    fetch_stock_detail,
    fetch_chart,
    fetch_eps_history,
    fetch_volume_history,
    fetch_movers,
    fetch_quote,
    STOCK_UNIVERSE,
)
import cache

stocks_bp = Blueprint("stocks", __name__)


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>
# Full detail — all metrics for the stock page + metric modals
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>")
def get_stock(ticker: str):
    ticker = ticker.upper()
    cache_key = f"stock:detail:{ticker}"

    def _fetch():
        return fetch_stock_detail(ticker)

    try:
        data = cache.cached(cache_key, cache.TTL_METRICS, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e), "ticker": ticker}), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/chart?range=1M
# Historical OHLCV for the price chart on the stock page
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/chart")
def get_chart(ticker: str):
    ticker    = ticker.upper()
    timeframe = request.args.get("range", "1M").upper()

    valid_ranges = {"5M", "15M", "1H", "1D", "1W", "1M", "3M", "YTD", "1Y", "5Y", "ALL"}
    if timeframe not in valid_ranges:
        return jsonify({"error": f"Invalid range. Use one of: {', '.join(valid_ranges)}"}), 400

    cache_key = f"stock:chart:{ticker}:{timeframe}"

    def _fetch():
        return fetch_chart(ticker, timeframe)

    try:
        data = cache.cached(cache_key, cache.TTL_CHART, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e), "ticker": ticker}), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/eps
# Last 8 quarters of EPS — powers the EPS bar chart in the metric modal
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/eps")
def get_eps(ticker: str):
    ticker = ticker.upper()
    cache_key = f"stock:eps:{ticker}"

    def _fetch():
        return fetch_eps_history(ticker)

    try:
        data = cache.cached(cache_key, cache.TTL_METRICS, _fetch)
        return jsonify({"ticker": ticker, "quarters": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/volume
# 90-day daily volume history — powers the volume bar chart
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/volume")
def get_volume(ticker: str):
    ticker = ticker.upper()
    cache_key = f"stock:volume:{ticker}"

    def _fetch():
        return fetch_volume_history(ticker)

    try:
        data = cache.cached(cache_key, cache.TTL_CHART, _fetch)
        return jsonify({"ticker": ticker, **data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/stocks/movers?n=6
# Top gainers and losers across the whole stock universe
# ---------------------------------------------------------------------------

@stocks_bp.route("/stocks/movers")
def get_movers():
    n = min(int(request.args.get("n", 6)), 20)
    cache_key = f"stocks:movers:{n}"

    def _fetch():
        return fetch_movers(n)

    try:
        data = cache.cached(cache_key, cache.TTL_MOVERS, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# GET /api/stocks/list?sector=Technology
# All stocks with live quote (price + change). Optional sector filter.
# Powers the Browse by Sector panel and search suggestions.
# ---------------------------------------------------------------------------

@stocks_bp.route("/stocks/trending")
def get_trending():
    """
    GET /api/stocks/trending?tickers=AAPL,MSFT,NVDA&n=10
    Fetches quotes for given tickers, sorts by volume ratio (trending),
    returns top n. Used for sector browser with expanded universe.
    """
    tickers_param = request.args.get("tickers", "")
    n = min(int(request.args.get("n", 10)), 20)

    if not tickers_param:
        return jsonify([])

    tickers = [t.strip().upper() for t in tickers_param.split(",") if t.strip()]
    cache_key = f"stocks:trending:{'_'.join(sorted(tickers))}:{n}"

    def _fetch():
        results = []
        for ticker in tickers:
            try:
                q = fetch_quote(ticker)
                results.append(q)
            except Exception:
                pass
        # Sort by volume ratio (today vs average) — most unusual activity first
        results.sort(key=lambda r: (r.get("volume") or 0) / max(r.get("avg_volume") or 1, 1), reverse=True)
        return results[:n]

    try:
        data = cache.cached(cache_key, cache.TTL_MOVERS, _fetch)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@stocks_bp.route("/stocks/list")
def get_stocks_list():
    sector_filter = request.args.get("sector", "").strip()
    cache_key     = "stocks:list:all"

    def _fetch_all():
        result = []
        for ticker in STOCK_UNIVERSE:
            try:
                q = fetch_quote(ticker)
                result.append(q)
            except Exception:
                pass
        return result

    try:
        all_stocks = cache.cached(cache_key, cache.TTL_QUOTE, _fetch_all)

        if sector_filter:
            filtered = [s for s in all_stocks if s.get("sector", "").lower() == sector_filter.lower()]
            return jsonify(filtered)

        return jsonify(all_stocks)
    except Exception as e:
        return jsonify({"error": str(e)}), 500