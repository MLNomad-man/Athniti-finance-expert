import React, { useState } from 'react';
import type { FinancialGoal } from '../types/wealthTypes';
import { API_BASE_URL } from '../config';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

interface Instrument {
  name: string;
  allocation_pct: number;
  monthly_amount: number;
  expected_return: number;
  data_source: string;
  why?: string;
}

interface Milestone {
  month: number;
  corpus: number;
  progress_pct: number;
}

interface RiskPlan {
  monthly_sip: number;
  blended_return: number;
  is_achievable: boolean;
  revised_months?: number | null;
  sentiment_warning?: string | null;
  instruments: Instrument[];
  milestones: Milestone[];
}

interface GoalAgentResponse {
  goal_amount: number;
  amount_needed: number;
  disposable: number;
  duration_months: number;
  recommended_plan: string;
  inflation_rate: number;
  market_sentiment: { sentiment: string; score: number; note?: string };
  plans: Record<string, RiskPlan>;
  narrative?: string;
  data_fetched_at?: string;
  error?: string;
}

interface GoalAgentPlanProps {
  goal: FinancialGoal;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const RISK_TAB_STYLE: Record<string, { active: string; label: string }> = {
  low:    { active: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30', label: 'Low Risk' },
  medium: { active: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30', label: 'Medium Risk' },
  high:   { active: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30', label: 'High Risk' },
};

const SENTIMENT_STYLE: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  bullish: { label: 'Bullish', color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', icon: 'trending_up' },
  bearish: { label: 'Bearish', color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', icon: 'trending_down' },
  neutral: { label: 'Neutral', color: 'text-[#2962FF]', bg: 'bg-[#2962FF]/15', icon: 'trending_flat' },
};

export default function GoalAgentPlan({ goal, monthlyIncome, monthlyExpenses }: GoalAgentPlanProps) {
  const [result, setResult] = useState<GoalAgentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRisk, setActiveRisk] = useState<string>('medium');
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high' | 'all'>('all');

  const analyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/goal-planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, monthlyIncome, monthlyExpenses, riskTolerance }),
      });
      const data: GoalAgentResponse = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setActiveRisk(data.recommended_plan || 'medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  // ── Trigger button (before analysis) ──────────────────────────────────────
  if (!result && !loading && !error) {
    return (
      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[#2A2F38]">
        <select
          value={riskTolerance}
          onChange={(e) => setRiskTolerance(e.target.value as typeof riskTolerance)}
          className="bg-[#0E1117] border border-[#2A2F38] text-slate-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2962FF] transition-colors"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk Only</option>
          <option value="medium">Medium Risk Only</option>
          <option value="high">High Risk Only</option>
        </select>
        <button
          onClick={analyze}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-[#2962FF] to-[#5B89FF] hover:from-[#2255DD] hover:to-[#4a78ee] text-white text-xs font-semibold rounded-lg transition-all shadow-lg shadow-[#2962FF]/20"
        >
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          AI Goal Plan
        </button>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-4 bg-[#0E1117] border border-[#2A2F38] rounded-xl p-6">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-[#2962FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Generating personalised investment plans via AI...</span>
        </div>
        <p className="text-center text-xs text-slate-600 mt-2">Analysing risk profiles & computing SIP targets</p>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mt-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4">
        <p className="text-sm text-[#EF4444] font-medium">Failed to generate plan</p>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <button onClick={analyze} className="mt-2 text-xs text-[#2962FF] underline">Retry</button>
      </div>
    );
  }

  if (!result) return null;

  const plans = result.plans ?? {};
  const planKeys = Object.keys(plans);
  const activePlan: RiskPlan | undefined = plans[activeRisk];
  const sentiment = result.market_sentiment;
  const sentStyle = SENTIMENT_STYLE[sentiment?.sentiment] ?? SENTIMENT_STYLE.neutral;

  return (
    <div className="mt-4 bg-[#0E1117] border border-[#2962FF]/20 rounded-xl p-5 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#2962FF] text-lg">auto_awesome</span>
          <h4 className="font-bold text-slate-100 text-sm">AI Investment Plan</h4>
          <span className="text-[9px] bg-[#2962FF]/20 text-[#2962FF] border border-[#2962FF]/30 px-1.5 py-0.5 rounded font-bold tracking-wider">BETA</span>
        </div>
        <div className="flex items-center gap-2">
          {sentiment && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sentStyle.bg} ${sentStyle.color}`}>
              <span className="material-symbols-outlined text-sm">{sentStyle.icon}</span>
              {sentStyle.label} ({sentiment.score})
            </div>
          )}
          <button
            onClick={analyze}
            className="px-2.5 py-1 bg-[#161B22] hover:bg-[#2A2F38] text-slate-400 text-xs rounded-lg border border-[#2A2F38] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Overview stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Target', value: inr(result.goal_amount), color: 'text-slate-100' },
          { label: 'Still Need', value: inr(result.amount_needed), color: 'text-[#EF4444]' },
          { label: 'Disposable', value: inr(result.disposable), color: 'text-[#22C55E]' },
          { label: 'Duration', value: `${result.duration_months} mo`, color: 'text-[#2962FF]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161B22] rounded-lg p-2.5 text-center border border-[#2A2F38]">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Risk tabs ── */}
      {planKeys.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {planKeys.map((key) => {
            const style = RISK_TAB_STYLE[key] ?? RISK_TAB_STYLE.medium;
            const isActive = key === activeRisk;
            const isRecommended = key === result.recommended_plan;
            return (
              <button
                key={key}
                onClick={() => setActiveRisk(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isActive ? style.active : 'bg-[#161B22] text-slate-400 border-[#2A2F38] hover:bg-[#2A2F38]'
                }`}
              >
                {style.label}
                {isRecommended && <span className="ml-1 text-[#00FFA3] font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active plan ── */}
      {activePlan && (
        <div className="space-y-4">
          {/* SIP + achievability hero */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-[#161B22] border border-[#2962FF]/30 rounded-lg px-4 py-2.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Monthly SIP Required</span>
              <p className="text-xl font-bold text-[#2962FF] mt-0.5">{inr(activePlan.monthly_sip)}</p>
            </div>
            <div className="bg-[#161B22] border border-[#22C55E]/30 rounded-lg px-4 py-2.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Blended Return</span>
              <p className="text-xl font-bold text-[#22C55E] mt-0.5">{activePlan.blended_return?.toFixed(1)}% p.a.</p>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              activePlan.is_achievable
                ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
            }`}>
              {activePlan.is_achievable ? '✓ Achievable' : `Needs ~${activePlan.revised_months ?? '?'} months`}
            </span>
          </div>

          {activePlan.sentiment_warning && (
            <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-3 text-xs text-[#F59E0B]">
              ⚠ {activePlan.sentiment_warning}
            </div>
          )}

          {/* Instruments */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instrument Allocation</p>
            <div className="space-y-2">
              {(activePlan.instruments ?? []).map((inst) => (
                <div key={inst.name} className="bg-[#161B22] border border-[#2A2F38] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-200">{inst.name}</span>
                    <span className="text-sm font-bold text-[#2962FF]">{inr(inst.monthly_amount)}<span className="text-xs font-normal text-slate-500">/mo</span></span>
                  </div>
                  {/* Allocation bar */}
                  <div className="w-full h-1 bg-[#2A2F38] rounded-full mb-1.5 overflow-hidden">
                    <div className="h-1 bg-[#2962FF] rounded-full" style={{ width: `${inst.allocation_pct}%` }} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{inst.allocation_pct}% allocation</span>
                    <span>{inst.expected_return}% p.a.</span>
                    <span className="text-slate-600">{inst.data_source}</span>
                  </div>
                  {inst.why && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{inst.why}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          {(activePlan.milestones ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Projected Milestones</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {activePlan.milestones.map((m) => (
                  <div key={m.month} className="flex-shrink-0 bg-[#161B22] border border-[#2A2F38] rounded-lg p-3 min-w-[110px] text-center">
                    <p className="text-[10px] text-slate-500">Month {m.month}</p>
                    <p className="text-sm font-bold text-slate-100 mt-0.5">{inr(m.corpus)}</p>
                    <div className="w-full h-1 bg-[#2A2F38] rounded-full mt-1.5 overflow-hidden">
                      <div className="h-1 bg-[#00FFA3] rounded-full" style={{ width: `${Math.min(m.progress_pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{m.progress_pct?.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Narrative ── */}
      {result.narrative && (
        <div className="bg-[#2962FF]/10 border border-[#2962FF]/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-sm text-[#2962FF]">psychology</span>
            <p className="text-[10px] font-bold text-[#2962FF] uppercase tracking-widest">AI Analysis</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{result.narrative}</p>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center gap-3 text-[10px] text-slate-600 pt-2 border-t border-[#2A2F38] flex-wrap">
        {result.inflation_rate && <span>Inflation assumed: {result.inflation_rate}%</span>}
        {result.data_fetched_at && <span>Generated: {new Date(result.data_fetched_at).toLocaleString('en-IN')}</span>}
      </div>
    </div>
  );
}
