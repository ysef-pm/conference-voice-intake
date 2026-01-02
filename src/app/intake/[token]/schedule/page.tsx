'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Calendar, Clock, Download, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface AttendeeData {
  attendee: {
    id: string
    name: string | null
    email: string
    status: string
  }
  event: {
    name: string
  }
}

export default function SchedulePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [data, setData] = useState<AttendeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [timezone, setTimezone] = useState('')

  // Detect user's timezone
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/intake/${token}`)
        if (!response.ok) {
          throw new Error('Failed to load attendee data')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [token])

  // Set default date to tomorrow and time to 10:00
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDate(tomorrow.toISOString().split('T')[0])
    setTime('10:00')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) return

    setSubmitting(true)
    setError(null)

    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

      const response = await fetch(`/api/intake/${token}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduledAt }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to schedule')
      }

      setScheduled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadICS = () => {
    // Open the ICS file download in a new window
    window.open(`/api/intake/${token}/calendar`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link href={`/intake/${token}`}>
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (scheduled) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              You&apos;re all set!
            </h2>

            <p className="text-gray-400 mb-6">
              We&apos;ve scheduled your time to share your interests for {data?.event.name}.
              Add it to your calendar so you don&apos;t forget.
            </p>

            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-white">
                <Calendar className="w-5 h-5 text-pink-500" />
                <span className="font-medium">
                  {new Date(`${date}T${time}`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-400 mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(`${date}T${time}`).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <Button
              onClick={handleDownloadICS}
              className="w-full bg-pink-500 hover:bg-pink-600 mb-3"
            >
              <Download className="w-4 h-4 mr-2" />
              Add to Calendar
            </Button>

            <Link href={`/intake/${token}`}>
              <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:text-white">
                Or start now instead
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-pink-500 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-white text-2xl">Schedule for Later</CardTitle>
          <CardDescription className="text-gray-400">
            Pick a time that works for you to share your interests for {data?.event.name}.
            It only takes about 3 minutes.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-gray-300">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-gray-300">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
              {timezone && (
                <p className="text-xs text-gray-500">
                  Times are in your local timezone ({timezone})
                </p>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600"
              disabled={submitting || !date || !time}
            >
              {submitting ? 'Scheduling...' : 'Schedule Reminder'}
            </Button>

            <Link href={`/intake/${token}`}>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to options
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
