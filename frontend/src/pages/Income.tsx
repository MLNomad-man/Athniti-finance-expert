import React from 'react';
import DonutChart from '../components/DonutChart';
import { useWealthData, ALGO_TO_INR } from '../hooks/useWealthData';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const TYPE_ICON: Record<string, string> = {
  Predictions: 'casino', Trading: 'candlestick_chart', Balance: 'account_balance_wallet',
};
const TYPE_COLOR: Record<string, string> = {
  Predictions: '#00FFA3', Trading: '#2962FF', Balance: '#8B5CF6',
};

export default function Income() {
  const {
    activeAddress, algoBalance, inrBalance, balanceLoading,
    totalWonINR, wonPositions,
    myTrades, totalSellAlgo, netTradeAlgo,
  } = useWealthData();

  const tradeIncomeINR = totalSellAlgo * ALGO_TO_INR;
  const totalIncomeINR = inrBalance + totalWonINR + tradeIncomeINR;

  const sourceSegments = [
    { label: `Wallet Balance (${algoBalance.toFixed(2)} ALGO)`, value: inrBalance, color: '#8B5CF6' },
    { label: `Won Predictions (${wonPositions.length})`, value: totalWonINR, color: '#00FFA3' },
    { label: `Trade Sales (${totalSellAlgo.toFixed(2)} ALGO)`, value: tradeIncomeINR, color: '#2962FF' },
  ].filter(s => s.value > 0);

  const statCards = [
    { label: 'Wallet (INR)', val: inrBalance, color: 'text-[#8B5CF6]', icon: 'account_balance_wallet', sub: `${algoBalance.toFixed(2)} ALGO` },
    { label: 'Won Predictions', val: totalWonINR, color: 'text-[#00FFA3]', icon: 'casino', sub: `${wonPositions.length} wins` },
    { label: 'Trade Revenue', val: tradeIncomeINR, color: 'text-[#2962FF]', icon: 'candlestick_chart', sub: `${totalSellAlgo.toFixed(2)} ALGO sold` },
    { label: 'Net Trade P&L', val: netTradeAlgo * ALGO_TO_INR, color: netTradeAlgo >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]', icon: netTradeAlgo >= 0 ? 'trending_up' : 'trending_down', sub: `${netTradeAlgo.toFixed(3)} ALGO net` },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Income Sources</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeAddress
              ? `Pera Wallet · 1 ALGO = ₹${ALGO_TO_INR.toLocaleString()} INR (fixed rate)`
              : 'Connect your Pera Wallet to see income data.'}
          </p>
        </div>

        {!activeAddress ? (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">account_balance_wallet</span>
            <p className="text-slate-400 mt-3 font-medium">No wallet connected</p>
            <p className="text-sm text-slate-500 mt-1">Connect your Pera Wallet to see income data.</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map(({ label, val, color, icon, sub }) => (
                <div key={label} className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>
                    {balanceLoading && label === 'Wallet (INR)' ? '…' : inr(val)}
                  </p>
                  {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Donut */}
            <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
              <h3 className="font-bold text-slate-100 mb-4">Income by Source (Donut)</h3>
              {sourceSegments.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <DonutChart
                    segments={sourceSegments}
                    centerLabel="Total Wealth"
                    centerValue={inr(totalIncomeINR)}
                    valueFormatter={inr}
                  />
                  <div className="space-y-3">
                    {sourceSegments.map(s => {
                      const pct = totalIncomeINR > 0 ? (s.value / totalIncomeINR) * 100 : 0;
                      const key = s.label.split(' (')[0].split(' ')[0];
                      return (
                        <div key={s.label} className="flex items-center gap-3">
                          <div className="size-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}20` }}>
                            <span className="material-symbols-outlined text-base" style={{ color: s.color }}>{TYPE_ICON[key] ?? 'payments'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300 font-medium truncate">{s.label}</span>
                              <div className="text-right ml-2">
                                <span className="text-sm font-bold text-slate-100">{inr(s.value)}</span>
                                <p className="text-xs text-slate-500">{pct.toFixed(0)}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No income data yet. Make predictions or trades to get started.</p>
              )}
            </div>

            {/* Rate Card */}
            <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-transparent border border-[#8B5CF6]/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[#8B5CF6]">currency_rupee</span>
                <h3 className="font-bold text-slate-100">Valuation Rate</h3>
              </div>
              <p className="text-sm text-slate-400">
                All ALGO values are converted at <span className="font-bold text-[#8B5CF6]">₹{ALGO_TO_INR.toLocaleString('en-IN')} per 1 ALGO</span> (fixed rate).
                This is a fixed conversion used for financial planning purposes only.
              </p>
            </div>

            {/* Recent income credits — trade sells */}
            {myTrades.filter(t => t.side === 'sell').length > 0 && (
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl overflow-hidden">
                <div className="p-5 border-b border-[#2A2F38] flex items-center justify-between">
                  <h3 className="font-bold text-slate-100">Recent Trade Sales (Revenue)</h3>
                  <span className="text-xs text-slate-500">{myTrades.filter(t => t.side === 'sell').length} total</span>
                </div>
                <div className="overflow-y-auto max-h-72 divide-y divide-[#2A2F38]">
                  {myTrades.filter(t => t.side === 'sell').slice(0, 10).map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-[#1F2630] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#22C55E]/10">
                          <span className="material-symbols-outlined text-base text-[#22C55E]">candlestick_chart</span>
                        </div>
                        <div>
                          <p className="text-sm text-slate-200 font-medium">{t.symbol}</p>
                          <p className="text-xs text-slate-500 uppercase">Sell · {t.assetType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-[#22C55E]">+{t.algoAmount.toFixed(2)} ALGO</span>
                        <p className="text-xs text-slate-500">{inr(t.algoAmount * ALGO_TO_INR)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
  );
}
