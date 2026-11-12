'use client';

import { useMemo } from 'react';
import {
  Activity,
  MessageSquare,
  Mic,
  Monitor,
  Moon,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Sun,
  Volume2,
} from 'lucide-react';
import { CommandPalette } from '@astryxdesign/core/CommandPalette';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { createStaticSource, type SearchableItem } from '@astryxdesign/core/Typeahead';
import type { ConversationMeta } from '@/hooks/useConversations';
import { useAppTheme } from './AppThemeProvider';

interface PaletteAux {
  group: string;
  aliases?: string[];
  shortcut?: string;
  subtitle?: string;
  Icon?: typeof MessageSquare;
}

export interface WorkspaceCommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ConversationMeta[];
  activeConversationId: string | null;
  sttSupported: boolean;
  isListening: boolean;
  autoSpeak: boolean;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onToggleListening: () => void;
  onToggleAutoSpeak: () => void;
  onToggleActivity: () => void;
  onOpenSettings: () => void;
  onOpenCapabilities: () => void;
}

export default function WorkspaceCommandPalette({
  isOpen,
  onOpenChange,
  conversations,
  activeConversationId,
  sttSupported,
  isListening,
  autoSpeak,
  onNewConversation,
  onSelectConversation,
  onToggleListening,
  onToggleAutoSpeak,
  onToggleActivity,
  onOpenSettings,
  onOpenCapabilities,
}: WorkspaceCommandPaletteProps) {
  const { setMode } = useAppTheme();

  const items: SearchableItem<PaletteAux>[] = useMemo(() => {
    const actions: SearchableItem<PaletteAux>[] = [
      {
        id: 'action:new',
        label: 'New conversation',
        auxiliaryData: {
          group: 'Workspace',
          aliases: ['new chat', 'reset', 'clear', 'thread'],
          Icon: SquarePen,
        },
      },
      {
        id: 'action:activity',
        label: 'Toggle activity & telemetry',
        auxiliaryData: {
          group: 'Workspace',
          aliases: ['drawer', 'rail', 'tools', 'ics', 'logs', 'audio'],
          shortcut: '⌘I',
          Icon: Activity,
        },
      },
      {
        id: 'action:settings',
        label: 'Voice & appearance settings',
        auxiliaryData: {
          group: 'Workspace',
          aliases: ['preferences', 'speed', 'voice', 'theme'],
          shortcut: '⌘,',
          Icon: SlidersHorizontal,
        },
      },
      {
        id: 'action:capabilities',
        label: 'View capabilities & tools',
        auxiliaryData: {
          group: 'Workspace',
          aliases: ['calendar', 'smart home', 'tools', 'help'],
          Icon: Sparkles,
        },
      },
      ...(sttSupported
        ? [
            {
              id: 'action:voice',
              label: isListening ? 'Stop voice listening' : 'Start voice listening',
              auxiliaryData: {
                group: 'Voice',
                aliases: ['mic', 'microphone', 'speech', 'dictate'],
                Icon: Mic,
              },
            },
          ]
        : []),
      {
        id: 'action:tts',
        label: autoSpeak ? 'Mute automatic spoken replies' : 'Enable automatic spoken replies',
        auxiliaryData: {
          group: 'Voice',
          aliases: ['tts', 'speak', 'read aloud', 'audio'],
          Icon: Volume2,
        },
      },
      {
        id: 'theme:light',
        label: 'Switch theme to Light',
        auxiliaryData: {
          group: 'Appearance',
          aliases: ['day', 'bright'],
          Icon: Sun,
        },
      },
      {
        id: 'theme:dark',
        label: 'Switch theme to Dark',
        auxiliaryData: {
          group: 'Appearance',
          aliases: ['night'],
          Icon: Moon,
        },
      },
      {
        id: 'theme:system',
        label: 'Switch theme to System default',
        auxiliaryData: {
          group: 'Appearance',
          aliases: ['auto', 'os'],
          Icon: Monitor,
        },
      },
    ];

    const threadItems: SearchableItem<PaletteAux>[] = conversations.map((c) => ({
      id: `conv:${c.id}`,
      label: c.title?.trim() || 'New conversation',
      auxiliaryData: {
        group: 'Conversations',
        subtitle: c.id === activeConversationId ? 'Current' : undefined,
        aliases: ['thread', 'history', 'switch'],
        Icon: MessageSquare,
      },
    }));

    return [...actions, ...threadItems];
  }, [activeConversationId, autoSpeak, conversations, isListening, sttSupported]);

  const searchSource = useMemo(
    () =>
      createStaticSource(items, {
        keywords: (item) => item.auxiliaryData?.aliases ?? [],
      }),
    [items]
  );

  const handleSelect = (id: string) => {
    onOpenChange(false);
    if (id === 'action:new') {
      onNewConversation();
      return;
    }
    if (id === 'action:activity') {
      onToggleActivity();
      return;
    }
    if (id === 'action:settings') {
      onOpenSettings();
      return;
    }
    if (id === 'action:capabilities') {
      onOpenCapabilities();
      return;
    }
    if (id === 'action:voice') {
      onToggleListening();
      return;
    }
    if (id === 'action:tts') {
      onToggleAutoSpeak();
      return;
    }
    if (id === 'theme:light') {
      setMode('light');
      return;
    }
    if (id === 'theme:dark') {
      setMode('dark');
      return;
    }
    if (id === 'theme:system') {
      setMode('system');
      return;
    }
    if (id.startsWith('conv:')) {
      onSelectConversation(id.slice('conv:'.length));
    }
  };

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={searchSource}
      label="Search threads and workspace commands"
      emptySearchText="No matching threads or commands"
      onValueChange={handleSelect}
      renderItem={(item) => {
        const Icon = item.auxiliaryData?.Icon ?? MessageSquare;
        const badgeText = item.auxiliaryData?.shortcut || item.auxiliaryData?.subtitle;
        return (
          <HStack justify="between" align="center" width="100%" gap={3}>
            <HStack align="center" gap={2}>
              <Icon size={15} aria-hidden="true" />
              <Text type="body">{item.label}</Text>
            </HStack>
            {badgeText ? (
              <Text type="code" color="secondary">
                {badgeText}
              </Text>
            ) : null}
          </HStack>
        );
      }}
    />
  );
}
