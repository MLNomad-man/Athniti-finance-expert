# PredX — Decentralized Prediction & Trading Platform

PredX is a comprehensive decentralized finance (DeFi) platform built on the **Algorand TestNet**. It combines binary prediction markets (betting), real-time stock and crypto trading (simulated), AI-driven market analysis using Google Gemini, and automated NFT minting via IPFS/Pinata.

## 🚀 Key Features

-   **Prediction Markets**: Browse and place binary bets (YES/NO) on real-world events. Markets are powered by ARC-4 smart contracts and decentralized oracle scripts.
-   **Trading Terminal**: Execute high-speed trades with real-time charting for Indian stocks (NSE/BSE) and top cryptocurrencies, using ALGO as the base currency.
-   **AI Market Analyzer**: Integrated Google Gemini AI providing market sentiment, portfolio suggestions, and real-time risk alerts.
-   **NFT Minting (ARC-3)**: Automated NFT minting from images. Upload metadata to Pinata IPFS and record the creation on the Algorand blockchain.
-   **Live Support**: Instant platform help via the integrated ElevenLabs ConvAI voice assistant.
-   **Wallet Integration**: Full support for Pera Wallet with high-validity transaction signing (1000-round window).

---

## 📂 Repository Structure

-   `/smart-contracts` — Python smart contract logic (`polymarket_oracle.py`), deployment scripts (`deploy.py`), and market resolve tools.
-   `/frontend` — Modern React 18 frontend with Vite, Tailwind CSS, and Algorand SDKs.

---

## 🛠️ Setup & Requirements

### Prerequisites

-   **Node.js** (v18+) & `npm`
-   **Python** (v3.10+) & `pip`
-   **Pera Wallet App** (TestNet account with some ALGO from the [faucet](https://bank.testnet.algorand.network/))
-   **Pinata JWT** (Optional, for NFT features)
-   **Gemini API Key** (Optional, for AI analysis features)

### 1. Smart Contract Deployment

```bash
cd smart-contracts
pip install -r requirements.txt

# Copy template and add your credentials
cp .env.template .env

# Deploy the contract
python deploy.py
# (Note the Application ID output to your console)
```

### 2. Frontend Configuration

```bash
cd frontend
npm install

# Copy template and add your App ID + API keys
cp .env.template .env

# Run development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 🏗️ Technical Architecture

-   **Algorand SDK**: `@algorandfoundation/algokit-utils` for contract management.
-   **IPFS**: [Pinata](https://pinata.cloud/) for decentralized storage of NFT media.
-   **AI Engine**: Google Gemini Pro (via REST API).
-   **Voice Assistant**: ElevenLabs ConvAI (integrated globally via root HTML).
-   **Real-time Data**: Yahoo Finance (stocks) and CoinGecko (oracle prices).

## 📄 License & Terms

This project is built for evaluation and hackathon purposes on the test network. All ALGO used has no real-world value.
