'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  async function handleSubmit(formData: FormData) {
    setError(null)
    setLoading(true)
    
    try {
      const result = await login(formData)
      if (!result.success) {
        setError(result.error || 'An error occurred')
      }
    } catch {
      // Redirect happens on success, so if we get here it's an error
      // unless it's the redirect itself
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-3xl font-light tracking-tight text-gray-900">libt</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to your account</p>
        </div>
        
        {/* Form */}
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          
          <Input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
          />
          
          <Input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
          />
          
          <Button type="submit" className="w-full" loading={loading}>
            Sign in
          </Button>
        </form>
        
        {/* Register link */}
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-gray-900 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
