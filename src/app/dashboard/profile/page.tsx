'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Briefcase, 
  Camera, 
  Edit3, 
  Check, 
  X, 
  LogOut, 
  ChevronRight, 
  Wallet, 
  History, 
  Bell, 
  ShieldCheck, 
  Globe, 
  Coins,
  Loader2,
  Trash2,
  MessageCircle,
  HelpCircle,
  Star
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function BrandProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [brand, setBrand] = useState<any>(null)
  const [industries, setIndustries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [showPromoRequests, setShowPromoRequests] = useState(false)
  
  const [formData, setFormData] = useState({
    company_name: '',
    industry_id: '',
    business_phone_number: ''
  })

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Fetch Brand
      const { data: brandData } = await supabase
        .from('brands')
        .select(`
          *,
          industry:industry(id, name)
        `)
        .eq('profile_id', user.id)
        .single()
      
      if (brandData) {
        setBrand(brandData)
        setFormData({
          company_name: brandData.company_name || '',
          industry_id: brandData.industry?.id || '',
          business_phone_number: brandData.business_phone_number || ''
        })
      }

      // Fetch Industries
      const { data: indData } = await supabase
        .from('industries')
        .select('*')
        .order('name')
      setIndustries(indData || [])

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUpdating(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      setToastMessage('Profile picture updated!')
      setShowToast(true)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          company_name: formData.company_name,
          industry: formData.industry_id,
          business_phone_number: formData.business_phone_number
        })
        .eq('profile_id', profile.id)

      if (error) throw error

      setToastMessage('Profile updated successfully!')
      setShowToast(true)
      setEditing(false)
      fetchData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-500 font-bold uppercase tracking-widest mt-4 text-[10px]">Loading Account...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleUpdateAvatar}
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <User className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">My Account</h1>
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto w-full space-y-8 pb-20">
        {/* Profile Header Card */}
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
           <div className="absolute top-0 left-0 right-0 h-32 bg-brand/5 group-hover:bg-brand/10 transition-colors" />
           
           <div className="relative flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                 <div className="h-32 w-32 rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden bg-gray-100">
                    <img 
                      src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${brand?.company_name || profile?.username}&background=random`} 
                      className="h-full w-full object-cover"
                      alt=""
                    />
                    {updating && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                         <Loader2 className="animate-spin text-white" size={24} />
                      </div>
                    )}
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute -bottom-2 -right-2 h-10 w-10 bg-brand text-white rounded-2xl border-4 border-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                 >
                    <Camera size={18} />
                 </button>
              </div>

              <div className="flex-1 text-center md:text-left space-y-2">
                 <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <h2 className="text-3xl font-black text-gray-900">{brand?.company_name || 'Brand Name'}</h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest self-center md:self-auto">
                       <ShieldCheck size={14} />
                       {brand?.verification_status || 'Verified'}
                    </div>
                 </div>
                 <p className="text-gray-500 font-bold tracking-wide">@{profile?.username}</p>
                 <p className="text-gray-400 text-sm">{profile?.email}</p>
                 
                 <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                       <Coins size={16} className="text-brand" />
                       <span className="text-sm font-black text-gray-900">{profile?.brandible_coins?.toLocaleString() || 0} BC</span>
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Balance</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                       <Briefcase size={16} className="text-blue-600" />
                       <span className="text-sm font-black text-gray-900">{brand?.industry?.name || 'Not Set'}</span>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => setEditing(!editing)}
                className={`h-14 px-6 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all ${
                  editing 
                  ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                  : 'bg-gray-900 text-white shadow-lg shadow-black/10 hover:bg-gray-800'
                }`}
              >
                 {editing ? <X size={20} /> : <Edit3 size={20} />}
                 {editing ? 'Cancel' : 'Edit Profile'}
              </button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left: Settings List */}
           <div className="lg:col-span-2 space-y-6">
              {/* Company Info Form (Conditionally rendered) */}
              {editing && (
                 <div className="bg-white rounded-[2.5rem] p-10 border border-brand/20 shadow-xl shadow-brand/5 space-y-8 animate-in slide-in-from-top-4">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">Update Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Company Name</label>
                          <div className="relative">
                             <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                             <input 
                               value={formData.company_name}
                               onChange={e => setFormData({...formData, company_name: e.target.value})}
                               className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Industry</label>
                          <div className="relative">
                             <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                             <select 
                               value={formData.industry_id}
                               onChange={e => setFormData({...formData, industry_id: e.target.value})}
                               className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold appearance-none cursor-pointer"
                             >
                                <option value="">Select Industry</option>
                                {industries.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                             </select>
                          </div>
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp Business Number</label>
                          <div className="relative">
                             <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                             <input 
                               value={formData.business_phone_number}
                               onChange={e => setFormData({...formData, business_phone_number: e.target.value})}
                               placeholder="e.g. +234..."
                               className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all font-bold"
                             />
                          </div>
                       </div>
                    </div>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={updating}
                      className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {updating ? <Loader2 className="animate-spin" size={24} /> : <><Check size={24} /> SAVE ALL CHANGES</>}
                    </button>
                 </div>
              )}

              {/* Account Settings */}
              <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Account</h3>
                 </div>
                 <SettingItem icon={<Wallet className="text-emerald-600" />} label="Top Up Coins" sub="Buy more Brandible Coins" href="/dashboard/store" router={router} />
                 <SettingItem icon={<History className="text-blue-600" />} label="Transaction History" sub="View receipts and invoices" onClick={() => setShowTransactions(true)} router={router} />
                 <SettingItem icon={<Bell className="text-orange-600" />} label="My Notifications" sub="View your notifications" onClick={() => setShowNotifications(true)} router={router} />
                 <SettingItem icon={<ShieldCheck className="text-brand" />} label="Notification Preferences" sub="Configure push and email alerts" onClick={() => setShowNotifSettings(true)} router={router} />
              </div>

              {/* Business Settings */}
              <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Business</h3>
                 </div>
                 <SettingItem icon={<Coins className="text-emerald-600" />} label="Payment Methods" sub="Manage payment options" router={router} />
                 <SettingItem icon={<Globe className="text-blue-600" />} label="Analytics & Reports" sub="Campaign performance insights" href="/dashboard/analytics" router={router} />
              </div>

              {/* Support Settings */}
              <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Support</h3>
                 </div>
                 <SettingItem icon={<Star className="text-indigo-600" />} label="Promotion Requests" sub="View status of your hub promotion requests" onClick={() => setShowPromoRequests(true)} router={router} />
                 <SettingItem icon={<HelpCircle className="text-purple-600" />} label="Community Guidelines" sub="Platform rules and policies" router={router} />
                 <SettingItem icon={<MessageCircle className="text-brand" />} label="Join WhatsApp Channel" sub="Connect with the community" href="https://whatsapp.com/channel/0029Vb7vPtU60eBix1xREK2J" router={router} external />
              </div>
           </div>

           {/* Right: Referral & Danger Zone */}
           <div className="space-y-8">
              <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-3xl -mr-10 -mt-10" />
                 
                 <div className="relative space-y-6">
                    <div className="h-12 w-12 bg-brand rounded-2xl flex items-center justify-center">
                       <Star className="fill-white" size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-bold">Invite & Earn</h3>
                       <p className="text-white/50 text-sm mt-2 leading-relaxed">
                          Our referral system is getting an upgrade. Check back soon to start earning bonus coins!
                       </p>
                    </div>
                    <div className="pt-4">
                       <div className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center text-white/30 font-black tracking-widest">
                          LOCKED
                       </div>
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-4 border border-red-50 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em]">Danger Zone</h3>
                 </div>
                 <button 
                   onClick={handleSignOut}
                   className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <LogOut size={24} />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-gray-900">Sign Out</p>
                          <p className="text-xs text-gray-400 font-medium">Terminate your session</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-red-600" />
                 </button>
              </div>
           </div>
        </div>
      </main>
      {showTransactions && <TransactionsDrawer onClose={() => setShowTransactions(false)} />}
      {showNotifications && <NotificationsDrawer onClose={() => setShowNotifications(false)} />}
      {showNotifSettings && <NotifSettingsDrawer onClose={() => setShowNotifSettings(false)} />}
      {showPromoRequests && <BrandPromoRequestsDrawer onClose={() => setShowPromoRequests(false)} />}
    </div>
  )
}

function TransactionsDrawer({ onClose }: { onClose: () => void }) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const isCredit = (type: string) =>
    ['earned','purchased','released_from_escrow','escrow_released','referral_reward','reward','challenge_reward','achievement_reward'].includes(type)

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setTransactions(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <History size={20} className="text-brand" />
            <h2 className="text-lg font-black text-gray-900">Transaction History</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <History size={48} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-500">No Transactions Yet</p>
              <p className="text-sm text-gray-400 mt-1">When you buy or spend coins, they'll appear here.</p>
            </div>
          ) : transactions.map((tx) => {
            const credit = isCredit(tx.type)
            return (
              <div key={tx.id} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${credit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <Coins size={18} className={credit ? 'text-emerald-600' : 'text-red-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-300 capitalize mt-0.5">{tx.type}</p>
                </div>
                <span className={`font-black text-sm flex-shrink-0 ${credit ? 'text-emerald-600' : 'text-red-500'}`}>
                  {credit ? '+' : '-'}{Math.abs(tx.amount)} BC
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NotificationsDrawer({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Bell size={20} className="text-brand" />
            <h2 className="text-lg font-black text-gray-900">Notifications</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <Bell size={48} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-500">No Notifications Yet</p>
            </div>
          ) : notifications.map((n) => (
            <div key={n.id} className={`flex items-start gap-4 rounded-2xl p-4 ${n.is_read ? 'bg-gray-50' : 'bg-brand/5 border-l-4 border-brand'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-brand uppercase tracking-widest mb-1">{n.type?.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-800 font-medium">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button onClick={() => markAsRead(n.id)} className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-xl bg-brand/10 hover:bg-brand/20 transition-colors">
                  <Check size={16} className="text-brand" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NotifSettingsDrawer({ onClose }: { onClose: () => void }) {
  const defaultPrefs = { new_message: true, submission_approved: true, invite_accepted: true, new_campaign: true }
  const [prefs, setPrefs] = useState(defaultPrefs)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('notification_preferences').eq('id', user.id).single()
      setPrefs({ ...defaultPrefs, ...(data?.notification_preferences || {}) })
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ notification_preferences: prefs }).eq('id', user.id)
    setSaving(false)
    onClose()
  }

  const items = [
    { key: 'new_message', title: 'New Chat Messages', desc: 'Receive a notification for each new chat message.' },
    { key: 'submission_approved', title: 'Submission Updates', desc: 'Get notified when a challenge submission is approved or rejected.' },
    { key: 'invite_accepted', title: 'Campaign Invitations', desc: 'Receive alerts for new private campaign invitations.' },
    { key: 'new_campaign', title: 'New Campaigns', desc: 'Get notified when new campaigns are available.' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-brand" />
            <h2 className="text-lg font-black text-gray-900">Notification Preferences</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : (
            <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
              {items.map(({ key, title, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${prefs[key as keyof typeof prefs] ? 'bg-brand' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${prefs[key as keyof typeof prefs] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100">
          <button onClick={save} disabled={saving}
            className="w-full py-3.5 bg-brand text-white font-black rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function BrandPromoRequestsDrawer({ onClose }: { onClose: () => void }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: brand } = await supabase.from('brands').select('id').eq('profile_id', user.id).single()
      if (!brand) return
      const { data } = await supabase
        .from('promotion_requests')
        .select('*, hubs:hub_id(name)')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false })
      setRequests(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-red-100 text-red-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Star size={20} className="text-brand" />
            <h2 className="text-lg font-black text-gray-900">Promotion Requests</h2>
          </div>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center">
              <Star size={48} className="text-gray-200 mb-4" />
              <p className="font-bold text-gray-500">No Requests Sent Yet</p>
              <p className="text-sm text-gray-400 mt-1">Go to a hub and send a promotion request to a hub owner.</p>
            </div>
          ) : requests.map((req) => (
            <div key={req.id} className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{req.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Hub: {req.hubs?.name || '—'}</p>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex-shrink-0 ${statusColor[req.status]}`}>{req.status}</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{req.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-bold text-emerald-600">{req.reward_amount} BC reward</span>
                <span>{new Date(req.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingItem({ icon, label, sub, href, router, external, onClick }: any) {
  const handleClick = () => {
    if (onClick) return onClick()
    if (!href) return
    if (external) window.open(href, '_blank')
    else router.push(href)
  }
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group"
      onClick={handleClick}
    >
       <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-white border border-transparent group-hover:border-gray-100">
             {icon}
          </div>
          <div className="text-left">
             <p className="font-bold text-gray-900">{label}</p>
             <p className="text-xs text-gray-400 font-medium">{sub}</p>
          </div>
       </div>
       <ChevronRight size={20} className="text-gray-300 group-hover:text-brand" />
    </button>
  )
}
