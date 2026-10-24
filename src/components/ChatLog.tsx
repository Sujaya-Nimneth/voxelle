'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Mic,
  Calendar,
  Home,
  Eye,
  Copy,
  Check,
  Volume2,
  RotateCcw,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';
import type { Message } from '@/types/types';

interface ChatLogProps {
  messages: Message[];
  isProcessing: boolean;
  /** Current provider label — used for the honest empty-state mode line. */
  provider?: string;
  isDegraded?: boolean;
  onSelectSuggestion: (text: string) => void;
  onStartVoice: () => void;
  onAttachImage: () => void;
  onRetry?: () => void;
  onSpeakText?: (text: string) => void;
  interimTranscript?: string;
  isListening?: boolean;
}

function ChatLog({
  messages,
  isProcessing,
  provider,
  isDegraded,
  onSelectSuggestion,
  onStartVoice,
  onAttachImage,
  onRetry,
  onSpeakText,
  interimTranscript,
  isListening,
}: ChatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isNearBottomRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

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
    // Clipboard writes reject on non-secure contexts or denied permission —
    // never leave the promise unhandled.
    navigator.clipboard?.writeText(text)?.catch(() => {});
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
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
  const isDemoMode = provider === 'mock' || isDegraded;

  // Each card kicks off a real flow: the mic, a calendar tool call, the
  // image dropzone, and a smart-home tool call.
  const ACTION_CARDS = [
    {
      icon: Mic,
      title: 'Talk to Voxelle',
      desc: 'Hands-free voice input with live transcription',
      action: onStartVoice,
    },
    {
      icon: Calendar,
      title: 'Schedule an event',
      desc: 'Creates a real .ics file you can download',
      action: () => onSelectSuggestion('Schedule a team sync tomorrow at 3 PM'),
    },
    {
      icon: Eye,
      title: 'Ask about an image',
      desc: 'Attach or paste a picture for visual answers',
      action: onAttachImage,
    },
    {
      icon: Home,
      title: 'Control your space',
      desc: 'Simulated smart-home tool calls with honest labels',
      action: () => onSelectSuggestion('Turn on the studio focus lights'),
    },
  ];

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      id="chat-log"
      className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-8 lg:py-10 relative"
    >
      <div className="max-w-[760px] mx-auto">
        {/* Empty state — the full hero only before the first message */}
        {isEmpty && (
          <div className="pt-6 sm:pt-10">
            <div className="label flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan" />
              <span>Ambient Voice Co-Pilot</span>
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-1.5px] leading-[1.15] my-2 text-white">
              What do you want to put in motion?
            </h1>
            <p className="text-dim text-[14px] leading-[1.6] max-w-[540px] mb-8">
              Talk naturally, type a command, or let Voxelle coordinate tools —
              calendar events with real downloadable files, vision, and voice.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACTION_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    onClick={card.action}
                    className="group flex items-start gap-3.5 p-4 rounded-xl border border-line bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-colors text-left cursor-pointer active:scale-[0.99]"
                  >
                    <div className="w-9 h-9 rounded-[10px] grid place-items-center border border-cyan-500/25 bg-cyan-500/[0.07] text-cyan flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[13.5px] font-semibold text-text group-hover:text-white">
                        {card.title}
                      </div>
                      <div className="text-[12px] text-muted mt-0.5 leading-relaxed">
                        {card.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Honest mode line */}
            <p className="mt-6 text-[12px] font-mono text-muted">
              {isDemoMode ? (
                <>
                  <span className="text-warning">● Demo mode</span> — replies are
                  simulated. Add GEMINI_API_KEY or GROQ_API_KEY for live AI.
                </>
              ) : (
                <>
                  <span className="text-green">● Live</span> — served by {provider}.
                </>
              )}
            </p>
          </div>
        )}

        {/* Messages Thread */}
        <div className="space-y-6">
          {/* Initial Bot Greeting when empty */}
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-8"
            >
              <div className="flex gap-3 items-start">
                <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-cyan to-violet text-ink">
                  <Sparkles className="w-4 h-4 text-ink stroke-[2.5]" />
                </div>
                <div className="pt-[2px] text-soft text-[14px] leading-[1.64]">
                  <strong className="block text-text text-[12px] font-semibold mb-[2px]">
                    Voxelle
                  </strong>
                  I&apos;m online. I can schedule calendar events (with a real
                  downloadable .ics), answer questions about images, and run
                  simulated smart-home actions — by voice or text.
                </div>
              </div>
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
                    className="p-3.5 rounded-xl border border-danger/25 bg-danger/[0.07] text-danger text-xs flex items-center justify-between font-mono"
                  >
                    <span>{message.content}</span>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-danger/15 hover:bg-danger/25 text-white text-[11px] font-sans font-medium transition-colors cursor-pointer"
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
                      <div className="cyber-glass rounded-2xl rounded-br-md py-3 px-4 border border-cyan-500/20 bg-cyan-500/[0.07]">
                        {/* Attached Image Preview */}
                        {message.image && (
                          <div className="mb-2.5 rounded-lg overflow-hidden border border-white/10 max-w-[260px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.image}
                              alt="Attached image"
                              className="max-h-48 w-auto max-w-full object-contain"
                            />
                          </div>
                        )}
                        <p className="text-[14px] text-text leading-[1.64] whitespace-pre-wrap font-sans">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
                        <span className="text-[9px] font-mono text-muted">
                          {formatTime(message.timestamp)}
                        </span>
                        <span className="text-[9px] font-mono text-cyan font-medium">
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
                  className="flex gap-3 items-start group"
                >
                  <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-cyan to-violet text-ink">
                    <Sparkles className="w-4 h-4 text-ink stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-[2px]">
                    <div className="flex items-center justify-between mb-[3px]">
                      <div className="flex items-center gap-2">
                        <strong className="text-text text-[12px] font-semibold">
                          Voxelle
                        </strong>
                        <span className="text-[9px] font-mono text-muted">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>

                      {/* Action buttons (Copy, Replay) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {onSpeakText && (
                          <button
                            onClick={() => onSpeakText(message.content)}
                            className="p-1 rounded text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Read aloud"
                            aria-label="Read response aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="p-1 rounded text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Copy to clipboard"
                          aria-label="Copy message text"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-green" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={`text-soft text-[14px] ${message.truncated ? 'opacity-60' : ''}`}>
                      <MarkdownMessage content={message.content} />
                      {message.isStreaming && (
                        <span
                          className="inline-block w-[7px] h-[14px] ml-0.5 align-middle rounded-[1px] bg-cyan animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {message.truncated && (
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] font-mono text-warning">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        <span>Response interrupted — partial reply</span>
                        {onRetry && (
                          <button
                            onClick={onRetry}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-soft transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    )}
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
                role="status"
                aria-live="polite"
              >
                <div className="max-w-[85%] sm:max-w-[75%]">
                  <div className="rounded-2xl rounded-br-md py-2.5 px-4 border border-cyan/60 bg-cyan/[0.08] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
                    <p className="text-[14px] text-white italic font-sans whitespace-pre-wrap">
                      {interimTranscript}
                    </p>
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
                className="flex gap-3 items-start"
              >
                <div className="w-[30px] h-[30px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-cyan to-violet text-ink">
                  <Sparkles className="w-4 h-4 text-ink stroke-[2.5]" />
                </div>
                <div className="pt-1.5">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-line"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan cyber-dot-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet cyber-dot-2" />
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan cyber-dot-3" />
                    <span className="text-[10px] font-mono text-muted ml-1">
                      Processing…
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Floating Scroll to Bottom Button — offset clear of the desktop rail. */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 lg:right-[340px] z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(14,20,34,0.92)] border border-cyan-500/35 text-cyan text-xs font-mono shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:bg-cyan-500/10 transition-colors cursor-pointer"
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
