'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import type {
  AssistantStatus,
  Message,
  ToolCall,
  ToolEvent,
  SessionEvent,
  ChatResponse,
} from '@/types/types';

const STORAGE_KEY = 'voxelle_chat_history';
const SIGNALS_KEY = 'voxelle_recent_signals';

const DEFAULT_SIGNALS = [
  "Plan tomorrow's schedule",
  'Research briefing: TimesFM',
  'Set up focus routine',
  'Smart home evening scene',
];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function saveMessages(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
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

const INITIAL_SESSION_EVENTS: SessionEvent[] = [
  {
    id: 'init-1',
    title: 'Workspace connected',
    subtitle: 'JUST NOW · ENCRYPTED',
    timestamp: 0,
    status: 'normal',
  },
  {
    id: 'init-2',
    title: '8 tools available',
    subtitle: 'CALENDAR · SEARCH · HOME +5',
    timestamp: 0,
    status: 'normal',
  },
  {
    id: 'init-3',
    title: 'No actions currently running',
    subtitle: 'AWAITING YOUR NEXT SIGNAL',
    timestamp: 0,
    status: 'warn',
  },
];

export function useAssistant() {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recentSignals, setRecentSignals] = useState<string[]>(DEFAULT_SIGNALS);
  const [sessionEvents, setSessionEvents] = useState<SessionEvent[]>(INITIAL_SESSION_EVENTS);

  const statusRef = useRef<AssistantStatus>('idle');
  const processingRef = useRef(false);

  // Hydrate from localStorage on initial client mount
  useEffect(() => {
    const stored = loadMessagesFromStorage();
    if (stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from external localStorage store
      setMessages(stored);
    }
    const signals = loadSignalsFromStorage();
    setRecentSignals(signals);

    const now = Date.now();
    setSessionEvents([
      {
        id: 'init-1',
        title: 'Workspace connected',
        subtitle: 'JUST NOW · ENCRYPTED',
        timestamp: now,
        status: 'normal',
      },
      {
        id: 'init-2',
        title: '8 tools available',
        subtitle: 'CALENDAR · SEARCH · HOME +5',
        timestamp: now - 1000,
        status: 'normal',
      },
      {
        id: 'init-3',
        title: 'No actions currently running',
        subtitle: 'AWAITING YOUR NEXT SIGNAL',
        timestamp: now - 2000,
        status: 'warn',
      },
    ]);

    setHydrated(true);
  }, []);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Persist messages
  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

  // Persist recent signals
  useEffect(() => {
    if (hydrated) {
      saveSignals(recentSignals);
    }
  }, [recentSignals, hydrated]);

  const {
    transcript,
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
  } = useSpeechSynthesis();

  // Helper to add session log events
  const addSessionEvent = useCallback(
    (title: string, subtitle: string, eventStatus: 'normal' | 'warn' | 'success' = 'normal') => {
      setSessionEvents((prev) => [
        {
          id: generateId(),
          title,
          subtitle,
          timestamp: Date.now(),
          status: eventStatus,
        },
        ...prev.slice(0, 7),
      ]);
    },
    []
  );

  // Add a prompt to recent signals
  const recordSignal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 40) return;
    setRecentSignals((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 6);
    });
  }, []);

  // Process message pipeline
  const processMessage = useCallback(
    async (userText: string, image?: string | null) => {
      if (processingRef.current) return;
      processingRef.current = true;

      recordSignal(userText);

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
        image: image || undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus('processing');

      addSessionEvent(
        `Signal dispatched: "${userText.slice(0, 24)}${userText.length > 24 ? '...' : ''}"`,
        'TRANSIT · TLS 1.3',
        'normal'
      );

      try {
        const recentMessages = [...messages, userMessage].slice(-10);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: recentMessages,
            image: image || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data: ChatResponse = await res.json();

        // Handle tool calls
        if (data.toolCalls && data.toolCalls.length > 0) {
          for (const tc of data.toolCalls) {
            const toolEvent: ToolEvent = {
              id: generateId(),
              toolCall: { ...tc, status: 'executing' },
              timestamp: Date.now(),
            };
            setToolEvents((prev) => [...prev, toolEvent]);

            addSessionEvent(
              `Tool executing: ${tc.name.replace(/_/g, ' ')}`,
              'DISPATCHED TO ENVIRONMENT',
              'warn'
            );

            // Simulate realistic tool action latency
            await new Promise((resolve) => setTimeout(resolve, 1200));

            setToolEvents((prev) =>
              prev.map((te) =>
                te.id === toolEvent.id
                  ? {
                      ...te,
                      toolCall: { ...te.toolCall, status: 'completed' as const },
                      result: getToolResult(tc),
                    }
                  : te
              )
            );

            addSessionEvent(
              `Tool completed: ${tc.name.replace(/_/g, ' ')}`,
              'SUCCESS · STATE APPLIED',
              'success'
            );
          }
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (image) {
          setUploadedImage(null);
        }

        // Speak response
        if (ttsSupported && data.response) {
          setStatus('speaking');
          addSessionEvent('Voice response active', 'SYNTHESIS ENGINE ENGAGED', 'normal');
          speak(data.response, () => {
            setStatus('idle');
            processingRef.current = false;
            addSessionEvent('Workspace nominal', 'AWAITING YOUR NEXT SIGNAL', 'warn');
          });
        } else {
          setStatus('idle');
          processingRef.current = false;
          addSessionEvent('Workspace nominal', 'AWAITING YOUR NEXT SIGNAL', 'warn');
        }
      } catch (err) {
        console.error('Assistant pipeline error:', err);
        const errorMessage: Message = {
          id: generateId(),
          role: 'system',
          content: 'An error occurred while communicating with the assistant. Please retry.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStatus('idle');
        processingRef.current = false;
        addSessionEvent('Signal interrupted', 'RETRY AVAILABLE', 'warn');
      }
    },
    [messages, speak, ttsSupported, addSessionEvent, recordSignal]
  );

  // Watch speech recognition transcript
  useEffect(() => {
    if (transcript && !processingRef.current) {
      const textToProcess = transcript;
      clearTranscript();
      processMessage(textToProcess, uploadedImage);
    }
  }, [transcript, uploadedImage, clearTranscript, processMessage]);

  // Sync listening status
  useEffect(() => {
    if (isListening && statusRef.current === 'idle') {
      setStatus('listening');
      addSessionEvent('Microphone surface open', 'STREAMING AUDIO ENCRYPTED', 'normal');
    } else if (!isListening && statusRef.current === 'listening') {
      setStatus('idle');
    }
  }, [isListening, addSessionEvent]);

  // Sync speaking status
  useEffect(() => {
    if (isSpeaking && statusRef.current !== 'speaking') {
      setStatus('speaking');
    }
  }, [isSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      addSessionEvent('Listening paused', 'INPUT SURFACE CLOSED', 'normal');
    } else if (statusRef.current === 'idle') {
      stopSpeaking();
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking, addSessionEvent]);

  const sendTextMessage = useCallback(
    (text: string) => {
      if (!text.trim() || processingRef.current) return;
      stopSpeaking();
      processMessage(text.trim(), uploadedImage);
    },
    [processMessage, uploadedImage, stopSpeaking]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setToolEvents([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    addSessionEvent('Session log reset', 'COMMAND CENTER READY', 'normal');
  }, [addSessionEvent]);

  const dismissToolEvent = useCallback((id: string) => {
    setToolEvents((prev) => prev.filter((te) => te.id !== id));
  }, []);

  return {
    status,
    messages,
    toolEvents,
    sessionEvents,
    recentSignals,
    uploadedImage,
    setUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage,
    clearHistory,
    dismissToolEvent,
    stopSpeaking,
  };
}

function getToolResult(tc: ToolCall): string {
  if (tc.name === 'add_calendar_event') {
    return `Scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}`;
  }
  if (tc.name === 'toggle_smart_home_device') {
    return `${tc.arguments.device_name} turned ${tc.arguments.state}`;
  }
  return 'Completed';
}
