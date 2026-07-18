from flask import Blueprint, jsonify, request
from google import genai
from google.genai import types
import os
import requests
from datetime import datetime

def format_finnhub_date(timestamp):
    try:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
    except Exception:
        return "Unknown date"

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/ai/simulator-explain", methods=["POST"])
def explain_simulator():
    data = request.get_json() or {}

    ticker = data.get("ticker", "this stock")
    buy_date = data.get("buyDate")
    current_date = data.get("currentDate")
    buy_price = data.get("buyPrice")
    current_price = data.get("currentPrice")
    investment_amount = data.get("investmentAmount")
    portfolio_value = data.get("portfolioValue")
    profit_loss = data.get("profitLoss")
    return_percentage = data.get("returnPercentage")
    news_items = []

    finnhub_key = os.getenv("FINNHUB_API_KEY")

    if finnhub_key and buy_date and current_date:
        try:
            news_response = requests.get(
                "https://finnhub.io/api/v1/company-news",
                params={
                    "symbol": ticker.upper(),
                    "from": buy_date,
                    "to": current_date,
                    "token": finnhub_key,
                },
                timeout=10,
            )

            if news_response.ok:
                raw_news = news_response.json()
                news_items = raw_news[:8]
        except Exception as news_error:
            print(f"News fetch failed: {news_error}")

    news_text = ""

    if news_items:
        news_text = "\nRetrieved news headlines:\n"

        for item in news_items:
            article_date = format_finnhub_date(item.get("datetime"))

            news_text += (
                f"- {article_date}: {item.get('headline')} "
                f"Source: {item.get('source')}. "
                f"Summary: {item.get('summary')}\n"
            )
    else:
        news_text = (
            "\nNo external news articles were retrieved from the free news API for this period. "
            "Use general historical market knowledge and clearly state that the event explanation is an inference.\n"
        )

    # Fallback if Gemini key is missing
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        fallback = (
            f"You bought {ticker} on {buy_date} at about ${buy_price}. "
            f"By {current_date}, the price was about ${current_price}. "
            f"Your investment of ${investment_amount} became about ${portfolio_value}, "
            f"for a profit/loss of ${profit_loss}, or {return_percentage}%.\n\n"
            "Gemini is not connected yet, so this is a basic explanation. "
            "Add GEMINI_API_KEY in Render to enable AI explanations."
        )

        return jsonify({
            "reply": fallback
        })

    try:
        client = genai.Client()

        prompt = f"""
            You are StockSense AI, a beginner-friendly stock investing tutor.

            The user is using a historical stock simulator.

            Simulator data:
            - Ticker: {ticker}
            - Buy date: {buy_date}
            - Buy price: ${buy_price}
            - Current date after scrubbing: {current_date}
            - Current price: ${current_price}
            - Original investment amount: ${investment_amount}
            - Portfolio value now: ${portfolio_value}
            - Profit / loss: ${profit_loss}
            - Return percentage: {return_percentage}%
            - News items: {news_text}

            Task:
            Explain the user's simulator result clearly.

            Use TWO sources of context:
            1. The retrieved news headlines below, if available. These headlines usually cover only the recent/free-news portion of the selected period.
            2. Your general historical market knowledge for the rest of the period.

            {news_text}

            When explaining likely drivers:
            - Mention specific months or years where possible.
            - If a retrieved news headline has a date, include that date.
            - Separate "news-backed events" from "broader historical context" when useful.
            - Do not pretend you performed live Google Search.
            - Do not invent exact headlines that were not provided.
            - If no useful news articles are provided, say the event explanation is based on general historical context and inference.

            Explain:
            1. What happened to the investment.
            2. Whether the user gained or lost money.
            3. The most likely major events or themes that may have driven the move.
            4. Clearly say when something is an inference rather than a guaranteed cause.
            5. Do not claim perfect causation.
            6. Do not invent headlines.
            7. Keep it beginner-friendly.
            8. Keep it under 300 words.
            9. End with one learning point.
            10. Give some financial advice.

            Response format:
            - Start with a 1-paragraph investment result summary.
            - Then include 2 to 5 bullet points titled "Possible drivers".
            - Each driver should include a month/year or date where possible.
            - End with one learning point, then financial advice for future investments on this stock.

            Important:
            If exact news is unclear, say "A likely driver was..." or "This may have been linked to...".
            """
        
        grounding_tool = types.Tool(
            google_search=types.GoogleSearch()
        )

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
            contents=prompt
        )

        return jsonify({
            "reply": response.text
        })

    except Exception as e:
        error_message = str(e)

        print("========== GEMINI ERROR ==========")
        print(error_message)
        print("==================================")

        if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message:
            fallback = (
                f"You bought {ticker} on {buy_date} at about ${buy_price}. "
                f"By {current_date}, the price was about ${current_price}. "
                f"Your investment of ${investment_amount} became about ${portfolio_value}. "
                f"That means your profit/loss was ${profit_loss}, or {return_percentage}%.\n\n"
                "I could not access the full AI/news explanation right now, so this is a basic explanation.  "
                "Learning point: when a stock price rises after your buy date, your portfolio value increases; "
                "when it falls, your portfolio value decreases."
            )

            return jsonify({"reply": fallback})

        return jsonify({"error": error_message}), 500