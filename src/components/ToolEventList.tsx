'use client';

import { Calendar, Download, X } from 'lucide-react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { ChatToolCalls, type ChatToolCallItem } from '@astryxdesign/core/Chat';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { ToolCallArgs, ToolEvent } from '@/types/types';

export function downloadIcsFile(icsContent: string, title?: string) {
  const slug = (title || 'voxelle-event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'voxelle-event';
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function summarizeArgs(name: string, args: ToolCallArgs): string | undefined {
  if (name === 'add_calendar_event' && args.title) {
    const when = [args.date, args.time].filter(Boolean).join(' · ');
    return when ? `${args.title} (${when})` : String(args.title);
  }
  if (name === 'toggle_smart_home_device' && args.device_name) {
    return args.state ? `${args.device_name}: ${args.state}` : String(args.device_name);
  }
  return Object.entries(args)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ') || undefined;
}

const TOOL_LABELS: Record<string, string> = {
  add_calendar_event: 'Calendar invite',
  toggle_smart_home_device: 'Smart home (Simulated)',
};

export interface ToolEventListProps {
  events: ToolEvent[];
  onDismiss?: (id: string) => void;
  defaultExpanded?: boolean;
}

/**
 * Shared renderer for Voxelle tool execution events using Astryx `ChatToolCalls`.
 * Used both inline inside the conversation surface (so `.ics` downloads and
 * simulation notices are immediately actionable) and inside the Telemetry drawer.
 */
export default function ToolEventList({
  events,
  onDismiss,
  defaultExpanded = true,
}: ToolEventListProps) {
  if (events.length === 0) return null;

  const icsEvents = events.filter((ev) => Boolean(ev.ics));
  const hasSimulated = events.some((ev) => Boolean(ev.simulated));
  const useContentVisibility = events.length > 50;

  const calls: ChatToolCallItem[] = events.map((ev) => ({
    key: ev.id,
    name: TOOL_LABELS[ev.toolCall.name] || ev.toolCall.name,
    status: ev.toolCall.status === 'executing' ? 'running' : 'complete',
    target: summarizeArgs(ev.toolCall.name, ev.toolCall.arguments),
    node: ev.simulated ? 'Simulated' : undefined,
    resultDetail: (
      <VStack gap={2} className={useContentVisibility ? 'vox-cv-auto' : undefined}>
        {ev.result ? (
          <Text type="supporting" color="primary">
            {ev.result}
          </Text>
        ) : null}
        {ev.simulated ? (
          <Banner
            status="warning"
            title="Simulated — no device connected"
            description="Smart-home state changes are simulated locally for demonstration."
          />
        ) : null}
        {ev.ics || onDismiss ? (
          <HStack gap={2} wrap="wrap">
            {ev.ics ? (
              <Button
                label="Download .ics"
                icon={<Download size={14} aria-hidden="true" />}
                variant="primary"
                size="sm"
                onClick={() =>
                  downloadIcsFile(
                    ev.ics!,
                    ev.toolCall.arguments.title ? String(ev.toolCall.arguments.title) : undefined
                  )
                }
              />
            ) : null}
            {onDismiss ? (
              <Button
                label="Dismiss"
                icon={<X size={14} aria-hidden="true" />}
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(ev.id)}
              />
            ) : null}
          </HStack>
        ) : null}
      </VStack>
    ),
  }));

  return (
    <VStack gap={2}>
      <ChatToolCalls
        calls={calls}
        label={`Tool activity (${events.length})`}
        defaultIsExpanded={defaultExpanded}
      />
      {/* Keep .ics download and simulated device disclosure immediately actionable without expanding */}
      {hasSimulated ? (
        <Banner
          status="warning"
          title="Simulated — no device connected"
          description="Smart-home actions simulate local state changes only."
        />
      ) : null}
      {icsEvents.length > 0 ? (
        <HStack gap={2} wrap="wrap">
          {icsEvents.map((ev) => (
            <Button
              key={`ics-${ev.id}`}
              label={`Download ${ev.toolCall.arguments.title || 'event'}.ics`}
              icon={<Calendar size={14} aria-hidden="true" />}
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadIcsFile(
                  ev.ics!,
                  ev.toolCall.arguments.title ? String(ev.toolCall.arguments.title) : undefined
                )
              }
            />
          ))}
        </HStack>
      ) : null}
    </VStack>
  );
}
