import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { attendeeId, token, answers, transcript } = await request.json()
  const supabase = await createClient()

  // Verify attendee exists and token matches
  const { data: attendee, error: attendeeError } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('id', attendeeId)
    .eq('token', token)
    .single()

  if (attendeeError || !attendee) {
    return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
  }

  // Generate answer text for embedding
  const answerText = Object.values(answers).filter(Boolean).join(' ')

  let embedding: number[] | null = null
  let topics: string[] = []

  // Only generate embedding and topics if we have answer text and API key
  if (answerText.trim() && process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    try {
      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: answerText,
      })
      embedding = embeddingResponse.data[0].embedding

      // Extract topics
      const topicsPrompt = `Extract 3-5 topic tags from this text. Return as JSON array of strings.
Text: ${answerText}`

      const topicsResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: topicsPrompt }],
        response_format: { type: 'json_object' },
      })

      const topicsData = JSON.parse(topicsResponse.choices[0].message.content || '{"topics":[]}')
      topics = topicsData.topics || []
    } catch (error) {
      console.error('OpenAI error:', error)
      // Continue without embedding/topics if OpenAI fails
    }
  }

  // Format transcript as text
  const transcriptText = transcript
    .map((entry: { role: string; text: string }) => `${entry.role}: ${entry.text}`)
    .join('\n')

  // Save response (use insert, not upsert, to work with RLS)
  const { error: responseError } = await supabase
    .from('responses')
    .insert({
      attendee_id: attendeeId,
      answers,
      embedding,
      topics,
      mode: 'voice',
      transcript: transcriptText,
    })

  if (responseError) {
    return NextResponse.json({ error: responseError.message }, { status: 500 })
  }

  // Update attendee status
  await supabase
    .from('attendees')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', attendeeId)

  return NextResponse.json({ success: true })
}
