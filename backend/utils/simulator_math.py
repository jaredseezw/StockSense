def calculate_shares_bought(investment_amount, buy_price):
    if buy_price <= 0:
        raise ValueError("Buy price must be greater than zero")

    return investment_amount / buy_price


def calculate_portfolio_value(shares_bought, current_price):
    return shares_bought * current_price


def calculate_profit_loss(portfolio_value, investment_amount):
    return portfolio_value - investment_amount


def calculate_return_percentage(profit_loss, investment_amount):
    if investment_amount <= 0:
        raise ValueError("Investment amount must be greater than zero")

    return (profit_loss / investment_amount) * 100
