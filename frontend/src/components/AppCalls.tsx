import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { CounterClient } from '../contracts/Counter'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

interface AppCallsInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const AppCalls = ({ openModal, setModalState }: AppCallsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const FIXED_APP_ID = 747652603
  const [appId, setAppId] = useState<number | null>(FIXED_APP_ID)
  const [currentCount, setCurrentCount] = useState<number>(0)
  const { enqueueSnackbar } = useSnackbar()
  const { activeAccount, activeAddress, transactionSigner: TransactionSigner } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  algorand.setDefaultSigner(TransactionSigner)

  const fetchCount = async (appId: number): Promise<number> => {
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })
      const state = await counterClient.appClient.getGlobalState()
      return typeof state.count.value === 'bigint'
        ? Number(state.count.value)
        : parseInt(state.count.value, 10)
    } catch (e) {
      enqueueSnackbar(`Error fetching count: ${(e as Error).message}`, { variant: 'error' })
      return 0
    }
  }

  useEffect(() => {
    const load = async () => {
      if (appId) {
        const count = await fetchCount(appId)
        setCurrentCount(count)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, TransactionSigner])

  const incrementCounter = async () => {
    if (!appId) {
      enqueueSnackbar('Missing App ID', { variant: 'error' })
      return
    }
    setLoading(true)
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })
      await counterClient.send.incrCounter({ args: [], sender: activeAddress ?? undefined })
      const count = await fetchCount(appId)
      setCurrentCount(count)
      enqueueSnackbar(`Counter incremented! New count: ${count}`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Error incrementing counter: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <dialog id="appcalls_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-1">Counter Contract</h3>
        <p className="text-on-surface-variant text-sm mb-5">Interact with the on-chain counter</p>

        <div className="flex flex-col gap-4">
          {appId && (
            <div className="bg-accent-green/10 border border-accent-green/20 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-xs font-label uppercase">App ID</span>
                <span className="text-accent-green font-bold text-sm">{appId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-xs font-label uppercase">Current Count</span>
                <span className="text-accent-green font-headline font-black text-2xl">{currentCount}</span>
              </div>
            </div>
          )}

          <button
            className={`btn bg-accent-green text-surface-base font-bold hover:bg-accent-green-dim w-full ${loading ? 'loading' : ''}`}
            onClick={incrementCounter}
            disabled={loading || !appId}
          >
            {loading ? 'Processing...' : 'Increment Counter'}
          </button>

          <div className="modal-action">
            <button className="btn btn-ghost text-on-surface-variant" onClick={() => setModalState(false)} disabled={loading}>
              Close
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

export default AppCalls
