'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAssistant } from '@/hooks/useAssistant';
import Sidebar from '@/components/Sidebar';
import ActivityRail from '@/components/ActivityRail';
import ChatLog from '@/components/ChatLog';
import ImageDropzone from '@/components/ImageDropzone';
import StatusBadge from '@/components/StatusBadge';
import PermissionWarning from '@/components/PermissionWarning';

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
    toggleListening,
    sendTextMessage,
    clearHistory,
    dismissToolEvent,
    stopSpeaking,
  } = useAssistant();

  const [textInput, setTextInput] = useState('');
  const [showWarning, setShowWarning] = useState(true);
  const [showDropzone, setShowDropzone] = useState(false);
  const [activeNav, setActiveNav] = useState<'command' | 'automations' | 'tools'>('command');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileRailOpen, setIsMobileRailOpen] = useState(false);

  const handleSend = useCallback(() => {
    if (textInput.trim() || uploadedImage) {
      sendTextMessage(textInput);
      setTextInput('');
      setShowDropzone(false);
    }
  }, [textInput, uploadedImage, sendTextMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const hasWarning =
    showWarning && (!!sttError || !sttSupported || !ttsSupported);

  return (
    <div className="min-h-screen relative overflow-hidden cyber-bg selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Background Cyber Grid */}
      <div className="cyber-grid" />

      {/* 3-Column Cyber Shell */}
      <div className="cyber-shell min-h-screen">
        {/* ─── Left Sidebar (262px) ─── */}
        <Sidebar
          recentSignals={recentSignals}
          onSelectSignal={(signal) => {
            sendTextMessage(signal);
          }}
          onNewConversation={clearHistory}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* ─── Center Command Center ─── */}
        <main className="flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Header (82px) */}
          <header className="h-[82px] px-6 sm:px-8 flex items-center justify-between border-b border-[var(--line)] flex-shrink-0 z-20 bg-[rgba(8,11,20,0.6)] backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Toggle */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:text-white hover:bg-white/5 cursor-pointer"
                aria-label="Open workspace menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="font-mono text-[11px] tracking-[0.4px] text-[#75849e]">
                WORKSPACE / <b className="font-medium text-[#c9daf1]">COMMAND CENTER</b>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge status={status} />

              {/* Clear conversation action */}
              <button
                onClick={clearHistory}
                className="hidden sm:flex items-center gap-1.5 p-2 rounded-lg text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors text-xs font-mono cursor-pointer"
                title="Reset session"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>

              {/* Mobile Activity Rail Toggle */}
              <button
                onClick={() => setIsMobileRailOpen(true)}
                className="lg:hidden p-2 rounded-lg text-[var(--muted)] hover:text-white hover:bg-white/5 font-mono text-[10px] flex items-center gap-1.5 cursor-pointer border border-[var(--line)]"
                aria-label="Open activity rail"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] glow-lime" />
                <span>LOG</span>
              </button>
            </div>
          </header>

          {/* Permission / Capability Warning */}
          {hasWarning && (
            <PermissionWarning
              error={sttError}
              sttSupported={sttSupported}
              ttsSupported={ttsSupported}
              onDismiss={() => setShowWarning(false)}
            />
          )}

          {/* Conversation Log View */}
          <ChatLog
            messages={messages}
            isProcessing={status === 'processing'}
            onSelectSuggestion={(text) => {
              sendTextMessage(text);
            }}
            onStartVoice={toggleListening}
          />

          {/* Floating Composer Container */}
          <div className="flex-shrink-0 px-4 sm:px-8 pb-7 pt-2">
            {/* Optional Image Dropzone */}
            <AnimatePresence>
              {showDropzone && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="mb-2.5 max-w-[760px] mx-auto"
                >
                  <ImageDropzone
                    uploadedImage={uploadedImage}
                    onImageUpload={setUploadedImage}
                    onImageRemove={() => setUploadedImage(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cyber Composer Bar */}
            <div className="max-w-[760px] mx-auto border border-[rgba(133,156,191,0.2)] bg-[rgba(14,20,34,0.85)] backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.36)] rounded-[16px] p-[9px] flex items-center gap-[9px]">
              {/* Attach Image Button */}
              <button
                onClick={() => setShowDropzone((v) => !v)}
                className={`w-[39px] h-[39px] rounded-[10px] flex items-center justify-center transition-all cursor-pointer text-[17px] flex-shrink-0 ${
                  uploadedImage
                    ? 'bg-cyan-500/20 text-[var(--cyan)] border border-cyan-500/40 shadow-[0_0_12px_rgba(53,230,255,0.2)]'
                    : showDropzone
                    ? 'bg-white/10 text-white'
                    : 'text-[#8190a8] hover:text-white hover:bg-white/[0.04]'
                }`}
                title="Attach image for multimodal analysis"
                aria-label="Attach visual signal"
              >
                ＋
              </button>

              {/* Text Input */}
              <input
                id="text-input"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  status === 'processing'
                    ? 'Processing signal...'
                    : status === 'listening'
                    ? 'Listening to your voice...'
                    : 'Message Voxelle…'
                }
                disabled={status === 'processing'}
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#edf5ff] placeholder:text-[#687992] px-2 font-sans"
              />

              {/* Stop Speaking Button if TTS active */}
              {status === 'speaking' && (
                <button
                  onClick={stopSpeaking}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-[var(--violet)] bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                >
                  <span>■</span>
                  <span className="hidden sm:inline">Mute</span>
                </button>
              )}

              {/* Mic Button: Cyber Dark ring with pulse */}
              <button
                id="mic-button"
                onClick={toggleListening}
                disabled={!sttSupported || status === 'processing'}
                className={`w-[40px] h-[40px] rounded-full border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 relative ${
                  status === 'listening'
                    ? 'border-[var(--cyan)] bg-[rgba(53,230,255,0.25)] text-white shadow-[0_0_22px_var(--cyan)]'
                    : status === 'speaking'
                    ? 'border-[var(--violet)] bg-[rgba(146,108,255,0.2)] text-[var(--violet)] shadow-[0_0_18px_rgba(146,108,255,0.3)]'
                    : 'border-[rgba(53,230,255,0.6)] bg-[rgba(39,176,208,0.12)] text-[var(--cyan)] shadow-[0_0_17px_rgba(53,230,255,0.12)] hover:bg-[rgba(39,176,208,0.24)]'
                }`}
                title={status === 'listening' ? 'Stop listening' : 'Start voice input'}
                aria-label="Voice input"
              >
                {status === 'listening' ? (
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-[15px]"
                  >
                    ●
                  </motion.span>
                ) : (
                  <span className="text-[17px] font-medium leading-none">♩</span>
                )}
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={(!textInput.trim() && !uploadedImage) || status === 'processing'}
                className="w-[40px] h-[40px] rounded-[10px] bg-gradient-to-br from-[var(--cyan)] to-[#6e85ff] text-[#06111d] font-extrabold text-[16px] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-shrink-0 shadow-[0_0_15px_rgba(53,230,255,0.25)]"
                aria-label="Send message"
              >
                ↗
              </button>
            </div>
          </div>
        </main>

        {/* ─── Right Activity Rail (316px) ─── */}
        <ActivityRail
          status={status}
          sessionEvents={sessionEvents}
          toolEvents={toolEvents}
          onDismissToolEvent={dismissToolEvent}
          isOpenMobile={isMobileRailOpen}
          onCloseMobile={() => setIsMobileRailOpen(false)}
        />
      </div>
    </div>
  );
}
