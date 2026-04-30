'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
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
  Wand2,
  Users,
  Zap
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'
import BrandWallPicker from '@/components/BrandWallPicker'

function CreateStatusContent() {
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
      
      // Also track in brand_wall_media for future reuse
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
      setError('Please select or upload an image first.')
      return
    }

    setGeneratingAI(true)
    setError(null)

    try {
      const { data, error: aiError } = await supabase.functions.invoke('generate-campaign-details', {
        body: { imageUrl: formData.media_url, type: 'status' },
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
      setError('Failed to generate AI suggestions.')
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

  const calculateTotalCost = () => {
    const base = (parseFloat(formData.rewardAmount) || 0) * (parseInt(formData.rewardLimit) || 0)
    // Add hub targeting fee if private
    return formData.isPrivate ? base * 1.1 : base
  }

  const handleLaunch = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.duration))

      // 1. Create the status post
      const { data: statusPost, error: statusError } = await supabase
        .from('status_posts')
        .insert({
          brand_id: user.id,
          type: 'status_view',
          title: formData.title,
          description: formData.description,
          media_url: formData.media_url,
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
        await supabase.from('status_post_hubs').insert(
          selectedHubs.map(hubId => ({
            status_post_id: statusPost.id,
            hub_id: hubId
          }))
        )
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

      {/* Sidebar Form */}
      <div className="w-full lg:w-[750px] bg-white border-r border-gray-200 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-brand' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Push Status Update</h1>
            <p className="text-gray-500">Reward influencers for viewing and sharing your story.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Media Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Visual</label>
                {uploadingMedia ? (
                  <div className="w-full aspect-video border-2 border-dashed border-brand/20 rounded-3xl flex flex-col items-center justify-center bg-brand/5 animate-pulse">
                    <Loader2 className="animate-spin text-brand" size={32} />
                    <p className="text-brand font-bold mt-2">Uploading...</p>
                  </div>
                ) : formData.media_url ? (
                  <div className="relative aspect-video rounded-3xl overflow-hidden group border border-gray-100 shadow-lg">
                    <img src={formData.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                      <button onClick={() => setIsWallPickerOpen(true)} className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><ImageIcon size={16} /> From Wall</button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><Upload size={16} /> New Upload</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsWallPickerOpen(true)} className="h-32 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-brand hover:text-brand transition-all gap-3 bg-gray-50">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold">Pick from Wall</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-brand hover:text-brand transition-all gap-3 bg-gray-50">
                      <UploadCloud size={32} />
                      <span className="text-xs font-bold">Upload from PC</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Messaging */}
          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Content & Copy</label>
                   <button 
                     onClick={generateAIDetails}
                     disabled={generatingAI || !formData.media_url}
                     className="flex items-center gap-2 text-xs font-bold text-brand hover:text-brand/80 disabled:opacity-50"
                   >
                     {generatingAI ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                     AI Generate
                   </button>
                </div>
                <div className="space-y-4">
                  <input name="title" value={formData.title} onChange={handleFormDataChange} placeholder="Catchy Headline (e.g. New Summer Collection is Here!)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all" />
                  <textarea name="description" value={formData.description} onChange={handleFormDataChange} rows={6} placeholder="What do you want to share with influencers? Keep it short and impactful." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all" />
                </div>
             </div>
          )}

          {/* Step 3: Rewards & Targeting */}
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
                    Maximum Total Views
                  </label>
                  <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Community Targeting</h3>
                  <button 
                    onClick={() => setFormData({...formData, isPrivate: !formData.isPrivate})}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      formData.isPrivate ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {formData.isPrivate ? 'Hub Targeting Active' : 'Target Hubs'}
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

              <div className="p-6 bg-brand rounded-3xl text-white shadow-xl shadow-brand/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Total Escrow Amount</span>
                  <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} BC</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-brand/5 border border-brand/10 rounded-[2.5rem] space-y-6 text-center">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle2 size={32} /></div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Status Ready!</h3>
                    <p className="text-gray-500 mt-1">Review your status update details and launch.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Budget</p>
                      <p className="text-lg font-bold text-gray-900">{calculateTotalCost()} BC</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Max Reach</p>
                      <p className="text-lg font-bold text-gray-900">{formData.rewardLimit}</p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-8 border-t border-gray-100 flex gap-4 shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-8 py-4 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50">Back</button>
          )}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 3 && formData.isPrivate && selectedHubs.length === 0)}
            className={`flex-1 px-8 py-4 text-white font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2
              ${step === 4 ? 'bg-brand hover:bg-brand/90' : 'bg-brand hover:opacity-90'}
              disabled:opacity-50
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Post Status Now' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview Column */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-white flex flex-col pt-8">
                 <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Story Preview</span>
                    <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                 </div>
                 <div className="flex-1 p-0 relative overflow-hidden">
                    {formData.media_url ? (
                      <img src={formData.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                         <ImageIcon size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 space-y-3">
                       <h4 className="text-xl font-black text-white leading-tight">{formData.title || 'Status Title'}</h4>
                       <p className="text-xs text-white/70 leading-relaxed line-clamp-3 italic">"{formData.description || 'Your message will appear here for influencers...'}"</p>
                       <div className="pt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <Coins size={14} className="text-brand" />
                             <span className="text-xs font-bold text-white">{formData.rewardAmount} BC Reward</span>
                          </div>
                          <div className="px-4 py-1.5 bg-brand text-white rounded-lg text-[10px] font-bold uppercase">View Story</div>
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

export default function CreateStatusPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <CreateStatusContent />
    </Suspense>
  )
}
