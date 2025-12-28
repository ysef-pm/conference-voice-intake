# Conference Voice Intake - Design Document

## Overview

A voice-powered conference attendee intake application. Users answer 3 questions via natural voice conversation with an AI agent, review/edit their answers, and submit to a Google Sheet via webhook.

**Based on:** FormTalk architecture (minimal clone approach)

## User Flow

1. **Welcome Page** - Conference branding, brief explanation, "Get Started" button
2. **Conversation Page** - Split view: questions/answers on left, voice controls + transcript on right
3. **Edit Mode** - After all questions answered, user can edit any answer via text input
4. **Submit** - Sends data to webhook, shows success confirmation

**States:** `idle` → `connecting` → `conversing` → `complete` → `editing` → `submitted`

## Hard-Coded Questions

| Index | Field | Question |
|-------|-------|----------|
| 0 | `whyJoining` | Why are you joining this conference? |
| 1 | `aboutYourself` | Tell us a little bit about yourself and what you do |
| 2 | `challenges` | What are the three biggest challenges you'd love to talk to other people about? |

## Architecture

### Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + inline styles (pink theme)
- **Voice AI:** ElevenLabs Conversational AI (WebSocket)
- **Answer Extraction:** OpenAI GPT-4o-mini
- **Deployment:** Vercel

### Directory Structure

```
conference-voice-intake/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Welcome screen
│   │   ├── conversation/
│   │   │   └── page.tsx             # Main conversation page
│   │   ├── api/
│   │   │   ├── get-agent-token/     # ElevenLabs signed URL
│   │   │   ├── extract-answer/      # OpenAI answer extraction
│   │   │   └── submit-answers/      # Webhook forwarder
│   │   └── globals.css
│   ├── components/
│   │   ├── WelcomeHero.tsx          # Pink gradient hero + CTA
│   │   ├── QuestionCard.tsx         # Single Q&A display
│   │   ├── QuestionList.tsx         # Left panel: 3 QuestionCards
│   │   ├── VoiceControls.tsx        # Mic button (pink theme)
│   │   ├── Conversation.tsx         # Transcript display
│   │   └── EditableAnswer.tsx       # Text input for editing
│   ├── hooks/
│   │   └── useConversation.ts       # ElevenLabs WebSocket management
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── docs/
│   └── plans/
└── public/
```

### State Management

```typescript
interface AppState {
  status: "idle" | "connecting" | "conversing" | "complete" | "editing" | "submitted";
  currentQuestionIndex: number;
  answers: {
    whyJoining: string;
    aboutYourself: string;
    challenges: string;
  };
  transcript: TranscriptEntry[];
  userName: string;   // Pre-populated (test: "Jan Smolby")
  userEmail: string;  // Pre-populated
}

interface TranscriptEntry {
  role: "agent" | "user";
  text: string;
  timestamp: Date;
}
```

## ElevenLabs Integration

### New Agent Configuration

- **Personality:** Friendly conference host, warm and conversational
- **System Prompt:** "You are a friendly conference assistant helping attendees share about themselves. Ask each question naturally, acknowledge their responses warmly, then call submitAnswer and move to the next question. Keep it conversational but efficient. If the user asks for clarification, help them understand, then wait for their actual answer before submitting."

### Client Tools

```typescript
const clientTools = {
  getNextQuestion: () => {
    const questions = [
      { index: 0, field: "whyJoining", label: "Why are you joining this conference?" },
      { index: 1, field: "aboutYourself", label: "Tell us a little bit about yourself and what you do" },
      { index: 2, field: "challenges", label: "What are the three biggest challenges you'd love to talk to other people about?" }
    ];
    const next = questions.find(q => !answers[q.field]);
    if (!next) return { complete: true };

    activeFieldRef.current = next.field;
    userResponsesRef.current = [];
    return next;
  },

  submitAnswer: ({ field, value }) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
    setCurrentQuestionIndex(prev => prev + 1);
    return { success: true };
  }
}
```

### Hybrid Answer Extraction

Matches FormTalk pattern - handles clarifications and natural conversation:

1. Agent asks question, user may ask for clarification
2. Agent clarifies, user gives actual answer
3. Agent calls `submitAnswer()` with extracted value
4. Answer populates in preview, moves to next question

