'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Response, Attendee } from '@/types/database'
import { TopicCloud } from '@/components/dashboard/TopicCloud'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Users,
  MessageSquare,
  Mic,
  Hash,
  Download,
  Loader2,
  TrendingUp,
  Percent
} from 'lucide-react'

type ResponseWithAttendee = Response & {
  attendee: Attendee
}

interface TopicCount {
  topic: string
  count: number
}

export default function AnalyticsPage() {
  const params = useParams()
  const eventId = params.id as string
  const [responses, setResponses] = useState<ResponseWithAttendee[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // Fetch all attendees for the event
      const { data: attendeesData } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', eventId)

      setAttendees(attendeesData || [])

      // Fetch responses with attendee info
      const { data: responsesData } = await supabase
        .from('responses')
        .select(`
          *,
          attendee:attendees!inner (*)
        `)
        .eq('attendee.event_id', eventId)

      setResponses((responsesData as ResponseWithAttendee[]) || [])
      setLoading(false)
    }

    fetchData()
  }, [eventId])

  // Calculate topic frequency
  const topicCounts: TopicCount[] = (() => {
    const counts: Record<string, number> = {}
    responses.forEach(response => {
      const topics = response.topics || []
      topics.forEach((topic: string) => {
        const normalizedTopic = topic.toLowerCase().trim()
        counts[normalizedTopic] = (counts[normalizedTopic] || 0) + 1
      })
    })
    return Object.entries(counts)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
  })()

  // Calculate statistics
  const stats = {
    totalResponses: responses.length,
    totalAttendees: attendees.length,
    responseRate: attendees.length > 0
      ? Math.round((responses.length / attendees.length) * 100)
      : 0,
    avgTopicsPerResponse: responses.length > 0
      ? (responses.reduce((sum, r) => sum + (r.topics?.length || 0), 0) / responses.length).toFixed(1)
      : '0',
    uniqueTopics: topicCounts.length,
    voiceMode: responses.filter(r => r.mode === 'voice').length,
    chatMode: responses.filter(r => r.mode === 'chat').length,
    voicePercent: responses.length > 0
      ? Math.round((responses.filter(r => r.mode === 'voice').length / responses.length) * 100)
      : 0,
    chatPercent: responses.length > 0
      ? Math.round((responses.filter(r => r.mode === 'chat').length / responses.length) * 100)
      : 0
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/export-analytics`)
      if (!response.ok) {
        throw new Error('Export failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${eventId}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Analytics & Trending Topics</h3>
          <p className="text-sm text-gray-400">
            Insights from attendee responses and topic analysis
          </p>
        </div>

        <Button
          onClick={handleExport}
          disabled={exporting || responses.length === 0}
          variant="outline"
          className="border-gray-700 hover:bg-gray-800"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalResponses}</div>
            <p className="text-xs text-gray-500">of {stats.totalAttendees} attendees</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Percent className="w-4 h-4 text-green-500" />
              Response Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.responseRate}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-500" />
              Unique Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.uniqueTopics}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              Avg Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.avgTopicsPerResponse}</div>
            <p className="text-xs text-gray-500">per response</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-500" />
              Voice Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.voiceMode}</div>
            <p className="text-xs text-gray-500">{stats.voicePercent}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-500" />
              Chat Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.chatMode}</div>
            <p className="text-xs text-gray-500">{stats.chatPercent}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Mode Breakdown Bar */}
      {responses.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden bg-gray-800">
              {stats.voicePercent > 0 && (
                <div
                  className="bg-purple-500 transition-all duration-500"
                  style={{ width: `${stats.voicePercent}%` }}
                  title={`Voice: ${stats.voicePercent}%`}
                />
              )}
              {stats.chatPercent > 0 && (
                <div
                  className="bg-cyan-500 transition-all duration-500"
                  style={{ width: `${stats.chatPercent}%` }}
                  title={`Chat: ${stats.chatPercent}%`}
                />
              )}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                Voice ({stats.voicePercent}%)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cyan-500" />
                Chat ({stats.chatPercent}%)
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topic Visualization */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-pink-500" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topicCounts.length > 0 ? (
            <TopicCloud topics={topicCounts} />
          ) : (
            <div className="text-center py-8">
              <Hash className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No topics yet</h3>
              <p className="text-gray-400 text-sm">
                Topics will appear here once attendees complete their intake
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 10 Topics Table */}
      {topicCounts.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Top 10 Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topicCounts.slice(0, 10).map((item, index) => {
                const maxCount = topicCounts[0]?.count || 1
                const percentage = (item.count / maxCount) * 100
                return (
                  <div key={item.topic} className="flex items-center gap-4">
                    <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium capitalize">{item.topic}</span>
                        <span className="text-gray-400 text-sm">{item.count} mention{item.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
