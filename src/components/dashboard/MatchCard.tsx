'use client'

import { Match, Attendee } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, User } from 'lucide-react'

interface MatchCardProps {
  match: Match & {
    attendee_a: Attendee
    attendee_b: Attendee
  }
  onSendIntroduction?: (matchId: string) => void
  isSending?: boolean
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-500' },
  a_consented: { label: 'A Consented', color: 'bg-yellow-500' },
  b_consented: { label: 'B Consented', color: 'bg-yellow-500' },
  introduced: { label: 'Introduced', color: 'bg-green-500' },
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function SimilarityProgress({ score }: { score: number }) {
  const percentage = Math.round(score * 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Similarity</span>
        <span className="text-pink-500 font-medium">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-pink-500 to-pink-400 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function AttendeeAvatar({ name, email }: { name: string | null; email: string }) {
  const initials = getInitials(name, email)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-white font-medium border border-gray-700">
        {initials}
      </div>
      <div className="text-center">
        <p className="text-white text-sm font-medium truncate max-w-[120px]">
          {name || 'Anonymous'}
        </p>
        <p className="text-gray-500 text-xs truncate max-w-[120px]">{email}</p>
      </div>
    </div>
  )
}

export function MatchCard({ match, onSendIntroduction, isSending }: MatchCardProps) {
  const { attendee_a, attendee_b, similarity_score, common_interests, status } = match
  const statusInfo = statusConfig[status] || statusConfig.pending

  return (
    <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
      <CardContent className="p-6">
        {/* Header with status badge */}
        <div className="flex justify-between items-start mb-6">
          <Badge className={`${statusInfo.color} text-white text-xs`}>
            {statusInfo.label}
          </Badge>
          {status === 'introduced' && match.introduced_at && (
            <span className="text-xs text-gray-500">
              {new Date(match.introduced_at).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Attendees */}
        <div className="flex items-center justify-between mb-6">
          <AttendeeAvatar name={attendee_a.name} email={attendee_a.email} />

          <div className="flex-1 flex items-center justify-center px-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-[2px] bg-gradient-to-r from-transparent to-pink-500" />
              <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center">
                <User className="w-4 h-4 text-pink-500" />
              </div>
              <div className="w-8 h-[2px] bg-gradient-to-l from-transparent to-pink-500" />
            </div>
          </div>

          <AttendeeAvatar name={attendee_b.name} email={attendee_b.email} />
        </div>

        {/* Similarity Score */}
        {similarity_score !== null && (
          <div className="mb-4">
            <SimilarityProgress score={similarity_score} />
          </div>
        )}

        {/* Common Interests */}
        {common_interests && (
          <div className="mb-4">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Common Interests
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {common_interests}
            </p>
          </div>
        )}

        {/* Actions */}
        {status !== 'introduced' && onSendIntroduction && (
          <Button
            onClick={() => onSendIntroduction(match.id)}
            disabled={isSending}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white"
            size="sm"
          >
            <Mail className="w-4 h-4 mr-2" />
            {isSending ? 'Updating...' : 'Mark as Introduced'}
          </Button>
        )}

        {status === 'introduced' && (
          <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
            <Mail className="w-4 h-4" />
            <span>Introduction sent</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
