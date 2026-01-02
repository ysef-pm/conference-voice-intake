import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  getOutreachEmailSubject,
  getOutreachEmailHtml,
  getOutreachEmailText,
} from '@/lib/email/templates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // C1: Validate environment variable at start
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
  }

  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - verify user owns the organization for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, organization_id, organizations!inner(owner_id, name)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if the user owns the organization
    const organization = event.organizations as unknown as { owner_id: string; name: string }
    if (organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch attendees with status 'imported'
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('id, email, name, token')
      .eq('event_id', eventId)
      .eq('status', 'imported')

    if (attendeesError) {
      return NextResponse.json({ error: attendeesError.message }, { status: 500 })
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'No attendees with imported status to email'
      })
    }

    // Build app URL for intake links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Send emails and track results
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const attendee of attendees) {
      const intakeUrl = `${appUrl}/intake/${attendee.token}`

      try {
        const { error: emailError } = await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Matchys.ai <noreply@matchys.ai>',
          to: attendee.email,
          subject: getOutreachEmailSubject(event.name),
          html: getOutreachEmailHtml({
            attendeeName: attendee.name,
            eventName: event.name,
            intakeUrl,
            organizerName: organization.name,
          }),
          text: getOutreachEmailText({
            attendeeName: attendee.name,
            eventName: event.name,
            intakeUrl,
            organizerName: organization.name,
          }),
        })

        if (emailError) {
          results.failed++
          results.errors.push(`${attendee.email}: ${emailError.message}`)
          continue
        }

        // Update attendee status to 'contacted' and set contacted_at
        // I1: Add error handling for database update
        // I2: Add race condition prevention with status check
        const { error: updateError } = await supabase
          .from('attendees')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString()
          })
          .eq('id', attendee.id)
          .eq('status', 'imported') // Only update if still imported

        if (updateError) {
          console.error(`Failed to update attendee ${attendee.id}:`, updateError)
        }

        results.sent++

        // I3: Rate limiting - add small delay between emails
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms throttle
      } catch (err) {
        results.failed++
        results.errors.push(
          `${attendee.email}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      count: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: results.failed > 0
        ? `Sent ${results.sent} emails (${results.failed} failed)`
        : `Sent ${results.sent} emails successfully`
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to send emails'
    }, { status: 500 })
  }
}
