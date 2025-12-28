import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface ExtractAnswerRequest {
    fieldLabel: string;
    fieldName: string;
    agentQuestion: string;
    userResponses: string[];
}

export async function POST(request: NextRequest) {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const body: ExtractAnswerRequest = await request.json();
        const { fieldLabel, fieldName, agentQuestion, userResponses } = body;

        if (!userResponses || userResponses.length === 0) {
            return NextResponse.json(
                { error: "No user responses provided" },
                { status: 400 }
            );
        }

        const conversationContext = userResponses.join(" ");

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an assistant that extracts clean, concise answers from natural conversation for a conference intake form.

Your task: Extract the actual answer from what the user said. The user is responding to a voice assistant asking about their conference participation.

Rules:
1. Extract the substantive content - remove filler words ("umm", "uh", "like"), false starts, and corrections
2. If the user corrected themselves, use the final/corrected answer
3. Be LENIENT - if the user gave any meaningful response, extract it
4. For greetings, confirmations like "yes", "okay", "let's go" without actual data, return "NO_ANSWER"
5. Keep the natural voice of the user - don't over-formalize their response

Return a JSON object:
{
  "answer": "the extracted clean answer",
  "confidence": "high" | "medium" | "low"
}`,
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        fieldLabel,
                        fieldName,
                        agentQuestion,
                        userSaid: conversationContext,
                    }),
                },
            ],
            temperature: 0,
            response_format: { type: "json_object" },
            max_tokens: 500,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            return NextResponse.json(
                { error: "No response from AI" },
                { status: 500 }
            );
        }

        const parsed = JSON.parse(content);

        console.log("[extract-answer] Field:", fieldName);
        console.log("[extract-answer] User said:", conversationContext);
        console.log("[extract-answer] Extracted:", parsed.answer);

        return NextResponse.json({
            answer: parsed.answer,
            confidence: parsed.confidence,
        });
    } catch (error) {
        console.error("[extract-answer] Error:", error);
        return NextResponse.json(
            { error: "Failed to extract answer" },
            { status: 500 }
        );
    }
}
