import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ChatConversation } from '@/components/ChatConversation'

export default async function ChatIntakePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (!attendee) {
    notFound()
  }

  // Check if already completed
  if (attendee.status === 'completed' || attendee.status === 'matched') {
    redirect(`/intake/${token}/complete`)
  }

  // Update status to in_progress
  await supabase
    .from('attendees')
    .update({ status: 'in_progress' })
    .eq('id', attendee.id)

  const event = attendee.events as { name: string; questions: Array<{ field: string; label: string }> }

  return (
    <div className="min-h-screen bg-gray-950">
      <ChatConversation
        attendeeId={attendee.id}
        token={token}
        eventName={event.name}
        attendeeName={attendee.name}
        questions={event.questions}
      />
    </div>
  )
}
