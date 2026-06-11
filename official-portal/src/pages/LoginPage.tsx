import { useState, useEffect, type FormEvent } from 'react'
import { Megaphone } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 text-brand-500 text-xs font-bold uppercase tracking-widest rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
            Government of Sindh
          </div>
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-5 shadow-lg border border-surface-700/50">
            <img src="/sindh-logo.png" alt="Government of Sindh Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-surface-100 mb-2">
            Hum-Awaaz Portal
          </h1>
          <p className="text-surface-500 text-sm">
            Local Government Department • UC Official Login
          </p>
        </div>

        {/* Login Card or Mobile Blocker */}
        <div className="glass rounded-2xl p-8 glow-brand">
          {isMobile ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Megaphone className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-surface-100 mb-2">Desktop Required</h2>
              <p className="text-surface-400 text-sm">
                The Official Portal contains complex dashboards and sensitive tools. Please open this link on a laptop or desktop computer to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-500 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="official@humawaaz.pk"
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-500 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-surface-800 border border-surface-600 rounded-xl text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

          <p className="mt-6 text-center text-xs text-surface-500">
            Access is restricted to admin-provisioned UC official accounts only.
          </p>
        </div>

        <p className="text-center text-xs text-surface-600 mt-8">
          &copy; {new Date().getFullYear()} Hum-Awaaz &mdash; Civic Engagement Platform for Karachi
        </p>
      </div>
    </div>
  )
}
