# Conference Voice Intake - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a voice-powered conference attendee intake app that asks 3 questions via ElevenLabs, displays answers in real-time, allows editing, and submits to a webhook.

**Architecture:** Next.js App Router with ElevenLabs WebSocket integration (adapted from FormTalk). Client-side state management, server-side API routes for token generation and answer extraction.

**Tech Stack:** Next.js 14, React 19, Tailwind CSS, ElevenLabs Conversational AI, OpenAI GPT-4o-mini, TypeScript

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

**Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
cd /Users/youssefhounat/code/conference-voice-intake
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

**Step 2: Verify project structure exists**

```bash
ls -la src/app/
```

Expected: `layout.tsx`, `page.tsx`, `globals.css`

**Step 3: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with TypeScript and Tailwind"
```

---

## Task 2: Configure Pink Theme & Global Styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Update globals.css with pink theme design tokens**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  /* Pink Theme */
  --pink-400: #f472b6;
  --pink-500: #ec4899;
  --pink-600: #db2777;

  /* Accent */
  --accent: var(--pink-500);
  --accent-glow: rgba(236, 72, 153, 0.3);
  --glass-border: rgba(236, 72, 153, 0.15);

  /* Backgrounds */
  --background-dark: #0a0a12;
  --background-card: #0f0f1a;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Status Colors */
  --green-500: #10b981;
  --red-500: #ef4444;
}

html {
  color-scheme: dark;
}

body {
  background: var(--background-dark);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}

/* Animations */
@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes ping {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

**Step 2: Update layout.tsx with dark theme**

Replace `src/app/layout.tsx` with:

```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conference Voice Intake",
  description: "Answer questions about yourself via voice conversation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: configure pink theme and global styles"
```

---

## Task 3: Create TypeScript Types

**Files:**
- Create: `src/types/index.ts`

**Step 1: Create types file with all interfaces**

```typescript
// src/types/index.ts

// Conversation transcript entry
export interface TranscriptEntry {
  role: "agent" | "user";
  text: string;
  timestamp: Date;
}

// Hard-coded question definition
export interface Question {
  index: number;
  field: "whyJoining" | "aboutYourself" | "challenges";
  label: string;
}

// Answer state
export interface Answers {
  whyJoining: string;
  aboutYourself: string;
  challenges: string;
}

// Application status
export type AppStatus =
  | "idle"
  | "connecting"
  | "conversing"
  | "complete"
  | "editing"
  | "submitted";

// Main application state
export interface AppState {
  status: AppStatus;
  currentQuestionIndex: number;
  answers: Answers;
  transcript: TranscriptEntry[];
  error: string | null;
  lastUpdatedField: string | null;
  userName: string;
  userEmail: string;
}

// Response from /api/get-agent-token endpoint
export interface AgentTokenResponse {
  signedUrl: string;
  expiresAt: string;
}

// Client tool responses for ElevenLabs
export interface NextQuestionResponse {
  index: number;
  field: string;
  label: string;
  questionNumber: number;
  totalQuestions: number;
}

export interface DoneResponse {
  complete: true;
}

export interface SubmitAnswerParams {
  field: string;
  value: string;
}

