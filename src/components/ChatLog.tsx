'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Compass,
  Calendar,
  Briefcase,
  Mic,
  Copy,
  Check,
  Volume2,
  RotateCcw,
  ArrowDown,
} from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';
import type { Message } from '@/types/types';

interface ChatLogProps {
  messages: Message[];
  isProcessing: boolean;
  onSelectSuggestion: (text: string) => void;
  onStartVoice: () => void;
  onRetry?: () => void;
  onSpeakText?: (text: string) => void;
  interimTranscript?: string;
  isListening?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  { icon: Compass, text: 'Plan my afternoon' },
  { icon: Calendar, text: 'Brief me on today' },
  { icon: Briefcase, text: 'Prepare for a meeting' },
];

function ChatLog({
  messages,
  isProcessing,
  onSelectSuggestion,
  onStartVoice,
  onRetry,
  onSpeakText,
  interimTranscript,
  isListening,
}: ChatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);

  // Monitor scroll position
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    const nearBottom = distanceToBottom < 120;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShowScrollBottom(false);
    }
  };

  // Smart auto-scroll only if already near bottom
  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, interimTranscript]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      id="chat-log"
      className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-8 lg:py-10 relative"
    >
      {/* Ambient Greeting & Suggestions Header */}
      <div className={`max-w-[760px] transition-all duration-300 ${isEmpty ? 'mb-8' : 'mb-6'}`}>
        <div className="text-[var(--cyan)] font-mono text-[11px] tracking-[1.3px] uppercase font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--cyan)]" />
          <span>Ambient Voice Co-Pilot</span>
        </div>
        <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-[-1.5px] leading-[1.18] my-[8px] text-white">
          What do you want to put in motion?
        </h1>
        <p className="text-[#8d9cb5] text-[13.5px] leading-[1.6] max-w-[540px] mb-[20px]">
          Talk naturally, type a command, or let Voxelle coordinate connected tools and automations.
        </p>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-[9px]">
          {DEFAULT_SUGGESTIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectSuggestion(item.text)}
                className="flex items-center text-[#b7c9df] hover:text-white text-[12px] py-[8px] px-[12px] rounded-[9px] border border-[var(--line)] bg-white/[0.025] hover:bg-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer group active:scale-[0.98]"
              >
                <Icon className="w-3.5 h-3.5 text-[var(--cyan)] mr-[7px] group-hover:scale-110 transition-transform" />
                <span>{item.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="max-w-[760px] space-y-6">
        {/* Initial Bot Greeting when empty */}
        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-2"
          >
            <div className="flex gap-[12px] items-start">
              <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b] shadow-[0_0_15px_rgba(53,230,255,0.2)]">
                <Sparkles className="w-4 h-4 text-[#07111b] stroke-[2.5]" />
              </div>
              <div className="pt-[2px] text-[#cdd8e8] text-[13px] leading-[1.64]">
                <strong className="block text-[#f4f7ff] text-[12px] font-semibold mb-[2px]">
                  Voxelle
                </strong>
                I’m online and synced with your workspace. I can help coordinate calendar events, smart devices, automations, or analyze uploaded visual signals.
              </div>
            </div>

            {/* Quick Card: Voice Mode */}
            <button
              onClick={onStartVoice}
              className="ml-[42px] flex items-center gap-[13px] max-w-[465px] p-[12px] rounded-[12px] border border-[rgba(53,230,255,0.22)] bg-gradient-to-r from-[rgba(23,120,145,0.14)] to-[rgba(89,65,169,0.14)] hover:border-cyan-400/40 hover:from-[rgba(23,120,145,0.2)] hover:to-[rgba(89,65,169,0.2)] transition-all cursor-pointer text-left group"
            >
              <div className="w-[34px] h-[34px] rounded-full border border-[var(--cyan)] grid place-items-center text-[var(--cyan)] group-hover:scale-105 transition-transform flex-shrink-0">
                <Mic className="w-4 h-4 text-[var(--cyan)]" />
              </div>
              <div>
                <b className="text-[12px] text-white block font-semibold">
                  Voice mode is standing by
                </b>
                <span className="text-[10px] text-[#8695ad] block mt-0.5">
                  Tap the mic or tap here to start a hands-free voice dialogue
                </span>
              </div>
            </button>
          </motion.div>
        )}

        {/* Existing Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';

            if (isSystem) {
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl border border-[rgba(255,117,148,0.3)] bg-[rgba(255,117,148,0.08)] text-[var(--danger)] text-xs flex items-center justify-between font-mono"
                >
                  <span>{message.content}</span>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[rgba(255,117,148,0.2)] hover:bg-[rgba(255,117,148,0.3)] text-white text-[11px] font-sans font-medium transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </motion.div>
              );
            }

            if (isUser) {
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div className="cyber-glass rounded-2xl rounded-br-md py-3 px-4 border border-[rgba(53,230,255,0.25)] bg-[rgba(24,147,181,0.12)] shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                      {/* Attached Image Preview */}
                      {message.image && (
                        <div className="mb-2.5 rounded-lg overflow-hidden border border-white/10 max-w-[260px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.image}
                            alt="Attached visual signal"
                            className="max-h-48 w-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-[13px] text-[#edf5ff] leading-[1.64] whitespace-pre-wrap font-sans">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
                      <span className="text-[9px] font-mono text-[var(--muted)]">
                        {formatTime(message.timestamp)}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--cyan)] font-medium">
                        You
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Assistant / Bot Message
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex gap-[12px] items-start group"
              >
                <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b] shadow-[0_0_15px_rgba(53,230,255,0.2)]">
                  <Sparkles className="w-4 h-4 text-[#07111b] stroke-[2.5]" />
                </div>
                <div className="flex-1 min-w-0 pt-[2px]">
                  <div className="flex items-center justify-between mb-[3px]">
                    <div className="flex items-center gap-2">
                      <strong className="text-[#f4f7ff] text-[12px] font-semibold">
                        Voxelle
                      </strong>
                      <span className="text-[9px] font-mono text-[var(--muted)]">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    {/* Action buttons (Copy, Replay) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onSpeakText && (
                        <button
                          onClick={() => onSpeakText(message.content)}
                          className="p-1 rounded text-[var(--muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Read aloud"
                          aria-label="Read response aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        className="p-1 rounded text-[var(--muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Copy to clipboard"
                        aria-label="Copy message text"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3.5 h-3.5 text-[var(--lime)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-[#cdd8e8] text-[13px]">
                    <MarkdownMessage content={message.content} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Live speech interim preview while user is actively talking */}
        <AnimatePresence>
          {isListening && interimTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex justify-end"
            >
              <div className="max-w-[85%] sm:max-w-[75%]">
                <div className="rounded-2xl rounded-br-md py-2.5 px-4 border border-[var(--cyan)] bg-[rgba(53,230,255,0.12)] shadow-[0_0_20px_rgba(53,230,255,0.15)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-ping" />
                  <p className="text-[13px] text-white italic font-sans">{interimTranscript}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing / Processing indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-[12px] items-start"
            >
              <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b]">
                <Sparkles className="w-4 h-4 text-[#07111b] stroke-[2.5]" />
              </div>
              <div className="pt-1.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-[var(--line)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] cyber-dot-1" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--violet)] cyber-dot-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] cyber-dot-3" />
                  <span className="text-[10px] font-mono text-[var(--muted)] ml-1">
                    Processing signal...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 lg:right-96 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(14,20,34,0.9)] border border-cyan-500/40 text-[var(--cyan)] text-xs font-mono shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:bg-cyan-500/10 transition-colors cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ChatLog);
