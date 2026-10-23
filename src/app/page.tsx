'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu, Trash2, Activity } from 'lucide-react';
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
    recentSignals,
    uploadedImage,
    setUploadedImage,
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
    voices,
    ttsSettings,
    updateTtsSettings,
  } = useAssistant();

  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [activeNav, setActiveNav] = useState<'command' | 'automations' | 'tools'>('command');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);

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

  return (
    <div className="min-h-screen relative overflow-hidden cyber-bg">
      {/* Background Cyber Grid */}
      <div className="cyber-grid" />

      {/* 3-Column Cyber Shell */}
      <div className="cyber-shell min-h-screen">
        {/* ─── Left Sidebar (262px) ─── */}
        <Sidebar
          recentSignals={recentSignals}
          onSelectSignal={sendTextMessage}
          onNewConversation={clearHistory}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
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
          {/* Header (82px) */}
          <header className="h-[82px] px-6 sm:px-8 flex items-center justify-between border-b border-line flex-shrink-0 z-20 bg-[rgba(8,11,20,0.65)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 cursor-pointer"
                aria-label="Open workspace menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="font-mono text-[11px] tracking-[0.4px] text-dim">
                WORKSPACE / <b className="font-medium text-soft">COMMAND CENTER</b>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge
                status={status}
                provider={activeProvider}
                isDegraded={isDegraded}
              />

              {/* Clear conversation action */}
              <button
                onClick={clearHistory}
                className="hidden sm:flex items-center gap-1.5 p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors text-xs font-mono cursor-pointer"
                title="Reset session history"
                aria-label="Reset session history"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Mobile Activity Rail Toggle */}
              <button
                onClick={() => setIsMobileRailOpen(true)}
                className="lg:hidden p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 font-mono text-[10px] flex items-center gap-1.5 cursor-pointer border border-line"
                aria-label="Open activity rail"
              >
                <Activity className="w-3.5 h-3.5 text-lime" />
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
            onSelectSuggestion={sendTextMessage}
            onStartVoice={toggleListening}
            onRetry={retryLastMessage}
            onSpeakText={handleSpeakText}
          />

          {/* Isolated Memoized Composer Container */}
          <Composer
            status={status}
            sttSupported={sttSupported}
            uploadedImage={uploadedImage}
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
