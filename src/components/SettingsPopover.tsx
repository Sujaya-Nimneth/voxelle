'use client';

import { Monitor, Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Popover } from '@astryxdesign/core/Popover';
import { Selector, type SelectorOptionData } from '@astryxdesign/core/Selector';
import { Slider } from '@astryxdesign/core/Slider';
import { VStack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import type { SpeechSettings } from '@/hooks/useSpeechSynthesis';
import { useAppTheme, type ThemeMode } from './AppThemeProvider';

export interface SettingsPopoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  ttsSupported: boolean;
  ttsSettings: SpeechSettings;
  onUpdateTtsSettings: (partial: Partial<SpeechSettings>) => void;
  voices: SpeechSynthesisVoice[];
}

const THEME_OPTIONS: SelectorOptionData[] = [
  { value: 'system', label: 'System default', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function SettingsPopover({
  isOpen,
  onOpenChange,
  autoSpeak,
  onToggleAutoSpeak,
  ttsSupported,
  ttsSettings,
  onUpdateTtsSettings,
  voices,
}: SettingsPopoverProps) {
  const { mode, setMode } = useAppTheme();

  const voiceOptions: SelectorOptionData[] = [
    { value: '', label: 'System default voice' },
    ...voices.map((v) => ({
      value: v.voiceURI,
      label: `${v.name} (${v.lang})`,
    })),
  ];

  const popoverBody = (
    <VStack gap={4}>
      <Heading level={3}>Voice & appearance</Heading>

      <Selector
        label="Theme"
        options={THEME_OPTIONS}
        value={mode}
        onChange={(next) => {
          if (next === 'light' || next === 'dark' || next === 'system') {
            setMode(next as ThemeMode);
          }
        }}
        width="100%"
      />

      <Divider />

      <VStack gap={3}>
        <Switch
          label="Speak replies aloud"
          description={
            ttsSupported
              ? 'Read finalized replies automatically'
              : 'Text-to-speech is unavailable in this browser'
          }
          value={autoSpeak}
          isDisabled={!ttsSupported}
          onChange={() => onToggleAutoSpeak()}
        />

        <Slider
          label="Speech speed"
          min={0.7}
          max={1.5}
          step={0.1}
          value={ttsSettings.rate}
          isDisabled={!ttsSupported}
          valueDisplay="text"
          formatValue={(v) => `${v.toFixed(1)}×`}
          onChange={(rate: number) => onUpdateTtsSettings({ rate })}
          width="100%"
        />

        <Selector
          label="Voice"
          options={voiceOptions}
          value={ttsSettings.voiceURI ?? ''}
          hasSearch={voiceOptions.length > 6}
          isDisabled={!ttsSupported || voices.length === 0}
          onChange={(voiceURI) =>
            onUpdateTtsSettings({ voiceURI: voiceURI || undefined })
          }
          width="100%"
        />
      </VStack>

      <Text type="supporting" color="secondary">
        Shortcuts: ⌘K commands · ⌘I activity · ⌘, settings · / focus input · Esc mute speech
      </Text>
    </VStack>
  );

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      presentation="adaptive"
      placement="below"
      alignment="end"
      width={340}
      padding={4}
      label="Voice and appearance settings"
      hasCloseButton
      content={popoverBody}
    >
      <IconButton
        label="Voice and display settings"
        tooltip="Settings (⌘,)"
        icon={<SlidersHorizontal size={18} aria-hidden="true" />}
        variant="ghost"
        size="sm"
      />
    </Popover>
  );
}
