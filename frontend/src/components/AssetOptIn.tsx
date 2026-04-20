import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface AssetOptInProps {
  openModal: boolean
  closeModal: () => void
}

const AssetOptIn = ({ openModal, closeModal }: AssetOptInProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [asaId, setAsaId] = useState('')
  const [loading, setLoading] = useState(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig })
    client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const onOptIn = async () => {
    if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
    const id = BigInt(asaId)
    if (id <= 0n) return enqueueSnackbar('Enter a valid ASA ID', { variant: 'error' })
    setLoading(true)
    try {
      await algorand.send.assetOptIn({ sender: activeAddress, assetId: id })
      enqueueSnackbar('Opt-in successful', { variant: 'success' })
      closeModal()
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog id="asset_optin_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-1">Asset Opt-In</h3>
        <p className="text-on-surface-variant text-sm mb-5">Opt-in to receive an existing ASA</p>
        <div className="flex flex-col gap-3">
          <input className="input input-bordered w-full" placeholder="ASA ID" value={asaId} onChange={(e) => setAsaId(e.target.value)} />
        </div>
        <div className="modal-action">
          <button className={`btn bg-accent-green text-surface-base font-bold hover:bg-accent-green-dim ${loading ? 'loading' : ''}`} onClick={onOptIn} disabled={loading}>Opt-In</button>
          <button className="btn btn-ghost text-on-surface-variant" onClick={closeModal} disabled={loading}>Close</button>
        </div>
      </form>
    </dialog>
  )
}

export default AssetOptIn
