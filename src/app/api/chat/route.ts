import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  const { messages, eventName, attendeeName, questions } = await request.json()

  const systemPrompt = `You are a friendly AI assistant helping gather information from attendees for ${eventName}.
Your goal is to have a natural conversation and learn about the attendee.

${attendeeName ? `The attendee's name is ${attendeeName}.` : ''}

You need to gather answers to these questions through natural conversation:
${questions.map((q: { label: string }, i: number) => `${i + 1}. ${q.label}`).join('\n')}

Guidelines:
- Be warm, friendly, and conversational
- Ask one question at a time
- If an answer is too brief, ask a follow-up to get more detail
- Once you have good answers to all questions, summarize what you learned and ask if they want to make any changes
- Keep responses concise (2-3 sentences max)
- When all questions are answered, end with: [COMPLETE]`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
