from flask import Blueprint, jsonify #allows file to define routes and return JSON responses
import yfinance as yf

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

    return jsonify({
        "ticker": ticker,
        "dates": [str(date.date()) for date in history.index],
        "prices": [round(float(price), 2) for price in history["Close"]],
        "volumes": [int(volume) for volume in history["Volume"]]
    })