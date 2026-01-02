import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - verify user owns the organization
    const { data: event } = await supabase
      .from('events')
      .select('organization_id, organizations!inner(owner_id)')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const organization = event.organizations as unknown as { owner_id: string }
    if (organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch responses with attendee info for this event
    const { data: responses, error } = await supabase
      .from('responses')
      .select(`
        *,
        attendee:attendees!inner (
          id,
          email,
          name,
          event_id,
          completed_at
        )
      `)
      .eq('attendee.event_id', eventId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json({ error: 'No responses found for this event' }, { status: 404 })
    }

    // Build CSV content
    const headers = ['attendee_email', 'attendee_name', 'topics', 'mode', 'completed_at']
    const csvRows: string[] = [headers.join(',')]

    responses.forEach((response) => {
      const attendee = response.attendee as {
        email: string
        name: string | null
        completed_at: string | null
      }

      const topics = (response.topics || []).join('; ')
      const completedAt = attendee.completed_at
        ? new Date(attendee.completed_at).toISOString()
        : ''

      // Escape fields that might contain commas or quotes
      const escapeCSV = (value: string): string => {
        if (!value) return ''

        // Prevent CSV injection - prefix dangerous characters with single quote
        if (/^[=+\-@\t\r]/.test(value)) {
          value = "'" + value
        }

        // Escape quotes and wrap in quotes if contains special characters
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      const row = [
        escapeCSV(attendee.email || ''),
        escapeCSV(attendee.name || ''),
        escapeCSV(topics),
        escapeCSV(response.mode || ''),
        escapeCSV(completedAt)
      ]

      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-${eventId}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export analytics error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    )
  }
}
