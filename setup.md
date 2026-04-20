# 🚀 PredX Alpha Setup Guide

PredX Alpha is a premium prediction market and trading platform built on the **Algorand Blockchain**. This guide will help you set up the environment and run the application locally.

---

## 📋 Prerequisites

Before you begin, ensure you have the following:

1.  **Node.js & NPM**: Installed on your machine (v18+ recommended).
2.  **Pera Wallet**: Install the [Pera mobile app](https://perawallet.app/) for transaction signing.
3.  **Algorand TestNet ALGOs**: 
    - You need free TestNet tokens to place trades and bets.
    - [Get TestNet ALGO from the Faucet](https://bank.testnet.algorand.network/) by entering your wallet address.

---

## 🛠️ Step 1: Environment Configuration

The application requires a `.env` file in the `frontend` directory to connect to the blockchain and external services.

1.  Navigate to `PredX-Platform/PredX-Platform/frontend/`.
2.  Create a file named `.env` and paste the following:

```env
VITE_ALGOD_NETWORK="testnet"
VITE_ALGOD_SERVER="https://testnet-api.algonode.cloud"
VITE_ALGOD_PORT=""
VITE_ALGOD_TOKEN=""

VITE_INDEXER_SERVER="https://testnet-idx.algonode.cloud"
VITE_INDEXER_PORT=""
VITE_INDEXER_TOKEN=""

VITE_CONTRACT_APP_ID=758035961
```

---

## 📦 Step 2: Installation

Install the project dependencies using NPM.

```bash
cd PredX-Platform/PredX-Platform/frontend
npm install
```

---

## 🏃 Step 3: Run the Application

Start the development server.

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173` (or the port shown in your terminal).

---

## 🧠 Key Platform Features

-   **Algorand TestNet Integration**: All prediction bets and simulated stock/crypto trades are recorded on-chain via the Pera Wallet.
-   **Showcase Valuation (1 ALGO = ₹10,000)**: For demonstration purposes, the platform uses a fixed simulation rate of ₹10,000 per ALGO to calculate trade quantities and portfolio value.
-   **Markets & Screener**: Live data for Indian Stocks (NSE/BSE) and Global Crypto are fetched in real-time.
-   **AI Dashboard**: Features an AI-powered analyzer for portfolio optimization and market sentiment tracking.

---

## 🆘 Troubleshooting

-   **Pera Connection Issues**: If you see "PeraWalletConnect not initialized," refresh the page or try disconnecting and reconnecting your wallet from the top-right button.
-   **Transaction Failures**: Ensure you have at least 1-2 ALGO in your TestNet account to cover network fees.
-   **Data Not Loading**: check your internet connection or verify if the Algorand nodes (Algonode) are operational.

---

**Happy Trading on PredX Alpha!** 🚀
