import React, { useState, useEffect, type ReactElement } from 'react';
import DonutChart from '../components/DonutChart';
import { useWealthData } from '../hooks/useWealthData';
import type { ExpenseEntry } from '../types/wealthTypes';

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPENSES_KEY = 'predx-finance-expenses';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const CATEGORY_COLOR: Record<string, string> = {
  food: '#F59E0B', shopping: '#8B5CF6', transport: '#3B82F6',
  subscription: '#EC4899', utilities: '#06B6D4', health: '#EF4444',
  entertainment: '#F97316', prediction: '#00FFA3', trading: '#2962FF', other: '#64748B',
};

const CATEGORY_ICON: Record<string, string> = {
  food: 'restaurant', shopping: 'shopping_bag', transport: 'directions_car',
  subscription: 'subscriptions', utilities: 'bolt', health: 'local_hospital',
  entertainment: 'movie', prediction: 'casino', trading: 'candlestick_chart', other: 'receipt_long',
};

const TYPE_BADGE: Record<string, ReactElement> = {
  need: <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#22C55E]/10 text-[#22C55E] tracking-wide">Need</span>,
  want: <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#8B5CF6]/10 text-[#8B5CF6] tracking-wide">Want</span>,
  other: <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#2A2F38] text-slate-400 tracking-wide">Other</span>,
};

function loadExpenses(): ExpenseEntry[] {
  try { return JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? '[]'); } catch { return []; }
}
function saveExpenses(e: ExpenseEntry[]) { localStorage.setItem(EXPENSES_KEY, JSON.stringify(e)); }

