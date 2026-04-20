import React from 'react';
import { usePredX } from '../context/PredXContext';
import Home from './Home';
import Dashboard from './Dashboard';
import Markets from './Markets';
import Leaderboard from './Leaderboard';
import BettingTerminal from './BettingTerminal';
import Settings from './Settings';
import MarketScreener from './MarketScreener';
import TradingTerminal from './TradingTerminal';
import Support from './Support';
// ── Finance pages (from src_ref) ──────────────────────────────────────────────
import Analysis from './Analysis';
import Education from './Education';
import Goals from './Goals';
import Transactions from './Transactions';
import WealthOverview from './WealthOverview';

const AppRouter: React.FC = () => {
  const { currentPage } = usePredX();

  switch (currentPage) {
    // ── Existing PredX pages (untouched) ─────────────────────────────────────
    case 'home':
      return <Home />;
    case 'dashboard':
      return <Dashboard />;
    case 'markets':
      return <Markets />;
    case 'leaderboard':
      return <Leaderboard />;
    case 'terminal':
      return <BettingTerminal />;
    case 'settings':
      return <Settings />;
    case 'screener':
      return <MarketScreener />;
    case 'trade':
      return <TradingTerminal />;
    case 'support':
      return <Support />;
    // ── Finance pages ─────────────────────────────────────────────────────────
    case 'analysis':
      return <Analysis />;
    case 'wealth':
      return <WealthOverview />;
    case 'education':
      return <Education />;
    case 'goals':
      return <Goals />;
    case 'transactions':
      return <Transactions />;
    default:
      return <Home />;
  }
};

export default AppRouter;
