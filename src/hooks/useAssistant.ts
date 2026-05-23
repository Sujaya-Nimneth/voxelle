'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import type {
  AssistantStatus,
  Message,
  ToolCall,
  ToolEvent,
  ChatResponse,
} from '@/types/types';

const STORAGE_KEY = 'voxelle_chat_history';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

export function useAssistant() {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  // Start empty to match SSR — hydrate from localStorage after mount
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const statusRef = useRef<AssistantStatus>('idle');
  const processingRef = useRef(false);

  // Hydrate messages from localStorage after first client render
  useEffect(() => {
    const stored = loadMessagesFromStorage();
    if (stored.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate hydration from external store (localStorage)
      setMessages(stored);
    }
    setHydrated(true);
  }, []);

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Save to localStorage whenever messages change (only after hydration)
  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    error: sttError,
    isSupported: sttSupported,
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: ttsSupported,
  } = useSpeechSynthesis();

  // Process the assistant pipeline
  const processMessage = useCallback(
    async (userText: string, image?: string | null) => {
      if (processingRef.current) return;
      processingRef.current = true;

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
        image: image || undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus('processing');

      try {
        // Build messages for API (limit context window)
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

            // Simulate tool execution delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Mark tool as completed
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

        // Clear uploaded image after sending
        if (image) {
          setUploadedImage(null);
        }

        // Speak the response
        if (ttsSupported && data.response) {
          setStatus('speaking');
          speak(data.response, () => {
            setStatus('idle');
            processingRef.current = false;
          });
        } else {
          setStatus('idle');
          processingRef.current = false;
        }
      } catch (err) {
        console.error('Assistant pipeline error:', err);
        const errorMessage: Message = {
          id: generateId(),
          role: 'system',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStatus('idle');
        processingRef.current = false;
      }
    },
    [messages, speak, ttsSupported]
  );

  // Watch for transcript changes from speech recognition
  useEffect(() => {
    if (transcript && !processingRef.current) {
      processMessage(transcript, uploadedImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // Update status based on listening state
  useEffect(() => {
    if (isListening && statusRef.current === 'idle') {
      setStatus('listening');
    } else if (!isListening && statusRef.current === 'listening') {
      setStatus('idle');
    }
  }, [isListening]);

  // Sync speaking state
  useEffect(() => {
    if (isSpeaking && statusRef.current !== 'speaking') {
      setStatus('speaking');
    }
  }, [isSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else if (statusRef.current === 'idle') {
      stopSpeaking(); // Stop any ongoing speech
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking]);

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
  }, []);

  const dismissToolEvent = useCallback((id: string) => {
    setToolEvents((prev) => prev.filter((te) => te.id !== id));
  }, []);

  return {
    status,
    messages,
    toolEvents,
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
  return 'Done';
}
