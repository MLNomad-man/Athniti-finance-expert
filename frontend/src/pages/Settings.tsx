import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import DashboardLayout from '../components/DashboardLayout'
import { ellipseAddress } from '../utils/ellipseAddress'
import { usePredX } from '../context/PredXContext'
import Profile from './Profile'

const Settings: React.FC = () => {
  const { activeAddress } = useWallet()
  const { themeMode, setThemeMode } = usePredX()
  
  const [activeTab, setActiveTab] = useState('general')
  const [notifications, setNotifications] = useState(true)
  const [sound, setSound] = useState(true)
  const [currency, setCurrency] = useState('ALGO')
  const [systemAlerts, setSystemAlerts] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(false)

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'profile', label: 'Profile & Data', icon: 'badge' },
    { id: 'appearance', label: 'Appearance', icon: 'palette' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'security', label: 'Security', icon: 'verified_user' },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <>
            {/* Profile Section */}
            <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="p-6 md:p-8 flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center border-4 border-surface shadow-lg relative">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-50">person</span>
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center border-2 border-surface hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-xs">edit</span>
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface leading-tight">Your Account</h3>
                  <div className="text-sm font-label text-on-surface-variant mt-1 mb-2">
                    {activeAddress ? ellipseAddress(activeAddress, 8) : 'Not Connected'}
                  </div>
                  <span className="inline-block bg-[#00FFA3]/10 text-[#00FFA3] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                    {activeAddress ? 'Verified' : 'Guest'}
                  </span>
                </div>
              </div>
            </section>

            {/* General Preferences */}
            <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="px-6 md:px-8 py-5 border-b border-outline-variant/10 bg-surface-container/30">
                <h3 className="text-base font-bold text-on-surface">Preferences</h3>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Display Currency</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Which currency to show for volumes and payouts.</p>
                  </div>
                  <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="ALGO">ALGO (Algorand)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </section>
          </>
        )
      case 'profile':
        return <Profile />
      case 'appearance':
        return (
          <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-outline-variant/10 bg-surface-container/30">
              <h3 className="text-base font-bold text-on-surface">Appearance Settings</h3>
            </div>
            <div className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Theme Mode</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Choose between dark and light themes.</p>
                </div>
                <div className="flex p-1 bg-surface-container-high rounded-full border border-outline-variant/10">
                  <button onClick={() => setThemeMode('dark')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${themeMode === 'dark' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>Dark</button>
                  <button onClick={() => setThemeMode('light')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${themeMode === 'light' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'}`}>Light</button>
                </div>
              </div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Dashboard Layout</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Toggle between detailed and compact views.</p>
                </div>
                <select className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2 text-sm text-on-surface">
                  <option>Detailed</option>
                  <option>Compact (Bento)</option>
                </select>
              </div>
            </div>
          </section>
        )
      case 'notifications':
        return (
          <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-outline-variant/10 bg-surface-container/30">
              <h3 className="text-base font-bold text-on-surface">Notifications Management</h3>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Market Updates</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Alerts when predictions resolve or shift.</p>
                </div>
                <button onClick={() => setNotifications(!notifications)} className={`w-11 h-6 rounded-full relative ${notifications ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary transition-transform ${notifications ? 'translate-x-5' : 'bg-on-surface-variant'}`}></div>
                </button>
              </div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">System Alerts</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Critical updates regarding network status.</p>
                </div>
                <button onClick={() => setSystemAlerts(!systemAlerts)} className={`w-11 h-6 rounded-full relative ${systemAlerts ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary transition-transform ${systemAlerts ? 'translate-x-5' : 'bg-on-surface-variant'}`}></div>
                </button>
              </div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Sound Effects</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Audio feedback for trade confirmation.</p>
                </div>
                <button onClick={() => setSound(!sound)} className={`w-11 h-6 rounded-full relative ${sound ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary transition-transform ${sound ? 'translate-x-5' : 'bg-on-surface-variant'}`}></div>
                </button>
              </div>
            </div>
          </section>
        )
      case 'security':
        return (
          <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-outline-variant/10 bg-surface-container/30">
              <h3 className="text-base font-bold text-on-surface">Security & Privacy</h3>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Private Portfolio Mode</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">Hide balances from local display by default.</p>
                </div>
                <button onClick={() => setPrivacyMode(!privacyMode)} className={`w-11 h-6 rounded-full relative ${privacyMode ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary transition-transform ${privacyMode ? 'translate-x-5' : 'bg-on-surface-variant'}`}></div>
                </button>
              </div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div>
                <h4 className="text-sm font-bold text-on-surface">Authorized Signers</h4>
                <p className="text-xs text-on-surface-variant mb-4">You are currently using Pera Wallet as your primary signer.</p>
                <div className="flex items-center gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/10 max-w-sm">
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-container">account_balance_wallet</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Pera Wallet</p>
                    <p className="text-[10px] text-on-surface-variant">Connected & Secure</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 md:pb-8 pt-4 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-black text-on-surface">Settings</h1>
          <p className="text-on-surface-variant text-sm mt-1">Manage your platform preferences and account details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Navigation / Tabs */}
          <div className="hidden lg:block col-span-1 border-r border-outline-variant/10 pr-8">
            <nav className="space-y-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg font-headline font-bold text-sm border-l-4 transition-all ${
                    activeTab === tab.id 
                    ? 'bg-surface-container text-primary-container border-primary-container' 
                    : 'text-on-surface-variant hover:bg-surface-container-low border-transparent hover:border-outline-variant/30'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Column: Settings Content */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Settings
