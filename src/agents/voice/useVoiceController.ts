"use client";
/**
 * @file src/agents/voice/useVoiceController.ts
 * Scasi voice session state machine.
 *
 * 1. Live transcript shown as user speaks (interimResults + continuous)
 * 2. Callbacks in refs — never stale
 * 3. startSession speaks short "Yeah?" greeting before listening
 * 4. After each answer, immediately resumes listening (no closing prompt)
 * 5. Sweet female voice (Google UK English Female → Samantha → any female)
 * 6. no-speech / errors restart listening, never kill session
 * 7. User can say "bye", "done", etc. to end session naturally
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  VoiceControllerOptions,
  VoiceControllerReturn,
  VoiceError,
  VoiceState,
} from './voiceTypes';
import { truncateToWords, cleanForSpeech } from './voiceUtils';

const GREETING        = "Yeah?";
const CLOSING_FAREWELL = "Happy to help! Have a great day.";
const MAX_TTS_WORDS   = 500;
const SILENCE_TIMEOUT = 20000;

const DONE_PHRASES = new Set([
  'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'done', 'yes i am',
  "yes i'm done", 'i am done', 'im done', "that's all", 'thats all',
  "that's it", 'thats it', 'goodbye', 'bye', 'good bye', 'bye bye',
  'nothing else', 'nothing more', "i'm good", 'im good', 'all good',
  'all set', "i'm all set", 'no thanks', 'no thank you',
  'stop', 'end', 'exit', 'quit', 'close',
  'thank you', 'thanks', 'thank you so much', 'thanks a lot',
  'thank you very much', 'thanks so much', 'cheers', 'great thanks',
  'perfect thanks', 'awesome thanks', 'got it thanks', 'got it thank you',
]);

function isDone(text: string): boolean {
  const n = text.toLowerCase().trim().replace(/[.,!?;:]+$/, '');
  if (DONE_PHRASES.has(n)) return true;
  // Catch prefixed variants: "ok thank you", "oh thanks", "alright bye", etc.
  return /\b(thank\s*you|thanks|bye|goodbye|that'?s?\s*(all|it)|all\s*(good|set)|i'?m?\s*(done|good|all\s*set))\b/.test(n);
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.name === 'Google UK English Female') ??
    voices.find(v => v.name === 'Samantha') ??
    voices.find(v => v.name === 'Karen') ??
    voices.find(v => v.name === 'Victoria') ??
    voices.find(v => v.name === 'Moira') ??
    voices.find(v => v.name === 'Fiona') ??
    voices.find(v => v.name === 'Tessa') ??
    voices.find(v => v.name.toLowerCase().includes('female')) ??
    voices.find(v => /zira|hazel|susan|catherine|veena/i.test(v.name)) ??
    voices.find(v => v.lang === 'en-GB') ??
    voices.find(v => v.lang.startsWith('en')) ??
    null
  );
}

export function useVoiceController(options: VoiceControllerOptions = {}): VoiceControllerReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const stateRef  = useRef<VoiceState>('idle');
  const recRef    = useRef<SpeechRecognition | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  // Stable callback refs — never stale inside closures
  const cbTranscript    = useRef(options.onTranscript);
  const cbAnswer        = useRef(options.onAnswer);
  const cbStateChange   = useRef(options.onStateChange);
  const cbError         = useRef(options.onError);
  const sessionIdRef    = useRef(options.sessionId);
  const emailContextRef = useRef(options.emailContext);

  useEffect(() => {
    cbTranscript.current    = options.onTranscript;
    cbAnswer.current        = options.onAnswer;
    cbStateChange.current   = options.onStateChange;
    cbError.current         = options.onError;
    sessionIdRef.current    = options.sessionId;
    emailContextRef.current = options.emailContext;
  });

  // Lazy check at call time — avoids SSR false-negative (window is undefined on server)
  const isSupported = {
    get stt() { return getSpeechRecognitionCtor() !== null; },
    get tts() { return isTTSSupported(); },
  };

  const setVoiceState = useCallback((s: VoiceState) => {
    stateRef.current = s;
    setState(s);
    cbStateChange.current?.(s);
  }, []);

  const emitError = useCallback((error: VoiceError) => {
    cbError.current?.(error);
    setVoiceState('idle');
    activeRef.current = false;
  }, [setVoiceState]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!isTTSSupported()) { resolve(); return; }
      window.speechSynthesis.cancel();

      const doSpeak = () => {
        const utt = new SpeechSynthesisUtterance(truncateToWords(text, MAX_TTS_WORDS));
        const voice = pickFemaleVoice();
        if (voice) utt.voice = voice;
        utt.rate   = 1.0;
        utt.pitch  = 1.15;
        utt.volume = 1.0;
        const safetyTimeout = setTimeout(() => { window.speechSynthesis.cancel(); resolve(); }, 30_000);
        utt.onend  = () => { clearTimeout(safetyTimeout); resolve(); };
        utt.onerror = () => { clearTimeout(safetyTimeout); resolve(); };
        window.speechSynthesis.speak(utt);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        doSpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        };
        setTimeout(() => {
          if (window.speechSynthesis.getVoices().length === 0) doSpeak();
        }, 400);
      }
    });
  }, []);

  const cancelTTS = useCallback(() => {
    if (isTTSSupported()) window.speechSynthesis.cancel();
    if (activeRef.current) setVoiceState('idle');
    activeRef.current = false;
  }, [setVoiceState]);

  // ── STT helpers ───────────────────────────────────────────────────────────
  const stopRecognition = useCallback(() => {
    if (recRef.current) {
      try { recRef.current.abort(); } catch { /* ignore */ }
      recRef.current = null;
    }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const startListeningRef = useRef<() => void>(() => {});
  const startListening = useCallback(() => startListeningRef.current(), []);

  // ── Process final transcript ──────────────────────────────────────────────
  const processTranscript = useCallback(async (transcript: string) => {
    if (!activeRef.current) return;
    const text = transcript.trim();
    if (!text) { startListening(); return; }

    cbTranscript.current?.(text);

    // Check if user wants to end session
    if (isDone(text)) {
      setVoiceState('speaking');
      await speak(CLOSING_FAREWELL);
      setVoiceState('idle');
      activeRef.current = false;
      return;
    }

    setVoiceState('processing');

    try {
      const emailCtx = emailContextRef.current;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          sessionId: sessionIdRef.current,
          emailContext: emailCtx ? {
            gmailId: emailCtx.gmailId,
            subject: emailCtx.subject,
            from: emailCtx.from,
            snippet: emailCtx.snippet,
            body: emailCtx.body,
          } : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let answer = '';

      if (reader) {
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ev = JSON.parse(line.slice(6));
              if (ev.type === 'token' && ev.text) answer += ev.text;
            } catch { /* skip */ }
          }
        }
      }

      if (!answer) answer = "Sorry, I couldn't get a response. Could you try asking again?";
      // Strip any leaked think tags before speaking
      answer = answer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (!answer) answer = "Sorry, I couldn't get a response. Could you try asking again?";
      cbAnswer.current?.(answer, text);
      if (!activeRef.current) return;

      setVoiceState('speaking');
      await speak(cleanForSpeech(answer));
      if (!activeRef.current) return;

      startListening();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      cbError.current?.({
        code: 'ORCHESTRATOR_ERROR',
        message: errMsg,
      });
      if (!activeRef.current) return;

      const spokenError = "Sorry, I ran into an issue. Could you try asking again?";
      cbAnswer.current?.(spokenError, text);
      setVoiceState('speaking');
      await speak(spokenError);
      if (!activeRef.current) return;

      startListening();
    }
  }, [speak, setVoiceState, startListening]);

  // ── Core listening loop ───────────────────────────────────────────────────
  // Uses non-continuous mode + fresh instance per utterance — most reliable
  // across Chrome/Edge. Continuous mode causes silent failures on onend.
  useEffect(() => {
    startListeningRef.current = () => {
      if (!activeRef.current) return;
      stopRecognition();

      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor) {
        emitError({ code: 'STT_UNSUPPORTED', message: 'SpeechRecognition not supported. Use Chrome or Edge.' });
        return;
      }

      setVoiceState('listening');

      const rec = new Ctor();
      // Non-continuous: fires onend after each utterance — far more reliable
      rec.continuous      = false;
      rec.interimResults  = true;
      rec.lang            = 'en-US';
      rec.maxAlternatives = 1;
      recRef.current = rec;

      // Silence watchdog — restart if no speech detected within timeout
      const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (stateRef.current === 'listening' && activeRef.current) {
            stopRecognition();
            startListeningRef.current();
          }
        }, SILENCE_TIMEOUT);
      };
      resetTimer();

      let finalTranscript = '';

      rec.onresult = (event: SpeechRecognitionEvent) => {
        resetTimer();
        let interim = '';
        finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          const t: string = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interim += t;
          }
        }
        if (interim) cbTranscript.current?.(interim);
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'aborted' fires when we call rec.abort() intentionally — not a real error
        // 'no-speech' fires when mic times out with no audio — also not a real error
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          emitError({ code: 'MIC_DENIED', message: 'Microphone access denied. Please allow mic in your browser settings.' });
          return;
        }
        // network / audio-capture — restart fresh instance
        if (activeRef.current && stateRef.current === 'listening') {
          setTimeout(() => { if (activeRef.current) startListeningRef.current(); }, 400);
        }
      };

      rec.onend = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        recRef.current = null;
        if (!activeRef.current) return;

        if (finalTranscript.trim()) {
          processTranscript(finalTranscript.trim());
        } else if (stateRef.current === 'listening') {
          setTimeout(() => { if (activeRef.current) startListeningRef.current(); }, 150);
        }
      };

      try {
        rec.start();
      } catch (err) {
        emitError({ code: 'STT_UNSUPPORTED', message: 'Failed to start speech recognition' });
      }
    };
  }, [stopRecognition, setVoiceState, emitError, processTranscript]);

  // ── Public API ────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (activeRef.current) return;
    // Lazy check — safe to call after hydration
    if (!getSpeechRecognitionCtor()) {
      emitError({ code: 'STT_UNSUPPORTED', message: 'Voice not supported. Use Chrome or Edge.' });
      return;
    }
    activeRef.current = true;

    // Brief pause so the wake-word listener can fully release the mic
    // before we open a new SpeechRecognition instance.
    await new Promise(r => setTimeout(r, 800));
    if (!activeRef.current) return;

    // Greet first, then listen
    setVoiceState('speaking');
    await speak(GREETING);
    if (!activeRef.current) return;
    startListeningRef.current();
  }, [emitError, speak, setVoiceState]);

  const stopSession = useCallback(() => {
    activeRef.current = false;
    stopRecognition();
    if (isTTSSupported()) window.speechSynthesis.cancel();
    setVoiceState('idle');
  }, [stopRecognition, setVoiceState]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopRecognition();
      if (isTTSSupported()) window.speechSynthesis.cancel();
    };
  }, [stopRecognition]);

  return { state, startSession, stopSession, cancelTTS, isSupported };
}
