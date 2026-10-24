'use client';

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Cpu,
  X,
  Sparkles,
  Settings,
  Calendar,
  Home,
  Eye,
  Volume2,
  Mic,
  HardDrive,
  Trash2,
} from 'lucide-react';
import Modal from './Modal';
import { toolDefinitions } from '@/lib/tools';
import type { SpeechSettings } from '@/hooks/useSpeechSynthesis';
import type { ConversationMeta } from '@/hooks/useConversations';

interface SidebarProps {
  conversations: ConversationMeta[];
  activeConversationId: string | null;
  onSwitchConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  // Settings props
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  voices?: SpeechSynthesisVoice[];
  ttsSettings?: SpeechSettings;
  onUpdateTtsSettings?: (settings: Partial<SpeechSettings>) => void;
}

const SIDEBAR_WIDTH = 264;

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

// Honest capability inventory: what each integration actually is, no
// fictional "Online/Active" claims for things that don't exist.
const CAPABILITIES = [
  {
    name: 'Calendar events',
    desc: 'Executed server-side; produces a real .ics file you can download and import.',
    icon: <Calendar className="w-4 h-4 text-cyan" />,
    status: 'Live',
  },
  {
    name: 'Smart home',
    desc: 'Simulated — no device hub is connected. Results are labeled as simulated.',
    icon: <Home className="w-4 h-4 text-violet" />,
    status: 'Simulated',
  },
  {
    name: 'Image analysis',
    desc: 'Attach or paste images for visual questions (multimodal providers only).',
    icon: <Eye className="w-4 h-4 text-cyan" />,
    status: 'Live',
  },
  {
    name: 'Speech recognition',
    desc: 'Browser Web Speech API — Chrome, Edge, and Safari.',
    icon: <Mic className="w-4 h-4 text-violet" />,
    status: 'Browser',
  },
  {
    name: 'Speech synthesis',
    desc: 'Browser speech synthesis with sentence-bounded chunking for long replies.',
    icon: <Volume2 className="w-4 h-4 text-cyan" />,
    status: 'Browser',
  },
  {
    name: 'Conversation memory',
    desc: 'Threads are stored in this browser via localStorage — nothing else leaves your device except API calls.',
    icon: <HardDrive className="w-4 h-4 text-violet" />,
    status: 'Local',
  },
];

