import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWhatsAppOutreachMessage, getOutreachContentVariables } from '@/lib/whatsapp/templates'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate Twilio environment variables
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
    return NextResponse.json(
      { error: 'WhatsApp service not configured. Missing Twilio credentials.' },
      { status: 500 }
    )
  }

  // Instantiate Twilio client inside handler to avoid build-time errors
  const twilioClient = twilio(twilioAccountSid, twilioAuthToken)

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

    // Fetch attendees with status 'imported' AND phone IS NOT NULL
    const { data: attendeesWithPhone, error: attendeesError } = await supabase
      .from('attendees')
      .select('id, phone, name, token')
      .eq('event_id', eventId)
      .eq('status', 'imported')
      .not('phone', 'is', null)

    if (attendeesError) {
      return NextResponse.json({ error: attendeesError.message }, { status: 500 })
    }

    // Count attendees without phone for skip count
    const { count: skippedCount, error: skipCountError } = await supabase
      .from('attendees')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'imported')
      .is('phone', null)

    if (skipCountError) {
      console.error('Failed to count skipped attendees:', skipCountError)
    }

    const skipped = skippedCount ?? 0

    if (!attendeesWithPhone || attendeesWithPhone.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        failed: 0,
        skipped,
        message: skipped > 0
          ? `No attendees with phone numbers to message (${skipped} skipped without phone)`
          : 'No attendees with imported status to message'
      })
    }

    // Build app URL for intake links
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Send WhatsApp messages and track results
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < attendeesWithPhone.length; i++) {
      const attendee = attendeesWithPhone[i]
      const intakeUrl = `${appUrl}/intake/${attendee.token}`

      // Add delay before each request (except first) for rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      try {
        const contentSid = process.env.TWILIO_CONTENT_SID_OUTREACH

        if (contentSid) {
          await twilioClient.messages.create({
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${attendee.phone}`,
            contentSid,
            contentVariables: JSON.stringify(
              getOutreachContentVariables({
                attendeeName: attendee.name,
                eventName: event.name,
                intakeUrl,
                organizerName: organization.name,
              })
            ),
          })
        } else {
          await twilioClient.messages.create({
            from: `whatsapp:${twilioWhatsAppNumber}`,
            to: `whatsapp:${attendee.phone}`,
            body: getWhatsAppOutreachMessage({
              attendeeName: attendee.name,
              eventName: event.name,
              intakeUrl,
              organizerName: organization.name,
            }),
          })
        }

        // Update attendee status to 'contacted' and set contacted_at
        const { error: updateError } = await supabase
          .from('attendees')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString()
          })
          .eq('id', attendee.id)
          .eq('status', 'imported') // Only update if still imported (race condition prevention)

        if (updateError) {
          console.error(`Failed to update attendee ${attendee.id}:`, updateError)
        }

        results.sent++
      } catch (err) {
        results.failed++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`${attendee.phone}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      count: results.sent,
      failed: results.failed,
      skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: buildResultMessage(results.sent, results.failed, skipped)
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to send WhatsApp messages'
    }, { status: 500 })
  }
}

function buildResultMessage(sent: number, failed: number, skipped: number): string {
  const parts: string[] = []

  if (sent > 0) {
    parts.push(`Sent ${sent} WhatsApp message${sent !== 1 ? 's' : ''}`)
  }

  if (failed > 0) {
    parts.push(`${failed} failed`)
  }

  if (skipped > 0) {
    parts.push(`${skipped} skipped (no phone)`)
  }

  if (parts.length === 0) {
    return 'No messages to send'
  }

  return parts.join(', ')
}
