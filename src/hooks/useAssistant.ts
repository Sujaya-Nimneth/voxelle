'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '@/types/types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import { useSessionEvents } from './useSessionEvents';
import { useChatPipeline } from './useChatPipeline';
import { useConversations } from './useConversations';

const AUTOSPEAK_KEY = 'voxelle_auto_speak';

/**
 * Composes the assistant: browser speech hooks, session telemetry,
 * multi-conversation storage, and the chat pipeline. Page components consume
 * only this hook's stable API.
 */
export function useAssistant() {
  const [hydrated, setHydrated] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // While a thread switch is loading stored messages into the pipeline,
  // persistence is suppressed for that exact loaded snapshot so an outgoing
  // thread's messages cannot overwrite the incoming thread.
  const suppressPersistSnapshotRef = useRef<Message[] | null>(null);
  const initialLoadRef = useRef(false);

  // Hook integrations
  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    clearTranscript,
    clearError: clearSttError,
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

  const { sessionEvents, addSessionEvent } = useSessionEvents();
  const {
    conversations: conversationList,
    activeId: activeConversationId,
    readActive,
    persistActive,
    switchTo,
    createNew,
    remove,
  } = useConversations();

  const {
    status,
    setStatus,
    statusRef,
    messages,
    setMessages,
    toolEvents,
    dismissToolEvent,
    uploadedImage,
    setUploadedImage,
    activeProvider,
    activeModel,
    isDegraded,
    degradedReason,
    processMessage,
    sendTextMessage,
    stopGenerating,
    retryLastMessage,
    speakMessage,
    resetConversation,
    isBusy,
  } = useChatPipeline({
    addSessionEvent,
    speak,
    stopSpeaking,
    autoSpeak,
    ttsSupported,
  });

  // One-time load of the active thread once conversations hydrate.
  useEffect(() => {
    if (initialLoadRef.current || !activeConversationId) return;
    initialLoadRef.current = true;
    const stored = readActive();
    if (stored.length > 0) {
      suppressPersistSnapshotRef.current = stored;
      setMessages(stored);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load
  }, [activeConversationId]);

  // Persist the active thread whenever its messages settle. persistActive
  // keeps a stable identity, so this effect runs on message changes only.
  useEffect(() => {
    if (!hydrated) return;
    if (suppressPersistSnapshotRef.current === messages) {
      suppressPersistSnapshotRef.current = null;
      return;
    }
    suppressPersistSnapshotRef.current = null;
    persistActive(messages);
  }, [messages, hydrated, persistActive]);

  // Hydrate the auto-speak preference.
  useEffect(() => {
    try {
      const storedAutoSpeak = localStorage.getItem(AUTOSPEAK_KEY);
      if (storedAutoSpeak !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from external storage
        setAutoSpeak(storedAutoSpeak === 'true');
      }
    } catch {
      // Ignore
    }
  }, []);

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

  const handleSwitchConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId) return;
      stopSpeaking();
      resetConversation();
      const stored = readActive(id);
      suppressPersistSnapshotRef.current = stored;
      setMessages(stored);
      switchTo(id);
    },
    [activeConversationId, readActive, resetConversation, setMessages, stopSpeaking, switchTo]
  );

  const handleNewConversation = useCallback((): string => {
    stopSpeaking();
    const empty: Message[] = [];
    suppressPersistSnapshotRef.current = empty;
    resetConversation();
    setMessages(empty);
    return createNew();
  }, [createNew, resetConversation, setMessages, stopSpeaking]);

  const handleDeleteConversation = useCallback(
    (id: string): string | null => {
      const wasActive = id === activeConversationId;
      const remaining = conversationList.filter((c) => c.id !== id);
      remove(id);
      if (wasActive) {
        if (remaining.length > 0) {
          handleSwitchConversation(remaining[0].id);
          return remaining[0].id;
        }
        return handleNewConversation();
      }
      return null;
    },
    [activeConversationId, conversationList, handleNewConversation, handleSwitchConversation, remove]
  );

  // Watch speech recognition transcript
  useEffect(() => {
    if (!transcript) return;
    if (isBusy()) {
      // A request is already in flight — drop the utterance rather than
      // letting it linger and auto-dispatch unreviewed once the busy
      // period ends.
      clearTranscript();
      return;
    }
    const textToProcess = transcript;
    clearTranscript();
    processMessage(textToProcess, uploadedImage);
  }, [transcript, isBusy, clearTranscript, processMessage, uploadedImage]);

  // Sync listening status
  useEffect(() => {
    if (isListening && statusRef.current === 'idle') {
      setStatus('listening');
      addSessionEvent('Microphone open', 'Browser speech recognition', 'normal');
    } else if (!isListening && statusRef.current === 'listening') {
      setStatus('idle');
    }
  }, [isListening, statusRef, setStatus, addSessionEvent]);

  // Sync speaking status
  useEffect(() => {
    if (isSpeaking && statusRef.current !== 'speaking') {
      setStatus('speaking');
    }
  }, [isSpeaking, statusRef, setStatus]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      addSessionEvent('Listening paused', 'Mic closed', 'normal');
    } else {
      // If Voxelle is speaking or idle, start listening immediately (interrupting speech)
      stopSpeaking();
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking, addSessionEvent]);

  return {
    status,
    messages,
    toolEvents,
    sessionEvents,
    // Threads
    conversations: conversationList,
    activeConversationId,
    switchConversation: handleSwitchConversation,
    newConversation: handleNewConversation,
    deleteConversation: handleDeleteConversation,
    uploadedImage,
    setUploadedImage,
    sttError,
    clearSttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage,
    stopGenerating,
    retryLastMessage,
    dismissToolEvent,
    stopSpeaking,
    speakMessage,
    interimTranscript,
    autoSpeak,
    toggleAutoSpeak,
    activeProvider,
    activeModel,
    isDegraded,
    degradedReason,
    voices,
    ttsSettings,
    updateTtsSettings,
  };
}
