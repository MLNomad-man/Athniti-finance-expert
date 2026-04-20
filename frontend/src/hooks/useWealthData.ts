import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import algosdk from 'algosdk';
import { usePredX } from '../context/PredXContext';

// ─── Constants ───────────────────────────────────────────────────────────────
export const ALGO_TO_INR = 10_000; // 1 ALGO = ₹10,000 (fixed)

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWealthData() {
  const { activeAddress } = useWallet();
  const { myPositions, myTrades } = usePredX();

  const [algoBalance, setAlgoBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!activeAddress) { setAlgoBalance(0); return; }
    setBalanceLoading(true);
    try {
      const algodClient = new algosdk.Algodv2(
        '',
        import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
        ''
      );
      const info = await algodClient.accountInformation(activeAddress).do();
      setAlgoBalance(Number(info.amount) / 1_000_000);
    } catch (err) {
      console.error('[useWealthData] Failed to fetch ALGO balance:', err);
    } finally {
      setBalanceLoading(false);
    }
  }, [activeAddress]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const inrBalance = algoBalance * ALGO_TO_INR;

  const activePositions = myPositions.filter(p => p.status === 'running');
  const wonPositions = myPositions.filter(p => p.status === 'won');
  const lostPositions = myPositions.filter(p => p.status === 'lost');

  const totalWageredAlgo = myPositions.reduce((acc, p) => acc + p.amount, 0);
  const totalWageredINR = totalWageredAlgo * ALGO_TO_INR;

  const totalPotentialAlgo = activePositions.reduce((acc, p) => acc + p.potential, 0);
  const totalPotentialINR = totalPotentialAlgo * ALGO_TO_INR;

  const totalWonAlgo = wonPositions.reduce((acc, p) => acc + p.potential, 0);
  const totalWonINR = totalWonAlgo * ALGO_TO_INR;

  // Trades
  const buyTrades = myTrades.filter(t => t.side === 'buy');
  const sellTrades = myTrades.filter(t => t.side === 'sell');
  const totalBuyAlgo = buyTrades.reduce((acc, t) => acc + t.algoAmount, 0);
  const totalSellAlgo = sellTrades.reduce((acc, t) => acc + t.algoAmount, 0);
  const netTradeAlgo = totalSellAlgo - totalBuyAlgo;

  // Net worth = wallet balance + active positions potential
  const netWorthINR = inrBalance + totalPotentialINR;

  return {
    // Connection
    activeAddress,
    isConnected: !!activeAddress,
    balanceLoading,
    refetchBalance: fetchBalance,

    // Raw values
    algoBalance,
    inrBalance,
    ALGO_TO_INR,

    // Positions
    myPositions,
    activePositions,
    wonPositions,
    lostPositions,
    totalWageredAlgo,
    totalWageredINR,
    totalPotentialAlgo,
    totalPotentialINR,
    totalWonAlgo,
    totalWonINR,

    // Trades
    myTrades,
    buyTrades,
    sellTrades,
    totalBuyAlgo,
    totalSellAlgo,
    netTradeAlgo,

    // Summary
    netWorthINR,

    // Utilities
    inr,
  };
}
