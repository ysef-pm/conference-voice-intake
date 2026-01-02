'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Attendee } from '@/types/database'
import { CSVUpload } from '@/components/dashboard/CSVUpload'
import { AttendeeTable } from '@/components/dashboard/AttendeeTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function AttendeesPage() {
  const params = useParams()
  const eventId = params.id as string
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingEmails, setSendingEmails] = useState(false)
  const [emailResult, setEmailResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
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

  // Count attendees with 'imported' status
  const importedCount = attendees.filter(a => a.status === 'imported').length

  const handleSendEmails = async () => {
    setSendingEmails(true)
    setEmailResult(null)

    try {
      const response = await fetch(`/api/events/${eventId}/send-emails`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send emails')
      }

      setEmailResult({
        type: 'success',
        message: result.message
      })

      // Refresh attendee list to show updated statuses
      await fetchAttendees()
    } catch (err) {
      setEmailResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send emails'
      })
    } finally {
      setSendingEmails(false)
    }
  }

  // Clear email result after 5 seconds
  useEffect(() => {
    if (emailResult) {
      const timer = setTimeout(() => setEmailResult(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [emailResult])

  return (
    <div className="space-y-6">
      {/* CSV Upload and Send Emails row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CSVUpload eventId={eventId} onUploadComplete={fetchAttendees} />

        {/* Send Emails Card */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center flex flex-col justify-center">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Send Outreach Emails</h3>
          <p className="text-sm text-gray-400 mb-4">
            {importedCount > 0
              ? `Send intake invitation emails to ${importedCount} imported attendee${importedCount !== 1 ? 's' : ''}`
              : 'Import attendees first, then send them intake invitation emails'
            }
          </p>

          {/* Email Result Message */}
          {emailResult && (
            <div className={`mb-4 p-3 rounded-lg flex items-center justify-center gap-2 ${
              emailResult.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            }`}>
              {emailResult.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{emailResult.message}</span>
            </div>
          )}

          <Button
            onClick={handleSendEmails}
            disabled={sendingEmails || importedCount === 0}
            className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50"
          >
            {sendingEmails ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Emails...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Emails ({importedCount})
              </>
            )}
          </Button>
        </div>
      </div>

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
