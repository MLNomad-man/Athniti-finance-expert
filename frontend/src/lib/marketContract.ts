/**
 * marketContract.ts — Smart contract interaction functions for PredX.
 * Uses AlgorandClient from @algorandfoundation/algokit-utils and
 * transactionSigner from @txnlab/use-wallet-react.
 *
 * ABI method signatures match the deployed PredictionMarket contract exactly.
 */
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

export interface MarketBettor {
  address: string
  amount: number
  outcome: string;
  shortAddress: string
}

export interface MarketPricePoint {
  timestamp: number
  probabilityYes: number
  probabilityNo: number
}

export interface CalculatedLeaderboardEntry {
  id: string
  name: string
  address: string
  accuracy: number
  resolvedBets: number
  wins: number
  winsLast24h: number
  bestWinStreak: number
  volume: number
  profit: number
  avatar: string
  tier: string
  rank: number
}

// ABI method signatures — must match the contract exactly
const CREATE_MARKET_METHOD = new algosdk.ABIMethod({
  name: 'create_market',
  args: [
    { name: 'title', type: 'string' },
    { name: 'end_time', type: 'uint64' },
    { name: 'category', type: 'string' },
  ],
  returns: { type: 'uint64' },
})
const PLACE_BET_METHOD = new algosdk.ABIMethod({
  name: 'place_bet',
  args: [
    { name: 'market_id', type: 'uint64' },
    { name: 'outcome', type: 'uint64' },
    { name: 'payment', type: 'pay' },
  ],
  returns: { type: 'void' },
})

const CLAIM_WINNINGS_METHOD = new algosdk.ABIMethod({
  name: 'claim_winnings',
  args: [{ name: 'market_id', type: 'uint64' }],
  returns: { type: 'void' },
})

const GET_MARKET_INFO_METHOD = new algosdk.ABIMethod({
  name: 'get_market_info',
  args: [{ name: 'market_id', type: 'uint64' }],
  returns: { type: 'uint64[]' },
})

/**
 * Place a bet on a prediction market.
 * Sends an atomic group: payment txn + app call.
 * @param amountAlgo - Amount in ALGO (will be converted to microALGO × 1,000,000)
 * @returns Transaction ID
 */
export async function placeBet(
  algorand: AlgorandClient,
  activeAddress: string,
  transactionSigner: algosdk.TransactionSigner,
  appId: number,
  marketId: number,
  outcomeIndex: number, // 0 = YES, 1 = NO
  amountAlgo: number
): Promise<string> {
  const algodClient = algorand.client.algod
  const sp = await algodClient.getTransactionParams().do()
  // Increase validity window to ~50 minutes to avoid Pera Wallet "txn dead" timeouts
  sp.lastValid = sp.firstValid + 1000n

  const appAddress = algosdk.getApplicationAddress(BigInt(appId))
  const amountMicroAlgos = Math.round(amountAlgo * 1_000_000)

  // Box references for puyapy:
  //   - market box: prefix "m" + market_id as 8-byte big-endian
  //   - bet box: prefix "b" + market_id (8 bytes) + sender address (32 bytes)
  const marketIdBytes = algosdk.bigIntToBytes(BigInt(marketId), 8)
  const senderBytes = algosdk.decodeAddress(activeAddress).publicKey
  const marketBoxName = new Uint8Array([...new TextEncoder().encode('m'), ...marketIdBytes])
  const betBoxName = new Uint8Array([...new TextEncoder().encode('b'), ...marketIdBytes, ...senderBytes])

  // 1. Payment transaction to send ALGO to the contract
  const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: activeAddress,
    receiver: appAddress,
    amount: amountMicroAlgos,
    suggestedParams: sp,
  })

  // 2. App call with ABI method
  const atc = new algosdk.AtomicTransactionComposer()
  atc.addMethodCall({
    appID: appId,
    method: PLACE_BET_METHOD,
    sender: activeAddress,
    suggestedParams: { ...sp, fee: 2000, flatFee: true }, // cover both txn fees
    signer: transactionSigner,
    methodArgs: [marketId, outcomeIndex, { txn: payTxn, signer: transactionSigner }],
    boxes: [
      { appIndex: appId, name: marketBoxName },
      { appIndex: appId, name: betBoxName },
    ],
  })

  const result = await atc.execute(algodClient, 4)
  return result.txIDs[0]
}

