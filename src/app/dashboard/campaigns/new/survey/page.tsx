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
  Clock,
  Smartphone,
  CheckCircle2,
  Loader2,
  ClipboardList,
  Plus,
  Trash2,
  GitBranch,
  Star,
  Users,
  MapPin,
  Hash,
  Settings
} from 'lucide-react'
import HubSelector from '@/components/HubSelector'
import InterestsInput from '@/components/InterestsInput'

function CreateSurveyContent() {
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
    hashtags: '',
    targetLocations: [] as string[],
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
      question: '', 
      question_type: 'text', 
      options: [], 
      is_required: true,
      skip_logic: {}
    }
  ])

  const [expandedSkipLogic, setExpandedSkipLogic] = useState<{[key: number]: boolean}>({})

  const addQuestion = () => {
    setQuestions([...questions, { 
      question: '', 
      question_type: 'text', 
      options: [], 
      is_required: true,
      skip_logic: {}
    }])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updated = questions.filter((_, i) => i !== index)
      
      // Update skip logic references to account for removed question
      const newUpdated = updated.map((q, newIndex) => {
        if (q.question_type === 'multiple_choice' && q.options) {
          return {
            ...q,
            options: q.options.map((opt: any) => {
              // Keep 'no-skip' and 'end' as is
              if (opt.next_question_id === 'no-skip' || opt.next_question_id === 'end') {
                return opt
              }
              
              // Handle question index references
              let adjustedId = opt.next_question_id
              if (typeof adjustedId === 'number') {
                if (adjustedId === index) {
                  // If pointing to removed question, reset to no-skip
                  return { ...opt, next_question_id: 'no-skip' }
                } else if (adjustedId > index) {
                  // Adjust indices for questions after the removed one
                  return { ...opt, next_question_id: adjustedId - 1 }
                }
              }
              return opt
            })
          }
        }
        return q
      })
      
      setQuestions(newUpdated)
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    
    // Convert options to proper format when changing question type
    if (field === 'question_type') {
      if (value === 'multiple_choice') {
        // Convert any string options to objects
        newQuestions[index].options = (newQuestions[index].options || []).map((opt: any) => 
          typeof opt === 'string' 
            ? { option_text: opt, next_question_id: 'no-skip' }
            : opt
        )
      } else {
        // For non-multiple choice, clear options
        newQuestions[index].options = []
      }
    }
    
    setQuestions(newQuestions)
  }

  const addOption = (qIndex: number) => {
    const newQuestions = [...questions]
    newQuestions[qIndex].options = [...newQuestions[qIndex].options, { option_text: '', next_question_id: 'no-skip' }]
    setQuestions(newQuestions)
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions]
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_: any, i: number) => i !== oIndex)
    setQuestions(newQuestions)
  }

  const updateOptionSkipLogic = (qIndex: number, oIndex: number, nextValue: any) => {
    const newQuestions = [...questions]
    
    let nextId = 'no-skip'
    
    if (nextValue === 'no-skip' || nextValue === 'end') {
      nextId = nextValue
    } else if (nextValue !== null && nextValue !== undefined) {
      nextId = nextValue
    }
    
    newQuestions[qIndex].options[oIndex].next_question_id = nextId
    setQuestions(newQuestions)
  }

  const toggleSkipLogic = (questionIndex: number) => {
    setExpandedSkipLogic(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }))
  }

  const handleReachCalculated = (reach: number) => {
    setTotalHubReach(reach)
    if (formData.isPrivate && parseInt(formData.rewardLimit) > reach && reach > 0) {
      setFormData(prev => ({ ...prev, rewardLimit: reach.toString() }))
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

      const questionsWithSkipLogic = questions.map((q, index) => {
        const questionData: any = {
          question_text: q.question,
          question_type: q.question_type,
          is_required: q.is_required,
          order_index: index
        }
        
        // Only add options for multiple_choice questions
        if (q.question_type === 'multiple_choice' && q.options && q.options.length > 0) {
          questionData.options = q.options.map((opt: any) => ({
            option_text: opt.option_text || opt,
            next_question_id: opt.next_question_id || 'no-skip'
          }))
        }
        
        return questionData
      })

      const hashtagsArray = formData.hashtags.split(',').map((h: string) => h.trim()).filter((h: string) => h)

      const { data: surveyData, error: surveyError } = await supabase
        .rpc('create_survey_with_status_post', {
          p_brand_id: user.id,
          p_title: formData.title,
          p_description: formData.description,
          p_duration: parseInt(formData.duration),
          p_reward_amount: parseFloat(formData.rewardAmount),
          p_reward_limit: parseInt(formData.rewardLimit),
          p_expires_at: expiresAt.toISOString(),
          p_questions: questionsWithSkipLogic,
          p_hashtags: hashtagsArray,
          p_is_private: formData.isPrivate,
          p_target_locations: formData.targetLocations,
          p_target_hub_ids: selectedHubs
        })

      if (surveyError) {
        console.error('RPC Error:', surveyError)
        throw surveyError
      }

      router.push('/dashboard/campaigns?success=survey_created')
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
                <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>

          <header>
            <h1 className="text-2xl font-bold text-gray-900">Create Market Survey</h1>
            <p className="text-gray-500">Gather insights from targeted influencer communities.</p>
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
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Survey Title</label>
                    <input 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. New Product Feedback"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Instructions / Context</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      placeholder="Tell influencers what this survey is about..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Hash size={16} className="text-purple-600" />
                      Interests & Hashtags
                    </label>
                    <InterestsInput onInterestsChange={(hashtags) => setFormData({...formData, hashtags})} />
                  </div>
               </div>
            </div>
          )}

          {/* Step 2: Questions */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
               {questions.map((q, qIndex) => (
                 <div key={qIndex} className="p-6 border border-gray-100 rounded-[2rem] bg-gray-50/50 space-y-4 relative group">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Question {qIndex + 1}</span>
                       {questions.length > 1 && (
                         <button onClick={() => removeQuestion(qIndex)} className="text-gray-400 hover:text-red-600 transition-colors">
                           <Trash2 size={18} />
                         </button>
                       )}
                    </div>
                    
                    <input 
                      value={q.question}
                      onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="What is your question?"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />

                    <div className="flex gap-2 flex-wrap">
                       {['text', 'multiple_choice', 'rating', 'yes_no'].map((type) => (
                         <button
                           key={type}
                           onClick={() => updateQuestion(qIndex, 'question_type', type)}
                           className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${q.question_type === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-gray-400 border border-gray-200 hover:border-blue-200'}`}
                         >
                           {type.replace('_', ' ')}
                         </button>
                       ))}
                    </div>

                    {q.question_type === 'multiple_choice' && (
                      <div className="space-y-3 pt-2">
                        {q.options.map((opt: any, oIndex: number) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input 
                              value={opt.option_text || opt}
                              onChange={e => {
                                const newQuestions = [...questions]
                                if (typeof opt === 'string') {
                                  newQuestions[qIndex].options[oIndex] = { option_text: e.target.value, next_question_id: 'no-skip' }
                                } else {
                                  newQuestions[qIndex].options[oIndex] = { ...opt, option_text: e.target.value }
                                }
                                setQuestions(newQuestions)
                              }}
                              placeholder={`Option ${oIndex + 1}`}
                              className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            />
                            <button onClick={() => removeOption(qIndex, oIndex)} className="text-gray-400 hover:text-red-600 p-1">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addOption(qIndex)} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                          <Plus size={14} /> Add Option
                        </button>

                        {q.options.length > 0 && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <button 
                              onClick={() => toggleSkipLogic(qIndex)}
                              className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600"
                            >
                              <Settings size={16} />
                              Skip Logic {expandedSkipLogic[qIndex] ? '▲' : '▼'}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">Configure what happens after each option is selected</p>

                            {expandedSkipLogic[qIndex] && (
                              <div className="mt-3 space-y-3">
                                {q.options.map((opt: any, oIndex: number) => (
                                  <div key={oIndex} className="p-3 bg-white rounded-lg border">
                                    <p className="text-sm font-medium text-gray-800 mb-2">
                                      When user selects: "{typeof opt === 'string' ? opt : (opt.option_text || `(Empty ${oIndex + 1})`)}"
                                    </p>
                                    
                                    <div className="flex flex-wrap gap-2">
                                      <button 
                                        onClick={() => updateOptionSkipLogic(qIndex, oIndex, 'no-skip')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                          (opt.next_question_id || 'no-skip') === 'no-skip' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                      >
                                        No Skip
                                      </button>

                                      <button 
                                        onClick={() => updateOptionSkipLogic(qIndex, oIndex, 'end')}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                          opt.next_question_id === 'end' 
                                            ? 'bg-red-600 text-white' 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                      >
                                        End Survey
                                      </button>

                                      {questions.map((q2, q2Index) => (
                                        qIndex !== q2Index && (
                                          <button
                                            key={q2Index}
                                            onClick={() => updateOptionSkipLogic(qIndex, oIndex, q2Index)}
                                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                              opt.next_question_id === q2Index 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                          >
                                            Go to Q{q2Index + 1}
                                          </button>
                                        )
                                      ))}
                                    </div>

                                    <p className="text-xs text-gray-500 mt-2">
                                      Currently: {
                                        opt.next_question_id === 'no-skip' ? 'Continues to next question' :
                                        opt.next_question_id === 'end' ? 'Ends survey' :
                                        typeof opt.next_question_id === 'number' ? `Jumps to Q${opt.next_question_id + 1}` :
                                        'Continues to next question'
                                      }
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               ))}
               
               <button 
                 onClick={addQuestion}
                 className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-bold flex items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all bg-white"
               >
                 <Plus size={20} /> Add New Question
               </button>
            </div>
          )}

          {/* Step 3: Rewards & Targeting */}
          {step === 3 && (
             <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Coins size={16} className="text-brand" />
                        Reward per Completion
                      </label>
                      <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        Target Responses
                      </label>
                      <input name="rewardLimit" type="number" value={formData.rewardLimit} onChange={e => setFormData({...formData, rewardLimit: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">Community Targeting</h3>
                    <button 
                      onClick={() => setFormData({...formData, isPrivate: !formData.isPrivate})}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        formData.isPrivate ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'
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

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <MapPin size={16} className="text-green-600" />
                      Target Locations (Optional)
                    </label>
                    <input 
                      value={formData.targetLocations.join(', ')}
                      onChange={e => setFormData({...formData, targetLocations: e.target.value.split(',').map(l => l.trim()).filter(l => l)})}
                      placeholder="e.g. Lagos, Abuja, Nairobi"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500">Comma-separated list of cities or regions to target</p>
                  </div>
                </div>

                <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-600/20 flex justify-between items-center">
                   <span className="font-medium opacity-80 uppercase tracking-widest text-[10px]">Total Campaign Cost</span>
                   <span className="text-2xl font-black">{calculateTotalCost().toLocaleString()} BC</span>
                </div>
             </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] space-y-6 text-center">
                   <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                     <CheckCircle2 size={32} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-gray-900">Campaign Ready</h3>
                     <p className="text-gray-500 mt-1">Review your survey details and launch.</p>
                   </div>
                   <div className="grid grid-cols-2 gap-3 pt-4">
                      <SummaryItem label="Total Coins" value={`${calculateTotalCost()} BC`} />
                      <SummaryItem label="Questions" value={questions.length} />
                      <SummaryItem label="Max Reach" value={`${formData.rewardLimit} Users`} />
                      <SummaryItem label="Duration" value={`${formData.duration} Hours`} />
                      {formData.hashtags && <SummaryItem label="Interests" value={formData.hashtags.split(',').length} />}
                      {formData.targetLocations.length > 0 && <SummaryItem label="Locations" value={formData.targetLocations.length} />}
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
              ${step === 4 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-blue-600 hover:opacity-90 shadow-blue-500/10'}
              disabled:opacity-50
            `}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (step === 4 ? 'Launch Campaign Now' : 'Next Step')}
          </button>
        </div>
      </div>

      {/* Preview Column */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 bg-gray-100/50 relative overflow-hidden">
         <div className="w-[320px] h-[640px] bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden relative scale-90">
            <div className="h-full bg-white flex flex-col pt-8">
               <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Survey Preview</span>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
               </div>
               <div className="p-6 flex-1 space-y-6 overflow-y-auto scrollbar-hide">
                  <div className="space-y-2">
                     <h2 className="text-xl font-black text-gray-900 leading-tight">{formData.title || 'Survey Title'}</h2>
                     <p className="text-xs text-gray-500 leading-relaxed italic">{formData.description || 'Description will appear here...'}</p>
                  </div>
                  
                  <div className="space-y-4">
                     {questions.map((q, i) => (
                       <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Q{i+1}</p>
                          <p className="text-xs font-bold text-gray-800">{q.question || 'Placeholder Question'}</p>
                          <div className="space-y-2">
                            {q.question_type === 'text' && (
                              <div className="h-8 w-full bg-white rounded-lg border border-gray-100" />
                            )}
                            {q.question_type === 'multiple_choice' && (
                              <div className="space-y-2">
                                {(q.options || []).slice(0, 3).map((opt: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                    <span className="text-xs text-gray-600">{typeof opt === 'string' ? opt : (opt.option_text || `Option ${idx + 1}`)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.question_type === 'rating' && (
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map(star => (
                                  <Star key={star} size={16} className="text-gray-300" />
                                ))}
                              </div>
                            )}
                            {q.question_type === 'yes_no' && (
                              <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                  <span className="text-xs text-gray-600">Yes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                  <span className="text-xs text-gray-600">No</span>
                                </div>
                              </div>
                            )}
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="mt-10 p-5 bg-blue-50 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Coins size={14} className="text-brand" />
                        <span className="text-sm font-black text-gray-900">{formData.rewardAmount} BC</span>
                     </div>
                     <span className="text-[10px] font-black text-blue-600 uppercase">Per Response</span>
                  </div>
               </div>
               <div className="p-6 bg-white border-t border-gray-50">
                  <div className="w-full py-3 bg-gray-100 rounded-xl text-center text-xs font-black text-gray-400 uppercase tracking-widest">Submit Survey</div>
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: any) {
  return (
    <div className="bg-white/50 p-4 rounded-2xl">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">{value}</p>
    </div>
  )
}

export default function CreateSurveyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-brand" size={40} /></div>}>
       <CreateSurveyContent />
    </Suspense>
  )
}
