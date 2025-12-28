"use client";

import { useState, useCallback, useEffect } from "react";
import { AppState, Answers, TranscriptEntry, AppStatus } from "@/types";
import { INITIAL_ANSWERS } from "@/lib/questions";
import { useConversation } from "@/hooks/useConversation";
import { VoiceControls, QuestionList, Conversation } from "@/components";

// Simple confetti component
function Confetti() {
    const colors = ['#ec4899', '#f472b6', '#db2777', '#10b981', '#fbbf24', '#8b5cf6'];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 8 + Math.random() * 8,
    }));

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }}>
            {pieces.map(piece => (
                <div
                    key={piece.id}
                    style={{
                        position: 'absolute',
                        left: `${piece.left}%`,
                        top: '-20px',
                        width: `${piece.size}px`,
                        height: `${piece.size}px`,
                        background: piece.color,
                        borderRadius: piece.id % 2 === 0 ? '50%' : '2px',
                        animation: `confetti-fall ${piece.duration}s ease-out ${piece.delay}s forwards`,
                    }}
                />
            ))}
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

export default function ConversationPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEditPrompt, setShowEditPrompt] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

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

    // Show edit prompt when conversation completes
    useEffect(() => {
        if (state.status === "complete") {
            setShowEditPrompt(true);
            const timer = setTimeout(() => setShowEditPrompt(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [state.status]);

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
            setShowCelebration(true);
        } catch (error) {
            setState((s) => ({
                ...s,
                error: error instanceof Error ? error.message : "Submission failed",
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle edit mode (Edit <-> Save)
    const handleEditToggle = () => {
        if (state.status === "editing") {
            // Save - lock fields
            setState((s) => ({ ...s, status: "complete" }));
        } else {
            // Edit - unlock fields
            setState((s) => ({ ...s, status: "editing" }));
            setShowEditPrompt(false);
        }
    };

    const allAnswered = Object.values(state.answers).every(Boolean);
    const hasAnyAnswers = Object.values(state.answers).some(Boolean);
    const canSubmit = allAnswered && !isSubmitting;
    const showEditSubmit = hasAnyAnswers || state.status === "complete" || state.status === "editing";

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
            {/* Confetti */}
            {showCelebration && <Confetti />}

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
                    {showEditSubmit && state.status !== "submitted" && (
                        <>
                            {/* Edit/Save Toggle Button */}
                            <button
                                onClick={handleEditToggle}
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: "10px",
                                    background: state.status === "editing"
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : "rgba(236, 72, 153, 0.1)",
                                    border: state.status === "editing"
                                        ? "2px solid var(--green-500)"
                                        : "2px solid var(--pink-400)",
                                    color: state.status === "editing" ? "var(--green-500)" : "var(--pink-400)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {state.status === "editing" ? (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Save Changes
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Edit Answers
                                    </>
                                )}
                            </button>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                style={{
                                    padding: "10px 24px",
                                    borderRadius: "10px",
                                    background: canSubmit
                                        ? "linear-gradient(135deg, var(--pink-500) 0%, var(--pink-600) 100%)"
                                        : "rgba(236, 72, 153, 0.1)",
                                    border: "none",
                                    color: canSubmit ? "white" : "var(--text-muted)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: canSubmit ? "pointer" : "not-allowed",
                                    boxShadow: canSubmit ? "0 0 30px var(--accent-glow)" : "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div style={{
                                            width: "16px",
                                            height: "16px",
                                            borderRadius: "50%",
                                            border: "2px solid rgba(255,255,255,0.3)",
                                            borderTopColor: "white",
                                            animation: "spin 1s linear infinite",
                                        }} />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13" />
                                            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                        </svg>
                                        Submit Answers
                                    </>
                                )}
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
                        flex: 1,
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

            {/* Edit Prompt Toast */}
            {showEditPrompt && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "24px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 50,
                        padding: "16px 28px",
                        borderRadius: "16px",
                        background: "rgba(236, 72, 153, 0.15)",
                        border: "1px solid var(--pink-500)",
                        boxShadow: "0 0 40px var(--accent-glow)",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        animation: "slideUp 0.3s ease-out",
                    }}
                >
                    <div
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "var(--pink-500)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" strokeWidth="2" fill="none" />
                        </svg>
                    </div>
                    <div>
                        <p style={{ fontSize: "15px", fontWeight: 600, color: "white", marginBottom: "2px" }}>
                            ✨ Conversation complete!
                        </p>
                        <p style={{ fontSize: "13px", color: "var(--pink-400)" }}>
                            Feel free to edit your answers before submitting
                        </p>
                    </div>
                    <button
                        onClick={() => setShowEditPrompt(false)}
                        style={{
                            marginLeft: "8px",
                            padding: "4px",
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Success Celebration Modal */}
            {state.status === "submitted" && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 60,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(10, 10, 18, 0.9)",
                        animation: "fadeIn 0.3s ease-out",
                    }}
                >
                    <div
                        style={{
                            textAlign: "center",
                            padding: "48px 64px",
                            borderRadius: "24px",
                            background: "linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(10, 10, 18, 0.95) 100%)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            boxShadow: "0 0 60px rgba(16, 185, 129, 0.2)",
                            animation: "scaleIn 0.4s ease-out",
                        }}
                    >
                        <div
                            style={{
                                width: "80px",
                                height: "80px",
                                margin: "0 auto 24px",
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, var(--green-500) 0%, #059669 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 0 40px rgba(16, 185, 129, 0.4)",
                            }}
                        >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                                <polyline points="20 6 9 17 4 12" stroke="white" strokeWidth="3" fill="none" />
                            </svg>
                        </div>
                        <h2
                            style={{
                                fontSize: "28px",
                                fontWeight: 700,
                                color: "white",
                                marginBottom: "12px",
                            }}
                        >
                            🎉 You&apos;re all set!
                        </h2>
                        <p
                            style={{
                                fontSize: "16px",
                                color: "var(--text-secondary)",
                                maxWidth: "360px",
                                lineHeight: 1.6,
                                marginBottom: "8px",
                            }}
                        >
                            Congratulations on submitting your answers!
                        </p>
                        <p
                            style={{
                                fontSize: "18px",
                                color: "var(--green-500)",
                                fontWeight: 600,
                            }}
                        >
                            We&apos;re going to match you with cool people! 🚀
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
