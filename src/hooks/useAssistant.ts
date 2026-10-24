'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSessionEvents, createInitialSessionEvents } from './useSessionEvents';
import { useChatPipeline } from './useChatPipeline';
import type { Message } from '@/types/types';

const STORAGE_KEY = 'voxelle_chat_history';
const SIGNALS_KEY = 'voxelle_recent_signals';
const AUTOSPEAK_KEY = 'voxelle_auto_speak';

const DEFAULT_SIGNALS = [
  "Plan tomorrow's schedule",
  'Research briefing: TimesFM',
  'Set up focus routine',
  'Smart home evening scene',
];

function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function saveMessages(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    // Strip heavy base64 image strings from persistent storage to prevent 5MB
    // localStorage quota crash, and drop system error banners: they describe a
    // transient failure and shouldn't resurface after a reload.
    const sanitized = messages
      .filter((m) => m.role !== 'system')
      .slice(-50)
      .map((m) => {
        const copy = { ...m };
        delete copy.isStreaming; // transient render flag, never persisted
        if (copy.image && copy.image.length > 500) {
          copy.image = undefined;
        }
        return copy;
      });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Could not persist messages to localStorage:', err);
  }
}

function loadSignalsFromStorage(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SIGNALS;
  try {
    const stored = localStorage.getItem(SIGNALS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SIGNALS;
}

function saveSignals(signals: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SIGNALS_KEY, JSON.stringify(signals));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Composes the assistant: browser speech hooks, session telemetry, the chat
 * pipeline, and localStorage persistence. Page components consume only this
 * hook's stable API.
 */
export function useAssistant() {
  const [hydrated, setHydrated] = useState(false);
  const [recentSignals, setRecentSignals] = useState<string[]>(DEFAULT_SIGNALS);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Hook integrations
  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    clearTranscript,
    error: sttError,
    isSupported: sttSupported,
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: ttsSupported,
    voices,
    settings: ttsSettings,
    updateSettings: updateTtsSettings,
  } = useSpeechSynthesis();

  const { sessionEvents, setSessionEvents, addSessionEvent } = useSessionEvents();

  const recordSignal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 40) return;
    setRecentSignals((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 6);
    });
  }, []);

  const pipeline = useChatPipeline({
    addSessionEvent,
    recordSignal,
    speak,
    stopSpeaking,
    autoSpeak,
    ttsSupported,
  });

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const stored = loadMessagesFromStorage();
    if (stored.length > 0) {
      pipeline.setMessages(stored);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from external storage
    setRecentSignals(loadSignalsFromStorage());

    try {
      const storedAutoSpeak = localStorage.getItem(AUTOSPEAK_KEY);
      if (storedAutoSpeak !== null) {
        setAutoSpeak(storedAutoSpeak === 'true');
      }
    } catch {
      // Ignore
    }

    setSessionEvents(createInitialSessionEvents(Date.now()));

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydration
  }, []);

  // Persist messages & auto-speak setting
  useEffect(() => {
    if (hydrated) {
      saveMessages(pipeline.messages);
    }
  }, [pipeline.messages, hydrated]);

  useEffect(() => {
    if (hydrated) {
      saveSignals(recentSignals);
    }
  }, [recentSignals, hydrated]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTOSPEAK_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  // Watch speech recognition transcript
  useEffect(() => {
    if (!transcript) return;
    if (pipeline.isBusy()) {
      // A request is already in flight — drop the utterance rather than
      // letting it linger and auto-dispatch unreviewed once the busy
      // period ends.
      clearTranscript();
      return;
    }
    const textToProcess = transcript;
    clearTranscript();
    pipeline.processMessage(textToProcess, pipeline.uploadedImage);
  }, [transcript, pipeline, clearTranscript]);

  // Sync listening status
  useEffect(() => {
    if (isListening && pipeline.statusRef.current === 'idle') {
      pipeline.setStatus('listening');
      addSessionEvent('Microphone open', 'BROWSER SPEECH RECOGNITION', 'normal');
    } else if (!isListening && pipeline.statusRef.current === 'listening') {
      pipeline.setStatus('idle');
    }
  }, [isListening, pipeline, addSessionEvent]);

  // Sync speaking status
  useEffect(() => {
    if (isSpeaking && pipeline.statusRef.current !== 'speaking') {
      pipeline.setStatus('speaking');
    }
  }, [isSpeaking, pipeline]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      addSessionEvent('Listening paused', 'MIC CLOSED', 'normal');
    } else {
      // If Voxelle is speaking or idle, start listening immediately (interrupting speech)
      stopSpeaking();
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking, addSessionEvent]);

  const clearHistory = useCallback(() => {
    pipeline.resetConversation();
    stopSpeaking();
    stopListening();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    addSessionEvent('Session log reset', 'COMMAND CENTER READY', 'normal');
  }, [pipeline, stopSpeaking, stopListening, addSessionEvent]);

  return {
    status: pipeline.status,
    messages: pipeline.messages,
    toolEvents: pipeline.toolEvents,
    sessionEvents,
    recentSignals,
    uploadedImage: pipeline.uploadedImage,
    setUploadedImage: pipeline.setUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage: pipeline.sendTextMessage,
    retryLastMessage: pipeline.retryLastMessage,
    clearHistory,
    dismissToolEvent: pipeline.dismissToolEvent,
    stopSpeaking,
    speakMessage: pipeline.speakMessage,
    interimTranscript,
    autoSpeak,
    toggleAutoSpeak,
    activeProvider: pipeline.activeProvider,
    isDegraded: pipeline.isDegraded,
    degradedReason: pipeline.degradedReason,
    voices,
    ttsSettings,
    updateTtsSettings,
  };
}
