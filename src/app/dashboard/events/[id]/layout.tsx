import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventTabs } from '@/components/dashboard/EventTabs'

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{event.name}</h2>
        <p className="text-gray-400">Manage your event</p>
      </div>
      <EventTabs eventId={id} />
      {children}
    </div>
  )
}
