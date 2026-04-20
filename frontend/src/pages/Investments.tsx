import React from 'react';
import DonutChart from '../components/DonutChart';
import { useWealthData, ALGO_TO_INR } from '../hooks/useWealthData';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Investments() {
  const {
    activeAddress, algoBalance, inrBalance, balanceLoading,
    activePositions, totalPotentialINR, totalWageredINR,
    netWorthINR, myTrades,
  } = useWealthData();

  const totalBuyAlgo = myTrades.filter(t => t.side === 'buy').reduce((s, t) => s + t.algoAmount, 0);
  const totalBuyINR = totalBuyAlgo * ALGO_TO_INR;

  // Gains: potential payout vs wagered
  const gains = totalPotentialINR - totalWageredINR;
  const gainsPercent = totalWageredINR > 0 ? (gains / totalWageredINR) * 100 : 0;

  const portfolioSegments = [
    { label: 'ALGO Holdings', value: inrBalance, color: '#2962FF' },
    { label: 'Active Prediction Positions', value: totalPotentialINR, color: '#00FFA3' },
    { label: 'Trade Positions', value: totalBuyINR, color: '#8B5CF6' },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Investment Portfolio</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeAddress
              ? `Pera Wallet · ALGO valued at ₹${ALGO_TO_INR.toLocaleString()}/ALGO`
              : 'Connect your Pera Wallet to see your investments.'}
          </p>
        </div>

        {!activeAddress ? (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">trending_up</span>
            <p className="text-slate-400 mt-3 font-medium">No wallet connected</p>
            <p className="text-sm text-slate-500 mt-1">Connect your Pera Wallet to see your investments.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">ALGO Portfolio</p>
                  <span className="material-symbols-outlined text-xl text-[#2962FF]">account_balance</span>
                </div>
                <p className="text-xl font-bold text-slate-100">{balanceLoading ? '…' : inr(inrBalance)}</p>
                <p className="text-xs text-slate-500 mt-1">{algoBalance.toFixed(4)} ALGO</p>
              </div>
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">Active Predictions</p>
                  <span className="material-symbols-outlined text-xl text-[#00FFA3]">casino</span>
                </div>
                <p className="text-xl font-bold text-slate-100">{inr(totalWageredINR)}</p>
                <p className="text-xs text-slate-500 mt-1">{activePositions.length} positions</p>
              </div>
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">Potential Returns</p>
                  <span className={`material-symbols-outlined text-xl ${gains >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {gains >= 0 ? 'trending_up' : 'trending_down'}
                  </span>
                </div>
                <p className={`text-xl font-bold ${gains >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {gains >= 0 ? '+' : ''}{inr(gains)}
                </p>
                <p className={`text-xs mt-1 ${gains >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {gainsPercent >= 0 ? '+' : ''}{gainsPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Portfolio donut + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <h3 className="font-bold text-slate-100 mb-4">Portfolio Split (Donut)</h3>
                {portfolioSegments.length > 0 ? (
                  <DonutChart
                    segments={portfolioSegments}
                    centerLabel="Net Worth"
                    centerValue={inr(netWorthINR)}
                    valueFormatter={inr}
                  />
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No portfolio data.</p>
                )}
              </div>

              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-slate-100">Investment Details</h3>

                {/* ALGO Holdings block */}
                <div className="flex items-start gap-4 p-4 bg-[#1F2630] rounded-xl border border-[#2A2F38]">
                  <div className="size-12 rounded-xl flex items-center justify-center bg-[#2962FF]/20 flex-shrink-0">
                    <span className="material-symbols-outlined text-2xl text-[#2962FF]">account_balance_wallet</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-slate-100">ALGO Holdings</h4>
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-[#2962FF]/20 text-[#2962FF] mt-1">Layer-1 Asset</span>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div><p className="text-xs text-slate-500">Balance</p><p className="text-sm font-bold text-slate-100">{algoBalance.toFixed(4)} ALGO</p></div>
                      <div><p className="text-xs text-slate-500">INR Value</p><p className="text-sm font-bold text-slate-100">{inr(inrBalance)}</p></div>
                      <div><p className="text-xs text-slate-500">Rate</p><p className="text-sm font-bold text-[#2962FF]">₹{ALGO_TO_INR.toLocaleString()}/ALGO</p></div>
                      <div><p className="text-xs text-slate-500">Network</p><p className="text-sm font-bold text-slate-100">Algorand</p></div>
                    </div>
                    <div className="mt-3">
                      <DonutChart
                        size={88}
                        thickness={11}
                        showLegend={false}
                        centerLabel="Alloc"
                        centerValue={netWorthINR > 0 ? `${((inrBalance / netWorthINR) * 100).toFixed(0)}%` : '0%'}
                        segments={[
                          { label: 'ALGO', value: inrBalance, color: '#2962FF' },
                          { label: 'Other', value: Math.max(0, netWorthINR - inrBalance), color: '#2A2F38' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Prediction positions block */}
                {activePositions.length > 0 && (
                  <div className="flex items-start gap-4 p-4 bg-[#1F2630] rounded-xl border border-[#2A2F38]">
                    <div className="size-12 rounded-xl flex items-center justify-center bg-[#00FFA3]/10 flex-shrink-0">
                      <span className="material-symbols-outlined text-2xl text-[#00FFA3]">casino</span>
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-100">Prediction Markets</h4>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-[#00FFA3]/10 text-[#00FFA3] mt-1">Speculative</span>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div><p className="text-xs text-slate-500">Wagered</p><p className="text-sm font-bold text-slate-100">{inr(totalWageredINR)}</p></div>
                        <div><p className="text-xs text-slate-500">Potential</p><p className="text-sm font-bold text-[#00FFA3]">{inr(totalPotentialINR)}</p></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
  );
}
