'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Match, Attendee } from '@/types/database'
import { MatchCard } from '@/components/dashboard/MatchCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Sparkles, Loader2, Link2, Users, CheckCircle, AlertCircle, Send, X } from 'lucide-react'

type MatchWithAttendees = Match & {
  attendee_a: Attendee
  attendee_b: Attendee
}

export default function MatchesPage() {
  const params = useParams()
  const eventId = params.id as string
  const [matches, setMatches] = useState<MatchWithAttendees[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sendingIntro, setSendingIntro] = useState<string | null>(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const supabase = createClient()

  const fetchMatches = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        attendee_a:attendees!matches_attendee_a_id_fkey (*),
        attendee_b:attendees!matches_attendee_b_id_fkey (*)
      `)
      .eq('event_id', eventId)
      .order('similarity_score', { ascending: false })

    if (error) {
      console.error('Failed to fetch matches:', error)
      setResult({
        type: 'error',
        message: 'Failed to load matches. Please try again.'
      })
    } else if (data) {
      setMatches(data as MatchWithAttendees[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMatches()
  }, [eventId])

  const handleGenerateMatches = async () => {
    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch(`/api/events/${eventId}/generate-matches`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate matches')
      }

      setResult({
        type: 'success',
        message: data.message
      })

      // Refresh matches list
      await fetchMatches()
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to generate matches'
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleSendIntroduction = async (matchId: string) => {
    setSendingIntro(matchId)

    try {
      const response = await fetch(`/api/events/${eventId}/send-introductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: [matchId] }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send introduction')
      }

      setResult({
        type: 'success',
        message: data.message
      })

      // Refresh matches list
      await fetchMatches()
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send introduction'
      })
    } finally {
      setSendingIntro(null)
    }
  }

  const handleBulkSendIntroductions = async () => {
    if (selectedIds.size === 0) return

    setSendingBulk(true)

    try {
      const response = await fetch(`/api/events/${eventId}/send-introductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchIds: Array.from(selectedIds) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send introductions')
      }

      setResult({
        type: 'success',
        message: data.message
      })

      // Clear selection and refresh
      setSelectedIds(new Set())
      await fetchMatches()
    } catch (err) {
      setResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to send introductions'
      })
    } finally {
      setSendingBulk(false)
    }
  }

  const handleSelectChange = (matchId: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(matchId)
      } else {
        next.delete(matchId)
      }
      return next
    })
  }

  const pendingMatches = matches.filter(m => m.status !== 'introduced')

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(pendingMatches.map(m => m.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const allPendingSelected = pendingMatches.length > 0 && pendingMatches.every(m => selectedIds.has(m.id))

  // Clear result after 5 seconds
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setResult(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [result])

  // Calculate stats
  const stats = {
    total: matches.length,
    pending: matches.filter(m => m.status === 'pending').length,
    introduced: matches.filter(m => m.status === 'introduced').length,
    avgSimilarity: matches.length > 0
      ? Math.round((matches.reduce((sum, m) => sum + (m.similarity_score || 0), 0) / matches.length) * 100)
      : 0
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Matches</h3>
          <p className="text-sm text-gray-400">
            Automatically match attendees based on their responses
          </p>
        </div>

        <Button
          onClick={handleGenerateMatches}
          disabled={generating}
          className="bg-pink-500 hover:bg-pink-600"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Matches
            </>
          )}
        </Button>
      </div>

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          result.type === 'success'
            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {result.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-pink-500" />
              Total Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Introduced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.introduced}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-500" />
              Avg Similarity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.avgSimilarity}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-medium">
              {selectedIds.size} match{selectedIds.size !== 1 ? 'es' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              onClick={handleBulkSendIntroductions}
              disabled={sendingBulk}
              size="sm"
              className="bg-pink-500 hover:bg-pink-600"
            >
              {sendingBulk ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Introductions
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Matches Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : matches.length > 0 ? (
        <div className="space-y-4">
          {/* Select All */}
          {pendingMatches.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allPendingSelected}
                onCheckedChange={handleSelectAll}
                className="h-5 w-5 border-gray-600 data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
              />
              <span className="text-sm text-gray-400">
                Select all pending matches ({pendingMatches.length})
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onSendIntroduction={handleSendIntroduction}
                isSending={sendingIntro === match.id}
                isSelected={selectedIds.has(match.id)}
                onSelectChange={handleSelectChange}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No matches yet</h3>
            <p className="text-gray-400 text-center mb-4 max-w-md">
              Click &quot;Generate Matches&quot; to automatically pair attendees based on their
              responses. You need at least 2 completed attendees with responses.
            </p>
            <Button
              onClick={handleGenerateMatches}
              disabled={generating}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Matches
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
