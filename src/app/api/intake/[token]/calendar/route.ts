import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * Formats a Date to ICS datetime format (UTC)
 * Format: YYYYMMDDTHHMMSSZ
 */
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/**
 * Escapes special characters in ICS text fields
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  try {
    // Fetch attendee with event data
    const { data: attendee, error: findError } = await supabase
      .from('attendees')
      .select('id, scheduled_at, events!inner(name)')
      .eq('token', token)
      .single()

    if (findError || !attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      )
    }

    if (!attendee.scheduled_at) {
      return NextResponse.json(
        { error: 'No scheduled time found. Please schedule first.' },
        { status: 400 }
      )
    }

    // Extract event - Supabase returns it as an object when using !inner
    const event = attendee.events as unknown as { name: string }
    const scheduledAt = new Date(attendee.scheduled_at)

    // Calculate end time (scheduled time + 15 minutes)
    const endAt = new Date(scheduledAt.getTime() + 15 * 60 * 1000)

    // Get the base URL from request headers
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    const intakeUrl = `${baseUrl}/intake/${token}`

    // Generate unique ID for the event
    const uid = `${attendee.id}@matchys.ai`

    // Create timestamp for DTSTAMP
    const now = new Date()

    // Build the ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Matchys.ai//Intake//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(now)}`,
      `DTSTART:${formatICSDate(scheduledAt)}`,
      `DTEND:${formatICSDate(endAt)}`,
      `SUMMARY:${escapeICSText(`Share your interests for ${event.name}`)}`,
      `DESCRIPTION:${escapeICSText(`Take 3 minutes to share your interests so we can help you connect with the right people at ${event.name}.\\n\\nClick here to start: ${intakeUrl}`)}`,
      `URL:${intakeUrl}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICSText(`Reminder: Share your interests for ${event.name}`)}`,
      'TRIGGER:-PT15M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    // Sanitize event name for filename
    const sanitizedName = event.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length

    // Return the ICS file
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="matchys-${sanitizedName || 'event'}.ics"`,
      },
    })
  } catch (error) {
    console.error('Calendar generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
