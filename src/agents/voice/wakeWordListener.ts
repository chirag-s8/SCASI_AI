/**
 * @file src/agents/voice/wakeWordListener.ts
 * Client-side wake word listener for "Hey Scasi".
 * Uses a continuous SpeechRecognition instance entirely in the browser —
 * no audio is transmitted to any external service.
 */

import type { WakeWordListenerOptions } from './voiceTypes';

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export class WakeWordListener {
  private recognition: SpeechRecognition | null = null;
  private readonly onDetected: () => void;
  private readonly wakePhrase: string;
  private running = false;
  private paused = false;

  readonly isSupported: boolean;

  constructor(options: WakeWordListenerOptions) {
    this.onDetected = options.onDetected;
    this.wakePhrase = (options.wakePhrase ?? 'hey scasi').toLowerCase();
    this.isSupported = getSpeechRecognitionConstructor() !== null;
  }

  start(): void {
    if (!this.isSupported || this.running) return;
    this.running = true;
    this._createAndStart();
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  /** Temporarily stop listening (e.g. while a voice session is active). */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignore */ }
      this.recognition = null;
    }
  }

  /** Resume listening after a pause. */
  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this._createAndStart();
  }

  private _onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.running && !this.paused) {
      this._createAndStart();
    }
  };

  private _createAndStart(): void {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor || !this.running || this.paused) return;

    // Always create a fresh instance — reusing the same rec after onend causes
    // silent failures in Chrome where the mic appears open but never fires onresult
    if (this.recognition) {
      try { this.recognition.abort(); } catch { /* ignore */ }
      this.recognition = null;
    }

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true; // interim lets us catch the phrase faster
    rec.lang = 'en-US';
    rec.maxAlternatives = 3;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Check both final and interim results for faster response
        for (let alt = 0; alt < event.results[i].length; alt++) {
          const transcript: string = event.results[i][alt].transcript.toLowerCase().trim();
          const isWake =
            transcript.includes(this.wakePhrase) ||
            transcript.includes('hey scasi') ||
            transcript.includes('scasi') ||
            transcript.includes('hey sassy') ||
            transcript.includes('hey cassie') ||
            transcript.includes('hey stacy') ||
            transcript.includes('hey kasey') ||
            transcript.includes('hey casey') ||
            transcript.includes('hey spacey');
          if (isWake) {
            this.onDetected();
            return; // fire once per detection
          }
        }
      }
    };

    rec.onend = () => {
      // Restart with a fresh instance — never reuse the ended rec
      if (this.running && !this.paused) {
        setTimeout(() => this._createAndStart(), 300);
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.running = false;
        return;
      }
      // no-speech / aborted / network — restart fresh after a short delay
      if (this.running && !this.paused) {
        setTimeout(() => this._createAndStart(), 500);
      }
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch {
      // Failed to start — retry after delay
      setTimeout(() => { if (this.running && !this.paused) this._createAndStart(); }, 1000);
    }
  }
}
