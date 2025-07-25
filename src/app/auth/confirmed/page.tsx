'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

function ConfirmedContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is now authenticated
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session check error:', error)
          setError('Failed to verify authentication status')
          setIsLoading(false)
          return
        }

        if (session?.user) {
          // User is authenticated, we can redirect after a brief delay
          setTimeout(() => {
            router.push(next)
          }, 2000)
        } else {
          // No session found, something went wrong
          setError('Authentication session not found. Please try logging in.')
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error('Auth check error:', err)
        setError('An unexpected error occurred')
        setIsLoading(false)
      }
    }

    checkAuthAndRedirect()
  }, [next, router])

  const handleContinue = () => {
    router.push(next)
  }

  const handleBackToLogin = () => {
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
            <CardTitle>Confirming your email...</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Please wait while we verify your email confirmation.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl">✕</span>
            </div>
            <CardTitle className="text-red-600">Confirmation Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CardDescription className="text-center">
              {error}
            </CardDescription>
            <Button 
              onClick={handleBackToLogin}
              className="w-full"
              variant="outline"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
          <CardTitle className="text-green-600">Email Confirmed!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-center">
            Your email has been successfully confirmed. You can now access your account and start managing your expenses.
          </CardDescription>
          
          <div className="text-center text-sm text-gray-500">
            Redirecting you to the dashboard in a moment...
          </div>
          
          <Button 
            onClick={handleContinue}
            className="w-full"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 text-blue-600 mx-auto animate-spin" />
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Please wait...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    }>
      <ConfirmedContent />
    </Suspense>
  )
} 