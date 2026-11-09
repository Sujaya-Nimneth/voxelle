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

  // "/" focuses the composer when not already typing and no dialog is open.
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [textInput, uploadedImage, onSendMessage, onSetShowDropzone]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const placeholder =
    status === 'processing'
      ? 'Thinking and running tools…'
      : status === 'listening'
      ? 'Listening to your voice…'
      : 'Message Voxelle…';

  return (
    <div className="flex-shrink-0 px-4 sm:px-8 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <AnimatePresence>
        {showDropzone && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
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

      {/* The one floating surface: flat fill, 1px control outline. */}
      <div className="max-w-[760px] mx-auto panel p-2 flex items-end gap-2 float-shadow focus-within:border-accent transition-colors">
        <label htmlFor="composer-input" className="sr-only">Message Voxelle</label>

        <button
          type="button"
          onClick={() => onSetShowDropzone(!showDropzone)}
          className={`w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
            uploadedImage || showDropzone
              ? 'bg-raised text-accent'
              : 'text-muted hover:text-text hover:bg-raised'
          }`}
          title="Attach an image (PNG, JPEG, WebP)"
          aria-label="Attach image"
          aria-pressed={showDropzone}
        >
          <ImagePlus className="w-4 h-4" aria-hidden="true" />
        </button>

        <textarea
          ref={inputRef}
          id="composer-input"
          name="message"
          rows={1}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-describedby="composer-hint"
          className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none text-[16px] leading-relaxed text-text placeholder:text-faint px-1 py-2.5 font-sans max-h-[160px]"
        />
        <span id="composer-hint" className="sr-only">
          Press Enter to send, Shift plus Enter for a new line, or press slash to focus.
        </span>

        {status === 'speaking' && (
          <button
            type="button"
            onClick={onStopSpeaking}
            className="h-11 px-2.5 rounded-[var(--radius-control)] text-[12px] text-muted bg-raised hover:text-text border border-line transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            title="Silence speech audio"
            aria-label="Mute assistant speech"
          >
            <Square className="w-3 h-3 fill-current" aria-hidden="true" />
            <span className="hidden sm:inline">Mute</span>
          </button>
        )}

        <button
          id="mic-button"
          type="button"
          onClick={onToggleListening}
          disabled={!sttSupported}
          className={`w-11 h-11 rounded-[var(--radius-control)] border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${
            status === 'listening'
              ? 'border-accent bg-raised text-accent'
              : 'border-line text-muted hover:text-text hover:bg-raised'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
          title={status === 'listening' ? 'Stop listening' : 'Start voice input'}
          aria-label={status === 'listening' ? 'Stop voice recording' : 'Start voice recording'}
        >
          {status === 'listening' ? (
            <motion.span
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, repeat: Infinity }}
              className="flex items-center justify-center"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
            </motion.span>
          ) : (
            <Mic className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!textInput.trim() && !uploadedImage}
          className="w-11 h-11 rounded-[var(--radius-control)] bg-primary text-primary-ink flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.97] cursor-pointer flex-shrink-0"
          title="Send message"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export const Composer = memo(ComposerComponent);
