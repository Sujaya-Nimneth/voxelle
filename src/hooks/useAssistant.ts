'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { optimizeImage } from '@/lib/imageUtils';
import { buildHistoryForApi } from '@/lib/chatResponse';
import { readChatStream } from '@/lib/chatStream';
import { toolDefinitions } from '@/app/api/chat/tools';
import type {
  AssistantStatus,
  Message,
  ToolCall,
  ToolEvent,
  SessionEvent,
} from '@/types/types';

const STORAGE_KEY = 'voxelle_chat_history';
const SIGNALS_KEY = 'voxelle_recent_signals';
const AUTOSPEAK_KEY = 'voxelle_auto_speak';

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
    title: `${toolDefinitions.length} tools available`,
    subtitle: 'CALENDAR · SMART HOME',
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
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [activeProvider, setActiveProvider] = useState<string>('mock');
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);

  const statusRef = useRef<AssistantStatus>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNetworkBusyRef = useRef(false);
  // Generation token for the request lifecycle: bumped by every new request
  // and by clearHistory so stale post-fetch work (tool animations, late
  // appends) can detect it no longer owns the conversation.
  const requestGenerationRef = useRef(0);

  // Mirrors messages so processMessage can read the latest history without
  // depending on the messages state array (which would churn its identity on
  // every message and cascade through sendTextMessage into memoized children).
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const stored = loadMessagesFromStorage();
    if (stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from external storage
      setMessages(stored);
    }
    const signals = loadSignalsFromStorage();
    setRecentSignals(signals);

    try {
      const storedAutoSpeak = localStorage.getItem(AUTOSPEAK_KEY);
      if (storedAutoSpeak !== null) {
        setAutoSpeak(storedAutoSpeak === 'true');
      }
    } catch {
      // Ignore
    }

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
        title: `${toolDefinitions.length} tools available`,
        subtitle: 'CALENDAR · SMART HOME',
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

  // Sync statusRef
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Persist messages & auto-speak setting
  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

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

  // Helper to add session telemetry
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
        ...prev.slice(0, 6),
      ]);
    },
    []
  );

  const recordSignal = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 40) return;
    setRecentSignals((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...filtered].slice(0, 6);
    });
  }, []);

  // Handle image upload with auto-downscaling
  const handleSetUploadedImage = useCallback(async (image: string | null) => {
    if (!image) {
      setUploadedImage(null);
      return;
    }
    const optimized = await optimizeImage(image);
    setUploadedImage(optimized);
  }, []);

  // Helper to append a system error banner (dismissed on retry, never persisted)
  const appendSystemError = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: 'system', content, timestamp: Date.now() },
    ]);
  }, []);

  // Process message pipeline with interruptibility and cancellation
  const processMessage = useCallback(
    async (userText: string, image?: string | null, options?: { isRetry?: boolean }) => {
      const isRetry = options?.isRetry === true;

      // Abort any ongoing request before dispatching a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Stop any speech immediately upon new input
      stopSpeaking();
      isNetworkBusyRef.current = true;

      const generation = ++requestGenerationRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      let timedOut = false;
      // Deadline is idle-based: any stream progress (headers, deltas, tools)
      // re-arms it, so a slow but flowing stream isn't cut off at a flat 35s.
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const armTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 35000);
      };
      const disarmTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
      };
      armTimeout();
      // Streaming assistant message id — created once the stream opens; the
      // catch path needs it to close out a partial shell on cancellation.
      let assistantMessageId: string | null = null;

      let userMessage: Message;

      if (isRetry) {
        // Reuse the existing user turn (and its image) instead of appending a
        // duplicate; drop stale error banners while we're at it.
        const lastUser = [...messagesRef.current].reverse().find((m) => m.role === 'user');
        if (!lastUser) {
          disarmTimeout();
          isNetworkBusyRef.current = false;
          return;
        }
        userMessage = lastUser;
        setMessages((prev) => prev.filter((m) => m.role !== 'system'));
      } else {
        recordSignal(userText);

        userMessage = {
          id: generateId(),
          role: 'user',
          content: userText,
          timestamp: Date.now(),
          image: image || undefined,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      setStatus('processing');

      const signalLabel = userMessage.content || 'Visual signal';
      addSessionEvent(
        `Signal dispatched: "${signalLabel.slice(0, 22)}${signalLabel.length > 22 ? '...' : ''}"`,
        'TRANSIT · TLS 1.3',
        'normal'
      );

      try {
        // Prepare messages for API: strip system banners and old base64 images
        const historyForApi = buildHistoryForApi(
          messagesRef.current,
          isRetry ? undefined : userMessage
        );

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: historyForApi,
            image: userMessage.image,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          disarmTimeout();
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        if (!res.body) {
          disarmTimeout();
          throw new Error('The assistant returned an empty stream.');
        }

        // Streaming reply: a shell assistant message is appended once and its
        // content grows in place as deltas arrive (renders throttled).
        assistantMessageId = generateId();
        const shellId = assistantMessageId;
        setMessages((prev) => [
          ...prev,
          {
            id: shellId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
          },
        ]);

        let fullText = '';
        let lastRenderAt = 0;
        let receivedAnyEvent = false;
        let streamErrorMessage: string | null = null;
        const receivedToolCalls: ToolCall[] = [];

        await readChatStream(res.body, {
          onEvent: () => {
            receivedAnyEvent = true;
            armTimeout(); // progress resets the idle deadline
          },
          onMeta: (meta) => {
            if (meta.provider) setActiveProvider(meta.provider);
            if (meta.degraded !== undefined) {
              setIsDegraded(meta.degraded);
              setDegradedReason(meta.degraded ? meta.reason ?? null : null);
            }
          },
          onDelta: (text) => {
            fullText += text;
            const now = Date.now();
            if (now - lastRenderAt >= 60) {
              lastRenderAt = now;
              const snapshot = fullText;
              setMessages((prev) =>
                prev.map((m) => (m.id === shellId ? { ...m, content: snapshot } : m))
              );
            }
          },
          onTool: (tc) => {
            receivedToolCalls.push(tc);
          },
          onError: (message) => {
            streamErrorMessage = message;
          },
        });
        disarmTimeout();

        if (!receivedAnyEvent) {
          throw new Error('Received an invalid response from the assistant service.');
        }

        // A newer request or clearHistory took over mid-stream
        if (requestGenerationRef.current !== generation) return;

        if (streamErrorMessage && !fullText) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
          throw new Error(streamErrorMessage);
        }

        // Tool execution animations — cancellable: a newer request or
        // clearHistory during the staggered delays stops the sequence.
        if (receivedToolCalls.length > 0) {
          for (const tc of receivedToolCalls) {
            if (requestGenerationRef.current !== generation) return;

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

            // Realistic micro-delay for visual feedback
            await new Promise((resolve) => setTimeout(resolve, 800));

            if (requestGenerationRef.current !== generation) return;

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

        // Finalize the reply — only if this request still owns the conversation
        if (requestGenerationRef.current !== generation) return;

        const finalText = fullText || "I'm not sure how to respond to that. Could you try rephrasing?";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: finalText, isStreaming: false }
              : m
          )
        );

        if (image) {
          setUploadedImage(null);
        }

        isNetworkBusyRef.current = false;

        // Voice playback if autoSpeak is enabled and TTS is supported
        if (autoSpeak && ttsSupported && finalText) {
          setStatus('speaking');
          addSessionEvent('Voice response active', 'SYNTHESIS ENGINE ENGAGED', 'normal');
          speak(finalText, () => {
            setStatus('idle');
            addSessionEvent('Workspace nominal', 'AWAITING YOUR NEXT SIGNAL', 'warn');
          });
        } else {
          setStatus('idle');
          addSessionEvent('Workspace nominal', 'AWAITING YOUR NEXT SIGNAL', 'warn');
        }
      } catch (err: unknown) {
        disarmTimeout();

        // Close out a partial streaming shell so a cancelled stream doesn't
        // leave a message stuck in streaming state (drop it if still empty).
        if (assistantMessageId) {
          const shellId = assistantMessageId;
          setMessages((prev) =>
            prev
              .map((m) => (m.id === shellId ? { ...m, isStreaming: false } : m))
              .filter((m) => m.id !== shellId || m.content.length > 0)
          );
        }

        // A newer request superseded this one (or history was cleared): that
        // request owns the busy flag and status now — exit without clobbering.
        if (controller !== abortControllerRef.current) return;

        isNetworkBusyRef.current = false;

        if (err instanceof Error && err.name === 'AbortError') {
          if (timedOut) {
            console.warn('Assistant stream stalled and timed out after 35s without progress.');
            appendSystemError('The assistant took too long to respond. Please try again.');
            setStatus('idle');
            addSessionEvent('Signal timed out', 'RETRY AVAILABLE', 'warn');
          } else {
            console.warn('Assistant request was cancelled.');
            setStatus('idle');
          }
          return;
        }

        console.error('Assistant pipeline error:', err);
        appendSystemError(
          err instanceof Error && err.message
            ? `Error: ${err.message}`
            : 'An error occurred while communicating with the assistant.'
        );
        setStatus('idle');
        addSessionEvent('Signal interrupted', 'RETRY AVAILABLE', 'warn');
      }
    },
    [autoSpeak, ttsSupported, speak, stopSpeaking, addSessionEvent, recordSignal, appendSystemError]
  );

  // Retry the last user prompt if failed — reuses the existing turn rather
  // than dispatching (and duplicating) it again.
  const retryLastMessage = useCallback(() => {
    processMessage('', undefined, { isRetry: true });
  }, [processMessage]);

  // Watch speech recognition transcript
  useEffect(() => {
    if (!transcript) return;
    if (isNetworkBusyRef.current) {
      // A request is already in flight — drop the utterance rather than
      // letting it linger and auto-dispatch unreviewed once the busy
      // period ends.
      clearTranscript();
      return;
    }
    const textToProcess = transcript;
    clearTranscript();
    processMessage(textToProcess, uploadedImage);
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
    } else {
      // If Voxelle is speaking or idle, start listening immediately (interrupting speech)
      stopSpeaking();
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking, addSessionEvent]);

  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      // Image-only sends are valid: the composer enables Send for an
      // attached image even without accompanying text.
      if ((!trimmed && !uploadedImage) || isNetworkBusyRef.current) return;
      stopSpeaking();
      processMessage(trimmed, uploadedImage);
    },
    [processMessage, uploadedImage, stopSpeaking]
  );

  // Read an existing reply aloud directly — no LLM round-trip, nothing
  // appended to history.
  const speakMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      stopSpeaking();
      setStatus('speaking');
      addSessionEvent('Voice response active', 'SYNTHESIS ENGINE ENGAGED', 'normal');
      speak(text, () => {
        setStatus('idle');
        addSessionEvent('Workspace nominal', 'AWAITING YOUR NEXT SIGNAL', 'warn');
      });
    },
    [speak, stopSpeaking, addSessionEvent]
  );

  const clearHistory = useCallback(() => {
    // Fully invalidate any in-flight request: the superseded request's catch
    // and post-fetch animation loop must not touch state after this.
    requestGenerationRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isNetworkBusyRef.current = false;
    stopSpeaking();
    stopListening();
    setMessages([]);
    setToolEvents([]);
    setStatus('idle');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    addSessionEvent('Session log reset', 'COMMAND CENTER READY', 'normal');
  }, [stopSpeaking, stopListening, addSessionEvent]);

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
    setUploadedImage: handleSetUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage,
    retryLastMessage,
    clearHistory,
    dismissToolEvent,
    stopSpeaking,
    speakMessage,
    interimTranscript,
    autoSpeak,
    toggleAutoSpeak,
    activeProvider,
    isDegraded,
    degradedReason,
    voices,
    ttsSettings,
    updateTtsSettings,
  };
}

function getToolResult(tc: ToolCall): string {
  if (tc.name === 'add_calendar_event') {
    return `Scheduled "${tc.arguments.title}" for ${tc.arguments.date} at ${tc.arguments.time}`;
  }
  if (tc.name === 'toggle_smart_home_device') {
    return `${tc.arguments.device_name} turned ${tc.arguments.state}`;
  }
  return 'Action completed successfully';
}
