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
