'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { chunkTextForSpeech } from '@/lib/speechChunks';

export interface SpeechSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceURI?: string;
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  settings: SpeechSettings;
  updateSettings: (newSettings: Partial<SpeechSettings>) => void;
}

const DEFAULT_SETTINGS: SpeechSettings = {
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

function emptySubscribe() {
  return () => {};
}

function getTtsClientSnapshot(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function getTtsServerSnapshot(): boolean {
  return false;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<SpeechSettings>(DEFAULT_SETTINGS);

  const isSupported = useSyncExternalStore(
    emptySubscribe,
    getTtsClientSnapshot,
    getTtsServerSnapshot
  );

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentUtteranceIdRef = useRef<number>(0);
  // Chrome sometimes never fires onstart/onend (hung engine or remote voice);
  // the watchdog force-finishes so `isSpeaking` can't wedge at true forever.
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Refs mirror voices/settings so `speak` keeps a stable identity: it sits in
  // the dependency chain of processMessage -> sendTextMessage, and rebuilding
  // that chain on every TTS settings slider tick needlessly re-renders the
  // memoized composer.
  const voicesRef = useRef(voices);
  const settingsRef = useRef(settings);
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Load voices when available
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      clearWatchdog();
      window.speechSynthesis.cancel();
    };
  }, [clearWatchdog]);

  const updateSettings = useCallback((newSettings: Partial<SpeechSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // iOS/WebKit only honors speechSynthesis.speak() calls made during a user
  // gesture; a silent primer on the first interaction unlocks later
  // programmatic speaks (e.g. auto-speak after a fetch resolves).
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) return;

    const unlock = () => {
      try {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      } catch {
        // Priming is best-effort
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [isSupported]);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSupported || typeof window === 'undefined' || !window.speechSynthesis) {
        onEnd?.();
        return;
      }

      // Increment utterance ID so previous async errors/cancellations don't trigger the new callback
      const utteranceId = ++currentUtteranceIdRef.current;

      // Clean up any ongoing speech
      window.speechSynthesis.cancel();

      // Strip markdown formatting symbols so TTS doesn't read out "**bold**" or "`code`"
      const cleanedText = text
        .replace(/[*_~`#>[\]]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanedText) {
        onEnd?.();
        return;
      }

      // Long text is split into sentence-bounded chunks: Chrome's remote
      // voices truncate long single utterances, and mobile engines can fail
      // outright. The engine queues chunks in order; the final chunk's
      // onend/onerror drives completion.
      const chunks = chunkTextForSpeech(cleanedText);

      // Select voice: user preferred, then high quality natural voices, then English fallback
      const currentSettings = settingsRef.current;
      const availableVoices =
        voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (currentSettings.voiceURI) {
        chosenVoice = availableVoices.find((v) => v.voiceURI === currentSettings.voiceURI);
      }

      if (!chosenVoice) {
        chosenVoice =
          availableVoices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Natural') ||
                v.name.includes('Karen') ||
                v.name.includes('Serena'))
          ) || availableVoices.find((v) => v.lang.startsWith('en'));
      }

      const finish = () => {
        clearWatchdog();
        setIsSpeaking(false);
        onEnd?.();
      };

      // ~120ms per char is a generous upper bound on speech rate (~8 chars/s);
      // the floor covers very short chunks and engine startup.
      const armWatchdog = (ms: number) => {
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
          if (currentUtteranceIdRef.current !== utteranceId) return;
          // Invalidate the hung queue so its stray events are ignored.
          currentUtteranceIdRef.current++;
          try {
            window.speechSynthesis.cancel();
          } catch {
            // Engine already gone
          }
          finish();
        }, ms);
      };

      const queueChunks = () => {
        if (currentUtteranceIdRef.current !== utteranceId) return;

        chunks.forEach((chunk, index) => {
          const isLast = index === chunks.length - 1;
          const utterance = new SpeechSynthesisUtterance(chunk);
          if (index === 0) {
            utteranceRef.current = utterance;
          }

          if (chosenVoice) {
            utterance.voice = chosenVoice;
          }
          utterance.rate = currentSettings.rate;
          utterance.pitch = currentSettings.pitch;
          utterance.volume = currentSettings.volume;

          utterance.onstart = () => {
            if (currentUtteranceIdRef.current !== utteranceId) return;
            if (index === 0) {
              setIsSpeaking(true);
            }
            armWatchdog(Math.max(10_000, chunk.length * 120));
          };

          utterance.onerror = (event) => {
            if (currentUtteranceIdRef.current !== utteranceId) return;
            if (event.error !== 'interrupted' && event.error !== 'canceled') {
              console.warn('Speech synthesis notice:', event.error);
            }
            if (!isLast) {
              // A failed middle chunk aborts the remaining queue
              currentUtteranceIdRef.current++;
              window.speechSynthesis.cancel();
            }
            finish();
          };

          if (isLast) {
            utterance.onend = () => {
              if (currentUtteranceIdRef.current === utteranceId) {
                finish();
              }
            };
          }

          try {
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.warn('Failed to initiate speech synthesis:', err);
            if (currentUtteranceIdRef.current === utteranceId) {
              currentUtteranceIdRef.current++;
              window.speechSynthesis.cancel();
              finish();
            }
          }
        });

        // If no chunk ever reports onstart (silent engine hang), still finish.
        armWatchdog(8_000);
      };

      // Chrome intermittently drops utterances queued in the same tick as a
      // cancel(); deferring the queue by a macrotask dodges the race.
      setTimeout(queueChunks, 50);
    },
    [isSupported, clearWatchdog]
  );

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    currentUtteranceIdRef.current++;
    clearWatchdog();
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [clearWatchdog]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    settings,
    updateSettings,
  };
}
