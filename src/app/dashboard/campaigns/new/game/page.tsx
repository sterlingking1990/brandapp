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

export default function CreateGamePage() {
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
    if (name === 'min_influencer_reach' && formData.is_private && parseInt(value) > totalHubReach && totalHubReach > 0) {
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

      const fileName = `${brand.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('brand-wall').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('brand-wall').getPublicUrl(fileName)
      
      await supabase.from('brand_wall_media').insert({
        brand_id: brand.id,
        media_url: urlData.publicUrl,
        media_type: 'image'
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
      // Mobile app logic: If we just uploaded, it might be better to send base64, 
      // but since we get a public URL immediately on web, URL is more efficient.
      const { data, error: aiError } = await supabase.functions.invoke('generate-game-campaign-details', {
        body: { imageUrl: formData.media_url },
      })

      if (aiError) throw aiError

      if (data) {
        setFormData(prev => ({
          ...prev,
          campaign_name: data.campaign_name || prev.campaign_name,
          campaign_message: data.campaign_message || prev.campaign_message,
          cta_text: data.cta_text || prev.cta_text,
          game_triggers: Array.isArray(data.game_triggers) 
            ? data.game_triggers.join(', ') 
            : (data.game_triggers || prev.game_triggers)
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
    if (formData.is_private && parseInt(formData.min_influencer_reach) > reach && reach > 0) {
      setFormData(prev => ({ ...prev, min_influencer_reach: reach.toString() }))
    }
  }

  const togglePrivate = () => {
    const newIsPrivate = !formData.is_private
    setFormData(prev => ({ ...prev, is_private: newIsPrivate }))
    if (newIsPrivate && parseInt(formData.min_influencer_reach) > totalHubReach && totalHubReach > 0) {
      setFormData(prev => ({ ...prev, min_influencer_reach: totalHubReach.toString() }))
    }
  }

  const calculateTotalBudget = () => {
    const triggers = formData.game_triggers.split(',').map(t => t.trim()).filter(t => t)
    const base = triggers.length * parseFloat(formData.coin_per_trigger) * parseInt(formData.min_influencer_reach)
    return formData.is_private ? base * 1.1 : base
  }

  const handleLaunch = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      if (!formData.media_url) throw new Error('Please select a campaign image')

      const triggers = formData.game_triggers.split(',').map(t => t.trim()).filter(t => t)
      if (triggers.length === 0) throw new Error('Please provide at least one game trigger')

      const totalBudget = calculateTotalBudget()

      const { data: deductData, error: deductError } = await supabase.rpc('deduct_brand_coins_for_game_campaign', {
        p_brand_id: user.id,
        p_amount: totalBudget,
        p_campaign_name: `Game Campaign: ${formData.campaign_name.trim()}`
      })

      if (deductError) throw deductError
      if (!deductData?.success) throw new Error(deductData?.message || 'Failed to deduct budget')

      const { data: campaign, error: campaignError } = await supabase
        .from('game_campaigns')
        .insert({
          brand_id: user.id,
          campaign_name: formData.campaign_name,
          campaign_message: formData.campaign_message,
          campaign_link: formData.campaign_link,
          cta_text: formData.cta_text,
          game_triggers: triggers,
          coin_per_trigger: parseFloat(formData.coin_per_trigger),
          min_influencer_reach: parseInt(formData.min_influencer_reach),
          duration_hours: parseInt(formData.duration_hours),
          media_url: formData.media_url,
          media_type: 'image',
          is_private: formData.is_private,
          reserved_funds: deductData.reserved_for_campaign,
          spent_amount: 0
        })
        .select().single()

      if (campaignError) throw campaignError
      if (formData.is_private && selectedHubs.length > 0) {
        await supabase.rpc('save_game_campaign_hubs', { p_campaign_id: campaign.id, p_hub_ids: selectedHubs })
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
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={20} /></button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-purple-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Create Playable Ad</h1>
            <p className="text-gray-500">Launch an interactive experience for creators.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Cover</label>
                {uploadingMedia ? (
                  <div className="w-full aspect-video border-2 border-dashed border-purple-200 rounded-3xl flex flex-col items-center justify-center bg-purple-50 animate-pulse">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                    <p className="text-purple-600 font-bold mt-2 text-xs">Uploading...</p>
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
                    <button onClick={() => setIsWallPickerOpen(true)} className="aspect-square md:aspect-video border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 transition-all gap-3 bg-gray-50">
                      <ImageIcon size={32} />
                      <span className="text-xs font-bold">Pick from Wall</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square md:aspect-video border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 hover:border-purple-500 transition-all gap-3 bg-gray-50">
                      <UploadCloud size={32} />
                      <span className="text-xs font-bold">Upload from PC</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Campaign Details</label>
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
                <input name="campaign_name" value={formData.campaign_name} onChange={handleFormDataChange} placeholder="Campaign Name (e.g. Memory Dash Pro)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                <textarea name="campaign_message" value={formData.campaign_message} onChange={handleFormDataChange} rows={3} placeholder="Engaging message for influencers..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            </div>
          )}

          {/* Step 2: Game Settings */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><LinkIcon size={16} /> Destination Link</label>
                <input name="campaign_link" value={formData.campaign_link} onChange={handleFormDataChange} placeholder="https://yourbrand.com" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><MousePointer2 size={16} /> CTA Text</label>
                  <input name="cta_text" value={formData.cta_text} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Gamepad2 size={16} /> Game Triggers</label>
                  <input name="game_triggers" value={formData.game_triggers} onChange={handleFormDataChange} placeholder="Level Complete, High Score" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Reach */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Coins size={16} className="text-brand" /> Coins per Trigger</label>
                  <input name="coin_per_trigger" type="number" value={formData.coin_per_trigger} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-blue-600" /> Target Reach</label>
                  <input name="min_influencer_reach" type="number" value={formData.min_influencer_reach} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Hub Targeting</h3>
                  <button onClick={togglePrivate} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${formData.is_private ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{formData.is_private ? 'Targeting Active' : 'Target a Community'}</button>
                </div>
                {formData.is_private && <HubSelector selectedHubIds={selectedHubs} onHubsSelected={setSelectedHubs} onReachCalculated={handleReachCalculated} />}
              </div>
              <div className="p-6 bg-purple-600 rounded-3xl text-white shadow-xl shadow-purple-600/20 flex justify-between items-center">
                  <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Estimated Budget</span>
                  <span className="text-2xl font-black">{calculateTotalBudget().toLocaleString()} Coins</span>
              </div>
            </div>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-purple-50 border border-purple-100 rounded-3xl space-y-6 text-center">
                  <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto"><Sparkles size={32} /></div>
                  <h3 className="text-2xl font-bold text-gray-900">Launch Game Campaign</h3>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-purple-100"><p className="text-[10px] font-black text-gray-400 uppercase">Budget</p><p className="text-lg font-bold text-purple-600">{calculateTotalBudget()} BC</p></div>
                    <div className="bg-white p-4 rounded-2xl border border-purple-100"><p className="text-[10px] font-black text-gray-400 uppercase">Creators</p><p className="text-lg font-bold text-gray-900">{formData.min_influencer_reach}</p></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl">Back</button>}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 3 && formData.is_private && selectedHubs.length === 0)}
            className={`flex-1 px-6 py-4 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 bg-purple-600 disabled:opacity-50`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Launch Campaign' : 'Next Step')}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-white flex flex-col pt-8">
                 <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Gamepad2 size={14} className="text-purple-600" />
                    <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Active Game</span>
                 </div>
                 <div className="flex-1 flex flex-col">
                    <div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden">
                       {formData.media_url ? <img src={formData.media_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={40} /></div>}
                    </div>
                    <div className="p-6 space-y-4">
                       <h3 className="text-lg font-bold text-gray-900 leading-tight">{formData.campaign_name || 'Campaign Name'}</h3>
                       <p className="text-xs text-gray-600 italic">"{formData.campaign_message || 'Your message...'}"</p>
                    </div>
                    <div className="mt-auto p-6">
                       <button className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-600/20 capitalize">{formData.cta_text}</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
