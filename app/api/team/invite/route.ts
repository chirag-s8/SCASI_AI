import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name } = await req.json();

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    const senderEmail = session.user?.email || "Scasi-AI User";
    const subject = "You've been invited to join a Scasi-AI Team!";

    // HTML-escape user inputs to prevent XSS in email body
    const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const safeName = escapeHtml(name || "there");
    const safeSender = escapeHtml(senderEmail);
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
    
    // Create RFC 2822 formatted email
    const messageParts = [
      `To: ${email}`,
      `Subject: ${utf8Subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      `
      <div style="font-family: sans-serif; padding: 25px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #EDE9FE; border-radius: 12px; background: white;">
        <h2 style="color: #4C1D95; margin-bottom: 20px;">Scasi-AI Collaboration</h2>
        <p style="font-size: 16px;">Hello ${safeName},</p>
        <p style="font-size: 16px; line-height: 1.5;">You have been exclusively invited to collaborate in a secure team workspace by <b>${safeSender}</b> on Scasi-AI.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3001/team" style="display:inline-block; padding: 12px 24px; background: linear-gradient(135deg, #7C3AED, #4C1D95); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.2);">
            Accept Invitation
          </a>
        </div>
        <p style="font-size: 14px; color: #6B7280; text-align: center;">If you don't use Scasi-AI, you can safely ignore this email.</p>
        <div style="margin-top: 40px; border-top: 1px solid #E5E7EB; padding-top: 15px; text-align: center;">
          <p style="font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">Powered by Scasi-AI Intelligence Engine</p>
        </div>
      </div>
      `,
    ];
    
    const message = messageParts.join("\r\n");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Invite API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
