import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Clock,
  Eye,
  CheckCircle2,
  Flame,
  Building2,
  TrendingUp,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
interface Complaint {
  id: string
  title: string
  department: string
  status: string
  upvote_count: number
  created_at: string
  is_urgent: boolean
  address: string | null
}

interface DailyCount {
  date: string
  label: string
  count: number
}

interface DeptCount {
  department: string
  count: number
}

/* ────────────────────────────────────────────
   Time-ago helper
   ──────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

/* ────────────────────────────────────────────
   Skeleton Components
   ──────────────────────────────────────────── */

function MetricCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 rounded bg-surface-700" />
        <div className="h-10 w-10 rounded-xl bg-surface-700" />
      </div>
      <div className="h-9 w-16 rounded bg-surface-700" />
    </div>
  )
}

function ChartSkeleton({ height = 'h-72' }: { height?: string }) {
  return (
    <div className={`glass rounded-2xl p-6 animate-pulse ${height}`}>
      <div className="h-5 w-40 rounded bg-surface-700 mb-6" />
      <div className="flex items-end gap-2 h-3/4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-surface-700"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="glass rounded-2xl p-6 animate-pulse">
      <div className="h-5 w-36 rounded bg-surface-700 mb-6" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="h-4 flex-1 rounded bg-surface-700" />
          <div className="h-4 w-16 rounded bg-surface-700" />
        </div>
      ))}
    </div>
  )
}

/* ────────────────────────────────────────────
   Metric Card
   ──────────────────────────────────────────── */

interface MetricCardProps {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
  bgClass: string
}

function MetricCard({ label, value, icon, colorClass, bgClass }: MetricCardProps) {
  return (
    <div className="glass rounded-2xl p-6 hover:scale-[1.03] transition-all duration-300 cursor-default group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-surface-500 tracking-wide uppercase">
          {label}
        </p>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgClass} transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <p className={`text-4xl font-bold tabular-nums ${colorClass}`}>
        {value?.toLocaleString() ?? 0}
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────
   Custom Chart Tooltip
   ──────────────────────────────────────────── */

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-2 shadow-lg border border-white/10">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-brand-400">
        {payload[0].value} complaint{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

/* ────────────────────────────────────────────
   Department bar colors
   ──────────────────────────────────────────── */

const DEPT_COLORS = [
  'oklch(0.68 0.14 160)', // brand-400
  'oklch(0.80 0.15 75)',  // accent-400
  'oklch(0.65 0.15 250)', // status-acknowledged
  'oklch(0.65 0.16 155)', // status-resolved
  'oklch(0.75 0.15 60)',  // status-pending
  'oklch(0.58 0.16 160)', // brand-500
  'oklch(0.72 0.17 75)',  // accent-500
  'oklch(0.78 0.10 160)', // brand-300
]

/* ────────────────────────────────────────────
   Main Dashboard Component
   ──────────────────────────────────────────── */

export default function DashboardPage() {
  const { profile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [ucName, setUcName] = useState<string>('')
  const [totalCount, setTotalCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [acknowledgedCount, setAcknowledgedCount] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)
  const [weeklyTrend, setWeeklyTrend] = useState<DailyCount[]>([])
  const [urgentQueue, setUrgentQueue] = useState<Complaint[]>([])
  const [deptBreakdown, setDeptBreakdown] = useState<DeptCount[]>([])

  const ucId = profile?.uc_id

  /* ── Fetch UC name ── */
  const fetchUcName = useCallback(async () => {
    if (!ucId) return
    try {
      const { data, error } = await supabase
        .from('union_councils')
        .select('name')
        .eq('id', ucId)
        .single()
      if (error) throw error
      setUcName(data?.name ?? '')
    } catch (err) {
      console.error('Error fetching UC name:', err)
    }
  }, [ucId])

  /* ── Fetch metric counts ── */
  const fetchCounts = useCallback(async () => {
    if (!ucId) return
    try {
      const [total, pending, acknowledged, resolved] = await Promise.all([
        supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('uc_id', ucId),
        supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('uc_id', ucId)
          .eq('status', 'pending'),
        supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('uc_id', ucId)
          .eq('status', 'acknowledged'),
        supabase
          .from('complaints')
          .select('id', { count: 'exact', head: true })
          .eq('uc_id', ucId)
          .eq('status', 'resolved'),
      ])

      setTotalCount(total.count ?? 0)
      setPendingCount(pending.count ?? 0)
      setAcknowledgedCount(acknowledged.count ?? 0)
      setResolvedCount(resolved.count ?? 0)
    } catch (err) {
      console.error('Error fetching counts:', err)
    }
  }, [ucId])

  /* ── Fetch weekly trend ── */
  const fetchWeeklyTrend = useCallback(async () => {
    if (!ucId) return
    try {
      const now = new Date()
      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(now.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('complaints')
        .select('created_at')
        .eq('uc_id', ucId)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (error) throw error

      // Build day map
      const dayMap: Record<string, number> = {}
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo)
        d.setDate(sevenDaysAgo.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        dayMap[key] = 0
      }

      for (const row of data ?? []) {
        const key = new Date(row.created_at).toISOString().slice(0, 10)
        if (key in dayMap) dayMap[key]++
      }

      const trend: DailyCount[] = Object.entries(dayMap).map(
        ([date, count]) => {
          const d = new Date(date + 'T00:00:00')
          return {
            date,
            label: `${dayNames[d.getDay()]} ${d.getDate()}`,
            count,
          }
        }
      )

      setWeeklyTrend(trend)
    } catch (err) {
      console.error('Error fetching weekly trend:', err)
    }
  }, [ucId])

  /* ── Fetch urgent queue ── */
  const fetchUrgentQueue = useCallback(async () => {
    if (!ucId) return
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, title, department, status, upvote_count, created_at, is_urgent, address')
        .eq('uc_id', ucId)
        .eq('status', 'pending')
        .order('is_urgent', { ascending: false })
        .order('upvote_count', { ascending: false })
        .limit(4)

      if (error) throw error
      setUrgentQueue(data ?? [])
    } catch (err) {
      console.error('Error fetching urgent queue:', err)
    }
  }, [ucId])

  /* ── Fetch department breakdown ── */
  const fetchDeptBreakdown = useCallback(async () => {
    if (!ucId) return
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('department')
        .eq('uc_id', ucId)

      if (error) throw error

      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const dept = row.department || 'Uncategorized'
        counts[dept] = (counts[dept] || 0) + 1
      }

      const sorted = Object.entries(counts)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count)

      setDeptBreakdown(sorted)
    } catch (err) {
      console.error('Error fetching department breakdown:', err)
    }
  }, [ucId])

  /* ── Load all data ── */
  const loadAllData = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchUcName(),
      fetchCounts(),
      fetchWeeklyTrend(),
      fetchUrgentQueue(),
      fetchDeptBreakdown(),
    ])
    setLoading(false)
  }, [fetchUcName, fetchCounts, fetchWeeklyTrend, fetchUrgentQueue, fetchDeptBreakdown])

  useEffect(() => {
    if (ucId) {
      loadAllData()
    } else {
      setLoading(false)
    }
  }, [ucId, loadAllData])

  /* ── Realtime subscription ── */
  useEffect(() => {
    if (!ucId) return

    const channel = supabase
      .channel('dashboard-complaints')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
          filter: `uc_id=eq.${ucId}`,
        },
        () => {
          fetchCounts()
          fetchWeeklyTrend()
          fetchUrgentQueue()
          fetchDeptBreakdown()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ucId, fetchCounts, fetchWeeklyTrend, fetchUrgentQueue, fetchDeptBreakdown])

  /* ── Greeting based on time of day ── */
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  /* ────────────────────────────────────────
     Render
     ──────────────────────────────────────── */

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* ── Header ── */}
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-surface-100 tracking-tight">
              Executive Dashboard
            </h1>
            {ucName && (
              <p className="text-sm text-surface-500 mt-0.5">
                {ucName} Union Council
              </p>
            )}
          </div>
        </div>
        <p className="text-surface-500 text-sm mt-2 sm:mt-0">
          {greeting},{' '}
          <span className="text-surface-100 font-medium">
            {profile?.full_name ?? 'Official'}
          </span>
        </p>
      </header>

      {/* ── Metric Cards ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Total Reports"
            value={totalCount}
            colorClass="text-brand-400"
            bgClass="bg-brand-500/15"
            icon={<FileText className="w-5 h-5 text-brand-400" />}
          />
          <MetricCard
            label="Pending"
            value={pendingCount}
            colorClass="text-status-pending"
            bgClass="bg-status-pending/15"
            icon={<Clock className="w-5 h-5 text-status-pending" />}
          />
          <MetricCard
            label="Acknowledged"
            value={acknowledgedCount}
            colorClass="text-status-acknowledged"
            bgClass="bg-status-acknowledged/15"
            icon={<Eye className="w-5 h-5 text-status-acknowledged" />}
          />
          <MetricCard
            label="Resolved"
            value={resolvedCount}
            colorClass="text-status-resolved"
            bgClass="bg-status-resolved/15"
            icon={<CheckCircle2 className="w-5 h-5 text-status-resolved" />}
          />
        </div>
      )}

      {/* ── Dashboard Main Content ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Requires Immediate Attention (spans 2 cols) */}
        {loading ? (
          <div className="xl:col-span-2">
            <QueueSkeleton />
          </div>
        ) : (
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-bold text-gray-900">
                  Requires Immediate Attention
                </h2>
              </div>
              <Link to="/tickets" className="text-sm font-bold text-emerald-600 hover:text-emerald-700">
                View All
              </Link>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 pb-3 mb-3 border-b border-gray-100 text-sm font-bold text-gray-500">
              <div className="col-span-5">Issue</div>
              <div className="col-span-3">Location</div>
              <div className="col-span-2 text-center">Upvotes</div>
              <div className="col-span-2 text-center">Action</div>
            </div>

            {/* Table Body */}
            {urgentQueue.length > 0 ? (
              <div className="flex-col flex divide-y divide-gray-50">
                {urgentQueue.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 py-4 items-center group">
                    <div className="col-span-5 pr-4">
                      <div className="flex items-start gap-2">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.is_urgent ? 'bg-red-500' : 'bg-orange-400'}`} />
                        <div>
                          <p className="text-[15px] font-bold text-gray-800 group-hover:text-brand-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Reported {timeAgo(item.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-3 text-sm text-gray-600 font-medium truncate pr-2">
                      {item.address || item.department}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${item.is_urgent ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
                        <span className="text-sm font-bold">{item.upvote_count}</span>
                      </div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Link to="/tickets" className="px-4 py-1.5 bg-white border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 rounded shadow-sm text-sm font-bold transition-all">
                        Resolve
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No urgent issues — all clear!</p>
              </div>
            )}
          </div>
        )}

        {/* Weekly Resolution Volume (Bar Chart) */}
        {loading ? (
          <ChartSkeleton />
        ) : (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 p-6 flex flex-col h-full min-h-[350px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-gray-900">
                Weekly Resolution Volume
              </h2>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex-1">
              {weeklyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyTrend} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} 
                      dy={10}
                      tickFormatter={(val) => val.split(' ')[0]} // Just show day name e.g. Mon
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }}
                      tickCount={4}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl text-xs font-bold">
                            {payload[0].value} resolved
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40}>
                      {weeklyTrend.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === weeklyTrend.length - 1 ? '#059669' : '#e5e7eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <p className="text-sm font-medium">No data</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Department Breakdown ── */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <ChartSkeleton height="h-64" />
        ) : (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-accent-400" />
              <h2 className="text-lg font-semibold text-surface-100">
                Department Breakdown
              </h2>
            </div>
            {deptBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={deptBreakdown}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.010 260)" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.35 0.010 260)" tick={{ fill: 'oklch(0.35 0.010 260)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="department" stroke="oklch(0.35 0.010 260)" tick={{ fill: 'oklch(0.50 0.01 260)', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="glass rounded-xl px-4 py-2 shadow-lg border border-white/10">
                        <p className="text-xs text-surface-500 mb-1">{payload[0].payload.department}</p>
                        <p className="text-sm font-semibold text-accent-400">{payload[0].value} complaint{Number(payload[0].value) !== 1 ? 's' : ''}</p>
                      </div>
                    )
                  }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                    {deptBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DEPT_COLORS[index % DEPT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-surface-500">
                <Building2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No department data yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
