'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { optimizeImage } from '@/lib/imageUtils';
import { buildHistoryForApi } from '@/lib/chatResponse';
import { readChatStream } from '@/lib/chatStream';
import { generateId } from '@/lib/ids';
import type { AssistantStatus, Message, ToolEvent } from '@/types/types';

export interface ChatPipelineDeps {
  addSessionEvent: (
    title: string,
    subtitle: string,
    eventStatus?: 'normal' | 'warn' | 'success'
  ) => void;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  autoSpeak: boolean;
  ttsSupported: boolean;
}

/**
 * Owns the conversation pipeline: message state, streaming requests, tool
 * events, provider status, and the attached-image lifecycle. A single
 * generation token governs staleness — every new request and every reset
 * bumps it, and any late work from an older generation stands down.
 */
export function useChatPipeline({
  addSessionEvent,
  speak,
  stopSpeaking,
  autoSpeak,
  ttsSupported,
}: ChatPipelineDeps) {
  const [status, setStatus] = useState<AssistantStatus>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('mock');
  const [activeModel, setActiveModel] = useState<string>('');
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);

  const statusRef = useRef<AssistantStatus>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNetworkBusyRef = useRef(false);
  const requestGenerationRef = useRef(0);

  // Mirrors messages so processMessage can read the latest history without
  // depending on the messages state array (which would churn its identity on
  // every message and cascade through sendTextMessage into memoized children).
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Sync statusRef for outside-readers (listening/speaking coordination).
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Handle image upload with auto-downscaling. A monotonic token guards the
  // async optimization: two rapid selections can't resolve out of order and
  // clobber the newer pick with a stale result.
  const imageOptimizeSeqRef = useRef(0);
  const handleSetUploadedImage = useCallback(async (image: string | null) => {
    if (!image) {
      imageOptimizeSeqRef.current++;
      setUploadedImage(null);
      return;
    }
    const seq = ++imageOptimizeSeqRef.current;
    const optimized = await optimizeImage(image);
    if (seq !== imageOptimizeSeqRef.current) return;
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
        // duplicate. Everything after it — error banners and truncated
        // partial replies — is dropped so the outgoing history ends with the
        // user's question, not a half-finished assistant fragment.
        const msgs = messagesRef.current;
        const lastUserIdx = msgs.map((m) => m.role).lastIndexOf('user');
        if (lastUserIdx === -1) {
          disarmTimeout();
          isNetworkBusyRef.current = false;
          return;
        }
        userMessage = msgs[lastUserIdx];
        setMessages((prev) => {
          const idx = prev.map((m) => m.id).lastIndexOf(userMessage.id);
          return idx === -1 ? prev : prev.slice(0, idx + 1);
        });
      } else {
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
        'POST /api/chat',
        'normal'
      );

      try {
        // Prepare messages for API: strip system banners and old base64 images
        const historyForApi = buildHistoryForApi(
          messagesRef.current,
          isRetry ? undefined : userMessage
        );

        const requestStart = Date.now();
        let firstTokenAt: number | null = null;

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
        const toolNameById = new Map<string, string>();

        const streamResult = await readChatStream(res.body, {
          onEvent: () => {
            receivedAnyEvent = true;
            armTimeout(); // progress resets the idle deadline
          },
          onMeta: (meta) => {
            if (meta.provider) setActiveProvider(meta.provider);
            if (meta.model) setActiveModel(meta.model);
            if (meta.degraded !== undefined) {
              setIsDegraded(meta.degraded);
              setDegradedReason(meta.degraded ? meta.reason ?? null : null);
            }
            if (meta.notice) {
              addSessionEvent('Provider notice', meta.notice, 'warn');
            }
          },
          onDelta: (text) => {
            if (firstTokenAt === null) firstTokenAt = Date.now();
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
            // The server announces a call as it begins executing it there;
            // the card completes when the tool_result event arrives.
            toolNameById.set(tc.id, tc.name);
            const toolEvent: ToolEvent = {
              id: generateId(),
              toolCall: tc,
              timestamp: Date.now(),
            };
            setToolEvents((prev) => [...prev, toolEvent]);
            addSessionEvent(
              `Tool executing: ${tc.name.replace(/_/g, ' ')}`,
              'EXECUTED SERVER-SIDE',
              'warn'
            );
          },
          onToolResult: (result) => {
            const name = toolNameById.get(result.toolCallId) ?? 'tool';
            setToolEvents((prev) =>
              prev.map((te) =>
                te.toolCall.id === result.toolCallId
                  ? {
                      ...te,
                      toolCall: { ...te.toolCall, status: 'completed' as const },
                      result: result.message,
                      ics: result.ics,
                      simulated: result.simulated,
                    }
                  : te
              )
            );
            addSessionEvent(
              `Tool ${result.ok ? 'completed' : 'rejected'}: ${name.replace(/_/g, ' ')}`,
              result.ok ? 'RESULT SENT BACK TO MODEL' : 'UNKNOWN TOOL NAME',
              result.ok ? 'success' : 'warn'
            );
          },
          onError: (message) => {
            streamErrorMessage = message;
          },
        });
        disarmTimeout();

        if (!receivedAnyEvent) {
          throw new Error('Received an invalid response from the assistant service.');
        }

        // A newer request or reset took over mid-stream
        if (requestGenerationRef.current !== generation) return;

        if (streamErrorMessage && !fullText) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
          throw new Error(streamErrorMessage);
        }

        const finalText = fullText || "I'm not sure how to respond to that. Could you try rephrasing?";
        // A stream that ended without `done` (or hit a provider cutoff) is
        // truncated: keep the partial text, flag it, and never speak it as if
        // it were a complete answer.
        const wasTruncated =
          !streamResult.done ||
          streamResult.finishReason === 'MAX_TOKENS' ||
          streamResult.finishReason === 'SAFETY';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: finalText,
                  isStreaming: false,
                  truncated: wasTruncated || undefined,
                }
              : m
          )
        );

        // Real throughput telemetry, not decoration.
        const ttft = firstTokenAt !== null ? firstTokenAt - requestStart : null;
        addSessionEvent(
          'Reply streamed',
          ttft !== null
            ? `${ttft}MS TO FIRST TOKEN · ${finalText.length} CHARS`
            : `${finalText.length} CHARS`,
          'normal'
        );

        if (wasTruncated) {
          const why = !streamResult.done
            ? 'STREAM ENDED EARLY'
            : `FINISH REASON: ${streamResult.finishReason}`;
          addSessionEvent('Response truncated', why, 'warn');
        }

        if (userMessage.image) {
          setUploadedImage(null);
        }

        isNetworkBusyRef.current = false;

        // Voice playback if autoSpeak is enabled and TTS is supported
        if (autoSpeak && ttsSupported && finalText && !wasTruncated) {
          setStatus('speaking');
          addSessionEvent('Voice response active', 'BROWSER SPEECH SYNTHESIS', 'normal');
          speak(finalText, () => {
            setStatus('idle');
            addSessionEvent('Workspace nominal', 'AWAITING INPUT', 'warn');
          });
        } else {
          setStatus('idle');
          addSessionEvent('Workspace nominal', 'AWAITING INPUT', 'warn');
        }
      } catch (err: unknown) {
        disarmTimeout();

        // Close out a partial streaming shell so a cancelled stream doesn't
        // leave a message stuck in streaming state (drop it if still empty).
        // Surviving partial text is marked truncated: it must render as
        // interrupted and never re-enter the outgoing history.
        if (assistantMessageId) {
          const shellId = assistantMessageId;
          setMessages((prev) =>
            prev
              .map((m) =>
                m.id === shellId && m.content.length > 0
                  ? { ...m, isStreaming: false, truncated: true }
                  : m
              )
              .filter((m) => m.id !== shellId || m.content.length > 0)
          );
        }

        // A newer request or reset superseded this one: it owns the busy flag
        // and status now — exit without clobbering.
        if (requestGenerationRef.current !== generation) return;

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
    [autoSpeak, ttsSupported, speak, stopSpeaking, addSessionEvent, appendSystemError]
  );

  // Retry the last user prompt if failed — reuses the existing turn rather
  // than dispatching (and duplicating) it again.
  const retryLastMessage = useCallback(() => {
    processMessage('', undefined, { isRetry: true });
  }, [processMessage]);

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
      addSessionEvent('Voice response active', 'BROWSER SPEECH SYNTHESIS', 'normal');
      speak(text, () => {
        setStatus('idle');
        addSessionEvent('Workspace nominal', 'AWAITING INPUT', 'warn');
      });
    },
    [speak, stopSpeaking, addSessionEvent]
  );

  // Core of "new conversation": invalidate any in-flight request (the
  // superseded request's catch path must not touch state after this) and
  // clear pipeline-owned state. Speech/localStorage concerns live above.
  const resetConversation = useCallback(() => {
    requestGenerationRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isNetworkBusyRef.current = false;
    setMessages([]);
    setToolEvents([]);
    setStatus('idle');
  }, []);

  const dismissToolEvent = useCallback((id: string) => {
    setToolEvents((prev) => prev.filter((te) => te.id !== id));
  }, []);

  return {
    status,
    setStatus,
    statusRef,
    messages,
    setMessages,
    toolEvents,
    dismissToolEvent,
    uploadedImage,
    setUploadedImage: handleSetUploadedImage,
    activeProvider,
    activeModel,
    isDegraded,
    degradedReason,
    processMessage,
    sendTextMessage,
    retryLastMessage,
    speakMessage,
    resetConversation,
    isBusy: () => isNetworkBusyRef.current,
  };
}
