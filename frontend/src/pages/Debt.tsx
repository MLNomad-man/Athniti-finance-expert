import React, { useState, useEffect } from 'react';
import DonutChart from '../components/DonutChart';
import type { DebtEntry } from '../types/wealthTypes';

// ─── localStorage ─────────────────────────────────────────────────────────────
const DEBTS_KEY = 'predx-finance-debts';
const INCOME_KEY = 'predx-finance-monthly-income';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function loadDebts(): DebtEntry[] {
  try { return JSON.parse(localStorage.getItem(DEBTS_KEY) ?? '[]'); } catch { return []; }
}
function saveDebts(d: DebtEntry[]) { localStorage.setItem(DEBTS_KEY, JSON.stringify(d)); }
function loadIncome(): number {
  return Number(localStorage.getItem(INCOME_KEY) ?? '0');
}
function saveIncome(v: number) { localStorage.setItem(INCOME_KEY, String(v)); }

const defaultForm = {
  name: '', loanType: 'personal_loan', bank: '',
  principal: '', outstanding: '', emi: '',
  interestRate: '', startDate: '', endDate: '', tenureMonths: '',
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Debt() {
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [incomeInput, setIncomeInput] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setDebts(loadDebts());
    const inc = loadIncome();
    setMonthlyIncome(inc);
    setIncomeInput(inc ? String(inc) : '');
  }, []);

  const persist = (d: DebtEntry[]) => { setDebts(d); saveDebts(d); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.principal || Number(form.principal) <= 0) e.principal = 'Principal required';
    if (!form.outstanding || Number(form.outstanding) < 0) e.outstanding = 'Outstanding required';
    if (!form.emi || Number(form.emi) <= 0) e.emi = 'EMI required';
    if (!form.interestRate) e.interestRate = 'Rate required';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const entry: DebtEntry = {
      id: editId ?? crypto.randomUUID(),
      name: form.name.trim(), loanType: form.loanType, bank: form.bank.trim(),
      principal: Number(form.principal), outstanding: Number(form.outstanding),
      emi: Number(form.emi), interestRate: Number(form.interestRate),
      startDate: form.startDate, endDate: form.endDate, tenureMonths: Number(form.tenureMonths) || 0,
    };

    persist(editId ? debts.map(d => d.id === editId ? entry : d) : [...debts, entry]);
    setEditId(null);
    setForm(defaultForm);
    setShowForm(false);
  };

  const handleEdit = (d: DebtEntry) => {
    setEditId(d.id);
    setForm({
      name: d.name, loanType: d.loanType, bank: d.bank,
      principal: String(d.principal), outstanding: String(d.outstanding),
      emi: String(d.emi), interestRate: String(d.interestRate),
      startDate: d.startDate, endDate: d.endDate, tenureMonths: String(d.tenureMonths),
    });
    setShowForm(true);
    setErrors({});
  };

  const handleSaveIncome = () => {
    const v = Number(incomeInput);
    setMonthlyIncome(v);
    saveIncome(v);
  };

  const totalOutstanding = debts.reduce((s, d) => s + d.outstanding, 0);
  const totalEMI = debts.reduce((s, d) => s + d.emi, 0);
  const dtiPct = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

  const inputCls = (f: string) =>
    `w-full bg-[#0E1117] border ${errors[f] ? 'border-[#EF4444]' : 'border-[#2A2F38]'} rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF]`;

  return (
    <div className="space-y-8">
      {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Debt Overview</h2>
            <p className="text-sm text-slate-500 mt-0.5">Track your loans and EMIs.</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm(defaultForm); setErrors({}); }}
            className="bg-[#2962FF] hover:bg-[#2255DD] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'Add Loan'}
          </button>
        </div>

        {/* Monthly Income Input */}
        <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
          <h3 className="font-bold text-slate-100 mb-3">Monthly Income (for DTI ratio)</h3>
          <div className="flex gap-3">
            <input
              type="number"
              value={incomeInput}
              onChange={e => setIncomeInput(e.target.value)}
              placeholder="e.g., 80000"
              className="flex-1 bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF]"
            />
            <button
              onClick={handleSaveIncome}
              className="px-4 py-2.5 bg-[#2A2F38] hover:bg-[#3a4a5f] text-slate-200 text-sm font-semibold rounded-xl border border-[#3a4a5f] transition-colors"
            >
              Save
            </button>
          </div>
          {monthlyIncome > 0 && <p className="text-xs text-slate-500 mt-2">Monthly income: {inr(monthlyIncome)}</p>}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-2xl p-6">
            <h3 className="font-bold text-slate-100 mb-5">{editId ? 'Edit Loan' : 'Add New Loan'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Loan Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Home Loan" className={inputCls('name')} />
                {errors.name && <p className="text-[#EF4444] text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Loan Type</label>
                <select value={form.loanType} onChange={e => setForm({ ...form, loanType: e.target.value })} className={inputCls('loanType')}>
                  <option value="home_loan">Home Loan</option>
                  <option value="personal_loan">Personal Loan</option>
                  <option value="car_loan">Car Loan</option>
                  <option value="education_loan">Education Loan</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Bank / Lender</label>
                <input type="text" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} placeholder="e.g., HDFC Bank" className={inputCls('bank')} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Principal (₹)</label>
                <input type="number" value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} placeholder="0" className={inputCls('principal')} />
                {errors.principal && <p className="text-[#EF4444] text-xs mt-1">{errors.principal}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Outstanding (₹)</label>
                <input type="number" value={form.outstanding} onChange={e => setForm({ ...form, outstanding: e.target.value })} placeholder="0" className={inputCls('outstanding')} />
                {errors.outstanding && <p className="text-[#EF4444] text-xs mt-1">{errors.outstanding}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Monthly EMI (₹)</label>
                <input type="number" value={form.emi} onChange={e => setForm({ ...form, emi: e.target.value })} placeholder="0" className={inputCls('emi')} />
                {errors.emi && <p className="text-[#EF4444] text-xs mt-1">{errors.emi}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Interest Rate (%)</label>
                <input type="number" step="0.1" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} placeholder="e.g., 8.5" className={inputCls('interestRate')} />
                {errors.interestRate && <p className="text-[#EF4444] text-xs mt-1">{errors.interestRate}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Tenure (months)</label>
                <input type="number" value={form.tenureMonths} onChange={e => setForm({ ...form, tenureMonths: e.target.value })} placeholder="e.g., 240" className={inputCls('tenureMonths')} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inputCls('startDate')} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputCls('endDate')} />
              </div>
              <div className="sm:col-span-2 flex gap-3 pt-2">
                <button type="submit" className="bg-[#2962FF] hover:bg-[#2255DD] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  {editId ? 'Update Loan' : 'Add Loan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary cards */}
        {debts.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <p className="text-xs text-slate-500">Total Outstanding</p>
                <p className="text-xl font-bold text-[#EF4444] mt-1">{inr(totalOutstanding)}</p>
              </div>
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <p className="text-xs text-slate-500">Total Monthly EMI</p>
                <p className="text-xl font-bold text-slate-100 mt-1">{inr(totalEMI)}</p>
              </div>
              <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                <p className="text-xs text-slate-500">DTI Ratio</p>
                <p className={`text-xl font-bold mt-1 ${dtiPct > 40 ? 'text-[#EF4444]' : dtiPct > 25 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                  {monthlyIncome > 0 ? `${dtiPct.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-1">{dtiPct > 40 ? 'High risk' : dtiPct > 25 ? 'Moderate' : 'Healthy'}</p>
              </div>
            </div>

            {/* Donut charts */}
            {debts.map(loan => {
              const repaid = Math.max(loan.principal - loan.outstanding, 0);
              const dti = monthlyIncome > 0 ? (loan.emi / monthlyIncome) * 100 : 0;
              return (
                <div key={loan.id} className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-100">{loan.name}</h3>
                      <p className="text-xs text-slate-500">{loan.bank} · {loan.interestRate}% p.a.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(loan)} className="text-xs text-[#2962FF] hover:underline">Edit</button>
                      <button onClick={() => persist(debts.filter(d => d.id !== loan.id))} className="text-xs text-[#EF4444]/70 hover:text-[#EF4444]">Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                    <div><p className="text-xs text-slate-500">Outstanding</p><p className="font-bold text-[#EF4444]">{inr(loan.outstanding)}</p></div>
                    <div><p className="text-xs text-slate-500">Principal</p><p className="font-bold text-slate-100">{inr(loan.principal)}</p></div>
                    <div><p className="text-xs text-slate-500">EMI</p><p className="font-bold text-slate-100">{inr(loan.emi)}</p></div>
                    <div><p className="text-xs text-slate-500">Rate</p><p className="font-bold text-[#2962FF]">{loan.interestRate}%</p></div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300 mb-3">Loan Progress</h4>
                      <DonutChart
                        segments={[
                          { label: 'Outstanding', value: loan.outstanding, color: '#EF4444' },
                          { label: 'Repaid', value: repaid, color: '#22C55E' },
                        ]}
                        centerLabel="Tenure"
                        centerValue={`${loan.tenureMonths}m`}
                        valueFormatter={inr}
                        size={160}
                      />
                    </div>
                    {monthlyIncome > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 mb-3">Debt Burden (DTI)</h4>
                        <DonutChart
                          segments={[
                            { label: 'EMI', value: Math.min(dti, 100), color: '#F59E0B' },
                            { label: 'Remaining', value: Math.max(100 - Math.min(dti, 100), 0), color: '#2962FF' },
                          ]}
                          centerLabel="DTI"
                          centerValue={`${dti.toFixed(1)}%`}
                          valueFormatter={v => `${v.toFixed(0)}%`}
                          size={160}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {debts.length === 0 && !showForm && (
          <div className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-600">account_balance</span>
            <p className="text-slate-400 mt-3 font-medium">No loans added yet</p>
            <p className="text-sm text-slate-500 mt-1">Click "Add Loan" to track your debt.</p>
          </div>
        )}
      </div>
  );
}
