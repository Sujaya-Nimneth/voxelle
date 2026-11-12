'use client';

import { Calendar, Image as ImageIcon, Lightbulb, Mic, Play } from 'lucide-react';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Grid } from '@astryxdesign/core/Grid';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { toolDefinitions } from '@/lib/tools';

export interface CapabilitiesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTryPrompt: (prompt: string) => void;
  activeProvider?: string;
  activeModel?: string;
  isDegraded?: boolean;
}

const TOOL_UI_META: Record<
  string,
  {
    title: string;
    badge: string;
    variant: 'info' | 'warning';
    samplePrompt: string;
    Icon: typeof Calendar;
  }
> = {
  add_calendar_event: {
    title: 'Calendar invite (.ics)',
    badge: 'Downloads .ics',
    variant: 'info',
    samplePrompt: 'Schedule a project review tomorrow at 2:00 PM',
    Icon: Calendar,
  },
  toggle_smart_home_device: {
    title: 'Smart home control',
    badge: 'Simulated',
    variant: 'warning',
    samplePrompt: 'Turn on the living room lights',
    Icon: Lightbulb,
  },
};

export default function CapabilitiesDialog({
  isOpen,
  onOpenChange,
  onTryPrompt,
  activeProvider,
  activeModel,
  isDegraded,
}: CapabilitiesDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width={620}
      purpose="info"
      padding={0}
    >
      <Layout
        header={
          <DialogHeader
            title="Voxelle capabilities"
            subtitle={
              isDegraded
                ? 'Demo fallback active — local tool matching & Web Speech'
                : activeProvider && activeModel
                  ? `Powered by ${activeProvider} (${activeModel})`
                  : 'Voice, vision, and tool execution overview'
            }
            onOpenChange={onOpenChange}
            hasDivider
          />
        }
        content={
          <LayoutContent padding={4}>
            <VStack gap={4}>
              <Grid columns={{ minWidth: 240, max: 2 }} gap={3}>
                <Card padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <HStack gap={2} align="center">
                        <Mic size={16} aria-hidden="true" />
                        <Text type="label">Browser voice</Text>
                      </HStack>
                      <Badge variant="success" label="Local DSP" />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      Uses Web Speech recognition, live FFT audio meter visualization, and browser speech synthesis without sending raw mic streams to external servers.
                    </Text>
                  </VStack>
                </Card>

                <Card padding={3}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center">
                      <HStack gap={2} align="center">
                        <ImageIcon size={16} aria-hidden="true" />
                        <Text type="label">Vision attachments</Text>
                      </HStack>
                      <Badge variant="neutral" label="Up to 4 MB" />
                    </HStack>
                    <Text type="supporting" color="secondary">
                      Drag, upload, or paste (⌘V) PNG, JPEG, WebP, or GIF images directly into the composer for visual analysis.
                    </Text>
                  </VStack>
                </Card>

                {toolDefinitions.map((tool) => {
                  const meta = TOOL_UI_META[tool.name];
                  const Icon = meta?.Icon ?? Calendar;
                  return (
                    <Card key={tool.name} padding={3}>
                      <VStack gap={2}>
                        <HStack justify="between" align="center">
                          <HStack gap={2} align="center">
                            <Icon size={16} aria-hidden="true" />
                            <Text type="label">{meta?.title || tool.name}</Text>
                          </HStack>
                          <Badge
                            variant={meta?.variant || 'neutral'}
                            label={meta?.badge || 'Tool'}
                          />
                        </HStack>
                        <Text type="supporting" color="secondary">
                          {tool.description}
                        </Text>
                        {meta?.samplePrompt ? (
                          <HStack justify="end">
                            <Button
                              label="Try example"
                              icon={<Play size={13} aria-hidden="true" />}
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                onOpenChange(false);
                                onTryPrompt(meta.samplePrompt);
                              }}
                            />
                          </HStack>
                        ) : null}
                      </VStack>
                    </Card>
                  );
                })}
              </Grid>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack justify="end" width="100%">
              <Button
                label="Close"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
