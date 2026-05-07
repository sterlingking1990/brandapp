import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { 
  BarChart3, 
  Coins, 
  Megaphone, 
  ShoppingBag, 
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Gamepad2,
  ClipboardList,
  Video,
  Send,
  Zap,
  ChevronRight,
  Globe,
  Youtube,
  Facebook
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile and brand data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Fetch Stats data matching mobile app logic (uses user.id as brand_id in posts/games)
  const [postsRes, gameRes] = await Promise.all([
    supabase
      .from('status_posts')
      .select('title, type, view_count, participation_count, reward_amount, current_rewards_given, reward_limit, is_active, expires_at')
      .eq('brand_id', user.id)
      .eq('is_deleted', false),
    supabase
      .from('game_campaigns')
      .select('campaign_name, total_interactions, successful_interactions, total_budget, spent_amount, status, expires_at')
      .eq('brand_id', user.id)
      .eq('is_deleted', false)
  ])

  const postsData = postsRes.data || []
  const gameData = gameRes.data || []

  // Calculate Stats Exactly like mobile (HomeScreen.js)
  const totalViews = 
    postsData.reduce((sum, post) => sum + (post.view_count || 0), 0) +
    gameData.reduce((sum, gc) => sum + (gc.total_interactions || 0), 0)

  const totalParticipations = 
    postsData.reduce((sum, post) => sum + (post.type === 'status_view' ? (post.view_count || 0) : (post.participation_count || 0)), 0) +
    gameData.reduce((sum, gc) => sum + (gc.successful_interactions || 0), 0)

  // Channel Breakdown for Visualization
  const hubReach = totalViews // For now hubs are primary organic source
  const { data: ytAds } = await supabase.from('youtube_ads').select('metrics').eq('brand_id', user.id)
  const { data: fbAds } = await supabase.from('facebook_ads').select('total_reach').eq('brand_id', user.id)
  
  const ytReach = (ytAds || []).reduce((s, a) => s + (parseFloat(a.metrics?.views || 0)), 0)
  const fbReach = (fbAds || []).reduce((s, a) => s + (parseFloat(a.total_reach || 0)), 0)
  const grandTotalReach = hubReach + ytReach + fbReach || 1

  // Top Campaigns for Budget Efficiency
  const topCampaigns = [
    ...postsData.map(p => ({ name: p.title, spent: (p.reward_amount || 0) * (p.current_rewards_given || 0), budget: (p.reward_amount || 0) * (p.reward_limit || 100), type: 'Status' })),
    ...gameData.map(g => ({ name: g.campaign_name, spent: g.spent_amount || 0, budget: g.total_budget || 0, type: 'Game' }))
  ].sort((a, b) => b.budget - a.budget).slice(0, 3)

  const activeCampaignsCount = 
    postsData.filter(post => post.is_active && new Date(post.expires_at!) > new Date()).length +
    gameData.filter(gc => gc.status === 'active' && new Date(gc.expires_at!) > new Date()).length

  const totalSpentCalculated = 
    postsData.reduce((sum, post) => sum + ((post.reward_amount || 0) * (post.current_rewards_given || 0)), 0) +
    gameData.reduce((sum, gc) => sum + (gc.spent_amount || 0), 0)

  // Fetch Recent Submissions (Challenges + Unboxings)
  const [{ data: challengeSubs }, { data: unboxSubs }] = await Promise.all([
    supabase
      .from('challenge_submissions')
      .select('id, submitted_at, profiles:participant_id(full_name, username), challenges!inner(status_posts!inner(brand_id))')
      .eq('challenges.status_posts.brand_id', profile?.id)
      .order('submitted_at', { ascending: false })
      .limit(3),
    supabase
      .from('unboxed_submissions')
      .select('id, created_at, profiles:influencer_id(full_name, username)')
      .eq('brand_id', brand?.id)
      .order('created_at', { ascending: false })
      .limit(3)
  ])

  // Combine and sort recent submissions
  const allRecentSubmissions = [
    ...(challengeSubs || []).map(s => ({ ...s, created_at: s.submitted_at, type: 'Challenge Entry' })),
    ...(unboxSubs || []).map(s => ({ ...s, type: 'Unboxing Video' }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .slice(0, 4)

  // Formatting helper
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <>
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Overview</h1>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-brand/10 px-3 py-1.5 rounded-full border border-brand/10">
            <Coins className="text-brand" size={18} />
            <span className="text-brand font-bold text-sm">
              {profile?.brandible_coins !== undefined && profile?.brandible_coins !== null 
                ? Number(profile.brandible_coins).toLocaleString() 
                : '0.00'}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
             ) : (
               <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 font-bold">
                 {profile?.username?.charAt(0).toUpperCase() || 'B'}
               </div>
             )}
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back, {brand?.company_name || profile?.username}!</h2>
            <p className="text-gray-500 font-medium mt-1">Here's what's happening with your brand today.</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/5 text-brand border border-brand/10">
            {brand?.verification_status === 'verified' ? (
              <>
                <CheckCircle2 size={18} />
                <span className="text-sm font-bold">{brand?.is_agency ? 'Verified Agency' : 'Verified Brand'}</span>
              </>
            ) : (
              <>
                <Clock size={18} />
                <span className="text-sm font-bold">Verification Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Create Campaign</h3>
            <Link href="/dashboard/campaigns" className="text-xs font-bold text-brand hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <QuickActionCard 
              icon={<Send size={24} />}
              title="Status"
              subtitle="Brand awareness"
              color="bg-blue-600"
              href="/dashboard/campaigns/new/status"
            />
            <QuickActionCard 
              icon={<Video size={24} />}
              title="Challenge"
              subtitle="User content"
              color="bg-emerald-600"
              href="/dashboard/campaigns/new/challenge"
            />
            <QuickActionCard 
              icon={<Gamepad2 size={24} />}
              title="Game"
              subtitle="In-game ads"
              color="bg-purple-600"
              href="/dashboard/campaigns/new/game"
            />
            <QuickActionCard 
              icon={<ClipboardList size={24} />}
              title="Survey"
              subtitle="Get insights"
              color="bg-orange-500"
              href="/dashboard/campaigns/new/survey"
            />
            <QuickActionCard 
              icon={<Zap size={24} />}
              title="Affiliate"
              subtitle="Performance deals"
              color="bg-brand"
              href="/dashboard/unbox"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Total Reach" 
            value={formatNumber(totalViews)} 
            change="Total views"
            icon={<BarChart3 className="text-blue-500" />}
          />
          <StatCard 
            label="Engagements" 
            value={formatNumber(totalParticipations)} 
            change="User actions"
            icon={<Users className="text-orange-500" />}
          />
          <StatCard 
            label="Active Campaigns" 
            value={activeCampaignsCount} 
            change="Live now"
            icon={<Megaphone className="text-brand" />}
          />
          <StatCard 
            label="Total Spent" 
            value={`BC ${totalSpentCalculated.toLocaleString()}`} 
            change="Accumulated"
            icon={<ShoppingBag className="text-purple-500" />}
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-[2rem] p-8 bg-white border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div>
                   <h3 className="text-xl font-bold text-gray-900">Campaign Performance</h3>
                   <p className="text-xs text-gray-400 font-medium mt-1 uppercase tracking-widest">Reach & Efficiency</p>
                </div>
                <Link href="/dashboard/analytics" className="px-4 py-2 bg-brand/5 text-brand rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/10 transition-all">Full Analytics</Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 {/* Growth Distribution */}
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Growth Distribution</p>
                    <div className="space-y-5">
                       <GrowthBar 
                         label="Hubs (Organic)" 
                         percentage={Math.round((hubReach / grandTotalReach) * 100)} 
                         color="bg-brand" 
                         icon={<Globe size={14} />} 
                       />
                       <GrowthBar 
                         label="YouTube Ads" 
                         percentage={Math.round((ytReach / grandTotalReach) * 100)} 
                         color="bg-red-500" 
                         icon={<Youtube size={14} />} 
                       />
                       <GrowthBar 
                         label="Facebook Ads" 
                         percentage={Math.round((fbReach / grandTotalReach) * 100)} 
                         color="bg-blue-600" 
                         icon={<Facebook size={14} />} 
                       />
                    </div>
                 </div>

                 {/* Budget Efficiency */}
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Budget Utilization</p>
                    <div className="space-y-6">
                       {topCampaigns.length > 0 ? topCampaigns.map((camp, i) => (
                         <div key={i} className="space-y-2">
                            <div className="flex justify-between items-end">
                               <p className="text-xs font-bold text-gray-700 truncate max-w-[150px]">{camp.name}</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase">{Math.round((camp.spent / (camp.budget || 1)) * 100)}% Used</p>
                            </div>
                            <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                               <div 
                                 className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                                 style={{ width: `${Math.min(100, (camp.spent / (camp.budget || 1)) * 100)}%` }} 
                               />
                            </div>
                         </div>
                       )) : (
                         <div className="py-10 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No active budgets</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="glass-card rounded-[2rem] p-8 bg-white border border-gray-100 shadow-sm flex flex-col h-full">
              <h3 className="text-xl font-bold mb-6">Recent Submissions</h3>
              <div className="space-y-4 flex-1">
                {allRecentSubmissions.length > 0 ? allRecentSubmissions.map((sub: any) => (
                  <Link key={sub.id} href={sub.type === 'Unboxing Video' ? `/dashboard/unbox` : `/dashboard/submissions`} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${sub.type === 'Unboxing Video' ? 'bg-orange-50 text-orange-600' : 'bg-brand/10 text-brand'}`}>
                       {sub.type === 'Unboxing Video' ? <ShoppingBag size={20} /> : <Video size={20} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">{sub.profiles?.full_name}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{sub.type}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-brand" />
                  </Link>
                )) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                     <Clock size={32} className="mb-2" />
                     <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">No submissions<br/>recorded yet</p>
                  </div>
                )}
              </div>
              
              {allRecentSubmissions.length > 0 && (
                <Link 
                  href="/dashboard/submissions"
                  className="mt-6 w-full py-3 bg-gray-50 rounded-xl text-center text-xs font-black text-gray-400 hover:text-brand hover:bg-brand/5 transition-all uppercase tracking-widest"
                >
                  View All Submissions
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function QuickActionCard({ icon, title, subtitle, color, href }: any) {
  return (
    <Link 
      href={href}
      className="glass-card rounded-[2rem] p-6 bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-brand/5 hover:border-brand/30 transition-all group text-center"
    >
      <div className={`h-14 w-14 ${color} rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-black/10 group-hover:scale-110 transition-transform mb-4`}>
        {icon}
      </div>
      <h4 className="font-bold text-gray-900 group-hover:text-brand transition-colors">{title}</h4>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mt-1">{subtitle}</p>
    </Link>
  )
}

function StatCard({ label, value, change, icon }: { label: string, value: string | number, change: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[2rem] p-8 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-gray-50 rounded-2xl">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-3xl font-black text-gray-900 mt-2">{value}</h4>
        <div className="flex items-center gap-1.5 mt-2">
           <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
           <p className="text-xs text-green-600 font-bold">{change}</p>
        </div>
      </div>
    </div>
  )
}

function GrowthBar({ label, percentage, color, icon }: { label: string, percentage: number, color: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-[10px] font-bold">
          <div className="flex items-center gap-2 text-gray-600">
             <div className={`p-1.5 rounded-lg ${color} text-white`}>
                {icon}
             </div>
             <span className="uppercase tracking-widest">{label}</span>
          </div>
          <span className="text-gray-900">{percentage}%</span>
       </div>
       <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
          <div 
            className={`h-full ${color} rounded-full transition-all duration-1000`} 
            style={{ width: `${percentage}%` }} 
          />
       </div>
    </div>
  )
}
