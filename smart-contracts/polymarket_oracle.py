"""
Polymarket Oracle Web3 Bridge
Scrapes Gamma-API and mirrors live Prediction Markets onto the Algorand Smart Contract.
Probabilities are 50/50 by default — they shift ONLY based on user bets on PredX.
"""

import urllib.request
import json
import base64
import time
import datetime
import re
from pathlib import Path
from dotenv import dotenv_values
from algosdk.v2client import algod
from algosdk import mnemonic, transaction
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
    TransactionWithSigner
)
from algosdk.abi import Method
from algosdk import logic

def safe_print(*args, **kwargs):
    """Print that survives Windows CP1252 encoding for special unicode characters."""
    import sys
    msg = ' '.join(str(a) for a in args)
    try:
        print(msg, **kwargs)
    except UnicodeEncodeError:
        print(msg.encode('ascii', errors='replace').decode('ascii'), **kwargs)

# ── Config ─────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / "frontend" / ".env"
env_vars = dotenv_values(env_path)

ALGOD_URL = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

DEPLOYER_MNEMONIC = env_vars.get("ALGO_MNEMONIC")
DEPLOYER_ADDRESS = env_vars.get("ALGO_ADDRESS")
APP_ID = int(env_vars.get("VITE_CONTRACT_APP_ID", 0))

if not DEPLOYER_MNEMONIC or not APP_ID:
    raise SystemExit("ERROR: VITE_CONTRACT_APP_ID and ALGO_MNEMONIC missing from frontend/.env")

private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
signer = AccountTransactionSigner(private_key)
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)

# ── Helpers ─────────────────────────────────────────────────────────────

def get_market_count(app_id):
    """Read global state of contract to find the current market count."""
    app_info = algod_client.application_info(app_id)
    global_state = app_info["params"].get("global-state", [])
    target_key = base64.b64encode(b"market_count").decode('utf-8')
    for kv in global_state:
        if kv["key"] == target_key:
            return kv["value"]["uint"]
    return 0

