import { useState, useEffect } from 'react'
import { Search, Filter, Eye, UserX, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'citizen')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()

    // Realtime subscription
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateVerificationStatus = async (id: string, status: 'verified' | 'rejected') => {
    try {
      // Optimistic UI update
      setUsers(prev => prev.map(u => u.id === id ? { ...u, verification_status: status } : u))

      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', id)

      if (error) {
        alert('Failed to update status')
        console.error(error)
        fetchUsers() // Revert on error
      }
    } catch (err) {
      console.error(err)
      fetchUsers()
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.uc_id || '').toLowerCase().includes(searchQuery.toLowerCase())
      
    const userStatus = user.verification_status || 'verified' // default backwards compat
    const matchesStatus = filterStatus === 'all' || userStatus === filterStatus
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-100 tracking-tight mb-2">Registered Residents</h1>
          <p className="text-surface-400">View and manage resident verifications across your Union Council.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900 border border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Filter className="w-5 h-5 text-surface-500 shrink-0" />
          {['all', 'pending', 'verified', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200 border border-surface-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="glass rounded-2xl overflow-hidden border border-surface-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/50 border-b border-surface-700">
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Resident</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Union Council</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-surface-400">Loading residents...</td>
                </tr>
              ) : filteredUsers.map((user) => {
                const status = user.verification_status || 'verified'
                return (
                <tr key={user.id} className="hover:bg-surface-800/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold">
                        {(user.full_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-100">{user.full_name || 'Unnamed User'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-800 text-surface-300 border border-surface-700">
                      {user.uc_id || 'Unknown UC'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {status === 'verified' && <CheckCircle className="w-4 h-4 text-brand-400" />}
                      {status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                      {status === 'rejected' && <UserX className="w-4 h-4 text-red-400" />}
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        status === 'verified' ? 'text-brand-400' :
                        status === 'pending' ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.document_url && (
                        <a 
                          href={user.document_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-800 hover:bg-brand-500/10 text-surface-300 hover:text-brand-400 border border-surface-700 hover:border-brand-500/30 rounded-lg transition-colors text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Doc
                        </a>
                      )}
                      
                      {status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateVerificationStatus(user.id, 'verified')}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-white rounded-lg transition-colors text-xs font-medium"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button 
                            onClick={() => updateVerificationStatus(user.id, 'rejected')}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors text-xs font-medium"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        
        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-surface-500" />
            </div>
            <h3 className="text-lg font-bold text-surface-100 mb-1">No residents found</h3>
            <p className="text-surface-400 text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}
