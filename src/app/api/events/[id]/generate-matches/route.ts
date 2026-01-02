import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

// Create OpenAI client lazily to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not configured, using fallback for common interests')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface AttendeeWithResponse {
  id: string
  name: string | null
  email: string
  embedding: number[]
  answers: Record<string, string>
}

interface SimilarAttendee {
  id: string
  name: string | null
  email: string
  distance: number
  answers: Record<string, string>
}

interface MatchPair {
  attendeeA: AttendeeWithResponse
  attendeeB: AttendeeWithResponse
  distance: number
}

// Helper to process array in batches
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(batch.map(processor))
    results.push(...batchResults)
  }

  return results
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - verify user owns the organization for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, organization_id, organizations!inner(owner_id)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if the user owns the organization
    const organization = event.organizations as unknown as { owner_id: string }
    if (organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all completed attendees with responses that have embeddings
    // We need to use raw SQL to work with vector embeddings
    const { data: attendeesWithResponses, error: attendeesError } = await supabase
      .from('attendees')
      .select(`
        id,
        name,
        email,
        responses!inner (
          embedding,
          answers
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'completed')
      .not('responses.embedding', 'is', null)

    if (attendeesError) {
      return NextResponse.json({ error: attendeesError.message }, { status: 500 })
    }

    if (!attendeesWithResponses || attendeesWithResponses.length < 2) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Need at least 2 completed attendees with responses to generate matches'
      })
    }

    // Transform data to a usable format
    const attendees: AttendeeWithResponse[] = attendeesWithResponses.map(a => {
      const response = Array.isArray(a.responses) ? a.responses[0] : a.responses
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        embedding: response.embedding as number[],
        answers: response.answers as Record<string, string>,
      }
    })

    // Get existing matches to avoid duplicates
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('attendee_a_id, attendee_b_id')
      .eq('event_id', eventId)

    const existingMatchSet = new Set<string>()
    if (existingMatches) {
      for (const match of existingMatches) {
        // Add both orderings to the set
        existingMatchSet.add(`${match.attendee_a_id}-${match.attendee_b_id}`)
        existingMatchSet.add(`${match.attendee_b_id}-${match.attendee_a_id}`)
      }
    }

    const errors: string[] = []

    // Phase 1: Collect all match pairs that need processing
    const matchPairs: MatchPair[] = []

    for (const attendee of attendees) {
      // Use Supabase RPC to call a function that does vector similarity search
      // Since we can't use the <=> operator directly, we'll use raw SQL via RPC
      const embeddingString = `[${attendee.embedding.join(',')}]`

      // Find similar attendees using cosine distance
      const { data: similarAttendees, error: similarError } = await supabase.rpc(
        'find_similar_attendees',
        {
          query_embedding: embeddingString,
          event_id_param: eventId,
          exclude_attendee_id: attendee.id,
          match_limit: 3
        }
      )

      if (similarError) {
        // If the RPC doesn't exist, fall back to manual calculation
        // This is less efficient but works without database function
        const otherAttendees = attendees.filter(a => a.id !== attendee.id)
        const similarities: { attendee: AttendeeWithResponse; distance: number }[] = []

        for (const other of otherAttendees) {
          // Calculate cosine distance manually
          const distance = cosineDistance(attendee.embedding, other.embedding)
          similarities.push({ attendee: other, distance })
        }

        // Sort by distance (lower is more similar) and take top 3
        similarities.sort((a, b) => a.distance - b.distance)
        const top3 = similarities.slice(0, 3)

        for (const { attendee: otherAttendee, distance } of top3) {
          const matchKey = `${attendee.id}-${otherAttendee.id}`
          const reverseKey = `${otherAttendee.id}-${attendee.id}`

          // Skip if match already exists
          if (existingMatchSet.has(matchKey) || existingMatchSet.has(reverseKey)) {
            continue
          }

          // Add to pairs to process
          matchPairs.push({
            attendeeA: attendee,
            attendeeB: otherAttendee,
            distance
          })

          // Mark as processed to prevent duplicates
          existingMatchSet.add(matchKey)
          existingMatchSet.add(reverseKey)
        }
        continue
      }

      // Process results from RPC if available
      if (similarAttendees) {
        for (const similar of similarAttendees as SimilarAttendee[]) {
          const matchKey = `${attendee.id}-${similar.id}`
          const reverseKey = `${similar.id}-${attendee.id}`

          // Skip if match already exists
          if (existingMatchSet.has(matchKey) || existingMatchSet.has(reverseKey)) {
            continue
          }

          // Find the other attendee's data
          const otherAttendee = attendees.find(a => a.id === similar.id)
          if (!otherAttendee) continue

          // Add to pairs to process
          matchPairs.push({
            attendeeA: attendee,
            attendeeB: otherAttendee,
            distance: similar.distance
          })

          // Mark as processed to prevent duplicates
          existingMatchSet.add(matchKey)
          existingMatchSet.add(reverseKey)
        }
      }
    }

    // Phase 2: Generate common interests in batches (5 at a time to avoid rate limits)
    const BATCH_SIZE = 5
    const matchResults = await processBatches(
      matchPairs,
      BATCH_SIZE,
      async (pair) => {
        const commonInterests = await generateCommonInterests(
          pair.attendeeA.name || pair.attendeeA.email,
          pair.attendeeA.answers,
          pair.attendeeB.name || pair.attendeeB.email,
          pair.attendeeB.answers
        )
        // Clamp similarity score to valid range [0, 1]
        const similarityScore = Math.max(0, Math.min(1, 1 - pair.distance))
        return {
          event_id: eventId,
          attendee_a_id: pair.attendeeA.id,
          attendee_b_id: pair.attendeeB.id,
          similarity_score: similarityScore,
          common_interests: commonInterests,
          status: 'pending' as const
        }
      }
    )

    // Phase 3: Collect successful results and insert all at once
    const matchesToInsert: {
      event_id: string
      attendee_a_id: string
      attendee_b_id: string
      similarity_score: number
      common_interests: string
      status: 'pending'
    }[] = []

    for (const result of matchResults) {
      if (result.status === 'fulfilled') {
        matchesToInsert.push(result.value)
      } else {
        errors.push(`Error generating common interests: ${result.reason}`)
      }
    }

    // Insert all matches in one operation
    let matchesCreated = 0
    if (matchesToInsert.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select('id')

      if (insertError) {
        errors.push(`Failed to insert matches: ${insertError.message}`)
      } else {
        matchesCreated = insertedData?.length || matchesToInsert.length
      }
    }

    return NextResponse.json({
      success: true,
      count: matchesCreated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Generated ${matchesCreated} new matches`
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to generate matches'
    }, { status: 500 })
  }
}

// Helper function to calculate cosine distance between two vectors
function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  // Cosine distance = 1 - cosine similarity
  return 1 - similarity
}

// Helper function to generate common interests text using GPT
async function generateCommonInterests(
  nameA: string,
  answersA: Record<string, string>,
  nameB: string,
  answersB: Record<string, string>
): Promise<string> {
  const prompt = `Based on these two attendee profiles, identify 2-3 common interests or topics they could discuss.

Attendee 1 (${nameA}):
${Object.entries(answersA).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Attendee 2 (${nameB}):
${Object.entries(answersB).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Write a brief, friendly description (2-3 sentences) of what they have in common and why they'd enjoy meeting. Focus on shared interests, challenges, or goals.`

  try {
    const openai = getOpenAIClient()
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    })

    return response.choices[0].message.content || 'Similar interests and goals detected.'
  } catch {
    return 'Common interests identified through profile similarity.'
  }
}
