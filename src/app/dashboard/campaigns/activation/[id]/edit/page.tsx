'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Zap,
  Link2,
  KeyRound,
  Download,
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Info,
  Webhook,
  Plus,
  Trash2,
} from 'lucide-react'

const STEPS = ['Basics', 'Mode', 'Pricing', 'Fulfilment', 'Verification']

type FulfilmentType = 'redirect' | 'access_code' | 'file_download' | 'credentials' | 'brand_webhook'
type CampaignMode = 'open' | 'curated'

interface CustomField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'number'
  options: string
  required: boolean
  placeholder: string
}

interface FormState {
  title: string
  description: string
  category: string
  mode: CampaignMode
  priceNgn: string
  commissionRate: string
  maxActivators: string
  fulfilmentType: FulfilmentType
  redirectUrl: string
  accessCodes: string
  fileUrl: string
  portalUrl: string
  credentialTemplate: string
  redemptionUrl: string
  redemptionInstructions: string
  sampleCode: string
  sampleRedirectUrl: string
  sampleFileUrl: string
  samplePortalUrl: string
  sampleUsername: string
  samplePassword: string
  learnMoreUrl: string
  webhookUrl: string
  webhookSecret: string
  customerMessage: string
  customMetadata: string
}

const CATEGORIES = ['health', 'education', 'finance', 'software', 'entertainment', 'telecom', 'other']

const FULFILMENT_TYPES = [
  {
    id: 'redirect' as FulfilmentType,
    label: 'Redirect Link',
    description: 'Customer gets a URL to access your platform or service',
    icon: <Link2 size={24} />,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'access_code' as FulfilmentType,
    label: 'Access Code',
    description: 'Customer receives a unique voucher or enrolment code',
    icon: <KeyRound size={24} />,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'file_download' as FulfilmentType,
    label: 'File Download',
    description: 'Customer gets a download link (e-book, template, report)',
    icon: <Download size={24} />,
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'credentials' as FulfilmentType,
    label: 'Login Credentials',
    description: 'Customer receives login details for a service or portal',
    icon: <ShieldCheck size={24} />,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'brand_webhook' as FulfilmentType,
    label: 'Brand Webhook',
    description: 'Brandible calls your API after payment — you handle activation',
    icon: <Webhook size={24} />,
    color: 'bg-rose-50 border-rose-200 text-rose-700',
  },
]

const EMPTY_FORM: FormState = {
  title: '', description: '', category: '', mode: 'open',
  priceNgn: '', commissionRate: '20', maxActivators: '',
  fulfilmentType: 'redirect', redirectUrl: '', accessCodes: '',
  fileUrl: '', portalUrl: '', credentialTemplate: '',
  redemptionUrl: '', redemptionInstructions: '',
  sampleCode: '', sampleRedirectUrl: '', sampleFileUrl: '',
  samplePortalUrl: '', sampleUsername: '', samplePassword: '',
  learnMoreUrl: '', webhookUrl: '', webhookSecret: '',
  customerMessage: '', customMetadata: '',
}