/**
 * Claim winnings from a resolved market.
 * @returns Transaction ID
 */
export async function claimWinnings(
  algorand: AlgorandClient,
  activeAddress: string,
  transactionSigner: algosdk.TransactionSigner,
  appId: number,
  marketId: number
): Promise<string> {
  const algodClient = algorand.client.algod
  const sp = await algodClient.getTransactionParams().do()
  // Increase validity window to ~50 minutes to avoid Pera Wallet "txn dead" timeouts
  sp.lastValid = sp.firstValid + 1000n

  const marketIdBytes = algosdk.bigIntToBytes(BigInt(marketId), 8)
  const senderBytes = algosdk.decodeAddress(activeAddress).publicKey
  const marketBoxName = new Uint8Array([...new TextEncoder().encode('m'), ...marketIdBytes])
  const betBoxName = new Uint8Array([...new TextEncoder().encode('b'), ...marketIdBytes, ...senderBytes])

  const atc = new algosdk.AtomicTransactionComposer()
  atc.addMethodCall({
    appID: appId,
    method: CLAIM_WINNINGS_METHOD,
    sender: activeAddress,
    suggestedParams: { ...sp, fee: 2000, flatFee: true }, // cover inner txn fee
    signer: transactionSigner,
    methodArgs: [marketId],
    boxes: [
      { appIndex: appId, name: marketBoxName },
      { appIndex: appId, name: betBoxName },
    ],
  })

  const result = await atc.execute(algodClient, 4)
  return result.txIDs[0]
}

/**
 * Get market info from the contract (readonly).
 * Returns: { totalYes, totalNo, status, winningOutcome, endTime }
 * totalYes and totalNo are in ALGO (divided by 1,000,000).
 */
export async function getMarketInfo(
  algorand: AlgorandClient,
  appId: number,
  marketId: number
): Promise<{
  totalYes: number
  totalNo: number
  status: number // 0 = active, 1 = resolved
  winningOutcome: number
  endTime: number
}> {
  const algodClient = algorand.client.algod
  const sp = await algodClient.getTransactionParams().do()
  sp.lastValid = sp.firstValid + 1000n

  const marketIdBytes = algosdk.bigIntToBytes(BigInt(marketId), 8)
  const marketBoxName = new Uint8Array([...new TextEncoder().encode('m'), ...marketIdBytes])

  const atc = new algosdk.AtomicTransactionComposer()
  atc.addMethodCall({
    appID: appId,
    method: GET_MARKET_INFO_METHOD,
    sender: algosdk.getApplicationAddress(BigInt(appId)), // simulate from app address
    suggestedParams: sp,
    signer: algosdk.makeEmptyTransactionSigner(),
    methodArgs: [marketId],
    boxes: [{ appIndex: appId, name: marketBoxName }],
  })

  const result = await atc.simulate(algodClient)
  const returnValue = result.methodResults[0].returnValue as bigint[]

  return {
    totalYes: Number(returnValue[0]) / 1_000_000,   // microALGO → ALGO
    totalNo: Number(returnValue[1]) / 1_000_000,     // microALGO → ALGO
    status: Number(returnValue[2]),                    // 0 = active, 1 = resolved
    winningOutcome: Number(returnValue[3]),            // 0 = YES, 1 = NO
    endTime: Number(returnValue[4]),                   // unix timestamp
  }
}

// =========================================================================
// NEW: Admin & Dynamic Fetching Methods
// =========================================================================

export async function getContractAdmin(algorand: AlgorandClient, appId: number): Promise<string> {
  const state = await algorand.client.algod.getApplicationByID(appId).do()
  const globalState = state.params.globalState || []
  
  const adminKeyB64 = Buffer.from('admin').toString('base64')
  const val = globalState.find((gs: any) => gs.key === adminKeyB64)
  if (!val || val.value.type !== 1) return ''
  return algosdk.encodeAddress(val.value.bytes)
}

export async function getNextMarketId(algorand: AlgorandClient, appId: number): Promise<number> {
  const state = await algorand.client.algod.getApplicationByID(appId).do()
  const globalState = state.params.globalState || []
  const countKey = Buffer.from('market_count').toString('base64')
  const val = globalState.find((gs: any) => gs.key === countKey)
  if (!val || val.value.type !== 2) return 0
  return Number(val.value.uint)
}

