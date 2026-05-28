"""
routes/search.py
=================
Endpoints:
  GET /api/search?q=apple              — autocomplete suggestions (name or ticker)
  GET /api/search/index                — full stock universe list (for client-side filtering)

The search index (ticker + name + sector) is cached for 1 hour since it
doesn't change often. The heavy data fetching only runs once per hour.
"""

from flask import Blueprint, jsonify, request
from fetcher import build_search_index, STOCK_UNIVERSE
import cache
import yfinance as yf

search_bp = Blueprint("search", __name__)

# Static sector mapping that matches the frontend — used as fallback when
# yfinance sector is missing or mismatched.
SECTOR_MAP = {
    # ETFs
    "VOO":"ETF","SPY":"ETF","QQQ":"ETF","VTI":"ETF","IWM":"ETF","ARKK":"ETF","DIA":"ETF",
    "VUG":"ETF","SCHD":"ETF","VYM":"ETF","GLD":"ETF","SLV":"ETF","TLT":"ETF","HYG":"ETF",
    "LQD":"ETF","BND":"ETF","AGG":"ETF","EMB":"ETF","XLK":"ETF","XLV":"ETF","XLF":"ETF",
    "XLE":"ETF","XLY":"ETF","XLP":"ETF","XLI":"ETF","XLB":"ETF","XLU":"ETF","XLRE":"ETF",
    "XLC":"ETF","SQQQ":"ETF","TQQQ":"ETF","SPXU":"ETF","UPRO":"ETF","SPXL":"ETF",
    "LABU":"ETF","SOXL":"ETF","SOXS":"ETF","JEPI":"ETF","JEPQ":"ETF","QYLD":"ETF",
    "RYLD":"ETF","XYLD":"ETF","VNQ":"ETF","VNQI":"ETF","VEA":"ETF","VWO":"ETF",
    "EEM":"ETF","EFA":"ETF","IEMG":"ETF","ARKW":"ETF","ARKG":"ETF","ARKF":"ETF",
    "ARKQ":"ETF","IBIT":"ETF","FBTC":"ETF","GBTC":"ETF","BITO":"ETF",
    # Technology
    "AAPL":"Technology","MSFT":"Technology","NVDA":"Technology","GOOGL":"Technology",
    "GOOG":"Technology","META":"Technology","TSLA":"Technology","AMZN":"Technology",
    "AVGO":"Technology","ORCL":"Technology","ADBE":"Technology","CRM":"Technology",
    "NFLX":"Technology","INTC":"Technology","AMD":"Technology","QCOM":"Technology",
    "TXN":"Technology","MU":"Technology","AMAT":"Technology","LRCX":"Technology",
    "KLAC":"Technology","SNPS":"Technology","CDNS":"Technology","MRVL":"Technology",
    "ON":"Technology","SWKS":"Technology","MPWR":"Technology","WOLF":"Technology",
    "SMCI":"Technology","ARM":"Technology","TSM":"Technology","ASML":"Technology",
    "AEHR":"Technology","AMBA":"Technology","PANW":"Technology","CRWD":"Technology",
    "ZS":"Technology","OKTA":"Technology","DDOG":"Technology","SNOW":"Technology",
    "PLTR":"Technology","UBER":"Technology","LYFT":"Technology","NOW":"Technology",
    "WDAY":"Technology","VEEV":"Technology","HUBS":"Technology","BILL":"Technology",
    "GTLB":"Technology","MDB":"Technology","ESTC":"Technology","CFLT":"Technology",
    "PATH":"Technology","S":"Technology","SQ":"Finance","PYPL":"Finance",
    "HOOD":"Finance","COIN":"Finance","MSTR":"Technology","APP":"Technology",
    "NET":"Technology","FSLY":"Technology","DOMO":"Technology","ZI":"Technology",
    "TTD":"Technology","MGNI":"Technology","SNAP":"Technology","PINS":"Technology",
    "RBLX":"Technology","U":"Technology","MTCH":"Technology","BMBL":"Technology",
    "DUOL":"Technology","HPQ":"Technology","HPE":"Technology","DELL":"Technology",
    "STX":"Technology","WDC":"Technology","PSTG":"Technology","NTAP":"Technology",
    # Finance
    "JPM":"Finance","BAC":"Finance","GS":"Finance","MS":"Finance","WFC":"Finance",
    "C":"Finance","USB":"Finance","PNC":"Finance","TFC":"Finance","KEY":"Finance",
    "RF":"Finance","CFG":"Finance","FITB":"Finance","HBAN":"Finance","V":"Finance",
    "MA":"Finance","AXP":"Finance","DFS":"Finance","COF":"Finance","SYF":"Finance",
    "ALLY":"Finance","FIS":"Finance","FISV":"Finance","GPN":"Finance","WEX":"Finance",
    "PAYO":"Finance","BLK":"Finance","SCHW":"Finance","SPGI":"Finance","MCO":"Finance",
    "ICE":"Finance","CME":"Finance","CBOE":"Finance","NDAQ":"Finance","MET":"Finance",
    "PRU":"Finance","AFL":"Finance","ALL":"Finance","TRV":"Finance","PGR":"Finance",
    "HIG":"Finance","BRK-B":"Finance",
    # Healthcare
    "JNJ":"Healthcare","LLY":"Healthcare","PFE":"Healthcare","ABBV":"Healthcare",
    "MRK":"Healthcare","BMY":"Healthcare","AZN":"Healthcare","NVO":"Healthcare",
    "SNY":"Healthcare","AMGN":"Healthcare","GILD":"Healthcare","REGN":"Healthcare",
    "VRTX":"Healthcare","BIIB":"Healthcare","MRNA":"Healthcare","BNTX":"Healthcare",
    "UNH":"Healthcare","TMO":"Healthcare","ABT":"Healthcare","SYK":"Healthcare",
    "ISRG":"Healthcare","MDT":"Healthcare","BSX":"Healthcare","EW":"Healthcare",
    "DXCM":"Healthcare","IDXX":"Healthcare","IQV":"Healthcare","CI":"Healthcare",
    "CVS":"Healthcare","HCA":"Healthcare","HUM":"Healthcare","MOH":"Healthcare",
    "CNC":"Healthcare","HOLX":"Healthcare","ALGN":"Healthcare","INSP":"Healthcare",
    "NVCR":"Healthcare","IONS":"Healthcare","ILMN":"Healthcare","PACB":"Healthcare",
    "BEAM":"Healthcare","CRSP":"Healthcare","NTLA":"Healthcare","EDIT":"Healthcare",
    "FATE":"Healthcare","RXRX":"Healthcare","RLAY":"Healthcare","KYMR":"Healthcare",
    "PCVX":"Healthcare","ROIV":"Healthcare",
    # Energy
    "XOM":"Energy","CVX":"Energy","COP":"Energy","SLB":"Energy","EOG":"Energy",
    "PSX":"Energy","VLO":"Energy","MPC":"Energy","OXY":"Energy","HAL":"Energy",
    "BKR":"Energy","DVN":"Energy","FANG":"Energy","HES":"Energy","MRO":"Energy",
    "APA":"Energy","SHEL":"Energy","BP":"Energy","TTE":"Energy","ENB":"Energy",
    "ET":"Energy","WMB":"Energy","KMI":"Energy","NEE":"Energy","ENPH":"Energy",
    "SEDG":"Energy","RUN":"Energy","NOVA":"Energy","ARRY":"Energy","CSIQ":"Energy",
    "FSLR":"Energy","PLUG":"Energy","BE":"Energy","BLDP":"Energy","CWEN":"Energy",
    # Consumer
    "KO":"Consumer Goods","PEP":"Consumer Goods","MDLZ":"Consumer Goods",
    "KHC":"Consumer Goods","GIS":"Consumer Goods","CPB":"Consumer Goods",
    "SJM":"Consumer Goods","MKC":"Consumer Goods","STZ":"Consumer Goods",
    "BUD":"Consumer Goods","TAP":"Consumer Goods","SAM":"Consumer Goods",
    "PG":"Consumer Goods","CL":"Consumer Goods","KMB":"Consumer Goods",
    "CHD":"Consumer Goods","EL":"Consumer Goods","COTY":"Consumer Goods",
    "ELF":"Consumer Goods","MO":"Consumer Goods","PM":"Consumer Goods","BTI":"Consumer Goods",
    "NKE":"Consumer Goods","LULU":"Consumer Goods","UAA":"Consumer Goods",
    "UA":"Consumer Goods","PVH":"Consumer Goods","RL":"Consumer Goods",
    "TPR":"Consumer Goods","CPRI":"Consumer Goods","VFC":"Consumer Goods",
    "HBI":"Consumer Goods","SKX":"Consumer Goods","DECK":"Consumer Goods",
    "ONON":"Consumer Goods","BIRK":"Consumer Goods","WMT":"Consumer Goods",
    "TGT":"Consumer Goods","COST":"Consumer Goods","KR":"Consumer Goods",
    "HD":"Consumer Goods","LOW":"Consumer Goods","TSCO":"Consumer Goods",
    "ORLY":"Consumer Goods","AZO":"Consumer Goods","ROST":"Consumer Goods",
    "TJX":"Consumer Goods","BURL":"Consumer Goods","GPS":"Consumer Goods",
    "ANF":"Consumer Goods","AEO":"Consumer Goods","URBN":"Consumer Goods",
    "DG":"Consumer Goods","DLTR":"Consumer Goods","FIVE":"Consumer Goods",
    "MCD":"Consumer Goods","SBUX":"Consumer Goods","CMG":"Consumer Goods",
    "YUM":"Consumer Goods","QSR":"Consumer Goods","DPZ":"Consumer Goods",
    "WEN":"Consumer Goods","SHAK":"Consumer Goods","TXRH":"Consumer Goods",
    # E-Commerce
    "BABA":"E-Commerce","SHOP":"E-Commerce","MELI":"E-Commerce","EBAY":"E-Commerce",
    "ETSY":"E-Commerce","JD":"E-Commerce","PDD":"E-Commerce","W":"E-Commerce",
    "CHWY":"E-Commerce","SE":"E-Commerce","CPNG":"E-Commerce","GLOB":"E-Commerce",
    # Travel
    "DAL":"Travel","UAL":"Travel","AAL":"Travel","LUV":"Travel","JBLU":"Travel",
    "ALK":"Travel","SAVE":"Travel","BKNG":"Travel","EXPE":"Travel","TRIP":"Travel",
    "ABNB":"Travel","MAR":"Travel","HLT":"Travel","H":"Travel","WH":"Travel",
    "CCL":"Travel","RCL":"Travel","NCLH":"Travel","WYNN":"Travel","MGM":"Travel",
    "LVS":"Travel","CZR":"Travel","PENN":"Travel","DKNG":"Travel",
    # Media & Entertainment
    "DIS":"Media","CMCSA":"Media","WBD":"Media","PARA":"Media","FOX":"Media",
    "FOXA":"Media","SPOT":"Media","SIRI":"Media","EA":"Media","TTWO":"Media",
    "NYT":"Media","IAC":"Media",
    # Real Estate
    "AMT":"Real Estate","CCI":"Real Estate","SBAC":"Real Estate","PLD":"Real Estate",
    "EQIX":"Real Estate","DLR":"Real Estate","SPG":"Real Estate","MAC":"Real Estate",
    "SKT":"Real Estate","KIM":"Real Estate","REG":"Real Estate","O":"Real Estate",
    "NNN":"Real Estate","STAG":"Real Estate","VICI":"Real Estate","MPW":"Real Estate",
    "AVB":"Real Estate","EQR":"Real Estate","PSA":"Real Estate","EXR":"Real Estate",
    "WELL":"Real Estate","VTR":"Real Estate",
    # Industrials
    "BA":"Industrials","LMT":"Industrials","RTX":"Industrials","NOC":"Industrials",
    "GD":"Industrials","HII":"Industrials","TDG":"Industrials","HEI":"Industrials",
    "KTOS":"Industrials","CAT":"Industrials","DE":"Industrials","CMI":"Industrials",
    "PH":"Industrials","ETN":"Industrials","ROK":"Industrials","EMR":"Industrials",
    "ITW":"Industrials","GE":"Industrials","HON":"Industrials","MMM":"Industrials",
    "UPS":"Industrials","FDX":"Industrials","CHRW":"Industrials","XPO":"Industrials",
    "ODFL":"Industrials","SAIA":"Industrials","JBHT":"Industrials","CSX":"Industrials",
    "NSC":"Industrials","UNP":"Industrials","CP":"Industrials","CNI":"Industrials",
    # Utilities
    "DUK":"Utilities","SO":"Utilities","D":"Utilities","AEP":"Utilities",
    "EXC":"Utilities","SRE":"Utilities","PCG":"Utilities","XEL":"Utilities",
    "WEC":"Utilities","ES":"Utilities","ETR":"Utilities","FE":"Utilities","PPL":"Utilities",
    # Telecom
    "T":"Telecom","VZ":"Telecom","TMUS":"Telecom","LUMN":"Telecom","ATUS":"Telecom",
    # Materials
    "LIN":"Materials","APD":"Materials","ECL":"Materials","SHW":"Materials",
    "PPG":"Materials","NEM":"Materials","FCX":"Materials","AA":"Materials",
    "X":"Materials","NUE":"Materials","CLF":"Materials","MP":"Materials",
    "VALE":"Materials","RIO":"Materials","BHP":"Materials",
    # Auto
    "F":"Auto","GM":"Auto","RIVN":"Auto","LCID":"Auto","NIO":"Auto",
    "LI":"Auto","XPEV":"Auto","TM":"Auto","HMC":"Auto","STLA":"Auto",
    # Meme / High-interest
    "GME":"Retail","AMC":"Media","BB":"Technology","NOK":"Technology",
    "SOFI":"Finance","SPCE":"Technology","OPEN":"Real Estate","RKT":"Finance",
    "UWMC":"Finance","PLNT":"Health & Fitness","GRMN":"Health & Fitness",
    "PTON":"Health & Fitness","XPOF":"Health & Fitness",
}


