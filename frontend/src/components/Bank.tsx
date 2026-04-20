import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import algosdk, { getApplicationAddress, makePaymentTxnWithSuggestedParamsFromObject } from 'algosdk'
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { BankClient, BankFactory } from '../contracts/Bank'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { usePredX } from '../context/PredXContext'
import BalanceDisplay from './BalanceDisplay'

interface BankProps {
  openModal: boolean
  closeModal: () => void
}

type Statement = {
  id: string
  round: number
  amount: number
  type: 'deposit' | 'withdrawal'
  sender: string
  receiver: string
  timestamp?: number
}

const BANK_APP_ID_STORAGE_KEY = 'predx-trading-bank-app-id'

const getInitialBankAppId = (): number | '' => {
  if (typeof window === 'undefined') return Number(import.meta.env.VITE_BANK_APP_ID ?? 0) || ''

  const stored = Number(window.localStorage.getItem(BANK_APP_ID_STORAGE_KEY) ?? 0)
  if (stored > 0) return stored

  const fromEnv = Number(import.meta.env.VITE_BANK_APP_ID ?? 0)
  return fromEnv > 0 ? fromEnv : ''
}

const Bank = ({ openModal, closeModal }: BankProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress, transactionSigner } = useWallet()
  const { isBalanceHidden } = usePredX()
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = useMemo(() => AlgorandClient.fromConfig({ algodConfig, indexerConfig }), [algodConfig, indexerConfig])
  const [appId, setAppId] = useState<number | ''>(getInitialBankAppId)
  const [deploying, setDeploying] = useState<boolean>(false)
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [memo, setMemo] = useState<string>('')
  const [withdrawAmount, setWithdrawAmount] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [statements, setStatements] = useState<Statement[]>([])
  const [depositors, setDepositors] = useState<Array<{ address: string; amount: string }>>([])

  useEffect(() => {
    algorand.setDefaultSigner(transactionSigner)
  }, [algorand, transactionSigner])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!appId || appId <= 0) {
      window.localStorage.removeItem(BANK_APP_ID_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(BANK_APP_ID_STORAGE_KEY, String(appId))
  }, [appId])

  const appAddress = useMemo(() => (appId && appId > 0 ? String(getApplicationAddress(appId)) : ''), [appId])

  const refreshStatements = async () => {
    try {
      if (!appId || !activeAddress) return
      const idx = algorand.client.indexer
      const appAddr = String(getApplicationAddress(appId))
      const allTransactions: Statement[] = []

      const appTxRes = await idx.searchForTransactions().address(activeAddress).txType('appl').do()

      const appTransactions = (appTxRes.transactions || [])
        .filter((t: any) => {
          const isOurApp = t.applicationTransaction && Number(t.applicationTransaction.applicationId) === Number(appId)
          return isOurApp
        })
        .map((t: any) => {
          let amount = 1
          let type: 'deposit' | 'withdrawal' = 'deposit'
          if (t.logs && t.logs.length > 0) {
            const logStr = t.logs.join(' ')
            if (logStr.includes('withdraw') || logStr.includes('Withdraw')) type = 'withdrawal'
          }
          if (t.innerTxns && t.innerTxns.length > 0) {
            for (const innerTxn of t.innerTxns) {
              if (innerTxn.paymentTransaction) {
                amount = Number(innerTxn.paymentTransaction.amount) / 1000000
                if (innerTxn.sender === appAddr && innerTxn.paymentTransaction.receiver === activeAddress) type = 'withdrawal'
                break
              }
            }
          }
          return { id: t.id, round: Number(t.confirmedRound || t['confirmed-round']), amount, type, sender: t.sender, receiver: appAddr, timestamp: Number(t.roundTime || t['round-time']) }
        })
      allTransactions.push(...appTransactions)

      const payTxRes = await idx.searchForTransactions().address(appAddr).txType('pay').do()
      const paymentTransactions = (payTxRes.transactions || [])
        .filter((t: any) => t.sender === appAddr && t.paymentTransaction?.receiver === activeAddress)
        .map((t: any) => ({ id: t.id, round: Number(t.confirmedRound || t['confirmed-round']), amount: Number(t.paymentTransaction.amount) / 1000000, type: t.sender === activeAddress ? 'deposit' as const : 'withdrawal' as const, sender: t.sender, receiver: t.paymentTransaction.receiver, timestamp: Number(t.roundTime || t['round-time']) }))
      allTransactions.push(...paymentTransactions)
      setStatements(allTransactions.sort((a, b) => b.round - a.round))
    } catch (e) {
      console.error(`Error loading statements: ${(e as Error).message}`);
    }
  }

  const refreshDepositors = async () => {
    try {
      if (!appId) return
      const algod = algorand.client.algod
      const boxes = await algod.getApplicationBoxes(appId).do()
      const list = [] as Array<{ address: string; amount: string }>
      for (const b of boxes.boxes as Array<{ name: Uint8Array }>) {
        const nameBytes: Uint8Array = b.name
        if (nameBytes.length !== 32) continue
        const box = await algod.getApplicationBoxByName(appId, nameBytes).do()
        const addr = algosdk.encodeAddress(nameBytes)
        const valueBuf: Uint8Array = box.value
        const amountMicroAlgos = BigInt(new DataView(Buffer.from(valueBuf).buffer).getBigUint64(0, false))
        const amountAlgos = (Number(amountMicroAlgos) / 1000000).toString()
        list.push({ address: addr, amount: amountAlgos })
      }
      setDepositors(list)
    } catch (e) {
      console.error(`Error loading depositors: ${(e as Error).message}`);
    }
  }

  useEffect(() => {
    void refreshStatements()
    void refreshDepositors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, activeAddress])

  const deposit = async () => {
    try {
      if (!activeAddress || activeAddress.trim() === '') throw new Error('Please connect your wallet first')
      if (!transactionSigner) throw new Error('Wallet signer unavailable')
      if (!appId || appId <= 0) throw new Error('Enter valid App ID')
      const amountAlgos = Number(depositAmount)
      if (!amountAlgos || amountAlgos <= 0) throw new Error('Enter amount in Algos')
      const amountMicroAlgos = Math.round(amountAlgos * 1000000)
      setLoading(true)
      const sp = await algorand.client.algod.getTransactionParams().do()
      const appAddr = getApplicationAddress(appId)
      if (!algosdk.isValidAddress(activeAddress)) throw new Error('Invalid wallet address')
      if (!algosdk.isValidAddress(String(appAddr))) throw new Error('Invalid app address; check App ID')
      const payTxn = makePaymentTxnWithSuggestedParamsFromObject({ sender: activeAddress, receiver: appAddr, amount: amountMicroAlgos, suggestedParams: sp })
      const client = new BankClient({ appId: BigInt(appId), algorand, defaultSigner: transactionSigner })
      const res = await client.send.deposit({ args: { memo: memo || '', payTxn: { txn: payTxn, signer: transactionSigner } }, sender: activeAddress })
      const confirmedRound = (res.confirmation as any)?.['confirmed-round']
      enqueueSnackbar(`Deposited successfully in round ${confirmedRound}`, { variant: 'success' })
      setDepositAmount('')
      setMemo('')
      void refreshStatements()
      void refreshDepositors()
    } catch (e) {
      enqueueSnackbar(`Deposit failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async () => {
    try {
      if (!activeAddress || activeAddress.trim() === '') throw new Error('Please connect your wallet first')
      if (!transactionSigner) throw new Error('Wallet signer unavailable')
      if (!appId || appId <= 0) throw new Error('Enter valid App ID')
      const amount = Number(withdrawAmount)
      if (!amount || amount <= 0) throw new Error('Enter amount in Algos')
      const amountMicroAlgos = Math.round(amount * 1000000)
      setLoading(true)
      const client = new BankClient({ appId: BigInt(appId), algorand, defaultSigner: transactionSigner })
      const res = await client.send.withdraw({ args: { amount: amountMicroAlgos }, sender: activeAddress, extraFee: microAlgos(2000) })
      const confirmedRound = (res.confirmation as any)?.['confirmed-round']
      enqueueSnackbar(`Withdraw executed in round ${confirmedRound}`, { variant: 'success' })
      setWithdrawAmount('')
      void refreshStatements()
      void refreshDepositors()
    } catch (e) {
      enqueueSnackbar(`Withdraw failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const deployContract = async () => {
    try {
      if (!activeAddress) throw new Error('Connect wallet')
      setDeploying(true)
      const factory = new BankFactory({ defaultSender: activeAddress, algorand })
      const result = await factory.deploy()
      const newId = Number(result.appClient.appId)
      setAppId(newId)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(BANK_APP_ID_STORAGE_KEY, String(newId))
      }
      enqueueSnackbar(`Bank deployed. App ID: ${newId}`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Deploy failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <dialog id="bank_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-3xl">
        <h3 className="font-headline font-bold text-2xl text-on-surface mb-1">Bank Contract</h3>
        <p className="text-on-surface-variant text-sm mb-5">Deposit and withdraw ALGOs from the on-chain bank</p>

        <div className="flex flex-col gap-4">
          {/* App ID Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-label text-on-surface-variant uppercase tracking-widest">Application ID</label>
            <input className="input input-bordered w-full" type="number" value={appId} onChange={(e) => setAppId(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter deployed Bank App ID" />
            {appAddress && (
              <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-2 text-accent-green text-xs break-all">
                App Address: {appAddress}
              </div>
            )}
          </div>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-high border border-outline-variant/10">
              <div className="font-headline font-semibold text-on-surface text-sm">Deploy (optional)</div>
              <button className={`btn bg-accent-green/20 text-accent-green border-accent-green/30 hover:bg-accent-green/30 ${deploying ? 'loading' : ''}`} disabled={deploying || !activeAddress} onClick={(e) => { e.preventDefault(); void deployContract() }}>Deploy Bank</button>
              <p className="text-xs text-on-surface-variant">Or enter an existing App ID above.</p>
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-high border border-outline-variant/10">
              <div className="font-headline font-semibold text-on-surface text-sm">Deposit</div>
              <input className="input input-bordered w-full input-sm" placeholder="Memo (optional)" value={memo} onChange={(e) => setMemo(e.target.value)} />
              <input className="input input-bordered w-full input-sm" placeholder="Amount (Algos)" type="number" step="0.000001" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
              <button className={`btn bg-accent-green text-surface-base font-bold hover:bg-accent-green-dim btn-sm ${loading ? 'loading' : ''}`} disabled={loading || !activeAddress || !appId} onClick={(e) => { e.preventDefault(); void deposit() }}>Deposit</button>
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-high border border-outline-variant/10 md:col-span-2">
              <div className="font-headline font-semibold text-on-surface text-sm">Withdraw</div>
              <input className="input input-bordered w-full input-sm" placeholder="Amount (Algos)" type="number" step="0.000001" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
              <button className={`btn bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30 btn-sm ${loading ? 'loading' : ''}`} disabled={loading || !activeAddress || !appId} onClick={(e) => { e.preventDefault(); void withdraw() }}>Withdraw</button>
            </div>
          </div>

          {/* Statements */}
          <div className="divider">Statements</div>
          <div className="max-h-48 overflow-auto bg-surface-high rounded-xl p-3 border border-outline-variant/10">
            {statements.length === 0 ? (
              <div className="text-sm text-on-surface-variant text-center py-4">No transactions found.</div>
            ) : (
              <ul className="text-sm space-y-1">
                {statements.map((s) => (
                  <li key={s.id} className="py-2 flex justify-between items-center border-b border-outline-variant/10 last:border-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.type === 'deposit' ? 'bg-accent-green/10 text-accent-green' : 'bg-amber-500/10 text-amber-400'}`}>{s.type}</span>
                    <span className="text-on-surface-variant text-xs">round {s.round}</span>
                    <a href={`https://lora.algokit.io/testnet/transaction/${s.id}`} target="_blank" rel="noopener noreferrer" className="text-accent-green hover:underline text-xs">View</a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Depositors */}
          <div className="divider">Depositors</div>
          <div className="max-h-48 overflow-auto bg-surface-high rounded-xl p-3 border border-outline-variant/10">
            {depositors.length === 0 ? (
              <div className="text-sm text-on-surface-variant text-center py-4">No depositors yet.</div>
            ) : (
              <ul className="text-sm space-y-1">
                {depositors.map((d) => (
                  <li key={d.address} className="py-2 flex justify-between border-b border-outline-variant/10 last:border-0">
                    <span className="truncate mr-2 text-on-surface text-xs">{d.address}</span>
                    <span className="text-accent-green font-bold text-xs whitespace-nowrap">
                  {isBalanceHidden ? '****' : d.amount} Algos
                </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="modal-action">
            <button className="btn btn-ghost text-on-surface-variant" onClick={closeModal} disabled={loading}>Close</button>
            <button className="btn bg-surface-highest text-on-surface border-outline-variant/20 hover:bg-surface-bright" onClick={(e) => { e.preventDefault(); void refreshStatements(); void refreshDepositors() }}>Refresh</button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

export default Bank
