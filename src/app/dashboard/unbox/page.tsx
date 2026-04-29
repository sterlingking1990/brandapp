'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Video as VideoIcon,
  User,
  X,
  Plus,
  Coins,
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  PlayCircle,
  DollarSign
} from 'lucide-react'
import Toast from '@/components/Toast'

export default function UnboxReviewPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Modal States
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [showCloseDealModal, setShowCloseDealModal] = useState(false)
  
  // Form States
  const [rewardPerSale, setRewardPerSale] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [topUpAmount, setTopUpAmount] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchSubmissions()
  }, [filter])

  const fetchSubmissions = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!brand) return

      const { data, error } = await supabase
        .from('unboxed_submissions')
        .select(`
          *,
          profiles:influencer_id (full_name, username, avatar_url),
          hubs:hub_id (name)
        `)
        .eq('brand_id', brand.id)
        .in('status', filter === 'pending' ? ['pending'] : ['approved'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    const reward = parseFloat(rewardPerSale)
    const budget = parseFloat(totalBudget)

    if (isNaN(reward) || reward <= 0 || isNaN(budget) || budget < reward) {
      alert('Please enter valid reward and budget amounts.')
      return
    }

    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('approve_unboxed_submission', {
        p_submission_id: selectedSubmission.id,
        p_reward_per_sale: reward,
        p_escrow_amount: budget
      })

      if (error) throw error
      if (data?.success) {
        setToastMessage('Unboxing approved and listed on Hub!')
        setShowToast(true)
        setShowApproveModal(false)
        setSelectedSubmission(null)
        setRewardPerSale('')
        setTotalBudget('')
        fetchSubmissions()
      } else {
        alert(data?.message || 'Failed to approve')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount)
    if (isNaN(amount) || amount <= 0) return

    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('top_up_unboxed_budget', {
        p_submission_id: selectedSubmission.id,
        p_amount: amount
      })

      if (error) throw error
      
      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (result.success) {
        setToastMessage(`Budget topped up to ${result.new_budget} BC`)
        setShowToast(true)
        setShowTopUpModal(false)
        setTopUpAmount('')
        fetchSubmissions()
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCloseDeal = async () => {
    setIsProcessing(true)
    try {
      const { data, error } = await supabase.rpc('close_unboxed_referral_deal', {
        p_submission_id: selectedSubmission.id,
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        setToastMessage(`Deal closed. Refunded ${data[0].refunded_amount} BC`)
        setShowToast(true)
        setShowCloseDealModal(false)
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
    if (!confirm('Are you sure you want to reject this unboxing?')) return
    
    setIsProcessing(true)
    try {
      const { error } = await supabase.rpc('reject_unboxed_submission', {
        p_submission_id: submission.id,
        p_reason: 'Rejected by brand'
      })

      if (error) throw error
      setToastMessage('Submission rejected.')
      setShowToast(true)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <ShoppingBag className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Review & Pay (Unboxings)</h1>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {['pending', 'approved'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === s ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'pending' ? 'To Review' : 'Active Deals'}
            </button>
          ))}
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full flex-1">
        <div className="mb-8">
           <h2 className="text-2xl font-black text-gray-900">Unboxing Submissions</h2>
           <p className="text-sm text-gray-500 font-medium">Review pitches from hub owners and set up referral partnerships.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-medium tracking-wide animate-pulse">Scanning Submissions...</p>
          </div>
        ) : submissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {submissions.map((sub) => (
              <UnboxCard 
                key={sub.id} 
                submission={sub} 
                onReview={() => setSelectedSubmission(sub)}
                onReject={() => handleReject(sub)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
            <div className="h-24 w-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-300">
               <VideoIcon size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No {filter} unboxings</h3>
            <p className="text-gray-500 max-w-xs mx-auto">When hub owners respond to your promotion requests, they will appear here.</p>
          </div>
        )}
      </main>

      {/* Review & Action Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isProcessing && setSelectedSubmission(null)} />
           
           <div className="relative w-full max-w-5xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row animate-in zoom-in-95 duration-300 max-h-[90vh]">
              {/* Left: Media Content */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                {selectedSubmission.media_type === 'video' ? (
                  <video 
                    src={selectedSubmission.media_url} 
                    controls 
                    autoPlay
                    className="max-h-full w-auto"
                  />
                ) : (
                  <img src={selectedSubmission.media_url} className="max-h-full w-auto object-contain" />
                )}
              </div>

              {/* Right: Info & Workflow */}
              <div className="w-full lg:w-[450px] flex flex-col bg-white border-l border-gray-100 overflow-y-auto">
                <div className="p-8 space-y-8">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                          <img src={selectedSubmission.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${selectedSubmission.profiles?.full_name}`} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{selectedSubmission.profiles?.full_name}</p>
                          <p className="text-xs text-gray-500 mt-1.5">Hub Owner • @{selectedSubmission.profiles?.username}</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedSubmission(null)} className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                        <X size={20} />
                     </button>
                   </div>

                   <div className="space-y-4">
                     <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3">
                        <div className="flex items-center gap-2 text-brand">
                           <ShoppingBag size={16} />
                           <span className="text-[10px] font-black uppercase tracking-widest">Target Hub</span>
                        </div>
                        <h4 className="text-lg font-bold text-gray-900">{selectedSubmission.hubs?.name}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed italic">"{selectedSubmission.caption}"</p>
                     </div>

                     {selectedSubmission.status === 'approved' && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                              <p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Sales</p>
                              <p className="text-2xl font-black text-gray-900">{selectedSubmission.total_sales_count}</p>
                           </div>
                           <div className="p-4 bg-brand/5 rounded-2xl border border-brand/10">
                              <p className="text-[10px] font-black text-brand uppercase mb-1">Earned</p>
                              <p className="text-2xl font-black text-gray-900">{selectedSubmission.total_earned_by_influencer} BC</p>
                           </div>
                        </div>
                     )}
                   </div>

                   {/* Stats Footer */}
                   <div className="pt-6 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {new Date(selectedSubmission.created_at).toLocaleDateString()}</span>
                      {selectedSubmission.status === 'approved' && (
                        <span className="text-brand">Budget: {selectedSubmission.reserved_budget} BC</span>
                      )}
                   </div>
                </div>

                {/* Actions Section */}
                <div className="mt-auto p-8 bg-gray-50 border-t border-gray-100">
                  {selectedSubmission.status === 'pending' ? (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleReject(selectedSubmission)}
                        disabled={isProcessing}
                        className="flex-1 px-6 py-4 bg-white border border-gray-200 text-red-600 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => setShowApproveModal(true)}
                        className="flex-[2] px-6 py-4 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Approve & List
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowTopUpModal(true)}
                        className="flex-1 px-6 py-4 bg-white border border-gray-200 text-brand font-bold rounded-2xl hover:bg-brand/5 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Top Up
                      </button>
                      <button 
                        onClick={() => setShowCloseDealModal(true)}
                        className="flex-1 px-6 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        Close Deal
                      </button>
                    </div>
                  )}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Approval Sub-Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowApproveModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-xl font-black text-gray-900 mb-2">Setup Partnership</h3>
             <p className="text-sm text-gray-500 mb-8 font-medium">Set the referral rewards and initial escrow budget.</p>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reward Per Sale (BC)</label>
                   <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={20} />
                      <input 
                        type="number"
                        value={rewardPerSale}
                        onChange={(e) => setRewardPerSale(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Escrow Budget (BC)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-green-600" size={20} />
                      <input 
                        type="number"
                        value={totalBudget}
                        onChange={(e) => setTotalBudget(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                      />
                   </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                   <button 
                     onClick={() => setShowApproveModal(false)}
                     className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleApprove}
                     disabled={isProcessing}
                     className="flex-[2] px-6 py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                   >
                     {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Approval'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Top Up Sub-Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowTopUpModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
             <h3 className="text-xl font-black text-gray-900 mb-2">Top Up Budget</h3>
             <p className="text-sm text-gray-500 mb-8 font-medium">Add more funds to the referral escrow.</p>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Add (BC)</label>
                   <div className="relative">
                      <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={20} />
                      <input 
                        type="number"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand outline-none"
                      />
                   </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                   <button 
                     onClick={() => setShowTopUpModal(false)}
                     className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleTopUp}
                     disabled={isProcessing}
                     className="flex-[2] px-6 py-3 bg-brand text-white font-bold rounded-xl shadow-lg shadow-brand/20 flex items-center justify-center gap-2"
                   >
                     {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Add Funds'}
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Close Deal Sub-Modal */}
      {showCloseDealModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowCloseDealModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="h-16 w-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle size={32} />
             </div>
             <h3 className="text-2xl font-black text-gray-900 mb-2">Close Referral Deal</h3>
             <p className="text-sm text-gray-600 mb-6 leading-relaxed">
               This will end the partnership. Remaining budget of <span className="font-black text-red-600">{selectedSubmission.reserved_budget} BC</span> will be refunded to your brand wallet.
             </p>
             
             <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-400 uppercase">Total Sales</span>
                   <span className="font-bold text-gray-900">{selectedSubmission.total_sales_count}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-gray-400 uppercase">Influencer Earned</span>
                   <span className="font-bold text-gray-900">{selectedSubmission.total_earned_by_influencer} BC</span>
                </div>
             </div>
             
             <div className="flex gap-4">
                <button 
                  onClick={() => setShowCloseDealModal(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCloseDeal}
                  disabled={isProcessing}
                  className="flex-[2] px-6 py-4 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Terminate Deal'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UnboxCard({ submission, onReview, onReject }: any) {
  return (
    <div className="glass-card rounded-[2.5rem] overflow-hidden group hover:border-brand/40 transition-all flex flex-col h-full bg-white shadow-sm border-transparent">
       <div className="aspect-video bg-gray-900 relative cursor-pointer" onClick={onReview}>
          {submission.media_type === 'video' ? (
            <video 
              src={submission.media_url}
              poster={submission.thumbnail_url}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              muted
              playsInline
            />
          ) : (
            <img 
              src={submission.media_url} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          <div className="absolute top-4 left-4">
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
               submission.status === 'pending' ? 'bg-yellow-400 text-black' : 'bg-green-500 text-white'
             }`}>
               {submission.status === 'pending' ? 'New Request' : 'Live on Hub'}
             </span>
          </div>

          {submission.media_type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center">
                  <PlayCircle className="text-white fill-current" size={32} />
               </div>
            </div>
          )}
       </div>

       <div className="p-8 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="h-10 w-10 rounded-xl overflow-hidden border border-gray-100">
                <img src={submission.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${submission.profiles?.full_name}`} className="h-full w-full object-cover" />
             </div>
             <div>
                <p className="font-bold text-gray-900 leading-none">{submission.profiles?.full_name}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-wider">@{submission.profiles?.username}</p>
             </div>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed italic mb-6">
            "{submission.caption || "Ready to unbox and share with my community!"}"
          </p>

          <div className="mt-auto space-y-4">
             {submission.status === 'approved' ? (
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Budget Left</p>
                      <p className="font-bold text-gray-900">{submission.reserved_budget} BC</p>
                   </div>
                   <div className="border-l border-gray-200 pl-4">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Sales</p>
                      <p className="font-bold text-gray-900">{submission.total_sales_count}</p>
                   </div>
                </div>
             ) : (
               <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(submission.created_at).toLocaleDateString()}</span>
                  <span>Hub: {submission.hubs?.name}</span>
               </div>
             )}

             <div className="flex gap-2">
                <button 
                  onClick={onReview}
                  className="flex-1 py-3 bg-brand text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/10"
                >
                  {submission.status === 'pending' ? 'Review Submission' : 'Manage Partnership'}
                  <ArrowRight size={14} />
                </button>
             </div>
          </div>
       </div>
    </div>
  )
}
