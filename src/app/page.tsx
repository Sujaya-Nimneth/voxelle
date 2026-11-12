'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Activity, Search } from 'lucide-react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { useAssistant } from '@/hooks/useAssistant';
import ActivityRail from '@/components/ActivityRail';
import ChatLog from '@/components/ChatLog';
import { Composer } from '@/components/Composer';
import PermissionWarning from '@/components/PermissionWarning';
import SettingsPopover from '@/components/SettingsPopover';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import BrandMark, { SignalStrip } from '@/components/design/BrandMark';
import type { AssistantStatus } from '@/types/types';

const WorkspaceCommandPalette = dynamic(
  () => import('@/components/WorkspaceCommandPalette'),
  { ssr: false }
);

const CapabilitiesDialog = dynamic(
  () => import('@/components/CapabilitiesDialog'),
  { ssr: false }
);

const STATUS_ANNOUNCEMENTS: Record<AssistantStatus, string> = {
  idle: 'Ready',
  listening: 'Listening started',
  processing: 'Thinking',
  speaking: 'Speaking reply',
};

function VoxelleWorkspace() {
  const {
    status,
    messages,
    toolEvents,
    sessionEvents,
    conversations,
    activeConversationId,
    switchConversation,
    newConversation,
    deleteConversation,
    uploadedImage,
    setUploadedImage,
    sttError,
    sttSupported,
    ttsSupported,
    isListening,
    toggleListening,
    sendTextMessage,
    retryLastMessage,
    dismissToolEvent,
    stopSpeaking,
    speakMessage,
    interimTranscript,
    autoSpeak,
    toggleAutoSpeak,
    activeProvider,
    activeModel,
    isDegraded,
    degradedReason,
    voices,
    ttsSettings,
    updateTtsSettings,
  } = useAssistant();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showToast = useToast();

  const [activityOpen, setActivityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [capabilitiesOpen, setCapabilitiesOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusRequestCount, setFocusRequestCount] = useState(0);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Sync URL query params (?thread=<id>&panel=activity) into client state
  const initializedFromUrlRef = useRef(false);
  useEffect(() => {
    const paramThread = searchParams.get('thread');
    const paramPanel = searchParams.get('panel');

    if (
      paramThread &&
      paramThread !== activeConversationId &&
      conversations.some((c) => c.id === paramThread)
    ) {
      switchConversation(paramThread);
    }

    if (!initializedFromUrlRef.current) {
      initializedFromUrlRef.current = true;
      if (paramPanel === 'activity') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize panel drawer from URL param once
        setActivityOpen(true);
      }
    } else {
      setActivityOpen(paramPanel === 'activity');
    }
  }, [activeConversationId, conversations, searchParams, switchConversation]);

  const updateUrlParams = useCallback(
    (nextThreadId: string | null, nextActivityOpen: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextThreadId) {
        params.set('thread', nextThreadId);
      } else {
        params.delete('thread');
      }
      if (nextActivityOpen) {
        params.set('panel', 'activity');
      } else {
        params.delete('panel');
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleSelectConversation = useCallback(
    (id: string) => {
      switchConversation(id);
      updateUrlParams(id, activityOpen);
    },
    [activityOpen, switchConversation, updateUrlParams]
  );

  const handleNewConversation = useCallback(() => {
    const createdId = newConversation();
    if (typeof createdId === 'string') {
      updateUrlParams(createdId, activityOpen);
    }
    showToast({
      type: 'info',
      body: 'Started a new conversation thread',
      uniqueID: 'new-thread',
    });
  }, [activityOpen, newConversation, showToast, updateUrlParams]);

  const handleToggleActivity = useCallback(
    (open: boolean) => {
      setActivityOpen(open);
      updateUrlParams(activeConversationId, open);
    },
    [activeConversationId, updateUrlParams]
  );

  // Comprehensive accessibility announcements: status transitions & completed replies
  const prevStatusRef = useRef<AssistantStatus>(status);
  const lastAnnouncedMsgRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev !== status) {
      prevStatusRef.current = status;
      setLiveAnnouncement(STATUS_ANNOUNCEMENTS[status]);
    }
  }, [status]);

  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role === 'assistant' && !m.isStreaming && m.content.trim().length > 0) {
        if (lastAnnouncedMsgRef.current !== m.id) {
          lastAnnouncedMsgRef.current = m.id;
          const preview = m.content.slice(0, 260);
          setLiveAnnouncement(`Voxelle replied: ${preview}`);
        }
        break;
      }
    }
  }, [messages]);

  // Global keyboard shortcuts (⌘K CommandPalette, ⌘I Activity, ⌘, Settings, Esc mute speech)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
        return;
      }
      if (mod && key === 'i') {
        e.preventDefault();
        handleToggleActivity(!activityOpen);
        return;
      }
      if (mod && e.key === ',') {
        e.preventDefault();
        setSettingsOpen((v) => !v);
        return;
      }
      if (
        e.key === 'Escape' &&
        status === 'speaking' &&
        !commandPaletteOpen &&
        !capabilitiesOpen &&
        !settingsOpen &&
        !activityOpen
      ) {
        e.preventDefault();
        stopSpeaking();
        setLiveAnnouncement('Speech muted');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activityOpen,
    capabilitiesOpen,
    commandPaletteOpen,
    handleToggleActivity,
    settingsOpen,
    status,
    stopSpeaking,
  ]);

  const activeThread = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const activeThreadTitle = activeThread?.title?.trim() || 'New conversation';
  const badgeCount = toolEvents.length;

  const composerElement = (
    <Composer
      status={status}
      isListening={isListening}
      sttSupported={sttSupported}
      interimTranscript={interimTranscript}
      uploadedImage={uploadedImage}
      onImageChange={setUploadedImage}
      onSendMessage={sendTextMessage}
      onToggleListening={toggleListening}
      onStopSpeaking={stopSpeaking}
      autoSpeak={autoSpeak}
      onToggleAutoSpeak={toggleAutoSpeak}
      focusRequestCount={focusRequestCount}
    />
  );

  return (
    <>
      <VisuallyHidden>
        <Text as="span" role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </Text>
      </VisuallyHidden>

      <AppShell
        variant="section"
        height="fill"
        contentPadding={0}
        banner={
          <PermissionWarning
            sttError={sttError}
            sttSupported={sttSupported}
            onFocusComposer={() => setFocusRequestCount((n) => n + 1)}
          />
        }
        topNav={
          <TopNav
            label="Workspace header"
            heading={
              <TopNavHeading
                logo={<BrandMark size={22} />}
                heading="Voxelle"
                subheading={activeThreadTitle}
              />
            }
            startContent={
              <HStack gap={2} align="center">
                <StatusBadge status={status} isDegraded={isDegraded} />
                <SignalStrip status={status} />
              </HStack>
            }
            endContent={
              <HStack gap={2} align="center">
                <IconButton
                  label="Search threads and commands (⌘K)"
                  tooltip="Search & commands (⌘K)"
                  icon={<Search size={18} aria-hidden="true" />}
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                />
                <SettingsPopover
                  isOpen={settingsOpen}
                  onOpenChange={setSettingsOpen}
                  autoSpeak={autoSpeak}
                  onToggleAutoSpeak={toggleAutoSpeak}
                  ttsSupported={ttsSupported}
                  ttsSettings={ttsSettings}
                  onUpdateTtsSettings={updateTtsSettings}
                  voices={voices}
                />
                <Button
                  label="Activity"
                  icon={<Activity size={16} aria-hidden="true" />}
                  endContent={
                    badgeCount > 0 ? (
                      <Badge variant="info" label={badgeCount} />
                    ) : undefined
                  }
                  variant={activityOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleActivity(!activityOpen)}
                />
              </HStack>
            }
          />
        }
        sideNav={
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={deleteConversation}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onOpenCapabilities={() => setCapabilitiesOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            activeProvider={activeProvider}
            activeModel={activeModel}
            isDegraded={isDegraded}
            degradedReason={degradedReason}
          />
        }
      >
        <ChatLog
          messages={messages}
          status={status}
          toolEvents={toolEvents}
          onDismissToolEvent={dismissToolEvent}
          onSelectPrompt={sendTextMessage}
          onSpeakMessage={speakMessage}
          onRetryLastMessage={retryLastMessage}
          ttsSupported={ttsSupported}
          isDegraded={isDegraded}
          composer={composerElement}
        />
      </AppShell>

      <ActivityRail
        isOpen={activityOpen}
        onOpenChange={handleToggleActivity}
        status={status}
        toolEvents={toolEvents}
        sessionEvents={sessionEvents}
        onDismissToolEvent={dismissToolEvent}
        activeProvider={activeProvider}
        activeModel={activeModel}
        isDegraded={isDegraded}
        degradedReason={degradedReason}
      />

      {capabilitiesOpen ? (
        <CapabilitiesDialog
          isOpen={capabilitiesOpen}
          onOpenChange={setCapabilitiesOpen}
          onTryPrompt={sendTextMessage}
          activeProvider={activeProvider}
          activeModel={activeModel}
          isDegraded={isDegraded}
        />
      ) : null}

      {commandPaletteOpen ? (
        <WorkspaceCommandPalette
          isOpen={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          conversations={conversations}
          activeConversationId={activeConversationId}
          sttSupported={sttSupported}
          isListening={isListening}
          autoSpeak={autoSpeak}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onToggleListening={toggleListening}
          onToggleAutoSpeak={toggleAutoSpeak}
          onToggleActivity={() => handleToggleActivity(!activityOpen)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenCapabilities={() => setCapabilitiesOpen(true)}
        />
      ) : null}
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <VoxelleWorkspace />
    </Suspense>
  );
}
