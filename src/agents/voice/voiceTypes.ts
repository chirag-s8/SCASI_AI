/**
 * @file src/agents/voice/voiceTypes.ts
 * Core types for the Scasi voice agent.
 */

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type VoiceErrorCode =
  | 'STT_UNSUPPORTED'
  | 'TTS_UNSUPPORTED'
  | 'MIC_DENIED'
  | 'ORCHESTRATOR_ERROR'
  | 'SESSION_TIMEOUT';

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
}

// ---------------------------------------------------------------------------
// Conversation message
// ---------------------------------------------------------------------------

export interface VoiceMessage {
  role: 'user' | 'assistant';
  text: string;
}

// ---------------------------------------------------------------------------
// Hook options / return
// ---------------------------------------------------------------------------

export interface VoiceControllerOptions {
  sessionId?: string;
  emailContext?: {
    gmailId: string;
    subject: string;
    from: string;
    snippet: string;
    body?: string;
  };
  onTranscript?: (text: string) => void;
  /** Called with the final answer text and the user's question */
  onAnswer?: (answer: string, userText: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: VoiceError) => void;
}

export interface VoiceControllerReturn {
  state: VoiceState;
  startSession: () => void;
  stopSession: () => void;
  cancelTTS: () => void;
  isSupported: { stt: boolean; tts: boolean };
}

// ---------------------------------------------------------------------------
// Wake word listener
// ---------------------------------------------------------------------------

export interface WakeWordListenerOptions {
  onDetected: () => void;
  wakePhrase?: string;
}
