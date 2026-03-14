/**
 * @file src/agents/rag/chunker.ts
 * Semantic email splitting into typed chunks.
 */

import type { EmailChunk } from './types';
import { estimateTokens } from '../_shared/utils';

const TARGET_CHUNK_CHARS = 2000; // ~500 tokens at 4 chars/token
const MIN_CHUNK_CHARS = 80;

const SIGNATURE_PATTERNS = [
    /\n--\s*\n/,
    /\n[-]{2,}\s*\n/,
    /\nBest regards,?\s*\n/i,
    /\nKind regards,?\s*\n/i,
    /\nRegards,?\s*\n/i,
    /\nSincerely,?\s*\n/i,
    /\nThanks?,?\s*\n/i,
    /\nCheers,?\s*\n/i,
    /\nSent from my /i,
    /\nGet Outlook for /i,
];

const QUOTED_REPLY_PATTERN = /\nOn .{10,80} wrote:\s*\n/i;

function splitSignature(text: string): { body: string; signature: string | null } {
    for (const pattern of SIGNATURE_PATTERNS) {
        const idx = text.search(pattern);
        if (idx !== -1 && idx > MIN_CHUNK_CHARS) {
            return { body: text.slice(0, idx).trimEnd(), signature: text.slice(idx).trim() };
        }
    }
    return { body: text, signature: null };
}

function splitQuotedReply(text: string): { clean: string; quoted: string | null } {
    const match = text.search(QUOTED_REPLY_PATTERN);
    if (match !== -1 && match > MIN_CHUNK_CHARS) {
        return { clean: text.slice(0, match).trimEnd(), quoted: text.slice(match).trim() };
    }

    const lines = text.split('\n');
    const cleanLines: string[] = [];
    const quotedLines: string[] = [];
    let foundQuoted = false;

    for (const line of lines) {
        if (line.startsWith('>')) {
            foundQuoted = true;
            quotedLines.push(line);
        } else if (foundQuoted && line.trim() === '') {
            quotedLines.push(line);
        } else {
            foundQuoted = false;
            cleanLines.push(line);
        }
    }

    const quotedText = quotedLines.join('\n').trim();
    return {
        clean: cleanLines.join('\n').trim(),
        quoted: quotedText.length > MIN_CHUNK_CHARS ? quotedText : null,
    };
}

function splitIntoBodyChunks(text: string): string[] {
    if (estimateTokens(text) <= 600) return [text];

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let current = '';

    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        if (current && (current.length + trimmed.length) > TARGET_CHUNK_CHARS) {
            chunks.push(current.trim());
            current = trimmed;
        } else {
            current = current ? current + '\n\n' + trimmed : trimmed;
        }
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    // If paragraphs didn't split well, force-split long chunks
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
        if (chunk.length <= TARGET_CHUNK_CHARS * 1.5) {
            finalChunks.push(chunk);
        } else {
            const sentences = chunk.split(/(?<=[.!?])\s+/);
            let buf = '';
            for (const s of sentences) {
                if (buf && (buf.length + s.length) > TARGET_CHUNK_CHARS) {
                    finalChunks.push(buf.trim());
                    buf = s;
                } else {
                    buf = buf ? buf + ' ' + s : s;
                }
            }
            if (buf.trim()) finalChunks.push(buf.trim());
        }
    }

    return finalChunks.filter(c => c.length >= MIN_CHUNK_CHARS);
}

function stripHtml(html: string): string {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function chunkEmail(email: {
    emailId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
}): EmailChunk[] {
    const chunks: EmailChunk[] = [];
    let idx = 0;

    // Subject chunk
    if (email.subject.trim()) {
        chunks.push({
            emailId: email.emailId,
            chunkIndex: idx++,
            chunkType: 'subject',
            chunkText: `Subject: ${email.subject}`,
        });
    }

    // Header/metadata chunk
    const headerParts = [
        `Subject: ${email.subject}`,
        `From: ${email.from}`,
        `Date: ${email.date}`,
    ].filter(p => p.split(': ')[1]?.trim());

    if (headerParts.length > 0) {
        chunks.push({
            emailId: email.emailId,
            chunkIndex: idx++,
            chunkType: 'header',
            chunkText: headerParts.join('\n'),
        });
    }

    // Process body
    let bodyText = email.body || email.snippet || '';
    if (bodyText.includes('<') && bodyText.includes('>')) {
        bodyText = stripHtml(bodyText);
    }

    if (!bodyText.trim()) return chunks;

    // Strip quoted replies first
    const { clean, quoted } = splitQuotedReply(bodyText);

    // Then detect signature
    const { body: mainBody, signature } = splitSignature(clean);

    // Split main body into chunks
    const bodyChunks = splitIntoBodyChunks(mainBody);
    for (const chunkText of bodyChunks) {
        chunks.push({
            emailId: email.emailId,
            chunkIndex: idx++,
            chunkType: 'body',
            chunkText,
        });
    }

    // Signature chunk
    if (signature && signature.length >= MIN_CHUNK_CHARS) {
        chunks.push({
            emailId: email.emailId,
            chunkIndex: idx++,
            chunkType: 'signature',
            chunkText: signature,
        });
    }

    // Quoted reply chunk (limited to first 3000 chars)
    if (quoted && quoted.length >= MIN_CHUNK_CHARS) {
        chunks.push({
            emailId: email.emailId,
            chunkIndex: idx++,
            chunkType: 'quoted',
            chunkText: quoted.slice(0, 3000),
        });
    }

    return chunks;
}
