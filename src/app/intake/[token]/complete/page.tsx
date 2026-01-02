'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Users, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface AttendeeData {
  id: string
  name: string | null
  email: string
  eventName: string
  matchingConsent: boolean
}

export default function CompletePage() {
  const params = useParams()
  const token = params.token as string

  const [attendeeData, setAttendeeData] = useState<AttendeeData | null>(null)
  const [matchingConsent, setMatchingConsent] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch attendee data on mount
  useEffect(() => {
    const fetchAttendee = async () => {
      try {
        const response = await fetch(`/api/intake/${token}`)
        if (response.ok) {
          const data = await response.json()
          setAttendeeData({
            id: data.attendee.id,
            name: data.attendee.name,
            email: data.attendee.email,
            eventName: data.event.name,
            matchingConsent: data.attendee.matching_consent ?? true,
          })
          setMatchingConsent(data.attendee.matching_consent ?? true)
        } else {
          setError('Unable to load your information')
        }
      } catch {
        setError('Unable to load your information')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAttendee()
  }, [token])

  const handleConsentChange = async (checked: boolean) => {
    setMatchingConsent(checked)
    setIsSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/intake/${token}/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchingConsent: checked }),
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        // Revert on error
        setMatchingConsent(!checked)
        setError('Failed to save preference')
      }
    } catch {
      setMatchingConsent(!checked)
      setError('Failed to save preference')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (error && !attendeeData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 left-0 right-0 mx-auto w-fit">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Thank You Message */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Thank you{attendeeData?.name ? `, ${attendeeData.name}` : ''}!
        </h1>

        <p className="text-xl text-gray-300 mb-2">
          Your profile is complete
        </p>

        <p className="text-gray-500 mb-8">
          We&apos;ve received your responses for {attendeeData?.eventName}.
        </p>

        {/* What Happens Next Section */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 mb-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              What happens next?
            </h2>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Our AI will analyze your responses and find attendees with similar interests and goals.
            You&apos;ll receive an email introduction when we find a great match!
          </p>

          {/* Matching Consent Checkbox */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
            <div className="flex items-start gap-3">
              <Checkbox
                id="matching-consent"
                checked={matchingConsent}
                onCheckedChange={(checked) => handleConsentChange(checked as boolean)}
                disabled={isSaving}
                className="mt-0.5 border-gray-600 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
              />
              <div className="flex-1">
                <Label
                  htmlFor="matching-consent"
                  className="text-sm font-medium text-white cursor-pointer"
                >
                  I want to be matched with other attendees
                </Label>
                <p className="text-xs text-gray-500 mt-1">
                  Allow us to share your profile summary with potential matches and send introduction emails.
                </p>
              </div>
            </div>
            {saved && (
              <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Preference saved
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full bg-pink-500 hover:bg-pink-600 text-white"
            onClick={() => window.close()}
          >
            Close this page
          </Button>

          <p className="text-xs text-gray-600">
            You can safely close this tab. We&apos;ll be in touch soon!
          </p>
        </div>
      </div>

      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
