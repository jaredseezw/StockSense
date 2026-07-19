from flask import Blueprint, jsonify, request
from google import genai
from google.genai import types
import os
import requests
import time
from datetime import datetime

def format_finnhub_date(timestamp):
    try:
        return datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
    except Exception:
        return "Unknown date"

ai_bp = Blueprint("ai", __name__)

# ---------------------------------------------------------------------------
# Quota cooldown — when Gemini returns RESOURCE_EXHAUSTED / 429, don't keep
# hammering it on every message (that just burns more quota and makes the
# user wait for a call that's going to fail anyway). Back off for a bit and
# return the friendly fallback immediately instead.
# ---------------------------------------------------------------------------
_quota_cooldown_until = 0
_QUOTA_COOLDOWN_SECONDS = 90

def _in_quota_cooldown():
    return time.time() < _quota_cooldown_until

def _start_quota_cooldown():
    global _quota_cooldown_until
    _quota_cooldown_until = time.time() + _QUOTA_COOLDOWN_SECONDS


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

    if _in_quota_cooldown():
        fallback = (
            f"You bought {ticker} on {buy_date} at about ${buy_price}. "
            f"By {current_date}, the price was about ${current_price}. "
            f"Your investment of ${investment_amount} became about ${portfolio_value}. "
            f"That means your profit/loss was ${profit_loss}, or {return_percentage}%.\n\n"
            "I'm handling a lot of requests right now, so here's a basic explanation — try again in a moment for the full AI breakdown."
        )
        return jsonify({"reply": fallback})

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
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[grounding_tool],
            ),
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
            _start_quota_cooldown()
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


# ---------------------------------------------------------------------------
# POST /ai/chat
# General-purpose finance/investing tutor chat, used by the AI Assistant tab.
# Keeps a short rolling history so answers stay on-topic and conversational.
# ---------------------------------------------------------------------------

@ai_bp.route("/ai/chat", methods=["POST"])
def ai_chat():
    data = request.get_json() or {}

    message = (data.get("message") or "").strip()
    history = data.get("history") or []   # [{role: "user"|"assistant", text: "..."}]
    level = (data.get("level") or "").strip()  # optional: "beginner" / "intermediate" / "advanced"

    if not message:
        return jsonify({"error": "Message is required"}), 400

    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        return jsonify({
            "reply": (
                "I'm not connected to Gemini yet, so I can't chat right now. "
                "Add a GEMINI_API_KEY to the backend environment to turn me on."
            )
        })

    if _in_quota_cooldown():
        return jsonify({
            "reply": "I'm handling a lot of requests right now — please try again in a moment."
        })

    system_preamble = f"""
        You are StockSense AI, a friendly, encouraging investing and personal-finance tutor
        built into the StockSense app.

        Ground rules:
        - Only discuss investing, the stock market, personal finance concepts, and how to use
          the StockSense app itself. Politely steer other topics back to finance.
        - Explain things in clear, beginner-friendly language with simple analogies.
        - Never give personalized financial advice (e.g. never say "you should buy X" or
          "sell Y now"). Instead explain concepts, trade-offs, and general principles, and
          remind the user this is educational, not financial advice, whenever the topic could
          be read as a recommendation.
        - If the user seems unsure what to ask, suggest 2-3 example questions.
        - Keep answers concise (roughly under 200 words) unless the user asks for more detail.
        - Use **bold** for key terms sparingly, not for whole sentences.
        {"- The user has told you their experience level is: " + level if level else ""}
        """

    convo = system_preamble + "\n\nConversation so far:\n"
    for turn in history[-10:]:
        speaker = "User" if turn.get("role") == "user" else "StockSense AI"
        convo += f"{speaker}: {turn.get('text', '')}\n"
    convo += f"User: {message}\nStockSense AI:"

    try:
        client = genai.Client()

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
            contents=convo,
        )

        return jsonify({"reply": response.text})

    except Exception as e:
        error_message = str(e)

        print("========== GEMINI CHAT ERROR ==========")
        print(error_message)
        print("========================================")

        if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message:
            _start_quota_cooldown()
            return jsonify({
                "reply": "I'm handling a lot of requests right now — please try again in a moment."
            })

        return jsonify({"error": error_message}), 500

# ---------------------------------------------------------------------------
# POST /ai/quiz-generate
# Generates a fresh set of 10 MCQ questions for a given difficulty using
# Gemini, so the Learn page quizzes don't repeat the same static bank every
# time. Falls back gracefully — the frontend uses the static bank if this
# endpoint errors or returns malformed data.
# ---------------------------------------------------------------------------

QUIZ_DIFFICULTY_GUIDANCE = {
    "basic": "absolute beginners — cover core terms like stocks, ETFs, dividends, diversification, risk.",
    "intermediate": "investors comfortable with basics — cover P/E, market cap, EPS, beta, dollar-cost averaging.",
    "advanced": "experienced learners — cover correlation, yield curves, liquidity, growth vs value, expense ratios.",
}


@ai_bp.route("/ai/quiz-generate", methods=["POST"])
def generate_quiz():
    data = request.get_json() or {}
    difficulty = (data.get("difficulty") or "basic").lower()

    if difficulty not in QUIZ_DIFFICULTY_GUIDANCE:
        return jsonify({"error": "difficulty must be basic, intermediate, or advanced"}), 400

    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        return jsonify({"error": "Gemini is not connected — use the static quiz bank instead."}), 503

    if _in_quota_cooldown():
        return jsonify({"error": "AI is busy right now — using the standard quiz bank instead."}), 503

    prompt = f"""
        Generate exactly 10 multiple-choice investing/finance quiz questions for {difficulty} level
        learners: {QUIZ_DIFFICULTY_GUIDANCE[difficulty]}

        Return ONLY a raw JSON array (no markdown fences, no commentary, no leading/trailing text).
        Each element must be an object with exactly these keys:
        - "q": the question text (string)
        - "options": an array of exactly 4 short answer strings
        - "correct": the 0-based index (integer) of the correct option in "options"

        Keep questions factually safe (no specific real-time prices or dates that could be wrong).
        Do not give personalized financial advice in any question or answer.
        """

    try:
        client = genai.Client()

        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
            contents=prompt,
        )

        raw = (response.text or "").strip()

        # Strip ```json fences if the model added them despite instructions
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        import json
        questions = json.loads(raw)

        if not isinstance(questions, list) or len(questions) == 0:
            raise ValueError("Model did not return a question list")

        cleaned = []
        for item in questions:
            q = item.get("q")
            options = item.get("options")
            correct = item.get("correct")

            if (
                isinstance(q, str)
                and isinstance(options, list)
                and len(options) == 4
                and isinstance(correct, int)
                and 0 <= correct < 4
            ):
                cleaned.append({"q": q, "options": options, "correct": correct})

        if len(cleaned) == 0:
            raise ValueError("No valid questions after validation")

        return jsonify({"difficulty": difficulty, "questions": cleaned})

    except Exception as e:
        error_message = str(e)
        if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message:
            _start_quota_cooldown()
        print("========== GEMINI QUIZ ERROR ==========")
        print(error_message)
        print("========================================")
        return jsonify({"error": "Could not generate AI quiz questions right now."}), 500