def _get_index():
    return [
        {"ticker": t, "name": t, "sector": SECTOR_MAP.get(t, "Unknown")}
        for t in STOCK_UNIVERSE
    ]


# ---------------------------------------------------------------------------
# GET /api/search?q=apple&limit=5
# Returns stocks matching the query by name or ticker prefix.
# Fast — always served from cache after first build.
# ---------------------------------------------------------------------------

@search_bp.route("/search")
def search():
    q = request.args.get("q", "").strip().lower()
    limit = min(int(request.args.get("limit", 5)), 20)

    if not q:
        return jsonify([])

    try:
        index = _get_index()
    except Exception as e:
        # Fallback: return results from the static sector map if yfinance fails
        index = [
            {"ticker": t, "name": t, "sector": SECTOR_MAP.get(t, "Unknown")}
            for t in STOCK_UNIVERSE
        ]

    results = []
    seen = set()
    for item in index:
        ticker = item["ticker"].lower()
        name   = item["name"].lower()
        # Ticker prefix match scores higher than name match
        if ticker.startswith(q) or name.startswith(q):
            results.insert(0, item)
            seen.add(item["ticker"].upper())
        elif q in ticker or q in name:
            results.append(item)
            seen.add(item["ticker"].upper())

        if len(results) >= limit:
            break

    # ── yfinance fallback: if local index had no/few matches, hit the full
    #    Yahoo Finance search API. Catches anything not in STOCK_UNIVERSE
    #    (e.g. GOLD, GLDM, small-caps, international tickers).
    if len(results) < limit:
        try:
            yf_results = yf.Search(q, max_results=limit * 2).quotes
            for item in yf_results:
                symbol = (item.get("symbol") or "").upper()
                if not symbol or symbol in seen:
                    continue
                # Skip non-equity types that clutter results
                quote_type = (item.get("quoteType") or "").upper()
                if quote_type in ("FUTURE", "INDEX", "CURRENCY", "CRYPTOCURRENCY"):
                    continue
                results.append({
                    "ticker": symbol,
                    "name":   item.get("longname") or item.get("shortname") or symbol,
                    "sector": SECTOR_MAP.get(symbol, item.get("sector", "Unknown")),
                })
                seen.add(symbol)
                if len(results) >= limit:
                    break
        except Exception:
            pass  # yfinance search failed — return local results as-is

    return jsonify(results[:limit])


# ---------------------------------------------------------------------------
# GET /api/search/index
# Full stock universe with name + sector — downloaded once, cached 1hr.
# The frontend can cache this locally and do instant client-side filtering.
# ---------------------------------------------------------------------------

@search_bp.route("/search/index")
def search_index():
    try:
        index = _get_index()

        # Patch any missing sectors from our static map
        for item in index:
            if item.get("sector") in (None, "", "Unknown"):
                item["sector"] = SECTOR_MAP.get(item["ticker"], "Unknown")

        return jsonify(index)
    except Exception as e:
        # Hard fallback — return static list so the frontend never breaks
        fallback = [
            {"ticker": t, "name": t, "sector": SECTOR_MAP.get(t, "Unknown")}
            for t in STOCK_UNIVERSE
        ]
        return jsonify(fallback)
