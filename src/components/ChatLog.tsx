'use client';

import { useCallback, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Check,
  Clock,
  Copy,
  Lightbulb,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
} from '@astryxdesign/core/Chat';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Grid } from '@astryxdesign/core/Grid';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Timestamp } from '@astryxdesign/core/Timestamp';
import { useToast } from '@astryxdesign/core/Toast';
import type { AssistantStatus, Message, ToolEvent } from '@/types/types';
import { WelcomeSignal } from './design/BrandMark';
import ToolEventList from './ToolEventList';

const STARTER_PROMPTS = [
  {
    id: 'calendar',
    title: 'Schedule meeting',
    description: 'Draft a 30-min team sync tomorrow at 10am (.ics invite)',
    prompt: 'Schedule a team sync tomorrow at 10:00 AM for 30 minutes',
    Icon: Calendar,
  },
  {
    id: 'smarthome',
    title: 'Smart home (Simulated)',
    description: 'Dim living room lights to 40% warm white',
    prompt: 'Set the living room lights to 40%',
    Icon: Lightbulb,
  },
  {
    id: 'math',
    title: 'Quick calculation',
    description: 'Split $128.40 evenly across 4 people with 18% tip',
    prompt: 'Calculate 128.40 * 1.18 / 4',
    Icon: Calculator,
  },
  {
    id: 'time',
    title: 'World clock',
    description: 'Check the current time in Tokyo and London',
    prompt: 'What time is it right now in Tokyo and London?',
    Icon: Clock,
  },
] as const;

export interface ChatLogProps {
  messages: Message[];
  status: AssistantStatus;
  toolEvents: ToolEvent[];
  onDismissToolEvent: (id: string) => void;
  onSelectPrompt: (prompt: string) => void;
  onSpeakMessage: (text: string) => void;
  onRetryLastMessage: () => void;
  ttsSupported: boolean;
  isDegraded?: boolean;
  composer: ReactNode;
}

