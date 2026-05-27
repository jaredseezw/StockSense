"""
StockSense Backend
==================
Flask API that powers the StockSense frontend.
Data source: yfinance (free, no API key needed)
Caching: in-memory with TTL to avoid hammering Yahoo Finance

Run locally:
    pip install -r requirements.txt
    python app.py

Deploy (Railway / Render / Fly.io):
    Set PORT env var — the app reads it automatically.
"""

import os
from flask import Flask
from flask_cors import CORS

from routes.stocks import stocks_bp
from routes.market import market_bp
from routes.search import search_bp

app = Flask(__name__)

# Allow requests from your React dev server and production domain.
# Update ALLOWED_ORIGINS in .env when you deploy.
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173"
).split(",")

CORS(app, origins=allowed_origins)

# Register route blueprints
app.register_blueprint(stocks_bp, url_prefix="/api")
app.register_blueprint(market_bp, url_prefix="/api")
app.register_blueprint(search_bp, url_prefix="/api")


@app.route("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    print(f"StockSense backend starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)