function Sidebar({
  conversations,
  activeConversationId,
  onSwitchConversation,
  onDeleteConversation,
  onNewConversation,
  isOpenMobile = false,
  onCloseMobile,
  autoSpeak = true,
  onToggleAutoSpeak,
  voices = [],
  ttsSettings,
  onUpdateTtsSettings,
}: SidebarProps) {
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleCloseCapabilities = () => {
    setShowCapabilitiesModal(false);
  };

  // Mobile drawer behaves like a dialog: Escape closes it and the background
  // stops scrolling while it's open.
  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile?.();
    };
    window.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpenMobile, onCloseMobile]);

  const sidebarContent = (
    <aside className="w-[264px] flex-shrink-0 flex flex-col h-full py-6 px-4 border-r border-line bg-[rgba(9,12,20,0.92)] backdrop-blur-2xl z-40">
      {/* Top Header & Brand */}
      <div className="flex items-center justify-between px-2 mb-5">
        <div className="flex items-center gap-2.5 font-extrabold tracking-tight text-[18px] text-white">
          <div className="w-[32px] h-[32px] rounded-[10px] grid place-items-center text-ink glow-mark">
            <Sparkles className="w-[18px] h-[18px] text-ink stroke-[2.5]" />
          </div>
          <span>VOXELLE</span>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-muted hover:text-white cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Conversation Button */}
      <button
        onClick={() => {
          onNewConversation();
          onCloseMobile?.();
        }}
        className="w-full border border-cyan-500/30 text-cyan bg-cyan-500/[0.07] hover:bg-cyan-500/[0.14] active:scale-[0.98] transition-all rounded-[10px] py-2.5 px-3.5 mb-5 text-left font-semibold text-[13px] flex items-center cursor-pointer"
      >
        <Plus className="w-4 h-4 mr-2.5 stroke-[2.5]" />
        <span>New conversation</span>
      </button>

      {/* Conversation Threads */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="label px-2 pb-2">Conversations</div>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                className={`group relative rounded-[9px] transition-colors ${
                  isActive
                    ? 'bg-cyan-500/[0.09] border border-cyan-500/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <button
                  onClick={() => {
                    onSwitchConversation(conv.id);
                    onCloseMobile?.();
                  }}
                  className="w-full flex items-start gap-2.5 py-2.5 px-2.5 pr-8 text-left cursor-pointer"
                  aria-current={isActive ? 'true' : undefined}
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 mt-[3px] flex-shrink-0 ${isActive ? 'text-cyan' : 'text-muted'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[12.5px] leading-snug truncate ${
                        isActive ? 'text-text font-medium' : 'text-soft'
                      }`}
                    >
                      {conv.title}
                    </span>
                    <span className="block text-[10px] font-mono text-muted mt-0.5">
                      {formatRelativeTime(conv.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => onDeleteConversation(conv.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted hover:text-danger hover:bg-white/5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                  aria-label={`Delete conversation: ${conv.title}`}
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-5 space-y-0.5">
        <div className="label px-2 pb-2">Workspace</div>
        <button
          onClick={() => {
            setShowCapabilitiesModal(true);
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-2.5 py-2 px-2.5 text-[13px] rounded-[9px] transition-colors text-left cursor-pointer text-dim hover:text-white hover:bg-white/[0.04]"
        >
          <Cpu className="w-4 h-4 text-cyan flex-shrink-0" />
          <span>Capabilities</span>
          <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan border border-cyan-500/20">
            {toolDefinitions.length}
          </span>
        </button>
      </div>

      {/* Bottom Profile & Settings Pill */}
      <div className="mt-4 p-3 flex items-center justify-between border border-line bg-[rgba(17,23,38,0.7)] rounded-[10px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[28px] h-[28px] rounded-[9px] grid place-items-center bg-gradient-to-br from-cyan to-violet text-ink font-extrabold text-[11px] flex-shrink-0">
            V
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">
              Personal workspace
            </div>
            <span className="block text-[10px] text-dim font-mono truncate">
              History stays in this browser
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-1.5 rounded-lg text-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Assistant preferences"
          aria-label="Assistant settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );

  // Modals render once at the component top level: sidebarContent mounts in
  // both the desktop rail and the mobile drawer, and Modal portals to
  // document.body regardless of CSS display, so nesting the modals inside the
  // duplicated content stacked two identical dialogs with duplicate ids.
  const modals = (
    <>
      {/* Capabilities Modal — what the app can actually do */}
      <Modal
        isOpen={showCapabilitiesModal}
        onClose={handleCloseCapabilities}
        title="Capabilities"
        icon={<Cpu className="w-5 h-5 text-cyan" />}
        footer={
          <button
            type="button"
            onClick={handleCloseCapabilities}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 cursor-pointer transition-colors"
          >
            Done
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {CAPABILITIES.map((c) => (
            <div
              key={c.name}
              className="p-3 rounded-xl bg-white/[0.02] border border-line flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="p-2 rounded-lg bg-white/5 border border-white/5">{c.icon}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-dim border border-white/10">
                  {c.status}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-white">{c.name}</div>
                <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Preferences / Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Assistant Preferences"
        icon={<Settings className="w-5 h-5 text-cyan" />}
        footer={
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 cursor-pointer transition-colors"
          >
            Done
          </button>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-soft">
          {/* Auto-Speak Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-line">
            <div>
              <div className="font-semibold text-white">Spoken Audio Responses</div>
              <div className="text-[11px] text-muted mt-0.5">
                Automatically read assistant answers aloud using speech synthesis
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              role="switch"
              aria-checked={autoSpeak}
              aria-label="Spoken audio responses"
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                autoSpeak ? 'bg-cyan' : 'bg-white/10'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-[#060810] block absolute top-1 transition-transform ${
                  autoSpeak ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Speech Rate Slider */}
          {ttsSettings && onUpdateTtsSettings && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-line">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="tts-rate" className="font-semibold text-white">
                  Speech Rate
                </label>
                <span className="font-mono text-[11px] text-cyan">
                  {ttsSettings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                id="tts-rate"
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={ttsSettings.rate}
                onChange={(e) => onUpdateTtsSettings({ rate: parseFloat(e.target.value) })}
                aria-label="Speech rate"
                className="w-full accent-cyan cursor-pointer"
              />
            </div>
          )}

          {/* Voice Engine Picker */}
          {voices.length > 0 && ttsSettings && onUpdateTtsSettings && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-line">
              <label htmlFor="tts-voice" className="block font-semibold text-white mb-2">
                Voice Engine
              </label>
              <select
                id="tts-voice"
                value={ttsSettings.voiceURI || ''}
                onChange={(e) => onUpdateTtsSettings({ voiceURI: e.target.value })}
                className="w-full bg-[rgba(8,11,20,0.8)] border border-line rounded-lg p-2 text-[16px] text-white outline-none focus-visible:ring-1 focus-visible:ring-cyan cursor-pointer"
              >
                <option value="">Default (System Natural Voice)</option>
                {voices
                  .filter((v) => v.lang.startsWith('en'))
                  .map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </>
  );

  return (
    <>
      {modals}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Workspace menu">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: -SIDEBAR_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_WIDTH }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 h-full"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default memo(Sidebar);
