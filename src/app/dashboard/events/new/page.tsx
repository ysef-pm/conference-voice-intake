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
