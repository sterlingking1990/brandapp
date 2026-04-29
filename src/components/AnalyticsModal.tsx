'use client'

import { X, BarChart3, Users, MousePointer2, Eye, Zap, Coins, TrendingUp, Share2 } from 'lucide-react'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: any
}

export default function AnalyticsModal({ isOpen, onClose, campaign }: AnalyticsModalProps) {
  if (!isOpen || !campaign) return null

  const isGame = campaign.type === 'Game'
  const isStatus = campaign.type === 'Status'
  
  // Calculate spend progress
  let spent = 0
  let total = 1
  
  if (isGame) {
    spent = parseFloat(campaign.spent_amount || 0)
    // Use total_budget (generated col) or fallback to reserved_funds
    total = parseFloat(campaign.total_budget || campaign.reserved_funds || 1)
  } else {
    spent = (parseFloat(campaign.reward_amount || 0)) * (parseInt(campaign.current_rewards_given || 0))
    total = (parseFloat(campaign.reward_amount || 0)) * (parseInt(campaign.reward_limit || 1))
  }

  // Ensure total is not 0 to avoid division by zero
  if (total === 0) total = 1
  const progress = Math.min((spent / total) * 100, 100)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isGame ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                {isGame ? <Zap size={24} /> : <Eye size={24} />}
             </div>
             <div>
                <h2 className="text-2xl font-bold text-gray-900">{campaign.title}</h2>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{campaign.type} Analytics</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {isStatus ? (
              <>
                <StatBox icon={<Users className="text-blue-500" />} label="Unique Views" value={campaign.view_count || 0} />
                <StatBox icon={<BarChart3 className="text-green-500" />} label="Impressions" value={campaign.impression_count || 0} />
                <StatBox icon={<TrendingUp className="text-orange-500" />} label="Rewards Given" value={campaign.current_rewards_given || 0} />
              </>
            ) : isGame ? (
              <>
                <StatBox icon={<Zap className="text-orange-500" />} label="Interactions" value={campaign.total_interactions || 0} />
                <StatBox icon={<MousePointer2 className="text-purple-500" />} label="Link Clicks" value={campaign.total_clicks || 0} />
                <StatBox icon={<Share2 className="text-blue-500" />} label="Total Shares" value={campaign.total_shares || 0} />
              </>
            ) : null}
          </div>

          {/* Spend Progress Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Coins size={18} className="text-brand" />
                   <span className="font-bold text-gray-900">Budget Utilization</span>
                </div>
                <span className="text-sm font-black text-brand">{Math.floor(spent)} / {Math.floor(total)} BC</span>
             </div>
             <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                <div 
                  className={`h-full transition-all duration-1000 ease-out rounded-full ${isGame ? 'bg-purple-500' : 'bg-green-500'}`}
                  style={{ width: `${progress}%` }}
                />
             </div>
             <p className="text-xs text-gray-400 text-center font-bold uppercase tracking-widest">
               {progress.toFixed(1)}% of campaign funds spent
             </p>
          </div>

          {/* Performance Insight Card */}
          <div className="p-6 bg-brand/5 border border-brand/10 rounded-[2rem] flex items-center gap-4">
             <div className="h-12 w-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-brand">
                <TrendingUp size={24} />
             </div>
             <div>
                <p className="text-sm font-bold text-gray-900">Real-time Performance</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Influencers are actively engaging with this {campaign.type.toLowerCase()}. Review your <span className="text-brand font-bold">ROI metrics</span> above to see how your budget is being converted into brand reach.
                </p>
             </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all shadow-sm"
           >
             Close Insights
           </button>
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 text-center space-y-2">
       <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3">
          {icon}
       </div>
       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
       <p className="text-xl font-black text-gray-900 tracking-tight">{value.toLocaleString()}</p>
    </div>
  )
}
