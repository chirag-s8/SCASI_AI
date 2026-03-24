/**
 * @file src/agents/voice/wakeWordListener.ts
 * Client-side wake word listener for "Hey Scasi".
 * Uses a continuous SpeechRecognition instance entirely in the browser —
 * no audio is transmitted to any external service.
 */

import type { WakeWordListenerOptions } from './voiceTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
function getSpeechRecognitionConstructor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export class WakeWordListener {
  private recognition: any = null;
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
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript: string = event.results[i][0].transcript.toLowerCase().trim();
        // Match exact phrase or common mishearings of "hey scasi"
        const isWake =
          transcript.includes(this.wakePhrase) ||
          transcript.includes('scasi') ||
          transcript.includes('sassy') ||
          transcript.includes('hey cassie') ||
          transcript.includes('hey sassy') ||
          transcript.includes('hey stacy') ||
          transcript.includes('hey kasey');
        if (isWake) {
          this.onDetected();
        }
      }
    };

    rec.onend = () => {
      // Only restart if still running AND not paused — prevents mic conflict with session STT
      if (this.running && !this.paused) {
        try { rec.start(); } catch { /* ignore race */ }
      }
    };

    rec.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.running = false;
        return;
      }
      if (this.running) {
        setTimeout(() => { try { rec.start(); } catch { /* ignore */ } }, 1000);
      }
    };

    try {
      rec.start();
      this.recognition = rec;
    } catch {
      this.running = false;
    }
  }
}