function parseCampaignToForm(campaign: any): { form: FormState; customFields: CustomField[] } {
  const config = (campaign.fulfilment_config as any) ?? {}
  const sample = (campaign.sample_payload as any) ?? {}

  const form: FormState = {
    title: campaign.title ?? '',
    description: campaign.description ?? '',
    category: campaign.category ?? '',
    mode: campaign.campaign_mode ?? 'open',
    priceNgn: String(campaign.price_kobo / 100),
    commissionRate: String(campaign.commission_rate),
    maxActivators: campaign.max_activators != null ? String(campaign.max_activators) : '',
    fulfilmentType: campaign.fulfilment_type ?? 'redirect',
    learnMoreUrl: campaign.learn_more_url ?? '',
    redirectUrl: config.redirect_url ?? '',
    accessCodes: '',
    redemptionUrl: config.redemption_url ?? '',
    redemptionInstructions: config.redemption_instructions ?? '',
    fileUrl: config.file_url ?? '',
    portalUrl: config.portal_url ?? '',
    credentialTemplate: '',
    webhookUrl: config.webhook_url ?? '',
    webhookSecret: config.webhook_secret ?? '',
    customerMessage: config.customer_message ?? '',
    customMetadata: config.custom_metadata ? JSON.stringify(config.custom_metadata, null, 2) : '',
    sampleRedirectUrl: sample.url ?? '',
    sampleCode: sample.code ?? '',
    sampleFileUrl: sample.file_url ?? '',
    samplePortalUrl: config.portal_url ?? '',
    sampleUsername: sample.username ?? '',
    samplePassword: '',
  }

  const rawFields: any[] = config.required_fields ?? []
  const customFields: CustomField[] = rawFields.map((f: any) => ({
    key: f.key ?? '',
    label: f.label ?? '',
    type: f.type ?? 'text',
    options: Array.isArray(f.options) ? f.options.join(', ') : '',
    required: f.required !== false,
    placeholder: f.placeholder ?? '',
  }))

  return { form, customFields }
}

