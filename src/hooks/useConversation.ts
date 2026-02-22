"use client";

import { useCallback, useRef, useEffect } from "react";
import { Conversation } from "@elevenlabs/client";
import { TranscriptEntry, Answers, AppStatus, DynamicQuestion } from "@/types";

interface ConversationContext {
    name: string;           // Event or community name
    type: 'event' | 'community';
    userName?: string;      // Attendee/member name for personalization
}

interface UseConversationProps {
    questions: DynamicQuestion[];
    answers: Answers;
    context?: ConversationContext;
    onAnswerSubmit: (field: string, value: string) => void;
    onQuestionChange: (index: number) => void;
    onTranscriptUpdate: (entry: TranscriptEntry) => void;
    onStatusChange: (status: AppStatus) => void;
    onError: (error: string) => void;
}

export function useConversation({
    questions,
    answers,
    context,
    onAnswerSubmit,
    onQuestionChange,
    onTranscriptUpdate,
    onStatusChange,
    onError,
}: UseConversationProps) {
    const conversationRef = useRef<Conversation | null>(null);
    const activeFieldRef = useRef<string | null>(null);
    const userResponsesRef = useRef<string[]>([]);
    const lastAgentQuestionRef = useRef<string>("");

    // Refs for callbacks to avoid stale closures
    const onAnswerSubmitRef = useRef(onAnswerSubmit);
    const onQuestionChangeRef = useRef(onQuestionChange);
    const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
    const onStatusChangeRef = useRef(onStatusChange);
    const onErrorRef = useRef(onError);
    const answersRef = useRef(answers);
    const questionsRef = useRef(questions);

    // Keep refs up to date
    useEffect(() => {
        onAnswerSubmitRef.current = onAnswerSubmit;
        onQuestionChangeRef.current = onQuestionChange;
        onTranscriptUpdateRef.current = onTranscriptUpdate;
        onStatusChangeRef.current = onStatusChange;
        onErrorRef.current = onError;
        answersRef.current = answers;
        questionsRef.current = questions;
    });

    // Find next unanswered question
    const getNextQuestionIndex = useCallback(() => {
        const currentAnswers = answersRef.current;
        const currentQuestions = questionsRef.current;
        for (let i = 0; i < currentQuestions.length; i++) {
            const field = currentQuestions[i].field;
            if (!currentAnswers[field]) {
                return i;
            }
        }
        return -1; // All answered
    }, []);

    // Client tools called by ElevenLabs agent
    const clientTools = {
        getNextQuestion: async (): Promise<string> => {
            console.log("[getNextQuestion] Called. questionsRef:", questionsRef.current.length, "items, answersRef:", JSON.stringify(answersRef.current));
            const nextIndex = getNextQuestionIndex();
            console.log("[getNextQuestion] Next index:", nextIndex);

            if (nextIndex === -1) {
                onStatusChangeRef.current("complete");
                return JSON.stringify({ complete: true });
            }

            const question = questionsRef.current[nextIndex];
            activeFieldRef.current = question.field;
            userResponsesRef.current = [];
            onQuestionChangeRef.current(nextIndex);

            const response = {
                index: nextIndex,
                field: question.field,
                label: question.label,
                questionNumber: nextIndex + 1,
                totalQuestions: questionsRef.current.length,
            };

            console.log("[getNextQuestion] Returning:", response);
            return JSON.stringify(response);
        },

        submitAnswer: async (...args: unknown[]): Promise<string> => {
            console.log("[submitAnswer] Called with:", JSON.stringify(args));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const params = args[0] as Record<string, any> | undefined;

            // Try direct field/value first (expected format)
            let field = params?.field;
            let value = params?.value;

            // Fallback: use activeFieldRef if agent didn't send field
            if (!field && activeFieldRef.current) {
                field = activeFieldRef.current;
                console.log("[submitAnswer] Using activeField fallback:", field);
            }

            // Fallback: try common parameter formats for value
            if (!value && params) {
                value = params.answer?.answer || params.answer || params.text ||
                    (typeof params === 'string' ? params : undefined);
                if (value) console.log("[submitAnswer] Extracted value from alt format:", value);
            }

            if (field && value) {
                console.log("[submitAnswer] Submitting:", field, value);
                answersRef.current = { ...answersRef.current, [field]: value };
                userResponsesRef.current = [];
                onAnswerSubmitRef.current(field, value);
                return JSON.stringify({ success: true });
            }

            console.error("[submitAnswer] Missing field or value. params:", JSON.stringify(params));
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

            console.log("[start] Questions in ref:", questionsRef.current.length, questionsRef.current.map(q => q.field));
            console.log("[start] Answers in ref:", JSON.stringify(answersRef.current));

            // Initialize conversation
            const conversation = await Conversation.startSession({
                signedUrl,
                clientTools,
                onUnhandledClientToolCall: (params) => {
                    console.error("[UNHANDLED TOOL CALL]", params);
                },
                onMessage: async (payload) => {
                    console.log("[onMessage]", payload.source, payload.message?.substring(0, 80));
                    if (payload.source === "ai") {
                        onTranscriptUpdateRef.current({
                            role: "agent",
                            text: payload.message,
                            timestamp: new Date(),
                        });

                        // Hybrid extraction when agent speaks after user
                        const activeField = activeFieldRef.current;
                        const userResponses = userResponsesRef.current;

                        console.log("[Hybrid check] userResponses:", userResponses.length, "activeField:", activeField);
                        if (userResponses.length > 0 && activeField) {
                            const question = questionsRef.current.find(q => q.field === activeField);
                            console.log("[Hybrid] Found question for field:", activeField, "->", question?.label);
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
                                                activeFieldRef.current = questionsRef.current[nextIdx].field;
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

            // Build context for agent
            const currentQuestions = questionsRef.current;
            const contextName = context?.name || 'this event';
            const contextType = context?.type || 'event';
            const greeting = context?.userName ? `The person you're speaking with is ${context.userName}.` : '';

            const settingDescription = contextType === 'community'
                ? `You're helping a member of the ${contextName} community share what they're looking for so we can match them with other members.`
                : `You're chatting with an attendee at ${contextName} to help them connect with the right people.`;

            const agentContext = `${settingDescription}
${greeting}

YOUR WORKFLOW (you must follow this):
1. Start by calling getNextQuestion to get the first topic
2. Have a natural conversation to explore that topic
3. When you have a clear answer, call submitAnswer with the field and their answer
4. Then call getNextQuestion to get the next topic
5. Repeat until getNextQuestion returns {complete: true}
6. When complete: say a brief warm goodbye (1-2 sentences MAX) and END the call immediately. Do not ask follow-up questions or continue chatting.

TOPICS TO COVER (in order):
${currentQuestions.map((q, i) => `${i + 1}. ${q.field}: "${q.label}"`).join('\n')}

CONVERSATION STYLE - Be natural, not robotic:
- This is a friendly conversation, not an interview or survey
- Acknowledge what they said before transitioning ("So you're focused on scaling...")
- Find natural bridges between topics ("...which makes me curious about the challenges that come with that")
- React like a human ("Oh interesting!", "That makes sense")

AVOID:
- "Great answer" or "Thanks for sharing"
- "Now let me ask you about..." or "Moving on to the next question..."
- Announcing question numbers
- Rushing through topics

Remember: Call the tools! getNextQuestion to get topics, submitAnswer to record answers.`;

            console.log("[start] Sending contextual update, length:", agentContext.length);
            await conversation.sendContextualUpdate(agentContext);
            console.log("[start] Contextual update sent. Requesting mic...");

            // Request microphone
            await navigator.mediaDevices.getUserMedia({ audio: true });

        } catch (error) {
            console.error("[start] Error:", error);
            onErrorRef.current(error instanceof Error ? error.message : "Failed to connect");
            onStatusChangeRef.current("idle");
        }
    }, [clientTools, getNextQuestionIndex, context]);

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
