import React, { useState } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { ellipseAddress } from '../utils/ellipseAddress';
import { usePredX } from '../context/PredXContext';
import ConnectWallet from './ConnectWallet';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { activeAddress } = useWallet();
  const { currentPage, navigate, themeMode } = usePredX();
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false);

  const toggleWalletModal = () => setOpenWalletModal(!openWalletModal);

  const navItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', fill: true },
  ];

  const tradingItems = [
    { id: 'markets', label: 'Markets', icon: 'insert_chart' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
    { id: 'screener', label: 'Screener', icon: 'query_stats' },
    { id: 'trade', label: 'Trade', icon: 'candlestick_chart' },
  ];

  const financeItems = [
    { id: 'wealth',       label: 'Wealth Hub',   icon: 'account_balance' },
    { id: 'analysis',     label: 'Analysis',     icon: 'analytics' },
    { id: 'goals',        label: 'Goals',        icon: 'flag' },
    { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
    { id: 'education',    label: 'Education',    icon: 'school' },
  ];

  const topBarClass =
    themeMode === 'light'
      ? 'bg-background/90 border-b border-outline-variant/20 shadow-[0_20px_40px_rgba(0,109,67,0.08)]'
      : 'bg-[#101419]/60 shadow-[0_20px_40px_rgba(0,255,163,0.08)]';

  const sideBarClass =
    themeMode === 'light'
      ? 'bg-surface border-r border-outline-variant/20'
      : 'bg-[#101419] border-r border-[#3a4a3f]/15';

  const sideItemActiveClass =
    themeMode === 'light'
      ? 'flex items-center gap-3 bg-surface-container-highest text-primary-container rounded-full mx-2 px-4 py-3 border-l-4 border-primary-container font-body text-sm font-semibold cursor-pointer'
      : 'flex items-center gap-3 bg-[#181c21] text-[#00FFA3] rounded-full mx-2 px-4 py-3 border-l-4 border-[#00FFA3] font-body text-sm font-semibold cursor-pointer';

  const sideItemClass =
    themeMode === 'light'
      ? 'flex items-center gap-3 text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-low hover:text-on-surface transition-colors duration-300 font-body text-sm font-semibold rounded-full cursor-pointer'
      : 'flex items-center gap-3 text-[#e0e2ea]/50 mx-2 px-4 py-3 hover:bg-[#262a30] hover:text-[#e0e2ea] transition-colors duration-300 font-body text-sm font-semibold rounded-full cursor-pointer';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* TopAppBar */}
      <header className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 h-16 md:h-20 backdrop-blur-xl bg-gradient-to-b from-[#7C3AED]/5 to-transparent ${topBarClass}`}>
        <div className="flex items-center gap-6 md:gap-12">
          <div 
            className="flex items-center cursor-pointer group px-1 py-1 rounded-xl transition-all duration-300"
            onClick={() => navigate('home')}
          >
            <img src="/logo.jpeg" alt="Arthniti Logo" className="h-10 w-10 rounded-full border-2 border-primary-container object-cover group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(0,255,163,0.3)]" />
            <span className="font-headline font-black text-2xl tracking-tighter text-on-surface ml-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Arthniti</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2 opacity-50">search</span>
            <input className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-48 text-on-surface font-label placeholder:text-on-surface-variant/50" placeholder="Search markets..." type="text" />
          </div>
          
          {activeAddress && (
            <div className="hidden sm:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10 gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-container pulse-dot"></div>
              <span className="text-on-surface-variant text-xs font-label">{ellipseAddress(activeAddress, 4)}</span>
            </div>
          )}
          
          <button
            className="bg-primary-container text-on-primary font-headline font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-full scale-95 active:scale-90 transition-transform hover:shadow-[0_0_15px_rgba(0,255,163,0.4)] text-sm"
            onClick={toggleWalletModal}
          >
            {activeAddress ? 'Connected' : 'Connect'}
          </button>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className={`fixed left-0 top-16 md:top-20 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-64 hidden lg:flex flex-col py-6 gap-2 font-body font-semibold text-sm ${sideBarClass} overflow-y-auto custom-scrollbar`}>
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <img src="/logo.jpeg" alt="Logo mini" className="h-6 w-6 rounded-full object-cover border border-primary-container shadow-[0_0_5px_rgba(0,255,163,0.2)]" />
            <div>
              <h2 className="text-sm font-bold font-headline text-on-surface leading-none uppercase tracking-tighter">Arthniti</h2>
              <p className="text-[10px] text-primary-container uppercase tracking-widest font-black opacity-80 mt-1">Algorand Network</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-50">Navigation</div>
          
            {navItems.map(item => (
              <a 
                key={item.id}
                className={currentPage === item.id
                  ? sideItemActiveClass
                  : sideItemClass
                }
                onClick={() => navigate(item.id)}
              >
              <span className="material-symbols-outlined" style={item.fill && currentPage === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span> 
              {item.label}
            </a>
          ))}
        </div>

        {/* Finance Section */}
        <div className="space-y-1 mt-4">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-50">Finance</div>
          {financeItems.map(item => (
            <a
              key={item.id}
              className={currentPage === item.id
                ? sideItemActiveClass
                : sideItemClass
              }
              onClick={() => navigate(item.id)}
            >
              <span className="material-symbols-outlined" style={currentPage === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </div>

        {/* Trading Section */}
        <div className="space-y-1 mt-4">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold opacity-50">Trading</div>
          {tradingItems.map(item => (
            <a
              key={item.id}
              className={currentPage === item.id
                ? sideItemActiveClass
                : sideItemClass
              }
              onClick={() => navigate(item.id)}
            >
              <span className="material-symbols-outlined" style={currentPage === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </div>
        
        <div className="mt-auto space-y-1 pt-4">
          <a 
            className={currentPage === 'settings'
              ? sideItemActiveClass
              : sideItemClass
            }
            onClick={() => navigate('settings')}
          >
            <span className="material-symbols-outlined" style={currentPage === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              settings
            </span> 
            Settings
          </a>
          <a
            className={currentPage === 'support'
              ? sideItemActiveClass
              : sideItemClass
            }
            onClick={() => navigate('support')}
          >
            <span className="material-symbols-outlined" style={currentPage === 'support' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              support_agent
            </span>
            Support
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64 pt-16 md:pt-20">
        {children}
      </div>

      {/* Mobile NavBar */}
      <nav className={`md:hidden fixed bottom-0 w-full backdrop-blur-xl border-t border-outline-variant/10 flex justify-around items-center py-3 z-50 ${themeMode === 'light' ? 'bg-background/95' : 'bg-[#101419]/95'}`}>
        {[...navItems, { id: 'screener', label: 'Trade', icon: 'candlestick_chart' }].map(item => (
          <a 
            key={item.id}
            className={`flex flex-col items-center gap-1 cursor-pointer ${currentPage === item.id || (item.id === 'screener' && currentPage === 'trade') ? 'text-primary-container' : 'text-on-surface-variant'}`}
            onClick={() => navigate(item.id)}
          >
            <span className="material-symbols-outlined" style={(currentPage === item.id || (item.id === 'screener' && currentPage === 'trade')) ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.id === 'dashboard' ? 'Dash' : item.label}</span>
          </a>
        ))}
      </nav>

      {/* Connect Wallet Modal globally available */}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </div>
  );
};

export default DashboardLayout;
