import React from 'react';

interface FinanceTemplate {
  sector: string;
  name: string;
  objective: string;
  steps: string[];
  cadence: string;
}

const templates: FinanceTemplate[] = [
  {
    sector: 'Budgeting',
    name: '50/30/20 Budget Planner',
    objective: 'Control monthly spending and enforce savings-first behavior.',
    cadence: 'Weekly review',
    steps: [
      'Log net monthly income.',
      'Assign limits for Needs (50%), Wants (30%), Savings/Investing (20%).',
      'Track actuals from transactions and compute variance.',
      'Create 2 corrective actions for next week.',
    ],
  },
  {
    sector: 'Debt',
    name: 'Debt Avalanche Planner',
    objective: 'Minimize total interest by prioritizing high-rate debt first.',
    cadence: 'Bi-weekly review',
    steps: [
      'List all debts with rates, EMI, and outstanding.',
      'Sort by interest rate descending.',
      'Pay minimum on all loans, add surplus to highest-rate loan.',
      'Recalculate debt-free date after each prepayment.',
    ],
  },
  {
    sector: 'Investing',
    name: 'Asset Allocation Rebalance Template',
    objective: 'Align portfolio with risk profile and reduce concentration risk.',
    cadence: 'Monthly review',
    steps: [
      'Capture current allocation by equity/debt/gold/cash.',
      'Define ideal target mix based on risk profile.',
      'Compute gap % by asset class.',
      'Adjust SIP split to close gaps over next 3 months.',
    ],
  },
  {
    sector: 'Tax',
    name: 'Tax-Saving Action Sheet',
    objective: 'Maximize legal deductions and avoid year-end tax rush.',
    cadence: 'Monthly review',
    steps: [
      'Pick old/new regime using projected annual income.',
      'Track deduction utilization (80C, NPS, health insurance, etc.).',
      'Upload proofs each month to employer portal.',
      'Run quarterly tax estimate and update investment plan.',
    ],
  },
  {
    sector: 'Insurance',
    name: 'Protection Coverage Planner',
    objective: 'Ensure adequate life and health cover for dependents.',
    cadence: 'Quarterly review',
    steps: [
      'Estimate required life cover (income replacement + liabilities).',
      'Map current term and health policies.',
      'Identify shortfall and get comparative quotes.',
      'Track renewals, nominees, and policy document vault.',
    ],
  },
  {
    sector: 'Retirement',
    name: 'Retirement Corpus Roadmap',
    objective: 'Estimate retirement corpus and annual contribution target.',
    cadence: 'Quarterly review',
    steps: [
      'Set retirement age and expected monthly expense at retirement.',
      'Apply inflation and life expectancy assumptions.',
      'Compute required corpus and projected corpus at current SIP.',
      'Increase SIP contribution by a fixed step-up percentage yearly.',
    ],
  },
];

const SECTOR_COLOR: Record<string, string> = {
  Budgeting: '#22C55E', Debt: '#EF4444', Investing: '#2962FF',
  Tax: '#F59E0B', Insurance: '#8B5CF6', Retirement: '#06B6D4',
};

export default function Templates() {
  return (
    <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Finance Templates</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sector-wise templates for budgeting, debt, investing, tax, insurance, and retirement planning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <article key={template.name} className="bg-[#161B22] border border-[#2A2F38] rounded-xl p-5 hover:border-[#3a4a5f] transition-colors">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p
                  className="text-xs uppercase tracking-wide font-bold"
                  style={{ color: SECTOR_COLOR[template.sector] ?? '#2962FF' }}
                >
                  {template.sector}
                </p>
                <span className="text-xs text-slate-500">{template.cadence}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-100">{template.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{template.objective}</p>
              <ol className="mt-3 space-y-1.5">
                {template.steps.map((step, index) => (
                  <li key={step} className="text-xs text-slate-300 flex items-start gap-2">
                    <span
                      className="mt-0.5 size-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: `${SECTOR_COLOR[template.sector] ?? '#2962FF'}20`, color: SECTOR_COLOR[template.sector] ?? '#2962FF' }}
                    >
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
    </div>
  );
}
