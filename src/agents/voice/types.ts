/**
 * @file src/agents/voice/types.ts
 * Input / output types for the Voice agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const VoiceRequestSchema = z.discriminatedUnion('mode', [
    z.object({
        mode: z.literal('stt'),
        /** Base-64 encoded audio payload */
        audioBase64: z.string().min(1),
        /** MIME type of the audio, e.g. "audio/webm;codecs=opus" */
        mimeType: z.string().default('audio/webm'),
        /** BCP-47 language tag, e.g. "en-US" */
        language: z.string().default('en-US'),
    }),
    z.object({
        mode: z.literal('tts'),
        /** Text to synthesise */
        text: z.string().min(1).max(4000),
        /** Target voice ID (provider-specific) */
        voiceId: z.string().optional(),
        /** BCP-47 language tag */
        language: z.string().default('en-US'),
    }),
]);
export type VoiceRequest = z.infer<typeof VoiceRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface VoiceResponse {
    mode: 'stt' | 'tts';
    /** STT result: transcribed text */
    transcript?: string;
    /** TTS result: base-64 encoded audio */
    audioBase64?: string;
    /** Duration of the audio in seconds */
    durationSeconds?: number;
}
