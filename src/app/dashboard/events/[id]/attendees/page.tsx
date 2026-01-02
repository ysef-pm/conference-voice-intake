'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Attendee } from '@/types/database'
import { CSVUpload } from '@/components/dashboard/CSVUpload'
import { AttendeeTable } from '@/components/dashboard/AttendeeTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AttendeesPage() {
  const params = useParams()
  const eventId = params.id as string
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAttendees = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setAttendees(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAttendees()
  }, [eventId])

  return (
    <div className="space-y-6">
      <CSVUpload eventId={eventId} onUploadComplete={fetchAttendees} />

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Attendees ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : attendees.length > 0 ? (
            <AttendeeTable attendees={attendees} />
          ) : (
            <p className="text-gray-400">No attendees yet. Import a CSV to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