export async function createMarketOnChain(
  algorand: AlgorandClient,
  activeAddress: string,
  signer: algosdk.TransactionSigner,
  appId: number,
  title: string,
  category: string,
  endTime: number,
  optA: string,
  optB: string
): Promise<number> {
  const algodClient = algorand.client.algod
  const sp = await algodClient.getTransactionParams().do()

  // 1. Get next ID to pre-generate the box name
  const currentCount = await getNextMarketId(algorand, appId)
  const newId = currentCount + 1
  
  const marketIdBytes = algosdk.bigIntToBytes(BigInt(newId), 8)
  const marketBoxName = new Uint8Array([...new TextEncoder().encode('m'), ...marketIdBytes])

  const atc = new algosdk.AtomicTransactionComposer()
  atc.addMethodCall({
    appID: appId,
    method: CREATE_MARKET_METHOD,
    sender: activeAddress,
    suggestedParams: { ...sp, fee: 2000, flatFee: true },
    signer: signer,
    methodArgs: [title, endTime, category, optA, optB],
    boxes: [{ appIndex: appId, name: marketBoxName }],
  })

  await atc.execute(algodClient, 4)
  return newId
}

/**
 * Parses all 'm' boxes to dynamically map markets array for the UI!
 */
export async function fetchAllMarkets(algorand: AlgorandClient, appId: number) {
  const client = algorand.client.algod
  if (!appId || appId === 0) return []
  
  try {
    const boxesResponse = await client.getApplicationBoxes(appId).do()
    const adminAddress = await getContractAdmin(algorand, appId)
    
    // ARC4 MarketData Struct tuple definition
    const marketType = algosdk.ABIType.from('(string,string,uint64,string,string,uint64,uint64,uint64,uint64)')
    const betType = algosdk.ABIType.from('(uint64,uint64,uint64)')

    const participantSets = new Map<number, Set<string>>()
    const pooledBets = new Map<number, { yesMicro: number; noMicro: number }>()

    // Fetch all 'b' boxes in parallel, capped to chunks of 50 to avoid rate limits
    const bBoxNames = boxesResponse.boxes.filter(b => b.name[0] === 98)
    const chunkSize = 30
    
    for (let i = 0; i < bBoxNames.length; i += chunkSize) {
      const chunk = bBoxNames.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (box) => {
        const marketId = Number(algosdk.bytesToBigInt(box.name.slice(1, 9)))
        const address = algosdk.encodeAddress(box.name.slice(9))
        if (address === adminAddress) return // exclude oracle/admin

        try {
          const boxData = await client.getApplicationBoxByName(appId, box.name).do()
          const decoded = betType.decode(boxData.value) as unknown[]

          const amountMicro = Number(decoded[0])
          const outcome = Number(decoded[1])

          // Handle participant set (we mutating outside but it's safe-ish if we use Map properly)
          // To be thread safe, we shouldn't mutate Map concurrently without care, but JS is single threaded
          let currentParticipants = participantSets.get(marketId)
          if (!currentParticipants) {
             currentParticipants = new Set<string>()
             participantSets.set(marketId, currentParticipants)
          }
          currentParticipants.add(address)

          let currentPool = pooledBets.get(marketId)
          if (!currentPool) {
             currentPool = { yesMicro: 0, noMicro: 0 }
             pooledBets.set(marketId, currentPool)
          }
          if (outcome === 0) {
            currentPool.yesMicro += amountMicro
          } else {
            currentPool.noMicro += amountMicro
          }
        } catch (e) {
          console.error("Error reading b box", e)
        }
      }))
    }
    
    // Now fetch 'm' boxes in parallel chunks
    const mBoxNames = boxesResponse.boxes.filter(b => b.name[0] === 109)
    const markets: any[] = []
    const now = Math.floor(Date.now() / 1000)

    const calculateProbabilities = (yesMicro: number, noMicro: number) => {
      const totalMicro = yesMicro + noMicro
      if (totalMicro <= 0) return { probYes: 50, probNo: 50 }

      const rawProbYes = (yesMicro / totalMicro) * 100
      const probYes = Math.max(0, Math.min(100, Math.round(rawProbYes)))
      const probNo = 100 - probYes

      return { probYes, probNo }
    }

    const calculateAiScore = (params: {
      totalVolumeMicro: number
      participants: number
      probYes: number
      probNo: number
      endTime: number
      status: number
    }) => {
      const volumeSignal = Math.min(params.totalVolumeMicro / 1_000_000 / 500, 1)
      const participantSignal = Math.min(params.participants / 30, 1)
      const balanceSignal = 1 - Math.min(Math.abs(params.probYes - params.probNo) / 100, 1)
      const timeToEnd = Math.max(params.endTime - now, 0)
      const urgencySignal = 1 - Math.min(timeToEnd / (14 * 24 * 60 * 60), 1)
      const resolvedBonus = params.status === 1 ? 0.1 : 0

      const composite =
        volumeSignal * 0.4 +
        participantSignal * 0.25 +
        balanceSignal * 0.2 +
        urgencySignal * 0.15 +
        resolvedBonus

      return Math.max(55, Math.min(98, Math.round(55 + composite * 40)))
    }

    for (let i = 0; i < mBoxNames.length; i += chunkSize) {
      const chunk = mBoxNames.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (box) => {
        try {
          const id_onchain = Number(algosdk.bytesToBigInt(box.name.slice(1)))
          const boxData = await client.getApplicationBoxByName(appId, box.name).do()
          
          const decoded = marketType.decode(boxData.value) as any[]
          const title = decoded[0] as string
          const category = decoded[1] as string
          const endTime = Number(decoded[2])
          const optionA = decoded[3] as string
          const optionB = decoded[4] as string
          const status = Number(decoded[7])

          const pooled = pooledBets.get(id_onchain)
          const effectiveYes = pooled ? pooled.yesMicro : 0
          const effectiveNo = pooled ? pooled.noMicro : 0
          const totalVolume = effectiveYes + effectiveNo
          const { probYes, probNo } = calculateProbabilities(effectiveYes, effectiveNo)
          const participants = participantSets.get(id_onchain)?.size ?? 0
          const aiScore = calculateAiScore({
            totalVolumeMicro: totalVolume,
            participants,
            probYes,
            probNo,
            endTime,
            status,
          })

          markets.push({
            id: `onchain_m_${id_onchain}`,
            id_onchain,
            title,
            category,
            endDate: new Date(endTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            endTimeStamp: endTime,
            volume: totalVolume / 1_000_000,
            liquidity: totalVolume / 1_000_000,
            participants,
            aiScore,
            optionA,
            optionB,
            probabilityYes: probYes,
            probabilityNo: probNo,
            image: category === 'Crypto' ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0TeU--cYm7_gBB6oycrNX9kENJEjaKW5Vvb98XNTYXbwqHpHsqPCnitPneL61QBuDGcb1ayJkKAiX50VPlYnzKatiIPYE2UJwRPs-EvqHnquyEup6mIYNecNPYn43EYxPAfimIMlffLEGlKE8Tdtbgf3yg33aZaTmt3Z6uKwFYrhd3qDmPZhKGApFnuIk0BTeFbqcoW2SHcppRlRrXnUUmzf5YW5XqnoVX49Qot0qDM6XXR5qLVZYnzL6U1N5bEyXOIsrFFShmDss' :
                   category === 'Finance' ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYS76Pq8XiORg7dokFitcfhGa7bASd518fK7HM0RKnN3Y-mxQTM9_oNX7FIzl4zcwidqCPFYFqJgjZrWsA9AIzYP9wOtG9geqQ--IBGbgwV-yVRFK0199CXjZQGKycKrR3CZP7I6kS4Hm4DvM57aPGKHu24z7XwOyq6vjt2odj2yrz8Gs3lc0Nc2lOc5z7k12tMgIn44MOLP1Ruj4lNjubK7lK2fK2tgeEM9NjDt7XVyrW6SJGjjTJqFbsT8g0mnbJz7LB6nOgqvua' : 
                   'https://lh3.googleusercontent.com/aida-public/AB6AXuAfjq107jpgMQbsLlgI9C33z1GmQAYRB57z75bDm2JEDNK4DphRFF4VvZ5SowsVpro_-ORH2Vf2edfm3VHq8WjHsFdGy4qpHHeG5hMQNXNnpFv2zE1_EwxBOB_YezSO70uOGuWd26ce3aMiNUBc8L_J8_bcD1rWM-_-xJ6xCZmVbELq97022B1yUez8_xbg7WI9xIju18KJR16zkd-FgQfAsIHFdqYUYGeAWXON8FSrizzvjuv5odMij4TpPCyUyzZ3NWAIxv5lDPfx',
            status: (status === 1 ? 'resolved' : 'active') as 'active' | 'resolved'
          })
        } catch(e) {
          console.error("Error reading m box", e)
        }
      }))
    }
    
    // Reverse sort to show newest markets first, skip first 3 deploy-script defaults
    const finalMarkets = markets
      .filter(m => m.id_onchain > 3)
      .sort((a, b) => b.id_onchain - a.id_onchain)

    return finalMarkets
  } catch (e) {
    console.error("Failed to fetch all markets dynamically:", e)
    return []
  }
}

