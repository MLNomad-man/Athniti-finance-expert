/**
 * Shared AlgorandClient instance — hardcoded to Algorand TestNet.
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

const algodServer = import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
const indexerServer = import.meta.env.VITE_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud'

const algodClient = new algosdk.Algodv2('', algodServer, '')
const indexerClient = new algosdk.Indexer('', indexerServer, '')

const algorandClient = AlgorandClient.fromClients({ algod: algodClient, indexer: indexerClient })

export default algorandClient
