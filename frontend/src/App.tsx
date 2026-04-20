import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider, closeSnackbar } from 'notistack'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { PredXProvider } from './context/PredXContext'
import { AnalysisProvider } from './context/AnalysisContext'
import AppRouter from './pages/AppRouter'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE },
  ]
}

const algodConfig = getAlgodConfigFromViteEnvironment()
const walletManager = new WalletManager({
  wallets: supportedWallets,
  defaultNetwork: algodConfig.network,
  networks: {
    [algodConfig.network]: {
      algod: {
        baseServer: algodConfig.server,
        port: algodConfig.port,
        token: String(algodConfig.token),
      },
    },
  },
  options: {
    resetNetwork: true,
  },
})

export default function App() {
  return (
    <SnackbarProvider 
      maxSnack={3} 
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      action={(snackbarId) => (
        <button 
          onClick={() => closeSnackbar(snackbarId)} 
          className="text-white hover:bg-white/20 rounded-full transition-colors p-1 m-1 flex items-center justify-center bg-transparent border-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    >
      <WalletProvider manager={walletManager}>
        <PredXProvider>
          <AnalysisProvider>
            <AppRouter />
          </AnalysisProvider>
        </PredXProvider>
      </WalletProvider>
    </SnackbarProvider>
  )
}
