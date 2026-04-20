import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState, useCallback } from 'react'
import SendAlgo from '../components/SendAlgo'
import MintNFT from '../components/MintNFT'
import AssetOptIn from '../components/AssetOptIn'
import Bank from '../components/Bank'
import DashboardLayout from '../components/DashboardLayout'
import { usePredX } from '../context/PredXContext'
import { ellipseAddress } from '../utils/ellipseAddress'
import { useOraclePrice } from '../hooks/useOraclePrice'
import algosdk from 'algosdk'
import BalanceDisplay from '../components/BalanceDisplay'
import { getCryptoPrices, type CryptoTicker } from '../lib/stockApi'
import ExpenseImpactAgent from '../components/ExpenseImpactAgent'

const USD_TO_INR = 85.5

// ─── Gemini AI Analysis ─────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

interface NewsItem {
  title: string
  summary: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  category: string
  impact: 'high' | 'medium' | 'low'
}

interface AIAnalysis {
  marketSummary: string
  opportunities: { asset: string; action: string; reason: string; confidence: number }[]
  riskLevel: string
  allocation: { name: string; percent: number; color: string }[]
}

interface TradePositionRow {
  key: string
  symbol: string
  assetType: 'stock' | 'crypto'
  quantity: number
  investedAlgo: number
  avgEntryInr: number
  trades: number
}

// ─── Static curated news (fallback + always shown) ───────────
const CURATED_NEWS: NewsItem[] = [
  { title: 'Bitcoin Surges Past Key Resistance Level', summary: 'BTC breaks above major resistance as institutional demand increases, ETF inflows hit record highs.', sentiment: 'bullish', category: 'Crypto', impact: 'high' },
  { title: 'Algorand DeFi TVL Reaches New ATH', summary: 'Total Value Locked on Algorand ecosystem surpasses previous records driven by prediction markets and DEX activity.', sentiment: 'bullish', category: 'Algorand', impact: 'high' },
  { title: 'Nifty 50 Consolidates Near 25,000', summary: 'Indian equities remain range-bound as FIIs turn cautious ahead of RBI monetary policy decision.', sentiment: 'neutral', category: 'Indian Markets', impact: 'medium' },
  { title: 'Ethereum Completes Major Network Upgrade', summary: 'The Pectra upgrade introduces blob throughput improvements and account abstraction enhancements.', sentiment: 'bullish', category: 'Crypto', impact: 'high' },
  { title: 'SEC Clarifies Crypto Staking Regulations', summary: 'New regulatory clarity expected to boost institutional participation in proof-of-stake networks.', sentiment: 'bullish', category: 'Regulation', impact: 'medium' },
  { title: 'Reliance Industries Reports Strong Q4', summary: 'Revenue beat analyst estimates driven by Jio Platforms growth and retail expansion across India.', sentiment: 'bullish', category: 'Indian Markets', impact: 'medium' },
  { title: 'Cross-Chain Bridge Exploit Losses Decline', summary: 'Security audit firms report 70% decrease in bridge-related losses compared to last year.', sentiment: 'neutral', category: 'Security', impact: 'low' },
  { title: 'India Proposes Revised Crypto Tax Framework', summary: 'Government considering reducing TDS from 1% to 0.1% on digital asset transactions.', sentiment: 'bullish', category: 'Regulation', impact: 'high' },
]

