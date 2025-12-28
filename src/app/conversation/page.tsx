"use client";

import { useState, useCallback } from "react";
import { AppState, Answers, TranscriptEntry, AppStatus } from "@/types";
import { INITIAL_ANSWERS } from "@/lib/questions";
import { useConversation } from "@/hooks/useConversation";
import { VoiceControls, QuestionList, Conversation } from "@/components";

export default function ConversationPage() {
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
