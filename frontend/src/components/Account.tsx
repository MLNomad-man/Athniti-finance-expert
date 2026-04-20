import { useWallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const Account = () => {
  const { activeAddress } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  return (
    <div className="bg-surface-high rounded-xl p-4 border border-accent-green/20">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full bg-accent-green pulse-dot"></div>
        <span className="text-accent-green font-label text-xs uppercase tracking-widest font-bold">Connected</span>
      </div>
      <a
        className="text-on-surface font-body text-sm hover:text-accent-green transition-colors block mb-1"
        target="_blank"
        href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}
      >
        {ellipseAddress(activeAddress)}
      </a>
      <div className="text-on-surface-variant text-xs font-label uppercase tracking-wider">
        Network: {networkName}
      </div>
    </div>
  )
}

export default Account
