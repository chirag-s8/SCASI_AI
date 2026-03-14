import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

/* -----------------------------
   ✅ Base64 Encode Helper
-------------------------------- */
function encodeBase64(str) {
    return Buffer.from(str)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/* -----------------------------
   ✅ POST: Send Gmail Reply
-------------------------------- */
export async function POST(req) {
    try {
        // ✅ Session Check
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ✅ Frontend Data
        const body = await req.json().catch(() => null);
        const { to, subject, body: emailBody, threadId, originalMessageId } = body || {};

        // ✅ Validation
        if (!to) {
            return NextResponse.json({ error: "Recipient address required" }, { status: 400 });
        }
        if (!emailBody) {
            return NextResponse.json({ error: "Email body is required" }, { status: 400 });
        }

        // ✅ OAuth Setup
        const auth = new google.auth.OAuth2();
        auth.setCredentials({
            access_token: session.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth });

        /* -----------------------------
           ✅ Proper Reply Headers
        -------------------------------- */
        const rawMessage = [
            `To: ${to}`,
            `Subject: Re: ${subject || ""}`,
            originalMessageId ? `In-Reply-To: <${originalMessageId}>` : "",
            originalMessageId ? `References: <${originalMessageId}>` : "",
            "",
            emailBody,
        ].filter(Boolean).join("\n");

        // ✅ Encode Message
        const encodedMessage = encodeBase64(rawMessage);

        // ✅ Send Reply
        const _sent = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
                threadId: threadId,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Reply Error:", err.message);

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
