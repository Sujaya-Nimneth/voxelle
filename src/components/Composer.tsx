'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePlus, Mic, Send, Square } from 'lucide-react';
import ImageDropzone from './ImageDropzone';
import type { AssistantStatus } from '@/types/types';

interface ComposerProps {
  status: AssistantStatus;
  sttSupported: boolean;
  uploadedImage: string | null;
  onSetUploadedImage: (image: string | null) => void;
  onSendMessage: (text: string) => void;
  onToggleListening: () => void;
  onStopSpeaking: () => void;
}

function ComposerComponent({
  status,
  sttSupported,
  uploadedImage,
  onSetUploadedImage,
  onSendMessage,
  onToggleListening,
  onStopSpeaking,
}: ComposerProps) {
  const [textInput, setTextInput] = useState('');
  const [showDropzone, setShowDropzone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shortcut key: "/" focuses composer when not already typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
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
      setShowDropzone(false);
      // Keep input focused
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [textInput, uploadedImage, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex-shrink-0 px-4 sm:px-8 pb-6 pt-2">
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

      {/* Cyber Composer Bar */}
      <div className="max-w-[760px] mx-auto border border-[rgba(133,156,191,0.22)] bg-[rgba(14,20,34,0.92)] backdrop-blur-2xl shadow-[0_18px_50px_rgba(0,0,0,0.45)] rounded-[16px] p-[8px] flex items-center gap-[9px] transition-all focus-within:border-[rgba(53,230,255,0.4)] focus-within:shadow-[0_0_25px_rgba(53,230,255,0.12)]">
        {/* Attach Image Button */}
        <button
          type="button"
          onClick={() => setShowDropzone((v) => !v)}
          className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
            uploadedImage
              ? 'bg-cyan-500/20 text-[var(--cyan)] border border-cyan-500/40 shadow-[0_0_12px_rgba(53,230,255,0.2)]'
              : showDropzone
              ? 'bg-white/10 text-white'
              : 'text-[#8190a8] hover:text-white hover:bg-white/[0.04]'
          }`}
          title="Attach visual signal (PNG, JPEG, WebP)"
          aria-label="Attach image"
        >
          <ImagePlus className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          id="text-input"
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            status === 'processing'
              ? 'Thinking and executing tools...'
              : status === 'listening'
              ? 'Listening to your voice... (say something)'
              : 'Message Voxelle or press "/" to focus…'
          }
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#edf5ff] placeholder:text-[#687992] px-2 font-sans"
        />

        {/* Stop Speaking Button if TTS active */}
        {status === 'speaking' && (
          <button
            type="button"
            onClick={onStopSpeaking}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-[var(--violet)] bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
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
          className={`w-[38px] h-[38px] rounded-full border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 relative ${
            status === 'listening'
              ? 'border-[var(--cyan)] bg-[rgba(53,230,255,0.25)] text-white shadow-[0_0_22px_var(--cyan)]'
              : status === 'speaking'
              ? 'border-[var(--violet)] bg-[rgba(146,108,255,0.2)] text-[var(--violet)] shadow-[0_0_18px_rgba(146,108,255,0.3)]'
              : 'border-[rgba(53,230,255,0.5)] bg-[rgba(39,176,208,0.12)] text-[var(--cyan)] shadow-[0_0_16px_rgba(53,230,255,0.1)] hover:bg-[rgba(39,176,208,0.22)]'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
          title={status === 'listening' ? 'Stop listening' : 'Start voice input'}
          aria-label={status === 'listening' ? 'Stop voice recording' : 'Start voice recording'}
        >
          {status === 'listening' ? (
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
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
          className="w-[38px] h-[38px] rounded-[10px] bg-gradient-to-br from-[var(--cyan)] to-[#6e85ff] text-[#06111d] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex-shrink-0 shadow-[0_0_15px_rgba(53,230,255,0.25)]"
          title="Send signal"
          aria-label="Send message"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export const Composer = memo(ComposerComponent);
