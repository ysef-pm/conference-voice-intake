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
