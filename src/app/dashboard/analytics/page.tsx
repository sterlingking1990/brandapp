'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Coins, 
  Target, 
  Globe, 
  Zap, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Loader2,
  PlayCircle,
  MessageSquare,
  MessageCircle,
  Facebook,
  Youtube,
  Megaphone,
  MousePointer2,
  Wallet
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [brand, setBrand] = useState<any>(null)
  const [stats, setStats] = useState<any>({
    funnel: { visits: 0, clicks: 0, leads: 0 },
    channels: [],
    hubs: [],
    roi: { totalSpent: 0, totalReach: 0, costPerEng: 0 }
  })
  const [timeRange, setTimeRange] = useState('30d')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('profile_id', user.id)
        .single()
      setBrand(brandData)

      if (!brandData) return

      // 1. Fetch Funnel Data (Brand Wall)
      const { data: wallEvents } = await supabase
        .from('brand_wall_analytics')
        .select('event_type')
        .eq('brand_id', brandData.id)
      
      const visits = wallEvents?.filter(e => e.event_type === 'wall_visit').length || 0
      const clicks = wallEvents?.filter(e => e.event_type === 'media_click').length || 0
      const leads = wallEvents?.filter(e => e.event_type === 'contact_click').length || 0

      // 2. Fetch Channel Efficiency (Organic vs Paid)
      const [postsRes, gameRes, ytRes, fbRes] = await Promise.all([
        supabase.from('status_posts').select('*').eq('brand_id', user.id),
        supabase.from('game_campaigns').select('*').eq('brand_id', user.id),
        supabase.from('youtube_ads').select('*').eq('brand_id', brandData.id),
        supabase.from('facebook_ads').select('*').eq('brand_id', brandData.id)
      ])

      const organicReach = (postsRes.data || []).reduce((s, p) => s + (p.view_count || 0), 0) + 
                         (gameRes.data || []).reduce((s, g) => s + (g.total_interactions || 0), 0)
      
      const paidReach = (ytRes.data || []).reduce((s, a) => s + (parseFloat(a.metrics?.views || 0)), 0) + 
                       (fbRes.data || []).reduce((s, a) => s + (parseFloat(a.total_reach || 0)), 0)

      const organicSpent = (postsRes.data || []).reduce((s, p) => s + ((p.reward_amount || 0) * (p.current_rewards_given || 0)), 0) +
                          (gameRes.data || []).reduce((s, g) => s + (g.spent_amount || 0), 0)
      
      const paidSpent = (ytRes.data || []).reduce((s, a) => s + (parseFloat(a.total_ad_spend || 0) / 10), 0) + // Approximating 10 NGN = 1 BC
                       (fbRes.data || []).reduce((s, a) => s + (parseFloat(a.total_ad_spend || 0) / 10), 0)

      // 3. Top Hubs Data (Aggregation from unboxed submissions)
      const { data: unboxHubs } = await supabase
        .from('unboxed_submissions')
        .select('hub_id, total_sales_count, hubs(name)')
        .eq('brand_id', brandData.id)
        .eq('status', 'approved')

      const hubPerformance: any[] = []
      unboxHubs?.forEach(item => {
        const existing = hubPerformance.find(h => h.id === item.hub_id)
        const hubName = Array.isArray(item.hubs) ? item.hubs[0]?.name : (item.hubs as any)?.name
        
        if (existing) {
          existing.sales += (item.total_sales_count || 0)
        } else if (hubName) {
          hubPerformance.push({ id: item.hub_id, name: hubName, sales: item.total_sales_count || 0 })
        }
      })

      setStats({
        funnel: { visits, clicks, leads },
        roi: {
          totalSpent: organicSpent + paidSpent,
          totalReach: organicReach + paidReach,
          organicReach,
          paidReach
        },
        hubs: hubPerformance.sort((a, b) => b.sales - a.sales).slice(0, 5)
      })

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-500 font-bold uppercase tracking-widest mt-4 text-[10px]">Processing Intelligence...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-brand" size={20} />
          <h1 className="text-lg font-semibold text-gray-800">Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex bg-gray-100 p-1 rounded-xl">
              {['7d', '30d', '90d'].map(r => (
                <button 
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${timeRange === r ? 'bg-white text-brand shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {r}
                </button>
              ))}
           </div>
           <button className="h-9 w-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-brand transition-all">
              <Download size={18} />
           </button>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Market Analytics</h2>
              <p className="text-gray-500 font-medium">Real-time performance across all brandable growth channels.</p>
           </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPICard 
             label="Spend Efficiency" 
             value={`${(stats.roi.totalReach / (stats.roi.totalSpent || 1)).toFixed(1)}`} 
             sub="Views per 1 BC"
             icon={<Coins size={20} />}
             color="brand"
           />
           <KPICard 
             label="Total Influence" 
             value={(stats.roi.totalReach).toLocaleString()} 
             sub="Across all channels"
             icon={<Users size={20} />}
             color="blue"
           />
           <KPICard 
             label="Sales Generated" 
             value={stats.hubs.reduce((s: any, h: any) => s + h.sales, 0)} 
             sub="Through hub referrals"
             icon={<ShoppingBag size={20} />}
             color="emerald"
           />
           <KPICard 
             label="Engagement Lead" 
             value={stats.roi.paidReach > stats.roi.organicReach ? 'Paid Ads' : 'Hubs'} 
             sub="Top reach source"
             icon={<Target size={20} />}
             color="orange"
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Conversion Funnel */}
           <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-10">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Brand Wall Funnel</h3>
                 <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <MousePointer2 size={14} /> Interaction Flow
                 </div>
              </div>

              <div className="space-y-8">
                 <FunnelStep 
                   label="Wall Visits" 
                   value={stats.funnel.visits} 
                   percentage={100}
                   color="bg-gray-900"
                   icon={<Globe size={18} />}
                 />
                 <FunnelStep 
                   label="Media Engagement" 
                   value={stats.funnel.clicks} 
                   percentage={Math.round((stats.funnel.clicks / (stats.funnel.visits || 1)) * 100)}
                   color="bg-brand"
                   icon={<PlayCircle size={18} />}
                 />
                 <FunnelStep 
                   label="Sales Inquiries" 
                   value={stats.funnel.leads} 
                   percentage={Math.round((stats.funnel.leads / (stats.funnel.clicks || 1)) * 100)}
                   color="bg-emerald-500"
                   icon={<MessageCircle size={18} />}
                 />
              </div>

              <div className="pt-8 border-t border-gray-50 grid grid-cols-2 gap-8">
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click-Through Rate</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{((stats.funnel.clicks / (stats.funnel.visits || 1)) * 100).toFixed(1)}%</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversion to Lead</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{((stats.funnel.leads / (stats.funnel.visits || 1)) * 100).toFixed(1)}%</p>
                 </div>
              </div>
           </div>

           {/* Platform Reach Mix */}
           <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-xl shadow-brand/10">
              <div className="space-y-2">
                 <h3 className="text-lg font-bold">Reach Velocity</h3>
                 <p className="text-white/40 text-sm">Where your audience comes from</p>
              </div>

              <div className="space-y-8 py-10">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="flex items-center gap-2 text-white/60"><Globe size={14} className="text-brand" /> Hubs (Organic)</span>
                       <span>{Math.round((stats.roi.organicReach / (stats.roi.totalReach || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-brand rounded-full" style={{ width: `${(stats.roi.organicReach / (stats.roi.totalReach || 1)) * 100}%` }} />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="flex items-center gap-2 text-white/60"><Youtube size={14} className="text-red-500" /> YouTube (Paid)</span>
                       <span>{Math.round((stats.roi.paidReach / (stats.roi.totalReach || 1)) * 50)}%</span> {/* Split paid platforms logic if available */}
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-red-500 rounded-full" style={{ width: `${(stats.roi.paidReach / (stats.roi.totalReach || 1)) * 50}%` }} />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold">
                       <span className="flex items-center gap-2 text-white/60"><Facebook size={14} className="text-blue-500" /> Facebook (Paid)</span>
                       <span>{Math.round((stats.roi.paidReach / (stats.roi.totalReach || 1)) * 50)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.roi.paidReach / (stats.roi.totalReach || 1)) * 50}%` }} />
                    </div>
                 </div>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                 <p className="text-xs text-white/60 leading-relaxed italic">
                    "Hubs are currently delivering {(stats.roi.organicReach / (stats.roi.totalReach || 1) * 100).toFixed(0)}% of your reach. Increasing Video Challenges could boost organic conversion."
                 </p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
           {/* Top Hubs Breakdown */}
           <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Target size={20} className="text-brand" /> Top Performing Hubs
              </h3>
              
              <div className="space-y-4">
                 {stats.hubs.length > 0 ? stats.hubs.map((hub: any, i: number) => (
                   <div key={hub.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-brand/30 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center font-black text-brand border border-gray-100 shadow-sm">
                            {i + 1}
                         </div>
                         <div>
                            <p className="font-bold text-gray-900">{hub.name}</p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Referral Channel</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-lg font-black text-gray-900">{hub.sales}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase">Total Sales</p>
                      </div>
                   </div>
                 )) : (
                   <div className="py-20 text-center text-gray-400 opacity-40">
                      <Zap size={40} className="mx-auto mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">No hub sales recorded</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Financial ROI */}
           <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                 <Wallet size={20} className="text-emerald-600" /> Investment ROI
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                 <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Effective CPM</p>
                    <p className="text-3xl font-black text-gray-900 mt-2">₦{(stats.roi.totalSpent * 10 / (stats.roi.totalReach / 1000 || 1)).toFixed(0)}</p>
                    <p className="text-[10px] text-emerald-600/60 font-bold mt-1">Cost per 1k views</p>
                 </div>
                 <div className="bg-brand/5 p-6 rounded-[2rem] border border-brand/10">
                    <p className="text-[10px] font-black text-brand uppercase tracking-widest">Engagement CPE</p>
                    <p className="text-3xl font-black text-gray-900 mt-2">{(stats.roi.totalSpent / (stats.roi.totalReach / 10 || 1)).toFixed(2)} BC</p>
                    <p className="text-[10px] text-brand/60 font-bold mt-1">Cost per participation</p>
                 </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-brand border border-gray-100 shadow-sm">
                       <TrendingUp size={24} />
                    </div>
                    <div>
                       <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Growth Forecast</p>
                       <p className="text-sm text-gray-500 font-medium">Predicted reach for next 1k BC</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-xl font-black text-gray-900">+{Math.round((stats.roi.totalReach / (stats.roi.totalSpent || 1)) * 1000).toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600 font-black uppercase">Views Est.</p>
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  )
}

function KPICard({ label, value, sub, icon, color }: any) {
  const colors: any = {
    brand: 'bg-brand/10 text-brand border-brand/20',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  }
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
       <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 ${colors[color]}`}>
          {icon}
       </div>
       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
       <h4 className="text-3xl font-black text-gray-900 mt-1">{value}</h4>
       <p className="text-xs text-gray-400 font-medium mt-1">{sub}</p>
    </div>
  )
}

function FunnelStep({ label, value, percentage, color, icon }: any) {
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-end">
          <div className="flex items-center gap-3">
             <div className={`h-9 w-9 ${color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
                {icon}
             </div>
             <div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{value.toLocaleString()} Total</p>
             </div>
          </div>
          <div className="text-right">
             <p className="text-sm font-black text-gray-900">{percentage}%</p>
             <p className="text-[9px] text-gray-400 font-bold uppercase">Conversion</p>
          </div>
       </div>
       <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
       </div>
    </div>
  )
}
