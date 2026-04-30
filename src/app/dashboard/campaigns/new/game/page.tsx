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
  Smartphone,
  CheckCircle2,
  Loader2,
  Gamepad2,
  Image as ImageIcon,
  Link as LinkIcon,
  MousePointer2,
  Plus,
  Users,
  Upload,
  UploadCloud,
  Zap
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'
import BrandWallPicker from '@/components/BrandWallPicker'

function CreateGameContent() {
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
    campaign_name: '',
    campaign_message: '',
    campaign_link: '',
    cta_text: 'Play Now',
    game_triggers: 'Level 1 Complete, Item Collected',
    coin_per_trigger: '5',
    min_influencer_reach: '50',
    duration_hours: '24',
    is_private: false,
    media_url: ''
  })

  const [selectedHubs, setSelectedHubs] = useState<string[]>([])
  const [totalHubReach, setTotalHubReach] = useState(0)

  useEffect(() => {
    const preSelectedHubId = searchParams.get('preSelectedHubId')
    if (preSelectedHubId) {
      setSelectedHubs([preSelectedHubId])
      setFormData(prev => ({ ...prev, is_private: true }))
    }
  }, [searchParams])

  const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

      const timestamp = Date.now()
      const fileName = `${brand.id}/${timestamp}_${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('brand-wall')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('brand-wall').getPublicUrl(fileName)
      
      setFormData({ ...formData, media_url: urlData.publicUrl })
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploadingMedia(false)
    }
  }

  const generateAIDetails = async () => {
    if (!formData.media_url) {
      setError('Please select or upload a campaign image first.')
      return
    }

    setGeneratingAI(true)
    setError(null)

    try {
      const { data, error: aiError } = await supabase.functions.invoke('generate-game-campaign-details', {
        body: { imageUrl: formData.media_url },
      })

      if (aiError) throw aiError

      if (data) {
        setFormData(prev => ({
          ...prev,
          campaign_name: data.campaign_name || prev.campaign_name,
          campaign_message: data.campaign_message || prev.campaign_message
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
  }

  const calculateTotalCost = () => {
    const base = (parseFloat(formData.coin_per_trigger) || 0) * (parseInt(formData.min_influencer_reach) || 0)
    return formData.is_private ? base * 1.1 : base
  }

  const handleLaunch = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (!formData.media_url) throw new Error('Please select a campaign image')

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.duration_hours))

      // 1. Deduct Coins RPC
      const { data: deductData, error: deductError } = await supabase.rpc('deduct_brand_coins_for_game_campaign', {
        p_brand_id: user.id,
        p_amount: calculateTotalCost(),
        p_campaign_name: `Game Campaign: ${formData.campaign_name.trim()}`
      })

      if (deductError) throw deductError

      // 2. Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('game_campaigns')
        .insert({
          brand_id: user.id,
          campaign_name: formData.campaign_name,
          campaign_message: formData.campaign_message,
          campaign_link: formData.campaign_link,
          cta_text: formData.cta_text,
          game_triggers: formData.game_triggers,
          coin_per_trigger: parseFloat(formData.coin_per_trigger),
          media_url: formData.media_url,
          expires_at: expiresAt.toISOString(),
          status: 'active',
          reserved_funds: deductData.reserved_for_campaign,
          is_private: formData.is_private,
          duration_hours: parseInt(formData.duration_hours)
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // 3. Link Hubs
      if (formData.is_private && selectedHubs.length > 0) {
        await supabase.from('game_campaign_hubs').insert(
          selectedHubs.map(hubId => ({ campaign_id: campaign.id, hub_id: hubId }))
        )
      }

      router.push('/dashboard/campaigns?success=created')
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

      <div className="w-full lg:w-[750px] bg-white border-r border-gray-200 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-purple-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Create Game Challenge</h1>
            <p className="text-gray-500">Inject your brand message into the brandible arcade.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Image</label>
                {uploadingMedia ? (
                  <div className="w-full aspect-video border-2 border-dashed border-purple-200 rounded-3xl flex flex-col items-center justify-center bg-purple-50 animate-pulse">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                    <p className="text-purple-600 font-bold mt-2">Uploading...</p>
                  </div>
                ) : formData.media_url ? (
                  <div className="relative aspect-video rounded-3xl overflow-hidden group border border-gray-100 shadow-lg">
                    <img src={formData.media_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                      <button onClick={() => setIsWallPickerOpen(true)} className="bg-white text-gray-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><ImageIcon size={16} /> From Wall</button>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:scale-105 transition-transform"><Upload size={16} /> New Upload</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsWallPickerOpen(true)} className="h-32 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-600 transition-all gap-3 bg-gray-50">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold">Pick from Wall</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 hover:text-purple-600 transition-all gap-3 bg-gray-50">
                      <UploadCloud size={32} />
                      <span className="text-xs font-bold">Upload from PC</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Messaging</label>
                   <button 
                     onClick={generateAIDetails}
                     disabled={generatingAI || !formData.media_url}
                     className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                   >
                     {generatingAI ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} className="fill-current" />}
                     AI Suggest
                   </button>
                </div>
                
                <div className="space-y-4">
                  <input name="campaign_name" value={formData.campaign_name} onChange={handleFormDataChange} placeholder="Campaign Name (e.g. Speed Challenge 2024)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                  <textarea name="campaign_message" value={formData.campaign_message} onChange={handleFormDataChange} rows={4} placeholder="Your message to players..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="campaign_link" value={formData.campaign_link} onChange={handleFormDataChange} placeholder="External Link (URL)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                    <input name="cta_text" value={formData.cta_text} onChange={handleFormDataChange} placeholder="Button Text (e.g. Play Now)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                  </div>
                </div>
             </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Coins size={16} className="text-brand" />
                    Reward per Trigger
                  </label>
                  <input name="coin_per_trigger" type="number" value={formData.coin_per_trigger} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Max Participations
                  </label>
                  <input name="min_influencer_reach" type="number" value={formData.min_influencer_reach} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Community Targeting</h3>
                  <button onClick={() => setFormData({...formData, is_private: !formData.is_private})} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${formData.is_private ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{formData.is_private ? 'Targeting Active' : 'Target Hubs'}</button>
                </div>
                {formData.is_private && <HubSelector selectedHubIds={selectedHubs} onHubsSelected={setSelectedHubs} onReachCalculated={handleReachCalculated} />}
              </div>

              <div className="p-6 bg-purple-600 rounded-3xl text-white shadow-xl shadow-purple-600/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Total Escrow</span>
                  <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} Coins</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-purple-50 border border-purple-100 rounded-[2.5rem] space-y-6 text-center">
                  <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle2 size={32} /></div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Game Set & Match!</h3>
                    <p className="text-gray-500 mt-1">Your campaign will be live in the brandible arcade.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-purple-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Cost</p>
                      <p className="text-lg font-bold text-purple-600">{calculateTotalCost()} BC</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-purple-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Triggers</p>
                      <p className="text-lg font-bold text-gray-900">{formData.min_influencer_reach}</p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50">Back</button>
          )}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 3 && formData.is_private && selectedHubs.length === 0)}
            className={`flex-1 px-6 py-4 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2
              ${step === 4 ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20' : 'bg-purple-600 hover:opacity-90 shadow-purple-500/10'}
              disabled:opacity-50
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Launch Campaign' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-gray-50 flex flex-col pt-12">
                 <div className="px-6 py-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Arcade Ad Preview</span>
                    <Gamepad2 size={18} className="text-purple-600" />
                 </div>
                 <div className="flex-1 p-6 space-y-6">
                    <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-purple-100">
                       <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
                          <Zap size={12} className="text-purple-600" />
                          <span className="text-[9px] font-black text-purple-600 uppercase">Interactive Ad</span>
                       </div>
                       <div className="aspect-video bg-gray-100 relative">
                          {formData.media_url ? <img src={formData.media_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40} /></div>}
                          <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm text-white px-2 py-1 rounded text-[8px] font-bold">SPONSORED</div>
                       </div>
                       <div className="p-5 space-y-4">
                          <div>
                             <h4 className="text-sm font-black text-gray-900 leading-tight">{formData.campaign_name || 'Campaign Title'}</h4>
                             <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">{formData.campaign_message || 'Your brand message will appear here for players...'}</p>
                          </div>
                          <button className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/20 capitalize">{formData.cta_text}</button>
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

export default function CreateGamePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <CreateGameContent />
    </Suspense>
  )
}
