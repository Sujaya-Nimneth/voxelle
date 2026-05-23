'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { AssistantStatus } from '@/types/types';
import AudioWaveform from './AudioWaveform';

interface MicButtonProps {
  status: AssistantStatus;
  onToggle: () => void;
  disabled?: boolean;
}

export default function MicButton({ status, onToggle, disabled }: MicButtonProps) {
  const isListening = status === 'listening';
  const isProcessing = status === 'processing';
  const isSpeaking = status === 'speaking';
  const isIdle = status === 'idle';

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Tap to speak';
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
    }
  };

  const getButtonBorderColor = () => {
    switch (status) {
      case 'listening':
        return 'rgba(0, 229, 255, 0.6)';
      case 'processing':
        return 'rgba(168, 85, 247, 0.6)';
      case 'speaking':
        return 'rgba(168, 85, 247, 0.4)';
      default:
        return 'rgba(255, 255, 255, 0.08)';
    }
  };

  const getGlowClass = () => {
    switch (status) {
      case 'listening':
        return 'glow-cyan';
      case 'processing':
      case 'speaking':
        return 'glow-purple';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Ripple rings for listening state */}
        <AnimatePresence>
          {isListening && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`ripple-${i}`}
                  className="absolute inset-0 rounded-full border border-neon-cyan"
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Spinning orbital dots for processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="absolute inset-[-12px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 0.3 },
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={`dot-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-neon-purple"
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: '0 0',
                    transform: `rotate(${i * 90}deg) translateX(56px) translateY(-4px)`,
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.6, 1, 0.6],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.25,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          id="mic-button"
          onClick={onToggle}
          disabled={disabled || isProcessing}
          className={`relative z-10 w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center
            transition-colors duration-300 cursor-pointer
            disabled:cursor-not-allowed disabled:opacity-50
            glass ${getGlowClass()}`}
          style={{
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: getButtonBorderColor(),
          }}
          whileHover={isIdle ? { scale: 1.05 } : undefined}
          whileTap={isIdle ? { scale: 0.95 } : undefined}
          animate={
            isSpeaking
              ? {
                  scale: [1, 1.03, 1],
                  transition: { duration: 1.5, repeat: Infinity },
                }
              : isIdle
              ? {
                  borderColor: [
                    'rgba(255,255,255,0.08)',
                    'rgba(0,229,255,0.2)',
                    'rgba(255,255,255,0.08)',
                  ],
                  transition: { duration: 3, repeat: Infinity },
                }
              : undefined
          }
        >
          {/* Mic icon */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isListening ? '#00e5ff' : isProcessing || isSpeaking ? '#a855f7' : '#94a3b8'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-1"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>

          {/* Waveform inside button */}
          <AudioWaveform status={status} />
        </motion.button>
      </div>

      {/* Status text */}
      <motion.span
        className="text-xs font-mono tracking-wider uppercase"
        style={{
          color: isListening
            ? '#00e5ff'
            : isProcessing || isSpeaking
            ? '#a855f7'
            : '#64748b',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {getStatusText()}
      </motion.span>
    </div>
  );
}
