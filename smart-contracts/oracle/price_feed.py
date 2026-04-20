"""
PredX Oracle — Price Feed Demo
Fetches live ALGO/USD and BTC/USD prices from CoinGecko public API.
No API key required. Run manually to demonstrate the oracle concept.
"""

import requests
import sys

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"


def fetch_prices() -> dict:
    """Fetch ALGO and BTC prices from CoinGecko."""
    params = {
        "ids": "algorand,bitcoin",
        "vs_currencies": "usd",
    }
    resp = requests.get(COINGECKO_URL, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def main():
    print("PredX Oracle — Price Feed")
    print("=" * 40)
    try:
        data = fetch_prices()
        algo_price = data["algorand"]["usd"]
        btc_price = data["bitcoin"]["usd"]
        print(f"ALGO/USD:  ${algo_price:.4f}")
        print(f"BTC/USD:   ${btc_price:,.2f}")
        print()
        print("These prices can be used to resolve")
        print("crypto prediction markets on-chain.")
    except requests.RequestException as e:
        print(f"Error fetching prices: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
