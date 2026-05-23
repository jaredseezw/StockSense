from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)  # Create Flask backend
CORS(app)  # Allow React frontend to call this backend

@app.route("/")  # Creates a route backend can respond to
def home():  # Define function called home
    return jsonify({
        "message": "StockSense backend is running"
    })  # Test to ensure backend is alive

@app.route("/api/stock/<ticker>")  # Dynamic route for AAPL, TSLA, MSFT, etc.
def get_stock(ticker):  # Takes in ticker input from the URL
    stock = yf.Ticker(ticker)  # Creates a yfinance stock object
    history = stock.history(period="1mo")  # Gets 1 month of historical stock data

    if history.empty:  # Checks whether yfinance returned no data
        return jsonify({
            "error": "No data found for this ticker"
        }), 404

    latest_price = history["Close"].iloc[-1]  # Take the Close price column, then the last row

    return jsonify({
        "ticker": ticker.upper(),
        "latest_price": round(float(latest_price), 2),
        "dates": [str(date.date()) for date in history.index],
        "prices": [round(float(price), 2) for price in history["Close"]]
    })

if __name__ == "__main__":  # Checks whether file is run directly
    app.run(debug=True)  # Starts Flask backend server