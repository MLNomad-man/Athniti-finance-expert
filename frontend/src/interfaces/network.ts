import { AlgoClientConfig } from '@algorandfoundation/algokit-utils/types/network-client'
import type { TokenHeader } from 'algosdk/dist/types/client/urlTokenBaseHTTPClient'

export interface AlgoViteClientConfig extends AlgoClientConfig {
  server: string
  port: string | number
  token: string | TokenHeader
  network: string
}

export interface AlgoViteKMDConfig extends AlgoClientConfig {
  server: string
  port: string | number
  token: string | TokenHeader
  wallet: string
  password: string
}
