"""
PredX Deploy Script
1. Compiles the algopy contract via algokit compile python
2. Deploys to Algorand TestNet
3. Funds the contract for box storage MBR
4. Creates 3 initial markets
5. Writes App ID to .env.contract
"""

import subprocess
import time
import base64
import os
from pathlib import Path
from dotenv import dotenv_values
from algosdk.v2client import algod
from algosdk import mnemonic, transaction
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    AccountTransactionSigner,
)
from algosdk.abi import Method
from algosdk import logic

# ── Config ─────────────────────────────────────────────────────────────
env_path = Path(__file__).parent.parent / "frontend" / ".env"
env_vars = dotenv_values(env_path)

ALGOD_URL = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""
DEPLOYER_MNEMONIC = env_vars.get("ALGO_MNEMONIC")
DEPLOYER_ADDRESS = env_vars.get("ALGO_ADDRESS")

if not DEPLOYER_MNEMONIC or not DEPLOYER_ADDRESS:
    raise SystemExit(f"ERROR: Set ALGO_MNEMONIC and ALGO_ADDRESS in {env_path}")

private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
signer = AccountTransactionSigner(private_key)
algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)

# ── Step 1: Compile contract ──────────────────────────────────────────
print("Compiling contract...")
artifacts_dir = Path("contracts/artifacts")
artifacts_dir.mkdir(parents=True, exist_ok=True)

result = subprocess.run(
    ["algokit", "compile", "python", "contracts/prediction_market.py",
     "--out-dir", str(artifacts_dir)],
    capture_output=True, text=True,
)
if result.returncode != 0:
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    raise SystemExit("Compilation failed!")
print("Compilation succeeded.")

# ── Step 2: Read compiled TEAL ────────────────────────────────────────
try:
    approval_teal = next(Path("contracts").rglob("PredictionMarket.approval.teal")).read_text()
    clear_teal = next(Path("contracts").rglob("PredictionMarket.clear.teal")).read_text()
except StopIteration:
    raise SystemExit("ERROR: Compilation succeeded but could not find the generated TEAL files.")

approval_b64 = algod_client.compile(approval_teal)["result"]
clear_b64 = algod_client.compile(clear_teal)["result"]

approval_program = base64.b64decode(approval_b64)
clear_program = base64.b64decode(clear_b64)

# ── Step 3: Deploy (create application) ───────────────────────────────
print("Deploying contract to TestNet...")
sp = algod_client.suggested_params()

create_method = Method.from_signature("create_application()void")

atc = AtomicTransactionComposer()
atc.add_method_call(
    app_id=0,
    method=create_method,
    sender=DEPLOYER_ADDRESS,
    sp=sp,
    signer=signer,
    approval_program=approval_program,
    clear_program=clear_program,
    global_schema=transaction.StateSchema(num_uints=2, num_byte_slices=1),
    local_schema=transaction.StateSchema(num_uints=0, num_byte_slices=0),
    on_complete=transaction.OnComplete.NoOpOC,
)

create_result = atc.execute(algod_client, 4)
tx_id = create_result.tx_ids[0]
tx_info = algod_client.pending_transaction_info(tx_id)
app_id = tx_info["application-index"]
app_address = logic.get_application_address(app_id)

print(f"Deployed! App ID: {app_id}")
print(f"App Address: {app_address}")

# ── Step 4: Fund contract for box storage MBR ─────────────────────────
print("Funding contract with 2 ALGO for box storage MBR...")
sp = algod_client.suggested_params()

fund_txn = transaction.PaymentTxn(
    sender=DEPLOYER_ADDRESS,
    sp=sp,
    receiver=app_address,
    amt=2_000_000,  # 2 ALGO
)
signed_fund = fund_txn.sign(private_key)
algod_client.send_transaction(signed_fund)
transaction.wait_for_confirmation(algod_client, fund_txn.get_txid(), 4)
print("Contract funded.")

# ── Step 5: Create 3 initial markets ──────────────────────────────────
print("Creating initial markets...")
create_market_method = Method.from_signature(
    "create_market(string,uint64,string,string,string)uint64"
)

now = int(time.time())
markets_data = [
    ("Will ALGO reach $0.50 by end of next month?", now + 30 * 86400, "Crypto", "Yes", "No"),
    ("NVIDIA earnings to beat estimates by >15%?",  now + 15 * 86400, "Finance", "Beat >15%", "Miss or <15%"),
    ("Who will win the upcoming European Championship?", now + 90 * 86400, "Sports", "England", "France"),
]

for idx, (title, end_time, category, opt_a, opt_b) in enumerate(markets_data, start=1):
    sp = algod_client.suggested_params()
    # Box reference: prefix "m" + market_id as 8-byte big-endian
    box_name = b"m" + idx.to_bytes(8, "big")

    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=create_market_method,
        sender=DEPLOYER_ADDRESS,
        sp=sp,
        signer=signer,
        method_args=[title, end_time, category, opt_a, opt_b],
        boxes=[(app_id, box_name)],
    )
    result = atc.execute(algod_client, 4)
    print(f"  Market {idx} created: {title[:50]}...")

# ── Step 6: Write App ID to ../frontend/.env ──────────────────────────
import re
env_frontend = Path(__file__).parent.parent / "frontend" / ".env"
if env_frontend.exists():
    content = env_frontend.read_text()
    if "VITE_CONTRACT_APP_ID=" in content:
        content = re.sub(r"VITE_CONTRACT_APP_ID=\d+", f"VITE_CONTRACT_APP_ID={app_id}", content)
    else:
        content += f"\nVITE_CONTRACT_APP_ID={app_id}\n"
    env_frontend.write_text(content)

print()
print("=" * 60)
print(f"CONTRACT APP ID: {app_id}")
print("=" * 60)
print(f"Auto-injected new App ID into {env_frontend.resolve()}")
