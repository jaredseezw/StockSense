from flask import Blueprint, jsonify
import yfinance as yf
import math

simulation_bp = Blueprint("simulation", __name__)


@simulation_bp.route("/simulation/history/<ticker>")
def get_simulation_history(ticker):
    ticker = ticker.upper().strip()

    stock = yf.Ticker(ticker)
    history = stock.history(period="10y", interval="1d")

    if history.empty:
        return jsonify({
            "error": "No historical data found for this ticker"
        }), 404

    dates = []
    prices = []
    volumes = []

    for date, row in history.iterrows():
        close_price = row.get("Close")
        volume = row.get("Volume")

        if close_price is None:
            continue

        close_price = float(close_price)

        if math.isnan(close_price):
            continue

        if volume is None:
            volume = 0
        else:
            volume = float(volume)

            if math.isnan(volume):
                volume = 0

        dates.append(str(date.date()))
        prices.append(round(close_price, 2))
        volumes.append(int(volume))

    if len(prices) == 0:
        return jsonify({
            "error": "No valid historical prices found for this ticker"
        }), 404

    return jsonify({
        "ticker": ticker,
        "dates": dates,
        "prices": prices,
        "volumes": volumes
    })