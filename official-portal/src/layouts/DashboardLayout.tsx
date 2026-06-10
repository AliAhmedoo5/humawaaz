import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard,
  ClipboardList,
  Megaphone,
  Settings,
  LogOut,
  MapPin,
  Users,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: ClipboardList, label: 'Tickets' },
  { to: '/notices', icon: Megaphone, label: 'Notice Board' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/settings', icon: Settings, label: 'Office Settings' },
]

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const adminNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Super Admin Overview' },
  ]
  const currentNavItems = profile?.role === 'admin' ? adminNavItems : navItems;

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 bg-surface-800 border-r border-surface-700 flex flex-col">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-surface-700 bg-surface-900/50">
          <div className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            Govt of Sindh
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-white">
              <img src="/sindh-logo.png" alt="Government of Sindh Logo" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-100 tracking-tight">HumAwaaz</h2>
              <p className="text-sm text-brand-400 font-medium">Official Portal</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {currentNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-surface-500 hover:text-surface-100 hover:bg-surface-700'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="px-4 py-4 border-t border-surface-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-100 truncate">
                {profile?.full_name || 'Official'}
              </p>
              <p className="text-[11px] text-surface-500 truncate">
                {profile?.role === 'official' ? 'UC Official' : profile?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-surface-900 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 z-50"></div>
        <Outlet />
      </main>
    </div>
  )
}
