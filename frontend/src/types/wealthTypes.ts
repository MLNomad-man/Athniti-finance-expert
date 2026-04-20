// ─── Wealth / Finance Types for PredX Finance Pages ─────────────────────────
// Adapted from src_ref (AA bank types removed — uses Pera Wallet instead)

export interface FinancialGoal {
  id: string;
  title: string;
  category:
    | 'retirement'
    | 'home'
    | 'education'
    | 'emergency_fund'
    | 'vehicle'
    | 'travel'
    | 'wedding'
    | 'other';
  targetAmount: number;        // INR
  currentSavings: number;      // INR
  targetDate: string;          // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface DebtEntry {
  id: string;
  name: string;               // e.g. "Home Loan", "Personal Loan"
  loanType: string;
  bank: string;
  principal: number;          // INR
  outstanding: number;        // INR
  emi: number;                // INR per month
  interestRate: number;       // %
  startDate: string;          // YYYY-MM-DD
  endDate: string;            // YYYY-MM-DD
  tenureMonths: number;
}

export interface ExpenseEntry {
  id: string;
  description: string;
  category: string;
  amount: number;           // INR
  date: string;             // YYYY-MM-DD
  type: 'need' | 'want' | 'other';
}

export interface GoalStrategy {
  goalId: string;
  goalTitle: string;
  targetAmount: number;
  currentSavings: number;
  monthsRemaining: number;
  requiredMonthlySaving: number;
  recommendedAllocation: AllocationItem[];
  projectedValue: number;
  feasibility: 'on_track' | 'achievable' | 'stretch' | 'difficult';
  rationale: string;
  actionSteps: string[];
}

export interface AllocationItem {
  instrument: string;
  percentage: number;
  expectedReturn: number;
  reason: string;
}

export interface EducationVideo {
  title: string;
  url: string;
}

export interface EducationTrack {
  sector: string;
  description: string;
  channelHint: string;
  videos: EducationVideo[];
}
