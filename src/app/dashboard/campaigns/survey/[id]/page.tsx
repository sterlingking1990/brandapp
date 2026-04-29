'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  ArrowLeft, 
  BarChart3, 
  Users, 
  MessageSquare, 
  Star, 
  Download,
  Loader2,
  ChevronRight,
  ClipboardList
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

export default function SurveyResultsPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    fetchResults()
  }, [id])

  const fetchResults = async () => {
    setLoading(true)
    try {
      // 1. Fetch Survey Header
      const { data: surveyData } = await supabase
        .from('surveys')
        .select('*, status_posts(title, description, reward_amount, reward_limit)')
        .eq('id', id)
        .single()
      
      setSurvey(surveyData)

      // 2. Fetch Questions with Answers
      const { data: questionsData, error } = await supabase
        .from('survey_questions')
        .select('*, survey_answers(*)')
        .eq('survey_id', id)
        .order('order_index', { ascending: true })

      if (error) throw error

      // 3. Process the data (Aggregation)
      const processed = questionsData.map(q => {
        const results: any = { total: q.survey_answers.length }
        
        if (q.question_type === 'multiple_choice' || q.question_type === 'yes_no') {
          const counts: Record<string, number> = {}
          // Initialize options
          if (q.options) {
            q.options.forEach((opt: any) => { counts[opt.option_text] = 0 })
          }
          // Count answers
          q.survey_answers.forEach((ans: any) => {
            if (ans.answer_option) {
              counts[ans.answer_option] = (counts[ans.answer_option] || 0) + 1
            }
          })
          results.options = Object.entries(counts).map(([text, count]) => ({
            text,
            count,
            percentage: results.total > 0 ? (count / results.total) * 100 : 0
          }))
        } else if (q.question_type === 'rating') {
          const sum = q.survey_answers.reduce((acc: number, curr: any) => acc + (curr.answer_rating || 0), 0)
          results.average = results.total > 0 ? (sum / results.total).toFixed(1) : '0'
        } else if (q.question_type === 'text') {
          results.responses = q.survey_answers.map((ans: any) => ans.answer_text).filter(Boolean)
        }

        return { ...q, results }
      })

      setQuestions(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="animate-spin text-brand" size={40} />
        <p className="text-gray-500 font-medium">Analyzing results...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Survey Insights</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">
          <Download size={18} /> Export CSV
        </button>
      </header>

      <main className="p-8 max-w-5xl mx-auto space-y-8">
        {/* Survey Overview Card */}
        <div className="glass-card rounded-[2.5rem] p-8 flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="h-20 w-20 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <ClipboardList size={40} />
          </div>
          <div className="flex-1 text-center md:text-left">
             <h2 className="text-3xl font-black text-gray-900 tracking-tight">{survey?.status_posts?.title}</h2>
             <p className="text-gray-500 mt-2 leading-relaxed">{survey?.status_posts?.description}</p>
             
             <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-6">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><Users size={16} /></div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase">Total Respondents</p>
                     <p className="text-sm font-bold text-gray-900">{questions[0]?.results?.total} / {survey?.status_posts?.reward_limit}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><BarChart3 size={16} /></div>
                   <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase">Completion Rate</p>
                     <p className="text-sm font-bold text-gray-900">
                        {survey?.status_posts?.reward_limit > 0 ? ((questions[0]?.results?.total / survey?.status_posts?.reward_limit) * 100).toFixed(0) : 0}%
                     </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Dynamic Question Results */}
        <div className="space-y-6">
           {questions.map((q, idx) => (
             <div key={q.id} className="glass-card rounded-[2rem] p-8 space-y-6 border-none shadow-sm">
                <div className="flex items-start gap-4">
                   <span className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">{idx + 1}</span>
                   <div>
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">{q.question_text}</h3>
                      <p className="text-xs font-bold text-gray-400 uppercase mt-1 tracking-widest">{q.question_type.replace('_', ' ')}</p>
                   </div>
                </div>

                <div className="pt-4">
                   {/* Multiple Choice Visuals */}
                   {(q.question_type === 'multiple_choice' || q.question_type === 'yes_no') && (
                     <div className="space-y-4">
                        {q.results.options.map((opt: any) => (
                          <div key={opt.text} className="space-y-2">
                             <div className="flex justify-between text-sm font-bold">
                                <span className="text-gray-700">{opt.text}</span>
                                <span className="text-blue-600">{opt.count} ({opt.percentage.toFixed(0)}%)</span>
                             </div>
                             <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${opt.percentage}%` }}
                                />
                             </div>
                          </div>
                        ))}
                     </div>
                   )}

                   {/* Rating Visuals */}
                   {q.question_type === 'rating' && (
                     <div className="flex flex-col items-center py-6 bg-yellow-50/30 rounded-3xl border border-yellow-100">
                        <div className="text-6xl font-black text-yellow-600">{q.results.average}</div>
                        <div className="flex gap-1 mt-4">
                           {[1,2,3,4,5].map(s => (
                             <Star key={s} size={24} className={s <= Math.round(Number(q.results.average)) ? "fill-yellow-500 text-yellow-500" : "text-gray-200"} />
                           ))}
                        </div>
                        <p className="text-xs font-bold text-yellow-700/60 uppercase mt-4 tracking-widest">Average Rating from {q.results.total} responses</p>
                     </div>
                   )}

                   {/* Text Responses Visuals */}
                   {q.question_type === 'text' && (
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-400 mb-4">
                          <MessageSquare size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">Latest Responses</span>
                        </div>
                        {q.results.responses.length > 0 ? q.results.responses.slice(0, 5).map((resp: string, rIdx: number) => (
                          <div key={rIdx} className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-700 border border-gray-100 leading-relaxed italic">
                            "{resp}"
                          </div>
                        )) : <p className="text-gray-400 text-sm italic">No text responses yet.</p>}
                        {q.results.responses.length > 5 && (
                          <button className="w-full py-3 text-xs font-black text-brand uppercase tracking-widest hover:underline">View all {q.results.responses.length} responses</button>
                        )}
                     </div>
                   )}
                </div>
             </div>
           ))}
        </div>
      </main>
    </div>
  )
}
