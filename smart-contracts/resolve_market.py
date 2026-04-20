import os
from dotenv import load_dotenv
from algosdk.v2client import algod
from algosdk import mnemonic
from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner
from algosdk.abi import Method

load_dotenv()

# Setup Algod client for TestNet
algod_client = algod.AlgodClient("", "https://testnet-api.algonode.cloud")

# Load Admin Wallet
private_key = mnemonic.to_private_key(os.getenv("ALGO_MNEMONIC"))
signer = AccountTransactionSigner(private_key)
address = os.getenv("ALGO_ADDRESS")

# Get App ID from .env.contract
app_id_str = os.getenv("VITE_CONTRACT_APP_ID")
if not app_id_str:
    with open(".env.contract", "r") as f:
        for line in f:
            if line.startswith("VITE_CONTRACT_APP_ID="):
                app_id_str = line.split("=")[1].strip()
app_id = int(app_id_str)

# Method Signature
method = Method.from_signature("resolve_market(uint64,uint64)void")

# PARAMETERS
market_id = 1        # Resolving Market #1
winning_outcome = 1  # 0 = YES, 1 = NO. We will set NO as the winner!

# Box storage reference needed by the contract
box_name = b"m" + market_id.to_bytes(8, "big")

print(f"Resolving Market {market_id} as outcome: {'YES' if winning_outcome == 0 else 'NO'}...")

sp = algod_client.suggested_params()
atc = AtomicTransactionComposer()
atc.add_method_call(
    app_id=app_id, 
    method=method, 
    sender=address,
    sp=sp, 
    signer=signer, 
    method_args=[market_id, winning_outcome],
    boxes=[(app_id, box_name)],
)

# Send to blockchain
result = atc.execute(algod_client, 4)
print(f"Success! Transaction ID: {result.tx_ids[0]}")
print("The market is now resolved. You can now refresh the UI and claim your winnings!")
