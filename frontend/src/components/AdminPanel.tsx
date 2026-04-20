import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { usePredX } from '../context/PredXContext'
import { useMarket } from '../hooks/useMarket'

interface AdminProps {
  openModal: boolean
  closeModal: () => void
}

const AdminPanel = ({ openModal, closeModal }: AdminProps) => {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const { addMarket } = usePredX()
  const { getAdmin, createMarket, loading } = useMarket()

  const [isAdmin, setIsAdmin] = useState(false)
  const [adminAddress, setAdminAddress] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Crypto')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (openModal && activeAddress) {
      getAdmin().then(admin => {
        setAdminAddress(admin)
        setIsAdmin(activeAddress === admin)
      })
    }
  }, [openModal, activeAddress, getAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !endDate) {
      enqueueSnackbar('Please fill out all fields', { variant: 'error' })
      return
    }

    try {
      const unixTime = Math.floor(new Date(endDate).getTime() / 1000)
      const newId = await createMarket(title, category, unixTime)
      
      addMarket({
        id: `onchain_m_${newId}`,
        id_onchain: newId,
        title,
        category,
        endDate: new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        endTimeStamp: unixTime,
        volume: 0,
        liquidity: 0,
        participants: 0,
        aiScore: 85,
        probabilityYes: 50,
        probabilityNo: 50,
        image: category === 'Crypto' ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0TeU--cYm7_gBB6oycrNX9kENJEjaKW5Vvb98XNTYXbwqHpHsqPCnitPneL61QBuDGcb1ayJkKAiX50VPlYnzKatiIPYE2UJwRPs-EvqHnquyEup6mIYNecNPYn43EYxPAfimIMlffLEGlKE8Tdtbgf3yg33aZaTmt3Z6uKwFYrhd3qDmPZhKGApFnuIk0BTeFbqcoW2SHcppRlRrXnUUmzf5YW5XqnoVX49Qot0qDM6XXR5qLVZYnzL6U1N5bEyXOIsrFFShmDss' :
                 category === 'Finance' ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYS76Pq8XiORg7dokFitcfhGa7bASd518fK7HM0RKnN3Y-mxQTM9_oNX7FIzl4zcwidqCPFYFqJgjZrWsA9AIzYP9wOtG9geqQ--IBGbgwV-yVRFK0199CXjZQGKycKrR3CZP7I6kS4Hm4DvM57aPGKHu24z7XwOyq6vjt2odj2yrz8Gs3lc0Nc2lOc5z7k12tMgIn44MOLP1Ruj4lNjubK7lK2fK2tgeEM9NjDt7XVyrW6SJGjjTJqFbsT8g0mnbJz7LB6nOgqvua' : 
                 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfjq107jpgMQbsLlgI9C33z1GmQAYRB57z75bDm2JEDNK4DphRFF4VvZ5SowsVpro_-ORH2Vf2edfm3VHq8WjHsFdGy4qpHHeG5hMQNXNnpFv2zE1_EwxBOB_YezSO70uOGuWd26ce3aMiNUBc8L_J8_bcD1rWM-_-xJ6xCZmVbELq97022B1yUez8_xbg7WI9xIju18KJR16zkd-FgQfAsIHFdqYUYGeAWXON8FSrizzvjuv5odMij4TpPCyUyzZ3NWAIxv5lDPfx',
        status: 'active'
      })

      enqueueSnackbar('Market deployed seamlessly onto TestNet!', { variant: 'success' })
      closeModal()
    } catch (e: any) {
      enqueueSnackbar(`Failed to create market: ${e.message}`, { variant: 'error' })
    }
  }

  if (!openModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-opacity">
      <div className="bg-surface-container-high border border-outline-variant/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="px-6 py-5 border-b border-outline-variant/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">admin_panel_settings</span>
            <h2 className="text-xl font-headline font-bold text-on-surface">PredX Admin</h2>
          </div>
          <button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {!isAdmin ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-error text-6xl mb-4">gpp_bad</span>
              <h3 className="text-lg font-bold text-on-surface mb-2">Access Denied</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Your connected wallet does not match the Smart Contract Admin.
              </p>
              <div className="bg-surface-container rounded-lg p-3 text-xs font-mono text-on-surface-variant break-all">
                Contract Admin: {adminAddress || 'Loading...'}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-primary-container/10 border border-primary-container/20 rounded-lg p-4 mb-6">
                <p className="text-xs text-primary-container font-mono break-all font-bold">Authenticated as Admin: {activeAddress}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Market Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Will ALGO reach $1.00?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container transition-colors appearance-none"
                >
                  <option value="Crypto">Crypto</option>
                  <option value="Finance">Finance</option>
                  <option value="Sports">Sports</option>
                  <option value="Politics">Politics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Validation Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:border-primary-container transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-primary-container text-on-primary-container py-3 rounded-lg font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  <span className="material-symbols-outlined">rocket_launch</span>
                )}
                {loading ? 'Deploying to Chain...' : 'Deploy Market'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
