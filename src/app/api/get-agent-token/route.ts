import { NextRequest, NextResponse } from "next/server";
import { AgentTokenResponse } from "@/types";

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        if (!apiKey) {
            console.error("[get-agent-token] Missing ELEVENLABS_API_KEY");
            return NextResponse.json(
                { error: "Server configuration error: Missing API Key" },
                { status: 500 }
            );
        }

        if (!agentId) {
            console.error("[get-agent-token] Missing ELEVENLABS_AGENT_ID");
            return NextResponse.json(
                { error: "Server configuration error: Missing Agent ID" },
                { status: 500 }
            );
        }

        // Request signed URL from ElevenLabs
        const response = await fetch(
            `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
            {
                method: "GET",
                headers: {
                    "xi-api-key": apiKey,
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[get-agent-token] ElevenLabs API error:", errorText);
            return NextResponse.json(
                { error: "Failed to get agent token" },
                { status: response.status }
            );
        }

        const data = await response.json();

        const result: AgentTokenResponse = {
            signedUrl: data.signed_url,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error("[get-agent-token] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}
