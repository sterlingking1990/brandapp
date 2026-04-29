'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  Search, 
  Loader2,
  Video as VideoIcon,
  User,
  ChevronRight,
  Maximize2
} from 'lucide-react'
import Toast from '@/components/Toast'

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          id,
          submission_url,
          submission_type,
          caption,
          status,
          submitted_at,
          challenges!inner (id, challenge_prompt, status_post_id, status_posts!inner (title, brand_id, reward_amount)),
          profiles:participant_id (id, full_name, username, avatar_url)
        `)
        .eq('challenges.status_posts.brand_id', user.id)
        .eq('status', filter)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submission: any) => {
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.rpc('approve_challenge_submission', {
        p_submission_id: submission.id,
        p_brand_id: user?.id,
      })

      if (error) throw error
      if (data?.success) {
        setToastMessage('Submission approved successfully!')
        setShowToast(true)
        setSelectedSubmission(null)
        fetchSubmissions()
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (submission: any) => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .update({ status: 'rejected' })
        .eq('id', submission.id)

      if (error) throw error
      setToastMessage('Submission rejected.')
      setShowToast(true)
      setSelectedSubmission(null)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Challenge Submissions</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === s ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-medium tracking-wide animate-pulse">Fetching entries...</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {submissions.map((sub) => (
              <div 
                key={sub.id} 
                className="glass-card rounded-3xl overflow-hidden group cursor-pointer hover:border-brand/50 transition-all"
                onClick={() => setSelectedSubmission(sub)}
              >
                <div className="aspect-[3/4] bg-gray-900 relative">
                   <video 
                     src={sub.submission_url} 
                     className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                   
                   <div className="absolute top-4 left-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                       sub.status === 'pending' ? 'bg-yellow-400 text-black' :
                       sub.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                     }`}>
                       {sub.status}
                     </span>
                   </div>

                   <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-bold text-sm truncate">{sub.profiles?.full_name || sub.profiles?.username}</p>
                      <p className="text-white/60 text-[10px] uppercase font-bold truncate mt-0.5">{sub.challenges?.status_posts?.title}</p>
                   </div>
                   
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                      <div className="h-14 w-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center">
                        <Play className="text-white fill-current" size={24} />
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
            <div className="h-20 w-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400">
               <VideoIcon size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No {filter} submissions</h3>
            <p className="text-gray-500 max-w-xs mx-auto">When creators participate in your challenges, their entries will appear here for review.</p>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-12">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedSubmission(null)} />
           
           <div className="relative w-full max-w-6xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row animate-in zoom-in-95 duration-300">
              {/* Left: Video Player */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                <video 
                  src={selectedSubmission.submission_url} 
                  controls 
                  autoPlay
                  className="max-h-[80vh] w-auto shadow-2xl"
                />
              </div>

              {/* Right: Info & Actions */}
              <div className="w-full lg:w-[400px] flex flex-col bg-white">
                <div className="p-8 flex-1 space-y-8 overflow-y-auto">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                          {selectedSubmission.profiles?.avatar_url && (
                             <img src={selectedSubmission.profiles.avatar_url} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{selectedSubmission.profiles?.full_name}</p>
                          <p className="text-xs text-gray-500 mt-1.5">@{selectedSubmission.profiles?.username}</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <XCircle className="text-gray-400" size={24} />
                     </button>
                   </div>

                   <div className="space-y-4">
                     <div className="bg-brand/5 border border-brand/10 p-5 rounded-2xl">
                        <label className="text-[10px] font-black text-brand uppercase tracking-widest">Active Challenge</label>
                        <h4 className="text-lg font-bold text-gray-900 mt-1">{selectedSubmission.challenges?.status_posts?.title}</h4>
                        <p className="text-sm text-gray-600 mt-2 italic leading-relaxed">"{selectedSubmission.challenges?.challenge_prompt}"</p>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creator Caption</label>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          {selectedSubmission.caption || "No caption provided."}
                        </p>
                     </div>
                   </div>

                   <div className="pt-4 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(selectedSubmission.submitted_at).toLocaleDateString()}</span>
                      <span className="text-brand">Reward: {selectedSubmission.challenges?.status_posts?.reward_amount} Coins</span>
                   </div>
                </div>

                {selectedSubmission.status === 'pending' && (
                  <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                    <button 
                      onClick={() => handleReject(selectedSubmission)}
                      disabled={isProcessing}
                      className="flex-1 px-6 py-4 bg-white border border-gray-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><XCircle size={20} /> Reject</>}
                    </button>
                    <button 
                      onClick={() => handleApprove(selectedSubmission)}
                      disabled={isProcessing}
                      className="flex-[2] px-6 py-4 brand-gradient text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Approve & Pay</>}
                    </button>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
