'use client';

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Cpu,
  X,
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
import BrandMark from './design/BrandMark';
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
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  voices?: SpeechSynthesisVoice[];
  ttsSettings?: SpeechSettings;
  onUpdateTtsSettings?: (settings: Partial<SpeechSettings>) => void;
}

const SIDEBAR_WIDTH = 232;

function formatRelativeTime(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  return rtf.format(-days, 'day');
}

// Honest capability inventory: no fictional "Online/Active" claims.
const CAPABILITIES = [
  {
    name: 'Calendar events',
    desc: 'Runs on the server and produces a real .ics file you can download and import.',
    icon: Calendar,
    status: 'Live',
  },
  {
    name: 'Smart home',
    desc: 'Simulated — no device hub is connected. Results are labeled as simulated.',
    icon: Home,
    status: 'Simulated',
  },
  {
    name: 'Image analysis',
    desc: 'Attach or paste images for visual questions (multimodal providers only).',
    icon: Eye,
    status: 'Live',
  },
  {
    name: 'Speech recognition',
    desc: 'Browser Web Speech API — Chrome, Edge, and Safari.',
    icon: Mic,
    status: 'Browser',
  },
  {
    name: 'Speech synthesis',
    desc: 'Browser speech synthesis with sentence-bounded chunking for long replies.',
    icon: Volume2,
    status: 'Browser',
  },
  {
    name: 'Conversation memory',
    desc: 'Threads live in this browser via localStorage — nothing else leaves your device except API calls.',
    icon: HardDrive,
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (pendingDeleteId) onDeleteConversation(pendingDeleteId);
    setPendingDeleteId(null);
    setConfirmOpen(false);
  };

  const sidebarContent = (
    <aside className="w-full h-full flex flex-col py-5 px-3 border-r border-line bg-ground overflow-hidden">
      {/* Product mark + name + scope */}
      <div className="flex items-center justify-between px-2 mb-5">
        <BrandMark size={26} showName />
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* One primary action */}
      <button
        onClick={() => {
          onNewConversation();
          onCloseMobile?.();
        }}
        className="w-full h-9 mb-5 rounded-[var(--radius-control)] bg-primary text-primary-ink hover:opacity-90 active:scale-[0.98] transition text-[13px] font-medium flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        New conversation
      </button>

      {/* Conversation threads — active by brightness, no coloured pill */}
      <nav className="flex-1 min-h-0 flex flex-col" aria-label="Conversations">
        <p className="label px-2 pb-2">Conversations</p>
        <ul className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
          {conversations.length === 0 && (
            <li className="px-2 py-3 text-[12px] text-faint">No conversations yet.</li>
          )}
          {conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <li key={conv.id} className="group relative">
                <button
                  onClick={() => {
                    onSwitchConversation(conv.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-start gap-2.5 py-2 px-2.5 pr-8 text-left rounded-[var(--radius-control)] transition-colors cursor-pointer ${
                    isActive ? 'bg-raised' : 'hover:bg-raised'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <MessageSquare
                    className={`w-3.5 h-3.5 mt-[3px] flex-shrink-0 ${isActive ? 'text-text' : 'text-muted'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] leading-snug truncate ${isActive ? 'text-text font-medium' : 'text-muted'}`}>
                      {conv.title}
                    </span>
                    <span className="block text-[11px] text-faint mt-0.5">
                      {formatRelativeTime(conv.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => requestDelete(conv.id)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-[var(--radius-control)] text-muted hover:text-negative hover:bg-raised opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                  aria-label={`Delete conversation: ${conv.title}`}
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Workspace utility */}
      <div className="mt-4">
        <p className="label px-2 pb-2">Workspace</p>
        <button
          onClick={() => {
            setShowCapabilitiesModal(true);
            onCloseMobile?.();
          }}
          className="w-full flex items-center gap-2.5 py-2 px-2.5 text-[13px] rounded-[var(--radius-control)] transition-colors text-left cursor-pointer text-muted hover:text-text hover:bg-raised"
        >
          <Cpu className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>Capabilities</span>
          <span className="ml-auto text-[11px] text-faint" data-num>{toolDefinitions.length}</span>
        </button>
      </div>

      {/* Scope + settings at the bottom */}
      <div className="mt-3 p-2.5 flex items-center justify-between border-t border-line">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-text truncate">Personal workspace</div>
          <span className="block text-[11px] text-faint truncate">History stays in this browser</span>
        </div>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="p-2 rounded-[var(--radius-control)] text-muted hover:text-text hover:bg-raised transition-colors cursor-pointer flex-shrink-0"
          title="Assistant preferences"
          aria-label="Assistant settings"
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );

  // Modals render once at the top level: sidebarContent mounts in both the
  // desktop rail and the mobile drawer, so nesting them duplicated ids.
  const modals = (
    <>
      <Modal
        isOpen={showCapabilitiesModal}
        onClose={() => setShowCapabilitiesModal(false)}
        title="Capabilities"
        footer={
          <button
            type="button"
            onClick={() => setShowCapabilitiesModal(false)}
            className="px-4 h-9 text-[13px] font-medium text-primary-ink bg-primary rounded-[var(--radius-control)] hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        }
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.name} className="p-3 rounded-[var(--radius-card)] bg-surface border border-line flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <Icon className="w-4 h-4 text-muted" aria-hidden="true" />
                  <span className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-chip)] bg-pill-neutral-bg text-pill-neutral-ink">
                    {c.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-[13px] font-medium text-text">{c.name}</div>
                  <div className="text-[12px] text-faint mt-0.5 leading-relaxed">{c.desc}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </Modal>

      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Assistant preferences"
        footer={
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="px-4 h-9 text-[13px] font-medium text-primary-ink bg-primary rounded-[var(--radius-control)] hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-[13px] text-text">
          <div className="flex items-center justify-between gap-4 p-3 rounded-[var(--radius-card)] bg-surface border border-line">
            <div className="min-w-0">
              <div className="font-medium">Spoken responses</div>
              <div className="text-[12px] text-faint mt-0.5">Read assistant answers aloud automatically</div>
            </div>
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              role="switch"
              aria-checked={autoSpeak}
              aria-label="Spoken audio responses"
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${autoSpeak ? 'bg-accent' : 'bg-raised'}`}
            >
              <span className={`w-4 h-4 rounded-full bg-primary-ink block absolute top-1 transition-transform ${autoSpeak ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {ttsSettings && onUpdateTtsSettings && (
            <div className="p-3 rounded-[var(--radius-card)] bg-surface border border-line">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="tts-rate" className="font-medium">Speech rate</label>
                <span className="text-[12px] text-muted" data-num>{ttsSettings.rate.toFixed(1)}x</span>
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
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>
          )}

          {voices.length > 0 && ttsSettings && onUpdateTtsSettings && (
            <div className="p-3 rounded-[var(--radius-card)] bg-surface border border-line">
              <label htmlFor="tts-voice" className="block font-medium mb-2">Voice engine</label>
              <select
                id="tts-voice"
                value={ttsSettings.voiceURI || ''}
                onChange={(e) => onUpdateTtsSettings({ voiceURI: e.target.value })}
                className="w-full bg-surface border border-line rounded-[var(--radius-control)] p-2 text-[14px] text-text outline-none focus-visible:border-accent cursor-pointer"
              >
                <option value="">Default (system natural voice)</option>
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

      {/* Destructive action confirmation (web guidelines: never immediate). */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
        title="Delete this conversation?"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
              className="px-4 h-9 text-[13px] text-text border border-line rounded-[var(--radius-control)] hover:bg-raised cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="px-4 h-9 text-[13px] font-medium rounded-[var(--radius-control)] bg-pill-neg-bg text-pill-neg-ink hover:opacity-90 cursor-pointer"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-[13px] text-muted leading-relaxed">
          This removes the thread and its history from this browser. It cannot be undone.
        </p>
      </Modal>
    </>
  );

  return (
    <>
      {modals}

      <div className="hidden lg:block h-screen sticky top-0" style={{ width: 'var(--sidebar-w)' }}>
        {sidebarContent}
      </div>

      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex" role="dialog" aria-modal="true" aria-label="Workspace menu">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: -SIDEBAR_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_WIDTH }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative z-10 h-full"
              style={{ width: SIDEBAR_WIDTH }}
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
