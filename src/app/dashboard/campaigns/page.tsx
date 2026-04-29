'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar,
  Coins,
  ArrowRight,
  Loader2,
  Video,
  ClipboardList,
  Send,
  Gamepad2,
  Pause,
  Play as PlayIcon,
  RefreshCw,
  Trash2,
  Clock
} from 'lucide-react'
import Toast from '@/components/Toast'
import AnalyticsModal from '@/components/AnalyticsModal'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [selectedAnalytics, setSelectedAnalytics] = useState<any>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const success = searchParams.get('success')
    if (success) {
      if (success === 'survey_created') setToastMessage('Survey created successfully!')
      if (success === 'created') setToastMessage('Campaign launched successfully!')
      if (success === 'status_created') setToastMessage('Status update posted!')
      setShowToast(true)
      
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('success')
      router.replace(`/dashboard/campaigns${newParams.toString() ? `?${newParams.toString()}` : ''}`)
    }
    
    fetchCampaigns()
  }, [searchParams])

  const fetchCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [statusPostsRes, gamesRes] = await Promise.all([
        supabase
          .from('status_posts')
          .select(`
            *,
            surveys (id),
            challenges (id)
          `)
          .eq('brand_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('game_campaigns')
          .select('*')
          .eq('brand_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
      ])

      const all = [
        ...(statusPostsRes.data || []).map(sp => ({
          ...sp,
          type: sp.type === 'challenge' ? 'Challenge' : sp.type === 'survey' ? 'Survey' : 'Status',
          childId: sp.type === 'survey' ? sp.surveys?.[0]?.id : sp.type === 'challenge' ? sp.challenges?.[0]?.id : sp.id,
          reward: sp.reward_amount,
          expires: sp.expires_at
        })),
        ...(gamesRes.data || []).map(g => ({ 
          ...g, 
          type: 'Game', 
          title: g.campaign_name, 
          reward: g.coin_per_trigger, 
          expires: new Date(new Date(g.created_at).getTime() + (g.duration_hours * 60 * 60 * 1000)).toISOString() 
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setCampaigns(all)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
      
      <AnalyticsModal 
        isOpen={!!selectedAnalytics} 
        onClose={() => setSelectedAnalytics(null)} 
        campaign={selectedAnalytics} 
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">Campaign Manager</h1>
        <Link 
          href="/dashboard/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white text-sm font-bold rounded-xl shadow-lg shadow-brand/20 hover:opacity-90 transition-all"
        >
          <Plus size={18} /> Launch New
        </Link>
      </header>

      <div className="p-8 max-w-7xl mx-auto space-y-8 w-full">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Your Campaigns</h2>
          <p className="text-gray-500 mt-1">Manage and track your active marketing efforts.</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand" size={40} /></div>
          ) : campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <CampaignRow 
                key={campaign.id} 
                campaign={campaign} 
                onUpdate={() => fetchCampaigns()} 
                onToast={(msg) => { setToastMessage(msg); setShowToast(true) }}
                onViewAnalytics={(c) => setSelectedAnalytics(c)}
              />
            ))
          ) : (
            <div className="glass-card rounded-[2rem] p-20 text-center">
              <div className="h-20 w-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6"><Megaphone className="text-gray-400" size={32} /></div>
              <h3 className="text-xl font-bold text-gray-900">No campaigns found</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">Start reaching influencers by launching your first challenge or survey.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CampaignRow({ campaign, onUpdate, onToast, onViewAnalytics }: { campaign: any, onUpdate: () => void, onToast: (msg: string) => void, onViewAnalytics: (c: any) => void }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isExpired = campaign.expires ? new Date(campaign.expires) < new Date() : false
  const isActive = campaign.is_active || campaign.status === 'active'
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleStatus = async () => {
    try {
      if (campaign.type === 'Game') {
        await supabase.from('game_campaigns').update({ status: isActive ? 'paused' : 'active' }).eq('id', campaign.id)
      } else {
        await supabase.from('status_posts').update({ is_active: !isActive }).eq('id', campaign.id)
      }
      onToast(`Campaign ${isActive ? 'paused' : 'activated'} successfully!`)
      onUpdate()
    } catch (err) {
      console.error(err)
    } finally {
      setShowMenu(false)
    }
  }

  const deleteCampaign = async () => {
    if (!confirm('Are you sure you want to delete this campaign? This will release any remaining funds back to your wallet.')) return
    
    try {
      let res;
      if (campaign.type === 'Game') {
        const { data: { user } } = await supabase.auth.getUser()
        res = await supabase.rpc('delete_game_campaign_with_refund', { p_campaign_id: campaign.id, p_brand_id: user?.id })
      } else if (campaign.type === 'Challenge') {
        res = await supabase.rpc('delete_challenge_release_escrow', { p_challenge_id: campaign.childId })
      } else {
        res = await supabase.rpc('delete_status_post_release_escrow', { p_status_id: campaign.id })
      }

      if (res.error) throw res.error
      onToast(res.data?.message || 'Campaign deleted successfully.')
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setShowMenu(false)
    }
  }

  const extendCampaign = async (hours: number) => {
    try {
      let res;
      if (campaign.type === 'Game') {
        res = await supabase.rpc('refresh_game_campaign', { p_campaign_id: campaign.id, p_extension_hours: hours })
      } else {
        res = await supabase.rpc('extend_status_post_expiration', { p_status_post_id: campaign.id })
      }

      if (res.error) throw res.error
      onToast('Campaign duration extended!')
      onUpdate()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setShowMenu(false)
    }
  }
  
  const getIcon = () => {
    switch(campaign.type) {
      case 'Challenge': return <Video size={20} />
      case 'Survey': return <ClipboardList size={20} />
      case 'Status': return <Send size={20} />
      case 'Game': return <Gamepad2 size={20} />
      default: return <Megaphone size={20} />
    }
  }

  const getColor = () => {
    switch(campaign.type) {
      case 'Challenge': return 'bg-brand/10 text-brand'
      case 'Survey': return 'bg-blue-100 text-blue-600'
      case 'Status': return 'bg-green-100 text-green-600'
      case 'Game': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className={`glass-card rounded-3xl p-6 transition-all group border-transparent relative ${showMenu ? 'z-50 shadow-2xl' : 'z-10 hover:z-20'}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex gap-5">
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${getColor()}`}>
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-brand transition-colors">{campaign.title || 'Untitled Campaign'}</h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${getColor()}`}>{campaign.type}</span>
            </div>
            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{campaign.description || 'Active Campaign'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12 flex-shrink-0">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isExpired ? 'bg-gray-400' : isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className="text-sm font-bold text-gray-700">{isExpired ? 'Completed' : isActive ? 'Active' : 'Paused'}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rewards</p>
            <div className="flex items-center gap-1">
              <Coins size={14} className="text-brand" />
              <span className="text-sm font-black text-gray-900">{campaign.reward || '0'}</span>
            </div>
          </div>

          <div className="hidden md:block space-y-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ends On</p>
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={14} />
              <span className="text-sm font-bold">{campaign.expires ? new Date(campaign.expires).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {campaign.type === 'Survey' && (
            <Link href={`/dashboard/campaigns/survey/${campaign.childId}`} className="flex-1 lg:flex-none px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all text-xs">
              View Results
            </Link>
          )}
          {campaign.type === 'Challenge' && (
            <Link href={`/dashboard/submissions?challenge_id=${campaign.childId}`} className="flex-1 lg:flex-none px-6 py-2.5 brand-gradient text-white font-bold rounded-xl shadow-lg shadow-brand/20 transition-all text-xs">
              Review Videos
            </Link>
          )}
          {campaign.type === 'Game' && (
            <button 
              onClick={() => onViewAnalytics(campaign)}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all text-xs"
            >
              Game Stats
            </button>
          )}
          {campaign.type === 'Status' && (
            <button 
              onClick={() => onViewAnalytics(campaign)}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 transition-all text-xs"
            >
              Post Insights
            </button>
          )}
          
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 z-[100] py-2 animate-in fade-in zoom-in-95 duration-200">
                 <button onClick={toggleStatus} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    {isActive ? <><Pause size={18} className="text-yellow-500" /> Pause Campaign</> : <><PlayIcon size={18} className="text-green-500" /> Activate Campaign</>}
                 </button>
                 <button onClick={() => extendCampaign(24)} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                    <RefreshCw size={18} className="text-blue-500" /> Extend 24 Hours
                 </button>
                 <div className="my-2 border-t border-gray-100" />
                 <button onClick={deleteCampaign} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                    <Trash2 size={18} /> End & Delete
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