// Webhook payload
export interface WebhookPayload {
  timestamp: string;
  userName: string;
  userEmail: string;
  whyJoining: string;
  aboutYourself: string;
  challenges: string;
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 4: Create Questions Constants

**Files:**
- Create: `src/lib/questions.ts`

**Step 1: Create questions constant file**

```typescript
// src/lib/questions.ts

import { Question } from "@/types";

export const QUESTIONS: Question[] = [
  {
    index: 0,
    field: "whyJoining",
    label: "Why are you joining this conference?",
  },
  {
    index: 1,
    field: "aboutYourself",
    label: "Tell us a little bit about yourself and what you do",
  },
  {
    index: 2,
    field: "challenges",
    label: "What are the three biggest challenges you'd love to talk to other people about?",
  },
];

export const INITIAL_ANSWERS = {
  whyJoining: "",
  aboutYourself: "",
  challenges: "",
};
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add hard-coded questions constants"
```

---

## Task 5: Create Environment Configuration

**Files:**
- Create: `.env.example`
- Create: `.env.local` (gitignored)

**Step 1: Create .env.example**

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here

# OpenAI Configuration (for answer extraction)
OPENAI_API_KEY=your_openai_key_here

# Webhook Configuration
WEBHOOK_URL=your_webhook_url_here

# Default User (for testing)
NEXT_PUBLIC_DEFAULT_NAME="Jan Smolby"
NEXT_PUBLIC_DEFAULT_EMAIL="jan@example.com"
```

**Step 2: Create .gitignore entry for .env.local**

Verify `.env.local` is in `.gitignore` (Next.js includes this by default).

**Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add environment configuration template"
```

---

## Task 6: Create API Route - Get Agent Token

**Files:**
- Create: `src/app/api/get-agent-token/route.ts`

**Step 1: Create the API route**

```typescript
// src/app/api/get-agent-token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { AgentTokenResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey) {
      console.error("[get-agent-token] Missing ELEVENLABS_API_KEY");
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" },
        { status: 500 }
      );
    }

    if (!agentId) {
      console.error("[get-agent-token] Missing ELEVENLABS_AGENT_ID");
      return NextResponse.json(
        { error: "Server configuration error: Missing Agent ID" },
        { status: 500 }
      );
    }

    // Request signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[get-agent-token] ElevenLabs API error:", errorText);
      return NextResponse.json(
        { error: "Failed to get agent token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const result: AgentTokenResponse = {
      signedUrl: data.signed_url,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[get-agent-token] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add get-agent-token API route"
```

---

## Task 7: Create API Route - Extract Answer

**Files:**
- Create: `src/app/api/extract-answer/route.ts`

**Step 1: Install OpenAI SDK**

```bash
npm install openai
```

**Step 2: Create the API route**

```typescript
// src/app/api/extract-answer/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExtractAnswerRequest {
  fieldLabel: string;
  fieldName: string;
  agentQuestion: string;
  userResponses: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtractAnswerRequest = await request.json();
    const { fieldLabel, fieldName, agentQuestion, userResponses } = body;

    if (!userResponses || userResponses.length === 0) {
      return NextResponse.json(
        { error: "No user responses provided" },
        { status: 400 }
      );
    }

    const conversationContext = userResponses.join(" ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts clean, concise answers from natural conversation for a conference intake form.

Your task: Extract the actual answer from what the user said. The user is responding to a voice assistant asking about their conference participation.

Rules:
1. Extract the substantive content - remove filler words ("umm", "uh", "like"), false starts, and corrections
2. If the user corrected themselves, use the final/corrected answer
3. Be LENIENT - if the user gave any meaningful response, extract it
4. For greetings, confirmations like "yes", "okay", "let's go" without actual data, return "NO_ANSWER"
5. Keep the natural voice of the user - don't over-formalize their response

Return a JSON object:
{
  "answer": "the extracted clean answer",
  "confidence": "high" | "medium" | "low"
}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            fieldLabel,
            fieldName,
            agentQuestion,
            userSaid: conversationContext,
          }),
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);

    console.log("[extract-answer] Field:", fieldName);
    console.log("[extract-answer] User said:", conversationContext);
    console.log("[extract-answer] Extracted:", parsed.answer);

    return NextResponse.json({
      answer: parsed.answer,
      confidence: parsed.confidence,
    });
  } catch (error) {
    console.error("[extract-answer] Error:", error);
    return NextResponse.json(
      { error: "Failed to extract answer" },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add extract-answer API route with OpenAI"
```

---

## Task 8: Create API Route - Submit Answers

**Files:**
- Create: `src/app/api/submit-answers/route.ts`

**Step 1: Create the API route**

```typescript
// src/app/api/submit-answers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { WebhookPayload, Answers } from "@/types";

interface SubmitRequest {
  userName: string;
  userEmail: string;
  answers: Answers;
}

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("[submit-answers] Missing WEBHOOK_URL");
      return NextResponse.json(
        { error: "Server configuration error: Missing webhook URL" },
        { status: 500 }
      );
    }

    const body: SubmitRequest = await request.json();
    const { userName, userEmail, answers } = body;

    // Validate required fields
    if (!answers.whyJoining || !answers.aboutYourself || !answers.challenges) {
      return NextResponse.json(
        { error: "All questions must be answered" },
        { status: 400 }
      );
    }

    const payload: WebhookPayload = {
      timestamp: new Date().toISOString(),
      userName,
      userEmail,
      whyJoining: answers.whyJoining,
      aboutYourself: answers.aboutYourself,
      challenges: answers.challenges,
    };

    console.log("[submit-answers] Sending to webhook:", payload);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[submit-answers] Webhook error:", errorText);
      return NextResponse.json(
        { error: "Failed to submit to webhook" },
        { status: 500 }
      );
    }

    console.log("[submit-answers] Successfully submitted");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[submit-answers] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit answers" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add submit-answers API route for webhook"
```

---

## Task 9: Install ElevenLabs SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the ElevenLabs client SDK**

```bash
npm install @elevenlabs/client
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install ElevenLabs client SDK"
```

---

## Task 10: Create useConversation Hook

**Files:**
- Create: `src/hooks/useConversation.ts`

**Step 1: Create the conversation hook**

```typescript
// src/hooks/useConversation.ts

"use client";

import { useCallback, useRef, useEffect } from "react";
import { Conversation } from "@elevenlabs/client";
import { TranscriptEntry, Answers, AppStatus } from "@/types";
import { QUESTIONS } from "@/lib/questions";

interface UseConversationProps {
  answers: Answers;
  onAnswerSubmit: (field: keyof Answers, value: string) => void;
  onQuestionChange: (index: number) => void;
  onTranscriptUpdate: (entry: TranscriptEntry) => void;
  onStatusChange: (status: AppStatus) => void;
  onError: (error: string) => void;
}

export function useConversation({
  answers,
  onAnswerSubmit,
  onQuestionChange,
  onTranscriptUpdate,
  onStatusChange,
  onError,
}: UseConversationProps) {
  const conversationRef = useRef<Conversation | null>(null);
  const activeFieldRef = useRef<keyof Answers | null>(null);
  const userResponsesRef = useRef<string[]>([]);
  const lastAgentQuestionRef = useRef<string>("");

  // Refs for callbacks to avoid stale closures
  const onAnswerSubmitRef = useRef(onAnswerSubmit);
  const onQuestionChangeRef = useRef(onQuestionChange);
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  const answersRef = useRef(answers);

  // Keep refs up to date
  useEffect(() => {
    onAnswerSubmitRef.current = onAnswerSubmit;
    onQuestionChangeRef.current = onQuestionChange;
    onTranscriptUpdateRef.current = onTranscriptUpdate;
    onStatusChangeRef.current = onStatusChange;
    onErrorRef.current = onError;
    answersRef.current = answers;
  });

  // Find next unanswered question
  const getNextQuestionIndex = useCallback(() => {
    const currentAnswers = answersRef.current;
    for (let i = 0; i < QUESTIONS.length; i++) {
      const field = QUESTIONS[i].field;
      if (!currentAnswers[field]) {
        return i;
      }
    }
    return -1; // All answered
  }, []);

  // Client tools called by ElevenLabs agent
  const clientTools = {
    getNextQuestion: async (): Promise<string> => {
      console.log("[getNextQuestion] Called");
      const nextIndex = getNextQuestionIndex();
      console.log("[getNextQuestion] Next index:", nextIndex);

      if (nextIndex === -1) {
        onStatusChangeRef.current("complete");
        return JSON.stringify({ complete: true });
      }

      const question = QUESTIONS[nextIndex];
      activeFieldRef.current = question.field;
      userResponsesRef.current = [];
      onQuestionChangeRef.current(nextIndex);

      const response = {
        index: question.index,
        field: question.field,
        label: question.label,
        questionNumber: nextIndex + 1,
        totalQuestions: QUESTIONS.length,
      };

      console.log("[getNextQuestion] Returning:", response);
      return JSON.stringify(response);
    },

    submitAnswer: async (...args: unknown[]): Promise<string> => {
      console.log("[submitAnswer] Called with:", args);

      const params = args[0] as { field?: string; value?: string } | undefined;
      const field = params?.field as keyof Answers | undefined;
      const value = params?.value;

      if (field && value) {
        console.log("[submitAnswer] Submitting:", field, value);
        answersRef.current = { ...answersRef.current, [field]: value };
        userResponsesRef.current = [];
        onAnswerSubmitRef.current(field, value);
        return JSON.stringify({ success: true });
      }

      console.error("[submitAnswer] Missing field or value");
      return JSON.stringify({ success: false, error: "Missing field or value" });
    },
  };

  const start = useCallback(async () => {
    try {
      onStatusChangeRef.current("connecting");

      // Reset state
      userResponsesRef.current = [];
      lastAgentQuestionRef.current = "";
      activeFieldRef.current = null;

      // Get signed URL
      const tokenResponse = await fetch("/api/get-agent-token", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get agent token");
      }

      const { signedUrl } = await tokenResponse.json();

      // Initialize conversation
      const conversation = await Conversation.startSession({
        signedUrl,
        clientTools,
        onMessage: async (payload) => {
          if (payload.source === "ai") {
            onTranscriptUpdateRef.current({
              role: "agent",
              text: payload.message,
              timestamp: new Date(),
            });

            // Hybrid extraction when agent speaks after user
            const activeField = activeFieldRef.current;
            const userResponses = userResponsesRef.current;

            if (userResponses.length > 0 && activeField) {
              const question = QUESTIONS.find(q => q.field === activeField);
              if (question) {
                try {
                  const extractResponse = await fetch("/api/extract-answer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      fieldLabel: question.label,
                      fieldName: question.field,
                      agentQuestion: lastAgentQuestionRef.current,
                      userResponses,
                    }),
                  });

                  if (extractResponse.ok) {
                    const { answer } = await extractResponse.json();
                    if (answer && answer !== "NO_ANSWER") {
                      console.log("[Hybrid] Extracted:", answer);
                      answersRef.current = { ...answersRef.current, [activeField]: answer };
                      onAnswerSubmitRef.current(activeField, answer);
                      userResponsesRef.current = [];

                      // Move to next question
                      const nextIdx = getNextQuestionIndex();
                      if (nextIdx !== -1) {
                        activeFieldRef.current = QUESTIONS[nextIdx].field;
                        onQuestionChangeRef.current(nextIdx);
                      } else {
                        onStatusChangeRef.current("complete");
                      }
                    }
                  }
                } catch (error) {
                  console.error("[Hybrid] Error:", error);
                }
              }
            }

            lastAgentQuestionRef.current = payload.message;
          } else if (payload.source === "user") {
            onTranscriptUpdateRef.current({
              role: "user",
              text: payload.message,
              timestamp: new Date(),
            });

            const userText = payload.message.trim();
            if (userText) {
              userResponsesRef.current.push(userText);
            }
          }
        },
        onError: (message) => {
          console.error("[Conversation] Error:", message);
          onErrorRef.current(message || "Connection error");
          onStatusChangeRef.current("idle");
        },
        onDisconnect: () => {
          if (conversationRef.current) {
            onStatusChangeRef.current("idle");
          }
        },
      });

      conversationRef.current = conversation;
      onStatusChangeRef.current("conversing");

      // Send context to agent
      const context = `You are helping a conference attendee answer 3 questions.
The questions are: ${QUESTIONS.map(q => q.label).join("; ")}.
Please greet them warmly and start asking questions one by one using the getNextQuestion tool.
When they answer, use submitAnswer to record their response, then move to the next question.`;

      // @ts-expect-error - sendContextualUpdate exists in SDK
      await conversation.sendContextualUpdate(context);

      // Request microphone
      await navigator.mediaDevices.getUserMedia({ audio: true });

    } catch (error) {
      console.error("[start] Error:", error);
      onErrorRef.current(error instanceof Error ? error.message : "Failed to connect");
      onStatusChangeRef.current("idle");
    }
  }, [clientTools, getNextQuestionIndex]);

  const stop = useCallback(async () => {
    onStatusChangeRef.current("idle");
    activeFieldRef.current = null;

    const conversation = conversationRef.current;
    conversationRef.current = null;

    if (conversation) {
      try {
        await conversation.endSession();
      } catch (error) {
        console.log("[stop] Cleanup:", error);
      }
    }
  }, []);

  return { start, stop };
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create useConversation hook for ElevenLabs integration"
```

---

## Task 11: Create VoiceControls Component

**Files:**
- Create: `src/components/VoiceControls.tsx`

**Step 1: Create the component**

```typescript
// src/components/VoiceControls.tsx

"use client";

import { useEffect } from "react";
import { AppStatus } from "@/types";

interface VoiceControlsProps {
  status: AppStatus;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceControls({ status, onStart, onStop }: VoiceControlsProps) {
  const isListening = status === "conversing";
  const isProcessing = status === "connecting";
  const isIdle = status === "idle" || status === "complete" || status === "editing";

  const getStatusText = () => {
    switch (status) {
      case "connecting": return "Connecting...";
      case "conversing": return "Listening";
      case "complete": return "Complete";
      case "editing": return "Edit Mode";
      case "submitted": return "Submitted!";
      default: return "Ready";
    }
  };

  // Spacebar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        e.target instanceof HTMLElement &&
        !["INPUT", "TEXTAREA"].includes(e.target.tagName)
      ) {
        e.preventDefault();
        if (isIdle && status !== "editing") onStart();
        else if (isListening) onStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIdle, isListening, status, onStart, onStop]);

  const handleClick = () => {
    if (isIdle && status !== "editing" && status !== "submitted") onStart();
    else if (isListening) onStop();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
      {/* Voice Button */}
      <div style={{ position: "relative" }}>
        {/* Glow rings when listening */}
        {isListening && (
          <>
            <div
              style={{
                position: "absolute",
                inset: "-20px",
                borderRadius: "50%",
                background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "-8px",
                borderRadius: "50%",
                border: "2px solid var(--glass-border)",
                animation: "ping 1.5s ease-out infinite",
              }}
            />
          </>
        )}

        {/* Main button */}
        <button
          onClick={handleClick}
          disabled={isProcessing || status === "submitted"}
          style={{
            position: "relative",
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            border: "none",
            cursor: isProcessing || status === "submitted" ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease-out",
            transform: isListening ? "scale(1.05)" : "scale(1)",
            background: isListening
              ? "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 50%, var(--pink-400) 100%)"
              : isProcessing
                ? "rgba(236, 72, 153, 0.2)"
                : "rgba(20, 20, 30, 0.8)",
            boxShadow: isListening
              ? "0 0 60px var(--accent-glow), 0 0 100px rgba(236, 72, 153, 0.2)"
              : "0 0 30px rgba(236, 72, 153, 0.1)",
          }}
        >
          {isListening ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#0a0a12">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : isProcessing ? (
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                border: "3px solid rgba(236, 72, 153, 0.3)",
                borderTopColor: "var(--pink-500)",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--pink-500)" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>

      {/* Status Text */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: isListening ? "var(--pink-400)" : "var(--text-secondary)",
            marginBottom: "8px",
          }}
        >
          {getStatusText()}
        </p>

        {isIdle && status !== "editing" && status !== "submitted" && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            Press
            <kbd
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              space
            </kbd>
            to start
          </p>
        )}

        {isListening && (
          <p style={{ fontSize: "13px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            Press
            <kbd
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                background: "rgba(236, 72, 153, 0.1)",
                border: "1px solid var(--glass-border)",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "var(--pink-400)",
              }}
            >
              space
            </kbd>
            to stop
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create VoiceControls component with pink theme"
```

---

## Task 12: Create QuestionCard Component

**Files:**
- Create: `src/components/QuestionCard.tsx`

**Step 1: Create the component**

```typescript
// src/components/QuestionCard.tsx

"use client";

import { Question } from "@/types";

type QuestionStatus = "pending" | "active" | "answered";

interface QuestionCardProps {
  question: Question;
  status: QuestionStatus;
  answer: string;
  isEditing: boolean;
  onAnswerChange: (value: string) => void;
  highlight: boolean;
}

export function QuestionCard({
  question,
  status,
  answer,
  isEditing,
  onAnswerChange,
  highlight,
}: QuestionCardProps) {
  const getStyles = () => {
    if (status === "active") {
      return {
        background: "rgba(236, 72, 153, 0.08)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 0 20px rgba(236, 72, 153, 0.1)",
      };
    }
    if (status === "answered") {
      return {
        background: "rgba(16, 185, 129, 0.05)",
        border: "1px solid rgba(16, 185, 129, 0.15)",
        boxShadow: "none",
      };
    }
    return {
      background: "rgba(255, 255, 255, 0.02)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      boxShadow: "none",
    };
  };

  const styles = getStyles();

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "12px",
        transition: "all 0.3s ease",
        ...styles,
        ...(highlight ? { animation: "pulse 0.5s ease" } : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Status Icon */}
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
            background:
              status === "answered"
                ? "var(--green-500)"
                : status === "active"
                  ? "var(--pink-500)"
                  : "rgba(255, 255, 255, 0.1)",
          }}
        >
          {status === "answered" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" />
            </svg>
          ) : status === "active" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="3" fill="none" />
            </svg>
          ) : (
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--text-muted)",
              }}
            />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: status === "active" ? "var(--text-primary)" : "var(--text-secondary)",
              marginBottom: answer || isEditing ? "8px" : 0,
            }}
          >
            Q{question.index + 1}: {question.label}
          </p>

          {/* Answer Display or Edit */}
          {isEditing && status === "answered" ? (
            <textarea
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--text-primary)",
                fontSize: "14px",
                lineHeight: 1.5,
                resize: "vertical",
                minHeight: "60px",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--pink-500)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255, 255, 255, 0.1)";
              }}
            />
          ) : answer ? (
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-primary)",
                lineHeight: 1.5,
                opacity: 0.9,
              }}
            >
              {answer}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create QuestionCard component with status states"
```

---

## Task 13: Create QuestionList Component

**Files:**
- Create: `src/components/QuestionList.tsx`

**Step 1: Create the component**

```typescript
// src/components/QuestionList.tsx

"use client";

import { Answers, AppStatus } from "@/types";
import { QUESTIONS } from "@/lib/questions";
import { QuestionCard } from "./QuestionCard";

interface QuestionListProps {
  answers: Answers;
  currentQuestionIndex: number;
  status: AppStatus;
  lastUpdatedField: string | null;
  onAnswerChange: (field: keyof Answers, value: string) => void;
}

export function QuestionList({
  answers,
  currentQuestionIndex,
  status,
  lastUpdatedField,
  onAnswerChange,
}: QuestionListProps) {
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const isEditing = status === "editing" || status === "complete";

  const getQuestionStatus = (index: number): "pending" | "active" | "answered" => {
    const field = QUESTIONS[index].field;
    if (answers[field]) return "answered";
    if (index === currentQuestionIndex && status === "conversing") return "active";
    return "pending";
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "8px",
          }}
        >
          Your Answers
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          <span style={{ color: "var(--pink-400)", fontWeight: 600 }}>{answeredCount}</span>
          {" of "}
          <span style={{ fontWeight: 600 }}>{QUESTIONS.length}</span>
          {" questions answered"}
        </p>
      </div>

      {/* Questions */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {QUESTIONS.map((question) => (
          <QuestionCard
            key={question.field}
            question={question}
            status={getQuestionStatus(question.index)}
            answer={answers[question.field]}
            isEditing={isEditing}
            onAnswerChange={(value) => onAnswerChange(question.field, value)}
            highlight={lastUpdatedField === question.field}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create QuestionList component"
```

---

## Task 14: Create Conversation (Transcript) Component

**Files:**
- Create: `src/components/Conversation.tsx`

**Step 1: Create the component**

```typescript
// src/components/Conversation.tsx

"use client";

import { useEffect, useRef } from "react";
import { TranscriptEntry, AppStatus } from "@/types";

interface ConversationProps {
  transcript: TranscriptEntry[];
  status: AppStatus;
  error: string | null;
}

export function Conversation({ transcript, status, error }: ConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(236, 72, 153, 0.1)",
              border: "1px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pink-500)" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            Transcript
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {transcript.length === 0 && status === "idle" && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "32px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(236, 72, 153, 0.1)",
                border: "1px solid var(--glass-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--pink-500)" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>
              No conversation yet
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Start speaking to see the transcript here
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {transcript.map((entry, index) => {
            const isUser = entry.role === "user";

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: isUser
                      ? "rgba(236, 72, 153, 0.1)"
                      : "rgba(255, 255, 255, 0.03)",
                    border: isUser
                      ? "1px solid var(--glass-border)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-primary)" }}>
                    {entry.text}
                  </p>
                </div>
                {entry.timestamp && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      marginTop: "4px",
                      paddingLeft: isUser ? 0 : "4px",
                      paddingRight: isUser ? "4px" : 0,
                    }}
                  >
                    {entry.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            );
          })}

          {/* Listening indicator */}
          {status === "conversing" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "var(--pink-500)",
                      animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Listening...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 24px",
            background: "rgba(239, 68, 68, 0.1)",
            borderTop: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--red-500)" }}>{error}</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create Conversation transcript component"
```

---

## Task 15: Create Component Barrel Export

**Files:**
- Create: `src/components/index.ts`

**Step 1: Create barrel export**

```typescript
// src/components/index.ts

export { VoiceControls } from "./VoiceControls";
export { QuestionCard } from "./QuestionCard";
export { QuestionList } from "./QuestionList";
export { Conversation } from "./Conversation";
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: add component barrel exports"
```

---

## Task 16: Create Welcome Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Create the welcome page**

```typescript
// src/app/page.tsx

"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "600px",
          background: "radial-gradient(ellipse, rgba(236, 72, 153, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "800px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "32px",
            boxShadow: "0 0 60px var(--accent-glow)",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" />
            <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" />
            <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            marginBottom: "24px",
            background: "linear-gradient(180deg, #FFFFFF 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome to the Conference
        </h1>

        {/* Subheadline */}
        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "500px",
            marginBottom: "16px",
          }}
        >
          We&apos;d love to learn a bit about you! Answer 3 quick questions through a natural voice conversation.
        </p>

        {/* What to expect */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "48px",
            padding: "24px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "8px" }}>
            You&apos;ll be asked about:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>1.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Why you&apos;re joining the conference</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>2.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>A bit about yourself and what you do</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ color: "var(--pink-400)" }}>3.</span>
              <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Your biggest challenges to discuss</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/conversation"
          style={{
            padding: "16px 48px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)",
            color: "white",
            fontSize: "16px",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 0 40px var(--accent-glow)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
            e.currentTarget.style.boxShadow = "0 0 60px var(--accent-glow)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 0 40px var(--accent-glow)";
          }}
        >
          Get Started
        </Link>

        {/* Time estimate */}
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "16px" }}>
          Takes about 2-3 minutes
        </p>
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create welcome page with pink theme"
```

---

## Task 17: Create Conversation Page

**Files:**
- Create: `src/app/conversation/page.tsx`

**Step 1: Create the conversation page**

```typescript
// src/app/conversation/page.tsx

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppState, Answers, TranscriptEntry, AppStatus } from "@/types";
import { INITIAL_ANSWERS } from "@/lib/questions";
import { useConversation } from "@/hooks/useConversation";
import { VoiceControls, QuestionList, Conversation } from "@/components";

export default function ConversationPage() {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, setState] = useState<AppState>({
    status: "idle",
    currentQuestionIndex: 0,
    answers: { ...INITIAL_ANSWERS },
    transcript: [],
    error: null,
    lastUpdatedField: null,
    userName: process.env.NEXT_PUBLIC_DEFAULT_NAME || "Jan Smolby",
    userEmail: process.env.NEXT_PUBLIC_DEFAULT_EMAIL || "jan@example.com",
  });

  // Handlers
  const handleAnswerSubmit = useCallback((field: keyof Answers, value: string) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [field]: value },
      lastUpdatedField: field,
    }));
    setTimeout(() => {
      setState((s) => ({ ...s, lastUpdatedField: null }));
    }, 500);
  }, []);

  const handleQuestionChange = useCallback((index: number) => {
    setState((s) => ({ ...s, currentQuestionIndex: index }));
  }, []);

  const handleTranscriptUpdate = useCallback((entry: TranscriptEntry) => {
    setState((s) => ({ ...s, transcript: [...s.transcript, entry] }));
  }, []);

  const handleStatusChange = useCallback((status: AppStatus) => {
    setState((s) => ({ ...s, status }));
  }, []);

  const handleError = useCallback((error: string) => {
    setState((s) => ({ ...s, error }));
  }, []);

  const handleAnswerChange = useCallback((field: keyof Answers, value: string) => {
    setState((s) => ({
      ...s,
      answers: { ...s.answers, [field]: value },
    }));
  }, []);

  // Conversation hook
  const { start, stop } = useConversation({
    answers: state.answers,
    onAnswerSubmit: handleAnswerSubmit,
    onQuestionChange: handleQuestionChange,
    onTranscriptUpdate: handleTranscriptUpdate,
    onStatusChange: handleStatusChange,
    onError: handleError,
  });

  // Submit to webhook
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setState((s) => ({ ...s, error: null }));

    try {
      const response = await fetch("/api/submit-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: state.userName,
          userEmail: state.userEmail,
          answers: state.answers,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit");
      }

      setState((s) => ({ ...s, status: "submitted" }));
    } catch (error) {
      setState((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Submission failed",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enter edit mode
  const handleEdit = () => {
    setState((s) => ({ ...s, status: "editing" }));
  };

  const allAnswered = Object.values(state.answers).every(Boolean);
  const canSubmit = allAnswered && !isSubmitting;
  const showEditSubmit = state.status === "complete" || state.status === "editing";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          right: isDrawerOpen ? "33%" : "16%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(ellipse, rgba(236, 72, 153, 0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          transition: "right 0.3s ease-out",
        }}
      />

      {/* Header */}
      <header
        style={{
          position: "relative",
          zIndex: 20,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px var(--accent-glow)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-400) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Conference Intake
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {showEditSubmit && (
            <>
              <button
                onClick={handleEdit}
                disabled={state.status === "submitted"}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: state.status === "editing" ? "rgba(236, 72, 153, 0.2)" : "#1a1a24",
                  border: state.status === "editing" ? "1px solid var(--pink-500)" : "1px solid rgba(255, 255, 255, 0.1)",
                  color: state.status === "editing" ? "var(--pink-500)" : "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: state.status === "submitted" ? "not-allowed" : "pointer",
                  opacity: state.status === "submitted" ? 0.5 : 1,
                }}
              >
                {state.status === "editing" ? "Editing..." : "Edit Answers"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || state.status === "submitted"}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: canSubmit && state.status !== "submitted"
                    ? "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)"
                    : "rgba(236, 72, 153, 0.1)",
                  border: "none",
                  color: canSubmit && state.status !== "submitted" ? "white" : "var(--text-muted)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: canSubmit && state.status !== "submitted" ? "pointer" : "not-allowed",
                  boxShadow: canSubmit && state.status !== "submitted" ? "0 0 20px var(--accent-glow)" : "none",
                }}
              >
                {isSubmitting ? "Submitting..." : state.status === "submitted" ? "Submitted!" : "Submit Answers"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel - Questions */}
        <div
          style={{
            flex: isDrawerOpen ? 1 : 1,
            minWidth: 0,
            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
            background: "rgba(20, 20, 30, 0.4)",
          }}
        >
          <QuestionList
            answers={state.answers}
            currentQuestionIndex={state.currentQuestionIndex}
            status={state.status}
            lastUpdatedField={state.lastUpdatedField}
            onAnswerChange={handleAnswerChange}
          />
        </div>

        {/* Center Panel - Voice Controls */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px",
            borderRight: isDrawerOpen ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
          }}
        >
          <VoiceControls
            status={state.status}
            onStart={start}
            onStop={stop}
          />

          {/* Transcript Toggle */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              marginTop: "32px",
              padding: "12px 24px",
              borderRadius: "10px",
              background: "#1a1a24",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "var(--text-secondary)",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isDrawerOpen ? "Hide Transcript" : "View Transcript"}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isDrawerOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Right Panel - Transcript (Drawer) */}
        <div
          style={{
            flex: isDrawerOpen ? 1 : 0,
            width: isDrawerOpen ? "auto" : 0,
            overflow: "hidden",
            background: "rgba(20, 20, 30, 0.6)",
            transition: "all 0.3s ease-out",
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

      {/* Success Toast */}
      {state.status === "submitted" && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "24px",
            zIndex: 50,
            padding: "16px 24px",
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--green-500)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "var(--green-500)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" />
              </svg>
            </span>
            Answers submitted successfully!
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add .
git commit -m "feat: create conversation page with split view layout"
```

---

## Task 18: Test Build

**Step 1: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: If build fails, fix any type errors**

Review error messages and fix accordingly.

**Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve any build errors"
```

---

## Task 19: Create ElevenLabs Agent

**Manual step - requires ElevenLabs dashboard:**

1. Go to ElevenLabs dashboard → Conversational AI
2. Create new agent with these settings:
   - **Name:** Conference Intake Assistant
   - **Voice:** Choose a friendly, professional voice
   - **System Prompt:**
     ```
     You are a friendly conference assistant helping attendees share about themselves.

