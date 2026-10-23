'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';

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
      window.speechSynthesis.cancel();
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SpeechSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

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

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utteranceRef.current = utterance;

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

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.rate = currentSettings.rate;
      utterance.pitch = currentSettings.pitch;
      utterance.volume = currentSettings.volume;

      utterance.onstart = () => {
        if (currentUtteranceIdRef.current === utteranceId) {
          setIsSpeaking(true);
        }
      };

      utterance.onend = () => {
        if (currentUtteranceIdRef.current === utteranceId) {
          setIsSpeaking(false);
          onEnd?.();
        }
      };

      utterance.onerror = (event) => {
        if (currentUtteranceIdRef.current === utteranceId) {
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            console.warn('Speech synthesis notice:', event.error);
          }
          setIsSpeaking(false);
          onEnd?.();
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Failed to initiate speech synthesis:', err);
        if (currentUtteranceIdRef.current === utteranceId) {
          setIsSpeaking(false);
          onEnd?.();
        }
      }
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    currentUtteranceIdRef.current++;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

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
