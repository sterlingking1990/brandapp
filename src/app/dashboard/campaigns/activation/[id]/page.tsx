'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  Users,
  CreditCard,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Pencil,
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  category: string
  campaign_mode: string
  price_kobo: number
  commission_rate: number
  platform_fee_rate: number
  max_activators: number | null
  active_activators: number
  fulfilment_type: string
  verification_status: string
  verification_report: Record<string, unknown> | null
  status: string
  total_collected_kobo: number
  total_sales_count: number
  created_at: string
}

interface Activator {
  id: string
  activator_id: string
  dva_account_number: string | null
  dva_bank_name: string | null
  dva_account_name: string | null
  dva_status: string
  total_payments_count: number
  total_commission_earned: number
  status: string
  joined_at: string
  profiles: { full_name: string; username: string; avatar_url: string | null }
}

interface Application {
  id: string
  activator_id: string
  pitch: string | null
  audience_description: string | null
  status: string
  brand_notes: string | null
  applied_at: string
  profiles: { full_name: string; username: string; avatar_url: string | null; total_activation_earnings: number; total_activations_count: number }
}

interface Payment {
  id: string
  customer_email: string
  customer_name: string | null
  amount_kobo: number
  commission_kobo: number | null
  brand_amount_kobo: number | null
  fulfilment_status: string
  status: string
  created_at: string
  profiles: { full_name: string; username: string }
}

type Tab = 'overview' | 'activators' | 'payments'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    icon: <Clock size={14} /> },
  active:    { label: 'Active',    color: 'bg-green-100 text-green-700',  icon: <Play size={14} /> },
  paused:    { label: 'Paused',    color: 'bg-amber-100 text-amber-700',  icon: <Pause size={14} /> },
  closed:    { label: 'Closed',    color: 'bg-red-100 text-red-700',      icon: <AlertTriangle size={14} /> },
}

const verificationConfig: Record<string, { label: string; color: string }> = {
  pending:            { label: 'Pending',            color: 'text-gray-500' },
  in_review:          { label: 'Under Review',       color: 'text-blue-600' },
  changes_requested:  { label: 'Changes Requested',  color: 'text-amber-600' },
  approved:           { label: 'Verified',           color: 'text-green-600' },
}

const fmt = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

