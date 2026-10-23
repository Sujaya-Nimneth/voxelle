// External store for live audio frequency levels.
//
// The speech analyser rAF loop writes levels here at animation-frame speed.
// Only the AudioMeter leaf component subscribes (via useSyncExternalStore),
// so per-frame updates never re-render the page tree.

export const AUDIO_BAND_COUNT = 11;

const IDLE_LEVELS: number[] = new Array(AUDIO_BAND_COUNT).fill(0.12);

type Listener = () => void;

let currentLevels: number[] = IDLE_LEVELS;
const listeners = new Set<Listener>();

export const audioLevelsStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): number[] {
    return currentLevels;
  },

  getServerSnapshot(): number[] {
    return IDLE_LEVELS;
  },

  setLevels(next: number[]): void {
    currentLevels = next;
    listeners.forEach((listener) => listener());
  },

  reset(): void {
    this.setLevels(IDLE_LEVELS);
  },
};
