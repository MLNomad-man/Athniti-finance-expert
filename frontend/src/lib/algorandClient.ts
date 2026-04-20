/**
 * Shared AlgorandClient instance — reads from existing VITE_ env vars.
 * Uses @algorandfoundation/algokit-utils AlgorandClient.
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const algodConfig = getAlgodConfigFromViteEnvironment()
const indexerConfig = getIndexerConfigFromViteEnvironment()

const algorandClient = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

export default algorandClient
