import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { usePredX } from '../context/PredXContext'
import { ellipseAddress } from '../utils/ellipseAddress'
import { useOraclePrice } from '../hooks/useOraclePrice'
import algosdk from 'algosdk'

const USD_TO_INR = 85.5

const Home: React.FC = () => {
  const { activeAddress } = useWallet()
  const { myPositions, markets, navigate, isBalanceHidden, toggleBalanceVisibility } = usePredX()
  const { algoPrice } = useOraclePrice()
  const [algoBalance, setAlgoBalance] = useState<number>(0)

  useEffect(() => {
    if (!activeAddress) return
    const fetchBalance = async () => {
      try {
        const algodClient = new algosdk.Algodv2(
          '',
          import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
          ''
        )
        const info = await algodClient.accountInformation(activeAddress).do()
        setAlgoBalance(Number(info.amount) / 1_000_000)
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      }
    }
    fetchBalance()
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [activeAddress])

  const activePredictions = myPositions.filter(p => p.status === 'running')
  const totalWagered = myPositions.reduce((acc, pos) => acc + pos.amount, 0)
  const totalPotential = myPositions.reduce((acc, pos) => acc + (pos.status === 'running' ? pos.potential : 0), 0)
  const usdBalance = algoPrice ? (algoBalance * algoPrice) : 0
  const inrBalance = usdBalance * USD_TO_INR

  return (
    <DashboardLayout>
      <div className="px-4 md:px-8 pb-12 md:pb-8 pt-4">
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-surface-container-high to-surface-container/50 p-6 md:p-10 rounded-2xl border border-primary-container/10 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-container/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
            
            <h1 className="text-3xl md:text-5xl font-headline font-black text-on-surface mb-2 relative z-10">
              {activeAddress ? 'Welcome Back.' : 'Welcome to Arthniti.'}
            </h1>
            <p className="text-on-surface-variant max-w-xl text-sm md:text-base relative z-10">
              {activeAddress 
                ? `Connected as ${ellipseAddress(activeAddress, 6)}. Predict real-world events powered by the Algorand blockchain.` 
                : 'Connect your wallet to start making predictions on real-world events powered by the Algorand blockchain.'}
            </p>

            {!activeAddress && (
              <div className="mt-6">
                <span className="inline-block bg-primary-container/20 text-primary-container border border-primary-container/30 px-4 py-2 rounded-full text-xs font-bold font-label uppercase tracking-widest pointer-events-none">
                  Wallet Disconnected
                </span>
              </div>
            )}
          </div>
        </section>

        {activeAddress && (
          <>
            {/* Balance + Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              {/* ALGO Balance */}
              <div className="bg-surface-container p-6 rounded-xl border border-primary-container/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/5 blur-2xl"></div>
                <div className="flex items-center justify-between">
                  <span className="text-primary-container font-label text-[10px] uppercase tracking-widest">ALGO Balance</span>
                  <button
                    onClick={toggleBalanceVisibility}
                    className="text-on-surface-variant hover:text-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {isBalanceHidden ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className="text-3xl font-headline font-black text-on-surface mt-1">
                  {isBalanceHidden ? '****' : algoBalance.toFixed(2)}
                </div>
                {algoPrice && !isBalanceHidden && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    <p className="text-xs text-on-surface-variant">≈ ${usdBalance.toFixed(2)} USD</p>
                    <p className="text-xs text-on-surface-variant">≈ ₹{inrBalance.toFixed(2)} INR</p>
                  </div>
                )}
              </div>
              <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5">
                <span className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest">Active Positions</span>
                <div className="text-3xl font-headline font-black text-on-surface mt-1">{activePredictions.length}</div>
              </div>
              <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5">
                <span className="text-on-surface-variant font-label text-[10px] uppercase tracking-widest">Total Wagered</span>
                <div className="text-3xl font-headline font-black text-on-surface mt-1">{totalWagered.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></div>
              </div>
              <div className="bg-surface-container p-6 rounded-xl border border-outline-variant/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/10 blur-xl"></div>
                <span className="text-[#00FFA3] font-label text-[10px] uppercase tracking-widest">Potential Payout</span>
                <div className="text-3xl font-headline font-black text-[#00FFA3] mt-1">{totalPotential.toFixed(2)} <span className="text-xs opacity-50">ALGO</span></div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div 
                className="bg-primary-container p-6 md:p-8 rounded-xl flex justify-between items-center cursor-pointer group hover:shadow-[0_0_30px_rgba(0,255,163,0.15)] transition-all"
                onClick={() => navigate('markets')}
              >
                <div>
                  <h3 className="font-headline font-black text-on-primary text-xl md:text-2xl">Explore Markets</h3>
                  <p className="text-on-primary/70 text-xs mt-1">Browse live prediction markets from Polymarket</p>
                </div>
                <span className="material-symbols-outlined text-on-primary text-3xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </div>
              <div 
                className="bg-surface-container-high p-6 md:p-8 rounded-xl flex justify-between items-center cursor-pointer group border border-outline-variant/10 hover:border-primary-container/20 transition-all"
                onClick={() => navigate('dashboard')}
              >
                <div>
                  <h3 className="font-headline font-bold text-on-surface text-xl md:text-2xl">My Portfolio</h3>
                  <p className="text-on-surface-variant text-xs mt-1">View detailed positions and history</p>
                </div>
                <span className="material-symbols-outlined text-primary-container text-3xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
              </div>
            </section>

            {/* Recent Positions */}
            <section className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-bold text-lg md:text-xl">Recent Predictions</h3>
                <button 
                  onClick={() => navigate('dashboard')}
                  className="text-primary-container text-xs font-bold hover:underline"
                >
                  View all &rarr;
                </button>
              </div>

              {myPositions.length > 0 ? (
                <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
                  {myPositions.slice(0, 5).map((pos) => {
                    const market = markets.find(m => m.id === pos.marketId)
                    return (
                      <div key={pos.id} className="p-4 md:p-6 border-b border-outline-variant/5 last:border-b-0 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-highest/10 transition-colors cursor-pointer"
                        onClick={() => market && navigate('terminal', { marketId: market.id })}
                      >
                        <div>
                          <div className="text-xs text-on-surface-variant mb-1">{market?.category || 'Market'}</div>
                          <div className="font-bold text-sm md:text-base">{market?.title || 'Unknown Market'}</div>
                        </div>
                        <div className="flex items-center gap-6 md:gap-12 text-sm">
                          <div>
                            <span className="text-on-surface-variant text-[10px] block mb-1">Position</span>
                            <span className={`font-bold ${pos.outcome === 'YES' ? 'text-[#00FFA3]' : 'text-[#FF4040]'}`}>{pos.outcome}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant text-[10px] block mb-1">Amount</span>
                            <span className="font-bold">{pos.amount} <small className="text-xs font-normal opacity-50">ALGO</small></span>
                          </div>
                          <div className="text-right">
                            <span className="text-on-surface-variant text-[10px] block mb-1">Status</span>
                            <span className={`font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                              pos.status === 'running' ? 'bg-primary-container/10 text-primary-container' :
                              pos.status === 'won' ? 'bg-green-500/10 text-green-400' :
                              'bg-error/10 text-error'
                            }`}>{pos.status}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-surface-container-low p-12 rounded-xl border border-outline-variant/10 text-center flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-4">analytics</span>
                  <h4 className="text-on-surface font-headline font-bold mb-2">No Predictions Yet</h4>
                  <p className="text-sm text-on-surface-variant mb-6 max-w-sm">Head over to Markets to start predicting on real-world events.</p>
                  <button 
                    onClick={() => navigate('markets')}
                    className="bg-primary-container text-on-primary px-6 py-2.5 rounded-full font-bold text-sm hover:shadow-[0_0_15px_rgba(0,255,163,0.3)] transition-all"
                  >
                    Browse Markets
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Home
