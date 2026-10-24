'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ImagePlus, Mic, Send, Square } from 'lucide-react';
import ImageDropzone from './ImageDropzone';
import type { AssistantStatus } from '@/types/types';

interface ComposerProps {
  status: AssistantStatus;
  sttSupported: boolean;
  uploadedImage: string | null;
  /** Dropzone visibility is owned by the page (the empty state can open it). */
  showDropzone: boolean;
  onSetShowDropzone: (show: boolean) => void;
  onSetUploadedImage: (image: string | null) => void;
  onSendMessage: (text: string) => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
}

const MAX_TEXTAREA_HEIGHT = 160;

function ComposerComponent({
  status,
  sttSupported,
  uploadedImage,
  showDropzone,
  onSetShowDropzone,
  onSetUploadedImage,
  onSendMessage,
  onToggleListening,
  onStopSpeaking,
}: ComposerProps) {
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Auto-grow the textarea with content, capped so long drafts scroll
  // instead of pushing the chat log off-screen.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [textInput]);

  // Shortcut key: "/" focuses composer when not already typing and no
  // dialog/drawer is open
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSend = useCallback(() => {
    if (textInput.trim() || uploadedImage) {
      onSendMessage(textInput);
      setTextInput('');
      onSetShowDropzone(false);
      // Keep input focused
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [textInput, uploadedImage, onSendMessage, onSetShowDropzone]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter sends; Shift+Enter inserts a newline (multiline drafts).
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex-shrink-0 px-4 sm:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
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
              onImageUpload={onSetUploadedImage}
              onImageRemove={() => onSetUploadedImage(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer Bar */}
      <div className="max-w-[760px] mx-auto border border-line bg-[rgba(14,20,34,0.92)] backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.4)] rounded-[14px] p-2 flex items-end gap-2 transition-colors focus-within:border-cyan-500/35">
        {/* Attach Image Button */}
        <button
          type="button"
          onClick={() => onSetShowDropzone(!showDropzone)}
          className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
            uploadedImage
              ? 'bg-cyan-500/15 text-cyan border border-cyan-500/35'
              : showDropzone
              ? 'bg-white/10 text-white'
              : 'text-dim hover:text-white hover:bg-white/[0.04]'
          }`}
          title="Attach an image (PNG, JPEG, WebP)"
          aria-label="Attach image"
        >
          <ImagePlus className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <textarea
          ref={inputRef}
          id="composer-input"
          rows={1}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            status === 'processing'
              ? 'Thinking and executing tools…'
              : status === 'listening'
              ? 'Listening to your voice… (say something)'
              : 'Message Voxelle — press / to focus, Shift+Enter for a new line'
          }
          className="flex-1 bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-text placeholder:text-dim px-1 py-2 font-sans max-h-[160px]"
          aria-label="Message Voxelle"
        />

        {/* Stop Speaking Button if TTS active */}
        {status === 'speaking' && (
          <button
            type="button"
            onClick={onStopSpeaking}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-violet-soft bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            title="Silence speech audio"
            aria-label="Mute assistant speech"
          >
            <Square className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Mute</span>
          </button>
        )}

        {/* Mic Button */}
        <button
          id="mic-button"
          type="button"
          onClick={onToggleListening}
          disabled={!sttSupported}
          className={`w-[38px] h-[38px] rounded-full border transition-colors flex items-center justify-center cursor-pointer flex-shrink-0 relative ${
            status === 'listening'
              ? 'border-cyan bg-cyan-500/20 text-white shadow-[0_0_18px_var(--cyan)]'
              : status === 'speaking'
              ? 'border-violet bg-violet-500/15 text-violet'
              : 'border-cyan-500/40 bg-cyan-500/[0.08] text-cyan hover:bg-cyan-500/[0.15]'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          title={status === 'listening' ? 'Stop listening' : 'Start voice input'}
          aria-label={status === 'listening' ? 'Stop voice recording' : 'Start voice recording'}
        >
          {status === 'listening' ? (
            <motion.span
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.2, 1] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, repeat: Infinity }}
              className="flex items-center justify-center"
            >
              <Mic className="w-4 h-4 text-white" />
            </motion.span>
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!textInput.trim() && !uploadedImage}
          className="w-[38px] h-[38px] rounded-[10px] bg-cyan text-[#04121a] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.97] cursor-pointer flex-shrink-0"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export const Composer = memo(ComposerComponent);
