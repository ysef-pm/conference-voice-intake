import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MessageSquare, Mic } from 'lucide-react'

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: eventId } = await params
  const supabase = await createClient()

  // Fetch responses with attendee info
  const { data: responses } = await supabase
    .from('responses')
    .select(`
      id,
      mode,
      answers,
      topics,
      transcript,
      created_at,
      attendees!inner (
        id,
        name,
        email,
        event_id
      )
    `)
    .eq('attendees.event_id', eventId)
    .order('created_at', { ascending: false })

  const filteredResponses = responses || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Conversations</h3>
        <p className="text-sm text-gray-400">
          View attendee responses and conversation transcripts
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Responses ({filteredResponses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResponses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No responses yet. Responses will appear here once attendees complete their intake.
            </p>
          ) : (
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-900">
                    <TableHead className="text-gray-400">Attendee</TableHead>
                    <TableHead className="text-gray-400">Mode</TableHead>
                    <TableHead className="text-gray-400">Topics</TableHead>
                    <TableHead className="text-gray-400">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => {
                    const attendee = response.attendees as unknown as {
                      name: string | null
                      email: string
                    }
                    return (
                      <TableRow
                        key={response.id}
                        className="border-gray-800 hover:bg-gray-900"
                      >
                        <TableCell>
                          <div>
                            <p className="text-white">
                              {attendee.name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {attendee.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${
                              response.mode === 'voice'
                                ? 'bg-purple-500'
                                : 'bg-blue-500'
                            } text-white`}
                          >
                            {response.mode === 'voice' ? (
                              <Mic className="w-3 h-3 mr-1" />
                            ) : (
                              <MessageSquare className="w-3 h-3 mr-1" />
                            )}
                            {response.mode || 'unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(response.topics as string[] || []).slice(0, 3).map((topic, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs border-gray-700 text-gray-400"
                              >
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {new Date(response.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
