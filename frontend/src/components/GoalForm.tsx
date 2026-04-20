import { useState, useEffect } from 'react';
import type { FinancialGoal } from '../types/wealthTypes';
import GoalAgentPlan from './GoalAgentPlan';

// ─── localStorage helpers ────────────────────────────────────────────────────
const GOALS_KEY = 'predx-finance-goals';

function loadGoals(): FinancialGoal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGoals(goals: FinancialGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

// ─── Static data ─────────────────────────────────────────────────────────────
const categories: { value: FinancialGoal['category']; label: string; icon: string }[] = [
  { value: 'retirement',     label: 'Retirement',     icon: '🏖️' },
  { value: 'home',           label: 'Home Purchase',  icon: '🏠' },
  { value: 'education',      label: 'Education',      icon: '🎓' },
  { value: 'emergency_fund', label: 'Emergency Fund', icon: '🛡️' },
  { value: 'vehicle',        label: 'Vehicle',        icon: '🚗' },
  { value: 'travel',         label: 'Travel',         icon: '✈️' },
  { value: 'wedding',        label: 'Wedding',        icon: '💍' },
  { value: 'other',          label: 'Other',          icon: '🎯' },
];

const priorities: { value: FinancialGoal['priority']; label: string; activeCls: string }[] = [
  { value: 'high',   label: 'High',   activeCls: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30' },
  { value: 'medium', label: 'Medium', activeCls: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30' },
  { value: 'low',    label: 'Low',    activeCls: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30' },
];

const defaultForm = {
  title: '',
  category: 'other' as FinancialGoal['category'],
  targetAmount: '',
  currentSavings: '',
  targetDate: '',
  priority: 'medium' as FinancialGoal['priority'],
  notes: '',
};

function getCategoryIcon(cat: FinancialGoal['category']) {
  return categories.find(c => c.value === cat)?.icon ?? '🎯';
}
function getCategoryLabel(cat: FinancialGoal['category']) {
  return categories.find(c => c.value === cat)?.label ?? 'Other';
}
function getPriorityStyle(p: FinancialGoal['priority']) {
  const found = priorities.find(x => x.value === p);
  return found?.activeCls ?? 'bg-[#2A2F38] text-slate-400 border-[#2A2F38]';
}

// ─── Component ────────────────────────────────────────────────────────────────
interface GoalFormProps {
  onGoalsChanged?: (goals: FinancialGoal[]) => void;
}

export default function GoalForm({ onGoalsChanged }: GoalFormProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  useEffect(() => {
    const loaded = loadGoals();
    setGoals(loaded);
  }, []);

  const persistGoals = (updated: FinancialGoal[]) => {
    setGoals(updated);
    saveGoals(updated);
    onGoalsChanged?.(updated);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Goal title is required';
    if (!form.targetAmount || Number(form.targetAmount) <= 0) errs.targetAmount = 'Enter a valid target amount';
    if (Number(form.currentSavings) < 0) errs.currentSavings = 'Cannot be negative';
    if (!form.targetDate) errs.targetDate = 'Target date is required';
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    const entry: FinancialGoal = {
      id: editingId ?? crypto.randomUUID(),
      title: form.title.trim(),
      category: form.category,
      targetAmount: Number(form.targetAmount),
      currentSavings: Number(form.currentSavings) || 0,
      targetDate: form.targetDate,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
    };

    const updated = editingId
      ? goals.map(g => g.id === editingId ? entry : g)
      : [...goals, entry];

    persistGoals(updated);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      category: goal.category,
      targetAmount: String(goal.targetAmount),
      currentSavings: String(goal.currentSavings),
      targetDate: goal.targetDate,
      priority: goal.priority,
      notes: goal.notes ?? '',
    });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    persistGoals(goals.filter(g => g.id !== id));
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(defaultForm);
    setErrors({});
  };

  const inputCls = (field: string) =>
    `w-full bg-[#0E1117] border ${errors[field] ? 'border-[#EF4444]' : 'border-[#2A2F38]'} rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF] transition-colors`;

  const selectCls =
    'w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#2962FF] transition-colors';

  return (
    <div className="space-y-8">
      {/* ── Monthly Financials (context for AI Planner) ── */}
      <div className="bg-[#161B22] border border-[#2A2F38] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[#00FFA3] text-lg">account_balance</span>
          <h3 className="text-sm font-bold text-slate-300">Your Monthly Financials <span className="text-slate-600 font-normal text-xs">(used by AI Goal Planner)</span></h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Monthly Income (₹)</label>
            <input
              type="number"
              value={monthlyIncome || ''}
              onChange={e => setMonthlyIncome(Number(e.target.value) || 0)}
              placeholder="e.g. 80000"
              min="0"
              className="w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Monthly Expenses (₹)</label>
            <input
              type="number"
              value={monthlyExpenses || ''}
              onChange={e => setMonthlyExpenses(Number(e.target.value) || 0)}
              placeholder="e.g. 50000"
              min="0"
              className="w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF] transition-colors"
            />
          </div>
        </div>
        {monthlyIncome > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            Disposable income: <span className="text-[#22C55E] font-bold">₹{Math.max(0, monthlyIncome - monthlyExpenses).toLocaleString('en-IN')}/mo</span>
          </p>
        )}
      </div>

      {/* ── Form ── */}
      <div className="bg-[#161B22] border border-[#2A2F38] rounded-2xl p-6">
        <h2 className="text-base font-bold text-slate-100 mb-5">
          {editingId ? 'Edit Financial Goal' : 'Add Financial Goal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Goal Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Buy a house in Mumbai"
                className={inputCls('title')}
              />
              {errors.title && <p className="text-[#EF4444] text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value as FinancialGoal['category'] })}
                className={selectCls}
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as FinancialGoal['priority'] })}
                className={selectCls}
              >
                {priorities.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Target Amount (₹)</label>
              <input
                type="number"
                value={form.targetAmount}
                onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="0"
                min="0"
                className={inputCls('targetAmount')}
              />
              {errors.targetAmount && <p className="text-[#EF4444] text-xs mt-1">{errors.targetAmount}</p>}
            </div>

            {/* Current Savings */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Current Savings (₹)</label>
              <input
                type="number"
                value={form.currentSavings}
                onChange={e => setForm({ ...form, currentSavings: e.target.value })}
                placeholder="0"
                min="0"
                className={inputCls('currentSavings')}
              />
              {errors.currentSavings && <p className="text-[#EF4444] text-xs mt-1">{errors.currentSavings}</p>}
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Target Date</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
                className={inputCls('targetDate')}
              />
              {errors.targetDate && <p className="text-[#EF4444] text-xs mt-1">{errors.targetDate}</p>}
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Notes <span className="normal-case opacity-50">(optional)</span></label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Any additional details about this goal..."
                className={selectCls + ' resize-none'}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-[#2962FF] hover:bg-[#2255DD] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {editingId ? 'Update Goal' : 'Add Goal'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-[#1F2630] hover:bg-[#2A2F38] text-slate-400 text-sm font-semibold px-5 py-2.5 rounded-xl border border-[#2A2F38] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Goals Grid ── */}
      {goals.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-100 mb-4">Your Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const progress = goal.targetAmount > 0
                ? Math.min((goal.currentSavings / goal.targetAmount) * 100, 100)
                : 0;
              const remaining = goal.targetAmount - goal.currentSavings;
              const targetDate = new Date(goal.targetDate);
              const today = new Date();
              const monthsLeft = Math.max(0,
                (targetDate.getFullYear() - today.getFullYear()) * 12 +
                (targetDate.getMonth() - today.getMonth())
              );

              return (
                <div
                  key={goal.id}
                  className={`bg-[#161B22] rounded-2xl border p-5 transition-all ${editingId === goal.id ? 'border-[#2962FF]/50 shadow-[0_0_20px_rgba(41,98,255,0.1)]' : 'border-[#2A2F38] hover:border-[#3a4a5f]'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">{goal.title}</h3>
                        <p className="text-xs text-slate-500">{getCategoryLabel(goal.category)}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${getPriorityStyle(goal.priority)}`}>
                      {goal.priority}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-medium text-slate-300">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#2A2F38] rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-[#22C55E]' : progress >= 50 ? 'bg-[#2962FF]' : 'bg-[#F59E0B]'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-500">₹{goal.currentSavings.toLocaleString('en-IN')}</span>
                      <span className="text-slate-400 font-medium">₹{goal.targetAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span className="font-medium text-slate-300">₹{Math.max(0, remaining).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Date</span>
                      <span className="font-medium text-slate-300">{targetDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                    </div>
                    {monthsLeft > 0 && (
                      <div className="flex justify-between">
                        <span>Time Left</span>
                        <span className="font-medium text-slate-300">{monthsLeft} months</span>
                      </div>
                    )}
                    {monthsLeft > 0 && remaining > 0 && (
                      <div className="flex justify-between">
                        <span>Monthly Needed</span>
                        <span className="font-medium text-[#2962FF]">₹{(remaining / monthsLeft).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                  </div>

                  {goal.notes && (
                    <p className="mt-3 text-xs text-slate-500 italic border-t border-[#2A2F38] pt-2">{goal.notes}</p>
                  )}

                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#2A2F38]">
                    <button
                      onClick={() => handleEdit(goal)}
                      className="flex-1 text-center text-[#2962FF] hover:text-white text-xs font-medium py-1.5 rounded-lg hover:bg-[#2962FF]/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="flex-1 text-center text-[#EF4444]/70 hover:text-[#EF4444] text-xs font-medium py-1.5 rounded-lg hover:bg-[#EF4444]/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {/* ── AI Goal Planner ── */}
                  <GoalAgentPlan
                    goal={goal}
                    monthlyIncome={monthlyIncome}
                    monthlyExpenses={monthlyExpenses}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="bg-[#161B22] border border-[#2A2F38] rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-sm text-slate-500">No financial goals added yet. Add your first goal above.</p>
        </div>
      )}
    </div>
  );
}
