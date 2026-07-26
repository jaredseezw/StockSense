import pytest
from utils.simulator_math import (
    calculate_shares_bought,
    calculate_portfolio_value,
    calculate_profit_loss,
    calculate_return_percentage,
)


def test_calculate_shares_bought():
    shares = calculate_shares_bought(10000, 250)
    assert shares == 40


def test_calculate_portfolio_value():
    value = calculate_portfolio_value(40, 300)
    assert value == 12000


def test_calculate_profit_loss_positive():
    profit_loss = calculate_profit_loss(12000, 10000)
    assert profit_loss == 2000


def test_calculate_return_percentage_positive():
    return_percentage = calculate_return_percentage(2000, 10000)
    assert return_percentage == 20


def test_calculate_shares_bought_invalid_price():
    with pytest.raises(ValueError):
        calculate_shares_bought(10000, 0)


def test_calculate_return_percentage_invalid_investment():
    with pytest.raises(ValueError):
        calculate_return_percentage(1000, 0)