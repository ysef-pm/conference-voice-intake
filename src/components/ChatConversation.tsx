'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatConversationProps {
  attendeeId: string
  token: string
  eventName: string
  attendeeName: string | null
  questions: Array<{ field: string; label: string }>
}

// Placeholder ChatConversation component
// Full implementation will be added in Task 5.2
export function ChatConversation({
  attendeeId,
  token,
  eventName,
  attendeeName,
  questions,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Start conversation with greeting
  useEffect(() => {
    const startConversation = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            eventName,
            attendeeName,
            questions,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to start conversation')
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let assistantMessage = ''

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break
          assistantMessage += decoder.decode(value)
          setMessages([{ role: 'assistant', content: assistantMessage }])
        }
      } catch (error) {
        console.error('Failed to start conversation:', error)
        setMessages([{
          role: 'assistant',
          content: `Hi${attendeeName ? ` ${attendeeName}` : ''}! Welcome to ${eventName}. I'd love to learn more about you. ${questions[0]?.label || 'Tell me about yourself.'}`
        }])
      }
      setIsLoading(false)
    }

    startConversation()
  }, [eventName, attendeeName, questions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          eventName,
          attendeeName,
          questions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        assistantMessage += decoder.decode(value)
        setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
      }

      // Check if conversation is complete
      if (assistantMessage.includes('[COMPLETE]')) {
        setIsComplete(true)
        // Save responses
        await fetch('/api/submit-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attendeeId,
            transcript: [...newMessages, { role: 'assistant', content: assistantMessage }],
          }),
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I had trouble processing that. Could you try again?'
      }])
    }

    setIsLoading(false)
  }

  const handleComplete = () => {
    router.push(`/intake/${token}/complete`)
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="text-center mb-4">
        <h1 className="text-xl font-semibold text-white">{eventName}</h1>
        <p className="text-sm text-gray-400">Chat with our AI assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {message.content.replace('[COMPLETE]', '')}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isComplete ? (
        <Button
          onClick={handleComplete}
          className="w-full bg-pink-500 hover:bg-pink-600"
        >
          Continue
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            disabled={isLoading}
            className="bg-gray-800 border-gray-700"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
