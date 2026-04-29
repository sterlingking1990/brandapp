'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Coins, 
  Users, 
  Clock,
  Layout,
  Smartphone,
  CheckCircle2,
  Loader2,
  Video
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'

export default function CreateChallengePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    challengePrompt: '',
    rewardAmount: '10',
    rewardLimit: '50', // Max winners
    duration: '24',
    isPrivate: false,
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

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.duration))

      const { data, error: rpcError } = await supabase.rpc('create_challenge_with_balance_check', {
        p_brand_id: user.id,
        p_title: formData.title,
        p_description: formData.challengePrompt,
        p_duration: parseInt(formData.duration),
        p_reward_amount: parseFloat(formData.rewardAmount),
        p_expires_at: expiresAt.toISOString(),
        p_is_private: formData.isPrivate,
        p_challenge_prompt: formData.challengePrompt,
        p_submission_guidelines: '',
        p_hashtags: [],
        p_max_duration: 30,
        p_is_collaborative: false,
        p_collaboration_type: 'solo',
        p_max_participants: parseInt(formData.rewardLimit),
        p_target_locations: [],
        p_target_hub_ids: selectedHubs
      })

      if (rpcError) throw rpcError
      if (data && data.success === false) throw new Error(data.error || 'Failed to create challenge')
      router.push('/dashboard/campaigns?success=created')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
            <h1 className="text-2xl font-bold text-gray-900">Create Video Challenge</h1>
            <p className="text-gray-500">Launch a content campaign for creators.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Challenge Title</label>
                <input 
                  name="title"
                  value={formData.title}
                  onChange={handleFormDataChange}
                  placeholder="e.g. Smoothie Summer Remix"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">The Prompt</label>
                <textarea 
                  name="challengePrompt"
                  value={formData.challengePrompt}
                  onChange={handleFormDataChange}
                  rows={6}
                  placeholder="What should creators do? (e.g. Show us how you style our new summer collection!)"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Coins size={16} className="text-brand" /> Reward per Video</label>
                  <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Users size={16} className="text-blue-600" /> Max Winners</label>
                  <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Hub Targeting</h3>
                  <button onClick={togglePrivate} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${formData.isPrivate ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}>{formData.isPrivate ? 'Targeting Active' : 'Target a Community'}</button>
                </div>
                {formData.isPrivate && (
                   <HubSelector selectedHubIds={selectedHubs} onHubsSelected={setSelectedHubs} onReachCalculated={handleReachCalculated} />
                )}
              </div>
            </div>
          )}

          {step === 3 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Duration (Hours)</label>
                  <select name="duration" value={formData.duration} onChange={handleFormDataChange as any} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-brand">
                    <option value="24">24 Hours</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                  </select>
                </div>
                <div className="p-6 brand-gradient rounded-2xl text-white space-y-4 shadow-xl shadow-brand/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium opacity-90">Budget Requirement</span>
                    <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} Coins</span>
                  </div>
                </div>
             </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-green-50 border border-green-100 rounded-3xl space-y-6 text-center">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle2 size={32} /></div>
                  <h3 className="text-2xl font-bold text-gray-900">Launch Challenge</h3>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-green-100"><p className="text-[10px] font-black text-gray-400 uppercase">Cost</p><p className="text-lg font-bold text-brand">{calculateTotalCost()} BC</p></div>
                    <div className="bg-white p-4 rounded-2xl border border-green-100"><p className="text-[10px] font-black text-gray-400 uppercase">Winners</p><p className="text-lg font-bold text-gray-900">{formData.rewardLimit}</p></div>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-2xl">Back</button>
          )}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 2 && formData.isPrivate && selectedHubs.length === 0)}
            className={`flex-1 px-6 py-4 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${step === 4 ? 'bg-green-600 hover:bg-green-700' : 'bg-brand'} disabled:opacity-50`}
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
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-900 uppercase">Active Challenge</span>
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="h-48 w-full bg-brand/5 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-brand/20 text-brand">
                  <Video size={48} className="opacity-20" />
                  <p className="text-[10px] font-bold mt-2 uppercase tracking-widest opacity-40">Creator Video Here</p>
                </div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{formData.title || 'Campaign Title'}</h3>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instructions</p>
                  <p className="text-sm text-gray-600 italic leading-relaxed">"{formData.challengePrompt || 'Your prompt will appear here...'}"</p>
                </div>
              </div>
              <div className="p-6 mt-auto">
                 <div className="w-full h-12 bg-brand/10 border border-brand/20 rounded-xl flex items-center justify-center text-brand font-bold text-sm">
                   Record Challenge
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
