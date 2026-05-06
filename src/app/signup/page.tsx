'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, Building2, Globe, Briefcase, Eye, EyeOff, User, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const INDUSTRIES = [
  'Fashion & Apparel', 'Technology', 'Beauty & Cosmetics', 'Food & Beverage',
  'Health & Wellness', 'Finance', 'Education', 'Entertainment', 'Travel & Hospitality',
  'Real Estate', 'Automotive', 'Sports & Fitness', 'Home & Garden', 'Other',
]

export default function SignUpPage() {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<{ checking: boolean; available: boolean | null; message: string }>({ checking: false, available: null, message: '' })
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    companyName: '',
    industry: '',
    website: '',
  })

  // Debounced username check
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' })
      return
    }
    if (formData.username.includes('brandible')) {
      setUsernameStatus({ checking: false, available: false, message: 'This username is reserved' })
      return
    }
    const timer = setTimeout(async () => {
      setUsernameStatus(prev => ({ ...prev, checking: true }))
      const { data } = await supabase.from('profiles').select('username').eq('username', formData.username).maybeSingle()
      setUsernameStatus({
        checking: false,
        available: !data,
        message: data ? 'Username is already taken' : 'Username is available',
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.username])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const processed = name === 'username' ? value.toLowerCase().replace(/[^a-z0-9_]/g, '') : value
    setFormData(prev => ({ ...prev, [name]: processed }))
  }

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields'); return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters'); return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); return false
    }
    setError(null); return true
  }

  const validateStep2 = () => {
    if (!formData.fullName || !formData.username || !formData.companyName || !formData.industry) {
      setError('Please fill in all required fields'); return false
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters'); return false
    }
    if (usernameStatus.available === false) {
      setError('This username is already taken'); return false
    }
    if (usernameStatus.checking) {
      setError('Please wait while we check username availability'); return false
    }
    setError(null); return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            username: formData.username.toLowerCase().trim(),
            user_type: 'brand',
            company_name: formData.companyName,
            industry: formData.industry,
            website: formData.website || null,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Signup failed')

      router.push('/login?message=Account created! Please check your email to verify your account.')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8 glass-card p-10 rounded-2xl">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-2xl mb-4">
            <img src="/logo.png" alt="brandible" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Partner with us</h2>
          <p className="mt-2 text-sm text-gray-600">Create your brand account in minutes</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-2 w-12 rounded-full transition-all ${step >= s ? 'bg-brand' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={step === 1 ? (e) => { e.preventDefault(); if (validateStep1()) setStep(2) } : handleSignUp}>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="email" type="email" required placeholder="Business Email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.email} onChange={handleChange} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="password" type={showPassword ? 'text' : 'password'} required placeholder="Password"
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.password} onChange={handleChange} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} required placeholder="Confirm Password"
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.confirmPassword} onChange={handleChange} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white brand-gradient hover:opacity-90 transition-all">
                Next Step
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="fullName" type="text" required placeholder="Full Name"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.fullName} onChange={handleChange} />
              </div>
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input name="username" type="text" required placeholder="Username"
                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all ${
                      usernameStatus.available === true ? 'border-green-400 bg-green-50' :
                      usernameStatus.available === false ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.username} onChange={handleChange} />
                  <div className="absolute right-3 top-3">
                    {usernameStatus.checking && <Loader2 size={20} className="animate-spin text-gray-400" />}
                    {!usernameStatus.checking && usernameStatus.available === true && <CheckCircle size={20} className="text-green-500" />}
                    {!usernameStatus.checking && usernameStatus.available === false && <XCircle size={20} className="text-red-500" />}
                  </div>
                </div>
                {usernameStatus.message && (
                  <p className={`text-xs mt-1 ${usernameStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameStatus.message}
                  </p>
                )}
                {formData.username.length > 0 && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-xs font-semibold text-indigo-800">Your Brand Shop URL:</p>
                    <p className="text-xs text-indigo-600 font-medium truncate">shop.brandiblebms.com/{formData.username}/wall</p>
                  </div>
                )}
              </div>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="companyName" type="text" required placeholder="Company Name"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.companyName} onChange={handleChange} />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select name="industry" required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all appearance-none bg-white"
                  value={formData.industry} onChange={handleChange}>
                  <option value="">Select Industry</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input name="website" type="url" placeholder="Website (Optional)"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                  value={formData.website} onChange={handleChange} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep(1); setError(null) }}
                  className="flex-1 py-3 px-4 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 hover:bg-gray-50 transition-all">
                  Back
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white brand-gradient hover:opacity-90 transition-all disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand hover:text-brand-dark transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