/**
 * Builds the Book/Bettors List by fetching 'b' boxes for a market!
 */
export async function fetchMarketBettors(algorand: AlgorandClient, appId: number, targetMarketId: number) {
  const client = algorand.client.algod
  if (!appId || appId === 0) return []
  
  try {
    const boxesResponse = await client.getApplicationBoxes(appId).do()
    const adminAddress = await getContractAdmin(algorand, appId)
    
    // ARC4 BetData Struct definition: (amount, outcome, claimed)
    const betType = algosdk.ABIType.from('(uint64,uint64,uint64)')
    
    const bettors = []

    for (const box of boxesResponse.boxes) {
      if (box.name[0] === 98) { // 'b' prefix
        // Next 8 bytes is the marketId
        const boxMarketIdBytes = box.name.slice(1, 9)
        const boxMarketId = Number(algosdk.bytesToBigInt(boxMarketIdBytes))
        
        if (boxMarketId === targetMarketId) {
           const walletAddressBytes = box.name.slice(9) // 32 byte public key
           const walletAddress = algosdk.encodeAddress(walletAddressBytes)
           if (walletAddress === adminAddress) continue
            
           const boxData = await client.getApplicationBoxByName(appId, box.name).do()
           const decoded = betType.decode(boxData.value) as any[]
           
           const amount = Number(decoded[0]) / 1_000_000
           const outcomeIndex = Number(decoded[1]) // 0 = optionA, 1 = optionB
           const outcome = outcomeIndex === 0 ? 'YES' : 'NO' // kept as YES/NO for UI colour coding
           
           bettors.push({
             address: walletAddress,
             amount,
             outcome,
             outcomeIndex,
             shortAddress: walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4)
           })
        }
      }
    }
    
    // Sort highest stakes first
    return bettors.sort((a, b) => b.amount - a.amount)
  } catch (e) {
    console.error("Failed to fetch bettors list dynamically:", e)
    return []
  }
}