export default function ActivationCampaignDashboard({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [activators, setActivators] = useState<Activator[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [expandedApp, setExpandedApp] = useState<string | null>(null)

  const justSubmitted = searchParams.get('submitted') === '1'

  useEffect(() => {
    loadData()
  }, [id])

  // Auto-poll while in_review so the page updates when the agent finishes
  useEffect(() => {
    if (!campaign || campaign.verification_status !== 'in_review') return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('activation_campaigns')
        .select('verification_status, verification_report, status')
        .eq('id', id)
        .single()
      if (data && data.verification_status !== 'in_review') {
        setCampaign(c => c ? { ...c, ...data } : c)
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [campaign?.verification_status, id])

  async function loadData() {
    setLoading(true)
    try {
      const [campRes, activatorsRes, appsRes, paymentsRes] = await Promise.all([
        supabase
          .from('activation_campaigns')
          .select('*')
          .eq('id', id)
          .single(),
        supabase
          .from('activation_campaign_activators')
          .select('*, profiles(full_name, username, avatar_url)')
          .eq('campaign_id', id)
          .order('joined_at', { ascending: false }),
        supabase
          .from('activation_applications')
          .select('*, profiles(full_name, username, avatar_url, total_activation_earnings, total_activations_count)')
          .eq('campaign_id', id)
          .order('applied_at', { ascending: false }),
        supabase
          .from('activation_payments')
          .select('*, profiles:activator_id(full_name, username)')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (campRes.data) setCampaign(campRes.data)
      if (activatorsRes.data) setActivators(activatorsRes.data as any)
      if (appsRes.data) setApplications(appsRes.data as any)
      if (paymentsRes.data) setPayments(paymentsRes.data as any)
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewApplication(appId: string, decision: 'approved' | 'rejected', brandNotes?: string) {
    setReviewingId(appId)
    try {
      const { error } = await supabase.functions.invoke('review-activation-application', {
        body: { application_id: appId, decision, brand_notes: brandNotes },
      })
      if (error) throw error
      await loadData()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setReviewingId(null)
    }
  }

  async function toggleCampaignStatus() {
    if (!campaign) return
    setStatusLoading(true)
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    await supabase.from('activation_campaigns').update({ status: newStatus }).eq('id', id)
    setCampaign({ ...campaign, status: newStatus })
    setStatusLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Campaign not found</p>
      </div>
    )
  }

  const sc = statusConfig[campaign.status] ?? statusConfig.draft
  const vc = verificationConfig[campaign.verification_status] ?? verificationConfig.pending
  const pendingApps = applications.filter(a => a.status === 'pending')

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft size={18} /> Back to Campaigns
          </button>

          {campaign.verification_status === 'in_review' && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <RefreshCw size={18} className="text-blue-600 animate-spin shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">
                  {justSubmitted ? 'Campaign Submitted for Verification' : 'Verification In Progress'}
                </p>
                <p className="text-sm text-blue-700 mt-0.5">Our AI agent is reviewing your campaign. You can leave this page — it will keep running. Come back anytime to check.</p>
                <div className="mt-3 space-y-1.5">
                  {[
                    'Checking campaign details and description',
                    'Testing your fulfilment setup',
                    'Verifying the customer experience end-to-end',
                    'Writing a verdict',
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-blue-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                      {step}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-500 mt-3">This page checks for updates automatically every 8 seconds.</p>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Zap size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.color}`}>
                    {sc.icon} {sc.label}
                  </span>
                  <span className={`text-xs font-medium ${vc.color}`}>
                    · {vc.label}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">· {campaign.campaign_mode}</span>
                </div>
              </div>
            </div>

            {campaign.verification_status === 'approved' && (
              <button
                onClick={toggleCampaignStatus}
                disabled={statusLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${campaign.status === 'active' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {statusLoading ? <Loader2 size={14} className="animate-spin" /> : campaign.status === 'active' ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
              </button>
            )}
          </div>
        </div>

        {/* Verification report — show if changes requested */}
        {campaign.verification_status === 'changes_requested' && campaign.verification_report && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <h3 className="font-bold text-amber-900">Changes Required Before Going Live</h3>
            </div>
            <p className="text-sm text-amber-800 mb-3">{(campaign.verification_report as any).summary}</p>
            {((campaign.verification_report as any).flags as string[])?.length > 0 && (
              <ul className="space-y-1 mb-4">
                {((campaign.verification_report as any).flags as string[]).map((flag: string, i: number) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span> {flag}
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => router.push(`/dashboard/campaigns/activation/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors"
            >
              <Pencil size={14} /> Edit & Resubmit
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Collected', value: fmt(campaign.total_collected_kobo), icon: <TrendingUp size={18} />, color: 'text-green-600' },
            { label: 'Total Sales', value: campaign.total_sales_count.toString(), icon: <CreditCard size={18} />, color: 'text-blue-600' },
            { label: 'Active Activators', value: campaign.active_activators.toString() + (campaign.max_activators ? `/${campaign.max_activators}` : ''), icon: <Users size={18} />, color: 'text-purple-600' },
            { label: 'Avg Commission', value: campaign.total_sales_count > 0 ? fmt(Math.floor(campaign.total_collected_kobo * (campaign.commission_rate / 100) / campaign.total_sales_count)) : '₦—', icon: <Zap size={18} />, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className={`${stat.color} mb-2`}>{stat.icon}</div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['overview', 'activators', 'payments'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
              {t === 'activators' && pendingApps.length > 0 && (
                <span className="ml-1.5 bg-brand text-white text-xs rounded-full px-1.5 py-0.5">{pendingApps.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === 'overview' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-900">Campaign Details</h3>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-gray-500">Price</dt><dd className="font-semibold text-gray-900">{fmt(campaign.price_kobo)}</dd></div>
              <div><dt className="text-gray-500">Commission rate</dt><dd className="font-semibold text-gray-900">{campaign.commission_rate}%</dd></div>
              <div><dt className="text-gray-500">Fulfilment type</dt><dd className="font-semibold text-gray-900 capitalize">{campaign.fulfilment_type.replace('_', ' ')}</dd></div>
              <div><dt className="text-gray-500">Category</dt><dd className="font-semibold text-gray-900 capitalize">{campaign.category}</dd></div>
              <div><dt className="text-gray-500">Mode</dt><dd className="font-semibold text-gray-900 capitalize">{campaign.campaign_mode}</dd></div>
              <div><dt className="text-gray-500">Created</dt><dd className="font-semibold text-gray-900">{new Date(campaign.created_at).toLocaleDateString('en-NG')}</dd></div>
            </dl>
            {campaign.description && (
              <>
                <div className="border-t border-gray-100" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-gray-700">{campaign.description}</p>
                </div>
              </>
            )}
            {campaign.verification_status === 'approved' && campaign.verification_report && (
              <>
                <div className="border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <p className="text-sm font-semibold text-green-700">Verified by Brandible AI Agent</p>
                  </div>
                  <p className="text-sm text-gray-600">{(campaign.verification_report as any).customer_experience}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab: Activators */}
        {tab === 'activators' && (
          <div className="space-y-4">
            {/* Pending applications (curated only) */}
            {campaign.campaign_mode === 'curated' && pendingApps.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Pending Applications</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{pendingApps.length} application{pendingApps.length !== 1 ? 's' : ''} awaiting review</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {pendingApps.map(app => (
                    <div key={app.id} className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">{app.profiles.full_name}</p>
                          <p className="text-xs text-gray-500">@{app.profiles.username} · {app.profiles.total_activations_count} campaigns · ₦{app.profiles.total_activation_earnings?.toLocaleString()} earned</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                          >
                            {expandedApp === app.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Details
                          </button>
                          <button
                            disabled={reviewingId === app.id}
                            onClick={() => handleReviewApplication(app.id, 'rejected')}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            disabled={reviewingId === app.id}
                            onClick={() => handleReviewApplication(app.id, 'approved')}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {reviewingId === app.id ? <Loader2 size={12} className="animate-spin" /> : null}
                            Approve
                          </button>
                        </div>
                      </div>
                      {expandedApp === app.id && (
                        <div className="mt-3 space-y-2">
                          {app.pitch && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pitch</p><p className="text-sm text-gray-700 mt-1">{app.pitch}</p></div>}
                          {app.audience_description && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</p><p className="text-sm text-gray-700 mt-1">{app.audience_description}</p></div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active activators */}
            <div className="bg-white rounded-2xl border border-gray-100">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Active Activators</h3>
              </div>
              {activators.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No activators yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {activators.map(a => (
                    <div key={a.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{a.profiles.full_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          @{a.profiles.username}
                          {a.dva_account_number && <> · DVA: {a.dva_bank_name} {a.dva_account_number}</>}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">{a.total_payments_count} sales</p>
                        <p className="text-xs text-green-600">₦{a.total_commission_earned.toLocaleString()} earned</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${a.dva_status === 'active' ? 'bg-green-100 text-green-700' : a.dva_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {a.dva_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Payments */}
        {tab === 'payments' && (
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Payment Feed</h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map(p => (
                  <div key={p.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {p.customer_email.replace(/(?<=.{3}).(?=.*@)/g, '*')}
                      </p>
                      <p className="text-xs text-gray-500">
                        via {(p.profiles as any)?.full_name ?? 'Unknown'} · {new Date(p.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{fmt(p.amount_kobo)}</p>
                      {p.brand_amount_kobo && <p className="text-xs text-green-600">You: {fmt(p.brand_amount_kobo)}</p>}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${p.fulfilment_status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.fulfilment_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
