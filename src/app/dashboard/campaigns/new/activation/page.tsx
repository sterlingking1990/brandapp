'use client'

import { useState } from 'react'
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

type FulfilmentType = 'redirect' | 'access_code' | 'file_download' | 'credentials' | 'brand_webhook' | 'bundle'
type CampaignMode = 'open' | 'curated'

interface CustomField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'number'
  options: string       // comma-separated, for type=select
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
  // brand_webhook fields
  webhookUrl: string
  webhookSecret: string
  customerMessage: string
  customMetadata: string
}

const CATEGORIES = ['health', 'education', 'finance', 'software', 'entertainment', 'telecom', 'other']

const VTU_NETWORKS = [
  { label: 'MTN',     value: 'mtn',     dataService: 'mtn-data'      },
  { label: 'Airtel',  value: 'airtel',  dataService: 'airtel-data'   },
  { label: 'Glo',     value: 'glo',     dataService: 'glo-data'      },
  { label: '9mobile', value: '9mobile', dataService: 'etisalat-data' },
]

const ELECTRICITY_DISCOS = [
  { label: 'IKEDC — Ikeja Electric (Lagos)',      value: 'ikeja-electric'  },
  { label: 'EKEDC — Eko Electric (Lagos)',         value: 'eko-electric'    },
  { label: 'AEDC — Abuja Electric',               value: 'abuja-electric'  },
  { label: 'PHED — Port Harcourt Electric',       value: 'phed'            },
  { label: 'EEDC — Enugu Electric',               value: 'enugu-electric'  },
  { label: 'KEDCO — Kano Electric',               value: 'kano-electric'   },
  { label: 'BEDC — Benin Electric',               value: 'benin-electric'  },
  { label: 'JED — Jos Electric',                  value: 'jos-electric'    },
]

const CABLE_TV_PROVIDERS = [
  { label: 'DSTV',       value: 'dstv',       fieldLabel: 'Smartcard Number' },
  { label: 'GOtv',       value: 'gotv',       fieldLabel: 'IUC Number'       },
  { label: 'Startimes',  value: 'startimes',  fieldLabel: 'Smartcard Number' },
]

const EDUCATION_PROVIDERS = [
  {
    label: 'WAEC Registration',
    value: 'waec-registration',
    needsPlan: true,
    billerField: null as string | null,
  },
  {
    label: 'WAEC Result Checker',
    value: 'waec',
    needsPlan: true,
    billerField: null as string | null,
  },
  {
    label: 'JAMB',
    value: 'jamb',
    needsPlan: true,
    billerField: 'profile_id',
  },
]

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
    description: 'Brandible calls your API after payment — you handle activation (USSD, telco, any system)',
    icon: <Webhook size={24} />,
    color: 'bg-rose-50 border-rose-200 text-rose-700',
  },
]

