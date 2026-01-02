# Admin Dashboard & Matchys.ai Feature Design

## Overview

Extend the conference voice intake tool into a full-featured admin dashboard for event organizers, enabling CSV attendee import, voice/chat intake options, AI-powered matching, and analytics.

**Primary use case**: Post-registration networking - organizers import attendees who already have tickets, system reaches out to gather info for AI matching.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data layer | Supabase | Auth, database, real-time, edge functions in one. Free tier generous |
| Matching | Embeddings + pgvector | Scalable, industry standard. Cosine similarity for match scoring |
| Chat mode | Streaming LLM | Real conversational feel, handles follow-ups naturally |
| Email | Resend | Simple API, good deliverability, tracking built-in |
| Outreach | Email only | No WhatsApp Business API complexity for v1 |

## User Flows

### Organizer Flow
```
Sign up → Create Event → Configure Questions → Import CSV →
Monitor Pipeline → Review Responses → Generate Matches → Send Introductions
```

### Attendee Flow
```
Receive Email → Click "Start Now" OR "Schedule for Later" →
Landing page (voice/chat choice) → Complete conversation →
See summary → Consent to matching → Done
```

### Scheduling Flow (new feature)
```
Attendee clicks "Schedule for Later" in email
        ↓
Opens /schedule/[token] - picks date/time
        ↓
System generates ICS file:
- URL points directly to voice agent
- 15-minute calendar block
        ↓
ICS downloaded + confirmation email sent
```

## Database Schema

### organizations
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Organization name |
| owner_id | uuid | References auth.users |
| created_at | timestamp | |

### events
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| organization_id | uuid | Foreign key |
| name | text | Event name |
| slug | text | URL-friendly identifier |
| questions | jsonb | Array of configurable questions |
| email_template | jsonb | Customizable email content |
| branding | jsonb | Logo, colors |
| status | enum | draft, active, completed |
| created_at | timestamp | |

### attendees
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | Foreign key |
| email | text | Attendee email |
| name | text | Attendee name |
| phone | text | Optional |
| token | uuid | Unique URL identifier |
| status | enum | imported, contacted, scheduled, clicked, in_progress, completed, matched |
| scheduled_at | timestamp | If they chose "schedule for later" |
| contacted_at | timestamp | When email sent |
| completed_at | timestamp | When intake finished |

### responses
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| attendee_id | uuid | Foreign key |
| answers | jsonb | Flexible for custom questions |
| embedding | vector(1536) | For matching (pgvector) |
| topics | jsonb | Extracted topic tags |
| mode | enum | voice, chat |
| transcript | text | Full conversation |
| created_at | timestamp | |

### matches
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| event_id | uuid | Foreign key |
| attendee_a_id | uuid | Foreign key |
| attendee_b_id | uuid | Foreign key |
| similarity_score | float | Cosine similarity |
| common_interests | text | LLM-extracted summary |
| status | enum | pending, a_consented, b_consented, introduced |
| introduced_at | timestamp | When intro email sent |

## Dashboard Structure

```
/dashboard
├── /events                    # List all events
├── /events/[id]              # Single event overview
│   ├── /attendees            # Import CSV, view list, statuses
│   ├── /questions            # Configure intake questions
│   ├── /conversations        # View all responses/transcripts
│   ├── /matches              # Generate & manage matches
│   ├── /analytics            # Trending topics, stats
│   └── /settings             # Email templates, branding
```

### Event Overview Dashboard
- **Stats cards**: Total Attendees, Completed Conversations, Matches Made, Introductions Sent
- **Pipeline funnel**: Imported → Contacted → Scheduled → Responded → Matched
- **Quick actions**: Import Attendees, Configure Questions, Send Reminders
- **Trending Topics sidebar**: AI-extracted themes from responses

## Email System

| Email Type | Trigger | Content |
|------------|---------|---------|
| Initial Outreach | Organizer sends | Intro + "Start Now" + "Schedule for Later" |
| Schedule Confirmation | Attendee picks time | ICS attachment + reminder |
| Reminder | 24h before scheduled OR 3 days no response | Nudge to complete |
| Match Request | Match generated | "We found someone" + consent button |
| Introduction | Both parties consent | Mutual intro with profiles |

### Email Personalization
- Organizer customizes template per event
- Variables: `{{attendee_name}}`, `{{event_name}}`, `{{unique_link}}`
- Preview before sending

## Matching Algorithm

### Embedding Generation
```
Attendee completes conversation
        ↓
Extract structured answers
        ↓
Concatenate: "Goals: [a1]. About: [a2]. Challenges: [a3]"
        ↓
OpenAI text-embedding-3-small → 1536-dim vector
        ↓
Store in responses.embedding
```

### Match Query (pgvector)
```sql
SELECT
  a.attendee_id as attendee_a,
  b.attendee_id as attendee_b,
  1 - (a.embedding <=> b.embedding) as similarity
FROM responses a
CROSS JOIN responses b
WHERE a.attendee_id < b.attendee_id
  AND a.event_id = b.event_id
  AND 1 - (a.embedding <=> b.embedding) > 0.75
ORDER BY similarity DESC;
```

### Double Opt-in Flow
```
Match generated (pending)
    ↓
Email Attendee A → clicks Yes → (a_consented)
    ↓
Email Attendee B → clicks Yes → (introduced)
    ↓
Send mutual introduction email
```

### Organizer Controls
- Auto-generate vs manual trigger
- Max matches per attendee (3-5)
- Optional review gate before sending
- Exclude specific attendees

## Attendee Intake Experience

### Landing Page (`/intake/[token]`)
```
Validates token → fetches event branding
        ↓
"Hi [Name], welcome to [Event]!"
        ↓
┌─────────────────┐  ┌─────────────────┐
│  🎤 Talk to me  │  │  💬 Type instead │
└─────────────────┘  └─────────────────┘
```

### Voice Mode
- ElevenLabs conversational agent (existing)
- Questions from `events.questions` (configurable)
- Real-time transcript display

### Chat Mode (new)
- Streaming OpenAI chat
- Same AI personality as voice
- Natural conversation with follow-ups
- Typing indicator, message bubbles

### Completion Screen
- Editable summary cards
- Matching consent prompt
- Confirmation message

## Analytics

### Pipeline Metrics
- Completion rate funnel
- Response mode split (voice vs chat)
- Avg completion time
- Peak activity times

### Trending Topics
- LLM extracts 3-5 tags per response
- Aggregate for leaderboard view
- Word cloud of challenges

### Exports
- CSV of attendees + responses
- PDF report for sponsors (anonymized)
- Match report

## Security

### Authentication
- **Organizers**: Supabase Auth (email/password, magic link)
- **Attendees**: Token-based, no login required

### Row-Level Security
- Organizers only see own organization's data
- Attendee data accessible via valid token or org owner

### API Security
- Dashboard APIs require JWT
- Attendee APIs validate token
- Rate limiting on email/LLM calls

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14, App Router, Tailwind |
| Backend | Next.js API routes, Supabase Edge Functions |
| Database | Supabase PostgreSQL + pgvector |
| Auth | Supabase Auth |
| Voice | ElevenLabs |
| Chat | OpenAI GPT-4 streaming |
| Embeddings | OpenAI text-embedding-3-small |
| Email | Resend |
| Hosting | Vercel |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
OPENAI_API_KEY
ELEVENLABS_API_KEY
RESEND_API_KEY
```
