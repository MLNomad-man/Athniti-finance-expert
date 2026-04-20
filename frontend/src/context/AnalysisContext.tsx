import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface HistoryRecord {
  id: number;
  filename: string;
  summary: string;
  chartData: ChartSegment[];
  totalSpend: number;
  topCategory: string;
}

interface AnalysisState {
  aiChartData: ChartSegment[];
  setAiChartData: (data: ChartSegment[]) => void;
  rawTransactions: any[];
  setRawTransactions: (data: any[]) => void;
  aiSummary: string;
  setAiSummary: (summary: string) => void;
  isThinking: boolean;
  setIsThinking: (v: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  isDownloading: boolean;
  setIsDownloading: (v: boolean) => void;
  errorMsg: string;
  setErrorMsg: (msg: string) => void;
  history: HistoryRecord[];
  addHistoryRecord: (record: HistoryRecord) => void;
}

const AnalysisContext = createContext<AnalysisState | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [aiChartData, setAiChartData] = useState<ChartSegment[]>([]);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const addHistoryRecord = (record: HistoryRecord) => {
    setHistory(prev => [record, ...prev]);
  };

  return (
    <AnalysisContext.Provider value={{
      aiChartData, setAiChartData,
      rawTransactions, setRawTransactions,
      aiSummary, setAiSummary,
      isThinking, setIsThinking,
      isProcessing, setIsProcessing,
      isDownloading, setIsDownloading,
      errorMsg, setErrorMsg,
      history, addHistoryRecord,
    }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used inside AnalysisProvider');
  return ctx;
}
