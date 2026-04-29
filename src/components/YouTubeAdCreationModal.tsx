'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  X, 
  Youtube, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  Coins,
  MapPin,
  Tag,
  Target,
  ChevronDown,
  Info,
  Smartphone,
  Users
} from 'lucide-react'

interface YouTubeAdCreationModalProps {
  isVisible: boolean
  onClose: () => void
  media: any
  brandId: string
  onAdCreated: () => void
}

export default function YouTubeAdCreationModal({
  isVisible,
  onClose,
  media,
  brandId,
  onAdCreated,
}: YouTubeAdCreationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    campaignName: '',
    adGroupName: 'Ad Group 1',
    videoTitle: '',
    videoDescription: '',
    dailyBudget: '2000',
    adFormat: 'SKIPPABLE_IN_STREAM',
    targetingLocations: 'Nigeria',
    targetingKeywords: '',
    targetingAgeRanges: [] as string[],
    targetingGenders: [] as string[],
  })

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  const ageRanges = ['AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_64', 'AGE_65_UP']
  const genders = ['MALE', 'FEMALE', 'UNDETERMINED']

  const toggleAgeRange = (range: string) => {
    setFormData(prev => ({
      ...prev,
      targetingAgeRanges: prev.targetingAgeRanges.includes(range)
        ? prev.targetingAgeRanges.filter(r => r !== range)
        : [...prev.targetingAgeRanges, range]
    }))
  }

  const toggleGender = (gender: string) => {
    setFormData(prev => ({
      ...prev,
      targetingGenders: prev.targetingGenders.includes(gender)
        ? prev.targetingGenders.filter(g => g !== gender)
        : [...prev.targetingGenders, gender]
    }))
  }

  const supabase = createClient()

  useEffect(() => {
    if (media) {
      setFormData(prev => ({
        ...prev,
        campaignName: `YT - ${media.caption?.substring(0, 20) || 'Campaign'} - ${new Date().toLocaleDateString()}`,
        videoTitle: media.caption?.substring(0, 100) || 'Check out our latest product!',
        videoDescription: media.caption || '',
      }))
    }
  }, [media])

  const handleCreateAd = async () => {
    if (parseFloat(formData.dailyBudget) < 2000) {
      setError('Minimum daily budget is ₦2000')
      return
    }

    if (!formData.videoTitle) {
      setError('Video Title is required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      const totalBudget = parseFloat(formData.dailyBudget) * days

      const payload = {
        media_id: media.id,
        brand_id: brandId,
        ad_format: formData.adFormat,
        budget_total: totalBudget,
        budget_daily: parseFloat(formData.dailyBudget),
        start_date: startDate,
        end_date: endDate,
        targeting_params: {
          locations: formData.targetingLocations.split(',').map(l => l.trim()),
          keywords: formData.targetingKeywords ? formData.targetingKeywords.split(',').map(k => k.trim()) : [],
          age_range: formData.targetingAgeRanges.length > 0 ? formData.targetingAgeRanges : undefined,
          genders: formData.targetingGenders.length > 0 ? formData.targetingGenders : undefined,
        },
        bid_strategy: 'TARGET_CPM',
        target_cpm: 2000000, // 2.00 USD in micros
        campaign_name: formData.campaignName,
        ad_group_name: formData.adGroupName,
        video_title: formData.videoTitle,
        video_description: formData.videoDescription,
      }

      const { data, error: invokeError } = await supabase.functions.invoke('create-youtube-ad', {
        body: payload,
      })

      if (invokeError) throw invokeError
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message)

      onAdCreated()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create YouTube ad')
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                 <Youtube size={28} />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-gray-900">Create YouTube Ad</h3>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 text-red-600">Video Discovery & Shorts</p>
              </div>
           </div>
           <button onClick={onClose} className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center">
              <X size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-gray-50/30">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column: Media Preview & Targeting */}
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Media Preview</label>
                    <div className="aspect-video bg-black rounded-[2rem] overflow-hidden shadow-lg relative group">
                       <video 
                         src={media.media_url}
                         poster={media.thumbnail_url}
                         className="w-full h-full object-cover"
                         controls
                       />
                       <div className="absolute top-4 left-4 h-8 w-8 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center text-white">
                          <Youtube size={14} />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                       <Target size={18} className="text-red-600" /> Audience
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Locations</label>
                          <div className="relative">
                             <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                             <input 
                               value={formData.targetingLocations}
                               onChange={e => setFormData({...formData, targetingLocations: e.target.value})}
                               placeholder="Nigeria, Lagos, etc."
                               className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-red-500"
                             />
                          </div>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Keywords</label>
                          <div className="relative">
                             <Tag className="absolute left-4 top-4 text-gray-400" size={16} />
                             <textarea 
                               value={formData.targetingKeywords}
                               onChange={e => setFormData({...formData, targetingKeywords: e.target.value})}
                               placeholder="fashion, fitness, beauty..."
                               className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm min-h-[80px] focus:ring-2 focus:ring-red-500"
                             />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Middle Column: General Info & Metadata */}
              <div className="space-y-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 {error && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                       <AlertCircle size={20} />
                       {error}
                    </div>
                 )}

                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ad Format</label>
                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setFormData({...formData, adFormat: 'SKIPPABLE_IN_STREAM'})}
                            className={`p-4 rounded-2xl border text-left transition-all ${formData.adFormat === 'SKIPPABLE_IN_STREAM' ? 'border-red-500 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                             <p className={`font-bold text-sm ${formData.adFormat === 'SKIPPABLE_IN_STREAM' ? 'text-red-700' : 'text-gray-900'}`}>Skippable</p>
                             <p className="text-[10px] text-gray-500 mt-1">Discovery & In-Stream</p>
                          </button>
                          <button 
                            onClick={() => setFormData({...formData, adFormat: 'NON_SKIPPABLE_IN_STREAM'})}
                            className={`p-4 rounded-2xl border text-left transition-all ${formData.adFormat === 'NON_SKIPPABLE_IN_STREAM' ? 'border-red-500 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                             <p className={`font-bold text-sm ${formData.adFormat === 'NON_SKIPPABLE_IN_STREAM' ? 'text-red-700' : 'text-gray-900'}`}>Full View</p>
                             <p className="text-[10px] text-gray-500 mt-1">15-20s (Non-skip)</p>
                          </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Campaign Details</label>
                       <div className="space-y-3">
                          <input 
                            value={formData.campaignName}
                            onChange={e => setFormData({...formData, campaignName: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
                            placeholder="Campaign Name"
                          />
                          <input 
                            value={formData.adGroupName}
                            onChange={e => setFormData({...formData, adGroupName: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm"
                            placeholder="Ad Group Name"
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">YouTube Metadata</label>
                       <div className="space-y-3">
                          <input 
                            value={formData.videoTitle}
                            onChange={e => setFormData({...formData, videoTitle: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                            placeholder="Video Title (on YouTube) *"
                            maxLength={100}
                          />
                          <textarea 
                            value={formData.videoDescription}
                            onChange={e => setFormData({...formData, videoDescription: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-sm min-h-[100px] resize-none"
                            placeholder="Video Description (on YouTube)"
                          />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Right Column: Demographics & Budget */}
              <div className="space-y-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                       <Users size={18} className="text-blue-600" /> Demographics
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Age Ranges</label>
                          <div className="flex flex-wrap gap-2">
                             {ageRanges.map(range => (
                               <button
                                 key={range}
                                 onClick={() => toggleAgeRange(range)}
                                 className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                   formData.targetingAgeRanges.includes(range) 
                                   ? 'bg-red-600 text-white border-red-600' 
                                   : 'bg-white text-gray-500 border-gray-200 hover:border-red-200'
                                 }`}
                               >
                                 {range.replace('AGE_', '').replace('_', '-')}
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Genders</label>
                          <div className="flex flex-wrap gap-2">
                             {genders.map(gender => (
                               <button
                                 key={gender}
                                 onClick={() => toggleGender(gender)}
                                 className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                   formData.targetingGenders.includes(gender) 
                                   ? 'bg-red-600 text-white border-red-600' 
                                   : 'bg-white text-gray-500 border-gray-200 hover:border-red-200'
                                 }`}
                               >
                                 {gender}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Daily Budget (₦)</label>
                          <div className="relative">
                             <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600" size={18} />
                             <input 
                               type="number"
                               value={formData.dailyBudget}
                               onChange={e => setFormData({...formData, dailyBudget: e.target.value})}
                               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-black"
                             />
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Start Date</label>
                          <input 
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-sm"
                          />
                       </div>
                    </div>

                    <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl shadow-black/20">
                       <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-3">Estimated Total Investment</p>
                       <div className="flex items-end justify-between">
                          <h4 className="text-3xl font-black">
                             ₦{(parseFloat(formData.dailyBudget || '0') * (Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)).toLocaleString()}
                          </h4>
                          <div className="text-right">
                             <p className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Budget in Coins</p>
                             <p className="text-sm font-black">
                                ≈ {(parseFloat(formData.dailyBudget || '0') * (Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)) / 10} BC
                             </p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 bg-white border-t border-gray-100 flex gap-4">
           <button 
             onClick={onClose}
             className="px-10 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
           >
              Cancel
           </button>
           <button 
             onClick={handleCreateAd}
             disabled={loading}
             className="flex-1 px-8 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
           >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                 <>
                    <Youtube size={20} />
                    LAUNCH YOUTUBE CAMPAIGN
                 </>
              )}
           </button>
        </div>
      </div>
    </div>
  )
}
