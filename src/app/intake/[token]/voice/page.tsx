'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppState, TranscriptEntry, AppStatus, DynamicQuestion } from '@/types'
import { useConversation } from '@/hooks/useConversation'
import { VoiceControls, QuestionList, Conversation } from '@/components'

// Simple confetti component
function Confetti() {
  const colors = ['#ec4899', '#f472b6', '#db2777', '#10b981', '#fbbf24', '#8b5cf6']
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 8 + Math.random() * 8,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map(piece => (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            background: piece.color,
            borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
            animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function VoiceIntakePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showEditPrompt, setShowEditPrompt] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [attendeeData, setAttendeeData] = useState<{ id: string; name: string | null; eventName: string } | null>(null)
  const [questions, setQuestions] = useState<DynamicQuestion[]>([])
  const [showQuestions, setShowQuestions] = useState(false)
  const hasAutoStarted = useRef(false)

  const [state, setState] = useState<AppState>({
    status: 'idle',
    currentQuestionIndex: 0,
    answers: {},
    transcript: [],
    error: null,
    lastUpdatedField: null,
    userName: '',
    userEmail: '',
  })

  // Fetch attendee data and event questions on mount
  useEffect(() => {
    const fetchAttendee = async () => {
      try {
        const response = await fetch(`/api/intake/${token}`)
        if (response.ok) {
          const data = await response.json()
          setAttendeeData({
            id: data.attendee.id,
            name: data.attendee.name,
            eventName: data.event.name,
          })

          // Set questions from event
          const eventQuestions: DynamicQuestion[] = (data.event.questions || []).map(
            (q: { id?: string; field: string; label: string }, i: number) => ({
              id: q.id || `q_${i}`,
              field: q.field,
              label: q.label,
              order: i,
            })
          )
          setQuestions(eventQuestions)

          // Initialize empty answers for each question
          const initialAnswers: Record<string, string> = {}
          eventQuestions.forEach((q) => {
            initialAnswers[q.field] = ''
          })

          setState(s => ({
            ...s,
            answers: initialAnswers,
            userName: data.attendee.name || '',
            userEmail: data.attendee.email || '',
          }))
        } else {
          router.push('/404')
        }
      } catch {
        router.push('/404')
      }
    }
    fetchAttendee()
  }, [token, router])

  // Show edit prompt when conversation completes
  useEffect(() => {
    if (state.status === 'complete') {
      setShowEditPrompt(true)
      const timer = setTimeout(() => setShowEditPrompt(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [state.status])

  // Handlers
  const handleAnswerSubmit = useCallback((field: string, value: string) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [field]: value },
      lastUpdatedField: field,
    }))
    setTimeout(() => {
      setState((s) => ({ ...s, lastUpdatedField: null }))
    }, 500)
  }, [])

  const handleQuestionChange = useCallback((index: number) => {
    setState((s) => ({ ...s, currentQuestionIndex: index }))
  }, [])

  const handleTranscriptUpdate = useCallback((entry: TranscriptEntry) => {
    setState((s) => ({ ...s, transcript: [...s.transcript, entry] }))
  }, [])

  const handleStatusChange = useCallback((status: AppStatus) => {
    setState((s) => ({ ...s, status }))
  }, [])

  const handleError = useCallback((error: string) => {
    setState((s) => ({ ...s, error }))
  }, [])

  const handleAnswerChange = useCallback((field: string, value: string) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [field]: value },
    }))
  }, [])

  // Conversation hook
  const { start, stop } = useConversation({
    questions,
    answers: state.answers,
    context: attendeeData ? {
      name: attendeeData.eventName,
      type: 'event',
      userName: attendeeData.name || undefined,
    } : undefined,
    onAnswerSubmit: handleAnswerSubmit,
    onQuestionChange: handleQuestionChange,
    onTranscriptUpdate: handleTranscriptUpdate,
    onStatusChange: handleStatusChange,
    onError: handleError,
  })

  // Auto-start conversation once data is loaded
  useEffect(() => {
    if (attendeeData && questions.length > 0 && !hasAutoStarted.current && state.status === 'idle') {
      hasAutoStarted.current = true
      start()
    }
  }, [attendeeData, questions, state.status, start])

  // Submit to webhook with attendee context
  const handleSubmit = async () => {
    if (!attendeeData) return

    setIsSubmitting(true)
    setState((s) => ({ ...s, error: null }))

    try {
      const response = await fetch('/api/submit-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: attendeeData.id,
          token,
          answers: state.answers,
          transcript: state.transcript,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setState((s) => ({ ...s, status: 'submitted' }))
      setShowCelebration(true)

      // Redirect to complete page after celebration
      setTimeout(() => {
        router.push(`/intake/${token}/complete`)
      }, 3000)
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : 'Submission failed',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle edit mode
  const handleEditToggle = () => {
    if (state.status === 'editing') {
      setState((s) => ({ ...s, status: 'complete' }))
    } else {
      setState((s) => ({ ...s, status: 'editing' }))
      setShowEditPrompt(false)
    }
  }

  const allAnswered = Object.values(state.answers).every(Boolean)
  const hasAnyAnswers = Object.values(state.answers).some(Boolean)
  const canSubmit = allAnswered && !isSubmitting
  const showEditSubmit = hasAnyAnswers || state.status === 'complete' || state.status === 'editing'
  const answeredCount = Object.values(state.answers).filter(Boolean).length

  if (!attendeeData || questions.length === 0) {
    return (
      <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-3 border-pink-500/30 border-t-pink-500 animate-spin" />
          <p className="text-sm text-gray-400">Setting up your conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)' }}>
      {/* Confetti */}
      {showCelebration && <Confetti />}

      {/* Ambient glow - hidden on mobile */}
      <div
        className="hidden md:block absolute pointer-events-none transition-all duration-300"
        style={{
          top: '20%',
          right: isDrawerOpen ? '33%' : '16%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(ellipse, rgba(236, 72, 153, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <header className="relative z-20 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between border-b border-white/[0.06]">
        {/* Logo / Event Name */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div
            className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)',
              boxShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            </svg>
          </div>
          <span
            className="text-sm md:text-lg font-bold truncate"
            style={{
              background: 'linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {attendeeData.eventName}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {showEditSubmit && state.status !== 'submitted' && (
            <>
              {/* Edit/Save Toggle */}
              <button
                onClick={handleEditToggle}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: state.status === 'editing' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 72, 153, 0.1)',
                  border: state.status === 'editing' ? '2px solid var(--green-500)' : '2px solid var(--pink-400)',
                  color: state.status === 'editing' ? 'var(--green-500)' : 'var(--pink-400)',
                }}
              >
                {state.status === 'editing' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    Save
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit
                  </>
                )}
              </button>

              {/* Mobile edit toggle - icon only */}
              <button
                onClick={handleEditToggle}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-all"
                style={{
                  background: state.status === 'editing' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 72, 153, 0.1)',
                  border: state.status === 'editing' ? '2px solid var(--green-500)' : '2px solid var(--pink-400)',
                  color: state.status === 'editing' ? 'var(--green-500)' : 'var(--pink-400)',
                }}
              >
                {state.status === 'editing' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                )}
              </button>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)'
                    : 'rgba(236, 72, 153, 0.1)',
                  border: 'none',
                  color: canSubmit ? 'white' : 'var(--text-muted)',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  boxShadow: canSubmit ? '0 0 30px var(--accent-glow)' : 'none',
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span className="hidden md:inline">Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    <span className="hidden md:inline">Submit</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Questions Panel - hidden on mobile by default, shown as bottom sheet */}
        <div className="hidden md:block md:flex-1 md:min-w-0 border-r border-white/[0.06]" style={{ background: 'rgba(20, 20, 30, 0.4)' }}>
          <QuestionList
            questions={questions}
            answers={state.answers}
            currentQuestionIndex={state.currentQuestionIndex}
            status={state.status}
            lastUpdatedField={state.lastUpdatedField}
            onAnswerChange={handleAnswerChange}
          />
        </div>

        {/* Center Panel - Voice Controls */}
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 md:py-12 md:px-12">
          <VoiceControls
            status={state.status}
            onStart={start}
            onStop={stop}
          />

          {/* "Say hello" prompt when agent is connected but waiting */}
          {state.status === 'conversing' && state.transcript.length === 0 && (
            <div className="mt-5 flex items-center gap-2 px-5 py-3 rounded-xl animate-in fade-in duration-500"
              style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.15)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--pink-400)' }}>
                Say hello to get started
              </p>
            </div>
          )}

          {/* Mobile: progress indicator under voice button */}
          <div className="md:hidden mt-6 text-center">
            <p className="text-sm text-gray-400">
              <span className="text-pink-400 font-semibold">{answeredCount}</span>
              {' of '}
              <span className="font-semibold">{questions.length}</span>
              {' questions answered'}
            </p>
          </div>

          {/* Mobile: toggle to show questions */}
          <button
            onClick={() => setShowQuestions(!showQuestions)}
            className="md:hidden mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: '#1a1a24',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
            }}
          >
            {showQuestions ? 'Hide Answers' : 'View Answers'}
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: showQuestions ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Desktop: transcript toggle */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="hidden md:flex mt-8 items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium"
            style={{
              background: '#1a1a24',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary)',
            }}
          >
            {isDrawerOpen ? 'Hide Transcript' : 'View Transcript'}
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: isDrawerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Desktop: Transcript Drawer */}
        <div
          className="hidden md:block overflow-hidden transition-all duration-300"
          style={{
            flex: isDrawerOpen ? 1 : 0,
            width: isDrawerOpen ? 'auto' : 0,
            background: 'rgba(20, 20, 30, 0.6)',
          }}
        >
          {isDrawerOpen && (
            <Conversation
              transcript={state.transcript}
              status={state.status}
              error={state.error}
            />
          )}
        </div>
      </div>

      {/* Mobile: Expandable questions panel */}
      {showQuestions && (
        <div
          className="md:hidden absolute bottom-0 left-0 right-0 z-30 max-h-[60vh] rounded-t-2xl border-t border-white/10 animate-in slide-in-from-bottom duration-200"
          style={{ background: 'rgba(15, 15, 26, 0.98)', backdropFilter: 'blur(20px)' }}
        >
          {/* Close button header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-white/[0.06]" style={{ background: 'rgba(15, 15, 26, 0.98)' }}>
            <span className="text-sm font-semibold text-white">Your Answers</span>
            <button
              onClick={() => setShowQuestions(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)' }}
            >
              Hide
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(60vh-48px)] overscroll-contain">
            <QuestionList
              questions={questions}
              answers={state.answers}
              currentQuestionIndex={state.currentQuestionIndex}
              status={state.status}
              lastUpdatedField={state.lastUpdatedField}
              onAnswerChange={handleAnswerChange}
            />
          </div>
        </div>
      )}

      {/* Edit Prompt Toast */}
      {showEditPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom"
          style={{
            background: 'rgba(236, 72, 153, 0.15)',
            border: '1px solid var(--pink-500)',
            boxShadow: '0 0 40px var(--accent-glow)',
          }}
        >
          <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm md:text-[15px] font-semibold text-white">Conversation complete!</p>
            <p className="text-xs md:text-[13px] text-pink-400">Edit your answers before submitting</p>
          </div>
          <button
            onClick={() => setShowEditPrompt(false)}
            className="ml-auto p-1 shrink-0"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Celebration Modal */}
      {state.status === 'submitted' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in"
          style={{ background: 'rgba(10, 10, 18, 0.9)' }}
        >
          <div className="text-center p-8 md:p-12 rounded-3xl max-w-sm w-full animate-in zoom-in-95"
            style={{
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 18, 0.95) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 0 60px rgba(16, 185, 129, 0.2)',
            }}
          >
            <div
              className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-5 md:mb-6 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--green-500) 0%, #059669 100%)',
                boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-[28px] font-bold text-white mb-3">You&apos;re all set!</h2>
            <p className="text-sm md:text-base text-gray-400 leading-relaxed mb-2">
              Congratulations on submitting your answers!
            </p>
            <p className="text-base md:text-lg font-semibold" style={{ color: 'var(--green-500)' }}>
              We&apos;re going to match you with cool people!
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