export default function ChatLog({
  messages,
  status,
  toolEvents,
  onDismissToolEvent,
  onSelectPrompt,
  onSpeakMessage,
  onRetryLastMessage,
  ttsSupported,
  isDegraded,
  composer,
}: ChatLogProps) {
  const showToast = useToast();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const anyStreaming = messages.some((m) => m.isStreaming);
  const showThinkingSkeleton =
    status === 'processing' &&
    !messages.some((m) => m.role === 'assistant' && m.isStreaming && m.content.trim().length > 0);
  const useContentVisibility = messages.length > 50;

  const handleSafeLinkClick = useCallback(
    (href: string, event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      try {
        const parsed = new URL(href);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
          return false;
        }
      } catch {
        // Block relative/malformed/unsafe URLs cleanly
      }
      showToast({
        type: 'error',
        body: 'Blocked unsafe or unsupported link protocol.',
      });
      return false;
    },
    [showToast]
  );

  const handleCopy = useCallback(
    async (msg: Message) => {
      try {
        await navigator.clipboard.writeText(msg.content);
        setCopiedMessageId(msg.id);
        showToast({
          type: 'info',
          body: 'Copied reply to clipboard',
          uniqueID: 'copy-reply',
        });
        window.setTimeout(() => {
          setCopiedMessageId((curr) => (curr === msg.id ? null : curr));
        }, 1800);
      } catch {
        showToast({
          type: 'error',
          body: 'Could not access clipboard.',
        });
      }
    },
    [showToast]
  );

  const emptyState = (
    <VStack gap={4} align="center" width="100%" maxWidth={680} paddingInline={4}>
      <EmptyState
        headingLevel={1}
        icon={<WelcomeSignal size={52} />}
        title="Ask by voice, text, or image"
        description={
          isDegraded
            ? 'Running in local demo fallback mode (no external AI provider key configured). Tool workflows and voice still work.'
            : 'Speak naturally, drop a photo or screenshot, or pick an example below to get started.'
        }
      />
      <Grid columns={{ minWidth: 230, max: 2 }} gap={3} width="100%">
        {STARTER_PROMPTS.map(({ id, title, description, prompt, Icon }) => (
          <ClickableCard
            key={id}
            label={`${title}: ${description}`}
            padding={3}
            onClick={() => onSelectPrompt(prompt)}
          >
            <VStack gap={1}>
              <HStack gap={2} align="center">
                <Icon size={15} aria-hidden="true" />
                <Text type="label">{title}</Text>
              </HStack>
              <Text type="supporting" color="secondary" maxLines={2}>
                {description}
              </Text>
            </VStack>
          </ClickableCard>
        ))}
      </Grid>
    </VStack>
  );

  const hasContent = messages.length > 0 || toolEvents.length > 0;

  return (
    <ChatLayout composer={composer} emptyState={emptyState} density="balanced">
      {hasContent ? (
        <ChatMessageList align="top" isStreaming={anyStreaming}>
          {messages.map((msg, idx) => {
            if (msg.role === 'system') {
              return (
                <ChatSystemMessage
                  key={msg.id}
                  icon={<AlertTriangle size={14} aria-hidden="true" />}
                  className={useContentVisibility ? 'vox-cv-auto' : undefined}
                >
                  {msg.content}
                </ChatSystemMessage>
              );
            }

            const isUser = msg.role === 'user';
            const isLast = idx === messages.length - 1;
            const isoTime = new Date(msg.timestamp).toISOString();

            return (
              <ChatMessage
                key={msg.id}
                sender={isUser ? 'user' : 'assistant'}
                name={isUser ? 'You' : 'Voxelle'}
                className={useContentVisibility ? 'vox-cv-auto' : undefined}
                metadata={
                  <ChatMessageMetadata
                    timestamp={
                      <Timestamp value={isoTime} format="time" />
                    }
                    status={msg.truncated ? 'error' : undefined}
                    footer={
                      !isUser && !msg.isStreaming && msg.content.trim().length > 0 ? (
                        <HStack gap={1} align="center">
                          <IconButton
                            label={copiedMessageId === msg.id ? 'Copied' : 'Copy reply'}
                            tooltip="Copy Markdown reply"
                            icon={
                              copiedMessageId === msg.id ? (
                                <Check size={14} aria-hidden="true" />
                              ) : (
                                <Copy size={14} aria-hidden="true" />
                              )
                            }
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(msg)}
                          />
                          {ttsSupported && !msg.truncated ? (
                            <IconButton
                              label="Read reply aloud"
                              tooltip="Speak aloud"
                              icon={<Volume2 size={14} aria-hidden="true" />}
                              variant="ghost"
                              size="sm"
                              onClick={() => onSpeakMessage(msg.content)}
                            />
                          ) : null}
                          {isLast && msg.truncated ? (
                            <Button
                              label="Retry"
                              icon={<RefreshCw size={13} aria-hidden="true" />}
                              variant="secondary"
                              size="sm"
                              onClick={onRetryLastMessage}
                            />
                          ) : null}
                        </HStack>
                      ) : undefined
                    }
                  />
                }
              >
                <ChatMessageBubble variant={isUser ? 'filled' : 'ghost'}>
                  <VStack gap={2}>
                    {msg.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local base64 data URI preview cannot use next/image optimizer
                      <img
                        src={msg.image}
                        alt="Uploaded attachment"
                        className="max-h-56 w-auto rounded-[var(--radius-element)] border border-[var(--color-border)] object-contain"
                      />
                    ) : null}

                    {isUser ? (
                      <Text type="body">{msg.content}</Text>
                    ) : (
                      <Markdown
                        isStreaming={Boolean(msg.isStreaming)}
                        onLinkClick={handleSafeLinkClick}
                      >
                        {msg.content}
                      </Markdown>
                    )}

                    {msg.truncated ? (
                      <Banner
                        status="warning"
                        title="Response interrupted"
                        description="This reply ended before finishing and was excluded from spoken playback."
                        endContent={
                          isLast ? (
                            <Button
                              label="Retry"
                              size="sm"
                              variant="secondary"
                              onClick={onRetryLastMessage}
                            />
                          ) : undefined
                        }
                      />
                    ) : null}
                  </VStack>
                </ChatMessageBubble>
              </ChatMessage>
            );
          })}

          {showThinkingSkeleton ? (
            <ChatMessage sender="assistant" name="Voxelle">
              <ChatMessageBubble variant="ghost">
                <VStack gap={2}>
                  <Skeleton width={260} height={14} index={0} />
                  <Skeleton width={200} height={14} index={1} />
                </VStack>
              </ChatMessageBubble>
            </ChatMessage>
          ) : null}

          {toolEvents.length > 0 ? (
            <ToolEventList
              events={toolEvents}
              onDismiss={onDismissToolEvent}
              defaultExpanded
            />
          ) : null}
        </ChatMessageList>
      ) : null}
    </ChatLayout>
  );
}
