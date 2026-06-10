import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ShieldAlert, Users, Map, Plus, Key } from 'lucide-react'

interface UC {
  id: string;
  name: string;
  tehsil: string;
  district: string;
}

interface Profile {
  id: string;
  role: string;
  uc_id: string;
  verification_status: string;
}

interface UCStats {
  uc: UC;
  citizenCount: number;
  pendingCount: number;
  hasOfficial: boolean;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<UCStats[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [newCredentials, setNewCredentials] = useState<{email: string, password: string} | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [ucRes, profileRes] = await Promise.all([
        supabase.from('union_councils').select('*').order('name'),
        supabase.from('profiles').select('id, role, uc_id, verification_status')
      ])

      if (ucRes.error) throw ucRes.error
      if (profileRes.error) throw profileRes.error

      const ucs = ucRes.data as UC[]
      const profiles = profileRes.data as Profile[]

      const compiledStats = ucs.map(uc => {
        const ucProfiles = profiles.filter(p => p.uc_id === uc.id)
        return {
          uc,
          citizenCount: ucProfiles.filter(p => p.role === 'citizen').length,
          pendingCount: ucProfiles.filter(p => p.role === 'citizen' && p.verification_status === 'pending').length,
          hasOfficial: ucProfiles.some(p => p.role === 'official' || p.role === 'admin' && p.uc_id === uc.id) // note: admin is not tied to UC usually, but checking official
        }
      })

      setStats(compiledStats)
    } catch (err) {
      console.error('Failed to load super admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function generateCredentials(uc: UC) {
    setGeneratingFor(uc.id)
    setNewCredentials(null)

    try {
      // Create a secondary client so we don't log out the super admin!
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const secondarySupabase = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      })

      // Generate credentials
      // remove spaces and special chars for email
      const safeName = uc.name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const email = `admin_${safeName}@humawaaz.pk`
      const password = `Humawaaz2026_${safeName.substring(0,4)}!`

      // Sign up the new official
      const { data, error } = await secondarySupabase.auth.signUp({
        email,
        password
      })

      if (error) {
        if (error.message.includes('already registered')) {
           alert('An account with ' + email + ' already exists! Please use that or check the database directly.')
           throw error
        }
        throw error
      }

      if (data.user) {
        // Insert their profile into the actual db
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: `${uc.name} Official`,
          role: 'official',
          uc_id: uc.id,
          is_verified: true,
          verification_status: 'verified'
        })

        if (profileError) throw profileError

        setNewCredentials({ email, password })
        
        // Update local state to reflect official exists
        setStats(prev => prev.map(s => s.uc.id === uc.id ? { ...s, hasOfficial: true } : s))
      }
    } catch (err: any) {
      console.error('Failed to generate credentials:', err)
      alert('Error: ' + err.message)
    } finally {
      setGeneratingFor(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-surface-400">Loading City Overview...</div>
  }

  const totalCitizens = stats.reduce((acc, curr) => acc + curr.citizenCount, 0)
  const totalPending = stats.reduce((acc, curr) => acc + curr.pendingCount, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-surface-100 mb-2 flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-brand-500" />
          Super Admin Overview
        </h1>
        <p className="text-surface-400">Master control panel for the HumAwaaz Platform.</p>
      </div>

      {newCredentials && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <Key className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-emerald-400 font-bold text-lg mb-1">Official Account Created!</h3>
              <p className="text-surface-300 text-sm mb-4">Please securely copy these credentials and provide them to the UC Chairman. They will not be shown again.</p>
              
              <div className="space-y-2 bg-surface-900/50 p-4 rounded-xl inline-block border border-surface-700/50">
                <div className="flex gap-4">
                  <span className="text-surface-500 w-20">Email:</span>
                  <strong className="text-surface-100 select-all">{newCredentials.email}</strong>
                </div>
                <div className="flex gap-4">
                  <span className="text-surface-500 w-20">Password:</span>
                  <strong className="text-surface-100 select-all">{newCredentials.password}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High-level metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          <Users className="w-16 h-16 text-brand-500/10 absolute -right-2 -bottom-2" />
          <h3 className="text-surface-400 text-sm font-medium mb-1">Total Registered Citizens</h3>
          <p className="text-4xl font-bold text-surface-100">{totalCitizens}</p>
        </div>
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          <ShieldAlert className="w-16 h-16 text-amber-500/10 absolute -right-2 -bottom-2" />
          <h3 className="text-surface-400 text-sm font-medium mb-1">Pending Verifications</h3>
          <p className="text-4xl font-bold text-surface-100">{totalPending}</p>
        </div>
        <div className="glass rounded-3xl p-6 relative overflow-hidden">
          <Map className="w-16 h-16 text-emerald-500/10 absolute -right-2 -bottom-2" />
          <h3 className="text-surface-400 text-sm font-medium mb-1">Union Councils Tracked</h3>
          <p className="text-4xl font-bold text-surface-100">{stats.length}</p>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-surface-700/50">
          <h2 className="text-xl font-bold text-surface-100">Union Council Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800/50 text-surface-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-1/3">Union Council</th>
                <th className="p-4 font-semibold text-center">Citizens</th>
                <th className="p-4 font-semibold text-center">Pending Verifications</th>
                <th className="p-4 font-semibold text-center">Official Portal Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/50">
              {stats.map(({ uc, citizenCount, pendingCount, hasOfficial }) => (
                <tr key={uc.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-surface-100 mb-0.5">{uc.name}</div>
                    <div className="text-xs text-surface-500">{uc.tehsil}, {uc.district}</div>
                  </td>
                  <td className="p-4 text-center text-surface-300 font-medium">{citizenCount}</td>
                  <td className="p-4 text-center">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {pendingCount} Pending
                      </span>
                    ) : (
                      <span className="text-surface-500 text-sm">0</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {hasOfficial ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => generateCredentials(uc)}
                        disabled={generatingFor === uc.id}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium bg-surface-700 hover:bg-brand-500 hover:text-white text-surface-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-surface-600 hover:border-brand-500"
                      >
                        {generatingFor === uc.id ? (
                          <span className="animate-pulse">Generating...</span>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Generate Credentials
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
