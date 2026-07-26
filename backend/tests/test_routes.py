import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_health_route(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_simulation_history_route_valid_ticker(client):
    response = client.get("/api/simulation/history/AAPL")
    assert response.status_code == 200

    data = response.get_json()
    assert "ticker" in data
    assert "dates" in data
    assert "prices" in data
    assert data["ticker"] == "AAPL"
    assert len(data["dates"]) > 0
    assert len(data["prices"]) > 0


def test_simulation_history_route_invalid_ticker(client):
    response = client.get("/api/simulation/history/INVALIDTICKER123")
    assert response.status_code in [400, 404, 500]

    data = response.get_json()
    assert "error" in data


def test_ai_simulator_explain_route_returns_reply(client):
    payload = {
        "ticker": "AAPL",
        "buyDate": "2020-01-01",
        "currentDate": "2021-01-01",
        "buyPrice": "75.00",
        "currentPrice": "130.00",
        "investmentAmount": "10000.00",
        "portfolioValue": "17333.33",
        "profitLoss": "7333.33",
        "returnPercentage": "73.33"
    }

    response = client.post("/api/ai/simulator-explain", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert "reply" in data
    assert len(data["reply"]) > 0


def test_news_route_missing_dates(client):
    response = client.get("/api/news/AAPL")
    assert response.status_code == 400

    data = response.get_json()
    assert "error" in data