function getIndexerClient(): algosdk.Indexer | null {
  const server = import.meta.env.VITE_INDEXER_SERVER as string | undefined
  if (!server) return null

  return new algosdk.Indexer(
    (import.meta.env.VITE_INDEXER_TOKEN as string | undefined) ?? '',
    server,
    (import.meta.env.VITE_INDEXER_PORT as string | undefined) ?? ''
  )
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Builds market probability history from confirmed place_bet app calls.
 * Uses on-chain bet boxes for stake amounts and Indexer tx order for timeline.
 */
export async function fetchMarketPriceHistory(
  algorand: AlgorandClient,
  appId: number,
  targetMarketId: number
): Promise<MarketPricePoint[]> {
  const client = algorand.client.algod
  if (!appId || appId === 0) return []

  const indexer = getIndexerClient()
  if (!indexer) return []

  try {
    const adminAddress = await getContractAdmin(algorand, appId)
    const betType = algosdk.ABIType.from('(uint64,uint64,uint64)')
    const uint64Type = algosdk.ABIType.from('uint64')
    const selector = PLACE_BET_METHOD.getSelector()

    const boxesResponse = await client.getApplicationBoxes(appId).do()
    const betsByAddress = new Map<string, { amountMicro: number; outcome: number }>()

    for (const box of boxesResponse.boxes) {
      if (box.name[0] !== 98) continue // 'b'

      const marketId = Number(algosdk.bytesToBigInt(box.name.slice(1, 9)))
      if (marketId !== targetMarketId) continue

      const address = algosdk.encodeAddress(box.name.slice(9))
      if (address === adminAddress) continue

      const boxData = await client.getApplicationBoxByName(appId, box.name).do()
      const decoded = betType.decode(boxData.value) as unknown[]
      betsByAddress.set(address, {
        amountMicro: Number(decoded[0]),
        outcome: Number(decoded[1]),
      })
    }

    if (betsByAddress.size === 0) return []

    const events: Array<{ sender: string; timestamp: number; outcome: number; amountMicro: number }> = []
    let nextToken: string | undefined = undefined
    const seenSenders = new Set<string>()

    do {
      let req = indexer.searchForTransactions().applicationID(appId).txType('appl').limit(1000)
      if (nextToken) req = req.nextToken(nextToken)

      const res = await req.do()
      for (const tx of res.transactions ?? []) {
        const appTxn = (tx as any)['application-transaction']
        const args = appTxn?.['application-args']
        if (!args || args.length < 3) continue

        const methodSelector = algosdk.base64ToBytes(args[0])
        if (!bytesEqual(methodSelector, selector)) continue

        const marketId = Number(uint64Type.decode(algosdk.base64ToBytes(args[1])) as bigint)
        if (marketId !== targetMarketId) continue

        const sender = tx.sender
        if (sender === adminAddress) continue
        if (seenSenders.has(sender)) continue

        const betData = betsByAddress.get(sender)
        if (!betData) continue

        const outcomeDecoded = Number(uint64Type.decode(algosdk.base64ToBytes(args[2])) as bigint)
        const outcome = outcomeDecoded === 0 || outcomeDecoded === 1 ? outcomeDecoded : betData.outcome

        events.push({
          sender,
          timestamp: Number((tx as any)['round-time'] ?? 0),
          outcome,
          amountMicro: betData.amountMicro,
        })
        seenSenders.add(sender)
      }

      nextToken = (res as any)['next-token']
    } while (nextToken)

    events.sort((a, b) => a.timestamp - b.timestamp)

    let cumulativeYes = 0
    let cumulativeNo = 0
    const points: MarketPricePoint[] = []

    for (const event of events) {
      if (event.outcome === 0) {
        cumulativeYes += event.amountMicro
      } else {
        cumulativeNo += event.amountMicro
      }

      const total = cumulativeYes + cumulativeNo
      if (total <= 0) continue

      const probabilityYes = Math.max(0, Math.min(100, Math.round((cumulativeYes / total) * 100)))
      points.push({
        timestamp: event.timestamp,
        probabilityYes,
        probabilityNo: 100 - probabilityYes,
      })
    }

    return points
  } catch (error) {
    console.error('Failed to build market price history:', error)
    return []
  }
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(value)
  if (typeof value === 'string') return BigInt(value)
  throw new Error(`Unsupported uint value type: ${typeof value}`)
}

function toAlgo(valueMicro: bigint): number {
  return Number(valueMicro) / 1_000_000
}

function getTier(accuracy: number, volumeAlgo: number, resolvedBets: number): string {
  if (resolvedBets === 0) return 'Unranked'
  if (accuracy >= 85 && volumeAlgo >= 1000) return 'Global Elite'
  if (accuracy >= 70 && volumeAlgo >= 300) return 'Prophet Tier'
  if (accuracy >= 55 && volumeAlgo >= 100) return 'Veteran'
  return 'Challenger'
}

function createAddressAvatar(address: string): string {
  const seed = address.slice(0, 12)
  const colorA = `#${seed.slice(0, 6).padEnd(6, 'a')}`
  const colorB = `#${seed.slice(6, 12).padEnd(6, '3')}`
  const initials = address.slice(0, 2).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${colorA}"/><stop offset="100%" stop-color="${colorB}"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Builds a fully calculated leaderboard from on-chain box state.
 * Includes every address that has at least one bet box on this app.
 */
export async function fetchCalculatedLeaderboard(
  algorand: AlgorandClient,
  appId: number
): Promise<CalculatedLeaderboardEntry[]> {
  const client = algorand.client.algod
  if (!appId || appId === 0) return []

  const marketType = algosdk.ABIType.from('(string,string,uint64,string,string,uint64,uint64,uint64,uint64)')
  const betType = algosdk.ABIType.from('(uint64,uint64,uint64)')

  type MarketSettlement = {
    endTime: number
    totalYes: bigint
    totalNo: bigint
    status: number
    winningOutcome: number
  }

  type BettorStats = {
    address: string
    totalVolumeMicro: bigint
    resolvedBets: number
    wins: number
    netProfitMicro: bigint
    results: Array<{ endTime: number; won: boolean }>
  }

  const marketMap = new Map<number, MarketSettlement>()
  const statsMap = new Map<string, BettorStats>()

  try {
    const boxesResponse = await client.getApplicationBoxes(appId).do()
    const mBoxNames = boxesResponse.boxes.filter(b => b.name[0] === 109)
    const bBoxNames = boxesResponse.boxes.filter(b => b.name[0] === 98)
    const chunkSize = 30

    for (let i = 0; i < mBoxNames.length; i += chunkSize) {
      const chunk = mBoxNames.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (box) => {
        try {
          const marketId = Number(algosdk.bytesToBigInt(box.name.slice(1)))
          const boxData = await client.getApplicationBoxByName(appId, box.name).do()
          const decoded = marketType.decode(boxData.value) as unknown[]

          marketMap.set(marketId, {
            endTime: Number(decoded[2]),
            totalYes: toBigInt(decoded[5]),
            totalNo: toBigInt(decoded[6]),
            status: Number(decoded[7]),
            winningOutcome: Number(decoded[8]),
          })
        } catch (e) {
          console.error("Error reading m box in leaderboard:", e)
        }
      }))
    }

    for (let i = 0; i < bBoxNames.length; i += chunkSize) {
      const chunk = bBoxNames.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (box) => {
        try {
          const marketId = Number(algosdk.bytesToBigInt(box.name.slice(1, 9)))
          const address = algosdk.encodeAddress(box.name.slice(9))
          const boxData = await client.getApplicationBoxByName(appId, box.name).do()
          const decoded = betType.decode(boxData.value) as unknown[]

          const amountMicro = toBigInt(decoded[0])
          const outcome = Number(decoded[1])
          const market = marketMap.get(marketId)

          let bettor = statsMap.get(address)
          if (!bettor) {
            bettor = {
              address,
              totalVolumeMicro: 0n,
              resolvedBets: 0,
              wins: 0,
              netProfitMicro: 0n,
              results: [],
            }
            statsMap.set(address, bettor)
          }

          bettor.totalVolumeMicro += amountMicro

          if (market && market.status === 1) {
            bettor.resolvedBets += 1

            const totalPool = market.totalYes + market.totalNo
            const winningPool = market.winningOutcome === 0 ? market.totalYes : market.totalNo
            const didWin = outcome === market.winningOutcome && winningPool > 0n
            
            // Note: results logic works sequentially but concurrent pushes are safe
            bettor.results.push({ endTime: market.endTime, won: didWin })

            if (didWin) {
              const payoutMicro = (amountMicro * totalPool) / winningPool
              bettor.netProfitMicro += payoutMicro - amountMicro
              bettor.wins += 1
            } else {
              bettor.netProfitMicro -= amountMicro
            }
          }
        } catch (e) {
          console.error("Error reading b box in leaderboard:", e)
        }
      }))
    }

    const leaderboard = Array.from(statsMap.values())
      .map((stats): Omit<CalculatedLeaderboardEntry, 'rank'> => {
        const now = Math.floor(Date.now() / 1000)
        const dayAgo = now - 86_400
        const orderedResults = [...stats.results].sort((a, b) => a.endTime - b.endTime)
        const resolvedBets = orderedResults.length

        let wins = 0
        let winsLast24h = 0
        let bestWinStreak = 0
        let activeStreak = 0

        for (const result of orderedResults) {
          if (result.won) {
            wins += 1
            activeStreak += 1
            if (result.endTime >= dayAgo) winsLast24h += 1
            if (activeStreak > bestWinStreak) bestWinStreak = activeStreak
          } else {
            activeStreak = 0
          }
        }

        const volume = toAlgo(stats.totalVolumeMicro)
        const profit = toAlgo(stats.netProfitMicro)
        const accuracy = resolvedBets > 0
          ? Number(((wins / resolvedBets) * 100).toFixed(1))
          : 0

        return {
          id: stats.address,
          name: `${stats.address.slice(0, 6)}...${stats.address.slice(-4)}`,
          address: stats.address,
          accuracy,
          resolvedBets,
          wins,
          winsLast24h,
          bestWinStreak,
          volume,
          profit,
          avatar: createAddressAvatar(stats.address),
          tier: getTier(accuracy, volume, resolvedBets),
        }
      })
      .sort((a, b) => {
        if (b.profit !== a.profit) return b.profit - a.profit
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
        return b.volume - a.volume
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))

    return leaderboard
  } catch (e) {
    console.error('Failed to build calculated leaderboard:', e)
    return []
  }
}