export default function EditActivationCampaignPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  useEffect(() => {
    async function loadCampaign() {
      const { data } = await supabase
        .from('activation_campaigns')
        .select('*')
        .eq('id', id)
        .single()
      if (data) {
        const parsed = parseCampaignToForm(data)
        setForm(parsed.form)
        setCustomFields(parsed.customFields)
      }
      setInitialLoading(false)
    }
    loadCampaign()
  }, [id])

  const set = (key: keyof FormState, value: string) => setForm(f => ({ ...f, [key]: value }))

  const priceKobo = Math.round((parseFloat(form.priceNgn) || 0) * 100)
  const commissionKobo = Math.floor(priceKobo * (parseFloat(form.commissionRate) / 100))
  const platformFeeKobo = Math.floor(priceKobo * 0.03)
  const brandAmountKobo = priceKobo - commissionKobo - platformFeeKobo

  const fmt = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`

  function buildFulfilmentConfig(): Record<string, unknown> {
    const base = { campaign_title: form.title }
    switch (form.fulfilmentType) {
      case 'redirect':
        return { ...base, redirect_url: form.redirectUrl }
      case 'access_code':
        return {
          ...base,
          redemption_url: form.redemptionUrl || undefined,
          redemption_instructions: form.redemptionInstructions || 'Use this code to access your product.',
        }
      case 'file_download':
        return { ...base, file_url: form.fileUrl, storage_bucket: 'activation-files' }
      case 'credentials':
        return { ...base, portal_url: form.portalUrl }
      case 'brand_webhook': {
        let parsedMeta: Record<string, unknown> = {}
        try { parsedMeta = form.customMetadata ? JSON.parse(form.customMetadata) : {} } catch { /* ignore */ }
        const builtFields = customFields
          .filter(f => f.key && f.label)
          .map(f => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
            placeholder: f.placeholder || undefined,
            options: f.type === 'select' && f.options
              ? f.options.split(',').map(o => o.trim()).filter(Boolean)
              : undefined,
          }))
        return {
          ...base,
          webhook_url: form.webhookUrl,
          webhook_secret: form.webhookSecret || undefined,
          customer_message: form.customerMessage || 'Your subscription is being activated. You will receive a confirmation shortly.',
          required_fields: builtFields.length ? builtFields : undefined,
          custom_metadata: Object.keys(parsedMeta).length ? parsedMeta : undefined,
        }
      }
      default:
        return base
    }
  }

  function buildSamplePayload(): Record<string, unknown> | null {
    switch (form.fulfilmentType) {
      case 'redirect':   return form.sampleRedirectUrl ? { url: form.sampleRedirectUrl } : null
      case 'access_code': return form.sampleCode ? { code: form.sampleCode } : null
      case 'file_download': return form.sampleFileUrl ? { file_url: form.sampleFileUrl } : null
      case 'credentials': return form.sampleUsername
        ? { username: form.sampleUsername, password: form.samplePassword, portal_url: form.portalUrl }
        : null
      default: return null
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${user?.id}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('activation-files')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('activation-files').getPublicUrl(path)
      set('fileUrl', publicUrl)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploadingFile(false)
    }
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.title.trim()) return 'Campaign title is required'
      if (!form.description.trim()) return 'Description is required'
      if (!form.category) return 'Please select a category'
    }
    if (step === 3) {
      if (!form.priceNgn || parseFloat(form.priceNgn) < 3000) return 'Minimum price is ₦3,000'
      if (!form.commissionRate || parseFloat(form.commissionRate) < 10) return 'Minimum commission is 10%'
      if (commissionKobo + platformFeeKobo > priceKobo) return 'Commission + platform fee exceeds price'
    }
    if (step === 4) {
      if (form.fulfilmentType === 'redirect' && !form.redirectUrl) return 'Redirect URL is required'
      if (form.fulfilmentType === 'access_code' && !form.redemptionUrl && !form.accessCodes.trim()) return 'At least a redemption URL is required'
      if (form.fulfilmentType === 'file_download' && !form.fileUrl) return 'Upload a file first'
      if (form.fulfilmentType === 'credentials' && !form.portalUrl) return 'Portal URL is required'
      if (form.fulfilmentType === 'brand_webhook' && !form.webhookUrl) return 'Webhook URL is required'
      if (form.fulfilmentType === 'brand_webhook' && form.customMetadata) {
        try { JSON.parse(form.customMetadata) } catch { return 'Custom metadata must be valid JSON' }
      }
    }
    if (step === 5) {
      if (form.fulfilmentType === 'redirect' && !form.sampleRedirectUrl) return 'Verification URL is required'
      if (form.fulfilmentType === 'access_code' && !form.sampleCode) return 'Sample access code is required'
      if (form.fulfilmentType === 'file_download' && !form.sampleFileUrl) return 'Sample file URL is required'
      if (form.fulfilmentType === 'credentials' && !form.sampleUsername) return 'Sample username is required'
    }
    return null
  }

  async function handleTestWebhook() {
    if (!form.webhookUrl) return
    setTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const res = await fetch(form.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brandible-Test': 'true' },
        body: JSON.stringify({
          event: 'activation.payment.confirmed',
          is_test: true,
          customer_email: 'test@brandiblebms.com',
          customer_phone: '+2348000000000',
          amount_kobo: 500000,
          payment_reference: `brandible_test_${Date.now()}`,
          timestamp: new Date().toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      const ok = res.ok && data.status === 'success'
      setWebhookTestResult({
        ok,
        message: ok
          ? `✓ Webhook responded correctly (HTTP ${res.status})`
          : `✗ Expected { "status": "success" } but got HTTP ${res.status}: ${JSON.stringify(data).slice(0, 100)}`,
      })
    } catch (e: any) {
      setWebhookTestResult({ ok: false, message: `✗ Could not reach webhook: ${e.message}` })
    } finally {
      setTestingWebhook(false)
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('activation_campaigns')
        .update({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          campaign_mode: form.mode,
          price_kobo: priceKobo,
          commission_rate: parseFloat(form.commissionRate),
          max_activators: form.maxActivators ? parseInt(form.maxActivators) : null,
          fulfilment_type: form.fulfilmentType,
          fulfilment_config: buildFulfilmentConfig(),
          sample_payload: buildSamplePayload(),
          learn_more_url: form.learnMoreUrl.trim() || null,
          verification_status: 'in_review',
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Append any new access codes (don't delete existing ones)
      if (form.fulfilmentType === 'access_code' && form.accessCodes.trim()) {
        const codes = form.accessCodes.split(/[\n,]+/).map(c => c.trim()).filter(Boolean)
        if (codes.length) {
          const rows = codes.map(code => ({ campaign_id: id, code }))
          const { error: codeError } = await supabase.from('activation_campaign_codes').insert(rows)
          if (codeError) throw new Error(`Failed to upload codes: ${codeError.message}`)
        }
      }

      // Re-trigger AI verification
      supabase.functions.invoke('verify-activation-campaign', { body: { campaign_id: id } })
        .catch(console.error)

      router.push(`/dashboard/campaigns/activation/${id}?submitted=1`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function nextStep() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand'
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5'

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Zap size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
              <p className="text-sm text-gray-500">Step {step} of {STEPS.length} — {STEPS[step - 1]}</p>
            </div>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i < step ? 'bg-brand' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">

          {/* ── Step 1: Basics ── */}
          {step === 1 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Campaign Basics</h2>
              <div>
                <label className={labelClass}>Campaign Title</label>
                <input className={inputClass} placeholder="e.g. Health360 Premium Subscription" value={form.title} onChange={e => set('title', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea className={inputClass} rows={4} placeholder="What is the customer paying for?" value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Learn More URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  className={inputClass}
                  placeholder="https://yourdomain.com/product or YouTube link"
                  value={form.learnMoreUrl}
                  onChange={e => set('learnMoreUrl', e.target.value)}
                  type="url"
                />
                <p className="text-xs text-gray-400 mt-1">Shown to influencers when deciding to apply, and to customers in WhatsApp before they pay.</p>
              </div>
            </>
          )}

          {/* ── Step 2: Mode ── */}
          {step === 2 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Campaign Mode</h2>
              <p className="text-sm text-gray-500">How should activators join your campaign?</p>
              <div className="space-y-3">
                {[
                  { id: 'open' as CampaignMode, label: 'Open Activation', desc: 'Any eligible member can join instantly.', badge: 'Recommended' },
                  { id: 'curated' as CampaignMode, label: 'Curated Activation', desc: 'Activators apply and you approve who joins.', badge: 'More control' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => set('mode', opt.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.mode === opt.id ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{opt.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.mode === opt.id ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'}`}>{opt.badge}</span>
                    </div>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Step 3: Pricing ── */}
          {step === 3 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Pricing & Commission</h2>
              <div>
                <label className={labelClass}>Customer Price (₦)</label>
                <input type="number" min="3000" className={inputClass} placeholder="Minimum ₦3,000" value={form.priceNgn} onChange={e => set('priceNgn', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Activator Commission (%)</label>
                <input type="number" min="10" max="80" className={inputClass} placeholder="Minimum 10%" value={form.commissionRate} onChange={e => set('commissionRate', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Max Activators (optional)</label>
                <input type="number" min="1" className={inputClass} placeholder="Leave blank for unlimited" value={form.maxActivators} onChange={e => set('maxActivators', e.target.value)} />
              </div>
              {priceKobo >= 300000 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Split Preview</p>
                  <p className="text-sm text-gray-700">Customer pays: <span className="font-bold text-gray-900">{fmt(priceKobo)}</span></p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Activator earns ({form.commissionRate}%)</span>
                      <span className="font-semibold text-green-600">{fmt(commissionKobo)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Brandible platform fee (3%)</span>
                      <span className="font-semibold text-gray-500">{fmt(platformFeeKobo)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-700 font-semibold">You receive</span>
                      <span className="font-bold text-brand">{fmt(brandAmountKobo)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 4: Fulfilment ── */}
          {step === 4 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Fulfilment Setup</h2>
              <p className="text-sm text-gray-500">What does the customer receive after paying?</p>
              <div className="grid grid-cols-2 gap-3">
                {FULFILMENT_TYPES.map(ft => (
                  <button
                    key={ft.id}
                    onClick={() => set('fulfilmentType', ft.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${form.fulfilmentType === ft.id ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${ft.color} border`}>{ft.icon}</div>
                    <p className="text-sm font-semibold text-gray-900">{ft.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{ft.description}</p>
                  </button>
                ))}
              </div>

              <div className="pt-2 space-y-4">
                {form.fulfilmentType === 'redirect' && (
                  <div>
                    <label className={labelClass}>Redirect URL</label>
                    <input className={inputClass} placeholder="https://yourproduct.com/access" value={form.redirectUrl} onChange={e => set('redirectUrl', e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">Customers are sent here immediately after payment</p>
                  </div>
                )}

                {form.fulfilmentType === 'access_code' && (
                  <>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">Existing codes are preserved. Add new codes below — they will be appended to your pool.</p>
                    </div>
                    <div>
                      <label className={labelClass}>Add More Codes (optional)</label>
                      <textarea className={inputClass} rows={5} placeholder={'CODE001\nCODE002\nCODE003'} value={form.accessCodes} onChange={e => set('accessCodes', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Redemption URL (optional)</label>
                      <input className={inputClass} placeholder="Where customers use their code" value={form.redemptionUrl} onChange={e => set('redemptionUrl', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Redemption Instructions</label>
                      <textarea className={inputClass} rows={3} placeholder="Tell customers how to use their code" value={form.redemptionInstructions} onChange={e => set('redemptionInstructions', e.target.value)} />
                    </div>
                  </>
                )}

                {form.fulfilmentType === 'file_download' && (
                  <div>
                    <label className={labelClass}>Upload File</label>
                    {form.fileUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                        <span className="text-sm text-green-700 truncate">File uploaded</span>
                        <button onClick={() => set('fileUrl', '')} className="ml-auto text-xs text-red-500 hover:underline">Replace</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand transition-colors">
                        {uploadingFile ? <Loader2 size={18} className="animate-spin text-brand" /> : <Upload size={18} className="text-gray-400" />}
                        <span className="text-sm text-gray-500">{uploadingFile ? 'Uploading…' : 'Click to upload PDF, DOCX, ZIP, etc.'}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                      </label>
                    )}
                  </div>
                )}

                {form.fulfilmentType === 'credentials' && (
                  <div>
                    <label className={labelClass}>Portal / Login URL</label>
                    <input className={inputClass} placeholder="https://app.yourservice.com/login" value={form.portalUrl} onChange={e => set('portalUrl', e.target.value)} />
                  </div>
                )}

                {form.fulfilmentType === 'brand_webhook' && (
                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Webhook URL <span className="text-red-500">*</span></label>
                      <input
                        className={inputClass}
                        placeholder="https://yourapi.com/webhooks/brandible"
                        value={form.webhookUrl}
                        onChange={e => set('webhookUrl', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Must respond with HTTP 200 and <code className="bg-gray-100 px-1 rounded">{'{"status":"success"}'}</code></p>
                    </div>
                    <div>
                      <label className={labelClass}>Webhook Secret (optional)</label>
                      <input
                        className={inputClass}
                        placeholder="A secret string your server uses to verify requests"
                        value={form.webhookSecret}
                        onChange={e => set('webhookSecret', e.target.value)}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleTestWebhook}
                        disabled={!form.webhookUrl || testingWebhook}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold hover:bg-rose-100 disabled:opacity-50 transition-colors"
                      >
                        {testingWebhook ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
                        {testingWebhook ? 'Testing…' : 'Test Webhook'}
                      </button>
                      {webhookTestResult && (
                        <div className={`mt-2 flex items-start gap-2 p-3 rounded-xl border text-sm ${webhookTestResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          {webhookTestResult.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                          <span className="font-mono text-xs">{webhookTestResult.message}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Customer Message</label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        placeholder="Your subscription is being activated. You will receive a confirmation shortly."
                        value={form.customerMessage}
                        onChange={e => set('customerMessage', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Custom Metadata (optional)</label>
                      <textarea
                        className={`${inputClass} font-mono text-xs`}
                        rows={3}
                        placeholder={'{\n  "product_id": "health360_monthly"\n}'}
                        value={form.customMetadata}
                        onChange={e => set('customMetadata', e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className={labelClass + ' mb-0'}>Custom Contact Fields (optional)</label>
                          <p className="text-xs text-gray-400 mt-0.5">Fields customers must fill before paying</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomFields(f => [...f, { key: '', label: '', type: 'text', options: '', required: true, placeholder: '' }])}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shrink-0"
                        >
                          <Plus size={13} /> Add Field
                        </button>
                      </div>
                      {customFields.length === 0 && (
                        <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                          No custom fields
                        </div>
                      )}
                      <div className="space-y-3">
                        {customFields.map((field, i) => (
                          <div key={i} className="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-500">Field {i + 1}</span>
                              <button type="button" onClick={() => setCustomFields(f => f.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Key (for API)</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono"
                                  placeholder="mobile_network"
                                  value={field.key}
                                  onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, key: e.target.value.replace(/\s+/g, '_').toLowerCase() } : x))}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Label</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                  placeholder="Mobile Network"
                                  value={field.label}
                                  onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                  value={field.type}
                                  onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, type: e.target.value as CustomField['type'] } : x))}
                                >
                                  <option value="text">Text</option>
                                  <option value="email">Email</option>
                                  <option value="tel">Phone</option>
                                  <option value="number">Number</option>
                                  <option value="select">Dropdown</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Placeholder</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                  placeholder="e.g. Select your network"
                                  value={field.placeholder}
                                  onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, placeholder: e.target.value } : x))}
                                />
                              </div>
                            </div>
                            {field.type === 'select' && (
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Options (comma-separated)</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30"
                                  placeholder="MTN, Airtel, Glo, 9mobile"
                                  value={field.options}
                                  onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, options: e.target.value } : x))}
                                />
                              </div>
                            )}
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, required: e.target.checked } : x))}
                                className="rounded"
                              />
                              <span className="text-xs text-gray-600">Required field</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 5: Verification ── */}
          {step === 5 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Verification</h2>

              {form.fulfilmentType === 'brand_webhook' ? (
                <>
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <Webhook size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-900">Webhook verification — no sample needed</p>
                      <p className="text-sm text-rose-700 mt-0.5">The AI agent will send a test POST to your webhook and check for HTTP 200 + <code className="bg-rose-100 px-1 rounded">{'{"status":"success"}'}</code>. Make sure your endpoint is live.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-700">Provide a working test sample — used only for verification. Fix whatever the agent flagged in the previous review.</p>
                  </div>

                  {form.fulfilmentType === 'redirect' && (
                    <div>
                      <label className={labelClass}>Verification URL</label>
                      <input className={inputClass} placeholder="Same as or similar to your redirect URL" value={form.sampleRedirectUrl} onChange={e => set('sampleRedirectUrl', e.target.value)} />
                    </div>
                  )}
                  {form.fulfilmentType === 'access_code' && (
                    <div>
                      <label className={labelClass}>Sample Working Code</label>
                      <input className={inputClass} placeholder="A real code our agent can test" value={form.sampleCode} onChange={e => set('sampleCode', e.target.value)} />
                    </div>
                  )}
                  {form.fulfilmentType === 'file_download' && (
                    <div>
                      <label className={labelClass}>Sample File URL</label>
                      <input className={inputClass} placeholder="Direct link to a sample of the file" value={form.sampleFileUrl} onChange={e => set('sampleFileUrl', e.target.value)} />
                    </div>
                  )}
                  {form.fulfilmentType === 'credentials' && (
                    <>
                      <div>
                        <label className={labelClass}>Sample Username</label>
                        <input className={inputClass} placeholder="test@yourservice.com" value={form.sampleUsername} onChange={e => set('sampleUsername', e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Sample Password</label>
                        <input type="password" className={inputClass} placeholder="Sample password for verification" value={form.samplePassword} onChange={e => set('samplePassword', e.target.value)} />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <AlertCircle size={16} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">Verification usually completes within a few minutes. You will be notified by email once reviewed.</p>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => { setError(null); setStep(s => s - 1) }}
              className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div className="flex-1" />
          {step < STEPS.length ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 transition-colors"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-bold disabled:opacity-60 hover:bg-brand/90 transition-colors"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Zap size={16} /> Save & Resubmit</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
