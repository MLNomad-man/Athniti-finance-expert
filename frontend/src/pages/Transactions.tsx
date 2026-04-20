import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DonutChart from '../components/DonutChart';
import { useWealthData, ALGO_TO_INR } from '../hooks/useWealthData';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLOR: Record<string, string> = {
  prediction: '#00FFA3', trading: '#2962FF', income: '#22C55E',
};
const CATEGORY_ICON: Record<string, string> = {
  prediction: 'casino', trading: 'candlestick_chart', income: 'payments',
};

type FilterType = 'all' | 'prediction' | 'trade';

export default function Transactions() {
  const {
    activeAddress, algoBalance, inrBalance,
    myPositions, activePositions, wonPositions, lostPositions,
    totalWageredAlgo, totalWageredINR,
    myTrades, totalBuyAlgo, totalSellAlgo,
  } = useWealthData();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'running' | 'won' | 'lost'>('all');

  // Build unified transaction list
  const allTxns = [
    ...myPositions.map(p => ({
      id: p.id,
      type: 'prediction' as const,
      description: `${p.outcome} position`,
      amountAlgo: p.amount,
      amountINR: p.amount * ALGO_TO_INR,
      status: p.status,
      side: 'bet' as const,
      date: '',
    })),
    ...myTrades.map(t => ({
      id: `trade-${t.symbol}-${new Date(t.timestamp).getTime()}`,
      type: 'trade' as const,
      description: `${t.side.toUpperCase()} ${t.symbol} (${t.assetType})`,
      amountAlgo: t.algoAmount,
      amountINR: t.algoAmount * ALGO_TO_INR,
      status: t.mode,
      side: t.side,
      date: new Date(t.timestamp).toLocaleDateString('en-IN'),
    })),
  ];

  const filtered = allTxns.filter(t => {
    if (typeFilter === 'prediction' && t.type !== 'prediction') return false;
    if (typeFilter === 'trade' && t.type !== 'trade') return false;
    if (t.type === 'prediction' && outcomeFilter !== 'all' && t.status !== outcomeFilter) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categorySegments = [
    { label: `Predictions (${myPositions.length})`, value: totalWageredINR, color: '#00FFA3' },
    { label: `Buy Trades (${myTrades.filter(t => t.side === 'buy').length})`, value: totalBuyAlgo * ALGO_TO_INR, color: '#2962FF' },
    { label: `Sell Trades (${myTrades.filter(t => t.side === 'sell').length})`, value: totalSellAlgo * ALGO_TO_INR, color: '#22C55E' },
  ].filter(s => s.value > 0);

  const totalActivity = totalWageredINR + totalBuyAlgo * ALGO_TO_INR;

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 pt-6 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Transactions & Trends</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeAddress
              ? `${allTxns.length} total transactions · 1 ALGO = ₹${ALGO_TO_INR.toLocaleString()}`
              : 'Connect your Pera Wallet to see transactions.'}
          </p>
        </div>

        {!activeAddress ? (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">receipt_long</span>
            <p className="text-slate-400 mt-3 font-medium">No wallet connected</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Wallet Balance', val: inrBalance, color: 'text-[#2962FF]', icon: 'account_balance_wallet', sub: `${algoBalance.toFixed(2)} ALGO` },
                { label: 'Total Activity', val: totalActivity, color: 'text-[#8B5CF6]', icon: 'swap_horiz', sub: `${allTxns.length} txns` },
                { label: 'Predictions Wagered', val: totalWageredINR, color: 'text-[#00FFA3]', icon: 'casino', sub: `${myPositions.length} positions` },
                { label: 'Trade Volume', val: (totalBuyAlgo + totalSellAlgo) * ALGO_TO_INR, color: 'text-[#F59E0B]', icon: 'candlestick_chart', sub: `${myTrades.length} trades` },
              ].map(({ label, val, color, icon, sub }) => (
                <div key={label} className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{label}</p>
                    <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{inr(val)}</p>
                  {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
                </div>
              ))}
            </div>

            {/* Charts + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Category donut */}
                <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <h3 className="font-bold text-slate-100 mb-4">Activity by Type (Donut)</h3>
                  {categorySegments.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                      <DonutChart
                        segments={categorySegments}
                        centerLabel="Total Activity"
                        centerValue={inr(totalActivity)}
                        valueFormatter={inr}
                      />
                      <div className="space-y-3">
                        {categorySegments.map(s => (
                          <div key={s.label} className="flex items-center gap-3">
                            <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}20` }}>
                              <span className="material-symbols-outlined text-base" style={{ color: s.color }}>
                                {CATEGORY_ICON[s.label.split(' ')[0].toLowerCase()] ?? 'payments'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="text-sm text-slate-300 font-medium">{s.label}</span>
                                <span className="text-sm font-bold text-slate-100">{inr(s.value)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">No transaction activity yet.</p>
                  )}
                </div>

                {/* Transaction list */}
                <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl overflow-hidden">
                  <div className="p-5 border-b border-[#2A2F38]">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-base">search</span>
                        <input
                          type="text"
                          placeholder="Search transactions…"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-[#0E1117] border border-[#2A2F38] rounded-lg text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF]"
                        />
                      </div>
                      <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as FilterType)}
                        className="py-2 px-3 bg-[#0E1117] border border-[#2A2F38] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#2962FF]"
                      >
                        <option value="all">All types</option>
                        <option value="prediction">Predictions</option>
                        <option value="trade">Trades</option>
                      </select>
                      {typeFilter === 'prediction' && (
                        <select
                          value={outcomeFilter}
                          onChange={e => setOutcomeFilter(e.target.value as 'all' | 'running' | 'won' | 'lost')}
                          className="py-2 px-3 bg-[#0E1117] border border-[#2A2F38] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#2962FF]"
                        >
                          <option value="all">All outcomes</option>
                          <option value="running">Running</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{filtered.length} transactions</p>
                  </div>

                  {filtered.length > 0 ? (
                    <div className="overflow-y-auto max-h-96 divide-y divide-[#2A2F38]">
                      {filtered.map(t => (
                        <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#1F2630] transition-colors">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${CATEGORY_COLOR[t.type] ?? '#64748B'}20` }}
                            >
                              <span className="material-symbols-outlined text-base" style={{ color: CATEGORY_COLOR[t.type] ?? '#64748B' }}>
                                {CATEGORY_ICON[t.type] ?? 'receipt_long'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-slate-200">{t.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  t.status === 'running' || t.status === 'simulation' ? 'bg-[#2962FF]/10 text-[#2962FF]'
                                  : t.status === 'won' || t.status === 'transaction' ? 'bg-[#22C55E]/10 text-[#22C55E]'
                                  : 'bg-[#EF4444]/10 text-[#EF4444]'
                                }`}>{t.status}</span>
                                {t.date && <span className="text-xs text-slate-500">{t.date}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${t.side === 'sell' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                              {t.side === 'sell' ? '+' : '-'}{t.amountAlgo.toFixed(2)} ALGO
                            </span>
                            <p className="text-xs text-slate-500">{inr(t.amountINR)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-600">search_off</span>
                      <p className="text-slate-500 text-sm mt-2">No transactions match your filters.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* Position summary */}
                <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <h3 className="font-bold text-slate-100 mb-4">Prediction Summary</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Running', count: activePositions.length, color: '#2962FF' },
                      { label: 'Won', count: wonPositions.length, color: '#22C55E' },
                      { label: 'Lost', count: lostPositions.length, color: '#EF4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-sm text-slate-300">{label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-100">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade summary */}
                <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <h3 className="font-bold text-slate-100 mb-4">Trade Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Buys</span>
                      <span className="font-medium text-[#EF4444]">{myTrades.filter(t => t.side === 'buy').length} ({totalBuyAlgo.toFixed(2)} ALGO)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Sells</span>
                      <span className="font-medium text-[#22C55E]">{myTrades.filter(t => t.side === 'sell').length} ({totalSellAlgo.toFixed(2)} ALGO)</span>
                    </div>
                    <div className="border-t border-[#2A2F38] pt-3 flex justify-between text-sm">
                      <span className="text-slate-500">Net P&L</span>
                      <span className={`font-bold ${totalSellAlgo - totalBuyAlgo >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {(totalSellAlgo - totalBuyAlgo) >= 0 ? '+' : ''}{(totalSellAlgo - totalBuyAlgo).toFixed(3)} ALGO
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
