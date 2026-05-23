'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '@/types/types';

interface ChatLogProps {
  messages: Message[];
  isProcessing: boolean;
}

export default function ChatLog({ messages, isProcessing }: ChatLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
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

  return (
    <div
      ref={scrollRef}
      id="chat-log"
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
    >
      {messages.length === 0 && !isProcessing && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-4xl mb-4">🎙️</div>
            <h3 className="text-lg font-semibold text-foreground/80 mb-2">
              Welcome to Voxelle
            </h3>
            <p className="text-sm text-muted-light max-w-sm">
              Tap the mic or type a message to start. Try saying{' '}
              <span className="text-neon-cyan font-medium">
                &ldquo;Schedule a meeting tomorrow at 3pm&rdquo;
              </span>{' '}
              or{' '}
              <span className="text-neon-cyan font-medium">
                &ldquo;Turn on the living room lights&rdquo;
              </span>
            </p>
          </motion.div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex ${
              message.role === 'user'
                ? 'justify-end'
                : message.role === 'system'
                ? 'justify-center'
                : 'justify-start'
            }`}
          >
            {message.role === 'system' ? (
              <div className="glass rounded-lg px-4 py-2 max-w-[85%] text-center">
                <p className="text-xs text-muted-light">{message.content}</p>
              </div>
            ) : (
              <div
                className={`max-w-[80%] ${
                  message.role === 'user' ? 'order-1' : ''
                }`}
              >
                <div
                  className={`glass rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'rounded-br-md border-l-2 border-l-neon-cyan/30'
                      : 'rounded-bl-md border-l-2 border-l-neon-purple/30'
                  }`}
                >
                  {/* Image preview in message */}
                  {message.image && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="max-h-40 rounded-lg object-cover"
                      />
                    </div>
                  )}

                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1.5 mt-1 px-1 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <span className="text-[10px] text-muted font-mono">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'user' && (
                    <span className="text-[10px] text-neon-cyan/50">You</span>
                  )}
                  {message.role === 'assistant' && (
                    <span className="text-[10px] text-neon-purple/50">
                      Voxelle
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex justify-start"
          >
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 border-l-2 border-l-neon-purple/30">
              <div className="flex items-center gap-1.5">
                <div className="typing-dot w-2 h-2 rounded-full bg-neon-purple/70" />
                <div className="typing-dot w-2 h-2 rounded-full bg-neon-purple/70" />
                <div className="typing-dot w-2 h-2 rounded-full bg-neon-purple/70" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
