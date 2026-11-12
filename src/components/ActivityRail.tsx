'use client';

import { useEffect, useState } from 'react';
import { Activity, Cpu, ShieldCheck, Wrench } from 'lucide-react';
import { Badge } from '@astryxdesign/core/Badge';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import type { AssistantStatus, SessionEvent, ToolEvent } from '@/types/types';
import AudioMeter from './AudioMeter';
import StatusBadge from './StatusBadge';
import ToolEventList from './ToolEventList';

function useIsMobile(breakpointPx = 767): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);

  return isMobile;
}

export interface ActivityRailProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  status: AssistantStatus;
  toolEvents: ToolEvent[];
  sessionEvents: SessionEvent[];
  onDismissToolEvent: (id: string) => void;
  activeProvider?: string;
  activeModel?: string;
  isDegraded?: boolean;
  degradedReason?: string | null;
}

export default function ActivityRail({
  isOpen,
  onOpenChange,
  status,
  toolEvents,
  sessionEvents,
  onDismissToolEvent,
  activeProvider,
  activeModel,
  isDegraded,
  degradedReason,
}: ActivityRailProps) {
  const isMobile = useIsMobile();
  const useContentVisibility = sessionEvents.length > 50;

  const bodyContent = (
    <VStack gap={4}>
      <Card padding={3}>
        <VStack gap={2}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <Cpu size={15} aria-hidden="true" />
              <Text type="label">Runtime status</Text>
            </HStack>
            <StatusBadge status={status} isDegraded={isDegraded} />
          </HStack>
          <Text type="supporting" color="secondary">
            {isDegraded
              ? degradedReason || 'Demo fallback active (no external API key configured).'
              : activeProvider && activeModel
                ? `${activeProvider} · ${activeModel}`
                : 'Ready to process voice, text, or image prompts.'}
          </Text>
        </VStack>
      </Card>

      <AudioMeter status={status} />

      <VStack gap={2}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            <Wrench size={15} aria-hidden="true" />
            <Heading level={3}>Tool outputs</Heading>
          </HStack>
          {toolEvents.length > 0 ? (
            <Badge variant="info" label={toolEvents.length} />
          ) : null}
        </HStack>

        {toolEvents.length > 0 ? (
          <ToolEventList
            events={toolEvents}
            onDismiss={onDismissToolEvent}
            defaultExpanded
          />
        ) : (
          <EmptyState
            isCompact
            title="No active tool outputs"
            description="Calendar invites (.ics), simulated smart-home updates, calculations, and lookups appear here and inline."
          />
        )}
      </VStack>

      <Divider />

      <VStack gap={2}>
        <HStack justify="between" align="center">
          <HStack gap={2} align="center">
            <Activity size={15} aria-hidden="true" />
            <Heading level={3}>Session log</Heading>
          </HStack>
          <Badge variant="neutral" label={sessionEvents.length} />
        </HStack>

        {sessionEvents.length > 0 ? (
          <List density="compact">
            {sessionEvents.map((ev) => (
              <ListItem
                key={ev.id}
                label={ev.title}
                description={ev.subtitle}
                className={useContentVisibility ? 'vox-cv-auto' : undefined}
                endContent={
                  <Timestamp
                    value={new Date(ev.timestamp).toISOString()}
                    format="time"
                  />
                }
              />
            ))}
          </List>
        ) : (
          <Text type="supporting" color="secondary">
            Voice, model, and tool transitions will log here as you interact.
          </Text>
        )}
      </VStack>

      <Card variant="muted" padding={3}>
        <HStack gap={2} align="start">
          <ShieldCheck size={16} aria-hidden="true" />
          <VStack gap={1}>
            <Text type="label">Audio privacy</Text>
            <Text type="supporting" color="secondary">
              Microphone analysis happens locally in your browser. Only text transcripts and attached images are sent to the assistant endpoint.
            </Text>
          </VStack>
        </HStack>
      </Card>
    </VStack>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label="Telemetry and tool activity"
        height="tall"
        purpose="info"
      >
        <VStack gap={3}>
          <DrawerHeader
            title="Activity & telemetry"
            subtitle="Live audio, tools, and session events"
            onOpenChange={onOpenChange}
            hasDivider
          />
          {bodyContent}
        </VStack>
      </BottomSheet>
    );
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Telemetry and tool activity"
      side="end"
      width={380}
      purpose="info"
      padding={0}
    >
      <Layout
        height="fill"
        header={
          <DrawerHeader
            title="Activity & telemetry"
            subtitle="Live audio, tools, and session events"
            onOpenChange={onOpenChange}
            hasDivider
          />
        }
        content={<LayoutContent padding={4}>{bodyContent}</LayoutContent>}
      />
    </Drawer>
  );
}
