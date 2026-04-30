'use client'

import { useState, useEffect, Suspense } from 'react'
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

function CreateChallengeContent() {
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
          type: 'challenge',
          title: formData.title,
          description: formData.description,
          reward_amount: parseFloat(formData.rewardAmount),
          reward_limit: parseInt(formData.rewardLimit),
          expires_at: expiresAt.toISOString(),
          is_private: formData.isPrivate,
          is_active: true
        })
        .select()
        .single()

      if (statusError) throw statusError

      // 2. Create the challenge
      const { error: challengeError } = await supabase
        .from('challenges')
        .insert({
          status_post_id: statusPost.id,
          brand_id: user.id,
          challenge_prompt: formData.challengePrompt,
          reward_amount: parseFloat(formData.rewardAmount),
          reward_limit: parseInt(formData.rewardLimit)
        })

      if (challengeError) throw challengeError

      // 3. Link Hubs if targeted
      if (formData.isPrivate && selectedHubs.length > 0) {
        await supabase.from('status_post_hubs').insert(
          selectedHubs.map(hubId => ({
            status_post_id: statusPost.id,
            hub_id: hubId
          }))
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
            <h1 className="text-2xl font-bold text-gray-900">Create Video Challenge</h1>
            <p className="text-gray-500">Request custom content from influencers.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Challenge Title</label>
                    <input 
                      name="title"
                      value={formData.title}
                      onChange={handleFormDataChange}
                      placeholder="e.g. Summer Fitness Routine"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Instructions</label>
                    <textarea 
                      name="description"
                      value={formData.description}
                      onChange={handleFormDataChange}
                      rows={4}
                      placeholder="Tell influencers what this challenge is about..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                    />
                  </div>
               </div>
            </div>
          )}

          {/* Step 2: Challenge Specifics */}
          {step === 2 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">What should they say or do?</label>
                  <textarea 
                    name="challengePrompt"
                    value={formData.challengePrompt}
                    onChange={handleFormDataChange}
                    rows={6}
                    placeholder="Example: Record a 30s video unboxing our new fitness kit and show your favorite item."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none transition-all"
                  />
                  <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-2xl">
                     <Sparkles className="text-blue-600 shrink-0" size={18} />
                     <p className="text-xs text-blue-700 leading-relaxed">Specific instructions lead to better content quality. Be clear about mentions or hashtags you want included.</p>
                  </div>
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
                    Reward per Winner
                  </label>
                  <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    Max Winners Limit
                  </label>
                  <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">Hub Targeting</h3>
                  <button 
                    onClick={() => setFormData({...formData, isPrivate: !formData.isPrivate})}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      formData.isPrivate ? 'bg-brand text-white shadow-lg' : 'bg-gray-100 text-gray-500'
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

              <div className="p-6 bg-brand rounded-3xl text-white shadow-xl shadow-brand/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Total Escrow Amount</span>
                  <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} BC</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-brand/5 border border-brand/10 rounded-[2.5rem] space-y-6 text-center">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto"><CheckCircle2 size={32} /></div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Ready to Launch!</h3>
                    <p className="text-gray-500 mt-1">Review your challenge details and launch.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Budget</p>
                      <p className="text-lg font-bold text-gray-900">{calculateTotalCost()} BC</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Winners</p>
                      <p className="text-lg font-bold text-gray-900">{formData.rewardLimit}</p>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-gray-100 flex gap-4">
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
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Launch Challenge' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="relative scale-90">
           <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
              <div className="h-full bg-white flex flex-col pt-8">
                 <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Challenge Preview</span>
                    <div className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                 </div>
                 <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="h-20 w-20 bg-brand/10 text-brand rounded-[2rem] flex items-center justify-center">
                       <Video size={32} />
                    </div>
                    <div>
                       <h4 className="text-xl font-black text-gray-900 leading-tight">{formData.title || 'Untitled Challenge'}</h4>
                       <p className="text-xs text-gray-500 mt-2 leading-relaxed italic line-clamp-4 px-4">{formData.challengePrompt || 'Your challenge instructions will appear here for influencers...'}</p>
                    </div>
                    <div className="w-full pt-8 border-t border-gray-50">
                       <div className="flex justify-center items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">{formData.rewardAmount}</span>
                          <span className="text-xs font-bold text-gray-400 uppercase">Coins</span>
                       </div>
                       <p className="text-[10px] font-black text-brand uppercase tracking-widest mt-1">Per Selected Entry</p>
                    </div>
                 </div>
                 <div className="p-6 bg-white border-t border-gray-50">
                    <div className="w-full py-4 bg-gray-900 text-white rounded-2xl text-center text-xs font-black uppercase tracking-widest shadow-xl">Record Submission</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateChallengePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <CreateChallengeContent />
    </Suspense>
  )
}