Fallback: If agent moves on without explicit submit, extract answer from accumulated user speech via `/api/extract-answer`.

## UI Design

### Color Scheme (Pink Theme)

```css
--pink-400: #f472b6;
--pink-500: #ec4899;
--pink-600: #db2777;
--accent: var(--pink-500);
--accent-glow: rgba(236, 72, 153, 0.3);
--glass-border: rgba(236, 72, 153, 0.15);

--background-dark: #0a0a12;
--background-card: #0f0f1a;
--text-primary: #ffffff;
--text-secondary: #94a3b8;
```

### Split View Layout

```
┌─────────────────────────────────────────────────────────┐
│  Logo                              [Edit] [Submit]      │
├────────────────────────┬────────────────────────────────┤
│   QUESTION PREVIEW     │      VOICE CONTROLS            │
│                        │                                │
│   ┌──────────────────┐ │      🎤 (pink glow)            │
│   │ Q1: Why joining? │ │        Listening...            │
│   │ ✓ "AI in health" │ │                                │
│   └──────────────────┘ │   ┌────────────────────────┐   │
│                        │   │ Agent: Tell me about   │   │
│   ┌──────────────────┐ │   │        yourself...     │   │
│   │ Q2: About you    │ │   │ You: I'm a product    │   │
│   │ → (active/pink)  │ │   │      manager at...    │   │
│   └──────────────────┘ │   └────────────────────────┘   │
│                        │         TRANSCRIPT             │
│   ┌──────────────────┐ │                                │
│   │ Q3: Challenges   │ │                                │
│   │ ○ (pending)      │ │                                │
│   └──────────────────┘ │                                │
│   [2/3] Progress       │                                │
└────────────────────────┴────────────────────────────────┘
```

### QuestionCard States

| State | Border | Icon | Background |
|-------|--------|------|------------|
| Pending | Gray | Small circle | Transparent |
| Active | Pink + glow | Arrow → | Pink tint, pulsing |
| Answered | Green | Checkmark ✓ | Green tint |

## Webhook Integration

### Submission Payload

```json
{
  "timestamp": "2025-12-28T14:30:00Z",
  "userName": "Jan Smolby",
  "userEmail": "jan@example.com",
  "whyJoining": "Interested in AI applications in healthcare",
  "aboutYourself": "Product manager at a health tech startup, 5 years experience",
  "challenges": "1. Scaling AI models, 2. Regulatory compliance, 3. User adoption"
}
```

### API Route `/api/submit-answers`

Server-side proxy to keep webhook URL private:

```typescript
export async function POST(req) {
  const { userName, userEmail, answers } = await req.json();

  await fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      userName,
      userEmail,
      ...answers
    })
  });

  return Response.json({ success: true });
}
```

## Error Handling

| Scenario | Response |
|----------|----------|
| WebSocket connection fails | "Connection failed. Please try again." + retry button |
| Connection drops mid-conversation | Auto-reconnect, preserve answered questions |
| Microphone denied | Clear instructions for enabling mic access |
| User silent 30s | Agent prompts: "Are you still there?" |
| Webhook fails | Retry 3x with exponential backoff, then show error |
| Page refresh mid-conversation | Offer resume or start over (sessionStorage backup) |

## Environment Variables

```env
ELEVENLABS_API_KEY=xxx
ELEVENLABS_AGENT_ID=xxx
OPENAI_API_KEY=xxx
WEBHOOK_URL=xxx
NEXT_PUBLIC_DEFAULT_NAME="Jan Smolby"
NEXT_PUBLIC_DEFAULT_EMAIL="jan@example.com"
```

## What We Skip from FormTalk

- No PDF upload/parsing
- No Firebase storage
- No Supabase auth/billing
- No field detection/classification
- No PDF filling/generation

## Next Steps

1. Create ElevenLabs agent with conference personality
2. Set up Next.js project with Tailwind
3. Implement useConversation hook (adapt from FormTalk)
4. Build UI components with pink theme
5. Add API routes
6. Set up n8n/Make webhook for Google Sheets
7. Deploy to Vercel
