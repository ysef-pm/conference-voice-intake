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
