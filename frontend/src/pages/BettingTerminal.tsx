import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { usePredX } from '../context/PredXContext';
import { useWallet } from '@txnlab/use-wallet-react';
import { useSnackbar } from 'notistack';
import { useMarket } from '../hooks/useMarket';
import { useOraclePrice } from '../hooks/useOraclePrice';
import type { MarketPricePoint } from '../lib/marketContract';

interface Bettor {
  address: string
  shortAddress: string
  amount: number
  outcome: string;
}

const BettingTerminal: React.FC = () => {
  const { markets, pageProps, placePrediction, navigate } = usePredX();
  const { activeAddress, transactionSigner } = useWallet();
  const { enqueueSnackbar } = useSnackbar();
  
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<0 | 1>(0);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);
  const [bettors, setBettors] = useState<Bettor[]>([]);
  const [priceHistory, setPriceHistory] = useState<MarketPricePoint[]>([]);
  const [historyRange, setHistoryRange] = useState<'1H' | '1D' | '1W' | 'ALL'>('1D');
  const { placeBet: placeBetOnChain, claimWinnings, getMarketBettors, getMarketPriceHistory } = useMarket();
  const { algoPrice } = useOraclePrice();

  const marketId = pageProps?.marketId || markets[0]?.id;
  const market = markets.find(m => m.id === marketId) || markets[0];

  useEffect(() => {
    if (market && market.id_onchain) {
      getMarketBettors(market.id_onchain).then(b => setBettors(b));
      getMarketPriceHistory(market.id_onchain).then(setPriceHistory);
    }
  }, [market, getMarketBettors, getMarketPriceHistory]);

  const filteredHistory = useMemo(() => {
    if (priceHistory.length === 0) return [];
    if (historyRange === 'ALL') return priceHistory;

    const now = Math.floor(Date.now() / 1000);
    const secondsWindow =
      historyRange === '1H' ? 3600 :
      historyRange === '1D' ? 86400 :
      604800;

    const cutoff = now - secondsWindow;
    const narrowed = priceHistory.filter(point => point.timestamp >= cutoff);
    return narrowed.length > 0 ? narrowed : priceHistory;
  }, [priceHistory, historyRange]);

  const chartPoints = useMemo(() => {
    const source = filteredHistory;
    if (source.length === 0) return '';

    const values = source.map(point => (selectedOutcome === 0 ? point.probabilityYes : point.probabilityNo));
    if (values.length === 1) {
      const y = 100 - values[0];
      return `M0,${y} L100,${y}`;
    }

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 100 - value;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [filteredHistory, selectedOutcome]);

  const currentProbabilityYes =
    filteredHistory.length > 0
      ? filteredHistory[filteredHistory.length - 1].probabilityYes
      : market.probabilityYes;
  const currentProbabilityNo =
    filteredHistory.length > 0
      ? filteredHistory[filteredHistory.length - 1].probabilityNo
      : market.probabilityNo;
  const currentSelectedProbability = selectedOutcome === 0 ? currentProbabilityYes : currentProbabilityNo;

  const handlePlacePrediction = async () => {
    if (!amount || Number(amount) <= 0) {
      enqueueSnackbar('Please enter a valid amount', { variant: 'warning' });
      return;
    }
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Please connect your wallet first', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      // Place bet on-chain via smart contract
      const txId = await placeBetOnChain(market.id_onchain, selectedOutcome, Number(amount));

      // Successfully processed on-chain! Update internal state.
      placePrediction(market.id, selectedOutcome, Number(amount));
      const outcomeName = selectedOutcome === 0 ? market.optionA : market.optionB;
      enqueueSnackbar(`Successfully predicted ${outcomeName} with ${amount} ALGO!`, { variant: 'success' });
      setAmount('');
      const [updatedBettors, updatedHistory] = await Promise.all([
        getMarketBettors(market.id_onchain),
        getMarketPriceHistory(market.id_onchain),
      ]);
      setBettors(updatedBettors);
      setPriceHistory(updatedHistory);
      
    } catch (error: any) {
      console.error(error);
      let errorMessage = error?.message || 'Unknown error occurred';
      
      // Translate raw blockchain node errors into friendly UI limits
      if (errorMessage.includes('assert failed') || errorMessage.includes('logic eval error')) {
        if (market.status === 'resolved') {
          errorMessage = 'This market has already ended and is no longer accepting bets.';
        } else {
          errorMessage = 'Limit reached: You are only allowed to place one bet per market!';
        }
      } else if (errorMessage.toLowerCase().includes('user rejected') || errorMessage.includes('cancelled')) {
        errorMessage = 'Transaction cancelled in your wallet.';
      }
      
      setErrorModalMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!market) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <h2 className="text-xl">Market not found</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="pt-8 pb-12 px-6 lg:px-12 max-w-[1600px] mx-auto">
        {/* Breadcrumbs & Market Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-label text-on-surface-variant mb-4">
            <span>{market.category}</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Algorand</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary-container">Market Analysis</span>
          </div>
          <h1 className="font-headline text-3xl md:text-5xl font-black tracking-tighter mb-4 text-primary max-w-4xl leading-tight">
            {market.title}
          </h1>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              <span className="text-xs font-label font-semibold text-primary-container uppercase tracking-wider">Live Market</span>
            </div>
            <div className="text-xs font-label text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">schedule</span>
              Ends {market.endDate}
            </div>
            <div className="text-xs font-label text-on-surface-variant flex items-center gap-1.5 cursor-pointer hover:text-primary-container" onClick={() => navigate('markets')}>
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to Markets
            </div>
          </div>
        </div>

        {/* Live ALGO Price */}
        <div className="flex gap-4 text-xs font-label text-on-surface-variant mb-4">
          <div>ALGO/USD: <span className="text-primary-container font-bold">${algoPrice?.toFixed(2) ?? '...'}</span></div>
          <div>ALGO/INR: <span className="text-primary-container font-bold">₹10,000</span></div>
        </div>

        {/* Terminal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Interactive Cards and Stats */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Voting Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* YES Card */}
                <div 
                className={`group relative bg-surface-container-low rounded-lg p-5 transition-all duration-300 overflow-hidden cursor-pointer border ${selectedOutcome === 0 ? 'border-primary-container shadow-[0_0_20px_rgba(0,255,163,0.1)]' : 'border-outline-variant/10 hover:border-primary-container/30'}`}
                onClick={() => setSelectedOutcome(0)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/5 rounded-full -mr-16 -mt-16 blur-3xl transition-opacity group-hover:opacity-100"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-headline text-3xl font-black text-primary-container leading-tight">
                      {market.optionA || 'YES'}
                    </span>
                    <div className="text-right whitespace-nowrap ml-4">
                      <div className="text-2xl font-headline font-bold text-on-surface">${(currentSelectedProbability / 100).toFixed(2)}</div>
                      <div className="text-xs font-label text-on-surface-variant">Per Share</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-label text-on-surface-variant font-medium">Win Probability</span>
                      <span className="text-xl font-headline font-bold text-primary-container">{currentProbabilityYes}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container rounded-full" style={{ width: `${currentProbabilityYes}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NO Card */}
              <div 
                className={`group relative bg-surface-container-low rounded-lg p-5 transition-all duration-300 overflow-hidden cursor-pointer border ${selectedOutcome === 1 ? 'border-error shadow-[0_0_20px_rgba(255,180,171,0.1)]' : 'border-outline-variant/10 hover:border-error/30'}`}
                onClick={() => setSelectedOutcome(1)}
              >
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-error/5 rounded-full -ml-16 -mb-16 blur-3xl transition-opacity group-hover:opacity-100"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-headline text-3xl font-black text-error/80 leading-tight">
                      {market.optionB || 'NO'}
                    </span>
                    <div className="text-right whitespace-nowrap ml-4">
                      <div className="text-2xl font-headline font-bold text-on-surface">${(currentProbabilityNo / 100).toFixed(2)}</div>
                      <div className="text-xs font-label text-on-surface-variant">Per Share</div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-label text-on-surface-variant font-medium">Win Probability</span>
                      <span className="text-xl font-headline font-bold text-error/80">{currentProbabilityNo}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-error/40 rounded-full" style={{ width: `${currentProbabilityNo}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Market Stats Bento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label mb-2">Volume</div>
                <div className="text-xl font-headline font-bold">
                  {market.volume >= 1000 ? `$${(market.volume / 1000).toFixed(1)}K` : `${market.volume.toFixed(2)} ALGO`}
                </div>
              </div>
              <div className="bg-surface-container-low p-5 rounded-lg border border-outline-variant/10">
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-label mb-2">Participants</div>
                <div className="text-xl font-headline font-bold">{bettors.length}</div>
              </div>
            </div>

            {/* Chart Section Placeholder */}
            <div className="bg-surface-container-low rounded-lg p-6 min-h-[250px] flex flex-col border border-outline-variant/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-bold text-sm">
                  Price History ({selectedOutcome === 0 ? market.optionA || 'YES' : market.optionB || 'NO'})
                </h3>
                <div className="flex gap-2">
                  {(['1H', '1D', '1W', 'ALL'] as const).map(range => (
                    <button
                      key={range}
                      className={`px-3 py-1 text-[10px] rounded transition-colors ${
                        historyRange === range
                          ? 'bg-surface-container-highest text-on-surface'
                          : 'hover:bg-surface-container-highest text-on-surface-variant'
                      }`}
                      onClick={() => setHistoryRange(range)}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-grow flex items-end gap-1 px-4 relative">
                <div className="w-full h-32 bg-gradient-to-t from-primary-container/20 to-transparent relative overflow-hidden rounded-t-lg">
                  {chartPoints ? (
                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path
                        d={chartPoints}
                        fill="none"
                        stroke={selectedOutcome === 0 ? "#00FFA3" : "#ffb4ab"}
                        strokeWidth="1.5"
                      />
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-on-surface-variant/70">
                      No on-chain trade history yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ORDERBOOK LIST */}
            <div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant/10 mt-6">
              <h3 className="font-headline font-bold text-sm mb-4">Live Orderbook ({bettors.length} Bettors)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {bettors.length === 0 ? (
                  <div className="text-center text-sm text-on-surface-variant py-8 border border-dashed border-outline-variant/10 rounded-lg">
                    No predictions placed yet. Be the first to bet!
                  </div>
                ) : (
                  bettors.map((b, i) => (
                    <div key={i} className="flex justify-between items-center bg-surface-container-highest/20 rounded-lg p-3 border border-outline-variant/5">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${b.outcome === 'YES' ? 'bg-primary-container/20 text-primary-container' : 'bg-error/20 text-error'}`}>
                          {b.outcome === 'YES' ? market.optionA || 'YES' : market.optionB || 'NO'}
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{b.shortAddress}</span>
                      </div>
                      <span className="text-sm font-bold text-on-surface">{b.amount} ALGO</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Stake Panel */}
          <div className="lg:col-span-4 sticky top-28">
            <div className="bg-surface-container-low rounded-lg p-6 shadow-2xl border border-outline-variant/10">
              <div className="flex gap-4 mb-6">
                <button className="flex-1 py-3 text-sm font-headline font-bold text-primary-container border-b-2 border-primary-container">PREDICT</button>
                <button className="flex-1 py-3 text-sm font-headline font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-not-allowed">WITHDRAW (LOCKED)</button>
              </div>

              <div className="space-y-6">
                {/* Outcome Toggle */}
                <div className="flex p-1 bg-surface-container-highest rounded-full">
                  <button 
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-full transition-colors truncate ${selectedOutcome === 0 ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setSelectedOutcome(0)}
                  >{market.optionA || 'YES'}</button>
                  <button 
                    className={`flex-1 py-2 px-2 text-xs font-bold rounded-full transition-colors truncate ${selectedOutcome === 1 ? 'bg-error text-on-error' : 'text-on-surface-variant hover:text-on-surface'}`}
                    onClick={() => setSelectedOutcome(1)}
                  >{market.optionB || 'NO'}</button>
                </div>

                {/* Amount Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-label text-on-surface-variant">Amount to lock</label>
                  </div>
                  <div className="relative">
                    <input 
                      className="w-full bg-surface-container-lowest border-none rounded-lg py-4 pl-4 pr-16 text-xl font-headline font-bold focus:ring-1 focus:ring-primary-container/40" 
                      placeholder="0.00" 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">ALGO</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 py-1 text-[10px] bg-surface-container-highest rounded hover:text-primary-container transition-colors" onClick={() => setAmount('10')}>10</button>
                    <button className="flex-1 py-1 text-[10px] bg-surface-container-highest rounded hover:text-primary-container transition-colors" onClick={() => setAmount('50')}>50</button>
                    <button className="flex-1 py-1 text-[10px] bg-surface-container-highest rounded hover:text-primary-container transition-colors" onClick={() => setAmount('100')}>100</button>
                    <button className="flex-1 py-1 text-[10px] bg-surface-container-highest rounded hover:text-primary-container transition-colors" onClick={() => setAmount('500')}>500</button>
                  </div>
                </div>

                {/* Prediction Summary */}
                <div className="bg-surface-container-highest/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-xs border-b border-outline-variant/10 pb-2">
                    <span className="text-on-surface-variant">Current price</span>
                    <span className="font-bold">${(currentSelectedProbability / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-on-surface-variant">Potential ROI</span>
                    <span className="font-bold text-primary-container">
                      {(() => {
                        const prob = currentSelectedProbability;
                        if (!amount || Number(amount) <= 0) return '0.00';
                        if (prob <= 0) return 'N/A';
                        const payout = Number(amount) * (100 / prob);
                        const roi = payout - Number(amount);
                        return `+${roi.toFixed(2)} ALGO`;
                      })()}
                    </span>
                  </div>
                </div>

                <button 
                  className={`w-full font-headline font-black py-4 rounded-full transition-all duration-300 active:scale-95 text-sm md:text-md lg:text-lg uppercase tracking-tight ${!activeAddress ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed' : loading ? 'bg-primary-container/50 text-on-primary cursor-wait' : 'bg-primary-container text-on-primary hover:shadow-[0_0_20px_rgba(0,255,163,0.5)]'}`}
                  onClick={handlePlacePrediction}
                  disabled={loading || !activeAddress}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><span className="loading loading-spinner loading-sm"></span> Signing Txn...</span>
                  ) : !activeAddress ? 'Connect Wallet to Predict' : `Place ${selectedOutcome === 0 ? market.optionA || 'YES' : market.optionB || 'NO'} Prediction`}
                </button>

                <div className="text-[10px] text-center text-on-surface-variant leading-relaxed">
                  By clicking "Place Prediction", Pera Wallet will prompt you to sign a transaction to lock your stake on-chain.
                </div>

                {/* Claim Winnings Button — only when market is resolved */}
                {market.status === 'resolved' && (
                  <button
                    className="w-full font-headline font-black py-4 rounded-full bg-secondary text-on-secondary uppercase tracking-tight"
                    onClick={() => claimWinnings(market.id_onchain)}
                  >
                    Claim Winnings
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Modal Overlay */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#101419]/80 backdrop-blur-md">
          <div className="bg-surface-container rounded-2xl p-8 max-w-sm w-full border border-outline-variant/20 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-error">info</span>
            </div>
            <h3 className="text-xl font-headline font-black text-on-surface mb-2">Notice</h3>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
              {errorModalMsg}
            </p>
            <button 
              className="w-full font-headline font-bold py-3.5 rounded-full bg-primary-container text-on-primary transition-all active:scale-95"
              onClick={() => setErrorModalMsg(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default BettingTerminal;