def get_existing_market_titles(app_id, count):
    """Fetch titles of already-deployed markets to avoid duplicates."""
    from algosdk.abi import ABIType
    market_type = ABIType.from_string("(string,string,uint64,string,string,uint64,uint64,uint64,uint64)")
    titles = set()
    idx_url = f"https://testnet-idx.algonode.cloud/v2/applications/{app_id}/boxes"
    try:
        req = urllib.request.Request(idx_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            boxes = json.loads(resp.read().decode()).get("boxes", [])
        for box in boxes:
            name_b = base64.b64decode(box["name"])
            if len(name_b) == 9 and name_b[0:1] == b"m":
                box_name_b64 = base64.b64encode(name_b).decode()
                detail_url = f"https://testnet-idx.algonode.cloud/v2/applications/{app_id}/box?name=b64:{box_name_b64}"
                try:
                    req2 = urllib.request.Request(detail_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req2, timeout=10) as resp2:
                        box_data = json.loads(resp2.read().decode())
                    value_bytes = base64.b64decode(box_data["value"])
                    decoded = market_type.decode(value_bytes)
                    titles.add(decoded[0].strip().lower()[:60])
                except Exception:
                    pass
    except Exception:
        pass
    return titles

def is_yes_no_question(title: str) -> bool:
    """Determine if a market title is a genuine Yes/No binary question."""
    yes_no_starters = [
        r'^will\b', r'^can\b', r'^does\b', r'^did\b', r'^has\b', r'^have\b',
        r'^is\b', r'^are\b', r'^was\b', r'^were\b', r'^do\b', r'^could\b',
        r'^would\b', r'^should\b',
    ]
    for pattern in yes_no_starters:
        if re.search(pattern, title.strip(), re.IGNORECASE):
            return True
    if title.strip().endswith('?') and re.search(r'\?$', title):
        # Titles ending with "?" after a conditional clause
        if re.search(r'\b(win|make|reach|hit|pass|fail|happen|occur|result|sign|approve|beat|lose|end|start|launch|remain|stay|become|break|hold|fall|rise|drop|close|open|cross)\b', title, re.IGNORECASE):
            return True
    return False

def smart_option_labels(outcomes: list, title: str) -> tuple:
    """
    Given a list of 2 outcome strings and the market title,
    return (option_a, option_b) with the most sensible labels.
    - If outcomes are ['Yes', 'No'] or similar, return them.
    - Otherwise return the actual candidate/team names.
    """
    a_raw, b_raw = outcomes[0].strip(), outcomes[1].strip()
    
    # Normalize case for yes/no detection
    if a_raw.lower() in ("yes", "true", "correct") and b_raw.lower() in ("no", "false", "incorrect"):
        return "Yes", "No"
    if a_raw.lower() in ("no", "false") and b_raw.lower() in ("yes", "true"):
        return "No", "Yes"
    
    # Keep actual names but truncate if very long  
    option_a = a_raw[:30] if len(a_raw) > 30 else a_raw
    option_b = b_raw[:30] if len(b_raw) > 30 else b_raw
    return option_a, option_b

def fetch_polymarket_markets(limit=10):
    """
    Fetch binary prediction markets from Gamma API.
    Accepts any 2-outcome market — uses actual outcome names (not forced Yes/No).
    Filters out junk markets (O/U lines, by-date templates, etc.)
    """
    fetch_count = limit * 6
    url = f"https://gamma-api.polymarket.com/markets?limit={fetch_count}&active=true&closed=false&order=volume&ascending=false"
    print(f"Fetching from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode())

    valid_markets = []
    seen_titles = set()

    for mkt in data:
        # Must have exactly 2 outcomes
        outcomes_str = mkt.get("outcomes", '[]')
        try:
            outcomes = json.loads(outcomes_str)
        except Exception:
            continue
        if len(outcomes) != 2:
            continue

        question = mkt.get("question", "").strip()
        if not question or len(question) < 10:
            continue

        # Skip O/U (over/under) sports lines
        if re.search(r'\bO\/U\b|\bover\/under\b', question, re.IGNORECASE):
            continue

        # Skip sports spread / handicap lines (e.g. "Spread: X (-1.5)" or "Handicap: X (+1.5)")
        if re.search(r'^(spread|handicap|game\s+handicap|map\s+\d+\s+handicap|puck\s+line|run\s+line)\s*:', question, re.IGNORECASE):
            continue

        # Skip toss / coin-toss match results
        if re.search(r'\btoss\b', question, re.IGNORECASE):
            continue

        # Skip esports map-level prop bets ("Map 2: Total Kills")
        if re.search(r'^map\s+\d+\s*:', question, re.IGNORECASE):
            continue

        # Skip date-based fill-in templates like "X by ___?"
        if re.search(r'by\s+___', question, re.IGNORECASE):
            continue

        # Skip weather temperature markets
        if re.search(r'\d+°[CF]\b', question, re.IGNORECASE):
            continue

        # Deduplicate by normalized title prefix
        title_key = question.lower().strip()[:50]
        if title_key in seen_titles:
            continue
        seen_titles.add(title_key)

        valid_markets.append(mkt)
        if len(valid_markets) >= limit:
            break

    print(f"Found {len(valid_markets)} valid binary markets out of {len(data)} total")
    return valid_markets


def main():
    safe_print("=" * 60)
    safe_print("POLYMARKET ORACLE BRIDGE STARTED")
    safe_print(f"Target App ID: {APP_ID}")
    safe_print("=" * 60)

    poly_markets = fetch_polymarket_markets(10)

    if not poly_markets:
        safe_print("No active markets found from API.")
        return

    # Get existing market count and titles to avoid re-deploying
    current_count = get_market_count(APP_ID)
    safe_print(f"\nCurrent on-chain market count: {current_count}")
    safe_print("Fetching existing market titles to skip duplicates...")
    existing_titles = get_existing_market_titles(APP_ID, current_count)
    safe_print(f"  -> {len(existing_titles)} existing titles indexed\n")

    create_market_method = Method.from_signature("create_market(string,uint64,string,string,string)uint64")

    for i, mkt in enumerate(poly_markets):
        title = mkt.get("question", mkt.get("title", "Unknown")).strip()

        # Check for duplicates
        title_key = title.lower().strip()[:60]
        if title_key in existing_titles:
            safe_print(f"[{i+1}/{len(poly_markets)}] Skipping (already exists): {title[:60]}...")
            continue

        # Extract category
        category = "General"
        group_title = mkt.get("groupItemTitle", "")
        if group_title:
            category = group_title[:40]
        elif "tags" in mkt and mkt["tags"]:
            try:
                tags = json.loads(mkt["tags"]) if isinstance(mkt["tags"], str) else mkt["tags"]
                if tags:
                    category = (tags[0].get("label", tags[0]) if isinstance(tags[0], dict) else str(tags[0]))[:40]
            except Exception:
                pass

        # Parse end date
        end_date_str = mkt.get("endDate", None)
        if end_date_str:
            try:
                end_time = int(datetime.datetime.strptime(end_date_str, "%Y-%m-%dT%H:%M:%SZ").timestamp())
            except Exception:
                end_time = int(time.time()) + (30 * 86400)
        else:
            end_time = int(time.time()) + (30 * 86400)
        end_time = max(end_time, int(time.time()) + 86400)

        # Determine option labels from actual Polymarket outcome names
        outcomes_str = mkt.get("outcomes", '["Yes","No"]')
        try:
            outcomes = json.loads(outcomes_str)
        except Exception:
            outcomes = ["Yes", "No"]
        option_a, option_b = smart_option_labels(outcomes, title)

        safe_print(f"\n[{i+1}/{len(poly_markets)}] Deploying:")
        safe_print(f"  Title   : {title[:70]}")
        safe_print(f"  Category: {category}")
        safe_print(f"  Options : {option_a} vs {option_b}")

        market_count = get_market_count(APP_ID)
        next_id = market_count + 1
        safe_print(f"  ID      : #{next_id}")

        sp = algod_client.suggested_params()
        box_name_market = b"m" + next_id.to_bytes(8, "big")

        atc = AtomicTransactionComposer()
        atc.add_method_call(
            app_id=APP_ID,
            method=create_market_method,
            sender=DEPLOYER_ADDRESS,
            sp=sp,
            signer=signer,
            method_args=[title, end_time, category, option_a, option_b],
            boxes=[(APP_ID, box_name_market)],
        )

        try:
            result = atc.execute(algod_client, 4)
            safe_print(f"  ✅ Created (TXID: {result.tx_ids[0]})")
            existing_titles.add(title_key)
        except Exception as e:
            safe_print(f"  ❌ Failed: {e}")

        time.sleep(1.5)

    safe_print("\nOracle sync complete. Probabilities start 50/50 -- they shift with user bets!")


if __name__ == "__main__":
    main()
