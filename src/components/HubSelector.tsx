'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Search, Users, Check, Loader2, X, Globe, Coins } from 'lucide-react'

interface Hub {
  id: string
  name: string
  industry: string
  memberCount: number
  wall_posting_fee?: number
  owner_name?: string
}

interface HubSelectorProps {
  selectedHubIds: string[]
  onHubsSelected: (hubIds: string[]) => void
  onReachCalculated?: (totalReach: number, totalFee?: number, hubsData?: Record<string, Hub>) => void
  showFees?: boolean
}

export default function HubSelector({ selectedHubIds, onHubsSelected, onReachCalculated, showFees }: HubSelectorProps) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Hub[]>([])
  const [allHubsData, setAllHubsData] = useState<Record<string, Hub>>({})
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchMissingHubs = async () => {
      const missingIds = selectedHubIds.filter(id => !allHubsData[id])
      if (missingIds.length === 0) return
      try {
        const { data } = await supabase
          .from('hubs')
          .select('id, name, industry, wall_posting_fee, profiles:owner_id(full_name)')
          .in('id', missingIds)
        if (data) {
          const hubsWithCounts = await Promise.all(data.map(async (hub) => {
            const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id)
            return { ...hub, memberCount: count || 0, owner_name: (hub.profiles as any)?.full_name } as Hub
          }))
          const newCache = { ...allHubsData }
          hubsWithCounts.forEach(h => { newCache[h.id] = h })
          setAllHubsData(newCache)
        }
      } catch (err) { console.error(err) }
    }
    fetchMissingHubs()
  }, [selectedHubIds])

  useEffect(() => {
    if (onReachCalculated) {
      const reach = selectedHubIds.reduce((sum, id) => sum + (allHubsData[id]?.memberCount || 0), 0)
      const fee = selectedHubIds.reduce((sum, id) => sum + (allHubsData[id]?.wall_posting_fee || 0), 0)
      onReachCalculated(reach, fee, allHubsData)
    }
  }, [selectedHubIds, allHubsData])

  const searchHubs = async (val: string) => {
    setQuery(val)
    if (!val.trim()) { setSearchResults([]); return }
    setLoading(true)
    try {
      const { data } = await supabase
        .from('hubs')
        .select('id, name, industry, wall_posting_fee, profiles:owner_id(full_name)')
        .ilike('name', `%${val}%`)
        .limit(8)

      const hubsWithCounts = await Promise.all((data || []).map(async (hub) => {
        const { count } = await supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id)
        return { ...hub, memberCount: count || 0, owner_name: (hub.profiles as any)?.full_name } as Hub
      }))

      const newCache = { ...allHubsData }
      hubsWithCounts.forEach(h => { newCache[h.id] = h })
      setAllHubsData(newCache)
      setSearchResults(hubsWithCounts)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const toggleHub = (id: string) => {
    const newSelection = selectedHubIds.includes(id)
      ? selectedHubIds.filter(h => h !== id)
      : [...selectedHubIds, id]
    onHubsSelected(newSelection)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => searchHubs(e.target.value)}
          placeholder="Search communities by name or industry..."
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-brand" size={18} />}
      </div>

      {searchResults.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          {searchResults.map((hub) => (
            <button
              key={hub.id}
              onClick={() => toggleHub(hub.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b last:border-none border-gray-50"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                  {hub.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{hub.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Users size={12} /> {hub.memberCount} members • {hub.industry}
                  </p>
                  {showFees && hub.wall_posting_fee ? (
                    <p className="text-[10px] text-brand font-bold flex items-center gap-1 mt-0.5">
                      <Coins size={10} /> {hub.wall_posting_fee} coins to target
                    </p>
                  ) : showFees ? (
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Free to target</p>
                  ) : null}
                </div>
              </div>
              <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-all ${
                selectedHubIds.includes(hub.id) ? 'bg-brand border-brand text-white' : 'border-gray-200'
              }`}>
                {selectedHubIds.includes(hub.id) && <Check size={14} />}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedHubIds.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Selected Communities</p>
          <div className="flex flex-wrap gap-2">
            {selectedHubIds.map((id) => (
              <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-brand/5 text-brand rounded-xl text-xs font-bold border border-brand/10 animate-in zoom-in duration-200">
                <Globe size={12} />
                <span>{allHubsData[id]?.name || 'Hub'}</span>
                {showFees && allHubsData[id]?.wall_posting_fee ? (
                  <span className="text-[9px] opacity-70">{allHubsData[id].wall_posting_fee}c</span>
                ) : null}
                <button onClick={() => toggleHub(id)} className="hover:text-brand/70"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