     Your job is to ask 3 questions and record their answers:
     1. Why are you joining this conference?
     2. Tell us a little bit about yourself and what you do
     3. What are the three biggest challenges you'd love to talk to other people about?

     Start by greeting them warmly, then use the getNextQuestion tool to get each question.
     Ask questions naturally and conversationally. When they answer, use submitAnswer to record it.
     If they ask for clarification, help them understand, then wait for their actual answer.
     After all 3 questions, thank them and let them know they can edit their answers.
     ```
3. Add client tools:
   - `getNextQuestion`: No parameters, returns next question
   - `submitAnswer`: Parameters: `field` (string), `value` (string)
4. Copy the Agent ID to `.env.local`

---

## Task 20: Final Integration Test

**Step 1: Create .env.local with real credentials**

Copy `.env.example` to `.env.local` and fill in real values.

**Step 2: Run development server**

```bash
npm run dev
```

**Step 3: Test the full flow**

1. Open http://localhost:3000
2. Click "Get Started"
3. Click microphone to start conversation
4. Answer all 3 questions
5. Verify answers populate in real-time
6. Edit an answer
7. Click Submit
8. Verify webhook receives data

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete conference-voice-intake v1.0"
```

---

## Summary

This implementation plan creates a complete voice-powered conference intake application with:

- Welcome page with pink theme
- Voice conversation using ElevenLabs
- Real-time answer population
- Hybrid answer extraction (explicit + implicit via OpenAI)
- Edit mode for answers
- Webhook submission to Google Sheets
- Split-view layout matching FormTalk

Total tasks: 20
Estimated implementation time: 2-3 hours
