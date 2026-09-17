'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  recentSignals: string[];
  onSelectSignal: (signal: string) => void;
  onNewConversation: () => void;
  activeNav: 'command' | 'automations' | 'tools';
  setActiveNav: (nav: 'command' | 'automations' | 'tools') => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  recentSignals,
  onSelectSignal,
  onNewConversation,
  activeNav,
  setActiveNav,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showAutomationsModal, setShowAutomationsModal] = useState(false);

  const sidebarContent = (
    <aside className="w-[262px] flex-shrink-0 flex flex-col justify-between h-full p-5 lg:py-7 lg:px-[18px] border-r border-[var(--line)] bg-[rgba(7,11,21,0.85)] backdrop-blur-2xl z-40">
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-3 font-extrabold tracking-tight text-[20px] text-white">
            <div className="w-[35px] h-[35px] rounded-[11px] grid place-items-center text-[#07111b] font-bold text-[19px] glow-mark">
              ⌁
            </div>
            <span>VOXELLE</span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[var(--muted)] hover:text-white"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>

        {/* New Conversation Button */}
        <button
          onClick={onNewConversation}
          className="w-full border border-[rgba(53,230,255,0.38)] text-[#c9faff] bg-gradient-to-r from-[rgba(24,147,181,0.2)] to-[rgba(123,89,240,0.16)] hover:from-[rgba(24,147,181,0.35)] hover:to-[rgba(123,89,240,0.28)] transition-all rounded-[12px] py-[13px] px-[14px] mb-7 text-left font-semibold text-[13px] flex items-center cursor-pointer shadow-[0_0_15px_rgba(53,230,255,0.08)]"
        >
          <b className="text-[18px] mr-[9px] font-normal leading-none">＋</b>
          <span>New conversation</span>
        </button>

        {/* Workspace Navigation */}
        <div className="text-[#63728d] font-mono text-[10px] tracking-[1.6px] uppercase px-[10px] pb-[10px] font-medium">
          Workspace
        </div>
        <nav className="space-y-[2px]">
          <button
            onClick={() => setActiveNav('command')}
            className={`w-full flex items-center gap-[11px] py-[11px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'command'
                ? 'text-[#edf8ff] bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.13)] font-medium'
                : 'text-[#9ba9c1] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)] flex-shrink-0" />
            <span>Command center</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('automations');
              setShowAutomationsModal(true);
            }}
            className={`w-full flex items-center gap-[11px] py-[11px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'automations'
                ? 'text-[#edf8ff] bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.13)] font-medium'
                : 'text-[#9ba9c1] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[14px] text-[var(--violet)]">◈</span>
            <span>Automations</span>
          </button>

          <button
            onClick={() => {
              setActiveNav('tools');
              setShowToolsModal(true);
            }}
            className={`w-full flex items-center gap-[11px] py-[11px] px-[10px] text-[13px] rounded-[9px] transition-all text-left cursor-pointer ${
              activeNav === 'tools'
                ? 'text-[#edf8ff] bg-gradient-to-r from-[rgba(47,226,255,0.12)] to-[rgba(110,104,255,0.04)] border border-[rgba(77,218,255,0.13)] font-medium'
                : 'text-[#9ba9c1] hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <span className="text-[13px] text-[var(--cyan)]">⌘</span>
            <span>Connected tools</span>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-[var(--cyan)]">
              8
            </span>
          </button>
        </nav>

        {/* Recent Signals / History */}
        <div className="mt-[26px]">
          <div className="text-[#63728d] font-mono text-[10px] tracking-[1.6px] uppercase px-[10px] pb-[10px] font-medium">
            Recent signals
          </div>
          <div className="space-y-[3px]">
            {recentSignals.map((signal, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onSelectSignal(signal);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full text-left py-[9px] px-[10px] rounded-[8px] text-[12px] truncate transition-colors cursor-pointer ${
                  idx === 0
                    ? 'text-[#cbd7e8] bg-white/[0.04] hover:bg-white/[0.08]'
                    : 'text-[#8796ae] hover:text-[#e0ebf8] hover:bg-white/[0.03]'
                }`}
                title={signal}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Profile Pill */}
      <div className="p-3 flex items-center gap-[10px] border border-[var(--line)] bg-[rgba(19,27,43,0.72)] rounded-[12px] mt-6">
        <div className="w-[29px] h-[29px] rounded-[9px] grid place-items-center bg-gradient-to-br from-[#f4c898] to-[#9d6bff] text-[#15111b] font-extrabold text-[12px] flex-shrink-0 shadow-[0_0_12px_rgba(157,107,255,0.25)]">
          S
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-white truncate">
            Personal workspace
          </div>
          <span className="block text-[10px] text-[#73829c] font-mono truncate mt-[1px]">
            Pro mode · 8 tools online
          </span>
        </div>
      </div>

      {/* Connected Tools Modal */}
      <AnimatePresence>
        {showToolsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg cyber-glass-strong rounded-2xl p-6 border border-[rgba(53,230,255,0.2)] shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--cyan)] shadow-[0_0_10px_var(--cyan)]" />
                  <h3 className="font-semibold text-lg text-white">Connected Tools</h3>
                </div>
                <button
                  onClick={() => setShowToolsModal(false)}
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {[
                  { name: 'Calendar Sync', desc: 'Google / Apple Calendar scheduling', icon: '📅', status: 'Online' },
                  { name: 'Smart Home Hub', desc: 'Lights, HVAC, appliances automation', icon: '🏠', status: 'Active' },
                  { name: 'Multimodal Vision', desc: 'Visual recognition & scene analysis', icon: '👁️', status: 'Ready' },
                  { name: 'Voice Synthesis', desc: 'Natural text-to-speech engine', icon: '🎙️', status: 'Active' },
                  { name: 'Speech Recognition', desc: 'Real-time low latency STT', icon: '🎧', status: 'Active' },
                  { name: 'Automations Engine', desc: 'Scheduled routines and triggers', icon: '⚙️', status: 'Online' },
                  { name: 'Session Memory', desc: 'Encrypted local state storage', icon: '🔒', status: 'Encrypted' },
                  { name: 'System Telemetry', desc: 'Live event stream & health check', icon: '⚡', status: 'Optimal' },
                ].map((t, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="text-xl">{t.icon}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(181,245,111,0.1)] text-[var(--lime)]">
                        {t.status}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-white">{t.name}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowToolsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-white rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Automations Modal */}
      <AnimatePresence>
        {showAutomationsModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg cyber-glass-strong rounded-2xl p-6 border border-[rgba(146,108,255,0.25)] shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--violet)] shadow-[0_0_10px_var(--violet)]" />
                  <h3 className="font-semibold text-lg text-white">Automations & Scenes</h3>
                </div>
                <button
                  onClick={() => setShowAutomationsModal(false)}
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { title: 'Morning Workspace Sync', trigger: '08:30 AM Daily', desc: 'Turn on studio lights, briefing, unread review' },
                  { title: 'Focus Deep Work Routine', trigger: 'Voice keyword: "Focus mode"', desc: 'Dim peripheral lights, engage DND, start 90m block' },
                  { title: 'Evening Ambient Scene', trigger: 'Sunset / Voice', desc: 'Warm color temperature, adjust thermostat to 70°F' },
                  { title: 'Auto Calendar Buffer', trigger: 'Every event booking', desc: 'Reserve 10-minute prep buffer automatically' },
                ].map((a, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">{a.title}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">{a.desc}</div>
                      <div className="text-[10px] font-mono text-[var(--violet)] mt-1">{a.trigger}</div>
                    </div>
                    <span className="text-[11px] font-mono text-[var(--lime)] px-2 py-1 rounded-full bg-lime-400/10">
                      Active
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setShowAutomationsModal(false)}
                  className="px-4 py-2 text-xs font-medium text-white rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
