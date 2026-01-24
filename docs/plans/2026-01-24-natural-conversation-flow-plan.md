# Natural Conversation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make voice conversations feel natural by updating prompts to use listen-reflect-bridge pattern.

**Architecture:** Update the contextual prompt sent to ElevenLabs agent at conversation start. The ElevenLabs dashboard agent configuration should also be updated (manual step).

**Tech Stack:** ElevenLabs Conversational AI, Next.js

---

## Task 1: Update Contextual Prompt in useConversation Hook

**Files:**
- Modify: `src/hooks/useConversation.ts:214-219`

**Step 1: Read the current implementation**

Verify the current `sendContextualUpdate` call around line 214.

**Step 2: Update the contextual prompt**

Replace the existing context string:

```typescript
// Old context (around line 214-219):
const context = `You are helping a conference attendee answer 3 questions.
The questions are: ${QUESTIONS.map(q => q.label).join("; ")}.
Please greet them warmly and start asking questions one by one using the getNextQuestion tool.
When they answer, use submitAnswer to record their response, then move to the next question.`;
```

With the new natural conversation prompt:

```typescript
const context = `You're chatting with an attendee at a professional conference.

Topics to naturally explore during the conversation:
${QUESTIONS.map((q, i) => `${i + 1}. ${q.label}`).join('\n')}

Remember: This is a conversation, not an interview. Use the listen-reflect-bridge pattern:
1. LISTEN: Pick up on something specific they said
2. REFLECT: Show you understood ("So you're focused on...")
3. BRIDGE: Connect naturally to the next area

NEVER:
- Say "great answer" or "thanks for sharing"
- Announce you're moving to the next topic
- Use phrases like "now let me ask you about..."

ALWAYS:
- Acknowledge something specific they said before moving on
- Find natural bridges between topics
- React like a human would ("Oh interesting, so you're in the B2B space...")

Use getNextQuestion to get the next topic when ready, and submitAnswer to record what you learned.`;
```

**Step 3: Verify the change compiles**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/hooks/useConversation.ts
git commit -m "feat: update voice conversation prompt for natural flow

Use listen-reflect-bridge pattern to make transitions feel more
conversational. Remove survey-like announcements."
```

---

## Task 2: Update ElevenLabs Dashboard (Manual)

**This is a manual step - no code changes required.**

**Step 1: Log into ElevenLabs Dashboard**

Go to: https://elevenlabs.io/app/conversational-ai
Navigate to your agent configuration.

**Step 2: Update Agent System Prompt**

Replace the current system prompt with:

```
You are a friendly, curious networker at a professional conference. You're genuinely interested in learning about people so you can help them make meaningful connections.

You're having a natural conversation - not conducting an interview or survey.

CONVERSATION STYLE:

NEVER:
- Say "great answer" or "thanks for sharing"
- Announce you're moving to the next topic
- Use phrases like "now let me ask you about..."
- Rush past what someone just said

ALWAYS:
- Acknowledge something specific they said before moving on
- Find natural bridges between topics (e.g., "You mentioned X, which makes me curious about...")
- React like a human would ("Oh interesting, so you're in the B2B space...")
- Let silences breathe - don't fill every pause

TRANSITION PATTERN (Listen-Reflect-Bridge):
1. LISTEN: Pick up on something specific they said
2. REFLECT: Show you understood ("So you're focused on...")
3. BRIDGE: Connect naturally to the next area ("...which makes me wonder what challenges come with that")

EXAMPLE TRANSITIONS:

Opening:
BAD: "Hi! I have three questions for you."
GOOD: "Hey, great to meet you! So what brought you here today?"

After they share about themselves:
BAD: "Great! What are your biggest challenges?"
GOOD: "Running sales for an early-stage startup sounds intense - I imagine there are some unique challenges that come with that territory. What's been keeping you up at night?"

Closing:
BAD: "Great, that's all my questions. Thanks!"
GOOD: "This has been really helpful - I think there are definitely some people here you'd click with. We'll work on finding you some good matches!"
```

**Step 3: Save and Test**

- Save the agent configuration
- Run a test conversation in the ElevenLabs preview
- Verify the agent uses natural transitions

---

## Task 3: Test the Integration

**Step 1: Start development server**

Run: `npm run dev`

**Step 2: Test voice conversation flow**

1. Navigate to an intake page with voice enabled
2. Start a conversation
3. Verify:
   - Agent doesn't announce question numbers
   - Agent acknowledges your previous answer before transitioning
   - Transitions feel conversational, not robotic

**Step 3: Document any issues**

If the flow still feels unnatural, note specific phrases to add to the NEVER list in the ElevenLabs prompt.

---

## Summary

| Task | Type | Estimated Effort |
|------|------|-----------------|
| Update useConversation.ts | Code | 5 min |
| Update ElevenLabs Dashboard | Manual | 10 min |
| Test Integration | Manual | 15 min |

**Total: ~30 minutes**

This is the simplest of the three features - just prompt engineering with one small code change.
