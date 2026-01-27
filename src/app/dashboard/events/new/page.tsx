'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewEventPage() {
  const [name, setName] = useState('')
  const [outreachChannel, setOutreachChannel] = useState<'email' | 'whatsapp' | 'both'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get user's organization
    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user?.id)
      .single()

    if (!org) {
      setError('Organization not found')
      setLoading(false)
      return
    }

    // Create slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Default questions
    const defaultQuestions = [
      { id: '1', field: 'whyJoining', label: 'Why are you joining this conference?', order: 0 },
      { id: '2', field: 'aboutYourself', label: 'Tell us about yourself and what you do', order: 1 },
      { id: '3', field: 'challenges', label: 'What challenges would you like to discuss?', order: 2 },
    ]

    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        organization_id: org.id,
        name,
        slug,
        questions: defaultQuestions,
        status: 'draft',
        outreach_channel: outreachChannel,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/events/${event.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SaaSiest 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Outreach Channel</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outreachChannel"
                    value="email"
                    checked={outreachChannel === 'email'}
                    onChange={() => setOutreachChannel('email')}
                    className="text-pink-500"
                  />
                  <span className="text-gray-300">Email only</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outreachChannel"
                    value="whatsapp"
                    checked={outreachChannel === 'whatsapp'}
                    onChange={() => setOutreachChannel('whatsapp')}
                    className="text-pink-500"
                  />
                  <span className="text-gray-300">WhatsApp only</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="outreachChannel"
                    value="both"
                    checked={outreachChannel === 'both'}
                    onChange={() => setOutreachChannel('both')}
                    className="text-pink-500"
                  />
                  <span className="text-gray-300">Both (sends to all available contacts)</span>
                </label>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-pink-500 hover:bg-pink-600"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
