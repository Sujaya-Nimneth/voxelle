'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/types/types';

interface ChatLogProps {
  messages: Message[];
  isProcessing: boolean;
  onSelectSuggestion: (text: string) => void;
  onStartVoice: () => void;
}

const DEFAULT_SUGGESTIONS = [
  { icon: '↗', text: 'Plan my afternoon' },
  { icon: '⌁', text: 'Brief me on today' },
  { icon: '◎', text: 'Prepare for a meeting' },
];

export default function ChatLog({
  messages,
  isProcessing,
  onSelectSuggestion,
  onStartVoice,
}: ChatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

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
      id="chat-log"
      className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-14 py-8 lg:py-10"
    >
      {/* Ambient Greeting & Suggestions Header */}
      <div className="max-w-[760px]">
        <div className="text-[var(--cyan)] font-mono text-[11px] tracking-[1.3px] uppercase font-medium">
          Your ambient co-pilot
        </div>
        <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-1.6px] leading-[1.18] my-[10px] text-white">
          What do you want to put in motion?
        </h1>
        <p className="text-[#8d9cb5] text-[14px] leading-[1.6] max-w-[520px] mb-[26px]">
          Talk naturally, type a request, or let Voxelle coordinate the tools behind the scenes.
        </p>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-[9px] mb-8">
          {DEFAULT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(item.text)}
              className="flex items-center text-[#b7c9df] hover:text-white text-[12px] py-[9px] px-[13px] rounded-[9px] border border-[var(--line)] bg-white/[0.025] hover:bg-white/[0.06] hover:border-cyan-500/30 transition-all cursor-pointer group"
            >
              <em className="text-[var(--cyan)] not-italic mr-[6px] group-hover:translate-x-0.5 transition-transform inline-block">
                {item.icon}
              </em>
              <span>{item.text}</span>
            </button>
          ))}
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
            className="space-y-4"
          >
            <div className="flex gap-[12px] items-start">
              <div className="w-[29px] h-[29px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b] font-bold text-[14px] shadow-[0_0_15px_rgba(53,230,255,0.2)]">
                ⌁
              </div>
              <div className="pt-[2px] text-[#cdd8e8] text-[13px] leading-[1.64]">
                <strong className="block text-[#f4f7ff] text-[12px] font-semibold mb-[3px]">
                  Voxelle
                </strong>
                I’m online and synced with your workspace. I can help plan, research, automate, or control your connected devices.
              </div>
            </div>

            {/* Quick Card: Voice Mode */}
            <button
              onClick={onStartVoice}
              className="ml-[41px] flex items-center gap-[13px] max-w-[465px] p-[12px] rounded-[12px] border border-[rgba(53,230,255,0.22)] bg-gradient-to-r from-[rgba(23,120,145,0.14)] to-[rgba(89,65,169,0.14)] hover:border-cyan-400/40 hover:from-[rgba(23,120,145,0.2)] hover:to-[rgba(89,65,169,0.2)] transition-all cursor-pointer text-left group"
            >
              <div className="w-[34px] h-[34px] rounded-full border border-[var(--cyan)] grid place-items-center text-[var(--cyan)] group-hover:scale-105 transition-transform flex-shrink-0">
                ◉
              </div>
              <div>
                <b className="text-[12px] text-white block font-semibold">
                  Voice mode is standing by
                </b>
                <span className="text-[10px] text-[#8695ad] block mt-0.5">
                  Tap the mic to start a hands-free conversation
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
                  className="p-3 rounded-xl border border-danger/30 bg-danger/10 text-danger text-xs text-center font-mono"
                >
                  {message.content}
                </motion.div>
              );
            }

            if (isUser) {
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] sm:max-w-[75%]">
                    <div className="cyber-glass rounded-2xl rounded-br-md py-3 px-4 border border-[rgba(53,230,255,0.25)] bg-[rgba(24,147,181,0.1)] shadow-[0_0_20px_rgba(53,230,255,0.06)]">
                      {/* Attached Image Preview */}
                      {message.image && (
                        <div className="mb-2.5 rounded-lg overflow-hidden border border-white/10 max-w-[240px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={message.image}
                            alt="Attached signal"
                            className="max-h-48 w-full object-cover"
                          />
                        </div>
                      )}
                      <p className="text-[13px] text-[#edf5ff] leading-[1.64] whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
                      <span className="text-[9px] font-mono text-[var(--muted)]">
                        {formatTime(message.timestamp)}
                      </span>
                      <span className="text-[9px] font-mono text-[var(--cyan)]">
                        You
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Bot / Assistant Message
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="flex gap-[12px] items-start"
              >
                <div className="w-[29px] h-[29px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b] font-bold text-[14px] shadow-[0_0_15px_rgba(53,230,255,0.2)]">
                  ⌁
                </div>
                <div className="flex-1 min-w-0 pt-[2px]">
                  <div className="flex items-center gap-2 mb-[3px]">
                    <strong className="text-[#f4f7ff] text-[12px] font-semibold">
                      Voxelle
                    </strong>
                    <span className="text-[9px] font-mono text-[var(--muted)]">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-[#cdd8e8] text-[13px] leading-[1.64] whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-[12px] items-start"
            >
              <div className="w-[29px] h-[29px] flex-shrink-0 rounded-[9px] grid place-items-center bg-gradient-to-br from-[rgba(53,230,255,0.9)] to-[rgba(146,108,255,0.85)] text-[#07111b] font-bold text-[14px]">
                ⌁
              </div>
              <div className="pt-2">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-[var(--line)]">
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
    </div>
  );
}
