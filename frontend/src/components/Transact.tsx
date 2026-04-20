import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [receiverAddress, setReceiverAddress] = useState<string>('')

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig })

  const { enqueueSnackbar } = useSnackbar()
  const { transactionSigner, activeAddress } = useWallet()

  const handleSubmitAlgo = async () => {
    setLoading(true)
    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      return
    }
    try {
      enqueueSnackbar('Sending transaction...', { variant: 'info' })
      const result = await algorand.send.payment({ signer: transactionSigner, sender: activeAddress, receiver: receiverAddress, amount: algo(1) })
      enqueueSnackbar(`Transaction sent: ${result.txIds[0]}`, { variant: 'success' })
      setReceiverAddress('')
    } catch (e) {
      enqueueSnackbar('Failed to send transaction', { variant: 'error' })
    }
    setLoading(false)
  }

  return (
    <dialog id="transact_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-1">Send Payment</h3>
        <p className="text-on-surface-variant text-sm mb-5">Send 1 ALGO to any address</p>
        <input type="text" data-test-id="receiver-address" placeholder="Provide wallet address" className="input input-bordered w-full" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} />
        <div className="modal-action">
          <button className="btn btn-ghost text-on-surface-variant" onClick={() => setModalState(!openModal)}>Close</button>
          <button data-test-id="send-algo" className={`btn bg-accent-green text-surface-base font-bold ${receiverAddress.length === 58 ? '' : 'btn-disabled'}`} onClick={handleSubmitAlgo}>
            {loading ? <span className="loading loading-spinner" /> : 'Send 1 Algo'}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact
