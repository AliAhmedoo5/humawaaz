import { useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2, X, Info, HandHeart } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Announcement {
  id: string
  type: string
  title: string
  body: string
  created_at: string
  user_id: string
}

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export default function NoticesPage() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Announcement[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form State
  const [newType, setNewType] = useState('announcement')
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')

  const fetchNotices = async () => {
    if (!profile?.uc_id) return
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('uc_id', profile.uc_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotices(data as Announcement[])
    } catch (err) {
      console.error('Error fetching notices:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotices()

    const subscription = supabase
      .channel('announcements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `uc_id=eq.${profile?.uc_id}` }, () => {
        fetchNotices()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [profile?.uc_id])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      setNotices(notices.filter(n => n.id !== id))
    } catch (err) {
      console.error('Error deleting notice:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile?.uc_id || !newTitle.trim() || !newBody.trim()) return
    setSubmitting(true)
    try {
      const { error } = await supabase.from('announcements').insert({
        uc_id: profile.uc_id,
        user_id: user.id,
        type: newType,
        title: newTitle,
        body: newBody
      })
      if (error) throw error
      
      setShowModal(false)
      setNewTitle('')
      setNewBody('')
      setNewType('announcement')
      await fetchNotices()
    } catch (err) {
      console.error('Error creating notice:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-surface-500 animate-pulse">Loading notices...</div>
  }

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-brand-400" />
          <h1 className="text-2xl font-bold text-surface-100">Notice Board</h1>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          New Notice
        </button>
      </div>

      {notices.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-surface-600/50">
          <Megaphone className="w-12 h-12 text-surface-600 mb-4" />
          <h3 className="text-lg font-bold text-surface-100 mb-2">No active notices</h3>
          <p className="text-surface-500 text-sm max-w-sm">Keep your UC residents informed by posting an official announcement or civic request.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-6 text-brand-400 text-sm font-medium hover:text-brand-300"
          >
            Post the first notice &rarr;
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {notices.map(notice => (
            <div key={notice.id} className="glass rounded-2xl p-5 hover:border-surface-600 transition-colors group relative">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex items-center gap-2">
                  {notice.type === 'announcement' ? (
                    <span className="flex items-center gap-1.5 bg-brand-500/10 text-brand-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
                      <Info className="w-3.5 h-3.5" /> Announcement
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-accent-500/10 text-accent-400 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">
                      <HandHeart className="w-3.5 h-3.5" /> Civic Request
                    </span>
                  )}
                  <span className="text-xs text-surface-500">{timeAgo(notice.created_at)}</span>
                </div>
                
                <button 
                  onClick={() => handleDelete(notice.id)}
                  className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 p-1.5 bg-surface-800 rounded-md transition-all duration-200"
                  title="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-lg font-bold text-surface-100 mb-2">{notice.title}</h3>
              <p className="text-surface-300 text-sm leading-relaxed whitespace-pre-wrap">{notice.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-surface-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-surface-100">Create New Notice</h2>
              <button onClick={() => setShowModal(false)} className="text-surface-500 hover:text-surface-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-2">Notice Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer rounded-xl border p-3 flex flex-col items-center gap-2 transition-colors ${newType === 'announcement' ? 'border-brand-500 bg-brand-500/5' : 'border-surface-700 bg-surface-800 hover:border-surface-600'}`}>
                    <input type="radio" name="type" value="announcement" checked={newType === 'announcement'} onChange={(e) => setNewType(e.target.value)} className="sr-only" />
                    <Info className={`w-5 h-5 ${newType === 'announcement' ? 'text-brand-400' : 'text-surface-500'}`} />
                    <span className={`text-sm font-semibold ${newType === 'announcement' ? 'text-brand-400' : 'text-surface-300'}`}>Announcement</span>
                  </label>
                  <label className={`cursor-pointer rounded-xl border p-3 flex flex-col items-center gap-2 transition-colors ${newType === 'civic_request' ? 'border-accent-500 bg-accent-500/5' : 'border-surface-700 bg-surface-800 hover:border-surface-600'}`}>
                    <input type="radio" name="type" value="civic_request" checked={newType === 'civic_request'} onChange={(e) => setNewType(e.target.value)} className="sr-only" />
                    <HandHeart className={`w-5 h-5 ${newType === 'civic_request' ? 'text-accent-400' : 'text-surface-500'}`} />
                    <span className={`text-sm font-semibold ${newType === 'civic_request' ? 'text-accent-400' : 'text-surface-300'}`}>Civic Request</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g., Dengue Fumigation Schedule"
                  className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">Description</label>
                <textarea 
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Provide detailed information for the residents..."
                  className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-3 h-32 resize-none focus:outline-none focus:border-brand-500 transition-colors"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-300 hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting || !newTitle.trim() || !newBody.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
