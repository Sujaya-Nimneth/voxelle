'use client';

import { useState } from 'react';
import {
  MessageSquare,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { IconButton } from '@astryxdesign/core/IconButton';
import { MoreMenu } from '@astryxdesign/core/MoreMenu';
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { ConversationMeta } from '@/hooks/useConversations';
import BrandMark from './design/BrandMark';

export interface SidebarProps {
  conversations: ConversationMeta[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenCommandPalette: () => void;
  onOpenCapabilities: () => void;
  onOpenSettings: () => void;
  activeProvider?: string;
  activeModel?: string;
  isDegraded?: boolean;
  degradedReason?: string | null;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenCommandPalette,
  onOpenCapabilities,
  onOpenSettings,
  activeProvider,
  activeModel,
  isDegraded,
  degradedReason,
}: SidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const targetConversation = conversations.find((c) => c.id === confirmDeleteId);
  const useContentVisibility = conversations.length > 50;

  return (
    <>
      <SideNav
        header={
          <SideNavHeading
            icon={<BrandMark size={24} />}
            heading="Voxelle"
            subheading={isDegraded ? 'Demo fallback' : activeProvider || 'Voice workspace'}
            headerEndContent={
              isDegraded ? (
                <Badge variant="warning" label="Demo" />
              ) : (
                <Badge variant="neutral" label="Beta" />
              )
            }
          />
        }
        topContent={
          <VStack gap={2}>
            <Button
              label="New conversation"
              icon={<SquarePen size={16} aria-hidden="true" />}
              variant="secondary"
              width="full"
              onClick={onNewConversation}
            />
            <Button
              label="Search & commands"
              icon={<Search size={16} aria-hidden="true" />}
              endContent={<Text type="code" color="secondary">⌘K</Text>}
              variant="ghost"
              width="full"
              onClick={onOpenCommandPalette}
            />
          </VStack>
        }
        footer={
          <VStack gap={2}>
            <Divider />
            <Text type="supporting" color="secondary">
              {isDegraded && degradedReason
                ? degradedReason
                : activeModel
                  ? `Model: ${activeModel}`
                  : 'Microphone audio stays in your browser; messages go to the assistant API.'}
            </Text>
          </VStack>
        }
        footerIcons={
          <>
            <IconButton
              label="Capabilities"
              tooltip="Capabilities & tools"
              icon={<Sparkles size={16} aria-hidden="true" />}
              variant="ghost"
              size="sm"
              onClick={onOpenCapabilities}
            />
            <IconButton
              label="Voice and display settings"
              tooltip="Settings (⌘,)"
              icon={<SlidersHorizontal size={16} aria-hidden="true" />}
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
            />
          </>
        }
      >
        <SideNavSection title="Threads">
          {conversations.map((conv) => {
            const label = conv.title?.trim() || 'New conversation';
            const canDelete = conversations.length > 1;
            return (
              <SideNavItem
                key={conv.id}
                label={label}
                icon={MessageSquare}
                isSelected={conv.id === activeConversationId}
                onClick={() => onSelectConversation(conv.id)}
                className={useContentVisibility ? 'vox-cv-auto' : undefined}
                actions={
                  canDelete ? (
                    <MoreMenu
                      label={`Options for ${label}`}
                      size="sm"
                      items={[
                        {
                          id: 'delete',
                          label: 'Delete thread',
                          icon: Trash2,
                          variant: 'destructive',
                          onClick: () => setConfirmDeleteId(conv.id),
                        },
                      ]}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </SideNavSection>
      </SideNav>

      <AlertDialog
        isOpen={Boolean(confirmDeleteId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete conversation?"
        description={`This will permanently remove "${targetConversation?.title?.trim() || 'New conversation'}" from local browser storage.`}
        cancelLabel="Cancel"
        actionLabel="Delete"
        actionVariant="destructive"
        onAction={() => {
          if (confirmDeleteId) {
            onDeleteConversation(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
      />
    </>
  );
}
