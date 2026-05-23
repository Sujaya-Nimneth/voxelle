'use client';

import { useState, useCallback, useRef } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

function checkTtsSupport(): boolean {
  if (typeof window === 'undefined') return true; // SSR: assume supported
  return !!window.speechSynthesis;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(checkTtsSupport);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndCallbackRef = useRef<(() => void) | null>(null);

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSupported || typeof window === 'undefined') return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      onEndCallbackRef.current = onEnd || null;

      // Try to pick a natural-sounding English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel') ||
            v.name.includes('Natural'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else {
        const englishVoice = voices.find((v) => v.lang.startsWith('en'));
        if (englishVoice) utterance.voice = englishVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEndCallbackRef.current) {
          onEndCallbackRef.current();
          onEndCallbackRef.current = null;
        }
      };

      utterance.onerror = (event) => {
        // 'interrupted' and 'canceled' are normal when we call cancel() before new speech
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.error('Speech synthesis error:', event.error);
        }
        setIsSpeaking(false);
        if (onEndCallbackRef.current) {
          onEndCallbackRef.current();
          onEndCallbackRef.current = null;
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}
