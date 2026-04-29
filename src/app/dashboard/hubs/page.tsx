'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Users, 
  Search, 
  Filter, 
  Globe, 
  ChevronRight, 
  Loader2,
  TrendingUp,
  Tag,
  ShieldCheck,
  Megaphone,
  BarChart3,
  MapPin,
  PlayCircle,
  X,
  Send,
  ClipboardList,
  Gamepad2,
  Trophy,
  ArrowRight,
  Star
} from 'lucide-react'
import Link from 'next/navigation'
import { useRouter } from 'next/navigation'

export default function HubsPage() {
  const [hubs, setHubs] = useState<any[]>([])
  const [unboxedByHub, setUnboxedByHub] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('All')
  const [selectedHubForTargeting, setSelectedHubForTargeting] = useState<any>(null)
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null

  useEffect(() => {
    fetchHubs()
    if (searchParams?.get('success') === 'promo_requested') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [])

  const fetchHubs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_hubs_leaderboard')

      if (error) throw error

      setHubs(data || [])
      
      if (data && data.length > 0) {
        fetchUnboxedSubmissions(data.map((h: any) => h.id))
      }
    } catch (err) {
      console.error('Error fetching hubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnboxedSubmissions = async (hubIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('unboxed_submissions')
        .select(`
          *,
          profiles:influencer_id (full_name, username, avatar_url),
          brands:brand_id (profile_id, company_name)
        `)
        .in('hub_id', hubIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error

      const grouped: Record<string, any[]> = {}
      data?.forEach(item => {
        if (!grouped[item.hub_id]) grouped[item.hub_id] = []
        grouped[item.hub_id].push(item)
      })
      setUnboxedByHub(grouped)
    } catch (error) {
      console.error('Error fetching unboxed for hubs:', error)
    }
  }

  const industries = ['All', ...new Set(hubs.map(h => h.category || h.industry).filter(Boolean))]

  const filteredHubs = hubs.filter(hub => {
    const matchesSearch = hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hub.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hub.owner_username?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesIndustry = selectedIndustry === 'All' || (hub.category || hub.industry) === selectedIndustry
    return matchesSearch && matchesIndustry
  })

  const handleTargetHub = (hub: any) => {
    setSelectedHubForTargeting(hub)
    setIsTargetModalOpen(true)
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-500">
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm">Promotion request sent to Hub Owner!</span>
          </div>
        </div>
      )}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Globe className="text-brand" size={24} />
          <h1 className="text-lg font-semibold text-gray-800">Community Hubs</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-brand/5 px-3 py-1.5 rounded-full border border-brand/10">
              <Users size={16} className="text-brand" />
              <span className="text-xs font-bold text-brand">{hubs.length} Hubs Active</span>
           </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Hub Directory</h2>
            <p className="text-gray-500 mt-1 text-sm font-medium">Discover and target communities that resonate with your brand.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-[2rem] p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name, owner or description..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
             {industries.map(industry => (
               <button
                 key={industry}
                 onClick={() => setSelectedIndustry(industry)}
                 className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                   selectedIndustry === industry 
                   ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                   : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 {industry}
               </button>
             ))}
          </div>
        </div>

        {/* Hub Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
             <Loader2 className="animate-spin text-brand" size={40} />
             <p className="text-gray-500 font-medium animate-pulse uppercase tracking-widest text-[10px]">Scanning Communities...</p>
          </div>
        ) : filteredHubs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {filteredHubs.map(hub => (
               <HubCard 
                key={hub.id} 
                hub={hub} 
                unboxedItems={unboxedByHub[hub.id] || []}
                onTarget={() => handleTargetHub(hub)}
               />
             ))}
          </div>
        ) : (
          <div className="py-32 text-center space-y-4">
             <div className="h-20 w-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto text-gray-400">
                <Search size={32} />
             </div>
             <h3 className="text-xl font-bold text-gray-900">No hubs found</h3>
             <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
          </div>
        )}
      </main>

      {/* Target Modal */}
      {isTargetModalOpen && selectedHubForTargeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Target {selectedHubForTargeting.name}</h3>
                <p className="text-gray-500 text-sm font-medium mt-1">Select the type of campaign you want to push to this community.</p>
              </div>
              <button 
                onClick={() => setIsTargetModalOpen(false)}
                className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <TargetOption 
                icon={<Send size={24} className="text-blue-600" />}
                title="Status Campaign"
                description="Share news & announcements"
                color="bg-blue-50"
                onClick={() => {
                  router.push(`/dashboard/campaigns/new/status?preSelectedHubId=${selectedHubForTargeting.id}`)
                  setIsTargetModalOpen(false)
                }}
              />
              <TargetOption 
                icon={<Gamepad2 size={24} className="text-purple-600" />}
                title="Game Challenge"
                description="Add sponsor words to games"
                color="bg-purple-50"
                onClick={() => {
                  router.push(`/dashboard/campaigns/new/game?preSelectedHubId=${selectedHubForTargeting.id}`)
                  setIsTargetModalOpen(false)
                }}
              />
              <TargetOption 
                icon={<ClipboardList size={24} className="text-green-600" />}
                title="Market Survey"
                description="Gather demographic data"
                color="bg-green-50"
                onClick={() => {
                  router.push(`/dashboard/campaigns/new/survey?preSelectedHubId=${selectedHubForTargeting.id}`)
                  setIsTargetModalOpen(false)
                }}
              />
              <TargetOption 
                icon={<Megaphone size={24} className="text-brand" />}
                title="Video Challenge"
                description="Custom content requests"
                color="bg-brand/10"
                onClick={() => {
                  router.push(`/dashboard/campaigns/new/challenge?preSelectedHubId=${selectedHubForTargeting.id}`)
                  setIsTargetModalOpen(false)
                }}
              />
              <TargetOption 
                icon={<Star size={24} className="text-brand fill-current" />}
                title="Request Promotion"
                description="Pitch to the Hub Owner"
                color="bg-brand/5 border-2 border-brand/20"
                onClick={() => {
                  router.push(`/dashboard/campaigns/new/promotion-request?preSelectedHubId=${selectedHubForTargeting.id}`)
                  setIsTargetModalOpen(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TargetOption({ icon, title, description, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-6 rounded-3xl border border-gray-100 hover:border-brand/30 hover:bg-gray-50 transition-all text-left group"
    >
      <div className={`h-14 w-14 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 font-medium">{description}</p>
      </div>
      <ArrowRight size={18} className="text-gray-300 group-hover:text-brand transition-colors" />
    </button>
  )
}

function HubCard({ hub, unboxedItems, onTarget }: { hub: any, unboxedItems: any[], onTarget: () => void }) {
  return (
    <div className="glass-card rounded-[2.5rem] p-8 hover:border-brand/40 transition-all group flex flex-col h-full border-transparent bg-white shadow-sm hover:shadow-xl hover:shadow-brand/5">
       <div className="flex items-start justify-between mb-6">
          <div className="flex gap-4">
            <div className="h-16 w-16 rounded-3xl bg-brand/10 text-brand flex items-center justify-center font-black text-2xl group-hover:rotate-3 transition-transform">
              {hub.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-brand transition-colors">
                {hub.name}
              </h3>
              <p className="text-xs font-bold text-gray-400 uppercase mt-1">managed by @{hub.owner_username}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
               hub.state === 'public' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
             }`}>
               {hub.state}
             </span>
             {hub.category && (
               <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                 <Tag size={10} />
                 {hub.category}
               </div>
             )}
          </div>
       </div>

       <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-6">
         {hub.description || "A vibrant community of creative influencers collaborating and growing together on brandible."}
       </p>

       {hub.keywords && hub.keywords.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-6">
           {hub.keywords.slice(0, 4).map((keyword: string, i: number) => (
             <span key={i} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-500">
               {keyword}
             </span>
           ))}
         </div>
       )}

       {/* Brand Metrics */}
       <div className="grid grid-cols-3 gap-4 bg-gray-50/50 rounded-3xl p-4 mb-6 border border-gray-100/50">
          <div className="text-center">
            <p className="text-lg font-black text-gray-900">{hub.member_success_rate ? Math.round(hub.member_success_rate) : 0}%</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Success Rate</p>
          </div>
          <div className="text-center border-x border-gray-200">
            <p className="text-lg font-black text-gray-900">{hub.recent_activity_count || 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Recent Ads</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-gray-900 truncate px-1">{hub.top_locations?.[0] || 'Global'}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Top Region</p>
          </div>
       </div>

       <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <Users size={16} className="text-gray-400" />
               <span className="text-sm font-bold text-gray-700">{hub.member_count?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
               <Trophy size={16} className="text-yellow-500" />
               <span className="text-sm font-bold text-gray-700">{hub.total_earned?.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={onTarget}
            className="flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-2xl text-xs font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 active:scale-95"
          >
            <Megaphone size={14} />
            Advertise Here
          </button>
       </div>

       {/* Unboxed Carousel */}
       {unboxedItems.length > 0 && (
         <div className="mt-auto border-t border-gray-50 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Hub Store</h4>
              <span className="text-[10px] font-bold text-brand hover:underline cursor-pointer">View All</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {unboxedItems.map((item) => (
                <div key={item.id} className="min-w-[120px] h-32 rounded-2xl bg-gray-100 relative overflow-hidden group/item flex-shrink-0 border border-gray-200">
                  <img 
                    src={item.thumbnail_url || item.media_url} 
                    className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[9px] font-bold text-white truncate">{item.brands?.company_name}</p>
                  </div>
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                    {item.media_type === 'video' ? <PlayCircle size={10} className="text-white" /> : <Tag size={10} className="text-white" />}
                  </div>
                </div>
              ))}
            </div>
         </div>
       )}
    </div>
  )
}
