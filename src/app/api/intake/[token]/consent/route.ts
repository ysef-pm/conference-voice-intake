import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  try {
    const { matchingConsent } = await request.json()

    // Validate input
    if (typeof matchingConsent !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid consent value' },
        { status: 400 }
      )
    }

    // Find attendee by token
    const { data: attendee, error: findError } = await supabase
      .from('attendees')
      .select('id')
      .eq('token', token)
      .single()

    if (findError || !attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      )
    }

    // Update attendee's matching consent preference
    // Note: This stores consent in the JSONB preferences field or a dedicated column
    // For now, we'll use a simple approach with an update
    const { error: updateError } = await supabase
      .from('attendees')
      .update({
        // Store in a preferences JSONB field if available, otherwise we need to add the column
        // For now, we'll assume matching_consent column exists or handle gracefully
        matching_consent: matchingConsent,
      })
      .eq('id', attendee.id)

    if (updateError) {
      console.error('Failed to update consent:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preference' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, matchingConsent })
  } catch (error) {
    console.error('Consent update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
