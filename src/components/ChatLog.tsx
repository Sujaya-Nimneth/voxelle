'use client';

import { useRef, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
import BrandMark from './design/BrandMark';
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

// One formatter, reused for every timestamp; locale-aware rather than a
// hardcoded shape.
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

/** The product's own device: a wide signal waveform drawn in the one hue. */
function WelcomeSignal() {
  const bars = [0.2, 0.34, 0.5, 0.3, 0.72, 0.46, 0.9, 0.6, 1, 0.66, 0.42, 0.78, 0.5, 0.3, 0.58, 0.36, 0.22, 0.4, 0.28, 0.16];
  return (
    <svg
      viewBox="0 0 400 64"
      width="100%"
      height="64"
      preserveAspectRatio="none"
      role="img"
      aria-label="Voxelle voice signal"
      className="max-w-[420px]"
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 20 + 4}
          y={32 - h * 28}
          width="10"
          height={h * 56}
          rx="3"
          fill="var(--accent)"
          opacity={0.35 + h * 0.6}
        />
      ))}
    </svg>
  );
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
    navigator.clipboard?.writeText(text)?.catch(() => {});
    setCopiedId(id);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (timestamp: number) => timeFormatter.format(new Date(timestamp));

  const isEmpty = messages.length === 0;
  const isDemoMode = provider === 'mock' || isDegraded;

  // Plain text suggestions: real flows, sentence case, one outline icon each.
  const SUGGESTIONS = [
    { icon: Mic, title: 'Talk to Voxelle', desc: 'Hands-free voice input', action: onStartVoice },
    {
      icon: Calendar,
      title: 'Schedule an event',
      desc: 'Get a real, downloadable .ics file',
      action: () => onSelectSuggestion('Schedule a team sync tomorrow at 3 PM'),
    },
    { icon: Eye, title: 'Ask about an image', desc: 'Attach or paste a picture', action: onAttachImage },
    {
      icon: Home,
      title: 'Control your space',
      desc: 'Simulated smart-home actions',
      action: () => onSelectSuggestion('Turn on the studio focus lights'),
    },
  ];

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      id="chat-log"
      className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-10 py-8 relative"
      aria-label="Conversation"
    >
      <div className="max-w-[760px] mx-auto">
        {/* Empty state — signal invitation, before the first message */}
        {isEmpty && (
          <div className="pt-4 sm:pt-8">
            <h1 className="text-[24px] font-semibold tracking-tight leading-tight text-text">
              What would you like to put in motion?
            </h1>
            <p className="text-muted text-[14px] leading-relaxed max-w-[540px] mt-2">
              Talk naturally or type a command. Voxelle streams replies, runs real
              tools, and shows you exactly what happened.
            </p>

            {/* The signature: one big signal, one primary action. */}
            <div className="mt-8 panel p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <WelcomeSignal />
              <div className="flex-shrink-0">
                <button
                  onClick={onStartVoice}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-control)] bg-primary text-primary-ink text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
                >
                  <Mic className="w-4 h-4" aria-hidden="true" />
                  Start talking
                </button>
                <p className="text-[12px] text-faint mt-2">Or type below</p>
              </div>
            </div>

            {/* Four text suggestions, no icon-tinted cards. */}
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <li key={s.title}>
                    <button
                      onClick={s.action}
                      className="w-full flex items-start gap-3 py-2.5 text-left group cursor-pointer border-b border-rule"
                    >
                      <Icon className="w-4 h-4 mt-0.5 text-muted group-hover:text-accent flex-shrink-0" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-text group-hover:text-accent">{s.title}</span>
                        <span className="block text-[12px] text-faint">{s.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Honest mode line */}
            <p className="mt-5 text-[12px] text-faint">
              {isDemoMode ? (
                <>
                  <span className="text-warning">Demo mode</span> — replies are simulated. Add a provider key for live AI.
                </>
              ) : (
                <>
                  <span className="text-positive">Live</span> — served by {provider}.
                </>
              )}
            </p>
          </div>
        )}

        {/* Messages Thread */}
        <div className="space-y-6">
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
                    className="flex items-center justify-between gap-4 p-3.5 rounded-[var(--radius-card)] bg-pill-neg-bg text-pill-neg-ink text-[13px]"
                    role="alert"
                  >
                    <span className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{message.content}</span>
                    </span>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-control)] border border-line text-text hover:bg-raised text-[12px] font-medium transition-colors cursor-pointer flex-shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        Retry
                      </button>
                    )}
                  </motion.div>
                );
              }

              if (isUser) {
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
                      <div className="panel bg-surface rounded-[var(--radius-card)] py-3 px-4">
                        {message.image && (
                          <div className="mb-2.5 rounded-[var(--radius-chip)] overflow-hidden border border-line max-w-[260px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={message.image}
                              alt="Attached image"
                              width={260}
                              height={192}
                              loading="lazy"
                              className="max-h-48 w-auto max-w-full object-contain"
                            />
                          </div>
                        )}
                        <p className="text-[14px] text-text leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1 px-1">
                        <time className="text-[11px] text-faint" dateTime={new Date(message.timestamp).toISOString()}>
                          {formatTime(message.timestamp)}
                        </time>
                        <span className="text-[11px] text-muted">You</span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // Assistant message — flat on the ground, one drawn mark.
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-3 items-start group"
                >
                  <BrandMark size={28} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] font-semibold text-text">Voxelle</span>
                        <time className="text-[11px] text-faint" dateTime={new Date(message.timestamp).toISOString()}>
                          {formatTime(message.timestamp)}
                        </time>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                        {onSpeakText && (
                          <button
                            onClick={() => onSpeakText(message.content)}
                            className="p-1.5 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer"
                            title="Read aloud"
                            aria-label="Read response aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="p-1.5 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer"
                          title="Copy to clipboard"
                          aria-label="Copy message text"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-positive" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={`text-text text-[14px] leading-relaxed ${message.truncated ? 'opacity-60' : ''}`}>
                      <MarkdownMessage content={message.content} />
                      {message.isStreaming && (
                        <span
                          className="inline-block w-[7px] h-[14px] ml-0.5 align-middle rounded-[1px] bg-accent animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {message.truncated && (
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-warning">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Response interrupted — partial reply</span>
                        {onRetry && (
                          <button
                            onClick={onRetry}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-control)] border border-line text-text hover:bg-raised transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" aria-hidden="true" />
                            Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Live speech interim preview */}
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
                <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
                  <div className="rounded-[var(--radius-card)] py-2.5 px-4 bg-surface border border-line flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" aria-hidden="true" />
                    <p className="text-[14px] text-muted italic whitespace-pre-wrap break-words">{interimTranscript}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing: a flat placeholder at the real text size, no shimmer. */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-3 items-start"
                role="status"
                aria-live="polite"
              >
                <BrandMark size={28} className="mt-0.5" />
                <div className="flex-1 pt-1.5 space-y-2" aria-label="Thinking">
                  <div className="skeleton h-3 w-[70%]" />
                  <div className="skeleton h-3 w-[45%]" />
                  <span className="sr-only">Thinking…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scroll to latest — the one floating control, covers nothing at rest. */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="fixed bottom-24 right-6 lg:right-[calc(var(--rail-w)+24px)] z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-surface border border-line text-muted text-[12px] float-shadow hover:text-text transition-colors cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            Latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(ChatLog);
