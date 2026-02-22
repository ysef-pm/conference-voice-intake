"use client";

type QuestionStatus = "pending" | "active" | "answered";

interface QuestionCardProps {
    question: { index: number; field: string; label: string };
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
