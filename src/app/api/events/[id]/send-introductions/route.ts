import { Resend } from 'resend'
import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  getIntroductionEmailSubject,
  getIntroductionEmailHtml,
  getIntroductionEmailText,
} from '@/lib/email/templates'
import { getIntroductionWhatsAppMessage, getIntroductionContentVariables } from '@/lib/whatsapp/templates'

interface MatchWithAttendees {
  id: string
  attendee_a: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  attendee_b: {
    id: string
    name: string | null
    email: string
    phone: string | null
  }
  common_interests: string | null
  status: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // Parse request body
    const body = await request.json()
    const { matchIds } = body as { matchIds: string[] }

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return NextResponse.json(
        { error: 'matchIds array is required' },
        { status: 400 }
      )
    }

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - verify user owns the organization for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, organization_id, outreach_channel, organizations!inner(owner_id, name)')
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

    const outreachChannel = event.outreach_channel || 'email'

    // Fetch matches with attendee details
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        common_interests,
        status,
        attendee_a:attendees!matches_attendee_a_id_fkey (id, name, email, phone),
        attendee_b:attendees!matches_attendee_b_id_fkey (id, name, email, phone)
      `)
      .eq('event_id', eventId)
      .in('id', matchIds)
      .neq('status', 'introduced') // Don't re-send to already introduced matches

    if (matchesError) {
      return NextResponse.json({ error: matchesError.message }, { status: 500 })
    }

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No eligible matches found (may already be introduced)'
      })
    }

    // Initialize clients based on channel
    let resend: Resend | null = null
    let twilioClient: ReturnType<typeof twilio> | null = null

    if (outreachChannel === 'email' || outreachChannel === 'both') {
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
      }
      resend = new Resend(process.env.RESEND_API_KEY)
    }

    if (outreachChannel === 'whatsapp' || outreachChannel === 'both') {
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
      const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

      if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
        if (outreachChannel === 'whatsapp') {
          return NextResponse.json({ error: 'WhatsApp service not configured' }, { status: 500 })
        }
        // For 'both', we'll just skip WhatsApp if not configured
      } else {
        twilioClient = twilio(twilioAccountSid, twilioAuthToken)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER

    // Track results
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i] as unknown as MatchWithAttendees
      const { attendee_a, attendee_b, common_interests } = match

      // Add delay for rate limiting (except first)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }

      const personAName = attendee_a.name || 'Anonymous'
      const personBName = attendee_b.name || 'Anonymous'
      const interests = common_interests || 'Shared interests from your responses'

      try {
        let emailSent = false
        let whatsappSent = false

        // Send email if channel is email or both
        if (resend && (outreachChannel === 'email' || outreachChannel === 'both')) {
          const { error: emailError } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'Matchys.ai <noreply@matchys.ai>',
            to: attendee_a.email,
            cc: attendee_b.email,
            subject: getIntroductionEmailSubject(event.name, personAName, personBName),
            html: getIntroductionEmailHtml({
              eventName: event.name,
              personAName,
              personAEmail: attendee_a.email,
              personBName,
              personBEmail: attendee_b.email,
              commonInterests: interests,
              organizerName: organization.name,
            }),
            text: getIntroductionEmailText({
              eventName: event.name,
              personAName,
              personAEmail: attendee_a.email,
              personBName,
              personBEmail: attendee_b.email,
              commonInterests: interests,
              organizerName: organization.name,
            }),
          })

          if (emailError) {
            throw new Error(`Email failed: ${emailError.message}`)
          }
          emailSent = true
        }

        // Send WhatsApp messages if channel is whatsapp or both
        if (twilioClient && twilioWhatsAppNumber && (outreachChannel === 'whatsapp' || outreachChannel === 'both')) {
          const introContentSid = process.env.TWILIO_CONTENT_SID_INTRODUCTION

          // Send to attendee A (if they have a phone)
          if (attendee_a.phone) {
            if (introContentSid) {
              await twilioClient.messages.create({
                from: `whatsapp:${twilioWhatsAppNumber}`,
                to: `whatsapp:${attendee_a.phone}`,
                contentSid: introContentSid,
                contentVariables: JSON.stringify(
                  getIntroductionContentVariables({
                    recipientName: personAName,
                    matchName: personBName,
                    matchEmail: attendee_b.email,
                    eventName: event.name,
                    commonInterests: interests,
                    organizerName: organization.name,
                  })
                ),
              })
            } else {
              await twilioClient.messages.create({
                from: `whatsapp:${twilioWhatsAppNumber}`,
                to: `whatsapp:${attendee_a.phone}`,
                body: getIntroductionWhatsAppMessage({
                  recipientName: personAName,
                  matchName: personBName,
                  matchEmail: attendee_b.email,
                  eventName: event.name,
                  commonInterests: interests,
                  organizerName: organization.name,
                }),
              })
            }
          }

          // Send to attendee B (if they have a phone)
          if (attendee_b.phone) {
            await new Promise(resolve => setTimeout(resolve, 200)) // Rate limit between messages
            if (introContentSid) {
              await twilioClient.messages.create({
                from: `whatsapp:${twilioWhatsAppNumber}`,
                to: `whatsapp:${attendee_b.phone}`,
                contentSid: introContentSid,
                contentVariables: JSON.stringify(
                  getIntroductionContentVariables({
                    recipientName: personBName,
                    matchName: personAName,
                    matchEmail: attendee_a.email,
                    eventName: event.name,
                    commonInterests: interests,
                    organizerName: organization.name,
                  })
                ),
              })
            } else {
              await twilioClient.messages.create({
                from: `whatsapp:${twilioWhatsAppNumber}`,
                to: `whatsapp:${attendee_b.phone}`,
                body: getIntroductionWhatsAppMessage({
                  recipientName: personBName,
                  matchName: personAName,
                  matchEmail: attendee_a.email,
                  eventName: event.name,
                  commonInterests: interests,
                  organizerName: organization.name,
                }),
              })
            }
          }
          whatsappSent = true
        }

        // Update match status to introduced
        if (emailSent || whatsappSent) {
          const { error: updateError } = await supabase
            .from('matches')
            .update({
              status: 'introduced',
              introduced_at: new Date().toISOString()
            })
            .eq('id', match.id)
            .neq('status', 'introduced') // Race condition prevention

          if (updateError) {
            console.error(`Failed to update match ${match.id}:`, updateError)
          }

          results.sent++
        } else {
          results.failed++
          results.errors.push(`Match ${match.id}: No communication channel available`)
        }
      } catch (err) {
        results.failed++
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`Match ${match.id}: ${errorMessage}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: results.failed > 0
        ? `Sent ${results.sent} introduction${results.sent !== 1 ? 's' : ''} (${results.failed} failed)`
        : `Sent ${results.sent} introduction${results.sent !== 1 ? 's' : ''} successfully`
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to send introductions'
    }, { status: 500 })
  }
}
