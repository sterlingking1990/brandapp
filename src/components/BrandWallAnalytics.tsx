'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Eye, 
  PlayCircle, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Loader2,
  ChevronRight,
  Info,
  CheckCircle2,
  BarChart3
} from 'lucide-react'

interface BrandWallAnalyticsProps {
  brandId: string
}

export default function BrandWallAnalytics({ brandId }: BrandWallAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [selectedDuration, setSelectedDuration] = useState('7days')
  const [stats, setStats] = useState({
    totalWallVisits: 0,
    totalMediaViews: 0,
    totalContactClicks: 0,
    conversionRate: 0,
  })

  const durations = [
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'Last 90 Days', value: '90days' },
    { label: 'All Time', value: 'all' },
  ]

  const supabase = createClient()

  useEffect(() => {
    if (brandId) {
      fetchAnalytics()
    }
  }, [brandId, selectedDuration])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let startDate = new Date(0)
      
      if (selectedDuration === '7days') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      else if (selectedDuration === '30days') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      else if (selectedDuration === '90days') startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      const { data, error } = await supabase
        .from('brand_wall_analytics')
        .select('*')
        .eq('brand_id', brandId)
        .gte('created_at', startDate.toISOString())

      if (error) throw error

      const wallVisits = data?.filter(i => i.event_type === 'wall_visit').length || 0
      const mediaViews = data?.filter(i => i.event_type === 'media_click').length || 0
      const contactClicks = data?.filter(i => i.event_type === 'contact_click').length || 0
      const conversionRate = mediaViews > 0 ? ((contactClicks / mediaViews) * 100) : 0

      setStats({
        totalWallVisits: wallVisits,
        totalMediaViews: mediaViews,
        totalContactClicks: contactClicks,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const avgProductsPerVisit = stats.totalWallVisits > 0 
    ? (stats.totalMediaViews / stats.totalWallVisits).toFixed(2) 
    : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
         <Loader2 className="animate-spin text-brand" size={32} />
         <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-4">Analyzing data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Duration Filter */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        {durations.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDuration(d.value)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedDuration === d.value 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard 
           icon={<Eye size={24} />}
           label="Wall Visits"
           value={stats.totalWallVisits.toLocaleString()}
           color="text-brand"
           bgColor="bg-brand/10"
           subtitle="Total page views"
         />
         <StatCard 
           icon={<PlayCircle size={24} />}
           label="Media Views"
           value={stats.totalMediaViews.toLocaleString()}
           color="text-blue-600"
           bgColor="bg-blue-50"
           subtitle="Product interactions"
         />
         <StatCard 
           icon={<MessageSquare size={24} />}
           label="Inquiries"
           value={stats.totalContactClicks.toLocaleString()}
           color="text-emerald-600"
           bgColor="bg-emerald-50"
           subtitle="WhatsApp contact clicks"
         />
         <StatCard 
           icon={<TrendingUp size={24} />}
           label="Conversion"
           value={`${stats.conversionRate}%`}
           color="text-orange-600"
           bgColor="bg-orange-50"
           subtitle="Views to contact rate"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Insights */}
         <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
               <BarChart3 size={20} className="text-brand" />
               Performance Insights
            </h3>
            
            {stats.totalWallVisits === 0 ? (
               <div className="bg-white p-8 rounded-[2rem] border border-dashed border-gray-200 text-center">
                  <p className="text-gray-500 font-medium italic">No visits recorded in this period. Share your wall link to start gathering data!</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {stats.totalContactClicks > 0 ? (
                    <InsightItem 
                      icon={<CheckCircle2 className="text-emerald-500" />}
                      title="Strong Engagement"
                      desc={`You've generated ${stats.totalContactClicks} potential leads. High contact volume suggests your product presentation is effective.`}
                    />
                  ) : (
                    <InsightItem 
                      icon={<Info className="text-blue-500" />}
                      title="Awareness vs. Interest"
                      desc={`You're getting views (${stats.totalMediaViews}), but no inquiries yet. Try adding more clear pricing or "Exclusive Offer" captions.`}
                    />
                  )}
                  
                  <InsightItem 
                    icon={<BarChart3 className="text-brand" />}
                    title="Stickiness"
                    desc={`Visitors are engaging with ${avgProductsPerVisit} products on average per visit. This indicates good content variety.`}
                  />
               </div>
            )}
         </div>

         {/* Metric Legend */}
         <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6">
            <h4 className="font-black uppercase tracking-widest text-xs text-white/50">Glossary</h4>
            <div className="space-y-6">
               <LegendItem label="Wall Visits" desc="Every time a user opens your brand page link." />
               <LegendItem label="Media Views" desc="Every time a user clicks to view a specific photo or video." />
               <LegendItem label="Conversion" desc="Percentage of media views that resulted in a WhatsApp inquiry." />
            </div>
         </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, bgColor, subtitle }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
       <div className={`h-12 w-12 ${bgColor} ${color} rounded-2xl flex items-center justify-center mb-6`}>
          {icon}
       </div>
       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
       <h4 className="text-3xl font-black text-gray-900 mt-1">{value}</h4>
       <p className="text-xs text-gray-400 font-medium mt-1">{subtitle}</p>
    </div>
  )
}

function InsightItem({ icon, title, desc }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4">
       <div className="mt-1">{icon}</div>
       <div>
          <h4 className="font-bold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
       </div>
    </div>
  )
}

function LegendItem({ label, desc }: any) {
  return (
    <div>
       <h5 className="font-bold text-sm mb-1">{label}</h5>
       <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
    </div>
  )
}
