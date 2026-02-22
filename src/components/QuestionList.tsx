"use client";

import { Answers, AppStatus, DynamicQuestion } from "@/types";
import { QuestionCard } from "./QuestionCard";

interface QuestionListProps {
    questions: DynamicQuestion[];
    answers: Answers;
    currentQuestionIndex: number;
    status: AppStatus;
    lastUpdatedField: string | null;
    onAnswerChange: (field: string, value: string) => void;
}

export function QuestionList({
    questions,
    answers,
    currentQuestionIndex,
    status,
    lastUpdatedField,
    onAnswerChange,
}: QuestionListProps) {
    const answeredCount = Object.values(answers).filter(Boolean).length;
    // Allow editing when complete, in edit mode, or idle with answers
    const isEditing = status === "editing" || status === "complete" || (status === "idle" && answeredCount > 0);

    const getQuestionStatus = (index: number): "pending" | "active" | "answered" => {
        const field = questions[index].field;
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
                    <span style={{ fontWeight: 600 }}>{questions.length}</span>
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
                {questions.map((question, index) => (
                    <QuestionCard
                        key={question.id}
                        question={{ index, field: question.field, label: question.label }}
                        status={getQuestionStatus(index)}
                        answer={answers[question.field] || ""}
                        isEditing={isEditing}
                        onAnswerChange={(value) => onAnswerChange(question.field, value)}
                        highlight={lastUpdatedField === question.field}
                    />
                ))}
            </div>
        </div>
    );
}
