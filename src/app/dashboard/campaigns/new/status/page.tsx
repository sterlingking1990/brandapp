'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Coins, 
  Clock,
  Image as ImageIcon,
  Smartphone,
  CheckCircle2,
  Loader2,
  Send,
  Upload,
  UploadCloud,
  MagicWand,
  Users,
  Zap
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'
import BrandWallPicker from '@/components/BrandWallPicker'

export default function CreateStatusPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWallPickerOpen, setIsWallPickerOpen] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '5',
    rewardLimit: '50', // Max views
    duration: '24',
    isPrivate: false,
    media_url: ''
  })

  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [totalHubReach, setTotalHubReach] = useState(0)

  useEffect(() => {
    const preSelectedHubId = searchParams.get('preSelectedHubId')
    if (preSelectedHubId) {
      setSelectedHubs([preSelectedHubId])
      setFormData(prev => ({ ...prev, isPrivate: true }))
    }
  }, [searchParams])

  const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'rewardLimit' && formData.isPrivate && parseInt(value) > totalHubReach && totalHubReach > 0) {
      setFormData({ ...formData, [name]: totalHubReach.toString() })
      return
    }

    setFormData({ ...formData, [name]: value })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingMedia(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: brand } = await supabase.from('brands').select('id').eq('profile_id', user.id).single()
      if (!brand) throw new Error('Brand profile not found')

      const timestamp = Date.now()
      const fileName = `${brand.id}/${timestamp}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('brand-wall')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('brand-wall').getPublicUrl(fileName)
      
      // Save to wall media for future use
      await supabase.from('brand_wall_media').insert({
        brand_id: brand.id,
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image'
      })

      setFormData({ ...formData, media_url: urlData.publicUrl })
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploadingMedia(false)
    }
  }

  const generateAIDetails = async () => {
    if (!formData.media_url) {
      setError('Please select or upload an image first to use AI suggestions.')
      return
    }

    setGeneratingAI(true)
    setError(null)

    try {
      const { data, error: aiError } = await supabase.functions.invoke('generate-status-post-details', {
        body: { imageUrl: formData.media_url },
      })

      if (aiError) throw aiError

      if (data) {
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          description: data.description || prev.description
        }))
      }
    } catch (err: any) {
      console.error('AI Error:', err)
      setError('Failed to generate AI suggestions. You can still fill details manually.')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleReachCalculated = (reach: number) => {
    setTotalHubReach(reach)
    if (formData.isPrivate && parseInt(formData.rewardLimit) > reach && reach > 0) {
      setFormData(prev => ({ ...prev, rewardLimit: reach.toString() }))
    }
  }

  const togglePrivate = () => {
    const newIsPrivate = !formData.isPrivate
    setFormData(prev => ({ ...prev, isPrivate: newIsPrivate }))
    if (newIsPrivate && parseInt(formData.rewardLimit) > totalHubReach && totalHubReach > 0) {
      setFormData(prev => ({ ...prev, rewardLimit: totalHubReach.toString() }))
    }
  }

  const calculateTotalCost = () => {
    const base = (parseFloat(formData.rewardAmount) || 0) * (parseInt(formData.rewardLimit) || 0)
    return formData.isPrivate ? base * 1.1 : base
  }

  const handleLaunch = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (!formData.media_url) throw new Error('Please select an image for your status update.')

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.duration))

      // 1. Create the status post
      // Note: We use is_active = true and correct fields for status_posts
      const { data: statusPost, error: statusError } = await supabase
        .from('status_posts')
        .insert({
          brand_id: user.id,
          type: 'status_view',
          title: formData.title,
          description: formData.description,
          media_url: formData.media_url,
          media_type: 'image',
          reward_amount: parseFloat(formData.rewardAmount),
          reward_limit: parseInt(formData.rewardLimit),
          expires_at: expiresAt.toISOString(),
          is_private: formData.isPrivate,
          is_active: true
        })
        .select()
        .single()

      if (statusError) throw statusError

      // 2. Link Hubs if targeted
      if (formData.isPrivate && selectedHubs.length > 0) {
        const { error: hubError } = await supabase
          .from('status_post_hubs')
          .insert(selectedHubs.map(hubId => ({
            status_post_id: statusPost.id,
            hub_id: hubId
          })))
        
        if (hubError) console.error('Hub linking error:', hubError)
      }

      router.push('/dashboard/campaigns?success=status_created')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <BrandWallPicker 
        isOpen={isWallPickerOpen}
        onClose={() => setIsWallPickerOpen(false)}
        onSelect={(url) => setFormData({ ...formData, media_url: url })}
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Sidebar Form Area */}
      <div className="w-full lg:w-[750px] bg-white border-r border-gray-200 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-green-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Post Status Update</h1>
            <p className="text-gray-500">Share news, stories, and announcements.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Media */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Update Image</label>
                {uploadingMedia ? (
                  <div className="w-full aspect-square border-2 border-dashed border-green-200 rounded-3xl flex flex-col items-center justify-center bg-green-50 animate-pulse">
                    <Loader2 className="animate-spin text-green-600" size={32} />
                    <p className="text-green-600 font-bold mt-2">Uploading...</p>
                  </div>
                ) : formData.media_url ? (
                  <div className="relative aspect-square rounded-3xl overflow-hidden group border border-gray-100 shadow-lg">
                    <img src={formData.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                      <button onClick={() => setIsWallPickerOpen(true)} className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><ImageIcon size={16} /> From Wall</button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><Upload size={16} /> New Upload</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsWallPickerOpen(true)} className="aspect-square border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-600 transition-all gap-3 bg-gray-50">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold">Pick from Wall</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-600 transition-all gap-3 bg-gray-50">
                      <UploadCloud size={32} />
                      <span className="text-xs font-bold">Upload from PC</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Content */}
          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Update Details</label>
                   <button 
                     onClick={generateAIDetails}
                     disabled={generatingAI || !formData.media_url}
                     className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                   >
                     {generatingAI ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} className="fill-current" />}
                     AI Suggest Details
                   </button>
                </div>
                
                <div className="space-y-4">
                  <input 
                    name="title"
                    value={formData.title}
                    onChange={handleFormDataChange}
                    placeholder="Update Title (e.g. Fresh Batch Available!)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleFormDataChange}
                    rows={6}
                    placeholder="Tell your story... What's new with your brand today?"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
             </div>
          )}

          {/* Step 3: Incentives & Reach */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Coins size={16} className="text-brand" />
                    Reward per View
                  </label>
                  <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Max Views Limit
                  </label>
                  <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Hub Targeting</h3>
                  <button 
                    onClick={togglePrivate}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      formData.isPrivate ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {formData.isPrivate ? 'Targeting Active' : 'Target a Community'}
                  </button>
                </div>
                
                {formData.isPrivate && (
                   <HubSelector 
                    selectedHubIds={selectedHubs}
                    onHubsSelected={setSelectedHubs}
                    onReachCalculated={handleReachCalculated}
                  />
                )}
              </div>

              <div className="p-6 bg-green-600 rounded-3xl text-white shadow-xl shadow-green-600/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Total Budget</span>
                  <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} Coins</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-green-50 border border-green-100 rounded-[2.5rem] space-y-6 text-center">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Story is Ready!</h3>
                    <p className="text-gray-500 mt-1">Your brand update will be live instantly.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Budget</p>
                      <p className="text-lg font-bold text-green-600">{calculateTotalCost()} Coins</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Reach</p>
                      <p className="text-lg font-bold text-gray-900">{formData.rewardLimit} Views</p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50">Back</button>
          )}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 3 && formData.isPrivate && selectedHubs.length === 0)}
            className={`flex-1 px-6 py-4 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2
              ${step === 4 ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:opacity-90'}
              disabled:opacity-50
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Post Story Now' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-gray-50 flex flex-col pt-8">
                 <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900">Brand Wall</span>
                    <Send size={14} className="text-gray-400" />
                 </div>
                 <div className="p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                       <div className="p-3 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full brand-gradient flex items-center justify-center text-[10px] text-white font-bold">B</div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-900">Your Brand</p>
                            <p className="text-[9px] text-gray-400">Just now</p>
                          </div>
                       </div>
                       <div className="aspect-square bg-gray-100">
                          {formData.media_url ? <img src={formData.media_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40} /></div>}
                       </div>
                       <div className="p-4 space-y-2">
                          <h4 className="text-xs font-bold text-gray-900">{formData.title || 'Untitled Update'}</h4>
                          <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-3">{formData.description || 'Your message will appear here...'}</p>
                          <div className="pt-2 flex items-center justify-between">
                             <div className="flex items-center gap-1 text-brand">
                                <Coins size={10} />
                                <span className="text-[10px] font-bold">+{formData.rewardAmount}</span>
                             </div>
                             <div className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[9px] font-bold uppercase">View Story</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
