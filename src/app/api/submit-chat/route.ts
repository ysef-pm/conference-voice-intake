import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { attendeeId, transcript } = await request.json()
  const supabase = await createClient()

  // Get attendee and event questions
  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('id', attendeeId)
    .single()

  if (!attendee) {
    return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
  }

  const event = attendee.events as { questions: Array<{ field: string; label: string }> }
  const transcriptText = transcript.map((m: { role: string; content: string }) =>
    `${m.role}: ${m.content}`
  ).join('\n')

  let answers: Record<string, string> = {}
  let embedding: number[] | null = null
  let topics: string[] = []

  // Only use OpenAI if API key is configured
  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    try {
      // Extract answers using GPT
      const extractionPrompt = `Extract the answers from this conversation transcript.

Questions to extract:
${event.questions.map((q: { field: string; label: string }) => `- ${q.field}: ${q.label}`).join('\n')}

Transcript:
${transcriptText}

Return a JSON object with the field names as keys and the extracted answers as values.
Only return the JSON, no other text.`

      const extraction = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: extractionPrompt }],
        response_format: { type: 'json_object' },
      })

      answers = JSON.parse(extraction.choices[0].message.content || '{}')

      // Generate embedding
      const answerText = Object.values(answers).join(' ')

      if (answerText.trim()) {
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
      }
    } catch (error) {
      console.error('OpenAI error:', error)
    }
  }

  // Save response (use insert, not upsert, to work with RLS)
  const { error: responseError } = await supabase
    .from('responses')
    .insert({
      attendee_id: attendeeId,
      answers,
      embedding,
      topics,
      mode: 'chat',
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
