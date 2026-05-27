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

    if hist.empty:
        raise ValueError(f"No stock data found for {ticker}")

    price = float(hist["Close"].iloc[-1])
    prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else None
    volume = int(hist["Volume"].iloc[-1]) if "Volume" in hist else None
    week52_high = float(hist["High"].max())
    week52_low = float(hist["Low"].min())

    change_abs = round(price - prev, 2) if prev else None
    change_pct = round((price - prev) / prev * 100, 2) if prev else None

    # Optional info. If Yahoo blocks it, don't crash.
    info = {}
    try:
        info = t.info or {}
    except Exception:
        info = {}

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
    """
    results = []
    for name, ticker in INDEX_TICKERS.items():
        try:
            t = _ticker(ticker)
            info = t.info
            price = _safe(info.get("regularMarketPrice") or info.get("currentPrice"))
            prev  = _safe(info.get("previousClose") or info.get("regularMarketPreviousClose"))

            if price and prev:
                change_pct = round((price - prev) / prev * 100, 2)
            else:
                change_pct = 0.0

            results.append({
                "name":       name,
                "ticker":     ticker,
                "value":      f"{price:,.2f}" if price else "N/A",
                "value_raw":  price,
                "change":     change_pct,
            })
        except Exception:
            results.append({"name": name, "ticker": ticker, "value": "N/A", "change": 0.0})

    return results


# ---------------------------------------------------------------------------
# Top movers — gainers and losers from our fixed stock universe
# ---------------------------------------------------------------------------

# The app's known stock universe — same tickers as the frontend hardcoded list
STOCK_UNIVERSE = [
    # ── ETFs & Index Funds ──────────────────────────────────────────────────
    "VOO", "SPY", "QQQ", "VTI", "IWM", "ARKK", "DIA", "VUG", "SCHD", "VYM",
    "GLD", "SLV", "TLT", "HYG", "LQD", "BND", "AGG", "EMB",
    "XLK", "XLV", "XLF", "XLE", "XLY", "XLP", "XLI", "XLB", "XLU", "XLRE", "XLC",
    "SQQQ", "TQQQ", "SPXU", "UPRO", "SPXL", "LABU", "SOXL", "SOXS",
    "JEPI", "JEPQ", "QYLD", "RYLD", "XYLD",
    "VNQ", "VNQI", "VEA", "VWO", "EEM", "EFA", "IEMG",
    "ARKW", "ARKG", "ARKF", "ARKQ",
    "IBIT", "FBTC", "GBTC", "BITO",

    # ── Mega-cap Technology ─────────────────────────────────────────────────
    "AAPL", "MSFT", "NVDA", "GOOGL", "GOOG", "META", "TSLA", "AMZN", "AVGO",
    "ORCL", "ADBE", "CRM", "NFLX", "INTC", "AMD", "QCOM", "TXN", "MU",

    # ── Semiconductors ──────────────────────────────────────────────────────
    "AMAT", "LRCX", "KLAC", "SNPS", "CDNS", "MRVL", "ON", "SWKS", "MPWR",
    "WOLF", "SMCI", "ARM", "TSM", "ASML", "AEHR", "AMBA",

    # ── Software & Cloud ────────────────────────────────────────────────────
    "PANW", "CRWD", "ZS", "OKTA", "DDOG", "SNOW", "PLTR", "UBER", "LYFT",
    "NOW", "WDAY", "VEEV", "HUBS", "BILL", "GTLB", "MDB", "ESTC", "CFLT",
    "PATH", "S", "SQ", "PYPL", "HOOD", "COIN", "MSTR", "APP",
    "NET", "FSLY", "DOMO", "ZI", "TTD", "TRADE", "MGNI",

    # ── Internet & Social ───────────────────────────────────────────────────
    "SNAP", "PINS", "RBLX", "U", "MTCH", "BMBL", "DUOL", "ABNB",

    # ── Hardware & Devices ──────────────────────────────────────────────────
    "HPQ", "HPE", "DELL", "STX", "WDC", "PSTG", "NTAP",

    # ── Finance — Big Banks ─────────────────────────────────────────────────
    "JPM", "BAC", "GS", "MS", "WFC", "C", "USB", "PNC", "TFC", "KEY",
    "RF", "CFG", "FITB", "HBAN",

    # ── Finance — Payments & Fintech ────────────────────────────────────────
    "V", "MA", "AXP", "DFS", "COF", "SYF", "ALLY",
    "FIS", "FISV", "GPN", "WEX", "PAYO",

    # ── Finance — Investment & Insurance ────────────────────────────────────
    "BLK", "SCHW", "SPGI", "MCO", "ICE", "CME", "CBOE", "NDAQ",
    "MET", "PRU", "AFL", "ALL", "TRV", "PGR", "HIG", "BRK-B",

    # ── Healthcare — Big Pharma ─────────────────────────────────────────────
    "JNJ", "LLY", "PFE", "ABBV", "MRK", "BMY", "AZN", "NVO", "SNY",
    "AMGN", "GILD", "REGN", "VRTX", "BIIB", "MRNA", "BNTX",

    # ── Healthcare — Devices & Services ─────────────────────────────────────
    "UNH", "TMO", "ABT", "SYK", "ISRG", "MDT", "BSX", "EW", "DXCM",
    "IDXX", "IQV", "CI", "CVS", "HCA", "HUM", "MOH", "CNC",
    "HOLX", "ALGN", "INSP", "NVCR", "IONS",

    # ── Biotech ─────────────────────────────────────────────────────────────
    "ILMN", "PACB", "BEAM", "CRSP", "NTLA", "EDIT", "FATE",
    "RXRX", "RLAY", "KYMR", "PCVX", "ROIV",

    # ── Energy — Oil & Gas ──────────────────────────────────────────────────
    "XOM", "CVX", "COP", "SLB", "EOG", "PSX", "VLO", "MPC",
    "OXY", "HAL", "BKR", "DVN", "FANG", "HES", "MRO", "APA",
    "SHEL", "BP", "TTE", "ENB", "ET", "WMB", "KMI",

    # ── Energy — Renewables ─────────────────────────────────────────────────
    "NEE", "ENPH", "SEDG", "RUN", "NOVA", "ARRY", "CSIQ", "FSLR",
    "PLUG", "BE", "BLDP", "CWEN",

    # ── Consumer — Food & Beverage ──────────────────────────────────────────
    "KO", "PEP", "MDLZ", "KHC", "GIS", "CPB", "SJM", "MKC",
    "STZ", "BUD", "TAP", "SAM",

    # ── Consumer — Household & Personal Care ────────────────────────────────
    "PG", "CL", "KMB", "CHD", "EL", "COTY", "REV", "ELF",

    # ── Consumer — Tobacco ──────────────────────────────────────────────────
    "MO", "PM", "BTI",

    # ── Consumer — Apparel & Footwear ───────────────────────────────────────
    "NKE", "LULU", "UAA", "UA", "PVH", "RL", "TPR", "CPRI",
    "VFC", "HBI", "SKX", "DECK", "ONON", "BIRK",

    # ── Consumer — Retail ───────────────────────────────────────────────────
    "WMT", "TGT", "COST", "KR", "ACI", "SFM", "PFGC",
    "HD", "LOW", "TSCO", "ORLY", "AZO",
    "ROST", "TJX", "BURL", "GPS", "ANF", "AEO", "URBN",
    "DG", "DLTR", "FIVE", "DRVN",

    # ── Consumer — Restaurants & Food Service ───────────────────────────────
    "MCD", "SBUX", "CMG", "YUM", "QSR", "DPZ", "WEN", "JACK",
    "SHAK", "CAKE", "TXRH", "DENN",

    # ── E-Commerce & Marketplaces ───────────────────────────────────────────
    "AMZN", "BABA", "SHOP", "MELI", "EBAY", "ETSY", "JD", "PDD",
    "W", "CHWY", "SE", "CPNG", "OZON", "GLOB",

    # ── Travel & Leisure ────────────────────────────────────────────────────
    "DAL", "UAL", "AAL", "LUV", "JBLU", "ALK", "SAVE",
    "BKNG", "EXPE", "TRIP", "ABNB",
    "MAR", "HLT", "H", "IHG", "WH", "ACLX",
    "CCL", "RCL", "NCLH",
    "WYNN", "MGM", "LVS", "CZR", "PENN", "DKNG", "RSI",

    # ── Media & Entertainment ───────────────────────────────────────────────
    "DIS", "CMCSA", "WBD", "PARA", "FOX", "FOXA",
    "NFLX", "SPOT", "SIRI", "IHRT",
    "EA", "TTWO", "ATVI", "RBLX", "U",
    "NYT", "IAC",

    # ── Real Estate ─────────────────────────────────────────────────────────
    "AMT", "CCI", "SBAC", "PLD", "EQIX", "DLR",
    "SPG", "MAC", "SKT", "KIM", "REG",
    "O", "NNN", "STAG", "VICI", "MPW",
    "AVB", "EQR", "UDR", "MAA", "CPT",
    "PSA", "EXR", "CUBE", "LSI",
    "WELL", "VTR", "PEAK", "HR",

    # ── Industrials — Aerospace & Defense ───────────────────────────────────
    "BA", "LMT", "RTX", "NOC", "GD", "HII", "L3H", "TDG", "HEI", "KTOS",

    # ── Industrials — Machinery & Equipment ─────────────────────────────────
    "CAT", "DE", "CMI", "PH", "ETN", "ROK", "EMR", "ITW",
    "DOV", "XYL", "GNRC", "FELE",

    # ── Industrials — Conglomerates ──────────────────────────────────────────
    "GE", "HON", "MMM", "ABB",

    # ── Industrials — Transport & Logistics ─────────────────────────────────
    "UPS", "FDX", "CHRW", "XPO", "ODFL", "SAIA", "JBHT",
    "CSX", "NSC", "UNP", "CP", "CNI",

    # ── Utilities ───────────────────────────────────────────────────────────
    "NEE", "DUK", "SO", "D", "AEP", "EXC", "SRE", "PCG",
    "XEL", "WEC", "ES", "ETR", "FE", "PPL",

    # ── Telecom ─────────────────────────────────────────────────────────────
    "T", "VZ", "TMUS", "LUMN", "ATUS",

    # ── Materials ───────────────────────────────────────────────────────────
    "LIN", "APD", "ECL", "SHW", "PPG", "NEM", "FCX", "AA", "X", "NUE",
    "CLF", "MP", "VALE", "RIO", "BHP",

    # ── Health & Fitness ────────────────────────────────────────────────────
    "PTON", "PLNT", "GRMN", "NVO", "ELF", "XPOF",

    # ── Auto ────────────────────────────────────────────────────────────────
    "TSLA", "F", "GM", "RIVN", "LCID", "NIO", "LI", "XPEV",
    "TM", "HMC", "STLA", "VOW3.DE",

    # ── Notable / Meme / High-Interest ──────────────────────────────────────
    "GME", "AMC", "BB", "NOK", "BBBY", "CLOV", "WISH", "SOFI",
    "SPCE", "OPEN", "OFFERPAD", "RKT", "UWMC",
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
        session=_get_session(),
    )

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