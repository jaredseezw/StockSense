"""
routes/stocks.py
=================
Endpoints:
  GET /api/stock/<ticker>              — full detail for stock page
  GET /api/stock/<ticker>/chart        — OHLCV for chart (?range=1M)
  GET /api/stock/<ticker>/eps          — quarterly EPS history
  GET /api/stock/<ticker>/volume       — 90-day volume history
  GET /api/stocks/movers               — top gainers + losers
  GET /api/stocks/trending             — trending quotes for selected tickers
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
import math

stocks_bp = Blueprint("stocks", __name__)


# ---------------------------------------------------------------------------
# Helper: clean values before sending JSON
# Prevents invalid JSON like NaN / Infinity from breaking the frontend.
# ---------------------------------------------------------------------------

def make_json_safe(value):
    if value is None:
        return None

    if isinstance(value, dict):
        return {key: make_json_safe(val) for key, val in value.items()}

    if isinstance(value, list):
        return [make_json_safe(item) for item in value]

    if isinstance(value, tuple):
        return [make_json_safe(item) for item in value]

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value

    if isinstance(value, int):
        return value

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value

    # Handles numpy / pandas scalar values if they appear
    try:
        if hasattr(value, "item"):
            return make_json_safe(value.item())
    except Exception:
        pass

    # Last fallback
    try:
        converted = float(value)

        if math.isnan(converted) or math.isinf(converted):
            return None

        return converted
    except Exception:
        return str(value)


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>
# Full detail — all metrics for the stock page + metric modals
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>")
def get_stock(ticker: str):
    ticker = ticker.upper().strip()
    cache_key = f"stock:detail:{ticker}"

    def _fetch():
        return fetch_stock_detail(ticker)

    try:
        if request.args.get("refresh") in ("1", "true", "yes"):
            cache.delete(cache_key)
        data = cache.cached(cache_key, cache.TTL_METRICS, _fetch)
        return jsonify(make_json_safe(data))

    except Exception as e:
        return jsonify({
            "error": str(e),
            "ticker": ticker
        }), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/chart?range=1M
# Historical OHLCV for the price chart on the stock page
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/chart")
def get_chart(ticker: str):
    ticker = ticker.upper().strip()
    timeframe = request.args.get("range", "1M").upper()

    valid_ranges = {
        "5M", "15M", "1H", "1D", "1W",
        "1M", "3M", "YTD", "1Y", "5Y", "ALL"
    }

    if timeframe not in valid_ranges:
        return jsonify({
            "error": f"Invalid range. Use one of: {', '.join(valid_ranges)}"
        }), 400

    cache_key = f"stock:chart:{ticker}:{timeframe}"

    def _fetch():
        return fetch_chart(ticker, timeframe)

    try:
        data = cache.cached(cache_key, cache.TTL_CHART, _fetch)
        return jsonify(make_json_safe(data))

    except Exception as e:
        return jsonify({
            "error": str(e),
            "ticker": ticker
        }), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/eps
# Last 8 quarters of EPS — powers the EPS bar chart in the metric modal
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/eps")
def get_eps(ticker: str):
    ticker = ticker.upper().strip()
    cache_key = f"stock:eps:{ticker}"

    def _fetch():
        return fetch_eps_history(ticker)

    try:
        data = cache.cached(cache_key, cache.TTL_METRICS, _fetch)

        return jsonify(make_json_safe({
            "ticker": ticker,
            "quarters": data
        }))

    except Exception as e:
        return jsonify({
            "error": str(e),
            "ticker": ticker
        }), 500


# ---------------------------------------------------------------------------
# GET /api/stock/<ticker>/volume
# 90-day daily volume history — powers the volume bar chart
# ---------------------------------------------------------------------------

@stocks_bp.route("/stock/<ticker>/volume")
def get_volume(ticker: str):
    ticker = ticker.upper().strip()
    cache_key = f"stock:volume:{ticker}"

    def _fetch():
        return fetch_volume_history(ticker)

    try:
        data = cache.cached(cache_key, cache.TTL_CHART, _fetch)

        return jsonify(make_json_safe({
            "ticker": ticker,
            **data
        }))

    except Exception as e:
        return jsonify({
            "error": str(e),
            "ticker": ticker
        }), 500


# ---------------------------------------------------------------------------
# GET /api/stocks/movers?n=6
# Top gainers and losers across the whole stock universe
# Uses live fetch_movers first.
# If fetch_movers crashes, returns fallback data instead of 500.
# ---------------------------------------------------------------------------

@stocks_bp.route("/stocks/movers")
def get_movers():
    n = min(int(request.args.get("n", 6)), 20)
    cache_key = f"stocks:movers:{n}"

    fallback_data = {
        "gainers": [
            {"ticker": "NVDA", "name": "Nvidia", "change": 2.35, "sector": "Technology"},
            {"ticker": "AAPL", "name": "Apple", "change": 1.18, "sector": "Technology"},
            {"ticker": "MSFT", "name": "Microsoft", "change": 0.95, "sector": "Technology"},
            {"ticker": "AMZN", "name": "Amazon", "change": 0.82, "sector": "E-Commerce"},
            {"ticker": "GOOGL", "name": "Alphabet", "change": 0.76, "sector": "Technology"},
            {"ticker": "VOO", "name": "S&P 500 ETF (Vanguard)", "change": 0.51, "sector": "ETF"},
        ][:n],
        "losers": [
            {"ticker": "TSLA", "name": "Tesla", "change": -1.42, "sector": "Technology"},
            {"ticker": "META", "name": "Meta", "change": -0.88, "sector": "Technology"},
            {"ticker": "JPM", "name": "JPMorgan", "change": -0.61, "sector": "Finance"},
            {"ticker": "XOM", "name": "Exxon Mobil", "change": -0.54, "sector": "Energy"},
            {"ticker": "PFE", "name": "Pfizer", "change": -0.49, "sector": "Healthcare"},
            {"ticker": "QQQ", "name": "Invesco QQQ ETF", "change": -0.35, "sector": "ETF"},
        ][:n]
    }

    def _fetch():
        return fetch_movers(n)

    try:
        data = cache.cached(cache_key, cache.TTL_MOVERS, _fetch)
        return jsonify(make_json_safe(data))

    except Exception as e:
        print(f"Movers endpoint failed: {e}")
        return jsonify(make_json_safe(fallback_data))


# ---------------------------------------------------------------------------
# GET /api/stocks/trending?tickers=AAPL,MSFT,NVDA&n=10
# Fetches quotes for given tickers, sorts by volume ratio.
# Used for sector browser with expanded universe.
# ---------------------------------------------------------------------------

@stocks_bp.route("/stocks/trending")
def get_trending():
    tickers_param = request.args.get("tickers", "")
    n = min(int(request.args.get("n", 10)), 20)

    if not tickers_param:
        return jsonify([])

    tickers = [
        ticker.strip().upper()
        for ticker in tickers_param.split(",")
        if ticker.strip()
    ]

    cache_key = f"stocks:trending:{'_'.join(sorted(tickers))}:{n}"

    def _fetch():
        results = []

        for ticker in tickers:
            try:
                quote = fetch_quote(ticker)

                if quote and isinstance(quote, dict):
                    results.append(quote)

            except Exception as e:
                print(f"Error fetching trending quote for {ticker}: {e}")
                continue

        results.sort(
            key=lambda item: (
                (item.get("volume") or 0) /
                max(item.get("avg_volume") or 1, 1)
            ),
            reverse=True
        )

        return results[:n]

    try:
        data = cache.cached(cache_key, cache.TTL_MOVERS, _fetch)
        return jsonify(make_json_safe(data))

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ---------------------------------------------------------------------------
# GET /api/stocks/list?sector=Technology
# All stocks with live quote. Optional sector filter.
# Powers Browse by Sector panel and search suggestions.
# ---------------------------------------------------------------------------

@stocks_bp.route("/stocks/list")
def get_stocks_list():
    sector_filter = request.args.get("sector", "").strip()
    cache_key = "stocks:list:all"

    def _fetch_all():
        result = []

        for ticker in STOCK_UNIVERSE:
            try:
                quote = fetch_quote(ticker)

                if quote and isinstance(quote, dict):
                    result.append(quote)

            except Exception as e:
                print(f"Error fetching quote for {ticker}: {e}")
                continue

        return result

    try:
        all_stocks = cache.cached(cache_key, cache.TTL_QUOTE, _fetch_all)

        if sector_filter:
            filtered = [
                stock for stock in all_stocks
                if stock.get("sector", "").lower() == sector_filter.lower()
            ]

            return jsonify(make_json_safe(filtered))

        return jsonify(make_json_safe(all_stocks))

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500