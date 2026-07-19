"""
fetcher.py — All yfinance calls live here
==========================================
Routes never import yfinance directly — they go through this module.
This keeps the data logic in one place and makes it easy to swap
yfinance for a paid API later (Polygon, Alpaca, etc.)

Every function returns plain Python dicts/lists — no yfinance objects
escape this file. That way routes just do JSON serialisation.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import math
import requests
import pandas as pd

def _ticker(symbol: str) -> yf.Ticker:
    """Create a yf.Ticker — let yfinance handle auth itself."""
    return yf.Ticker(symbol)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

HEADERS = {"User-Agent": "Mozilla/5.0"}

def _yahoo_quote(ticker: str) -> dict:
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={ticker.upper()}"
    res = requests.get(url, headers=HEADERS, timeout=10)
    res.raise_for_status()

    data = res.json()
    results = data.get("quoteResponse", {}).get("result", [])

    if not results:
        raise ValueError(f"No quote data found for {ticker}")

    return results[0]


def _yahoo_quote_summary(ticker: str) -> dict:
    """
    Fallback for fundamentals when yfinance's t.info gets rate-limited/blocked
    (very common on cloud hosts like Render). Hits Yahoo's quoteSummary API
    directly for the modules that cover dividendYield, beta, debtToEquity,
    returnOnEquity, trailingPE, marketCap, trailingEps — the fields that
    _yahoo_quote() alone doesn't provide.
    Returns a flat dict merging summaryDetail + defaultKeyStatistics + financialData.
    Raises on failure so callers can decide how to handle it.
    """
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ticker.upper()}"
    params = {"modules": "summaryDetail,defaultKeyStatistics,financialData,price"}
    res = requests.get(url, headers=HEADERS, params=params, timeout=10)
    res.raise_for_status()

    data = res.json()
    result = data.get("quoteSummary", {}).get("result")
    if not result:
        raise ValueError(f"No quoteSummary data for {ticker}")

    modules = result[0]

    def _raw(module, key):
        val = (modules.get(module, {}) or {}).get(key)
        if isinstance(val, dict):
            return val.get("raw")
        return val

    return {
        "trailingPE": _raw("summaryDetail", "trailingPE") or _raw("defaultKeyStatistics", "trailingEps"),
        "marketCap": _raw("price", "marketCap") or _raw("summaryDetail", "marketCap"),
        "dividendYield": _raw("summaryDetail", "dividendYield"),
        "trailingEps": _raw("defaultKeyStatistics", "trailingEps"),
        "beta": _raw("defaultKeyStatistics", "beta") or _raw("summaryDetail", "beta"),
        "debtToEquity": _raw("financialData", "debtToEquity"),
        "returnOnEquity": _raw("financialData", "returnOnEquity"),
        "averageVolume": _raw("summaryDetail", "averageVolume"),
        "longName": _raw("price", "longName") or _raw("price", "shortName"),
    }


def _safe(value, default=None):
    """Return default if value is NaN / None / inf."""
    if value is None:
        return default
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return default
    return value


def _fmt_large(n):
    """Format large numbers: 2_800_000_000_000 → '$2.8T'"""
    if n is None:
        return "N/A"
    if n >= 1e12:
        return f"${n / 1e12:.2f}T"
    if n >= 1e9:
        return f"${n / 1e9:.2f}B"
    if n >= 1e6:
        return f"${n / 1e6:.2f}M"
    return f"${n:,.0f}"


def _fmt_volume(n):
    """58_200_000 → '58.2M'"""
    if n is None:
        return "N/A"
    if n >= 1e9:
        return f"{n / 1e9:.1f}B"
    if n >= 1e6:
        return f"{n / 1e6:.1f}M"
    if n >= 1e3:
        return f"{n / 1e3:.1f}K"
    return str(n)


# ---------------------------------------------------------------------------
# Quote — price, change, basic info
# ---------------------------------------------------------------------------

def fetch_quote(ticker: str) -> dict:
    q = _yahoo_quote(ticker)

    price = _safe(q.get("regularMarketPrice"))
    prev = _safe(q.get("regularMarketPreviousClose"))

    change_abs = round(price - prev, 2) if price and prev else None
    change_pct = round((price - prev) / prev * 100, 2) if price and prev else None

    return {
        "ticker": ticker.upper(),
        "name": q.get("longName") or q.get("shortName") or ticker.upper(),
        "sector": "Unknown",
        "industry": "Unknown",
        "price": price,
        "change": change_pct,
        "change_abs": change_abs,
        "market_cap": _safe(q.get("marketCap")),
        "market_cap_fmt": _fmt_large(q.get("marketCap")),
        "volume": _safe(q.get("regularMarketVolume")),
        "volume_fmt": _fmt_volume(q.get("regularMarketVolume")),
        "logo_url": None,
    }


def _finnhub_fundamentals(ticker: str) -> dict:
    """
    Last-resort fundamentals source for fetch_stock_detail(), used when
    Yahoo's info/quote/quoteSummary endpoints are all blocked. Uses
    Finnhub's basic-financials endpoint (same FINNHUB_API_KEY already used
    by routes/news.py), which doesn't require the Yahoo auth crumb.
    Returns a dict shaped like yfinance's `info`, normalised to the same
    units/conventions fetch_stock_detail already expects from `info`:
      - marketCap / averageVolume in raw units (Finnhub reports these in
        millions, so we scale up)
      - dividendYield as a fraction (Finnhub reports it as a %, so we
        divide by 100 to match yfinance's convention)
      - debtToEquity left as Finnhub's raw (percent-like) figure — the
        existing >20 check in fetch_stock_detail already normalises that
    """
    import os

    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        raise ValueError("FINNHUB_API_KEY not set")

    res = requests.get(
        "https://finnhub.io/api/v1/stock/metric",
        params={"symbol": ticker.upper(), "metric": "all", "token": api_key},
        timeout=10,
    )
    res.raise_for_status()
    m = (res.json() or {}).get("metric") or {}
    if not m:
        raise ValueError(f"No Finnhub metrics for {ticker}")

    def _scale_millions(v):
        return v * 1e6 if v is not None else None

    market_cap = _scale_millions(m.get("marketCapitalization"))

    avg_volume = m.get("3MonthAverageTradingVolume") or m.get("10DayAverageTradingVolume")
    # Finnhub reports average volume in millions of shares too.
    if avg_volume is not None and avg_volume < 100000:
        avg_volume = avg_volume * 1e6

    div_yield_raw = m.get("currentDividendYieldTTM")
    div_yield = (div_yield_raw / 100) if div_yield_raw is not None else None

    roe_raw = m.get("roeTTM")
    roe = (roe_raw / 100) if roe_raw is not None else None

    long_name = None
    try:
        prof = requests.get(
            "https://finnhub.io/api/v1/stock/profile2",
            params={"symbol": ticker.upper(), "token": api_key},
            timeout=10,
        )
        if prof.ok:
            long_name = (prof.json() or {}).get("name")
    except Exception:
        pass

    return {
        "trailingPE": m.get("peTTM") or m.get("peBasicExclExtraTTM") or m.get("peExclExtraTTM"),
        "marketCap": market_cap,
        "dividendYield": div_yield,
        "trailingEps": m.get("epsTTM") or m.get("epsInclExtraItemsTTM") or m.get("epsExclExtraItemsTTM"),
        "beta": m.get("beta"),
        "debtToEquity": m.get("totalDebt/totalEquityQuarterly") or m.get("totalDebt/totalEquityAnnual"),
        "returnOnEquity": roe,
        "averageVolume": avg_volume,
        "longName": long_name,
    }


# ---------------------------------------------------------------------------
# Full stock detail — all 9 metrics the Learn/Stock page displays
# ---------------------------------------------------------------------------

def fetch_stock_detail(ticker: str) -> dict:
    ticker = ticker.upper()
    t = _ticker(ticker)

    hist = yf.download(
    ticker,
    period="1y",
    interval="1d",
    auto_adjust=True,
    progress=False,
    threads=False
)
    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.get_level_values(0)

    if hist.empty:
        raise ValueError(f"No stock data found for {ticker}")

    price = float(hist["Close"].iloc[-1])
    prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else None
    volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist else None
    week52_high = float(hist["High"].max())
    week52_low = float(hist["Low"].min())

    change_abs = round(price - prev, 2) if prev else None
    change_pct = round((price - prev) / prev * 100, 2) if prev else None

    # Optional info. If Yahoo blocks it, don't crash — fall back to the
    # lighter quote endpoint (same one fetch_quote() uses) for the fields
    # it can cover, so the page isn't all "N/A" just because .info got rate-limited.
    info = {}
    try:
        info = t.info or {}
    except Exception:
        info = {}

    # NOTE: we deliberately don't use dict.setdefault() here. setdefault()
    # only fills in a key if it's completely absent — but yfinance's t.info
    # commonly returns a full dict with the key PRESENT and set to None
    # (e.g. when Yahoo withholds fundamentals on cloud-host IPs), so
    # setdefault silently does nothing and every fallback tier below it was
    # a no-op. This was the actual cause of PE / EPS / beta / div yield /
    # debt-to-equity / ROE always showing N/A even though the fallback
    # calls were "succeeding". Using "if not info.get(k): info[k] = v"
    # instead correctly overwrites both missing AND None values.
    if not info.get("trailingPE") or not info.get("marketCap"):
        try:
            q = _yahoo_quote(ticker)
            candidates = {
                "trailingPE": q.get("trailingPE"),
                "marketCap": q.get("marketCap"),
                "trailingEps": q.get("epsTrailingTwelveMonths"),
                "averageVolume": q.get("averageDailyVolume3Month"),
                "longName": q.get("longName") or q.get("shortName"),
            }
            for k, v in candidates.items():
                if v is not None and not info.get(k):
                    info[k] = v
        except Exception:
            pass

    # Third-tier fallback: dividendYield / beta / debtToEquity / returnOnEquity
    # aren't covered by the lightweight quote endpoint above, so if they're
    # still missing (t.info blocked entirely), hit quoteSummary directly.
    needed = ("dividendYield", "beta", "debtToEquity", "returnOnEquity", "trailingPE", "marketCap", "trailingEps", "averageVolume")
    if any(not info.get(k) for k in needed):
        try:
            qs = _yahoo_quote_summary(ticker)
            for k, v in qs.items():
                if v is not None and not info.get(k):
                    info[k] = v
        except Exception:
            pass

    # Fourth-tier fallback: Yahoo's raw quote/quoteSummary endpoints above
    # require an auth crumb Yahoo doesn't hand out to plain unauthenticated
    # requests from most cloud hosts, so tiers 2 and 3 frequently fail
    # entirely too. Finnhub (we already hold a key for news) has a stable,
    # keyed fundamentals endpoint that covers the same fields, so use it as
    # a last resort for whatever is still missing.
    if any(not info.get(k) for k in needed):
        try:
            fh = _finnhub_fundamentals(ticker)
            for k, v in fh.items():
                if v is not None and not info.get(k):
                    info[k] = v
        except Exception:
            pass

    pe = _safe(info.get("trailingPE"))
    market_cap = _safe(info.get("marketCap"))
    avg_volume = _safe(info.get("averageVolume"))
    div_yield = _safe(info.get("dividendYield"))
    eps = _safe(info.get("trailingEps"))
    beta = _safe(info.get("beta"))
    debt_eq = _safe(info.get("debtToEquity"))
    roe = _safe(info.get("returnOnEquity"))

    if debt_eq and debt_eq > 20:
        debt_eq = round(debt_eq / 100, 2)

    div_yield_pct = round(div_yield * 100, 2) if div_yield and div_yield < 1 else div_yield
    roe_pct = round(roe * 100, 1) if roe else None

    if market_cap:
        if market_cap >= 200e9:
            cap_size = "Mega-cap"
        elif market_cap >= 10e9:
            cap_size = "Large-cap"
        elif market_cap >= 2e9:
            cap_size = "Mid-cap"
        else:
            cap_size = "Small-cap"
    else:
        cap_size = "Unknown"

    week52_pos = round((price - week52_low) / (week52_high - week52_low) * 100, 1) if week52_high != week52_low else None

    return {
        "ticker": ticker,
        "name": info.get("longName") or info.get("shortName") or ticker,
        "sector": info.get("sector", "Unknown"),
        "industry": info.get("industry", "Unknown"),
        "description": info.get("longBusinessSummary", ""),

        "price": price,
        "price_fmt": f"${price:,.2f}",
        "change": change_pct,
        "change_abs": change_abs,
        "prev_close": prev,

        "pe": pe,
        "pe_fmt": f"{pe:.1f}" if pe else "N/A",

        "market_cap": market_cap,
        "market_cap_fmt": _fmt_large(market_cap),
        "cap_size": cap_size,

        "volume": volume,
        "volume_fmt": _fmt_volume(volume),
        "avg_volume": avg_volume,
        "avg_volume_fmt": _fmt_volume(avg_volume),
        "volume_ratio": round(volume / avg_volume, 2) if volume and avg_volume else None,

        "div_yield": div_yield_pct,
        "div_yield_fmt": f"{div_yield_pct:.2f}%" if div_yield_pct else "N/A",

        "annual_div": round(price * div_yield, 2) if price and div_yield else None,

        "eps": eps,
        "eps_fmt": f"${eps:.2f}" if eps else "N/A",

        "week52_high": week52_high,
        "week52_low": week52_low,
        "week52_fmt": f"${week52_low:.2f} – ${week52_high:.2f}",
        "week52_pos": week52_pos,

        "pct_from_low": round((price - week52_low) / week52_low * 100, 1),
        "pct_from_high": round((price - week52_high) / week52_high * 100, 1),

        "beta": beta,
        "beta_fmt": f"{beta:.2f}" if beta else "N/A",

        "debt_to_equity": debt_eq,
        "debt_to_equity_fmt": f"{debt_eq:.2f}" if debt_eq else "N/A",

        "roe": roe_pct,
        "roe_fmt": f"{roe_pct:.1f}%" if roe_pct else "N/A",
    }


# ---------------------------------------------------------------------------
# Historical chart data
# ---------------------------------------------------------------------------

# Map frontend timeframe labels to yfinance period/interval params
CHART_PARAMS = {
    "1D":  ("1d",  "15m"),
    "1W":  ("5d",  "60m"),
    "1M":  ("1mo", "1d"),
    "3M":  ("3mo", "1d"),
    "YTD": ("ytd", "1d"),
    "1Y":  ("1y",  "1d"),
    "5Y":  ("5y",  "1wk"),
    "ALL": ("max", "1mo"),
}

def fetch_chart(ticker: str, timeframe: str = "1M") -> dict:
    """
    Returns OHLCV data formatted for a line/candlestick chart.
    {
      timeframe, ticker,
      labels: ["2024-01-01", ...],
      closes: [175.43, ...],
      opens, highs, lows, volumes,
      change_pct: overall % change over the period
    }
    """
    period, interval = CHART_PARAMS.get(timeframe, ("1mo", "1d"))
    t = _ticker(ticker)

    hist = yf.download(
        ticker,
        period=period,
        interval=interval,
        auto_adjust=True,
        progress=False,
        threads=False
    )

    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.get_level_values(0)

    if hist.empty:
        return {"error": "No chart data available", "ticker": ticker, "timeframe": timeframe}

    # Format labels nicely
    if timeframe in ("1D", "1W"):
        labels = hist.index.strftime("%d %b %Y, %H:%M").tolist()
    else:
        labels = hist.index.strftime("%d %b %Y").tolist()

    closes  = [round(v, 2) for v in hist["Close"].ffill().tolist()]
    opens   = [round(v, 2) for v in hist["Open"].ffill().tolist()]
    highs   = [round(v, 2) for v in hist["High"].ffill().tolist()]
    lows    = [round(v, 2) for v in hist["Low"].ffill().tolist()]
    volumes = [int(v) for v in hist["Volume"].fillna(0).tolist()]

    # Colour coding: green if close > open, red otherwise (for volume bars)
    colors = ["#4caf50" if c >= o else "#e87070" for c, o in zip(closes, opens)]

    # Overall period change
    if closes and closes[0]:
        period_change = round((closes[-1] - closes[0]) / closes[0] * 100, 2)
    else:
        period_change = None

    return {
        "ticker":        ticker.upper(),
        "timeframe":     timeframe,
        "labels":        labels,
        "closes":        closes,
        "opens":         opens,
        "highs":         highs,
        "lows":          lows,
        "volumes":       volumes,
        "bar_colors":    colors,
        "period_change": period_change,
        "data_points":   len(closes),
    }


# ---------------------------------------------------------------------------
# EPS history — quarterly, last 8 quarters
# ---------------------------------------------------------------------------

def fetch_eps_history(ticker: str) -> list:
    """
    Returns last 8 quarters of EPS for the EPS bar chart.
    [{"quarter": "Q1 '24", "eps": 2.40, "up": True}, ...]
    """
    t = _ticker(ticker)

    try:
        earnings = t.quarterly_earnings
        if earnings is None or earnings.empty:
            return []

        # Limit to last 8 quarters, oldest first
        recent = earnings.tail(8)

        result = []
        prev_eps = None
        for date, row in recent.iterrows():
            eps_val = _safe(row.get("Earnings"))
            quarter_label = date.strftime("Q%q '%y") if hasattr(date, 'strftime') else str(date)

            result.append({
                "quarter": quarter_label,
                "eps":     round(eps_val, 2) if eps_val else None,
                "up":      (eps_val >= prev_eps) if (eps_val is not None and prev_eps is not None) else True,
            })
            if eps_val is not None:
                prev_eps = eps_val

        return result
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Volume history — 90 days, for the volume bar chart
# ---------------------------------------------------------------------------

def fetch_volume_history(ticker: str) -> dict:
    """
    Returns 90 days of daily volume + avg, for the volume bar chart.
    {
      volumes: [int, ...],
      avg_volume: int,
      bar_colors: ["#4caf50"|"#e87070", ...],  # green=up day, red=down day
      highlight_indices: [int, ...]             # days where volume > 2× avg
    }
    """
    t = _ticker(ticker)
    hist = yf.download(
        ticker,
        period="3mo",
        interval="1d",
        auto_adjust=True,
        progress=False,
        threads=False
    )

    if isinstance(hist.columns, pd.MultiIndex):
        hist.columns = hist.columns.get_level_values(0)

    if hist.empty:
        return {}

    volumes = hist["Volume"].fillna(0).astype(int).tolist()
    closes  = hist["Close"].tolist()
    opens   = hist["Open"].tolist()
    avg_vol = int(sum(volumes) / len(volumes)) if volumes else 0

    colors = ["#4caf50" if c >= o else "#e87070" for c, o in zip(closes, opens)]
    highlights = [i for i, v in enumerate(volumes) if avg_vol and v > avg_vol * 2]

    return {
        "volumes":          volumes,
        "avg_volume":       avg_vol,
        "avg_volume_fmt":   _fmt_volume(avg_vol),
        "bar_colors":       colors,
        "highlight_indices": highlights,
        "days":             len(volumes),
    }


# ---------------------------------------------------------------------------
# Market indices — S&P 500, NASDAQ, DOW
# ---------------------------------------------------------------------------

INDEX_TICKERS = {
    "S&P 500": "^GSPC",
    "NASDAQ":  "^IXIC",
    "DOW":     "^DJI",
}

def fetch_indices() -> list:
    """
    Returns current price + daily % change for the three main indices.
    [{"name": "S&P 500", "value": "5,304.72", "change": 0.51}, ...]

    Each index is cached individually (via cache.cached) so that if one
    ticker's live fetch fails (e.g. market closed, Yahoo hiccup), we serve
    its last known good price instead of "N/A" — and a bad fetch for one
    ticker never wipes out good cached data for the others.
    """
    import cache as _cache

    results = []
    for name, ticker in INDEX_TICKERS.items():
        def _fetch_one(ticker=ticker, name=name):
            price = None
            prev = None
            try:
                t = _ticker(ticker)
                info = t.info
                price = _safe(info.get("regularMarketPrice") or info.get("currentPrice"))
                prev = _safe(info.get("previousClose") or info.get("regularMarketPreviousClose"))
            except Exception:
                pass

            if price is None:
                # yfinance .info is frequently blocked on cloud hosts — fall
                # back to the lighter Yahoo quote endpoint.
                q = _yahoo_quote(ticker)
                price = _safe(q.get("regularMarketPrice"))
                prev = _safe(q.get("regularMarketPreviousClose"))

            if price is None:
                raise ValueError(f"No price for {ticker}")

            change_pct = round((price - prev) / prev * 100, 2) if price and prev else 0.0

            return {
                "name": name,
                "ticker": ticker,
                "value": f"{price:,.2f}",
                "value_raw": price,
                "change": change_pct,
            }

        try:
            data = _cache.cached(f"market:index:{ticker}", _cache.TTL_INDICES, _fetch_one)
            results.append(data)
        except Exception:
            results.append({"name": name, "ticker": ticker, "value": "N/A", "change": 0.0})

    return results


# ---------------------------------------------------------------------------
# Daily market news — general financial headlines for the dashboard
# ---------------------------------------------------------------------------

# Keywords used to decide whether a general-news headline is actually
# market/finance-relevant. Covers direct market terms (stocks, Fed, earnings)
# as well as the macro/geopolitical terms that typically move markets
# (tariffs, sanctions, oil, OPEC) — so a story about a geopolitical event
# only surfaces here when it's tied to something like sanctions or oil
# prices, not just any world-news headline.
FINANCIAL_KEYWORDS = [
    "stock", "stocks", "market", "markets", "nasdaq", "dow jones", "s&p",
    "wall street", "fed", "federal reserve", "interest rate", "rate cut",
    "rate hike", "inflation", "gdp", "earnings", "ipo", "merger",
    "acquisition", "tariff", "trade war", "oil price", "crude", "opec",
    "treasury", "bond", "yield", "recession", "economy", "economic",
    "central bank", "dollar", "currency", "crypto", "bitcoin",
    "jobs report", "unemployment", "cpi", "sanctions", "supply chain",
    "commodity", "commodities", "investor", "investors", "shares",
    "hedge fund", "layoffs", "export", "import", "antitrust",
]


def _is_financially_relevant(headline: str, summary: str) -> bool:
    text = f"{headline or ''} {summary or ''}".lower()
    return any(kw in text for kw in FINANCIAL_KEYWORDS)


def fetch_market_news(limit: int = 8) -> list:
    """
    General market/finance headlines (not tied to a specific ticker), for
    the dashboard "Market News" card. Uses Finnhub's general-news endpoint,
    then filters down to stories with a clear financial/market angle —
    Finnhub's raw "general" category otherwise mixes in a lot of non-market
    world news, which made the card feel unfocused.
    """
    import os

    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        return []

    res = requests.get(
        "https://finnhub.io/api/v1/news",
        params={"category": "general", "token": api_key},
        timeout=10,
    )
    res.raise_for_status()
    raw = res.json()

    filtered = [
        item for item in raw
        if _is_financially_relevant(item.get("headline", ""), item.get("summary", ""))
    ]

    # If the financial filter leaves us short of `limit`, top up with the
    # next unfiltered stories (already newest-first from Finnhub) rather
    # than showing a sparse or empty card.
    if len(filtered) < limit:
        seen_ids = {item.get("id") for item in filtered}
        for item in raw:
            if item.get("id") not in seen_ids:
                filtered.append(item)
                seen_ids.add(item.get("id"))
            if len(filtered) >= limit:
                break

    articles = []
    for item in filtered[:limit]:
        articles.append({
            "headline": item.get("headline"),
            "source": item.get("source"),
            "summary": item.get("summary"),
            "url": item.get("url"),
            "image": item.get("image"),
            "datetime": item.get("datetime"),
        })
    return articles


# ---------------------------------------------------------------------------
# Top movers — gainers and losers from our fixed stock universe
# ---------------------------------------------------------------------------

# The app's known stock universe — same tickers as the frontend hardcoded list
STOCK_UNIVERSE = [
    # ETFs
    "VOO", "SPY", "QQQ", "VTI", "IWM",

    # Tech
    "AAPL", "MSFT", "NVDA", "GOOGL", "META",
    "TSLA", "AMD", "AMZN", "NFLX",

    # Finance
    "JPM", "BAC", "GS", "V", "MA",

    # Healthcare
    "UNH", "LLY", "JNJ", "PFE",

    # Energy
    "XOM", "CVX", "SLB",

    # Consumer
    "KO", "PEP", "COST", "WMT", "NKE",

    # Industrial
    "CAT", "GE", "BA",

    # Misc
    "UBER", "PLTR", "SNOW", "CRM"
]


def fetch_movers(n: int = 6) -> dict:
    """
    Downloads quotes for all stocks in the universe in one yfinance batch call,
    then returns top n gainers and top n losers.
    {
      gainers: [{ticker, name, price, change}, ...],
      losers:  [{ticker, name, price, change}, ...]
    }
    """
    tickers_str = " ".join(STOCK_UNIVERSE)
    data = yf.download(
        tickers_str,
        period="2d",
        interval="1d",
        group_by="ticker",
        auto_adjust=True,
        threads=True,
        progress=False,
    )

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    rows = []
    for ticker in STOCK_UNIVERSE:
        try:
            if ticker in data.columns.get_level_values(0):
                closes = data[ticker]["Close"].dropna()
            else:
                closes = data["Close"].dropna() if len(STOCK_UNIVERSE) == 1 else None

            if closes is None or len(closes) < 2:
                continue

            price = round(float(closes.iloc[-1]), 2)
            prev  = round(float(closes.iloc[-2]), 2)
            change_pct = round((price - prev) / prev * 100, 2) if prev else 0

            # Get name from yfinance info (fast_info is lighter)
            fi = _ticker(ticker).fast_info
            name = getattr(fi, "name", ticker)

            rows.append({
                "ticker": ticker,
                "name":   name,
                "price":  price,
                "change": change_pct,
            })
        except Exception:
            continue

    rows.sort(key=lambda r: r["change"], reverse=True)
    return {
        "gainers": rows[:n],
        "losers":  rows[-n:][::-1],   # most negative first
    }


# ---------------------------------------------------------------------------
# Search index — lightweight list for autocomplete
# ---------------------------------------------------------------------------

def build_search_index() -> list:
    """
    Returns [{ticker, name, sector}] for all stocks in the universe.
    Uses a single _ticker() call per stock (not two) to halve rate-limit hits.
    Cached for 1 hour (TTL_SEARCH).
    """
    results = []
    for ticker in STOCK_UNIVERSE:
        try:
            t    = _ticker(ticker)
            info = t.info
            results.append({
                "ticker": ticker,
                "name":   info.get("longName") or info.get("shortName") or ticker,
                "sector": info.get("sector", "Unknown"),
            })
        except Exception:
            results.append({"ticker": ticker, "name": ticker, "sector": "Unknown"})
    return results