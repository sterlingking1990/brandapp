'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  PartyPopper,
  Coins,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [transaction, setTransaction] = useState<any>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const reference = searchParams.get('reference')

  useEffect(() => {
    if (reference) {
      verifyPayment()
    } else {
      setStatus('error')
      setLoading(false)
    }
  }, [reference])

  const verifyPayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-paystack-payment', {
        body: { reference }
      })

      if (error) throw error

      if (data?.success) {
        setTransaction(data.transaction)
        setStatus('success')
      } else {
        setStatus('error')
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
         <Loader2 className="animate-spin text-brand" size={60} />
         <div>
            <h2 className="text-2xl font-black text-gray-900">Verifying Payment</h2>
            <p className="text-gray-500 mt-2 font-medium">Please wait while we confirm your transaction...</p>
         </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 text-center max-w-md mx-auto">
         <div className="h-20 w-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center shadow-lg shadow-red-600/10">
            <ShieldCheck size={40} />
         </div>
         <div>
            <h2 className="text-3xl font-black text-gray-900">Verification Failed</h2>
            <p className="text-gray-500 mt-3 font-medium leading-relaxed">
              We couldn't automatically verify your payment. If your account was debited, please contact support with reference: 
              <span className="block mt-2 font-black text-gray-900 break-all">{reference}</span>
            </p>
         </div>
         <Link 
           href="/dashboard/store"
           className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all"
         >
            BACK TO STORE
         </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-10 text-center max-w-xl mx-auto animate-in zoom-in-95 duration-500">
       <div className="relative">
          <div className="h-28 w-28 bg-emerald-50 text-emerald-600 rounded-[3rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 relative z-10">
             <CheckCircle2 size={56} />
          </div>
          <div className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse" />
       </div>

       <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand/10 text-brand rounded-full text-[10px] font-black uppercase tracking-widest">
             <PartyPopper size={14} />
             Payment Successful
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Coins Credited!</h2>
          <p className="text-gray-500 text-lg font-medium">Your brandible wallet has been topped up successfully.</p>
       </div>

       {transaction && (
          <div className="w-full bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
             <div className="flex justify-between items-center pb-6 border-b border-gray-50">
                <div className="text-left">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction ID</p>
                   <p className="text-xs font-bold text-gray-900 mt-1">{transaction.id}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Paid</p>
                   <p className="text-lg font-black text-emerald-600 mt-1">₦{(transaction.amount / 100).toLocaleString()}</p>
                </div>
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                      <Coins size={20} />
                   </div>
                   <div className="text-left">
                      <p className="text-xs font-black text-gray-900">Brandible Coins</p>
                      <p className="text-[10px] font-bold text-gray-400">Credited to wallet</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-xl font-black text-brand">+{transaction.coin_amount?.toLocaleString()} BC</p>
                </div>
             </div>
          </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <button 
            onClick={() => router.push('/dashboard')}
            className="py-4 px-6 bg-gray-900 text-white font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
             <LayoutDashboard size={20} />
             DASHBOARD
          </button>
          <button 
            onClick={() => router.push('/dashboard/campaigns/new')}
            className="py-4 px-6 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
             START CAMPAIGN
             <ArrowRight size={20} />
          </button>
       </div>
    </div>
  )
}

export default function StoreSuccessPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <Suspense fallback={<Loader2 className="animate-spin text-brand" size={40} />}>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
