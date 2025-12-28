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
