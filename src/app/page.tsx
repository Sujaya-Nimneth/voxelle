'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu, Activity } from 'lucide-react';
import { useAssistant } from '@/hooks/useAssistant';
import Sidebar from '@/components/Sidebar';
import ActivityRail from '@/components/ActivityRail';
import ChatLog from '@/components/ChatLog';
import StatusBadge from '@/components/StatusBadge';
import PermissionWarning from '@/components/PermissionWarning';
import { Composer } from '@/components/Composer';

export default function Home() {
  const {
    status,
    messages,
    toolEvents,
    sessionEvents,
    conversations,
    activeConversationId,
    switchConversation,
    deleteConversation,
    newConversation,
    uploadedImage,
    setUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage,
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
  } = useAssistant();

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);
  // Composer's image dropzone lives here so the empty-state "vision" card can
  // open it too.
  const [showDropzone, setShowDropzone] = useState(false);

  // Derive warning visibility cleanly without useEffect setState
  const hasNewError = sttError !== null && sttError !== dismissedError;
  const hasWarning =
    (!warningDismissed || hasNewError) &&
    (!!sttError || !sttSupported || !ttsSupported);

  const handleDismissWarning = useCallback(() => {
    setWarningDismissed(true);
    setDismissedError(sttError);
  }, [sttError]);

  // Stable handler identities so memoized Sidebar/ChatLog/ActivityRail don't
  // re-render on every parent render.
  const handleCloseSidebarMobile = useCallback(() => setIsMobileSidebarOpen(false), []);
  const handleCloseRailMobile = useCallback(() => setIsMobileRailOpen(false), []);
  const handleSpeakText = useCallback((text: string) => speakMessage(text), [speakMessage]);

  // The latest finalized assistant reply, announced politely to screen
  // readers once it exists (streaming text is intentionally not announced
  // per-token).
  const lastReply = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' && !m.isStreaming && m.content) return m.content;
    }
    return '';
  }, [messages]);

  return (
    <div className="min-h-screen relative overflow-hidden cyber-bg">
      {/* Background grid */}
      <div className="cyber-grid" />

      {/* Keyboard users can jump straight to the composer */}
      <a
        href="#composer-input"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-surface-2 focus:border focus:border-cyan-500/40 focus:text-sm focus:text-white"
      >
        Skip to message input
      </a>

      {/* Screen-reader announcement of completed replies */}
      <div role="status" aria-live="polite" className="sr-only">
        {lastReply}
      </div>

      {/* 3-Column Shell */}
      <div className="cyber-shell min-h-screen">
        {/* ─── Left Sidebar (264px) ─── */}
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSwitchConversation={switchConversation}
          onDeleteConversation={deleteConversation}
          onNewConversation={newConversation}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={handleCloseSidebarMobile}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={toggleAutoSpeak}
          voices={voices}
          ttsSettings={ttsSettings}
          onUpdateTtsSettings={updateTtsSettings}
        />

        {/* ─── Center Command Center ─── */}
        <main className="flex flex-col min-w-0 h-[100dvh] overflow-hidden">
          {/* Header */}
          <header className="h-[60px] px-5 sm:px-8 flex items-center justify-between border-b border-line flex-shrink-0 z-20 bg-[rgba(8,11,20,0.6)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 cursor-pointer"
                aria-label="Open workspace menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="label">
                Workspace / <span className="text-soft">Command Center</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge
                status={status}
                provider={activeProvider}
                model={activeModel}
                isDegraded={isDegraded}
                degradedReason={degradedReason}
              />

              {/* Mobile Activity Rail Toggle */}
              <button
                onClick={() => setIsMobileRailOpen(true)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 font-mono text-[10px] flex items-center gap-1.5 cursor-pointer border border-line"
                aria-label="Open activity rail"
              >
                <Activity className="w-3.5 h-3.5 text-green" />
                <span>LOG</span>
              </button>
            </div>
          </header>

          {/* Permission / Capability Warning */}
          <AnimatePresence>
            {hasWarning && (
              <PermissionWarning
                error={sttError}
                sttSupported={sttSupported}
                ttsSupported={ttsSupported}
                onDismiss={handleDismissWarning}
              />
            )}
          </AnimatePresence>

          {/* Conversation Log View */}
          <ChatLog
            messages={messages}
            isProcessing={status === 'processing' && !messages.some((m) => m.isStreaming)}
            isListening={isListening}
            interimTranscript={interimTranscript}
            provider={activeProvider}
            isDegraded={isDegraded}
            onSelectSuggestion={sendTextMessage}
            onStartVoice={toggleListening}
            onAttachImage={() => setShowDropzone(true)}
            onRetry={retryLastMessage}
            onSpeakText={handleSpeakText}
          />

          {/* Isolated Memoized Composer Container */}
          <Composer
            status={status}
            sttSupported={sttSupported}
            uploadedImage={uploadedImage}
            showDropzone={showDropzone}
            onSetShowDropzone={setShowDropzone}
            onSetUploadedImage={setUploadedImage}
            onSendMessage={sendTextMessage}
            onToggleListening={toggleListening}
            onStopSpeaking={stopSpeaking}
          />
        </main>

        {/* ─── Right Activity Rail (316px) ─── */}
        <ActivityRail
          status={status}
          sessionEvents={sessionEvents}
          toolEvents={toolEvents}
          onDismissToolEvent={dismissToolEvent}
          isOpenMobile={isMobileRailOpen}
          onCloseMobile={handleCloseRailMobile}
        />
      </div>
    </div>
  );
}
