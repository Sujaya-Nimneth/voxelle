import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';

export const voxelleTheme = defineTheme({
  name: 'voxelle',
  extends: neutralTheme,
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'var(--font-inter)',
      fallbacks: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    heading: {
      family: 'var(--font-inter)',
      fallbacks: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    },
    code: {
      family: 'ui-monospace',
      fallbacks: '"SF Mono", Menlo, Monaco, Consolas, monospace',
    },
  },
  tokens: {
    '--color-background-body': ['#fafafa', '#0c0d0f'],
    '--color-background-surface': ['#ffffff', '#141517'],
    '--color-background-card': ['#ffffff', '#141517'],
    '--color-background-popover': ['#ffffff', '#202225'],
    '--color-background-muted': ['#f0f0f0', '#202225'],
    '--color-border': ['#e6e6e6', '#232427'],
    '--color-border-emphasized': ['#c9cbcf', '#3a3a3e'],
    '--color-accent': ['#1a6fb0', '#4cb3f0'],
    '--color-accent-muted': ['rgba(26, 111, 176, 0.14)', 'rgba(76, 179, 240, 0.22)'],
    '--color-on-accent': ['#ffffff', '#0c0d0f'],
    '--color-text-accent': ['#1a6fb0', '#4cb3f0'],
    '--color-icon-accent': ['#1a6fb0', '#4cb3f0'],
    '--color-text-primary': ['#111111', '#ffffff'],
    '--color-text-secondary': ['#5f6368', '#b4b4b4'],
    '--color-text-disabled': ['#6b6b6b', '#949494'],
    '--color-icon-primary': ['#111111', '#ffffff'],
    '--color-icon-secondary': ['#5f6368', '#b4b4b4'],
    '--color-icon-disabled': ['#6b6b6b', '#949494'],
    '--color-success': ['#247b50', '#3fc07a'],
    '--color-warning': ['#92400e', '#e5a93b'],
    '--color-error': ['#c4242a', '#e5566f'],
  },
});
