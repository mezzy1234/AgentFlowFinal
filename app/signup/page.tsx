'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { EyeIcon, EyeSlashIcon, UserIcon, CodeBracketIcon } from '@heroicons/react/24/outline'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SignUpPage() {
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'customer' | 'developer' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'customer' || roleParam === 'developer') {
      setSelectedRole(roleParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedRole) {
      toast.error('Please select your role')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setLoading(true)
      await signUp(formData.email, formData.password)
      
      // Redirect based on selected role
      if (selectedRole === 'customer') {
        router.push('/customer-dashboard')
      } else if (selectedRole === 'developer') {
        router.push('/dev-dashboard')
      } else {
        router.push('/dashboard-router')
      }
    } catch (error) {
      // Error is handled in AuthProvider
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    if (!selectedRole) {
      toast.error('Please select your role first')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Join thousands automating their business
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Role Selection */}
            {!selectedRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  How will you use AgentFlow?
                </label>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className="flex items-center p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <UserIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Customer</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">I want to use AI agents for my business</p>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedRole('developer')}
                    className="flex items-center p-4 border-2 border-gray-300 rounded-lg hover:border-purple-500 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                      <CodeBracketIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">Developer</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">I want to build and sell AI agents</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {selectedRole && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {selectedRole === 'customer' ? (
                      <UserIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <CodeBracketIcon className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      Selected: <strong>{selectedRole === 'customer' ? 'Customer' : 'Developer'}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(null)}
                    className="ml-auto text-green-600 hover:text-green-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Email */}
            {selectedRole && (
              <>
                {/* Google OAuth Button */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? 'Connecting...' : `Continue with Google`}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">Or continue with email</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input mt-1"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {/* Password */}
            {selectedRole && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="input pr-10"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password */}
            {selectedRole && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="input mt-1"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {/* Terms */}
          {selectedRole && (
            <div className="flex items-center">
              <input
                id="agree-terms"
                name="agree-terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                I agree to the{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>
          )}

          {/* Submit Button */}
          {selectedRole && (
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-base"
              >
                {loading ? 'Creating account...' : `Create ${selectedRole} account`}
              </button>
            </div>
          )}

          {/* Sign In Link */}
          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/signin" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </span>
          </div>
        </form>

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p className="mb-2">What you get:</p>
            <div className="space-y-1">
              <p>✓ Access to 1,000+ integrations</p>
              <p>✓ Pre-built automation agents</p>
              <p>✓ Secure credential management</p>
              <p>✓ Enterprise-grade security</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
