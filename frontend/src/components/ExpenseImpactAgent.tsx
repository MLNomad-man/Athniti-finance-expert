import React, { useState, useEffect, useRef } from 'react';
import type { FinancialGoal } from '../types/wealthTypes';

const GOALS_KEY = 'predx-finance-goals';
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2'; // Usually llama3 or llama3.2 is standard for ollama local runs

function loadGoals(): FinancialGoal[] {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ExpenseImpactAgent() {
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleSpeak = () => {
    if (!analysis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const cleanText = analysis.replace(/[*#_•]/g, '').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDescription) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const goals = loadGoals();
    
    // Create prompt for Ollama
    const activeGoalsContext = goals.map(g => 
      `- ${g.title} (${g.category}): Target ₹${g.targetAmount}, Currently Saved: ₹${g.currentSavings}, Needed by: ${g.targetDate}, Priority: ${g.priority}`
    ).join('\n');

    const prompt = `You are a highly analytical quantitative financial advisor API. Return a purely data-driven, numbers-heavy analysis.
The user wants to spend ₹${expenseAmount} on "${expenseDescription}".

User's active goals:
${activeGoalsContext || 'No active goals recorded.'}

Your response must focus strictly on numbers, percentages, and metrics. Do NOT use long narrative text or fluff.
1. Calculate the exact percentage impact of this ₹${expenseAmount} expense against the target amount of the highest priority goal.
2. Estimate the mathematical delay (in weeks or months) this causes for their top goals.
3. Show the opportunity cost: what would ₹${expenseAmount} turn into if invested at 12% APY over 5 years?
Use bullet points. Start lines with numbers or metrics. Highlight data in bold. Keep it under 150 words. Do not use markdown headers.`;

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false // Using non-streaming for simpler state management
        }),
      });

      if (!response.ok) {
        throw new Error('Could not connect to Ollama. Ensure Ollama is running locally.');
      }

      const data = await response.json();
      setAnalysis(data.response);
    } catch (err: any) {
      console.error('Ollama connection error:', err);
      setError(err.message || 'Failed to connect to local Ollama instance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden h-full flex flex-col">
      <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-3 bg-gradient-to-r from-emerald-500/5 to-transparent">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-on-surface">Expense Impact Agent</h3>
          <p className="text-[10px] text-emerald-400 font-bold">Goal Evaluator | Local AI</p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <form onSubmit={handleAnalyze} className="space-y-4 mb-5">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Thinking of making a large purchase? Enter the details below to see how it impacts your active financial goals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1.5">Expense Amount (₹)</label>
              <input
                type="number"
                min="1"
                required
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mb-1.5">Description</label>
              <input
                type="text"
                required
                value={expenseDescription}
                onChange={e => setExpenseDescription(e.target.value)}
                placeholder="e.g. New iPhone"
                className="w-full bg-[#0E1117] border border-[#2A2F38] rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#2962FF] transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            )}
            {loading ? 'Analyzing Impact...' : 'Analyze Impact'}
          </button>
        </form>

        <div className="flex-1 bg-surface-container-low rounded-xl border border-outline-variant/5 p-4 min-h-[160px] overflow-y-auto custom-scrollbar">
          {!analysis && !loading && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <span className="material-symbols-outlined text-3xl mb-2 text-slate-500">search_insights</span>
              <p className="text-xs text-slate-400">Awaiting your input to analyze goal impact.</p>
            </div>
          )}

          {error && (
            <div className="h-full flex flex-col items-center justify-center text-center bg-red-500/5 rounded-lg p-3 border border-red-500/10">
              <span className="material-symbols-outlined text-red-400 mb-1">warning</span>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {analysis && (
            <div className="relative">
              <button
                onClick={handleSpeak}
                className={`absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  isSpeaking
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/25 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                    : 'bg-[#00FFA3]/10 text-[#00FFA3] border-[#00FFA3]/30 hover:bg-[#00FFA3]/20 shadow-[0_0_12px_rgba(0,255,163,0.1)]'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read report aloud'}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isSpeaking ? 'stop_circle' : 'volume_up'}
                </span>
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>
              <div className="animate-fade-in text-sm text-on-surface leading-relaxed whitespace-pre-wrap mt-8">
                {analysis}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
