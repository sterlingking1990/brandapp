'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  X, 
  Facebook, 
  Loader2, 
  AlertCircle, 
  Coins,
  MapPin,
  Tag,
  Target,
  Users,
  Smartphone,
  Globe
} from 'lucide-react'

interface FacebookAdCreationModalProps {
  isVisible: boolean
  onClose: () => void
  media: any
  brandId: string
  onAdCreated: () => void
}

export default function FacebookAdCreationModal({
  isVisible,
  onClose,
  media,
  brandId,
  onAdCreated,
}: FacebookAdCreationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brandUsername, setBrandUsername] = useState('')
  
  const [formData, setFormData] = useState({
    adGoal: 'APP_INSTALL' as 'APP_INSTALL' | 'PROMOTE_MEDIA',
    campaignName: '',
    adName: 'Main Ad',
    adHeadline: '',
    adDescription: '',
    dailyBudget: '2000',
    targetingLocations: 'Nigeria',
    targetingInterests: '',
  })

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  const supabase = createClient()

  useEffect(() => {
    if (media) {
      setFormData(prev => ({
        ...prev,
        campaignName: `FB - ${media.caption?.substring(0, 20) || 'Campaign'} - ${new Date().toLocaleDateString()}`,
        adHeadline: 'Check this out!',
        adDescription: media.caption || 'Discover our latest collection.',
      }))
    }
  }, [media])

  useEffect(() => {
    const fetchUsername = async () => {
      if (brandId) {
        const { data } = await supabase
          .from('brands')
          .select('profiles(username)')
          .eq('id', brandId)
          .single()
        if (data) setBrandUsername((data.profiles as any)?.username || '')
      }
    }
    fetchUsername()
  }, [brandId])

  const handleCreateAd = async () => {
    if (parseFloat(formData.dailyBudget) < 2000) {
      setError('Minimum daily budget is ₦2000')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const totalBudget = parseFloat(formData.dailyBudget) * days

      const finalAdCreativeLinkUrl = formData.adGoal === 'APP_INSTALL'
        ? 'https://play.google.com/store/apps/details?id=com.brandiblebms.app'
        : `https://shop.brandiblebms.com/${brandUsername}/wall`

      const payload = {
        media_id: media.id,
        brand_id: brandId,
        name: formData.campaignName,
        objective: formData.adGoal === 'APP_INSTALL' ? 'OUTCOME_APP_PROMOTION' : 'OUTCOME_TRAFFIC',
        budget_daily: parseFloat(formData.dailyBudget),
        budget_total: totalBudget,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        targeting_params: {
          geo_locations: {
            countries: ['NG'],
            regions: formData.targetingLocations ? formData.targetingLocations.split(',').map(l => ({ name: l.trim() })) : [],
          },
          interests: formData.targetingInterests ? formData.targetingInterests.split(',').map(i => i.trim()) : [],
        },
        ad_creative_headline: formData.adHeadline,
        ad_creative_body: formData.adDescription,
        ad_creative_call_to_action: formData.adGoal === 'APP_INSTALL' ? 'INSTALL_APP' : 'LEARN_MORE',
        ad_creative_image_url: media.thumbnail_url || media.media_url,
        ad_creative_link_url: finalAdCreativeLinkUrl,
        ad_creative_video_url: media.media_type === 'video' ? media.media_url : null,
        ad_creative_media_type: media.media_type,
        ad_goal_type: formData.adGoal,
      }

      const { data, error: invokeError } = await supabase.functions.invoke('create-facebook-ad', {
        body: payload,
      })

      if (invokeError) throw invokeError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message)

      onAdCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create Facebook ad')
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                 <Facebook size={28} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-gray-900">Create Facebook Ad</h3>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Meta Network Promotion</p>
              </div>
           </div>
           <button onClick={onClose} className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Form Section */}
              <div className="space-y-8">
                 {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                       <AlertCircle size={20} />
                       {error}
                    </div>
                 )}

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ad Goal</label>
                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setFormData({...formData, adGoal: 'APP_INSTALL'})}
                            className={`p-4 rounded-2xl border text-left transition-all ${formData.adGoal === 'APP_INSTALL' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                             <div className="flex items-center gap-2 mb-1">
                                <Smartphone size={14} className={formData.adGoal === 'APP_INSTALL' ? 'text-blue-600' : 'text-gray-400'} />
                                <p className={`font-bold text-sm ${formData.adGoal === 'APP_INSTALL' ? 'text-blue-700' : 'text-gray-900'}`}>App Installs</p>
                             </div>
                             <p className="text-[10px] text-gray-500 leading-tight">Get more people to download the Brandible app.</p>
                          </button>
                          <button 
                            onClick={() => setFormData({...formData, adGoal: 'PROMOTE_MEDIA'})}
                            className={`p-4 rounded-2xl border text-left transition-all ${formData.adGoal === 'PROMOTE_MEDIA' ? 'border-blue-500 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                             <div className="flex items-center gap-2 mb-1">
                                <Globe size={14} className={formData.adGoal === 'PROMOTE_MEDIA' ? 'text-blue-600' : 'text-gray-400'} />
                                <p className={`font-bold text-sm ${formData.adGoal === 'PROMOTE_MEDIA' ? 'text-blue-700' : 'text-gray-900'}`}>Promote Wall</p>
                             </div>
                             <p className="text-[10px] text-gray-500 leading-tight">Send customers directly to your product wall.</p>
                          </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Campaign Name</label>
                       <input 
                         value={formData.campaignName}
                         onChange={e => setFormData({...formData, campaignName: e.target.value})}
                         className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                         placeholder="e.g. Meta Awareness Campaign"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ad Headline</label>
                       <input 
                         value={formData.adHeadline}
                         onChange={e => setFormData({...formData, adHeadline: e.target.value})}
                         className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                         placeholder="Catchy main headline..."
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ad Body Copy</label>
                       <textarea 
                         value={formData.adDescription}
                         onChange={e => setFormData({...formData, adDescription: e.target.value})}
                         className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                         rows={3}
                         placeholder="Compelling description for your audience..."
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Daily Budget (₦)</label>
                          <div className="relative">
                             <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                             <input 
                               type="number"
                               value={formData.dailyBudget}
                               onChange={e => setFormData({...formData, dailyBudget: e.target.value})}
                               className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Coins Equiv.</label>
                          <div className="h-[50px] bg-gray-100/50 rounded-2xl flex items-center px-4 text-sm font-black text-gray-900">
                             {parseFloat(formData.dailyBudget || '0') / 10} BC / day
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Start Date</label>
                          <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">End Date</label>
                          <input 
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none"
                          />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Audience & Summary Section */}
              <div className="space-y-8 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100">
                 <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                       <Users size={18} className="text-blue-600" /> Target Audience
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Locations</label>
                          <div className="relative">
                             <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                             <input 
                               value={formData.targetingLocations}
                               onChange={e => setFormData({...formData, targetingLocations: e.target.value})}
                               placeholder="e.g. Lagos, Abuja"
                               className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-sm"
                             />
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Interests</label>
                          <div className="relative">
                             <Tag className="absolute left-4 top-4 text-gray-400" size={16} />
                             <textarea 
                               value={formData.targetingInterests}
                               onChange={e => setFormData({...formData, targetingInterests: e.target.value})}
                               placeholder="Shopping, Fitness, Beauty..."
                               className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-sm min-h-[100px]"
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-gray-200">
                    <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Meta Ad Budget</p>
                       <div className="flex items-end justify-between">
                          <h4 className="text-3xl font-black">
                             ₦{(parseFloat(formData.dailyBudget || '0') * (Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)).toLocaleString()}
                          </h4>
                          <p className="text-sm font-bold opacity-90 mb-1">
                             ≈ {(parseFloat(formData.dailyBudget || '0') * (Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)) / 10} BC
                          </p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
           <button 
             onClick={onClose}
             className="px-8 py-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
           >
              Cancel
           </button>
           <button 
             onClick={handleCreateAd}
             disabled={loading}
             className="flex-1 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
           >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                 <>
                    <Facebook size={20} />
                    Deploy Facebook Ad
                 </>
              )}
           </button>
        </div>
      </div>
    </div>
  )
}