const defaultForm = {
  description: '', category: 'other', amount: '', date: new Date().toISOString().split('T')[0], type: 'other' as ExpenseEntry['type'],
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Expenses() {
  const { myTrades, inrBalance, ALGO_TO_INR } = useWealthData();
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setExpenses(loadExpenses()); }, []);

  const persist = (e: ExpenseEntry[]) => { setExpenses(e); saveExpenses(e); };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || Number(form.amount) <= 0) return;
    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      description: form.description.trim(),
      category: form.category,
      amount: Number(form.amount),
      date: form.date,
      type: form.type,
    };
    persist([entry, ...expenses]);
    setForm(defaultForm);
    setShowForm(false);
  };

  // Merge trade buy costs as expenses
  const tradeExpenses: ExpenseEntry[] = myTrades
    .filter(t => t.side === 'buy')
    .map(t => ({
      id: `trade-${t.symbol}-${t.timestamp}`,
      description: `Buy ${t.symbol} (${t.assetType})`,
      category: t.assetType === 'crypto' ? 'trading' : 'prediction',
      amount: t.algoAmount * ALGO_TO_INR,
      date: new Date(t.timestamp).toISOString().split('T')[0],
      type: 'other' as ExpenseEntry['type'],
    }));

  const allExpenses = [...expenses, ...tradeExpenses].sort((a, b) => b.date.localeCompare(a.date));
  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const catMap: Record<string, { amount: number; count: number; type: ExpenseEntry['type'] }> = {};
  allExpenses.forEach(e => {
    if (!catMap[e.category]) catMap[e.category] = { amount: 0, count: 0, type: e.type };
    catMap[e.category].amount += e.amount;
    catMap[e.category].count += 1;
  });
  const categoryData = Object.entries(catMap)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([category, data]) => ({
      category, ...data,
      percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
    }));

  const categorySegments = categoryData.map(c => ({
    label: `${c.category} (${c.count})`,
    value: c.amount,
    color: CATEGORY_COLOR[c.category] ?? '#64748B',
  }));

  // 50/30/20 rule (based on wallet balance as income proxy)
  const incomeProxy = inrBalance;
  const rule = {
    needs: { amount: allExpenses.filter(e => e.type === 'need').reduce((s, e) => s + e.amount, 0), target: 50 },
    wants: { amount: allExpenses.filter(e => e.type === 'want').reduce((s, e) => s + e.amount, 0), target: 30 },
    savings: { amount: Math.max(0, incomeProxy - totalExpenses), target: 20 },
  };

  const inputBase = 'w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF]';

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Expense Tracking</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manual entries + trade buy costs from your Pera Wallet.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#2962FF] hover:bg-[#2255DD] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Add Expense'}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-2xl p-6">
            <h3 className="font-bold text-slate-100 mb-4">Add Expense</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g., Grocery shopping" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputBase}>
                  {Object.keys(CATEGORY_COLOR).map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ExpenseEntry['type'] })} className={inputBase}>
                  <option value="need">Need</option>
                  <option value="want">Want</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" min="0" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputBase} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="bg-[#2962FF] hover:bg-[#2255DD] text-white text-sm font-semibold px-5 py-2.5 rounded-xl">Add</button>
              </div>
            </form>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Expenses', val: totalExpenses, color: 'text-[#EF4444]', icon: 'trending_down' },
            { label: 'Wallet Balance', val: incomeProxy, color: 'text-[#2962FF]', icon: 'account_balance_wallet' },
            { label: 'Net Savings', val: Math.max(0, incomeProxy - totalExpenses), color: 'text-[#22C55E]', icon: 'savings' },
            { label: 'Transactions', val: allExpenses.length, color: 'text-slate-300', icon: 'receipt_long', isCount: true },
          ].map(({ label, val, color, icon, isCount }) => (
            <div key={label} className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">{label}</p>
                <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{isCount ? val : inr(val as number)}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
            <h3 className="font-bold text-slate-100 mb-4">Spending by Category</h3>
            {categorySegments.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <DonutChart segments={categorySegments} centerLabel="Total Spend" centerValue={inr(totalExpenses)} valueFormatter={inr} />
                <div className="space-y-3">
                  {categoryData.map(c => (
                    <div key={c.category} className="flex items-center gap-3">
                      <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${CATEGORY_COLOR[c.category] ?? '#64748B'}20` }}>
                        <span className="material-symbols-outlined text-base" style={{ color: CATEGORY_COLOR[c.category] ?? '#64748B' }}>{CATEGORY_ICON[c.category] ?? 'receipt_long'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300 capitalize font-medium">{c.category}</span>
                            {TYPE_BADGE[c.type]}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-slate-100">{inr(c.amount)}</span>
                            <p className="text-xs text-slate-500">{c.percentage.toFixed(0)}% · {c.count} txns</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No expenses logged yet.</p>
            )}
          </div>

          {/* 50/30/20 */}
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
            <h3 className="font-bold text-slate-100 mb-1">50/30/20 Rule</h3>
            <p className="text-xs text-slate-500 mb-4">Budget health (based on wallet balance)</p>
            {[
              { label: 'Needs', data: rule.needs, color: '#22C55E', icon: 'check_circle' },
              { label: 'Wants', data: rule.wants, color: '#8B5CF6', icon: 'shopping_bag' },
              { label: 'Savings', data: rule.savings, color: '#2962FF', icon: 'savings' },
            ].map(({ label, data, color, icon }) => {
              const pct = incomeProxy > 0 ? (data.amount / incomeProxy) * 100 : 0;
              const safePct = Math.min(Math.max(pct, 0), 100);
              return (
                <div key={label} className="rounded-lg border border-[#2A2F38] bg-[#1F2630] p-3 mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base" style={{ color }}>{icon}</span>
                      <span className="text-sm font-medium text-slate-300">{label}</span>
                      <span className="text-xs text-slate-500">target {data.target}%</span>
                    </div>
                    <span className="text-sm font-bold text-slate-100">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#2A2F38] rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${safePct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{inr(data.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction list */}
        {allExpenses.length > 0 && (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#2A2F38] flex items-center justify-between">
              <h3 className="font-bold text-slate-100">All Expenses</h3>
              <span className="text-xs text-slate-500">{allExpenses.length} entries</span>
            </div>
            <div className="overflow-y-auto max-h-96 divide-y divide-[#2A2F38]">
              {allExpenses.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#1F2630] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${CATEGORY_COLOR[e.category] ?? '#64748B'}20` }}>
                      <span className="material-symbols-outlined text-base" style={{ color: CATEGORY_COLOR[e.category] ?? '#64748B' }}>{CATEGORY_ICON[e.category] ?? 'receipt_long'}</span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 truncate max-w-[180px]">{e.description}</p>
                      <p className="text-xs text-slate-500">{e.date} · <span className="capitalize">{e.category}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {TYPE_BADGE[e.type]}
                    <span className="text-sm font-bold text-[#EF4444]">-{inr(e.amount)}</span>
                    {!e.id.startsWith('trade-') && (
                      <button onClick={() => persist(expenses.filter(x => x.id !== e.id))} className="text-xs text-slate-600 hover:text-[#EF4444] ml-1">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}
