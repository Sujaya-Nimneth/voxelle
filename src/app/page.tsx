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
import BrandMark, { SignalStrip } from '@/components/design/BrandMark';
import ThemeToggle from '@/components/design/ThemeToggle';

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
  const [showDropzone, setShowDropzone] = useState(false);

  const hasNewError = sttError !== null && sttError !== dismissedError;
  const hasWarning =
    (!warningDismissed || hasNewError) &&
    (!!sttError || !sttSupported || !ttsSupported);

  const handleDismissWarning = useCallback(() => {
    setWarningDismissed(true);
    setDismissedError(sttError);
  }, [sttError]);

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
    <div className="min-h-screen relative bg-ground">
      <a
        href="#composer-input"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-[var(--radius-control)] focus:bg-surface focus:border focus:border-line focus:text-sm focus:text-text"
      >
        Skip to message input
      </a>

      <div role="status" aria-live="polite" className="sr-only">
        {lastReply}
      </div>

      <div className="app-shell">
        {/* Left — labelled conversation sidebar */}
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

        {/* Center — the conversation, the screen's one question */}
        <main className="app-main" id="main-content">
          <header className="h-[56px] px-5 sm:px-8 flex items-center justify-between border-b border-line flex-shrink-0 bg-ground">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised cursor-pointer"
                aria-label="Open workspace menu"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              <BrandMark size={22} className="lg:hidden" />
              <p className="text-[13px] text-faint hidden sm:block truncate">
                Workspace / <span className="text-text">Command center</span>
              </p>
              <span className="text-[13px] text-text sm:hidden truncate">Command center</span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge
                status={status}
                provider={activeProvider}
                model={activeModel}
                isDegraded={isDegraded}
                degradedReason={degradedReason}
              />
              <span className="hidden md:inline-flex">
                <SignalStrip status={status} compact />
              </span>
              <ThemeToggle />
              <button
                onClick={() => setIsMobileRailOpen(true)}
                className="lg:hidden p-2 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised cursor-pointer border border-line"
                aria-label="Open session activity"
              >
                <Activity className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </header>

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

        {/* Right — demoted secondary stream */}
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
