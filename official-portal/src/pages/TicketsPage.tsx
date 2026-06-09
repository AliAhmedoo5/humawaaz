import { useEffect, useState } from 'react'
import { 
  ClipboardList, 
  ChevronUp, 
  MapPin, 
  ArrowLeft, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  Upload, 
  Camera,
  Check,
  AlertCircle,
  ExternalLink,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Profile {
  full_name: string
}

interface Complaint {
  id: string
  title: string
  description: string
  status: string
  department: string
  upvote_count: number
  created_at: string
  photo_url: string | null
  lat: number | null
  lng: number | null
  address: string | null
  resolution_photo_url: string | null
  is_urgent: boolean
  profiles: Profile
}

interface Update {
  id: string
  status: string
  remark: string
  created_at: string
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

export default function TicketsPage() {
  const { profile, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [sortBy, setSortBy] = useState<'newest' | 'upvotes'>('newest')
  
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null)
  const [remarkText, setRemarkText] = useState('')
  const [updateStatus, setUpdateStatus] = useState('acknowledged')
  const [updateDept, setUpdateDept] = useState('')
  const [submittingUpdate, setSubmittingUpdate] = useState(false)

  // Resolution Photo States
  const [resolutionPhotoFile, setResolutionPhotoFile] = useState<File | null>(null)
  const [resolutionPhotoPreview, setResolutionPhotoPreview] = useState<string | null>(null)

  const fetchComplaints = async () => {
    if (!profile?.uc_id) return
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, title, description, status, department, upvote_count, created_at, photo_url, lat, lng, address, resolution_photo_url, is_urgent, profiles(full_name)')
        .eq('uc_id', profile.uc_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComplaints(data as unknown as Complaint[])
    } catch (err) {
      console.error('Error fetching complaints:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()

    const subscription = supabase
      .channel('tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `uc_id=eq.${profile?.uc_id}` }, () => {
        fetchComplaints()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [profile?.uc_id])

  const handleTicketClick = (ticket: Complaint) => {
    setSelectedTicket(ticket)
    setUpdateStatus(ticket.status === 'pending' ? 'acknowledged' : ticket.status)
    setUpdateDept(ticket.department || '')
    setRemarkText('')
    setResolutionPhotoFile(null)
    setResolutionPhotoPreview(null)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setResolutionPhotoFile(file)
      setResolutionPhotoPreview(URL.createObjectURL(file))
    }
  }

  const uploadResolutionPhoto = async (file: File) => {
    try {
      const ext = file.name.substring(file.name.lastIndexOf(".") + 1);
      const fileName = `resolution_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('complaints')
        .upload(`resolutions/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('complaints')
        .getPublicUrl(`resolutions/${fileName}`);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Error uploading resolution photo:', err);
      return null;
    }
  }

  const handleUpdateSubmit = async () => {
    if (!selectedTicket || !user) return
    setSubmittingUpdate(true)
    try {
      let finalPhotoUrl = selectedTicket.resolution_photo_url;
      
      // Upload new photo if selected
      if (resolutionPhotoFile) {
        const uploadedUrl = await uploadResolutionPhoto(resolutionPhotoFile)
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl
        }
      }

      // 1. Insert update if there is a remark or status/dept change
      if (remarkText.trim() || updateStatus !== selectedTicket.status || updateDept !== selectedTicket.department) {
        let autoRemark = remarkText;
        if (!autoRemark) {
          if (updateStatus !== selectedTicket.status && updateDept !== selectedTicket.department) {
            autoRemark = `Status updated to ${updateStatus} and department assigned to ${updateDept}`;
          } else if (updateStatus !== selectedTicket.status) {
            autoRemark = `Status updated to ${updateStatus}`;
          } else if (updateDept !== selectedTicket.department) {
            autoRemark = `Department reassigned to ${updateDept}`;
          }
        }

        const { error: insertErr } = await supabase.from('complaint_updates').insert({
          complaint_id: selectedTicket.id,
          user_id: user.id,
          status: updateStatus,
          remark: autoRemark
        })
        if (insertErr) throw insertErr
      }

      // 2. Update complaint
      const { error: updateErr } = await supabase.from('complaints')
        .update({ 
          status: updateStatus,
          department: updateDept,
          resolution_photo_url: finalPhotoUrl
        })
        .eq('id', selectedTicket.id)
      
      if (updateErr) throw updateErr

      await fetchComplaints()
      // update local state selected ticket to reflect changes without closing
      setSelectedTicket({ 
        ...selectedTicket, 
        status: updateStatus,
        department: updateDept,
        resolution_photo_url: finalPhotoUrl
      })
      setRemarkText('')
      setResolutionPhotoFile(null)
      setResolutionPhotoPreview(null)
    } catch (err) {
      console.error('Error submitting update:', err)
    } finally {
      setSubmittingUpdate(false)
    }
  }

  const filteredComplaints = complaints
    .filter(c => statusFilter === 'All' || c.status === statusFilter.toLowerCase())
    .filter(c => deptFilter === 'All' || c.department === deptFilter)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return b.upvote_count - a.upvote_count
    })

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'text-status-pending bg-status-pending/10 border border-status-pending/20'
      case 'acknowledged': return 'text-status-acknowledged bg-status-acknowledged/10 border border-status-acknowledged/20'
      case 'resolved': return 'text-status-resolved bg-status-resolved/10 border border-status-resolved/20'
      default: return 'text-surface-400 bg-surface-700'
    }
  }

  if (loading) {
    return <div className="p-8 text-surface-500 animate-pulse">Loading tickets...</div>
  }

  // ==== DETAIL VIEW (FULL PAGE) ====
  if (selectedTicket) {
    return (
      <div className="p-6 md:p-10 h-full overflow-y-auto bg-surface-900/50">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-surface-800">
            <button 
              onClick={() => setSelectedTicket(null)} 
              className="flex items-center gap-2 text-surface-400 hover:text-surface-100 transition-colors w-fit"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Complaints Queue</span>
            </button>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(selectedTicket.status)}`}>
                {selectedTicket.status === 'pending' ? <AlertCircle className="w-3.5 h-3.5" /> : null}
                {selectedTicket.status}
              </div>
              <span className="text-surface-400 font-medium text-sm">Ticket ID: #{selectedTicket.id.split('-')[0].toUpperCase()}</span>
            </div>
          </div>

          {/* Title Area */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-surface-100 mb-3">{selectedTicket.title}</h1>
            <div className="flex items-center gap-2 text-surface-400 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>Reported: {new Date(selectedTicket.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} by {selectedTicket.profiles?.full_name}</span>
            </div>
          </div>

          {/* Media Section: Split 50/50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-8 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
            <div className="h-[350px] bg-surface-800 relative">
              {selectedTicket.photo_url ? (
                <img src={selectedTicket.photo_url} alt="Issue" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-surface-600 bg-surface-800/50">
                  <Camera className="w-10 h-10 mb-2 opacity-50" />
                  <span className="font-medium">No Photo Attached</span>
                </div>
              )}
            </div>
            
            <div 
              className="h-[350px] bg-surface-800 relative group cursor-pointer" 
              onClick={() => {
                if (selectedTicket.lat && selectedTicket.lng) {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${selectedTicket.lat},${selectedTicket.lng}`, '_blank')
                }
              }}
            >
              {selectedTicket.lat && selectedTicket.lng ? (
                <>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0, pointerEvents: 'none' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedTicket.lng-0.005},${selectedTicket.lat-0.005},${selectedTicket.lng+0.005},${selectedTicket.lat+0.005}&layer=mapnik&marker=${selectedTicket.lat},${selectedTicket.lng}`}
                    title="Location Map"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm shadow-md px-3 py-2 rounded-lg flex items-center gap-2 border border-gray-100 hover:bg-gray-50 transition-colors z-10">
                    <ExternalLink className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-gray-700 tracking-wide">Open in Device Maps</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-surface-600 bg-surface-800/50">
                  <MapPin className="w-10 h-10 mb-2 opacity-50" />
                  <span className="font-medium">No Location Provided</span>
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Column (Description) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass rounded-2xl p-8 h-full">
                <h2 className="text-xl font-bold text-surface-100 mb-4">Description</h2>
                <p className="text-surface-300 leading-relaxed mb-8 text-[15px]">{selectedTicket.description}</p>
                
                <hr className="border-surface-800 mb-6" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-brand-400 font-bold mb-2 uppercase tracking-wider">Category</p>
                    <div className="flex items-center gap-2 text-surface-200">
                      <Tag className="w-4 h-4 text-surface-400" />
                      <span className="font-semibold">{selectedTicket.department}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-brand-400 font-bold mb-2 uppercase tracking-wider">Location Details</p>
                    <div className="text-surface-200 font-medium leading-snug" title={selectedTicket.address || 'Unknown'}>
                      {selectedTicket.address || 'Unknown location'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Management) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Resolution Management */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-surface-100 mb-6">Resolution Management</h2>
                
                <div className="mb-5">
                  <label className="block text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Current Status</label>
                  <div className="flex bg-gray-100 rounded-xl p-1.5 border border-gray-200">
                    {['pending', 'acknowledged', 'resolved'].map(status => (
                      <button
                        key={status}
                        onClick={() => setUpdateStatus(status)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${updateStatus === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {updateStatus === status && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
                          {status}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Assign Department</label>
                  <select 
                    value={updateDept}
                    onChange={(e) => setUpdateDept(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-sm font-medium text-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-shadow"
                  >
                    <option value="SSWMB (Solid Waste)">SSWMB (Solid Waste)</option>
                    <option value="KWSB (Water & Sewerage)">KWSB (Water & Sewerage)</option>
                    <option value="K-Electric">K-Electric</option>
                    <option value="KMC (Metropolitan)">KMC (Metropolitan)</option>
                    <option value="DMC (District)">DMC (District)</option>
                    <option value="Traffic Police">Traffic Police</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs text-gray-500 font-bold uppercase tracking-wider">Public Remark</label>
                    <span className="text-[10px] text-gray-400 font-medium">Visible to citizen</span>
                  </div>
                  <textarea 
                    placeholder="Enter an official update regarding the resolution progress..."
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 placeholder:text-gray-400 transition-all"
                  />
                </div>
              </div>

              {/* Resolution Proof */}
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-surface-100 mb-6">Resolution Proof</h2>
                
                {resolutionPhotoPreview || selectedTicket.resolution_photo_url ? (
                   <div className="relative h-48 rounded-xl overflow-hidden border border-surface-700 group shadow-inner">
                     <img src={resolutionPhotoPreview || selectedTicket.resolution_photo_url!} alt="Resolution" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <button 
                          onClick={() => {
                            setResolutionPhotoFile(null);
                            setResolutionPhotoPreview(null);
                          }}
                          className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Remove Photo
                        </button>
                     </div>
                   </div>
                ) : (
                  <div className="border-2 border-dashed border-surface-600 bg-surface-800/30 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors hover:bg-surface-800/50 hover:border-surface-500">
                    <div className="w-14 h-14 bg-surface-800 border border-surface-700 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                      <Camera className="w-6 h-6 text-brand-400" />
                    </div>
                    <h3 className="text-surface-200 font-bold mb-1.5">Awaiting Success Photo</h3>
                    <p className="text-surface-500 text-xs mb-6 max-w-[220px] leading-relaxed">Upload visual proof of the fixed utility to validate the resolution.</p>
                    <label className="px-5 py-2.5 bg-surface-700 hover:bg-surface-600 text-surface-100 text-sm font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-2 shadow-sm">
                      <Upload className="w-4 h-4" />
                      Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Discard Changes
                </button>
                <button 
                  onClick={handleUpdateSubmit}
                  disabled={submittingUpdate || (!remarkText.trim() && selectedTicket.status === updateStatus && selectedTicket.department === updateDept && !resolutionPhotoFile)}
                  className="flex-1 py-3.5 px-4 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                >
                  {submittingUpdate ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit Update</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==== LIST VIEW (DEFAULT) ====
  return (
    <div className="p-8 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <ClipboardList className="w-6 h-6 text-brand-400" />
        <h1 className="text-2xl font-bold text-surface-100">Ticket Management</h1>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 mb-6 shrink-0 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {['All', 'Pending', 'Acknowledged', 'Resolved'].map(s => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-surface-600 text-surface-100' : 'bg-transparent text-surface-400 hover:bg-surface-700 hover:text-surface-100'}`}
            >
              {s}
            </button>
          ))}
        </div>
        
        <div className="flex gap-4 items-center">
          <select 
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-surface-800 border border-surface-600 text-sm text-surface-100 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="All">All Departments</option>
            <option value="SSWMB (Solid Waste)">SSWMB (Solid Waste)</option>
            <option value="KWSB (Water & Sewerage)">KWSB (Water & Sewerage)</option>
            <option value="K-Electric">K-Electric</option>
            <option value="KMC (Metropolitan)">KMC (Metropolitan)</option>
            <option value="DMC (District)">DMC (District)</option>
            <option value="Traffic Police">Traffic Police</option>
            <option value="Other">Other</option>
          </select>

          <button 
            onClick={() => setSortBy(sortBy === 'newest' ? 'upvotes' : 'newest')}
            className="px-3 py-1.5 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100 hover:bg-surface-700 transition-colors"
          >
            Sort: {sortBy === 'newest' ? 'Newest' : 'Most Upvoted'}
          </button>
        </div>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8 pr-2">
        {filteredComplaints.length === 0 ? (
          <div className="text-center py-12 text-surface-500">No complaints found matching filters.</div>
        ) : (
          filteredComplaints.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => handleTicketClick(ticket)}
              className="glass rounded-xl p-5 cursor-pointer hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors group"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {ticket.is_urgent && (
                      <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                    <h3 className="text-surface-100 font-bold truncate group-hover:text-brand-400 transition-colors">{ticket.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded uppercase tracking-wider font-bold ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className="text-surface-300 bg-surface-800 border border-surface-700 px-2 py-0.5 rounded font-medium">
                      {ticket.department}
                    </span>
                    <span className="text-surface-500 font-medium">by {ticket.profiles?.full_name || 'Citizen'}</span>
                    <span className="text-surface-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {timeAgo(ticket.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-surface-800 border border-surface-700 text-surface-300 px-3 py-1.5 rounded-lg shrink-0">
                  <ChevronUp className="w-4 h-4 text-accent-400" />
                  <span className="text-sm font-bold">{ticket.upvote_count}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
