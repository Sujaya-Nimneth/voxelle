'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
  // persistence is suppressed so the outgoing thread's messages can't be
  // written over the incoming one.
  const loadingThreadRef = useRef(false);
  const initialLoadRef = useRef(false);

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

  const { sessionEvents, addSessionEvent } = useSessionEvents();
  const conversations = useConversations();

  const pipeline = useChatPipeline({
    addSessionEvent,
    speak,
    stopSpeaking,
    autoSpeak,
    ttsSupported,
  });

  // One-time load of the active thread once conversations hydrate.
  useEffect(() => {
    if (initialLoadRef.current || !conversations.activeId) return;
    initialLoadRef.current = true;
    loadingThreadRef.current = true;
    const stored = conversations.readActive();
    if (stored.length > 0) {
      pipeline.setMessages(stored);
    }
    setHydrated(true);
    // Re-enable persistence after the load's render effects have settled.
    setTimeout(() => {
      loadingThreadRef.current = false;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time load
  }, [conversations.activeId]);

  // Persist the active thread whenever its messages change. persistActive
  // keeps a stable identity (it delegates through a ref), so this effect
  // runs on message changes — not every render.
  const persistActive = conversations.persistActive;
  useEffect(() => {
    if (hydrated && !loadingThreadRef.current) {
      persistActive(pipeline.messages);
    }
  }, [pipeline.messages, hydrated, persistActive]);

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
      if (id === conversations.activeId) return;
      loadingThreadRef.current = true;
      stopSpeaking();
      pipeline.resetConversation();
      pipeline.setMessages(conversations.readActive(id));
      conversations.switchTo(id);
      setTimeout(() => {
        loadingThreadRef.current = false;
      }, 0);
    },
    [conversations, pipeline, stopSpeaking]
  );

  const handleNewConversation = useCallback(() => {
    loadingThreadRef.current = true;
    stopSpeaking();
    pipeline.resetConversation();
    conversations.createNew();
    setTimeout(() => {
      loadingThreadRef.current = false;
    }, 0);
  }, [conversations, pipeline, stopSpeaking]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const wasActive = id === conversations.activeId;
      const remaining = conversations.conversations.filter((c) => c.id !== id);
      conversations.remove(id);
      if (wasActive) {
        if (remaining.length > 0) {
          handleSwitchConversation(remaining[0].id);
        } else {
          handleNewConversation();
        }
      }
    },
    [conversations, handleSwitchConversation, handleNewConversation]
  );

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

  return {
    status: pipeline.status,
    messages: pipeline.messages,
    toolEvents: pipeline.toolEvents,
    sessionEvents,
    // Threads
    conversations: conversations.conversations,
    activeConversationId: conversations.activeId,
    switchConversation: handleSwitchConversation,
    newConversation: handleNewConversation,
    deleteConversation: handleDeleteConversation,
    uploadedImage: pipeline.uploadedImage,
    setUploadedImage: pipeline.setUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage: pipeline.sendTextMessage,
    retryLastMessage: pipeline.retryLastMessage,
    dismissToolEvent: pipeline.dismissToolEvent,
    stopSpeaking,
    speakMessage: pipeline.speakMessage,
    interimTranscript,
    autoSpeak,
    toggleAutoSpeak,
    activeProvider: pipeline.activeProvider,
    activeModel: pipeline.activeModel,
    isDegraded: pipeline.isDegraded,
    degradedReason: pipeline.degradedReason,
    voices,
    ttsSettings,
    updateTtsSettings,
  };
}
