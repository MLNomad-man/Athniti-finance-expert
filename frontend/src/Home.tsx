import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import SendAlgo from './components/SendAlgo'
import MintNFT from './components/MintNFT'
import CreateASA from './components/CreateASA'
import AssetOptIn from './components/AssetOptIn'
import AppCalls from './components/AppCalls'
import Bank from './components/Bank'
import { ellipseAddress } from './utils/ellipseAddress'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [sendAlgoModal, setSendAlgoModal] = useState<boolean>(false)
  const [mintNftModal, setMintNftModal] = useState<boolean>(false)
  const [createAsaModal, setCreateAsaModal] = useState<boolean>(false)
  const [assetOptInModal, setAssetOptInModal] = useState<boolean>(false)
  const [bankModal, setBankModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => setOpenWalletModal(!openWalletModal)

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ====== TopAppBar — from stitch ====== */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-20 bg-[#101419]/60 backdrop-blur-xl bg-gradient-to-b from-[#7C3AED]/5 to-transparent shadow-[0_20px_40px_rgba(0,255,163,0.08)]">
        <div className="flex items-center gap-12">
          <div className="text-2xl font-black text-[#00FFA3] tracking-tighter font-headline">PredX</div>
          <nav className="hidden md:flex items-center gap-8 font-headline text-sm tracking-wide">
            <a className="text-[#e0e2ea] opacity-70 hover:bg-[#31353b] hover:text-[#00FFA3] transition-all duration-300 px-3 py-1 rounded" href="#">Markets</a>
            <a className="text-[#e0e2ea] opacity-70 hover:bg-[#31353b] hover:text-[#00FFA3] transition-all duration-300 px-3 py-1 rounded" href="#">Leaderboard</a>
            <a className="text-[#00FFA3] font-bold border-b-2 border-[#00FFA3] px-3 py-1" href="#">Dashboard</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
            <span className="material-symbols-outlined text-on-surface-variant text-sm mr-2">search</span>
            <input className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-48 text-on-surface placeholder-on-surface-variant/50" placeholder="Search markets..." type="text" />
          </div>
          {activeAddress && (
            <div className="hidden sm:flex items-center bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10 gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-container pulse-dot"></div>
              <span className="text-on-surface-variant text-xs font-label">{ellipseAddress(activeAddress, 4)}</span>
            </div>
          )}
          <button
            data-test-id="connect-wallet"
            className="bg-primary-container text-on-primary font-headline font-bold px-6 py-2.5 rounded-full scale-95 active:scale-90 transition-transform hover:shadow-[0_0_15px_rgba(0,255,163,0.4)]"
            onClick={toggleWalletModal}
          >
            {activeAddress ? 'Connected' : 'Connect Pera'}
          </button>
        </div>
      </header>

      {/* ====== SideNavBar — from stitch ====== */}
      <aside className="fixed left-0 top-20 h-[calc(100vh-5rem)] w-64 bg-[#181c21] hidden lg:flex flex-col py-6 gap-2 font-body font-semibold text-sm">
        <div className="px-8 mb-6">
          <div className="text-xs font-label text-on-surface-variant uppercase tracking-[0.2em] mb-1">User Hub</div>
          <div className="text-lg font-headline font-bold text-[#00FFA3]">Dashboard</div>
        </div>
        <div className="space-y-1">
          <a className="text-[#e0e2ea] opacity-60 mx-4 py-3 px-6 flex items-center gap-3 hover:bg-[#262a30] hover:opacity-100 transition-colors active:translate-x-1" href="#">
            <span className="material-symbols-outlined">home</span> Home
          </a>
          <a className="text-[#e0e2ea] opacity-60 mx-4 py-3 px-6 flex items-center gap-3 hover:bg-[#262a30] hover:opacity-100 transition-colors active:translate-x-1" href="#">
            <span className="material-symbols-outlined">insert_chart</span> Markets
          </a>
          <a className="text-[#e0e2ea] opacity-60 mx-4 py-3 px-6 flex items-center gap-3 hover:bg-[#262a30] hover:opacity-100 transition-colors active:translate-x-1" href="#">
            <span className="material-symbols-outlined">leaderboard</span> Leaderboard
          </a>
          <a className="bg-[#31353b] text-[#00FFA3] rounded-full mx-4 py-3 px-6 flex items-center gap-3 active:translate-x-1 transition-transform" href="#">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span> Dashboard
          </a>
        </div>
        <div className="mt-auto space-y-1">
          <a className="text-[#e0e2ea] opacity-60 mx-4 py-3 px-6 flex items-center gap-3 hover:bg-[#262a30] transition-colors" href="#">
            <span className="material-symbols-outlined">settings</span> Settings
          </a>
          <a className="text-[#e0e2ea] opacity-60 mx-4 py-3 px-6 flex items-center gap-3 hover:bg-[#262a30] transition-colors" href="#">
            <span className="material-symbols-outlined">help_center</span> Support
          </a>
        </div>
      </aside>

      {/* ====== Main Canvas — from stitch ====== */}
      <main className="lg:ml-64 pt-28 px-8 pb-12">

        {/* Hero Metrics Grid — from stitch, wired to operations */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Total Earnings → Send Algo */}
          <div
            className="bg-surface-container-high p-8 rounded-lg flex flex-col justify-between border border-primary-container/5 relative overflow-hidden group cursor-pointer"
            onClick={() => activeAddress && setSendAlgoModal(true)}
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-container/5 rounded-full blur-3xl group-hover:bg-primary-container/10 transition-colors"></div>
            <div>
              <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Send Algo</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h2 className="text-4xl font-headline font-black text-on-surface">
                  <span className="material-symbols-outlined text-3xl align-middle mr-2">send</span>
                  Pay
                </h2>
                <span className="text-[#00FFA3] font-headline font-bold">ALGO</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-6 text-sm text-primary-fixed-dim">
              <span className="material-symbols-outlined text-sm">payments</span>
              <span>Send payment transactions</span>
            </div>
          </div>

          {/* Win/Loss → Counter Contract */}
          <div
            className="bg-surface-container-high p-8 rounded-lg border border-outline-variant/5 cursor-pointer"
            onClick={() => activeAddress && setAppCallsDemoModal(true)}
          >
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Counter Contract</span>
            <div className="flex justify-between items-end mt-2 mb-4">
              <h2 className="text-4xl font-headline font-black text-on-surface">
                <span className="material-symbols-outlined text-3xl align-middle mr-2">calculate</span>
              </h2>
              <div className="text-right">
                <span className="block text-[10px] text-on-surface-variant uppercase">App ID</span>
                <span className="text-[#00FFA3] font-bold">747652603</span>
              </div>
            </div>
            <div className="w-full h-3 bg-surface-container-lowest rounded-full overflow-hidden flex">
              <div className="h-full bg-primary-container neon-glow" style={{ width: '68%' }}></div>
              <div className="h-full bg-error-container" style={{ width: '32%' }}></div>
            </div>
            <div className="flex justify-between mt-2 font-label text-[10px] text-on-surface-variant">
              <span>INCREMENT</span>
              <span>ON-CHAIN</span>
            </div>
          </div>

          {/* Total Positions → Mint NFT */}
          <div
            className="bg-surface-container-high p-8 rounded-lg border border-outline-variant/5 cursor-pointer"
            onClick={() => activeAddress && setMintNftModal(true)}
          >
            <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Mint NFT (ARC-3)</span>
            <div className="flex items-center gap-4 mt-2">
              <h2 className="text-4xl font-headline font-black text-on-surface">
                <span className="material-symbols-outlined text-3xl align-middle">palette</span>
              </h2>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-tertiary-container flex items-center justify-center text-[10px] text-on-tertiary font-bold">IMG</div>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-secondary-container flex items-center justify-center text-[10px] text-on-secondary font-bold">PIN</div>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-high bg-surface-container-highest flex items-center justify-center text-[10px] text-on-surface font-bold">NFT</div>
              </div>
            </div>
            <button className="mt-6 text-primary-container text-xs font-bold flex items-center gap-1 hover:underline">
              Upload & Mint <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          {/* CTA → Connect Wallet / Create Token */}
          <div
            className="bg-primary-container p-8 rounded-lg flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_30px_rgba(0,255,163,0.2)] transition-all"
            onClick={() => activeAddress ? setCreateAsaModal(true) : toggleWalletModal()}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-headline font-black text-on-primary text-2xl leading-tight">
                {activeAddress ? 'Create your token?' : 'Ready to start?'}
              </h3>
              <span className="material-symbols-outlined text-on-primary text-3xl group-hover:translate-x-2 transition-transform">bolt</span>
            </div>
            <div className="bg-on-primary text-primary-container font-bold py-3 px-6 rounded-full inline-block text-center mt-4">
              {activeAddress ? 'Create ASA' : 'Connect Pera'}
            </div>
          </div>
        </section>

        {/* Performance Pulse Chart — from stitch */}
        <section className="mb-8">
          <div className="bg-surface-container-low p-8 rounded-lg relative overflow-hidden border border-outline-variant/5">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h3 className="font-headline font-bold text-xl mb-1">Performance Pulse</h3>
                <p className="text-on-surface-variant text-sm">30-day algorithmic equity curve</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-1.5 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">1W</button>
                <button className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary text-xs font-bold">1M</button>
                <button className="px-4 py-1.5 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">ALL</button>
              </div>
            </div>
            <div className="h-[320px] w-full relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00FFA3" stopOpacity={0.3}></stop>
                    <stop offset="100%" stopColor="#00FFA3" stopOpacity={0}></stop>
                  </linearGradient>
                </defs>
                <path d="M0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,80" fill="none" stroke="#00FFA3" strokeLinecap="round" strokeWidth="4"></path>
                <path d="M0,250 Q100,220 200,240 T400,180 T600,120 T800,150 T1000,80 V300 H0 Z" fill="url(#chartGradient)"></path>
                <circle className="pulse-dot" cx="1000" cy="80" fill="#00FFA3" r="6"></circle>
              </svg>
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none opacity-5">
                <div className="border-t border-on-surface"></div>
                <div className="border-t border-on-surface"></div>
                <div className="border-t border-on-surface"></div>
                <div className="border-t border-on-surface"></div>
              </div>
            </div>
            <div className="flex justify-between mt-6 text-[10px] font-label text-on-surface-variant uppercase tracking-widest">
              <span>01 OCT</span>
              <span>10 OCT</span>
              <span>20 OCT</span>
              <span>CURRENT</span>
            </div>
          </div>
        </section>

        {/* Bottom Bento Grid — from stitch */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Active Positions (col 1-2) → Operations */}
          <div className="xl:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl">Active Operations</h3>
              <span className="bg-primary-container/10 text-primary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                {activeAddress ? '6 Available' : 'Connect Wallet'}
              </span>
            </div>
            <div className="grid gap-4">
              {/* Operation: Asset Opt-In */}
              <div
                className="bg-surface-container p-6 rounded-lg flex items-center justify-between border-l-4 border-primary-container hover:bg-surface-container-high transition-colors group cursor-pointer"
                onClick={() => activeAddress && setAssetOptInModal(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Asset Opt-In</h4>
                    <p className="text-xs text-on-surface-variant">Action: <span className="text-[#00FFA3] font-bold">Opt-in to any ASA</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-headline font-bold text-on-surface">Receive Tokens</div>
                  <div className="text-xs text-on-surface-variant">Enter ASA ID</div>
                </div>
                <div className="hidden md:block">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container transition-colors">chevron_right</span>
                </div>
              </div>

              {/* Operation: Bank Deposit */}
              <div
                className="bg-surface-container p-6 rounded-lg flex items-center justify-between border-l-4 border-primary-container hover:bg-surface-container-high transition-colors group cursor-pointer"
                onClick={() => activeAddress && setBankModal(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined">account_balance</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Bank Contract</h4>
                    <p className="text-xs text-on-surface-variant">Action: <span className="text-[#00FFA3] font-bold">Deposit & Withdraw</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-headline font-bold text-on-surface">DeFi Banking</div>
                  <div className="text-xs text-on-surface-variant">Deploy · Deposit · Withdraw</div>
                </div>
                <div className="hidden md:block">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container transition-colors">chevron_right</span>
                </div>
              </div>

              {/* Operation: Send Algo */}
              <div
                className="bg-surface-container p-6 rounded-lg flex items-center justify-between border-l-4 border-error hover:bg-surface-container-high transition-colors group cursor-pointer"
                onClick={() => activeAddress && setSendAlgoModal(true)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center text-error">
                    <span className="material-symbols-outlined">send</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Send Payment</h4>
                    <p className="text-xs text-on-surface-variant">Action: <span className="text-error font-bold">Transfer ALGO</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-headline font-bold text-on-surface">Custom Amount</div>
                  <div className="text-xs text-on-surface-variant">To any address</div>
                </div>
                <div className="hidden md:block">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-container transition-colors">chevron_right</span>
                </div>
              </div>
            </div>
          </div>

          {/* Past History (col 3) → Quick Actions Table */}
          <div className="xl:col-span-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl">Quick Actions</h3>
              <button className="text-on-surface-variant text-xs hover:text-primary-container" onClick={toggleWalletModal}>
                {activeAddress ? 'Manage' : 'Connect'}
              </button>
            </div>
            <div className="bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/5">
              <table className="w-full text-left">
                <thead className="bg-surface-container-highest/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-label text-on-surface-variant uppercase tracking-widest">Operation</th>
                    <th className="px-6 py-4 text-[10px] font-label text-on-surface-variant uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  <tr className="hover:bg-surface-container-highest/20 transition-colors cursor-pointer" onClick={() => activeAddress && setMintNftModal(true)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold">Mint NFT</div>
                      <div className="text-[10px] text-on-surface-variant">ARC-3 Standard</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-headline font-bold text-[#00FFA3]">IPFS</div>
                      <div className="text-[8px] text-on-surface-variant">PINATA</div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-highest/20 transition-colors cursor-pointer" onClick={() => activeAddress && setCreateAsaModal(true)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold">Create Token</div>
                      <div className="text-[10px] text-on-surface-variant">Fungible ASA</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-headline font-bold text-[#00FFA3]">Create</div>
                      <div className="text-[8px] text-on-surface-variant">CUSTOM</div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-highest/20 transition-colors cursor-pointer" onClick={() => activeAddress && setAssetOptInModal(true)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold">Opt-In ASA</div>
                      <div className="text-[10px] text-on-surface-variant">Receive Tokens</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-headline font-bold text-[#00FFA3]">Opt-In</div>
                      <div className="text-[8px] text-on-surface-variant">ASA ID</div>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-highest/20 transition-colors cursor-pointer" onClick={() => activeAddress && setAppCallsDemoModal(true)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold">Counter</div>
                      <div className="text-[10px] text-on-surface-variant">App ID: 747652603</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-sm font-headline font-bold text-[#00FFA3]">Increment</div>
                      <div className="text-[8px] text-on-surface-variant">ON-CHAIN</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="p-6">
                <div className="bg-surface-container-highest rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-container/10 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#00FFA3]">auto_awesome</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-on-surface-variant leading-tight">WALLET STATUS</p>
                    <p className="text-xs font-bold text-on-surface">
                      {activeAddress
                        ? <>Connected to <span className="text-[#00FFA3]">TestNet</span></>
                        : <>Connect your <span className="text-[#00FFA3]">Pera Wallet</span> to begin</>
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ====== Notification Toast — from stitch ====== */}
      {activeAddress && (
        <div className="fixed bottom-8 right-8 z-[100] max-w-sm w-full">
          <div className="glass-panel p-4 rounded-xl border border-primary-container/20 shadow-2xl flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary-container">wallet</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary-container rounded-full border-2 border-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-[8px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-bold text-[#00FFA3]">Wallet Connected</h5>
              <p className="text-[10px] text-on-surface-variant">Pera Wallet active on TestNet. {ellipseAddress(activeAddress, 4)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ====== Modals — logic from template ====== */}
      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
      <SendAlgo openModal={sendAlgoModal} closeModal={() => setSendAlgoModal(false)} />
      <MintNFT openModal={mintNftModal} closeModal={() => setMintNftModal(false)} />
      <CreateASA openModal={createAsaModal} closeModal={() => setCreateAsaModal(false)} />
      <AssetOptIn openModal={assetOptInModal} closeModal={() => setAssetOptInModal(false)} />
      <Bank openModal={bankModal} closeModal={() => setBankModal(false)} />
    </div>
  )
}

export default Home
