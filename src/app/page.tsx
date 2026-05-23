'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useAssistant } from '@/hooks/useAssistant';
import MicButton from '@/components/MicButton';
import ChatLog from '@/components/ChatLog';
import ImageDropzone from '@/components/ImageDropzone';
import ToolPanel from '@/components/ToolPanel';
import StatusBadge from '@/components/StatusBadge';
import PermissionWarning from '@/components/PermissionWarning';

export default function Home() {
  const {
    status,
    messages,
    toolEvents,
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
  const [showToolPanel, setShowToolPanel] = useState(true);

  const handleSend = useCallback(() => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setTextInput('');
    }
  }, [textInput, sendTextMessage]);

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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 glass-strong border-b border-surface-border z-20">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan/80 to-neon-purple/80 flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <h1 className="text-base font-semibold tracking-tight">
              Voxelle
            </h1>
          </motion.div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <StatusBadge status={status} />

          {/* Tool panel toggle (mobile) */}
          <button
            onClick={() => setShowToolPanel((v) => !v)}
            className={`p-2 rounded-lg transition-colors cursor-pointer lg:hidden ${
              showToolPanel ? 'bg-neon-purple/15 text-neon-purple' : 'text-muted hover:text-foreground hover:bg-white/5'
            }`}
            aria-label="Toggle tool panel"
            title="Toggle tool panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </button>

          {/* Clear history */}
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Clear chat history"
            title="Clear history"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── Permission Warning ─── */}
      {hasWarning && (
        <PermissionWarning
          error={sttError}
          sttSupported={sttSupported}
          ttsSupported={ttsSupported}
          onDismiss={() => setShowWarning(false)}
        />
      )}

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Log */}
          <ChatLog
            messages={messages}
            isProcessing={status === 'processing'}
          />

          {/* Bottom Controls */}
          <div className="flex-shrink-0 pb-4 pt-2 px-2 space-y-3 border-t border-surface-border/50 glass-strong">
            {/* Image Dropzone (collapsible) */}
            <div className="flex items-center justify-between px-4 pt-1">
              <button
                onClick={() => setShowDropzone((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-muted hover:text-muted-light transition-colors cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                {showDropzone ? 'Hide image upload' : 'Attach image'}
                {uploadedImage && (
                  <span className="inline-block w-2 h-2 rounded-full bg-neon-cyan" />
                )}
              </button>

              {status === 'speaking' && (
                <button
                  onClick={stopSpeaking}
                  className="flex items-center gap-1 text-xs text-neon-purple hover:text-neon-purple/80 transition-colors cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop speaking
                </button>
              )}
            </div>

            {showDropzone && (
              <ImageDropzone
                uploadedImage={uploadedImage}
                onImageUpload={setUploadedImage}
                onImageRemove={() => setUploadedImage(null)}
              />
            )}

            {/* Mic + Text Input Row */}
            <div className="flex items-center gap-3 px-2 sm:px-4">
              <div className="flex-1">
                <div className="glass rounded-xl flex items-center px-4 py-2 gap-2 focus-within:ring-1 focus-within:ring-neon-cyan/30 transition-all">
                  <input
                    id="text-input"
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      status === 'processing'
                        ? 'Thinking...'
                        : 'Type a message...'
                    }
                    disabled={status === 'processing'}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!textInput.trim() || status === 'processing'}
                    className="p-1.5 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Send message"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="22" x2="11" y1="2" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </div>

              <MicButton
                status={status}
                onToggle={toggleListening}
                disabled={!sttSupported}
              />
            </div>
          </div>
        </div>

        {/* Right: Tool Panel */}
        <motion.aside
          className={`border-l border-surface-border glass-strong overflow-hidden
            ${showToolPanel ? 'block' : 'hidden'}
            w-full lg:w-72 xl:w-80
            fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto lg:left-auto lg:right-auto
            h-[40vh] lg:h-auto
            z-30 lg:z-auto
          `}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/50">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-light">
              Tools
            </h2>
            <span className="text-[10px] font-mono text-muted">
              {toolEvents.length > 0
                ? `${toolEvents.length} active`
                : 'Idle'}
            </span>
          </div>
          <ToolPanel toolEvents={toolEvents} onDismiss={dismissToolEvent} />
        </motion.aside>
      </div>

      {/* Mobile tool panel overlay backdrop */}
      {showToolPanel && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setShowToolPanel(false)}
        />
      )}
    </div>
  );
}
