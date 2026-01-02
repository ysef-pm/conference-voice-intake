import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Link2, Mail } from 'lucide-react'

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get attendee stats
  const { data: attendees } = await supabase
    .from('attendees')
    .select('status')
    .eq('event_id', id)

  const stats = {
    total: attendees?.length || 0,
    imported: attendees?.filter(a => a.status === 'imported').length || 0,
    contacted: attendees?.filter(a => a.status === 'contacted').length || 0,
    scheduled: attendees?.filter(a => a.status === 'scheduled').length || 0,
    completed: attendees?.filter(a => a.status === 'completed').length || 0,
    matched: attendees?.filter(a => a.status === 'matched').length || 0,
  }

  // Get matches count
  const { count: matchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Attendees
            </CardTitle>
            <Users className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Completed
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Matches Made
            </CardTitle>
            <Link2 className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{matchesCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Response Rate
            </CardTitle>
            <Mail className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}%`
                : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {[
              { label: 'Imported', value: stats.imported, color: 'bg-gray-500' },
              { label: 'Contacted', value: stats.contacted, color: 'bg-blue-500' },
              { label: 'Scheduled', value: stats.scheduled, color: 'bg-yellow-500' },
              { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
              { label: 'Matched', value: stats.matched, color: 'bg-pink-500' },
            ].map((stage, i) => (
              <div key={stage.label} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full ${stage.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {stage.value}
                </div>
                <span className="mt-2 text-sm text-gray-400">{stage.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
