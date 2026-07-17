from flask import Blueprint, jsonify, request
from google import genai
from google.genai import types
import os

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

            Task:
            Use Google Search to look for major company-specific, sector, macro, or market events involving {ticker} between {buy_date} and {current_date}. Focus especially on events close to large price moves.

            Explain:
            1. What happened to the investment.
            2. Whether the user gained or lost money.
            3. The most likely major events or themes that may have driven the move.
            4. Clearly say when something is an inference rather than a guaranteed cause.
            5. Do not claim perfect causation.
            6. Do not invent headlines.
            7. Keep it beginner-friendly.
            8. Keep it under 250 words.
            9. End with one learning point.
            10. Do not give financial advice.

            Important:
            If exact news is unclear, say "A likely driver was..." or "This may have been linked to...".
            """

        grounding_tool = types.Tool(
            google_search=types.GoogleSearch()
        )

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[grounding_tool]
            )
        )

        return jsonify({
            "reply": response.text
        })

    except Exception as e:
        error_message = str(e)

        if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message:
            fallback = (
                f"You bought {ticker} on {buy_date} at about ${buy_price}. "
                f"By {current_date}, the price was about ${current_price}. "
                f"Your investment of ${investment_amount} became about ${portfolio_value}. "
                f"That means your profit/loss was ${profit_loss}, or {return_percentage}%.\n\n"
                "AI explanation quota is temporarily unavailable, so this is a basic explanation. "
                "Learning point: when a stock price rises after your buy date, your portfolio value increases; "
                "when it falls, your portfolio value decreases."
            )

            return jsonify({"reply": fallback})

        return jsonify({"error": error_message}), 500