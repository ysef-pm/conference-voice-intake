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

    // Spacebar shortcut (desktop only)
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
        if (status === "idle") onStart();
        else if (isListening) onStop();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
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
                    className="w-20 h-20 md:w-[100px] md:h-[100px]"
                    style={{
                        position: "relative",
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
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="#0a0a12">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                    ) : isProcessing ? (
                        <div
                            style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                border: "3px solid rgba(236, 72, 153, 0.3)",
                                borderTopColor: "var(--pink-500)",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                    ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--pink-500)" strokeWidth="2">
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
                        fontSize: "15px",
                        fontWeight: 600,
                        color: isListening ? "var(--pink-400)" : "var(--text-secondary)",
                        marginBottom: "4px",
                    }}
                >
                    {getStatusText()}
                </p>

                {/* Desktop-only keyboard hints */}
                {status === "idle" && (
                    <p className="hidden md:flex" style={{ fontSize: "13px", color: "var(--text-muted)", alignItems: "center", gap: "8px", justifyContent: "center" }}>
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

                {/* Mobile tap hint */}
                {status === "idle" && (
                    <p className="md:hidden" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        Tap to start
                    </p>
                )}

                {isListening && (
                    <>
                        <p className="hidden md:flex" style={{ fontSize: "13px", color: "var(--text-muted)", alignItems: "center", gap: "8px", justifyContent: "center" }}>
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
                        <p className="md:hidden" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                            Tap to stop
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
