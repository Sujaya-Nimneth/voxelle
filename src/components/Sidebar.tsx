'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Radio,
  Sliders,
  Cpu,
  X,
  Sparkles,
  Settings,
  Calendar,
  Home,
  Eye,
  Volume2,
  Mic,
  Activity,
  CheckCircle,
} from 'lucide-react';
import Modal from './Modal';
import type { SpeechSettings } from '@/hooks/useSpeechSynthesis';

interface SidebarProps {
  recentSignals: string[];
  onSelectSignal: (signal: string) => void;
  onNewConversation: () => void;
  activeNav: 'command' | 'automations' | 'tools';
  setActiveNav: (nav: 'command' | 'automations' | 'tools') => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  // Settings props
  autoSpeak?: boolean;
  onToggleAutoSpeak?: () => void;
  voices?: SpeechSynthesisVoice[];
  ttsSettings?: SpeechSettings;
  onUpdateTtsSettings?: (settings: Partial<SpeechSettings>) => void;
}

function Sidebar({
  recentSignals,
  onSelectSignal,
  onNewConversation,
  activeNav,
  setActiveNav,
  isOpenMobile = false,
  onCloseMobile,
  autoSpeak = true,
  onToggleAutoSpeak,
  voices = [],
  ttsSettings,
  onUpdateTtsSettings,
}: SidebarProps) {
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleCloseTools = () => {
    setShowToolsModal(false);
    setActiveNav('command');
  };

  const handleCloseAutomations = () => {
    setShowAutomationsModal(false);
    setActiveNav('command');
  };

  const sidebarContent = (
    <aside className="w-[262px] flex-shrink-0 flex flex-col justify-between h-full p-5 lg:py-7 lg:px-[18px] border-r border-line bg-[rgba(7,11,21,0.88)] backdrop-blur-2xl z-40">
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2.5 font-extrabold tracking-tight text-[19px] text-white">
            <div className="w-[34px] h-[34px] rounded-[10px] grid place-items-center text-ink glow-mark">
              <Sparkles className="w-5 h-5 text-ink stroke-[2.5]" />
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
          onClick={onNewConversation}
          className="w-full border border-[rgba(53,230,255,0.38)] text-[#c9faff] bg-gradient-to-r from-[rgba(24,147,181,0.2)] to-[rgba(123,89,240,0.16)] hover:from-[rgba(24,147,181,0.35)] hover:to-[rgba(123,89,240,0.28)] transition-all rounded-[12px] py-[12px] px-[14px] mb-7 text-left font-semibold text-[13px] flex items-center cursor-pointer shadow-[0_0_15px_rgba(53,230,255,0.08)] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2.5 text-cyan stroke-[2.5]" />
          <span>New conversation</span>
        </button>

        {/* Workspace Navigation */}
        <div className="text-dim font-mono text-[10px] tracking-[1.6px] uppercase px-[10px] pb-[10px] font-medium">
          Workspace
        </div>
        <nav className="space-y-[2px]">
          <button
            onClick={() => setActiveNav('command')}
            className={`w-full flex items-center gap-[11px] py-[10px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'command'
                ? 'text-text bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.15)] font-medium shadow-[0_0_12px_rgba(47,226,255,0.05)]'
                : 'text-dim hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Radio className="w-4 h-4 text-cyan flex-shrink-0" />
            <span>Command center</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('automations');
              setShowAutomationsModal(true);
            }}
            className={`w-full flex items-center gap-[11px] py-[10px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'automations'
                ? 'text-text bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.15)] font-medium'
                : 'text-dim hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Sliders className="w-4 h-4 text-violet flex-shrink-0" />
            <span>Automations</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('tools');
              setShowToolsModal(true);
            }}
            className={`w-full flex items-center gap-[11px] py-[10px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'tools'
                ? 'text-text bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.15)] font-medium'
                : 'text-dim hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan flex-shrink-0" />
            <span>Connected tools</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan border border-cyan-500/20">
              8
            </span>
          </button>
        </nav>

        {/* Recent Signals / History */}
        <div className="mt-[26px]">
          <div className="text-dim font-mono text-[10px] tracking-[1.6px] uppercase px-[10px] pb-[10px] font-medium">
            Recent signals
          </div>
          <div className="space-y-[3px]">
            {recentSignals.map((signal, idx) => (
              <button
                key={`${signal}-${idx}`}
                onClick={() => {
                  onSelectSignal(signal);
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-left py-[9px] px-[10px] rounded-[8px] text-[12px] truncate transition-colors cursor-pointer text-dim hover:text-white hover:bg-white/[0.04]"
                title={signal}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Profile & Settings Pill */}
      <div className="p-3 flex items-center justify-between border border-line bg-[rgba(19,27,43,0.72)] rounded-[12px] mt-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-[30px] h-[30px] rounded-[9px] grid place-items-center bg-gradient-to-br from-[#f4c898] to-[#9d6bff] text-[#15111b] font-extrabold text-[12px] flex-shrink-0 shadow-[0_0_12px_rgba(157,107,255,0.25)]">
            V
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-white truncate">
              Personal workspace
            </div>
            <span className="block text-[10px] text-dim font-mono truncate">
              Pro · 8 tools online
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

      {/* Connected Tools Modal with Portal */}
      <Modal
        isOpen={showToolsModal}
        onClose={handleCloseTools}
        title="Connected Tools"
        icon={<Cpu className="w-5 h-5 text-cyan" />}
        footer={
          <button
            type="button"
            onClick={handleCloseTools}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer transition-all shadow-[0_0_15px_rgba(53,230,255,0.15)]"
          >
            Done
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {[
            { name: 'Calendar Sync', desc: 'Google / Apple Calendar scheduling', icon: <Calendar className="w-4 h-4 text-cyan-400" />, status: 'Online' },
            { name: 'Smart Home Hub', desc: 'Lights, HVAC, appliances automation', icon: <Home className="w-4 h-4 text-violet-400" />, status: 'Active' },
            { name: 'Multimodal Vision', desc: 'Visual recognition & scene analysis', icon: <Eye className="w-4 h-4 text-lime-400" />, status: 'Ready' },
            { name: 'Voice Synthesis', desc: 'Natural text-to-speech engine', icon: <Volume2 className="w-4 h-4 text-cyan-400" />, status: 'Active' },
            { name: 'Speech Recognition', desc: 'Real-time low latency STT', icon: <Mic className="w-4 h-4 text-violet-400" />, status: 'Active' },
            { name: 'Automations Engine', desc: 'Scheduled routines and triggers', icon: <Sliders className="w-4 h-4 text-lime-400" />, status: 'Online' },
            { name: 'Session Memory', desc: 'Encrypted local state storage', icon: <CheckCircle className="w-4 h-4 text-cyan-400" />, status: 'Encrypted' },
            { name: 'System Telemetry', desc: 'Live event stream & health check', icon: <Activity className="w-4 h-4 text-violet-400" />, status: 'Optimal' },
          ].map((t, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-line flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <span className="p-2 rounded-lg bg-white/5 border border-white/5">{t.icon}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(181,245,111,0.1)] text-lime border border-lime-400/20">
                  {t.status}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-white">{t.name}</div>
                <div className="text-[11px] text-muted mt-0.5">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Automations Modal with Portal */}
      <Modal
        isOpen={showAutomationsModal}
        onClose={handleCloseAutomations}
        title="Automations & Scenes"
        borderColor="rgba(146,108,255,0.3)"
        icon={<Sliders className="w-5 h-5 text-violet" />}
        footer={
          <button
            type="button"
            onClick={handleCloseAutomations}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 cursor-pointer transition-all shadow-[0_0_15px_rgba(146,108,255,0.15)]"
          >
            Done
          </button>
        }
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {[
            { title: 'Morning Workspace Sync', trigger: '08:30 AM Daily', desc: 'Turn on studio lights, briefing, unread review' },
            { title: 'Focus Deep Work Routine', trigger: 'Voice keyword: "Focus mode"', desc: 'Dim peripheral lights, engage DND, start 90m block' },
            { title: 'Evening Ambient Scene', trigger: 'Sunset / Voice', desc: 'Warm color temperature, adjust thermostat to 70°F' },
            { title: 'Auto Calendar Buffer', trigger: 'Every event booking', desc: 'Reserve 10-minute prep buffer automatically' },
          ].map((a, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-line flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">{a.title}</div>
                <div className="text-[11px] text-muted mt-0.5">{a.desc}</div>
                <div className="text-[10px] font-mono text-violet mt-1">{a.trigger}</div>
              </div>
              <span className="text-[11px] font-mono text-lime px-2 py-1 rounded-full bg-lime-400/10 border border-lime-400/20">
                Active
              </span>
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
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer transition-all shadow-[0_0_15px_rgba(53,230,255,0.15)]"
          >
            Save & Close
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
              onClick={onToggleAutoSpeak}
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
                <span className="font-semibold text-white">Speech Rate</span>
                <span className="font-mono text-[11px] text-cyan">
                  {ttsSettings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={ttsSettings.rate}
                onChange={(e) => onUpdateTtsSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-[var(--cyan)] cursor-pointer"
              />
            </div>
          )}

          {/* Voice Engine Picker */}
          {voices.length > 0 && ttsSettings && onUpdateTtsSettings && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-line">
              <div className="font-semibold text-white mb-2">Voice Engine</div>
              <select
                value={ttsSettings.voiceURI || ''}
                onChange={(e) => onUpdateTtsSettings({ voiceURI: e.target.value })}
                className="w-full bg-[rgba(8,11,20,0.8)] border border-line rounded-lg p-2 text-xs text-white outline-none cursor-pointer"
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
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
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
