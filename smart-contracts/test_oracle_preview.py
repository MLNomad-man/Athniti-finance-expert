"""
Quick preview of what the oracle will deploy — no blockchain calls.
"""
import sys
import json
from polymarket_oracle import fetch_polymarket_markets, smart_option_labels

def safe(text):
    return text.encode('ascii', errors='replace').decode('ascii')

mkts = fetch_polymarket_markets(10)
print(f"\n{'='*60}")
print(f"ORACLE PREVIEW -- {len(mkts)} markets ready to deploy")
print(f"  All start 50/50. Probabilities shift with user bets only.")
print(f"{'='*60}\n")
for i, m in enumerate(mkts):
    title = m.get("question", m.get("title", "?"))
    outcomes_raw = m.get("outcomes", '["Yes","No"]')
    try:
        outcomes = json.loads(outcomes_raw)
    except Exception:
        outcomes = ["Yes", "No"]
    opt_a, opt_b = smart_option_labels(outcomes, title)
    category = m.get("groupItemTitle", "") or "General"
    print(f"[{i+1:02d}] {safe(title[:72])}")
    print(f"     Options: [{safe(opt_a)}] vs [{safe(opt_b)}]  | Category: {safe(category[:30])}")
    print()
