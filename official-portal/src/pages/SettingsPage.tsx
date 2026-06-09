import { useEffect, useState } from 'react'
import { Settings, CheckCircle2, Building, UserSquare, MapPin, Upload, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface UCSettings {
  id?: string
  uc_id: string
  chairman_name: string
  contact_number: string
  dealing_hours: string
  office_open: boolean
  chairman_description: string
  chairman_avatar_url: string
}

interface UCInfo {
  name: string
  district: string
  tehsil: string
}

export default function SettingsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showToast, setShowToast] = useState(false)
  
  const [ucInfo, setUcInfo] = useState<UCInfo | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [settings, setSettings] = useState<UCSettings>({
    uc_id: '',
    chairman_name: '',
    contact_number: '',
    dealing_hours: '9:00 AM - 5:00 PM',
    office_open: true,
    chairman_description: '',
    chairman_avatar_url: ''
  })

  useEffect(() => {
    if (!profile?.uc_id) return

    async function fetchData() {
      try {
        // Fetch UC info
        const { data: ucData, error: ucError } = await supabase
          .from('union_councils')
          .select('name, district, tehsil')
          .eq('id', profile?.uc_id)
          .single()
        
        if (ucError) throw ucError
        setUcInfo(ucData)

        // Fetch Settings
        const { data: setData, error: setError } = await supabase
          .from('uc_settings')
          .select('*')
          .eq('uc_id', profile?.uc_id)
          .single()

        if (setError && setError.code !== 'PGRST116') { // PGRST116 means zero rows
          throw setError
        }

        if (setData) {
          setSettings(setData)
        } else {
          setSettings(prev => ({ ...prev, uc_id: profile?.uc_id || '' }))
        }

        // Fetch Avatar
        if (setData?.chairman_avatar_url) {
          setAvatarUrl(setData.chairman_avatar_url)
        } else if (profile?.id) {
          // Fallback to legacy profiles avatar if any
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', profile.id)
            .single()
          if (profileData?.avatar_url) {
            setAvatarUrl(profileData.avatar_url)
          }
        }

      } catch (err) {
        console.error('Error fetching settings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.uc_id])

  const handleToggle = async () => {
    const newState = !settings.office_open
    setSettings(prev => ({ ...prev, office_open: newState }))
    await saveSettings({ office_open: newState })
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveSettings(settings)
  }

  const saveSettings = async (dataToSave: Partial<UCSettings>) => {
    if (!profile?.uc_id) return
    setSaving(true)
    try {
      // Upsert
      const payload = { ...settings, ...dataToSave, uc_id: profile.uc_id, updated_at: new Date().toISOString() }
      
      const { data: existing } = await supabase.from('uc_settings').select('id').eq('uc_id', profile.uc_id).single()

      if (existing?.id) {
        // update
        await supabase.from('uc_settings').update(payload).eq('id', existing.id)
      } else {
        // insert
        await supabase.from('uc_settings').insert(payload)
      }

      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true)
      if (!event.target.files || event.target.files.length === 0) return

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `avatars/${profile?.id}-${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('complaints')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('complaints')
        .getPublicUrl(fileName)

      // Save avatar URL to uc_settings instead of profiles
      const { data: existing } = await supabase.from('uc_settings').select('id').eq('uc_id', profile.uc_id).single()
      
      if (existing?.id) {
        await supabase.from('uc_settings').update({ chairman_avatar_url: publicUrl }).eq('id', existing.id)
      } else {
        await supabase.from('uc_settings').insert({ uc_id: profile.uc_id, chairman_avatar_url: publicUrl })
      }
      
      setSettings(prev => ({...prev, chairman_avatar_url: publicUrl}))
      
      setAvatarUrl(publicUrl)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)

    } catch (error) {
      console.error('Error uploading avatar:', error)
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-surface-500 animate-pulse">Loading settings...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto relative">
      {/* Toast */}
      {showToast && (
        <div className="absolute top-4 right-8 bg-brand-500/20 border border-brand-500 text-brand-400 px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Settings saved successfully!</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-brand-400" />
        <h1 className="text-2xl font-bold text-surface-100">Office Settings</h1>
      </div>

      <div className="grid gap-6">
        
        {/* Office Status */}
        <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2 mb-1">
              <Building className="w-5 h-5 text-brand-400" />
              Office Status
            </h2>
            <p className="text-surface-400 text-sm">Toggle whether the UC office is currently accepting walk-ins and physical visitors.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-surface-800 p-2 pl-4 rounded-full border border-surface-700 shrink-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full ${settings.office_open ? 'bg-brand-500 shadow-[0_0_8px_var(--color-brand-500)]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
              <span className={settings.office_open ? 'text-surface-100' : 'text-surface-400'}>
                {settings.office_open ? 'Office Open' : 'Office Closed'}
              </span>
            </span>
            
            <button 
              onClick={handleToggle}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${settings.office_open ? 'bg-brand-500' : 'bg-surface-600'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${settings.office_open ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
        </div>

        {/* Chairman & Contact Info */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2 mb-6 border-b border-surface-700 pb-4">
            <UserSquare className="w-5 h-5 text-brand-400" />
            Official Profile & Contact
          </h2>

          <div className="mb-8 flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Official Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-surface-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-surface-800 flex items-center justify-center border-4 border-surface-700">
                  <Camera className="w-8 h-8 text-surface-500" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-brand-500 p-2 rounded-full cursor-pointer hover:bg-brand-600 transition-colors shadow-lg">
                <Upload className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} className="hidden" />
              </label>
            </div>
            <div>
              <h3 className="text-surface-100 font-bold mb-1">Profile Picture</h3>
              <p className="text-sm text-surface-400 mb-2">This photo will be visible to citizens in the resolution timeline.</p>
              {uploadingAvatar && <p className="text-xs text-brand-400 font-medium animate-pulse">Uploading...</p>}
            </div>
          </div>
          
          <form onSubmit={handleSaveForm} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">Chairman / Official Name</label>
                <input 
                  type="text" 
                  value={settings.chairman_name}
                  onChange={e => setSettings({...settings, chairman_name: e.target.value})}
                  placeholder="E.g., Muhammad Aslam"
                  className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">Contact Number</label>
                <input 
                  type="text" 
                  value={settings.contact_number}
                  onChange={e => setSettings({...settings, contact_number: e.target.value})}
                  placeholder="E.g., 021-34567890"
                  className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-surface-400 mb-1.5">Dealing Hours</label>
                <input 
                  type="text" 
                  value={settings.dealing_hours}
                  onChange={e => setSettings({...settings, dealing_hours: e.target.value})}
                  placeholder="E.g., 9:00 AM - 5:00 PM (Mon-Fri)"
                  className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-400 mb-1.5">Chairman Biography / Description</label>
              <textarea 
                value={settings.chairman_description}
                onChange={e => setSettings({...settings, chairman_description: e.target.value})}
                placeholder="E.g., Dedicated to improving infrastructure and community services..."
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/20 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* System Info */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2 mb-6 border-b border-surface-700 pb-4">
            <MapPin className="w-5 h-5 text-brand-400" />
            Union Council Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Assigned UC</p>
              <p className="text-surface-100 font-medium">{ucInfo?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">Tehsil / Town</p>
              <p className="text-surface-100 font-medium">{ucInfo?.tehsil || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider mb-1">District</p>
              <p className="text-surface-100 font-medium">{ucInfo?.district || '—'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
