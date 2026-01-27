'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Attendee, Event } from '@/types/database'
import { CSVUpload } from '@/components/dashboard/CSVUpload'
import { AttendeeTable } from '@/components/dashboard/AttendeeTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, CheckCircle, AlertCircle, MessageCircle, Send } from 'lucide-react'

export default function AttendeesPage() {
  const params = useParams()
  const eventId = params.id as string
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [event, setEvent] = useState<Pick<Event, 'id' | 'name' | 'outreach_channel'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [outreachResult, setOutreachResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const supabase = createClient()

  const fetchEventAndAttendees = async () => {
    setLoading(true)

    // Fetch event to get outreach_channel
    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, outreach_channel')
      .eq('id', eventId)
      .single()

    setEvent(eventData)

    // Fetch attendees
    const { data: attendeesData } = await supabase
      .from('attendees')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setAttendees(attendeesData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchEventAndAttendees()
  }, [eventId])

  // Count attendees with 'imported' status
  const importedCount = attendees.filter(a => a.status === 'imported').length
  const channel = event?.outreach_channel || 'email'

  const handleSendOutreach = async () => {
    setSending(true)
    setOutreachResult(null)

    const results: string[] = []
    const errors: string[] = []

    try {
      // Send emails if channel is 'email' or 'both'
      if (channel === 'email' || channel === 'both') {
        const emailResponse = await fetch(`/api/events/${eventId}/send-emails`, {
          method: 'POST',
        })
        const emailResult = await emailResponse.json()

        if (!emailResponse.ok) {
          errors.push(emailResult.error || 'Failed to send emails')
        } else {
          results.push(emailResult.message)
        }
      }

      // Send WhatsApp messages if channel is 'whatsapp' or 'both'
      if (channel === 'whatsapp' || channel === 'both') {
        const whatsappResponse = await fetch(`/api/events/${eventId}/send-whatsapp`, {
          method: 'POST',
        })
        const whatsappResult = await whatsappResponse.json()

        if (!whatsappResponse.ok) {
          errors.push(whatsappResult.error || 'Failed to send WhatsApp messages')
        } else {
          results.push(whatsappResult.message)
        }
      }

      // Build combined result message
      if (errors.length > 0 && results.length === 0) {
        throw new Error(errors.join('; '))
      } else if (errors.length > 0) {
        setOutreachResult({
          type: 'success',
          message: `${results.join('; ')} (Warning: ${errors.join('; ')})`
        })
      } else {
        setOutreachResult({
          type: 'success',
          message: results.join('; ')
        })
      }

      // Refresh attendee list to show updated statuses
      await fetchEventAndAttendees()
    } catch (err) {
      setOutreachResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send outreach'
      })
    } finally {
      setSending(false)
    }
  }

  // Get the appropriate icon and label for the channel
  const getChannelInfo = () => {
    switch (channel) {
      case 'email':
        return { icon: Mail, label: 'Email' }
      case 'whatsapp':
        return { icon: MessageCircle, label: 'WhatsApp' }
      case 'both':
        return { icon: Send, label: 'Email + WhatsApp' }
      default:
        return { icon: Mail, label: 'Email' }
    }
  }

  const channelInfo = getChannelInfo()
  const ChannelIcon = channelInfo.icon

  // Clear outreach result after 5 seconds
  useEffect(() => {
    if (outreachResult) {
      const timer = setTimeout(() => setOutreachResult(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [outreachResult])

  return (
    <div className="space-y-6">
      {/* CSV Upload and Send Outreach row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CSVUpload eventId={eventId} onUploadComplete={fetchEventAndAttendees} />

        {/* Send Outreach Card */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center flex flex-col justify-center">
          <ChannelIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Send Outreach ({channelInfo.label})</h3>
          <p className="text-sm text-gray-400 mb-4">
            {importedCount > 0
              ? `Send intake invitations via ${channelInfo.label.toLowerCase()} to ${importedCount} imported attendee${importedCount !== 1 ? 's' : ''}`
              : 'Import attendees first, then send them intake invitations'
            }
          </p>

          {/* Outreach Result Message */}
          {outreachResult && (
            <div className={`mb-4 p-3 rounded-lg flex items-center justify-center gap-2 ${
              outreachResult.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            }`}>
              {outreachResult.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{outreachResult.message}</span>
            </div>
          )}

          <Button
            onClick={handleSendOutreach}
            disabled={sending || importedCount === 0}
            className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <ChannelIcon className="w-4 h-4 mr-2" />
                Send Outreach ({importedCount})
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
