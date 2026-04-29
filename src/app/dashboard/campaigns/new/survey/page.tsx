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
  Clock,
  Smartphone,
  CheckCircle2,
  Loader2,
  ClipboardList,
  Plus,
  Trash2,
  GitBranch,
  Star,
  Users
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'

export default function CreateSurveyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rewardAmount: '10',
    rewardLimit: '100',
    duration: '48',
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

  const [questions, setQuestions] = useState<any[]>([
    { 
      question_text: '', 
      question_type: 'text', 
      options: [], 
      is_required: true 
    }
  ])

  const calculateTotalCost = () => {
    const base = (parseFloat(formData.rewardAmount) || 0) * (parseInt(formData.rewardLimit) || 0)
    return formData.isPrivate ? base * 1.1 : base
  }

  const handleFormDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Capping logic for private surveys
    if (name === 'rewardLimit' && formData.isPrivate && parseInt(value) > totalHubReach && totalHubReach > 0) {
      setFormData({ ...formData, [name]: totalHubReach.toString() })
      return
    }

    setFormData({ ...formData, [name]: value })
  }

  const handleReachCalculated = (reach: number) => {
    setTotalHubReach(reach)
    // If current limit is higher than new reach when private, auto-adjust down
    if (formData.isPrivate && parseInt(formData.rewardLimit) > reach && reach > 0) {
      setFormData(prev => ({ ...prev, rewardLimit: reach.toString() }))
    }
  }

  const togglePrivate = () => {
    const newIsPrivate = !formData.isPrivate
    setFormData(prev => ({ ...prev, isPrivate: newIsPrivate }))
    
    // If turning on private, cap current limit to reach
    if (newIsPrivate && parseInt(formData.rewardLimit) > totalHubReach && totalHubReach > 0) {
      setFormData(prev => ({ ...prev, rewardLimit: totalHubReach.toString() }))
    }
  }

  const addQuestion = () => {
    setQuestions([...questions, { 
      question_text: '', 
      question_type: 'text', 
      options: [], 
      is_required: true 
    }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions]
    updated[index][field] = value
    
    // Auto-init options if multiple choice
    if (field === 'question_type' && value === 'multiple_choice' && updated[index].options.length === 0) {
      updated[index].options = [
        { option_text: 'Option 1', next_question_id: 'no-skip' },
        { option_text: 'Option 2', next_question_id: 'no-skip' }
      ]
    }
    setQuestions(updated)
  }

  const addOption = (qIndex: number) => {
    const updated = [...questions]
    updated[qIndex].options.push({ 
      option_text: `Option ${updated[qIndex].options.length + 1}`, 
      next_question_id: 'no-skip' 
    })
    setQuestions(updated)
  }

  const updateOption = (qIndex: number, oIndex: number, field: string, value: any) => {
    const updated = [...questions]
    updated[qIndex].options[oIndex][field] = value
    setQuestions(updated)
  }

  const handleLaunch = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.duration))

      // Format questions for RPC
      const formattedQuestions = questions.map((q, idx) => ({
        question_text: q.question_text,
        question_type: q.question_type === 'star_rating' ? 'rating' : q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options : [],
        is_required: q.is_required,
        order_index: idx
      }))

      const { data, error: rpcError } = await supabase.rpc('create_survey_with_status_post', {
        p_brand_id: user.id,
        p_title: formData.title,
        p_description: formData.description,
        p_duration: parseInt(formData.duration),
        p_reward_amount: parseFloat(formData.rewardAmount),
        p_reward_limit: parseInt(formData.rewardLimit),
        p_expires_at: expiresAt.toISOString(),
        p_questions: formattedQuestions,
        p_is_private: formData.isPrivate,
        p_target_locations: [],
        p_target_hub_ids: selectedHubs
      })

      if (rpcError) throw rpcError
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to create survey')
      }

      router.push('/dashboard/campaigns?success=survey_created')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Form Area */}
      <div className="w-full lg:w-[750px] bg-white border-r border-gray-200 overflow-y-auto p-8 flex flex-col">
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Create Market Survey</h1>
            <p className="text-gray-500">Design dynamic paths for your respondents.</p>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Survey Title</label>
                <input 
                  name="title"
                  value={formData.title}
                  onChange={handleFormDataChange}
                  placeholder="e.g. Summer Product Feedback"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Introduction</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleFormDataChange}
                  rows={4}
                  placeholder="Tell your audience why you're collecting this feedback..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}

          {/* Step 2: Question Builder + Skip Logic */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Questions</h3>
                <button onClick={addQuestion} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
                  <Plus size={16} /> Add Question
                </button>
              </div>
              
              <div className="space-y-6">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-6 border border-gray-100 rounded-2xl bg-gray-50 space-y-4 group relative">
                    <button onClick={() => removeQuestion(qIdx)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={18} />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Question {qIdx + 1}</label>
                        <input 
                          value={q.question_text}
                          onChange={(e) => updateQuestion(qIdx, 'question_text', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
                        <select 
                          value={q.question_type}
                          onChange={(e) => updateQuestion(qIdx, 'question_type', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg appearance-none"
                        >
                          <option value="text">Short Answer</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="star_rating">Star Rating</option>
                        </select>
                      </div>
                    </div>

                    {q.question_type === 'multiple_choice' && (
                      <div className="space-y-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-blue-600">
                          <GitBranch size={16} />
                          <label className="text-[10px] font-bold uppercase">Options & Skip Logic</label>
                        </div>
                        
                        <div className="space-y-3">
                          {q.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx} className="flex flex-col md:flex-row gap-3 bg-white p-3 rounded-xl border border-gray-100">
                              <input 
                                value={opt.option_text}
                                onChange={(e) => updateOption(qIdx, oIdx, 'option_text', e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm border-b border-transparent focus:border-blue-500 focus:outline-none"
                                placeholder="Option label"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400">THEN</span>
                                <select 
                                  value={opt.next_question_id}
                                  onChange={(e) => updateOption(qIdx, oIdx, 'next_question_id', e.target.value)}
                                  className="text-xs font-semibold bg-gray-50 px-2 py-1 rounded border-none focus:ring-0"
                                >
                                  <option value="no-skip">Next Question</option>
                                  <option value="end">End Survey</option>
                                  {questions.map((_, innerIdx) => (
                                    innerIdx > qIdx && (
                                      <option key={innerIdx} value={innerIdx}>
                                        Jump to Q{innerIdx + 1}
                                      </option>
                                    )
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addOption(qIdx)} className="text-xs font-bold text-blue-600 flex items-center gap-1 pl-1">
                            <Plus size={14} /> Add Option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Incentives & Targeting */}
          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2">1. Incentives</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Coins size={16} className="text-brand" />
                      Reward per Response
                    </label>
                    <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Users size={16} className="text-green-600" />
                      Total Respondents
                    </label>
                    <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={handleFormDataChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-lg font-bold text-gray-900">2. Hub Targeting</h3>
                  <button 
                    onClick={togglePrivate}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      formData.isPrivate ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {formData.isPrivate ? 'Targeting Active' : 'Target a Community'}
                  </button>
                </div>
                
                {formData.isPrivate ? (
                  <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-blue-600 font-medium">
                        Select hubs to target. Total potential reach: <span className="font-bold">{totalHubReach.toLocaleString()}</span>
                      </p>
                      {totalHubReach > 0 && parseInt(formData.rewardLimit) >= totalHubReach && (
                         <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">Max Reach Capped</span>
                      )}
                    </div>
                    <HubSelector 
                      selectedHubIds={selectedHubs}
                      onHubsSelected={setSelectedHubs}
                      onReachCalculated={handleReachCalculated}
                    />
                  </div>
                ) : (
                  <div className="p-10 border-2 border-dashed border-gray-100 rounded-2xl text-center">
                    <p className="text-sm text-gray-400">This survey will be available to all influencers unless a community is targeted.</p>
                  </div>
                )}
              </div>

              {/* Budget Summary Card */}
              <div className="p-6 brand-gradient rounded-2xl text-white space-y-4 shadow-xl shadow-brand/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium opacity-90">Total Budget Requirement</span>
                  <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} Coins</span>
                </div>
                {formData.isPrivate && (
                  <div className="pt-2 border-t border-white/20 text-[10px] font-bold uppercase tracking-wider flex justify-between">
                    <span>Base: { (parseFloat(formData.rewardAmount) * parseInt(formData.rewardLimit)).toLocaleString() }</span>
                    <span>Hub Curation Fee: 10%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="p-8 bg-green-50 border border-green-100 rounded-3xl space-y-6">
                 <div className="flex items-center gap-4">
                   <div className="h-12 w-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                     <CheckCircle2 size={24} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-gray-900">Campaign Ready</h3>
                     <p className="text-sm text-gray-500">Review the final details before launching.</p>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <ReviewStat label="Title" value={formData.title} />
                    <ReviewStat label="Total Cost" value={`${calculateTotalCost()} Coins`} />
                    <ReviewStat label="Questions" value={`${questions.length} Questions`} />
                    <ReviewStat label="Target" value={formData.isPrivate ? `${selectedHubs.length} Hubs` : 'Global'} />
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-gray-100 flex gap-4">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">Back</button>
          )}
          <button 
            onClick={step < 4 ? () => setStep(step + 1) : handleLaunch}
            disabled={loading || (step === 3 && formData.isPrivate && selectedHubs.length === 0)}
            className={`
              flex-1 px-6 py-3 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg
              ${step === 4 ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Launch Campaign Now' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview Area (Desktop Only) */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
        <div className="absolute top-20 right-20 text-blue-600/10 animate-pulse"><Sparkles size={120} /></div>
        
        <div className="relative scale-90">
          <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative">
            <div className="h-full bg-white flex flex-col pt-8">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <ClipboardList size={14} className="text-blue-600" />
                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Preview</span>
              </div>
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{formData.title || 'Your Survey Title'}</h3>
                {questions.slice(0, 3).map((q, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-xs font-bold text-gray-800">{idx + 1}. {q.question_text || 'Question text...'}</p>
                    {q.question_type === 'multiple_choice' ? (
                      <div className="space-y-1">
                        {q.options.slice(0, 2).map((opt: any, oIdx: number) => (
                          <div key={oIdx} className="p-2 border border-gray-100 rounded text-[10px] flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full border border-gray-300" />
                             {opt.option_text}
                          </div>
                        ))}
                      </div>
                    ) : q.question_type === 'star_rating' ? (
                       <div className="flex gap-1">
                         {[1,2,3,4,5].map(s => <Star key={s} size={12} className="text-gray-200" />)}
                       </div>
                    ) : (
                       <div className="h-8 w-full bg-gray-50 border border-gray-100 rounded" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white/50 p-4 rounded-2xl">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{value}</p>
    </div>
  )
}
