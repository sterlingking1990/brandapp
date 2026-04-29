'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Coins, 
  CheckCircle2, 
  CreditCard, 
  Loader2, 
  ArrowLeft,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Globe,
  Wallet
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Toast from '@/components/Toast'

export default function StorePage() {
  const [packages, setPackages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState(1650)
  
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Fetch Packages
      const { data: pkgData } = await supabase
        .from('coin_packages')
        .select('*')
        .eq('is_active', true)
        .order('price_usd', { ascending: true })
      setPackages(pkgData || [])

      // Fetch Exchange Rate
      const { data: rateData } = await supabase.functions.invoke('get-exchange-rate')
      if (rateData?.rate) {
        setExchangeRate(rateData.rate)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (pkg: any) => {
    if (!profile) return
    setPurchasingId(pkg.id)
    try {
      const nairaAmount = pkg.price_usd * exchangeRate
      const koboAmount = Math.round(nairaAmount * 100)

      const { data, error } = await supabase.functions.invoke('create-paystack-payment', {
        body: {
          amount: koboAmount,
          email: profile.email,
          user_id: profile.id,
          package_id: pkg.id,
          platform: 'web',
          customer_name: profile.full_name || profile.username || 'Brand',
          package_name: pkg.name,
          callback_url: `${window.location.origin}/dashboard/store/success`
        },
      })

      if (error) throw error

      if (data?.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url
      } else {
        throw new Error('Failed to initialize payment')
      }

    } catch (err: any) {
      alert(err.message)
      setPurchasingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-500 font-bold uppercase tracking-widest mt-4 text-[10px]">Opening Store...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Coins className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Buy Coins</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-brand/5 px-4 py-1.5 rounded-full border border-brand/10">
              <span className="text-[10px] font-black text-brand uppercase tracking-widest">Current Balance:</span>
              <span className="text-sm font-black text-brand">{profile?.brandible_coins?.toLocaleString() || 0} BC</span>
           </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="max-w-2xl">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Top Up Your Wallet</h2>
              <p className="text-gray-500 mt-2 text-lg font-medium">Get Brandible Coins to launch campaigns, target hubs and boost your visibility.</p>
           </div>
           
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
              <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <ShieldCheck size={32} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Secure Payments</p>
                 <p className="text-sm font-bold text-gray-900">Powered by Paystack</p>
              </div>
           </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <StoreInfoCard 
             icon={<Zap className="text-brand" />}
             title="Instant Credit"
             desc="Coins are added to your balance immediately after payment."
           />
           <StoreInfoCard 
             icon={<TrendingUp className="text-blue-600" />}
             title="Better Value"
             desc="Higher packages include significant bonus coins."
           />
           <StoreInfoCard 
             icon={<Globe className="text-orange-600" />}
             title="Nigerian Gateway"
             desc="Pay easily with Naira cards, Bank Transfer or USSD."
           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {packages.map((pkg) => (
             <PackageCard 
               key={pkg.id} 
               pkg={pkg} 
               exchangeRate={exchangeRate}
               isPurchasing={purchasingId === pkg.id}
               onPurchase={() => handlePurchase(pkg)}
             />
           ))}
        </div>

        {/* Terms Note */}
        <div className="bg-gray-100/50 p-8 rounded-[2rem] border border-dashed border-gray-200 text-center max-w-3xl mx-auto">
           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-2">Notice</p>
           <p className="text-sm text-gray-500 leading-relaxed">
             Purchased coins are non-refundable and can only be used within the Brandible ecosystem for campaigns and promotions. 
             Exchange rate used: <span className="text-gray-900 font-black">₦{exchangeRate.toLocaleString()} / $1</span>
           </p>
        </div>
      </main>
    </div>
  )
}

function StoreInfoCard({ icon, title, desc }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex gap-4">
       <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0">
          {icon}
       </div>
       <div>
          <h4 className="font-bold text-gray-900 text-sm">{title}</h4>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
       </div>
    </div>
  )
}

function PackageCard({ pkg, exchangeRate, isPurchasing, onPurchase }: any) {
  const nairaPrice = pkg.price_usd * exchangeRate
  const totalCoins = pkg.coin_amount + (pkg.bonus_coins || 0)
  
  return (
    <div className="glass-card bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all flex flex-col group">
       <div className="flex justify-between items-start mb-8">
          <div className="h-14 w-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <Coins size={32} />
          </div>
          {pkg.bonus_coins > 0 && (
             <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                +{Math.round((pkg.bonus_coins/pkg.coin_amount)*100)}% Bonus
             </div>
          )}
       </div>

       <div className="flex-1 space-y-1">
          <h3 className="text-xl font-black text-gray-900">{pkg.name}</h3>
          <div className="flex items-baseline gap-2">
             <span className="text-4xl font-black text-gray-900">{totalCoins.toLocaleString()}</span>
             <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">BC</span>
          </div>
          {pkg.bonus_coins > 0 && (
            <p className="text-xs text-emerald-600 font-bold">Includes {pkg.bonus_coins.toLocaleString()} bonus coins</p>
          )}
       </div>

       <div className="mt-10 space-y-4">
          <div className="flex items-center justify-between py-4 border-y border-gray-50">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Price</span>
             <span className="text-lg font-black text-gray-900">₦{nairaPrice.toLocaleString()}</span>
          </div>
          
          <button 
            onClick={onPurchase}
            disabled={isPurchasing}
            className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
             {isPurchasing ? <Loader2 className="animate-spin" size={20} /> : (
               <>
                  <CreditCard size={20} />
                  BUY NOW
               </>
             )}
          </button>
          <p className="text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{pkg.price_usd} USD</p>
       </div>
    </div>
  )
}
