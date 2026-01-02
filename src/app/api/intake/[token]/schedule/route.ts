import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Validate token format (UUID)
  if (!token || typeof token !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { scheduled_at } = await request.json()

    if (!scheduled_at) {
      return NextResponse.json(
        { error: 'scheduled_at is required' },
        { status: 400 }
      )
    }

    // Validate the scheduled_at is a valid date
    const scheduledDate = new Date(scheduled_at)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Validate the date is in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      )
    }

    // Prevent scheduling more than 1 year in advance
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    if (scheduledDate > maxDate) {
      return NextResponse.json(
        { error: 'Cannot schedule more than 1 year in advance' },
        { status: 400 }
      )
    }

    // Find attendee by token
    const { data: attendee, error: findError } = await supabase
      .from('attendees')
      .select('id, status')
      .eq('token', token)
      .single()

    if (findError || !attendee) {
      return NextResponse.json(
        { error: 'Attendee not found' },
        { status: 404 }
      )
    }

    // Don't allow scheduling if already completed
    if (attendee.status === 'completed' || attendee.status === 'matched') {
      return NextResponse.json(
        { error: 'You have already completed the intake' },
        { status: 400 }
      )
    }

    // Update attendee with scheduled_at and status
    const { error: updateError } = await supabase
      .from('attendees')
      .update({
        scheduled_at: scheduled_at,
        status: 'scheduled',
      })
      .eq('id', attendee.id)

    if (updateError) {
      console.error('Failed to update attendee:', updateError)
      return NextResponse.json(
        { error: 'Failed to schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      scheduled_at: scheduled_at,
    })
  } catch (error) {
    console.error('Schedule error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
