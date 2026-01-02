import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const { data: attendee, error } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (error || !attendee) {
    return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
  }

  const event = attendee.events as {
    name: string
    questions: Array<{ field: string; label: string }>
    branding: { primary_color?: string }
  }

  return NextResponse.json({
    attendee: {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      status: attendee.status,
    },
    event: {
      name: event.name,
      questions: event.questions,
      branding: event.branding,
    },
  })
}