const Dashboard: React.FC = () => {
  const { activeAddress } = useWallet()
  const { myPositions, myTrades, markets, navigate, isBalanceHidden, toggleBalanceVisibility, themeMode } = usePredX()
  const { algoPrice } = useOraclePrice()
  const [algoBalance, setAlgoBalance] = useState<number>(0)
  const [cryptoPrices, setCryptoPrices] = useState<CryptoTicker[]>([])

  const [sendAlgoModal, setSendAlgoModal] = useState(false)
  const [mintNftModal, setMintNftModal] = useState(false)
  const [assetOptInModal, setAssetOptInModal] = useState(false)
  const [bankModal, setBankModal] = useState(false)

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Fetch ALGO balance
  useEffect(() => {
    if (!activeAddress) return
    const fetchBalance = async () => {
      try {
        const algodClient = new algosdk.Algodv2(
          '',
          import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
          ''
        )
        const info = await algodClient.accountInformation(activeAddress).do()
        setAlgoBalance(Number(info.amount) / 1_000_000)
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      }
    }
    fetchBalance()
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [activeAddress])

  // Fetch crypto prices for overview
  useEffect(() => {
    const fetch_ = async () => {
      const prices = await getCryptoPrices()
      setCryptoPrices(prices)
    }
    fetch_()
    const id = setInterval(fetch_, 30000)
    return () => clearInterval(id)
  }, [])

  const activePredictionsCount = myPositions.filter(p => p.status === 'running').length
  const activeTradesCount = myTrades.length
  const totalActivePositions = activePredictionsCount + activeTradesCount

  const totalWagered = myPositions.reduce((acc, pos) => acc + pos.amount, 0) + myTrades.reduce((acc, t) => acc + t.algoAmount, 0)
  const totalPotential = myPositions.reduce((acc, pos) => acc + (pos.status === 'running' ? pos.potential : 0), 0)
  const usdBalance = algoPrice ? (algoBalance * algoPrice) : 0
  const inrBalance = usdBalance * USD_TO_INR

  const tradePositions = myTrades.reduce<Record<string, TradePositionRow>>((acc, trade) => {
    const key = `${trade.assetType}:${trade.symbol}`
    const entry = acc[key] ?? {
      key,
      symbol: trade.symbol,
      assetType: trade.assetType,
      quantity: 0,
      investedAlgo: 0,
      avgEntryInr: 0,
      trades: 0,
    }

    if (trade.side === 'buy') {
      entry.quantity += trade.quantity
      entry.investedAlgo += trade.algoAmount
      entry.avgEntryInr = entry.quantity > 0
        ? ((entry.avgEntryInr * (entry.quantity - trade.quantity)) + (trade.priceAtTradeINR * trade.quantity)) / entry.quantity
        : 0
    } else {
      entry.quantity -= trade.quantity
      entry.investedAlgo = Math.max(0, entry.investedAlgo - trade.algoAmount)
    }

    entry.trades += 1
    acc[key] = entry
    return acc
  }, {})

  const activeTradePositions = Object.values(tradePositions)
    .filter((position) => position.quantity > 0)
    .sort((a, b) => b.investedAlgo - a.investedAlgo)

  const buildComputedAnalysis = useCallback((): AIAnalysis => {
    const sortedByChange = [...cryptoPrices].sort((a, b) => b.priceChangePercent - a.priceChangePercent)
    const topGainer = sortedByChange[0]
    const topLoser = sortedByChange[sortedByChange.length - 1]
    const avgVolatility = cryptoPrices.length
      ? cryptoPrices.reduce((sum, ticker) => sum + Math.abs(ticker.priceChangePercent), 0) / cryptoPrices.length
      : 0

    const activeMarkets = markets.filter((m) => m.status === 'active')
    const balancedMarkets = activeMarkets.filter((m) => Math.abs(m.probabilityYes - m.probabilityNo) <= 20).length
    const avgMarketAiScore = markets.length
      ? markets.reduce((sum, market) => sum + market.aiScore, 0) / markets.length
      : 70

    const riskLevel: AIAnalysis['riskLevel'] =
      avgVolatility >= 5 ? 'High' : avgVolatility >= 2.5 ? 'Medium' : 'Low'

    const clampConfidence = (value: number) => Math.max(55, Math.min(95, Math.round(value)))
    const btc = cryptoPrices.find((ticker) => ticker.displaySymbol === 'BTC')
    const eth = cryptoPrices.find((ticker) => ticker.displaySymbol === 'ETH')
    const sol = cryptoPrices.find((ticker) => ticker.displaySymbol === 'SOL')

    const reservePercent = riskLevel === 'High' ? 25 : riskLevel === 'Medium' ? 15 : 10
    const predictionPercent = Math.max(18, Math.min(35, 20 + Math.min(activeMarkets.length, 10)))
    const algoHoldingsPercent = Math.max(18, Math.min(35, Math.round(18 + (avgMarketAiScore - 60) / 2)))
    const cryptoTradingPercent = Math.max(10, 100 - reservePercent - predictionPercent - algoHoldingsPercent)
    const normalizedPredictionPercent =
      predictionPercent + (100 - (cryptoTradingPercent + reservePercent + predictionPercent + algoHoldingsPercent))

    return {
      marketSummary:
        cryptoPrices.length > 0
          ? `${topGainer?.name || 'BTC'} leads movers at ${(topGainer?.priceChangePercent || 0).toFixed(2)}% while ${topLoser?.name || 'ETH'} is weakest at ${(topLoser?.priceChangePercent || 0).toFixed(2)}%. On-chain prediction flow is active across ${activeMarkets.length} live markets, with ${balancedMarkets} showing competitive odds. Portfolio posture is tuned for ${riskLevel.toLowerCase()} risk conditions.`
          : `On-chain prediction flow is active across ${activeMarkets.length} live markets, with ${balancedMarkets} showing competitive odds. Portfolio posture is tuned for ${riskLevel.toLowerCase()} risk conditions.`,
      opportunities: [
        {
          asset: 'BTC',
          action: (btc?.priceChangePercent ?? 0) >= 0 ? 'Hold' : 'Buy',
          reason: `24h momentum at ${(btc?.priceChangePercent ?? 0).toFixed(2)}% with strong liquidity.`,
          confidence: clampConfidence(78 + (btc?.priceChangePercent ?? 0) * 1.5),
        },
        {
          asset: 'ETH',
          action: (eth?.priceChangePercent ?? 0) >= 1 ? 'Hold' : 'Buy',
          reason: `Relative strength context at ${(eth?.priceChangePercent ?? 0).toFixed(2)}% over 24h.`,
          confidence: clampConfidence(74 + (eth?.priceChangePercent ?? 0) * 1.2),
        },
        {
          asset: 'SOL',
          action: (sol?.priceChangePercent ?? 0) <= -2 ? 'Buy' : 'Hold',
          reason: `Volatility profile at ${(sol?.priceChangePercent ?? 0).toFixed(2)}% supports tactical positioning.`,
          confidence: clampConfidence(70 + Math.abs(sol?.priceChangePercent ?? 0)),
        },
        {
          asset: 'ALGO',
          action: avgMarketAiScore >= 72 ? 'Buy' : 'Hold',
          reason: `${activeMarkets.length} active on-chain markets with average analyzer score ${avgMarketAiScore.toFixed(0)}.`,
          confidence: clampConfidence(68 + (avgMarketAiScore - 60) * 0.6),
        },
      ],
      riskLevel,
      allocation: [
        { name: 'Crypto Trading', percent: cryptoTradingPercent, color: '#8B5CF6' },
        { name: 'Prediction Markets', percent: normalizedPredictionPercent, color: '#00FFA3' },
        { name: 'ALGO Holdings', percent: algoHoldingsPercent, color: '#3B82F6' },
        { name: 'Reserve', percent: reservePercent, color: '#F59E0B' },
      ],
    }
  }, [cryptoPrices, markets])

  // ─── Arthniti AI Core Analysis ───────────────────────────────
  const runAIAnalysis = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    const computedAnalysis = buildComputedAnalysis()

    const cryptoContext = cryptoPrices
      .slice(0, 6)
      .map(
        (c) =>
          `${c.name} (${c.displaySymbol}): $${c.lastPrice.toFixed(2)}, 24h change: ${c.priceChangePercent.toFixed(2)}%`
      )
      .join('\n')

    const marketContext = markets
      .slice(0, 8)
      .map(
        (m) =>
          `${m.title} | ${m.optionA}: ${m.probabilityYes}% / ${m.optionB}: ${m.probabilityNo}% | Vol: ${m.volume.toFixed(2)} ALGO | Participants: ${m.participants} | AI: ${m.aiScore}`
      )
      .join('\n')

    const portfolioContext = `ALGO Balance: ${algoBalance.toFixed(2)} ALGO ($${usdBalance.toFixed(2)} USD)
Active Positions: ${totalActivePositions}
Total Wagered: ${totalWagered.toFixed(2)} ALGO
Potential Payouts: ${totalPotential.toFixed(2)} ALGO`

    const prompt = `You are Arthniti AI Core, an advanced financial analysis model for a crypto and Indian stock prediction platform on Algorand blockchain.

Current Crypto Data:
${cryptoContext || 'No crypto tickers available'}

Current On-Chain Prediction Market Data:
${marketContext || 'No active markets available'}

User Portfolio:
${portfolioContext}

Provide a JSON response with this exact structure (no markdown, just raw JSON):
{
  "marketSummary": "A 2-3 sentence summary of current market conditions and opportunities",
  "opportunities": [
    {"asset": "BTC", "action": "Buy/Hold/Sell", "reason": "Brief reason", "confidence": 85},
    {"asset": "ETH", "action": "Buy/Hold/Sell", "reason": "Brief reason", "confidence": 75},
    {"asset": "SOL", "action": "Buy/Hold/Sell", "reason": "Brief reason", "confidence": 70},
    {"asset": "ALGO", "action": "Buy/Hold/Sell", "reason": "Brief reason", "confidence": 80}
  ],
  "riskLevel": "Low/Medium/High based on current conditions",
  "allocation": [
    {"name": "Crypto Trading", "percent": 35, "color": "#8B5CF6"},
    {"name": "Prediction Markets", "percent": 25, "color": "#00FFA3"},
    {"name": "ALGO Holdings", "percent": 25, "color": "#3B82F6"},
    {"name": "Reserve", "percent": 15, "color": "#F59E0B"}
  ]
}

Respond ONLY with valid JSON. No additional text.`

    try {
      if (!GEMINI_API_KEY) {
        setAiAnalysis(computedAnalysis)
        return
      }

      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
      })

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(jsonStr) as AIAnalysis

      if (!parsed?.marketSummary || !Array.isArray(parsed?.opportunities) || !Array.isArray(parsed?.allocation)) {
        throw new Error('Gemini response missing required fields')
      }

      setAiAnalysis(parsed)
    } catch (err: any) {
      console.error('AI Analysis failed:', err)
      setAiError(err.message)
      setAiAnalysis(computedAnalysis)
    } finally {
      setAiLoading(false)
    }
  }, [
    cryptoPrices,
    markets,
    algoBalance,
    usdBalance,
    totalActivePositions,
    totalWagered,
    totalPotential,
    buildComputedAnalysis,
  ])

  // Auto-run analysis when data is ready
  useEffect(() => {
    if (cryptoPrices.length > 0 && !aiAnalysis && !aiLoading) {
      runAIAnalysis()
    }
  }, [cryptoPrices, aiAnalysis, aiLoading, runAIAnalysis])

  const sentimentBadge = (s: string) => {
    if (s === 'bullish') return 'bg-emerald-500/15 text-emerald-400'
    if (s === 'bearish') return 'bg-red-500/15 text-red-400'
    return 'bg-amber-500/15 text-amber-400'
  }

  const impactBadge = (i: string) => {
    if (i === 'high') return 'bg-red-500/10 text-red-400'
    if (i === 'medium') return 'bg-amber-500/10 text-amber-400'
    return 'bg-surface-container-highest text-on-surface-variant'
  }

  if (!activeAddress) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-6">account_balance_wallet</span>
          <h2 className="font-headline font-black text-2xl mb-2 text-on-surface">Connect Your Wallet</h2>
          <p className="text-sm text-on-surface-variant text-center max-w-md">
            Connect your Pera Wallet to view your portfolio dashboard, ALGO balance, and active market positions.
          </p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 md:pb-8 pt-4">
        {/* Portfolio Header */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-surface-container-high to-surface-container/50 p-6 md:p-10 rounded-2xl border border-primary-container/10 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-container/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div>
                <p className="text-on-surface-variant text-xs font-label uppercase tracking-widest mb-2">Portfolio Balance</p>
                <h1 className="text-4xl md:text-5xl font-headline font-black text-on-surface leading-tight">
                  <BalanceDisplay value={algoBalance} decimals={2} showIcon />
                  <span className="text-primary-container text-lg ml-2">ALGO</span>
                </h1>
                {algoPrice && !isBalanceHidden && (
                  <div className="flex flex-wrap gap-4 mt-2">
                    <p className="text-on-surface-variant text-sm">≈ ${usdBalance.toFixed(2)} <span className="text-xs opacity-60">USD</span></p>
                    <p className="text-on-surface-variant text-sm">≈ ₹{inrBalance.toFixed(2)} <span className="text-xs opacity-60">INR</span></p>
                  </div>
                )}
              </div>
              <div className="text-left md:text-right">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Wallet</p>
                <p className="font-mono text-sm text-on-surface">{ellipseAddress(activeAddress, 8)}</p>
                <p className="text-[10px] text-primary-container font-bold mt-1 uppercase tracking-widest">Algorand TestNet</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-container p-6 rounded-xl border border-primary-container/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/5 blur-2xl"></div>
            <span className="text-primary-container font-label text-[10px] uppercase tracking-widest">ALGO Balance</span>
            <div className="text-2xl font-headline font-black text-on-surface mt-1">
              <BalanceDisplay value={algoBalance} decimals={4} />
            </div>
            {algoPrice && !isBalanceHidden && (
              <p className="text-[10px] text-on-surface-variant mt-0.5">₹{inrBalance.toFixed(2)} INR</p>
            )}
          </div>
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5">
            <span className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest">Active Positions</span>
            <div className="text-2xl font-headline font-black text-on-surface mt-1">{totalActivePositions}</div>
          </div>
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5">
            <span className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest">Total Wagered</span>
            <div className="text-2xl font-headline font-black text-on-surface mt-1">{totalWagered.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></div>
          </div>
          <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-xl"></div>
            <span className="text-[#00FFA3] font-label text-[10px] uppercase tracking-widest">Potential Payout</span>
            <div className="text-2xl font-headline font-black text-[#00FFA3] mt-1">{totalPotential.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></div>
          </div>
        </section>

        {/* ─── NEW: AI Analysis + News Grid ───────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* ── AI Analyzer Panel ──────────────────────────── */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant/10 bg-gradient-to-r from-purple-500/5 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Arthniti AI Core Analyzer</h3>
                    <p className="text-[10px] text-purple-400 font-bold">Neural Engine v2.0</p>
                  </div>
                </div>
                <button
                  className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                  onClick={runAIAnalysis}
                  disabled={aiLoading}
                >
                  <span className={`material-symbols-outlined text-[14px] ${aiLoading ? 'animate-spin' : ''}`}>{aiLoading ? 'progress_activity' : 'refresh'}</span>
                  {aiLoading ? 'Analyzing...' : 'Refresh'}
                </button>
              </div>

              <div className="p-5 space-y-4">
                {aiLoading && !aiAnalysis ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-on-surface-variant">Analyzing market conditions...</p>
                  </div>
                ) : aiAnalysis ? (
                  <>
                    {/* Market Summary */}
                    <div className="bg-surface-container-highest/30 rounded-lg p-4">
                      <p className="text-sm text-on-surface leading-relaxed">{aiAnalysis.marketSummary}</p>
                    </div>

                    {/* Opportunities */}
                    <div>
                      <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Arthniti Core Suggestions</h4>
                      <div className="space-y-2">
                        {aiAnalysis.opportunities.map((opp, i) => (
                          <div key={i} className="flex items-center justify-between bg-surface-container-highest/20 rounded-lg px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-on-surface">{opp.asset}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                opp.action === 'Buy' ? 'bg-emerald-500/15 text-emerald-400' :
                                opp.action === 'Sell' ? 'bg-red-500/15 text-red-400' :
                                'bg-amber-500/15 text-amber-400'
                              }`}>{opp.action}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-on-surface-variant hidden md:inline">{opp.reason}</span>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
                                style={{
                                  background: `conic-gradient(${opp.confidence >= 80 ? '#00FFA3' : opp.confidence >= 60 ? '#F59E0B' : '#EF4444'} ${opp.confidence}%, transparent 0%)`,
                                }}>
                                <span className="bg-surface-container rounded-full w-6 h-6 flex items-center justify-center text-on-surface">
                                  {opp.confidence}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risk Level */}
                    <div className="flex items-center justify-between bg-surface-container-highest/20 rounded-lg px-3 py-2.5">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Market Risk</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        aiAnalysis.riskLevel === 'Low' ? 'bg-emerald-500/15 text-emerald-400' :
                        aiAnalysis.riskLevel === 'High' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>{aiAnalysis.riskLevel} Risk</span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* ── Resource Allocator ──────────────────────── */}
            {aiAnalysis && (
              <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>donut_large</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">AI Resource Allocator</h3>
                    <p className="text-[10px] text-on-surface-variant">Suggested portfolio allocation</p>
                  </div>
                </div>
                <div className="p-5">
                  {/* Donut Chart with CSS */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="relative w-36 h-36">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        {(() => {
                          let cumulative = 0
                          return aiAnalysis.allocation.map((item, i) => {
                            const offset = cumulative
                            cumulative += item.percent
                            return (
                              <circle
                                key={i}
                                cx="18" cy="18" r="14"
                                fill="none"
                                stroke={item.color}
                                strokeWidth="4"
                                strokeDasharray={`${item.percent * 0.88} ${88 - item.percent * 0.88}`}
                                strokeDashoffset={`${-offset * 0.88}`}
                                strokeLinecap="round"
                                className="transition-all duration-700"
                              />
                            )
                          })
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black font-headline text-on-surface">100%</span>
                        <span className="text-[9px] text-on-surface-variant">Allocated</span>
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="space-y-2">
                    {aiAnalysis.allocation.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-semibold text-on-surface">{item.name}</span>
                        </div>
                        <span className="text-xs font-bold text-on-surface-variant">{item.percent}%</span>
                      </div>
                    ))}
                  </div>
                  {algoBalance > 0 && (
                    <div className="mt-4 border-t border-outline-variant/10 pt-3 space-y-1">
                      {aiAnalysis.allocation.map((item, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-on-surface-variant">{item.name}</span>
                          <span className="font-bold text-on-surface">{(algoBalance * item.percent / 100).toFixed(2)} ALGO</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── News, Opportunities & Agents ───────────────────────── */}
          <div className="lg:col-span-7 space-y-6 flex flex-col">
            <div className="shrink-0">
              <ExpenseImpactAgent />
            </div>
            
            <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden flex-1 flex flex-col">
              <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>newspaper</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Top News & Opportunities</h3>
                    <p className="text-[10px] text-on-surface-variant">Curated market intelligence</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </div>
              </div>
              <div className="divide-y divide-outline-variant/5 overflow-y-auto custom-scrollbar flex-1 lg:max-h-[360px]">
                {CURATED_NEWS.map((news, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-surface-container-highest/10 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-bold text-on-surface leading-snug flex-1">{news.title}</h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${sentimentBadge(news.sentiment)}`}>
                          {news.sentiment}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${impactBadge(news.impact)}`}>
                          {news.impact}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-2">{news.summary}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">{news.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Live Crypto Ticker ──────────────────────────── */}
        {cryptoPrices.length > 0 && (
          <section className="mb-8">
            <h3 className="font-headline font-bold text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
              Live Market Prices
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {cryptoPrices.slice(0, 6).map(c => (
                <div
                  key={c.symbol}
                  className="bg-surface-container p-4 rounded-xl border border-outline-variant/5 hover:border-primary-container/20 transition-all cursor-pointer"
                  onClick={() => navigate('trade', { symbol: c.symbol, assetType: 'crypto' })}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black text-on-surface">{c.displaySymbol}</span>
                    <span className={`text-[9px] font-bold ${c.priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {c.priceChangePercent >= 0 ? '+' : ''}{c.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-lg font-headline font-black text-on-surface">
                    ${c.lastPrice >= 1000 ? c.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : c.lastPrice.toFixed(c.lastPrice >= 1 ? 2 : 4)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Operations Grid */}
        <section className="mb-8">
          <h3 className="font-headline font-bold text-lg md:text-xl mb-6">Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 cursor-pointer hover:border-primary-container/30 transition-all group" onClick={() => setSendAlgoModal(true)}>
              <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container mb-4">
                <span className="material-symbols-outlined">send</span>
              </div>
              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary-container transition-colors">Send ALGO</h4>
              <p className="text-[10px] text-on-surface-variant mt-1">Transfer ALGO to any address</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 cursor-pointer hover:border-primary-container/30 transition-all group" onClick={() => setMintNftModal(true)}>
              <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container mb-4">
                <span className="material-symbols-outlined">palette</span>
              </div>
              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary-container transition-colors">Mint NFT</h4>
              <p className="text-[10px] text-on-surface-variant mt-1">Create ARC-3 NFTs</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 cursor-pointer hover:border-primary-container/30 transition-all group" onClick={() => setAssetOptInModal(true)}>
              <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container mb-4">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary-container transition-colors">Asset Opt-In</h4>
              <p className="text-[10px] text-on-surface-variant mt-1">Opt-in to receive any ASA</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant/5 cursor-pointer hover:border-primary-container/30 transition-all group" onClick={() => setBankModal(true)}>
              <div className="w-10 h-10 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container mb-4">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <h4 className="font-bold text-on-surface text-sm group-hover:text-primary-container transition-colors">Bank Contract</h4>
              <p className="text-[10px] text-on-surface-variant mt-1">Deposit & Withdraw</p>
            </div>
          </div>
        </section>

        {/* Positions Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-lg md:text-xl">My Positions</h3>
            <button onClick={() => navigate('markets')} className="text-primary-container text-xs font-bold hover:underline">
              Explore Markets &rarr;
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-highest/20 flex items-center justify-between">
                <h4 className="font-headline font-bold text-sm md:text-base">Trade Positions</h4>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  {activeTradePositions.length} active
                </span>
              </div>

              {activeTradePositions.length > 0 ? (
                <>
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                    <div className="col-span-3">Asset</div>
                    <div className="col-span-2 text-center">Type</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-2 text-center">Invested</div>
                    <div className="col-span-2 text-center">Avg Entry</div>
                    <div className="col-span-1 text-center">Trades</div>
                  </div>

                  {activeTradePositions.map((position) => (
                    <div
                      key={position.key}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-outline-variant/5 last:border-b-0 hover:bg-surface-container-highest/10 transition-colors cursor-pointer items-center"
                      onClick={() => navigate('trade', { symbol: position.assetType === 'crypto' ? `${position.symbol}USDT` : position.symbol, assetType: position.assetType })}
                    >
                      <div className="md:col-span-3">
                        <p className="font-bold text-sm text-on-surface line-clamp-1">{position.symbol}</p>
                        <p className="text-[10px] text-on-surface-variant">Tracked investment position</p>
                      </div>
                      <div className="md:col-span-2 md:text-center">
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                          position.assetType === 'crypto' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {position.assetType}
                        </span>
                      </div>
                      <div className="md:col-span-2 md:text-center">
                        <span className="font-bold text-sm">{position.quantity.toFixed(position.assetType === 'crypto' ? 6 : 2)}</span>
                      </div>
                      <div className="md:col-span-2 md:text-center">
                        <span className="font-bold text-sm text-primary-container">{position.investedAlgo.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></span>
                      </div>
                      <div className="md:col-span-2 md:text-center">
                        <span className="font-bold text-sm">₹{position.avgEntryInr.toFixed(2)}</span>
                      </div>
                      <div className="md:col-span-1 md:text-center">
                        <span className="font-bold text-[11px] text-on-surface-variant">{position.trades}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">candlestick_chart</span>
                  <p className="text-sm text-on-surface-variant">No trade positions yet.</p>
                </div>
              )}
            </div>

            <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 bg-surface-container-highest/20 flex items-center justify-between">
                <h4 className="font-headline font-bold text-sm md:text-base">Prediction Positions</h4>
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  {myPositions.length} active
                </span>
              </div>

              {myPositions.length > 0 ? (
                <>
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
                    <div className="col-span-5">Market</div>
                    <div className="col-span-2 text-center">Position</div>
                    <div className="col-span-2 text-center">Amount</div>
                    <div className="col-span-2 text-center">Potential</div>
                    <div className="col-span-1 text-center">Status</div>
                  </div>
                  {myPositions.map((pos) => {
                    const market = markets.find(m => m.id === pos.marketId)
                    return (
                      <div 
                        key={pos.id} 
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 border-b border-outline-variant/5 last:border-b-0 hover:bg-surface-container-highest/10 transition-colors cursor-pointer items-center"
                        onClick={() => market && navigate('terminal', { marketId: market.id })}
                      >
                        <div className="md:col-span-5">
                          <p className="font-bold text-sm text-on-surface line-clamp-1">{market?.title || 'Unknown Market'}</p>
                          <p className="text-[10px] text-on-surface-variant">{market?.category || ''}</p>
                        </div>
                        <div className="md:col-span-2 md:text-center">
                          <span className={`font-bold text-sm ${pos.outcome === 'YES' ? 'text-[#00FFA3]' : 'text-[#FF4040]'}`}>{pos.outcome}</span>
                        </div>
                        <div className="md:col-span-2 md:text-center">
                          <span className="font-bold text-sm">{pos.amount} <span className="text-xs opacity-50">ALGO</span></span>
                        </div>
                        <div className="md:col-span-2 md:text-center">
                          <span className="font-bold text-sm text-primary-container">{pos.potential.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></span>
                        </div>
                        <div className="md:col-span-1 md:text-center">
                          <span className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                            pos.status === 'running' ? 'bg-primary-container/10 text-primary-container' :
                            pos.status === 'won' ? 'bg-green-500/10 text-green-400' :
                            'bg-error/10 text-error'
                          }`}>{pos.status}</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">analytics</span>
                  <p className="text-sm text-on-surface-variant">No prediction positions yet.</p>
                </div>
              )}
            </div>
          </div>

          {myPositions.length === 0 && activeTradePositions.length === 0 && (
            <div className="bg-surface-container-low p-12 rounded-xl border border-outline-variant/10 text-center flex flex-col items-center mt-6">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">analytics</span>
              <h4 className="text-on-surface font-headline font-bold mb-2">No Active Positions</h4>
              <p className="text-sm text-on-surface-variant mb-6 max-w-sm">You haven't placed any trades or predictions yet.</p>
              <button
                onClick={() => navigate('markets')}
                className="bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:shadow-[0_0_15px_rgba(0,255,163,0.3)] transition-all"
              >
                View All Markets
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      <SendAlgo openModal={sendAlgoModal} closeModal={() => setSendAlgoModal(false)} />
      <MintNFT openModal={mintNftModal} closeModal={() => setMintNftModal(false)} />
      <AssetOptIn openModal={assetOptInModal} closeModal={() => setAssetOptInModal(false)} />
      <Bank openModal={bankModal} closeModal={() => setBankModal(false)} />
    </DashboardLayout>
  )
}

export default Dashboard
