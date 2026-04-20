import React, { useState } from 'react';
import { useWealthData, ALGO_TO_INR } from '../hooks/useWealthData';
import { useWallet } from '@txnlab/use-wallet-react';
import { ellipseAddress } from '../utils/ellipseAddress';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const GOALS_KEY = 'predx-finance-goals';
const DEBTS_KEY = 'predx-finance-debts';
const EXPENSES_KEY = 'predx-finance-expenses';

function exportData(): string {
  return JSON.stringify({
    goals: JSON.parse(localStorage.getItem(GOALS_KEY) ?? '[]'),
    debts: JSON.parse(localStorage.getItem(DEBTS_KEY) ?? '[]'),
    expenses: JSON.parse(localStorage.getItem(EXPENSES_KEY) ?? '[]'),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

function importData(text: string): boolean {
  try {
    const data = JSON.parse(text);
    if (data.goals) localStorage.setItem(GOALS_KEY, JSON.stringify(data.goals));
    if (data.debts) localStorage.setItem(DEBTS_KEY, JSON.stringify(data.debts));
    if (data.expenses) localStorage.setItem(EXPENSES_KEY, JSON.stringify(data.expenses));
    return true;
  } catch {
    return false;
  }
}

function clearData() {
  localStorage.removeItem(GOALS_KEY);
  localStorage.removeItem(DEBTS_KEY);
  localStorage.removeItem(EXPENSES_KEY);
}

export default function Profile() {
  const { activeAddress, wallets } = useWallet();
  const { algoBalance, inrBalance, balanceLoading, netWorthINR, myPositions, myTrades } = useWealthData();

  const [dataMsg, setDataMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predx-finance-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMsg({ type: 'success', text: 'Data exported successfully.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const ok = importData(text);
      setDataMsg(ok
        ? { type: 'success', text: 'Data imported. Refresh the page to see changes.' }
        : { type: 'error', text: 'Invalid file format.' }
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    clearData();
    setShowClearConfirm(false);
    setDataMsg({ type: 'success', text: 'All finance data cleared.' });
  };

  const msgCls = (type: 'success' | 'error') =>
    type === 'success'
      ? 'bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]'
      : 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444]';

  const cardCls = 'bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6 md:p-8';
  const sectionTitle = 'text-base font-bold text-on-surface mb-4';

  return (
    <div className="space-y-6">
      {/* Wallet Info */}
        <div className={cardCls}>
          <h3 className={sectionTitle}>Algorand Wallet</h3>
          {activeAddress ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-[#22C55E] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse inline-block" />
                  Connected
                </span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">Address</span>
                <span className="font-mono text-slate-200 text-xs">{ellipseAddress(activeAddress, 8)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">ALGO Balance</span>
                <span className="font-medium text-slate-100">{balanceLoading ? '…' : `${algoBalance.toFixed(4)} ALGO`}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">INR Value</span>
                <span className="font-medium text-[#2962FF]">{balanceLoading ? '…' : inr(inrBalance)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">Net Worth (est.)</span>
                <span className="font-medium text-[#00FFA3]">{inr(netWorthINR)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">Valuation Rate</span>
                <span className="font-medium text-slate-100">1 ALGO = ₹{ALGO_TO_INR.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-[#2A2F38]">
                <span className="text-slate-500">Predictions</span>
                <span className="font-medium text-slate-100">{myPositions.length} total</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-slate-500">Trades</span>
                <span className="font-medium text-slate-100">{myTrades.length} total</span>
              </div>

              {wallets && wallets.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#2A2F38]">
                  <button
                    onClick={() => wallets[0]?.disconnect()}
                    className="text-sm font-medium px-4 py-2 rounded-xl border border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-[#EF4444]/80 hover:text-[#EF4444] transition-colors"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-4xl text-slate-600">account_balance_wallet</span>
              <p className="text-slate-400 mt-3 font-medium">No wallet connected</p>
              <p className="text-sm text-slate-500 mt-1">Connect your Pera Wallet using the button in the top bar.</p>
            </div>
          )}
        </div>

        {/* Data Management */}
        <div className={cardCls}>
          <h3 className={sectionTitle}>Data Management</h3>
          <p className="text-xs text-slate-500 mb-5">Export or import your goals, debts, and expense data stored locally.</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExport}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-[#2A2F38] hover:bg-[#1F2630] text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-sm align-middle mr-1">download</span>
              Export Data
            </button>

            <label className="text-sm font-medium px-4 py-2 rounded-xl border border-[#2A2F38] hover:bg-[#1F2630] text-slate-300 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm align-middle mr-1">upload</span>
              Import Data
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm font-medium px-4 py-2 rounded-xl border border-[#EF4444]/30 hover:bg-[#EF4444]/10 text-[#EF4444]/70 hover:text-[#EF4444] transition-colors"
              >
                <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
                Clear All Data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Are you sure?</span>
                <button onClick={handleClear} className="text-sm font-medium px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#CC3333] text-white transition-colors">Yes, clear it</button>
                <button onClick={() => setShowClearConfirm(false)} className="text-sm font-medium px-4 py-2 rounded-xl border border-[#2A2F38] text-slate-400 hover:bg-[#1F2630] transition-colors">Cancel</button>
              </div>
            )}
          </div>

          {dataMsg && (
            <p className={`mt-4 text-sm px-3 py-2 rounded-lg ${msgCls(dataMsg.type)}`}>{dataMsg.text}</p>
          )}
        </div>

        {/* About */}
        <div className={cardCls}>
          <h3 className={sectionTitle}>About</h3>
          <div className="space-y-2 text-sm text-slate-500">
            <div className="flex justify-between py-1"><span>Platform</span><span className="text-slate-300">Arthniti</span></div>
            <div className="flex justify-between py-1"><span>Network</span><span className="text-slate-300">Algorand Testnet</span></div>
            <div className="flex justify-between py-1"><span>Wallet</span><span className="text-slate-300">Pera Wallet</span></div>
            <div className="flex justify-between py-1"><span>ALGO Rate</span><span className="text-[#2962FF] font-medium">₹{ALGO_TO_INR.toLocaleString()} / ALGO</span></div>
          </div>
        </div>
    </div>
  );
}
