from flask import Blueprint, jsonify, request
import os
import requests

news_bp = Blueprint("news", __name__)


@news_bp.route("/news/<ticker>")
def get_stock_news(ticker):
    api_key = os.getenv("FINNHUB_API_KEY")

    if not api_key:
        return jsonify({
            "error": "FINNHUB_API_KEY is missing from backend environment."
        }), 500

    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if not from_date or not to_date:
        return jsonify({
            "error": "Missing from/to date. Use /api/news/AAPL?from=2020-01-01&to=2020-12-31"
        }), 400

    url = "https://finnhub.io/api/v1/company-news"

    try:
        response = requests.get(
            url,
            params={
                "symbol": ticker.upper(),
                "from": from_date,
                "to": to_date,
                "token": api_key,
            },
            timeout=10,
        )

        data = response.json()

        if not response.ok:
            return jsonify({
                "error": "Finnhub request failed",
                "details": data,
            }), response.status_code

        articles = []

        for item in data[:10]:
            articles.append({
                "date": item.get("datetime"),
                "headline": item.get("headline"),
                "source": item.get("source"),
                "summary": item.get("summary"),
                "url": item.get("url"),
            })

        return jsonify({
            "ticker": ticker.upper(),
            "from": from_date,
            "to": to_date,
            "articles": articles,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500