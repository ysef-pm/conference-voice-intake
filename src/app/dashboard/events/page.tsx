import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar } from 'lucide-react'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user?.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', org?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Events</h2>
          <p className="text-gray-400">Manage your conferences and events</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="bg-gray-900 border-gray-800 hover:border-pink-500 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    {event.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : event.status === 'completed'
                        ? 'bg-gray-500/10 text-gray-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
            <p className="text-gray-400 mb-4">Create your first event to get started</p>
            <Link href="/dashboard/events/new">
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
