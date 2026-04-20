import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box !bg-surface-container border border-outline-variant/30">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-2">Connect Wallet</h3>
        <p className="text-on-surface-variant text-sm mb-6">Select a wallet provider to get started</p>

        <div className="flex flex-col gap-3">
          {activeAddress && (
            <>
              <Account />
              <div className="divider !my-2" />
            </>
          )}

          {!activeAddress &&
            wallets?.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-xl bg-surface-high border border-outline-variant/20 hover:border-accent-green/40 hover:bg-surface-highest transition-all group cursor-pointer"
                key={`provider-${wallet.id}`}
                onClick={() => {
                  return wallet.connect()
                }}
              >
                {!isKmd(wallet) && (
                  <img
                    alt={`wallet_icon_${wallet.id}`}
                    src={wallet.metadata.icon}
                    className="w-8 h-8 object-contain rounded-lg"
                  />
                )}
                {isKmd(wallet) && (
                  <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent-green text-lg">developer_board</span>
                  </div>
                )}
                <span className="text-on-surface font-semibold text-sm group-hover:text-accent-green transition-colors">
                  {isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant ml-auto text-sm group-hover:text-accent-green transition-colors group-hover:translate-x-1 transform">
                  arrow_forward
                </span>
              </button>
            ))}
        </div>

        <div className="modal-action mt-6 gap-3">
          <button
            data-test-id="close-wallet-modal"
            className="btn btn-ghost text-on-surface-variant hover:text-on-surface"
            onClick={() => {
              closeModal()
            }}
          >
            Close
          </button>
          {activeAddress && (
            <button
              className="btn bg-error-container/20 border-error-red/30 text-error-red hover:bg-error-container/40"
              data-test-id="logout"
              onClick={async () => {
                if (wallets) {
                  const activeWallet = wallets.find((w) => w.isActive)
                  if (activeWallet) {
                    await activeWallet.disconnect()
                  } else {
                    localStorage.removeItem('@txnlab/use-wallet:v3')
                    window.location.reload()
                  }
                }
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
export default ConnectWallet
