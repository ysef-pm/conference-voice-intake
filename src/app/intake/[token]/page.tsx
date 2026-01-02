import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Mic, MessageSquare, Clock } from 'lucide-react'

export default async function IntakeLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch attendee by token
  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (!attendee) {
    notFound()
  }

  // Update status to clicked if imported/contacted
  // Don't update if already scheduled - user chose to wait
  if (['imported', 'contacted'].includes(attendee.status)) {
    await supabase
      .from('attendees')
      .update({ status: 'clicked' })
      .eq('id', attendee.id)
  }

  const event = attendee.events as { name: string; branding: { primary_color?: string } }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-pink-500 flex items-center justify-center mx-auto mb-8">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Hi{attendee.name ? `, ${attendee.name}` : ''}!
        </h1>

        <p className="text-gray-400 mb-2">
          Welcome to {event.name}
        </p>

        <p className="text-gray-500 text-sm mb-8">
          We&apos;d love to learn about you to help connect you with the right people.
          Choose how you&apos;d like to share:
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/intake/${token}/voice`}
            className="p-6 rounded-xl border-2 border-gray-800 hover:border-pink-500 transition-all group"
          >
            <Mic className="w-12 h-12 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Talk to me</h3>
            <p className="text-sm text-gray-400">Have a voice conversation</p>
            <p className="text-xs text-gray-500 mt-2">~3 minutes</p>
          </Link>

          <Link
            href={`/intake/${token}/chat`}
            className="p-6 rounded-xl border-2 border-gray-800 hover:border-pink-500 transition-all group"
          >
            <MessageSquare className="w-12 h-12 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Type instead</h3>
            <p className="text-sm text-gray-400">Chat at your own pace</p>
            <p className="text-xs text-gray-500 mt-2">~3 minutes</p>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <Link
            href={`/intake/${token}/schedule`}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-pink-500 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Not ready now? Schedule for later
            <span className="ml-1">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
