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

              {/* General Settings */}
              <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Financial & Security</h3>
                 </div>
                 <SettingItem icon={<Wallet className="text-emerald-600" />} label="Top Up Coins" sub="Buy more Brandible Coins" href="/dashboard/store" router={router} />
                 <SettingItem icon={<History className="text-blue-600" />} label="Transaction History" sub="View receipts and invoices" href="/dashboard/transactions" router={router} />
                 <SettingItem icon={<ShieldCheck className="text-brand" />} label="Account Security" sub="Password and authentication" router={router} />
              </div>

              <div className="bg-white rounded-[2.5rem] p-4 border border-gray-100 shadow-sm">
                 <div className="p-4 border-b border-gray-50 mb-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Preferences & Support</h3>
                 </div>
                 <SettingItem icon={<Bell className="text-orange-600" />} label="Notifications" sub="Configure push and email alerts" router={router} />
                 <SettingItem icon={<HelpCircle className="text-purple-600" />} label="Help Center" sub="Frequently asked questions" router={router} />
                 <SettingItem icon={<MessageCircle className="text-brand" />} label="Join Community" sub="Connect on WhatsApp" router={router} />
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
    </div>
  )
}

function SettingItem({ icon, label, sub, href, router }: any) {
  return (
    <button 
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all group"
      onClick={() => href && router.push(href)}
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
