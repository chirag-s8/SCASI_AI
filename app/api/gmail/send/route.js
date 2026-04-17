import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";
import { NextResponse } from "next/server";

/**
 * Build a raw RFC 2822 email.
 * Supports: cc, bcc, importance headers, and multipart/mixed attachments.
 * All new params are optional — existing callers without them work unchanged.
 *
 * @param {string[]} [attachments] - Array of { filename, mimeType, data (base64) }
 * @param {"high"|"low"|undefined} [importance]
 */
function makeEmail(to, subject, message, messageId, fromEmail, cc, bcc, attachments = [], importance) {
    const cleanSubject = subject?.replace(/^Re:\s*/i, '') || '';
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const emailLines = [
        `From: ${fromEmail}`,
        `To: ${to}`,
    ];

    if (cc) emailLines.push(`Cc: ${cc}`);
    if (bcc) emailLines.push(`Bcc: ${bcc}`);

    emailLines.push(
        messageId ? `Subject: Re: ${cleanSubject}` : `Subject: ${cleanSubject}`,
        "MIME-Version: 1.0"
    );

    // Standard importance headers recognised by Gmail, Outlook, Apple Mail
    if (importance === "high") {
        emailLines.push("Importance: High");
        emailLines.push("X-Priority: 1");
    } else if (importance === "low") {
        emailLines.push("Importance: Low");
        emailLines.push("X-Priority: 5");
    }

    if (messageId) {
        emailLines.push(`In-Reply-To: ${messageId}`);
        emailLines.push(`References: ${messageId}`);
    }

    // Multipart if attachments present, plain text otherwise
    if (attachments.length > 0) {
        emailLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        emailLines.push("", `--${boundary}`);
        emailLines.push("Content-Type: text/plain; charset=utf-8");
        emailLines.push("", message, "");

        for (const att of attachments) {
            emailLines.push(`--${boundary}`);
            emailLines.push(`Content-Type: ${att.mimeType || 'application/octet-stream'}; name="${att.filename}"`);
            emailLines.push("Content-Transfer-Encoding: base64");
            emailLines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
            emailLines.push("", att.data, "");
        }

        emailLines.push(`--${boundary}--`);
    } else {
        emailLines.push("Content-Type: text/plain; charset=utf-8");
        emailLines.push("", message);
    }

    const rawEmail = emailLines.join("\r\n");
    console.log("📧 Raw email being sent:", rawEmail.substring(0, 300) + "...");

    return Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { to, subject, body, threadId, messageId, cc, bcc, attachments, importance } = await req.json();

        console.log("📧 Gmail Send Debug:", {
            to,
            subject: subject?.substring(0, 50),
            threadId,
            messageId: messageId?.substring(0, 30),
            userEmail: session.user?.email,
            cc: cc || 'none',
            bcc: bcc || 'none',
            attachmentCount: attachments?.length || 0,
            importance: importance || 'normal',
        });

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: session.accessToken });

        const gmail = google.gmail({ version: "v1", auth });

        const rawMessage = makeEmail(
            to, subject, body, messageId,
            session.user?.email,
            cc, bcc, attachments, importance
        );

        const result = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: rawMessage,
                ...(threadId ? { threadId } : {}),
            },
        });

        console.log("✅ Gmail send result:", {
            messageId: result.data.id,
            threadId: result.data.threadId
        });

        return NextResponse.json({ success: true, messageId: result.data.id });
    } catch (err) {
        console.error("Send Email Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