export default function NewActivationCampaignPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  const [aiVerification, setAiVerification] = useState(true)

  // VTU quick setup template state
  const [vtuTemplate, setVtuTemplate] = useState<'airtime' | 'data' | 'electricity' | 'cable_tv' | 'education' | 'bundle' | null>(null)
  const [vtuNetwork, setVtuNetwork] = useState('')       // airtime / data
  const [vtuPlan, setVtuPlan] = useState('')             // data / cable_tv / education variation code
  const [vtuPlans, setVtuPlans] = useState<{ variation_code: string; name: string; variation_amount: string }[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [vtuDisco, setVtuDisco] = useState('')           // electricity DISCO
  const [vtuMeterType, setVtuMeterType] = useState('')   // electricity: prepaid/postpaid
  const [vtuCableProvider, setVtuCableProvider] = useState('') // cable_tv provider
  const [vtuEducationProvider, setVtuEducationProvider] = useState('') // education provider
  const [vtuApplied, setVtuApplied] = useState(false)
  const [bundleAiInput, setBundleAiInput] = useState('')
  const [bundleAiLoading, setBundleAiLoading] = useState(false)
  const [bundleAiError, setBundleAiError] = useState<string | null>(null)
  const [bundleComponentCodes, setBundleComponentCodes] = useState<Record<string, string>>({})
  const [bundleComponentUrls, setBundleComponentUrls] = useState<Record<string, string>>({})

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    category: '',
    mode: 'open',
    priceNgn: '',
    commissionRate: '20',
    maxActivators: '',
    fulfilmentType: 'redirect',
    redirectUrl: '',
    accessCodes: '',
    fileUrl: '',
    portalUrl: '',
    credentialTemplate: '',
    redemptionUrl: '',
    redemptionInstructions: '',
    sampleCode: '',
    sampleRedirectUrl: '',
    sampleFileUrl: '',
    samplePortalUrl: '',
    sampleUsername: '',
    samplePassword: '',
    learnMoreUrl: '',
    webhookUrl: '',
    webhookSecret: '',
    customerMessage: '',
    customMetadata: '',
  })

  const set = (key: keyof FormState, value: string) => setForm(f => ({ ...f, [key]: value }))

  // Derived: components from the bundle JSON that need extra input from the brand
  const parsedBundleComponents = (() => {
    if (form.fulfilmentType !== 'bundle') return []
    try {
      const parsed = JSON.parse(form.customMetadata || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  })()
  const accessCodeComponents = parsedBundleComponents.filter((c: any) => c.type === 'access_code' && c.component_id)
  const redirectComponents   = parsedBundleComponents.filter((c: any) => c.type === 'redirect' && c.component_id)

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
      case 'bundle': {
        let components: any[] = []
        try { components = JSON.parse(form.customMetadata || '[]') } catch { /* ignore */ }
        // Patch brand-provided URLs into redirect components before saving
        components = components.map(c => {
          if (c.type === 'redirect' && c.component_id && bundleComponentUrls[c.component_id]?.trim()) {
            return { ...c, redirect_url: bundleComponentUrls[c.component_id].trim() }
          }
          return c
        })
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
          customer_message: form.customerMessage || 'Your bundle is being activated.',
          components,
          required_fields: builtFields.length ? builtFields : undefined,
        }
      }
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
      case 'redirect':
        return form.sampleRedirectUrl ? { url: form.sampleRedirectUrl } : null
      case 'access_code':
        return form.sampleCode ? { code: form.sampleCode } : null
      case 'file_download':
        return form.sampleFileUrl ? { file_url: form.sampleFileUrl } : null
      case 'credentials':
        return form.sampleUsername
          ? { username: form.sampleUsername, password: form.samplePassword, portal_url: form.portalUrl }
          : null
      case 'brand_webhook':
        return null
      default:
        return null
    }
  }

  async function uploadCodes(): Promise<void> {
    // Codes are stored in activation_campaign_codes table
    if (!campaignId || !form.accessCodes) return
    const codes = form.accessCodes
      .split(/[\n,]+/)
      .map(c => c.trim())
      .filter(Boolean)
    if (!codes.length) return

    const rows = codes.map(code => ({ campaign_id: campaignId, code }))
    const { error } = await supabase.from('activation_campaign_codes').insert(rows)
    if (error) throw new Error(`Failed to upload codes: ${error.message}`)
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
      const isVtu = vtuApplied && (vtuTemplate === 'airtime' || vtuTemplate === 'data')
      const minPrice = isVtu ? 100 : 3000
      if (!form.priceNgn || parseFloat(form.priceNgn) < minPrice) return `Minimum price is ₦${minPrice.toLocaleString('en-NG')}`
      if (!form.commissionRate || parseFloat(form.commissionRate) < 10) return 'Minimum commission is 10%'
      if (commissionKobo + platformFeeKobo > priceKobo) return 'Commission + platform fee exceeds price'
    }
    if (step === 4) {
      if (form.fulfilmentType === 'redirect' && !form.redirectUrl) return 'Redirect URL is required'
      if (form.fulfilmentType === 'access_code' && !form.accessCodes.trim()) return 'Paste at least one access code'
      if (form.fulfilmentType === 'file_download' && !form.fileUrl) return 'Upload a file first'
      if (form.fulfilmentType === 'credentials' && !form.portalUrl) return 'Portal URL is required'
      if (form.fulfilmentType === 'brand_webhook' && !form.webhookUrl) return 'Webhook URL is required'
      if (form.fulfilmentType === 'brand_webhook' && form.customMetadata) {
        try { JSON.parse(form.customMetadata) } catch { return 'Custom metadata must be valid JSON' }
      }
      if (form.fulfilmentType === 'bundle') {
        try {
          const c = JSON.parse(form.customMetadata || '[]')
          if (!Array.isArray(c) || c.length === 0) return 'Add at least one component to the bundle'
          const missingCodes = accessCodeComponents.filter(
            (comp: any) => !bundleComponentCodes[comp.component_id]?.trim()
          )
          if (missingCodes.length > 0) {
            return `Upload codes for: ${missingCodes.map((c: any) => c.label).join(', ')}`
          }
          const missingUrls = redirectComponents.filter(
            (comp: any) => !bundleComponentUrls[comp.component_id]?.trim()
          )
          if (missingUrls.length > 0) {
            return `Paste the URL for: ${missingUrls.map((c: any) => c.label).join(', ')}`
          }
        } catch { return 'Components JSON is invalid — check the syntax' }
      }
    }
    if (step === 5) {
      if (form.fulfilmentType === 'redirect' && !form.sampleRedirectUrl) return 'Sample redirect URL is required'
      if (form.fulfilmentType === 'access_code' && !form.sampleCode) return 'Sample access code is required'
      if (form.fulfilmentType === 'file_download' && !form.sampleFileUrl) return 'Sample file URL is required'
      if (form.fulfilmentType === 'credentials' && !form.sampleUsername) return 'Sample username is required'
      // brand_webhook and bundle: no sample payload — verification agent tests directly
    }
    return null
  }

  async function fetchVtuPlans(serviceId: string) {
    setLoadingPlans(true)
    setVtuPlans([])
    setVtuPlan('')
    try {
      const { data } = await supabase.functions.invoke('get-vtu-plans', {
        body: { service_id: serviceId },
      })
      setVtuPlans(data?.variations ?? [])
    } catch (e) {
      console.error('Failed to fetch VTU plans:', e)
    } finally {
      setLoadingPlans(false)
    }
  }

  function applyVtuTemplate(
    template: 'airtime' | 'data' | 'electricity' | 'cable_tv' | 'education' | 'bundle',
    opts: { network?: string; plan?: string; disco?: string; meterType?: string; cableProvider?: string; educationProvider?: string }
  ) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const webhookUrl  = `${supabaseUrl}/functions/v1/vtu-fulfilment`

    let meta: Record<string, string> = { vtu_type: template }
    let fieldKey   = 'phone'
    let fieldLabel = 'Phone Number to Top Up'
    let fieldType: CustomField['type'] = 'tel'
    let fieldPlaceholder = '08012345678'
    let customerMessage  = ''

    if (template === 'airtime') {
      const netLabel = VTU_NETWORKS.find(n => n.value === opts.network)?.label ?? ''
      meta = { ...meta, vtu_network: opts.network!, phone_field: 'phone' }
      customerMessage = `Your ${netLabel} airtime will be loaded within 2 minutes of payment.`

    } else if (template === 'data') {
      const netLabel  = VTU_NETWORKS.find(n => n.value === opts.network)?.label ?? ''
      const plan      = vtuPlans.find(p => p.variation_code === opts.plan)
      const planLabel = plan?.name ?? opts.plan ?? ''
      const planCost  = plan?.variation_amount ?? ''
      meta = { ...meta, vtu_network: opts.network!, vtu_variation_code: opts.plan!, phone_field: 'phone', ...(planCost ? { vtu_amount: planCost } : {}) }
      customerMessage = `Your ${netLabel} ${planLabel} will be loaded within 2 minutes of payment.`

    } else if (template === 'electricity') {
      const discoLabel = ELECTRICITY_DISCOS.find(d => d.value === opts.disco)?.label ?? ''
      meta = { ...meta, vtu_service_id: opts.disco!, vtu_variation_code: opts.meterType!, phone_field: 'meter_number' }
      fieldKey         = 'meter_number'
      fieldLabel       = 'Meter Number'
      fieldType        = 'text'
      fieldPlaceholder = 'e.g. 12345678901'
      customerMessage  = `Your ${discoLabel} electricity token will be sent to your email within 2 minutes.`

    } else if (template === 'cable_tv') {
      const provider  = CABLE_TV_PROVIDERS.find(p => p.value === opts.cableProvider)
      const plan      = vtuPlans.find(p => p.variation_code === opts.plan)
      const planLabel = plan?.name ?? opts.plan ?? ''
      const planCost  = plan?.variation_amount ?? ''
      meta = { ...meta, vtu_service_id: opts.cableProvider!, vtu_variation_code: opts.plan!, phone_field: 'smartcard_number', ...(planCost ? { vtu_amount: planCost } : {}) }
      fieldKey         = 'smartcard_number'
      fieldLabel       = provider?.fieldLabel ?? 'Smartcard Number'
      fieldType        = 'text'
      fieldPlaceholder = 'e.g. 1234567890'
      customerMessage  = `Your ${provider?.label ?? 'cable TV'} ${planLabel} subscription will be activated within 2 minutes.`

    } else if (template === 'education') {
      const provider  = EDUCATION_PROVIDERS.find(p => p.value === opts.educationProvider)
      const plan      = vtuPlans.find(p => p.variation_code === opts.plan)
      const planLabel = plan?.name ?? opts.plan ?? ''
      const planCost  = plan?.variation_amount ?? ''
      const variationCode  = opts.plan ?? ''

      meta = {
        ...meta,
        vtu_type:             'education',
        vtu_service_id:       opts.educationProvider!,
        vtu_variation_code:   variationCode,
        phone_field:          'phone',
        ...(provider?.billerField ? { biller_field: provider.billerField } : {}),
        ...(planCost ? { vtu_amount: planCost } : {}),
      }
      fieldKey         = 'phone'
      fieldLabel       = 'Phone Number'
      fieldType        = 'tel'
      fieldPlaceholder = '08012345678'
      customerMessage  = `Your ${provider?.label ?? 'education'} ${planLabel} PIN will be delivered to your email within 2 minutes.`

      // JAMB also needs Profile ID as an extra custom field
      if (provider?.billerField) {
        setForm(f => ({
          ...f,
          fulfilmentType:  'brand_webhook',
          webhookUrl,
          customMetadata:  JSON.stringify(meta, null, 2),
          customerMessage,
          category:        'education',
        }))
        setCustomFields([
          { key: 'profile_id', label: 'JAMB Profile ID', type: 'text', required: true, placeholder: 'e.g. 12345678', options: '' },
          { key: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '08012345678', options: '' },
        ])
        setVtuApplied(true)
        return
      }
    }

    if (template === 'bundle') {
      setForm(f => ({
        ...f,
        fulfilmentType:  'bundle',
        webhookUrl:      '',
        customerMessage: form.customerMessage || 'Your bundle is being activated. All components will be delivered within 2 minutes.',
        category:        f.category || 'other',
      }))
      setVtuApplied(true)
      return
    }

    setForm(f => ({
      ...f,
      fulfilmentType:  'brand_webhook',
      webhookUrl,
      customMetadata:  JSON.stringify(meta, null, 2),
      customerMessage,
      category:        f.category || (template === 'education' ? 'education' : 'telecom'),
    }))
    setCustomFields([{
      key: fieldKey, label: fieldLabel, type: fieldType,
      required: true, placeholder: fieldPlaceholder, options: '',
    }])
    setVtuApplied(true)
  }

  async function handleGenerateBundle() {
    if (!bundleAiInput.trim()) return
    setBundleAiLoading(true)
    setBundleAiError(null)
    try {
      const { data, error } = await supabase.functions.invoke('bundle-ai-generate', {
        body: { description: bundleAiInput.trim() },
      })
      if (error) throw new Error(error.message)
      if (data.error) throw new Error(data.error)

      // Populate components JSON
      if (Array.isArray(data.components)) {
        set('customMetadata', JSON.stringify(data.components, null, 2))
      }
      // Populate customer message
      if (data.customer_message) {
        set('customerMessage', data.customer_message)
      }
      // Populate custom fields
      if (Array.isArray(data.custom_fields) && data.custom_fields.length > 0) {
        setCustomFields(data.custom_fields.map((f: any) => ({
          key: f.key ?? '',
          label: f.label ?? '',
          type: f.type ?? 'text',
          required: f.required !== false,
          placeholder: f.placeholder ?? '',
          options: f.options ?? '',
        })))
      }
      // Mark as applied
      set('fulfilmentType', 'bundle')
      setVtuApplied(true)
    } catch (e: any) {
      setBundleAiError(e.message ?? 'Generation failed. Try again.')
    } finally {
      setBundleAiLoading(false)
    }
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: campaign, error: insertError } = await supabase
        .from('activation_campaigns')
        .insert({
          brand_id: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          campaign_mode: form.mode,
          price_kobo: priceKobo,
          commission_rate: parseFloat(form.commissionRate),
          platform_fee_rate: 3.0,
          max_activators: form.maxActivators ? parseInt(form.maxActivators) : null,
          fulfilment_type: form.fulfilmentType,
          fulfilment_config: buildFulfilmentConfig(),
          sample_payload: buildSamplePayload(),
          learn_more_url: form.learnMoreUrl.trim() || null,
          verification_status: aiVerification ? 'in_review' : 'approved',
          status: aiVerification ? 'draft' : 'active',
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      setCampaignId(campaign.id)

      // Upload access codes for standard access_code campaigns
      if (form.fulfilmentType === 'access_code') {
        const codes = form.accessCodes.split(/[\n,]+/).map(c => c.trim()).filter(Boolean)
        if (codes.length) {
          const rows = codes.map(code => ({ campaign_id: campaign.id, code }))
          const { error: codeError } = await supabase.from('activation_campaign_codes').insert(rows)
          if (codeError) throw new Error(`Failed to upload codes: ${codeError.message}`)
        }
      }

      // Upload per-component code pools for bundle access_code components
      if (form.fulfilmentType === 'bundle' && accessCodeComponents.length > 0) {
        for (const comp of accessCodeComponents) {
          const raw = bundleComponentCodes[comp.component_id] ?? ''
          const codes = raw.split(/[\n,]+/).map((c: string) => c.trim()).filter(Boolean)
          if (codes.length) {
            const rows = codes.map((code: string) => ({
              campaign_id: campaign.id,
              code,
              component_id: comp.component_id,
            }))
            const { error: codeError } = await supabase.from('activation_campaign_codes').insert(rows)
            if (codeError) throw new Error(`Failed to upload codes for ${comp.label}: ${codeError.message}`)
          }
        }
      }

      // Trigger AI verification (only if enabled)
      if (aiVerification) {
        supabase.functions.invoke('verify-activation-campaign', { body: { campaign_id: campaign.id } })
          .catch(console.error)
      }

      router.push(`/dashboard/campaigns/activation/${campaign.id}?submitted=1`)
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
              <h1 className="text-2xl font-bold text-gray-900">New Activation Campaign</h1>
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
                <textarea className={inputClass} rows={4} placeholder="What is the customer paying for? Be specific — this appears on your campaign page." value={form.description} onChange={e => set('description', e.target.value)} />
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
                <p className="text-xs text-gray-400 mt-1">Shown to influencers when deciding to apply, and to customers in WhatsApp before they pay. Link previews automatically in WhatsApp.</p>
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
                  {
                    id: 'open' as CampaignMode,
                    label: 'Open Activation',
                    desc: 'Any eligible member can join instantly and get their dedicated account number. Best for high-volume campaigns.',
                    badge: 'Recommended'
                  },
                  {
                    id: 'curated' as CampaignMode,
                    label: 'Curated Activation',
                    desc: 'Activators apply with a pitch. You review and approve who joins. Best for premium or sensitive campaigns.',
                    badge: 'More control'
                  }
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
                <p className="text-xs text-gray-400 mt-1">Minimum ₦3,000 required</p>
              </div>
              <div>
                <label className={labelClass}>Activator Commission (%)</label>
                <input type="number" min="10" max="80" className={inputClass} placeholder="Minimum 10%" value={form.commissionRate} onChange={e => set('commissionRate', e.target.value)} />
                <p className="text-xs text-gray-400 mt-1">Minimum 10% — higher rates attract more activators</p>
              </div>
              <div>
                <label className={labelClass}>Max Activators (optional)</label>
                <input type="number" min="1" className={inputClass} placeholder="Leave blank for unlimited" value={form.maxActivators} onChange={e => set('maxActivators', e.target.value)} />
              </div>

              {/* Live split preview */}
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

              {/* ── VTU Quick Setup Templates ── */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-amber-600" />
                  <p className="text-sm font-bold text-amber-900">Brandible VTU Quick Setup</p>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Optional</span>
                </div>
                <p className="text-xs text-amber-700">Select a template and we auto-fill the webhook, metadata and custom fields for you.</p>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'airtime'     as const, label: 'Airtime',      desc: 'Top up any network'         },
                    { id: 'data'        as const, label: 'Data Bundle',  desc: 'Mobile data plans'          },
                    { id: 'electricity' as const, label: 'Electricity',  desc: 'NEPA token top-up'          },
                    { id: 'cable_tv'    as const, label: 'Cable TV',     desc: 'DSTV, GOtv, Startimes'      },
                    { id: 'education'   as const, label: 'Education',    desc: 'WAEC, JAMB pin vending'     },
                    { id: 'bundle'      as const, label: 'Bundle Pack',  desc: 'Combine multiple products'  },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setVtuTemplate(vtuTemplate === t.id ? null : t.id)
                        setVtuNetwork(''); setVtuPlan(''); setVtuPlans([])
                        setVtuDisco(''); setVtuMeterType('')
                        setVtuCableProvider('')
                        setVtuEducationProvider('')
                        setVtuApplied(false)
                        if (t.id !== 'bundle') set('customMetadata', '')
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${vtuTemplate === t.id ? 'border-amber-500 bg-white' : 'border-amber-200 bg-white/60 hover:border-amber-400'}`}
                    >
                      <p className="text-sm font-bold text-gray-900">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>

                {/* ── Airtime config ── */}
                {vtuTemplate === 'airtime' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">Network</label>
                      <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        value={vtuNetwork} onChange={e => { setVtuNetwork(e.target.value); setVtuApplied(false) }}>
                        <option value="">Select network</option>
                        {VTU_NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* ── Data Bundle config ── */}
                {vtuTemplate === 'data' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">Network</label>
                      <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        value={vtuNetwork}
                        onChange={e => {
                          const net = VTU_NETWORKS.find(n => n.value === e.target.value)
                          setVtuNetwork(e.target.value); setVtuApplied(false)
                          if (net) fetchVtuPlans(net.dataService)
                        }}>
                        <option value="">Select network</option>
                        {VTU_NETWORKS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                      </select>
                    </div>
                    {vtuNetwork && (
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1.5">Data Plan</label>
                        {loadingPlans ? (
                          <div className="flex items-center gap-2 text-amber-700 text-sm py-2">
                            <Loader2 size={14} className="animate-spin" /> Loading plans…
                          </div>
                        ) : (
                          <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            value={vtuPlan} onChange={e => { setVtuPlan(e.target.value); setVtuApplied(false) }}>
                            <option value="">Select plan</option>
                            {vtuPlans.map(p => <option key={p.variation_code} value={p.variation_code}>{p.name} — ₦{p.variation_amount}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Electricity config ── */}
                {vtuTemplate === 'electricity' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">Electricity Provider (DISCO)</label>
                      <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        value={vtuDisco} onChange={e => { setVtuDisco(e.target.value); setVtuApplied(false) }}>
                        <option value="">Select DISCO</option>
                        {ELECTRICITY_DISCOS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    {vtuDisco && (
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1.5">Meter Type</label>
                        <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                          value={vtuMeterType} onChange={e => { setVtuMeterType(e.target.value); setVtuApplied(false) }}>
                          <option value="">Select meter type</option>
                          <option value="prepaid">Prepaid</option>
                          <option value="postpaid">Postpaid</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Cable TV config ── */}
                {vtuTemplate === 'cable_tv' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">Provider</label>
                      <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        value={vtuCableProvider}
                        onChange={e => {
                          setVtuCableProvider(e.target.value); setVtuApplied(false)
                          if (e.target.value) fetchVtuPlans(e.target.value)
                        }}>
                        <option value="">Select provider</option>
                        {CABLE_TV_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    {vtuCableProvider && (
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1.5">Package</label>
                        {loadingPlans ? (
                          <div className="flex items-center gap-2 text-amber-700 text-sm py-2">
                            <Loader2 size={14} className="animate-spin" /> Loading packages…
                          </div>
                        ) : (
                          <select className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            value={vtuPlan} onChange={e => { setVtuPlan(e.target.value); setVtuApplied(false) }}>
                            <option value="">Select package</option>
                            {vtuPlans.map(p => <option key={p.variation_code} value={p.variation_code}>{p.name} — ₦{p.variation_amount}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Education config ── */}
                {vtuTemplate === 'education' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1.5">Provider</label>
                      <select
                        className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        value={vtuEducationProvider}
                        onChange={e => {
                          const prov = EDUCATION_PROVIDERS.find(p => p.value === e.target.value)
                          setVtuEducationProvider(e.target.value)
                          setVtuPlan(''); setVtuPlans([])
                          setVtuApplied(false)
                          if (prov?.needsPlan && e.target.value) fetchVtuPlans(e.target.value)
                        }}
                      >
                        <option value="">Select provider</option>
                        {EDUCATION_PROVIDERS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    {vtuEducationProvider && (() => {
                      const prov = EDUCATION_PROVIDERS.find(p => p.value === vtuEducationProvider)
                      if (!prov?.needsPlan) return null
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1.5">Plan</label>
                          {loadingPlans ? (
                            <div className="flex items-center gap-2 text-amber-700 text-sm py-2">
                              <Loader2 size={14} className="animate-spin" /> Loading plans…
                            </div>
                          ) : (
                            <select
                              className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                              value={vtuPlan}
                              onChange={e => { setVtuPlan(e.target.value); setVtuApplied(false) }}
                            >
                              <option value="">Select plan</option>
                              {vtuPlans.map(p => (
                                <option key={p.variation_code} value={p.variation_code}>
                                  {p.name} — ₦{p.variation_amount}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )
                    })()}
                    {vtuEducationProvider === 'jamb' && (
                      <div className="flex items-start gap-2 p-3 bg-amber-100/60 rounded-xl border border-amber-200 text-xs text-amber-800">
                        <Info size={13} className="shrink-0 mt-0.5" />
                        JAMB requires a <strong>Profile ID</strong> per customer. A custom field for it will be added automatically when you apply the template.
                      </div>
                    )}
                  </div>
                )}

                {/* ── Bundle Pack config ── */}
                {vtuTemplate === 'bundle' && (
                  <div className="space-y-3">
                    {/* AI generator */}
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-amber-900">
                        Describe your bundle and AI will configure it
                      </label>
                      <textarea
                        className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                        rows={3}
                        placeholder='e.g. "Student pack with MTN 5GB data and WAEC result checker" or "Household pack with DSTV Compact, Ikeja electricity prepaid top-up and MTN airtime"'
                        value={bundleAiInput}
                        onChange={e => { setBundleAiInput(e.target.value); setBundleAiError(null) }}
                      />
                      <button
                        type="button"
                        onClick={handleGenerateBundle}
                        disabled={!bundleAiInput.trim() || bundleAiLoading}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {bundleAiLoading
                          ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                          : <><Zap size={15} /> Generate Bundle Config</>
                        }
                      </button>
                      {bundleAiError && (
                        <p className="text-xs text-red-600">{bundleAiError}</p>
                      )}
                    </div>

                    {/* Generated / editable output */}
                    {form.customMetadata && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                            Components — review and edit if needed
                          </label>
                          <textarea
                            className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                            rows={12}
                            value={form.customMetadata}
                            onChange={e => set('customMetadata', e.target.value)}
                            spellCheck={false}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1.5">
                            Customer message
                          </label>
                          <textarea
                            className="w-full border border-amber-300 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                            rows={2}
                            value={form.customerMessage}
                            onChange={e => set('customerMessage', e.target.value)}
                          />
                        </div>

                        {/* Per-component redirect URLs */}
                        {redirectComponents.length > 0 && (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2">
                              <Link2 size={14} className="text-amber-700" />
                              <p className="text-xs font-bold text-amber-900">Redirect URLs</p>
                            </div>
                            <p className="text-xs text-amber-700">
                              Customers are sent to these links immediately after payment. Paste the URL for each product below.
                            </p>
                            {redirectComponents.map((comp: any) => (
                              <div key={comp.component_id} className="bg-white border border-amber-300 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-semibold text-gray-800">{comp.label}</p>
                                <input
                                  type="url"
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  placeholder="https://..."
                                  value={bundleComponentUrls[comp.component_id] ?? ''}
                                  onChange={e => setBundleComponentUrls(prev => ({
                                    ...prev,
                                    [comp.component_id]: e.target.value,
                                  }))}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Per-component code pools for access_code type components */}
                        {accessCodeComponents.length > 0 && (
                          <div className="space-y-3 pt-1">
                            <div className="flex items-center gap-2">
                              <KeyRound size={14} className="text-amber-700" />
                              <p className="text-xs font-bold text-amber-900">Upload Access Codes</p>
                            </div>
                            <p className="text-xs text-amber-700">
                              These components deliver unique codes to each customer. Paste one code per line for each product below.
                            </p>
                            {accessCodeComponents.map((comp: any) => {
                              const count = (bundleComponentCodes[comp.component_id] ?? '')
                                .split(/[\n,]+/).filter((c: string) => c.trim()).length
                              return (
                                <div key={comp.component_id} className="bg-white border border-amber-300 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-800">{comp.label}</p>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                      {count} code{count !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  <textarea
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                                    rows={4}
                                    placeholder={'CODE001\nCODE002\nCODE003'}
                                    value={bundleComponentCodes[comp.component_id] ?? ''}
                                    onChange={e => setBundleComponentCodes(prev => ({
                                      ...prev,
                                      [comp.component_id]: e.target.value,
                                    }))}
                                  />
                                  {comp.redemption_url && (
                                    <p className="text-[10px] text-gray-400">Redeemed at: {comp.redemption_url}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Margin Calculator (data & cable TV — fixed plan costs) ── */}
                {(vtuTemplate === 'data' || vtuTemplate === 'cable_tv') && vtuPlan && (() => {
                  const plan          = vtuPlans.find(p => p.variation_code === vtuPlan)
                  const vtpassCost    = parseFloat(plan?.variation_amount ?? '0') || 0
                  const sellingPrice  = parseFloat(form.priceNgn) || 0
                  const commRate      = parseFloat(form.commissionRate) || 10
                  const grossMargin   = sellingPrice - vtpassCost
                  const commission    = Math.floor(sellingPrice * (commRate / 100))
                  const platformFee   = Math.floor(sellingPrice * 0.03)
                  const netPerSale    = grossMargin - commission - platformFee
                  const healthy       = netPerSale > 0
                  const fmt           = (n: number) => `₦${Math.abs(n).toLocaleString('en-NG')}`

                  if (!sellingPrice) return (
                    <div className="text-xs text-amber-700 p-3 bg-amber-100/50 rounded-xl border border-amber-200">
                      ℹ Set your selling price in Step 3 to see your margin breakdown here.
                    </div>
                  )

                  return (
                    <div className={`rounded-xl p-4 space-y-2 border ${healthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Margin Calculator</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">VTpass cost</span>
                          <span className="font-semibold text-gray-700">{fmt(vtpassCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Your selling price</span>
                          <span className="font-semibold text-gray-700">{fmt(sellingPrice)}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1.5">
                          <span className="text-gray-500">Gross margin</span>
                          <span className={`font-bold ${grossMargin >= 0 ? 'text-gray-700' : 'text-red-600'}`}>{grossMargin < 0 ? '-' : ''}{fmt(grossMargin)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Activator commission ({commRate}%)</span>
                          <span className="text-gray-500 font-medium">- {fmt(commission)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Platform fee (3%)</span>
                          <span className="text-gray-500 font-medium">- {fmt(platformFee)}</span>
                        </div>
                        <div className={`flex justify-between border-t pt-1.5 ${healthy ? 'border-green-200' : 'border-red-200'}`}>
                          <span className="font-bold text-gray-800">Your net per sale</span>
                          <span className={`font-black text-base ${healthy ? 'text-green-600' : 'text-red-600'}`}>
                            {netPerSale < 0 ? '-' : ''}{fmt(netPerSale)}
                          </span>
                        </div>
                      </div>
                      {!healthy && (
                        <p className="text-xs text-red-600 font-semibold pt-1">
                          ⚠ Selling price too low — increase it in Step 3 or reduce the commission rate.
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* ── Airtime & electricity cost note ── */}
                {(vtuTemplate === 'airtime' || vtuTemplate === 'electricity') && (vtuNetwork || vtuDisco) && (() => {
                  const sellingPrice = parseFloat(form.priceNgn) || 0
                  const commRate     = parseFloat(form.commissionRate) || 10
                  if (!sellingPrice) return (
                    <div className="text-xs text-amber-700 p-3 bg-amber-100/50 rounded-xl border border-amber-200">
                      ℹ Set your selling price in Step 3 to see a cost breakdown here.
                    </div>
                  )
                  const commission  = Math.floor(sellingPrice * (commRate / 100))
                  const platformFee = Math.floor(sellingPrice * 0.03)
                  const fmt         = (n: number) => `₦${n.toLocaleString('en-NG')}`
                  return (
                    <div className="text-xs text-amber-800 p-3 bg-amber-100/50 rounded-xl border border-amber-200 space-y-1">
                      <p className="font-bold">💡 Pricing note</p>
                      <p>VTpass charges the exact face value you set as the selling price. Set your price above the face value to make a margin.</p>
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Activator commission ({commRate}%)</span><span>- {fmt(commission)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Platform fee (3%)</span><span>- {fmt(platformFee)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-amber-300 pt-1">
                          <span>Deductions per sale</span><span>- {fmt(commission + platformFee)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* ── Apply button ── */}
                {vtuTemplate && (
                  (() => {
                    const eduProv = EDUCATION_PROVIDERS.find(p => p.value === vtuEducationProvider)
                    const bundleValid = (() => {
                      if (vtuTemplate !== 'bundle') return false
                      try {
                        const parsed = JSON.parse(form.customMetadata || '[]')
                        return Array.isArray(parsed) && parsed.length > 0
                      } catch { return false }
                    })()
                    const ready =
                      (vtuTemplate === 'airtime'     && vtuNetwork) ||
                      (vtuTemplate === 'data'        && vtuNetwork && vtuPlan) ||
                      (vtuTemplate === 'electricity' && vtuDisco && vtuMeterType) ||
                      (vtuTemplate === 'cable_tv'    && vtuCableProvider && vtuPlan) ||
                      (vtuTemplate === 'education'   && vtuEducationProvider && (!eduProv?.needsPlan || vtuPlan)) ||
                      bundleValid
                    if (!ready) return null
                    return vtuApplied ? (
                      <div className="flex items-center gap-2 text-green-700 text-sm p-3 bg-green-50 border border-green-200 rounded-xl">
                        <CheckCircle2 size={15} className="shrink-0" />
                        Template applied — webhook, metadata and custom field configured
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => applyVtuTemplate(vtuTemplate!, {
                          network: vtuNetwork, plan: vtuPlan,
                          disco: vtuDisco, meterType: vtuMeterType,
                          cableProvider: vtuCableProvider,
                          educationProvider: vtuEducationProvider,
                        })}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap size={15} /> Apply Template
                      </button>
                    )
                  })()
                )}
              </div>

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

              {/* Type-specific config */}
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
                    <div>
                      <label className={labelClass}>Access Codes (one per line or comma-separated)</label>
                      <textarea className={inputClass} rows={5} placeholder={'CODE001\nCODE002\nCODE003'} value={form.accessCodes} onChange={e => set('accessCodes', e.target.value)} />
                      <p className="text-xs text-gray-400 mt-1">
                        {form.accessCodes.split(/[\n,]+/).filter(c => c.trim()).length} codes pasted
                      </p>
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
                        <button onClick={() => set('fileUrl', '')} className="ml-auto text-xs text-red-500 hover:underline">Remove</button>
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
                  <>
                    <div>
                      <label className={labelClass}>Portal / Login URL</label>
                      <input className={inputClass} placeholder="https://app.yourservice.com/login" value={form.portalUrl} onChange={e => set('portalUrl', e.target.value)} />
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">You will provide sample credentials in the next step for verification. The template for generating unique credentials per customer is handled via your fulfilment config.</p>
                    </div>
                  </>
                )}

                {form.fulfilmentType === 'brand_webhook' && (
                  <div className="space-y-5">
                    {/* Webhook URL */}
                    <div>
                      <label className={labelClass}>Webhook URL <span className="text-red-500">*</span></label>
                      <input
                        className={inputClass}
                        placeholder="https://yourapi.com/webhooks/brandible"
                        value={form.webhookUrl}
                        onChange={e => set('webhookUrl', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Brandible will POST payment details here after each confirmed sale. Must respond with HTTP 200 and <code className="bg-gray-100 px-1 rounded">{'{"status":"success"}'}</code></p>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className={labelClass}>Webhook Secret (optional)</label>
                      <input
                        className={inputClass}
                        placeholder="A secret string your server uses to verify requests"
                        value={form.webhookSecret}
                        onChange={e => set('webhookSecret', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">We sign every request with HMAC-SHA256. Read the <code className="bg-gray-100 px-1 rounded">X-Brandible-Signature</code> header on your server to verify authenticity.</p>
                    </div>

                    {/* Test Webhook */}
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
                          {webhookTestResult.ok
                            ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                            : <AlertCircle size={15} className="shrink-0 mt-0.5" />
                          }
                          <span className="font-mono text-xs">{webhookTestResult.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Customer Message */}
                    <div>
                      <label className={labelClass}>Customer Message</label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        placeholder="Your subscription is being activated. You will receive a confirmation shortly."
                        value={form.customerMessage}
                        onChange={e => set('customerMessage', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Shown to the customer on the payment page after their transfer is confirmed.</p>
                    </div>

                    {/* Custom Metadata */}
                    <div>
                      <label className={labelClass}>Custom Metadata (optional)</label>
                      <textarea
                        className={`${inputClass} font-mono text-xs`}
                        rows={3}
                        placeholder={'{\n  "product_id": "health360_monthly",\n  "plan": "basic"\n}'}
                        value={form.customMetadata}
                        onChange={e => set('customMetadata', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Extra key-value pairs sent in every webhook call under the <code className="bg-gray-100 px-1 rounded">metadata</code> field. Must be valid JSON.</p>
                    </div>

                    {/* Custom Fields Builder */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <label className={labelClass + ' mb-0'}>Custom Contact Fields (optional)</label>
                          <p className="text-xs text-gray-400 mt-0.5">Fields customers must fill before paying (e.g. mobile network, state, membership number)</p>
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
                          No custom fields — customers will only provide name, email, and phone
                        </div>
                      )}

                      <div className="space-y-3">
                        {customFields.map((field, i) => (
                          <div key={i} className="p-3 border border-gray-200 rounded-xl space-y-2 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-500">Field {i + 1}</span>
                              <button
                                type="button"
                                onClick={() => setCustomFields(f => f.filter((_, j) => j !== i))}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
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
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Label (shown to customer)</label>
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

          {/* ── Step 5: Verification Sample ── */}
          {step === 5 && (
            <>
              <h2 className="font-bold text-gray-900 text-lg">Verification</h2>

              {/* AI Verification toggle */}
              <div
                onClick={() => setAiVerification(v => !v)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${aiVerification ? 'border-brand bg-brand/5' : 'border-gray-200 bg-gray-50'}`}
              >
                <div>
                  <p className="text-sm font-bold text-gray-900">AI Verification</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {aiVerification
                      ? 'Campaign will be reviewed by AI agent before going live'
                      : 'Campaign goes live immediately on submit — skip AI review'}
                  </p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${aiVerification ? 'bg-brand' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${aiVerification ? 'left-5' : 'left-0.5'}`} />
                </div>
              </div>

              {form.fulfilmentType === 'brand_webhook' ? (
                <>
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                    <Webhook size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-rose-900">Webhook verification — no sample needed</p>
                      <p className="text-sm text-rose-700 mt-0.5">Our AI verification agent will send a test POST request directly to your webhook URL and check that it responds with HTTP 200 and <code className="bg-rose-100 px-1 rounded">{'{"status":"success"}'}</code>. Make sure your endpoint is live before submitting.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">What the agent will verify:</p>
                    {[
                      'Your webhook URL is reachable and accepts POST requests',
                      'The endpoint responds within 30 seconds',
                      'Response body contains { "status": "success" }',
                      'Campaign description matches the product being sold',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-green-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Example test payload your endpoint will receive</p>
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{JSON.stringify({
                      event: 'activation.payment.confirmed',
                      is_test: true,
                      campaign_id: 'test-campaign-id',
                      customer_email: 'test@brandiblebms.com',
                      customer_phone: '+2348000000000',
                      customer_name: 'Brandible Test',
                      amount_kobo: 500000,
                      payment_reference: 'brandible_test_1234567890',
                      extra_fields: {},
                      metadata: {},
                      timestamp: new Date().toISOString(),
                    }, null, 2)}</pre>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Why is this needed?</p>
                      <p className="text-sm text-blue-700 mt-0.5">Our AI agent will verify your campaign works before it goes live. Provide a working test sample — it is used only for verification and deleted after review.</p>
                    </div>
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
                <p className="text-xs text-gray-500">Verification usually completes within a few minutes. Your campaign stays in draft until approved. You will be notified by email once reviewed.</p>
              </div>
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
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
              {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <><Zap size={16} /> {aiVerification ? 'Submit for Verification' : 'Launch Campaign'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
