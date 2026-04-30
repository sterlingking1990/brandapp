'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowLeft, 
  Star, 
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
  X,
  Plus,
  Users,
  Zap
} from 'lucide-react'
import BrandWallPicker from '@/components/BrandWallPicker'

function CreatePromotionRequestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWallPickerOpen, setIsWallPickerOpen] = useState(false)
  const [hubName, setHubName] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '50',
    media_url: '',
    media_type: 'image' as 'image' | 'video'
  })

  const preSelectedHubId = searchParams.get('preSelectedHubId')

  useEffect(() => {
    if (preSelectedHubId) {
      fetchHubDetails(preSelectedHubId)
    }
  }, [preSelectedHubId])

  const fetchHubDetails = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('name')
        .eq('id', id)
        .single()
      if (data) setHubName(data.name)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
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

      const fileName = `promo_${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('brand-wall').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('brand-wall').getPublicUrl(fileName)
      
      await supabase.from('brand_wall_media').insert({
        brand_id: brand.id,
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image'
      })

      setFormData({ 
        ...formData, 
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image'
      })
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!preSelectedHubId) throw new Error('No hub selected for promotion.')
      if (!formData.title || !formData.description || !formData.rewardAmount) {
        throw new Error('Please fill in all required fields.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: brand } = await supabase.from('brands').select('id').eq('profile_id', user.id).single()
      if (!brand) throw new Error('Brand profile not found')

      const { error } = await supabase
        .from('promotion_requests')
        .insert({
          brand_id: brand.id,
          hub_id: preSelectedHubId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          reward_amount: parseFloat(formData.rewardAmount),
          media_url: formData.media_url,
          media_type: formData.media_type,
          status: 'pending'
        })

      if (error) throw error

      router.push('/dashboard/hubs?success=promo_requested')
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
        onChange={handleFileUpload}
      />

      <div className="w-full lg:w-[750px] bg-white border-r border-gray-200 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="bg-brand/10 text-brand px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
              <Star size={14} className="fill-current" />
              Promotion Request
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Request Promotion</h1>
            <p className="text-gray-500">Pitch your product to {hubName || 'the hub owner'} for an unboxing or review.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Title *</label>
              <input 
                name="title"
                value={formData.title}
                onChange={handleFormDataChange}
                placeholder="e.g. Summer Fitness Gear Review"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Requirements & Info *</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleFormDataChange}
                rows={5}
                placeholder="What do you want the influencer to highlight? Any specific talking points?"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reward (Coins) *</label>
              <div className="relative">
                <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={20} />
                <input 
                  name="rewardAmount"
                  type="number"
                  value={formData.rewardAmount}
                  onChange={handleFormDataChange}
                  placeholder="How much will they earn?"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Product Media (Optional)</label>
              {uploadingMedia ? (
                <div className="w-full h-48 border-2 border-dashed border-brand/20 rounded-3xl flex flex-col items-center justify-center bg-brand/5 animate-pulse">
                  <Loader2 className="animate-spin text-brand" size={32} />
                  <p className="text-brand font-bold mt-2">Uploading...</p>
                </div>
              ) : formData.media_url ? (
                <div className="relative h-48 rounded-3xl overflow-hidden group border border-gray-100 shadow-lg">
                  {formData.media_type === 'video' ? (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                       <Smartphone size={40} className="text-brand" />
                       <p className="text-white text-xs font-bold ml-2">Video Selected</p>
                    </div>
                  ) : (
                    <img src={formData.media_url} className="w-full h-full object-cover" />
                  )}
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
        </div>

        <div className="pt-8 border-t border-gray-100 flex gap-4">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-brand text-white font-bold rounded-2xl shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <Send size={20} />
                Send Request to Hub Owner
              </>
            )}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-white flex flex-col pt-8">
                 <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Star size={14} className="text-brand fill-current" />
                    <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Pitch Preview</span>
                 </div>
                 <div className="flex-1 p-6 space-y-6">
                    <div className="p-4 bg-brand/5 rounded-2xl border border-brand/10">
                       <p className="text-[10px] font-black text-brand uppercase mb-2">To Hub Owner</p>
                       <p className="text-xs font-bold text-gray-900">Requesting promotion for:</p>
                       <p className="text-sm font-black text-gray-900 mt-1">{formData.title || 'Your Campaign Title'}</p>
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requirements</p>
                       <p className="text-xs text-gray-600 italic leading-relaxed">"{formData.description || 'Pitch details will appear here...'}"</p>
                    </div>

                    <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                       {formData.media_url ? (
                         formData.media_type === 'video' ? <Smartphone className="text-brand" /> : <img src={formData.media_url} className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon className="text-gray-300" size={32} />
                       )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">Offer</p>
                          <p className="text-lg font-black text-brand">{formData.rewardAmount} BC</p>
                       </div>
                       <div className="px-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase">Pending</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default function CreatePromotionRequestPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <CreatePromotionRequestContent />
    </Suspense>
  )
}
