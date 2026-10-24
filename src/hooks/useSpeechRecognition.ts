'use client';

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { audioLevelsStore, AUDIO_BAND_COUNT } from '@/lib/audioLevels';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  error: string | null;
  isSupported: boolean;
}

function emptySubscribe() {
  return () => {};
}

function getSttClientSnapshot(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

function getSttServerSnapshot(): boolean {
  return false;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = useSyncExternalStore(
    emptySubscribe,
    getSttClientSnapshot,
    getSttServerSnapshot
  );

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Number of results already folded into the final transcript this session.
  // The results list is cumulative and finalized results are immutable, so a
  // monotonic cursor both dedupes and captures finals the engine has moved
  // past event.resultIndex (slicing from resultIndex drops earlier finals).
  const finalizedCountRef = useRef(0);

  // Audio analyzer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // Generation token: bumped whenever the analyser is stopped or restarted.
  // Async getUserMedia continuations compare against it so a stop that raced
  // the permission prompt can't reinstate a leaked stream or rAF loop.
  const analyserGenerationRef = useRef(0);

  const stopAudioAnalyser = useCallback(() => {
    analyserGenerationRef.current++;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    audioLevelsStore.reset();
  }, []);

  const startAudioAnalyser = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const generation = ++analyserGenerationRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (analyserGenerationRef.current !== generation) {
        // Stopped while the permission prompt was pending — abandon this stream.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (analyserGenerationRef.current !== generation || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Map into distinct frequency bands
        const bands = AUDIO_BAND_COUNT;
        const levels: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / bands));

        for (let b = 0; b < bands; b++) {
          let sum = 0;
          for (let s = 0; s < step; s++) {
            sum += dataArray[b * step + s] || 0;
          }
          const avg = sum / (step * 255);
          levels.push(Math.max(0.08, Math.min(1, avg * 1.5)));
        }

        audioLevelsStore.setLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
    } catch {
      // Audio stream error is handled gracefully without breaking STT
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      const results = event.results;
      // Consume newly finalized segments in order; stop at the first interim
      // (it may still change, and anything behind it isn't final yet either).
      while (
        finalizedCountRef.current < results.length &&
        results[finalizedCountRef.current].isFinal
      ) {
        final += results[finalizedCountRef.current][0].transcript;
        finalizedCountRef.current++;
      }
      for (let i = finalizedCountRef.current; i < results.length; ++i) {
        interim += results[i][0].transcript;
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final) {
        setInterimTranscript('');
        setTranscript((prev) => `${prev} ${final}`.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') {
        // Deliberate abort (new session or unmount): still release the mic
        // stream and meter loop; just don't surface it as a user-facing error.
        stopAudioAnalyser();
        setIsListening(false);
        return;
      }

      console.error('Speech recognition error:', event.error);
      switch (event.error) {
        case 'not-allowed':
          setError(
            'Microphone access was denied. Please allow microphone access in your browser settings.'
          );
          break;
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone found. Please connect a microphone and try again.');
          break;
        case 'network':
          setError('Network error occurred during speech recognition. Please check your connection.');
          break;
        default:
          setError(`Speech recognition notice: ${event.error}`);
      }
      stopAudioAnalyser();
      setIsListening(false);
    };

    recognition.onend = () => {
      stopAudioAnalyser();
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      stopAudioAnalyser();
    };
  }, [stopAudioAnalyser]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    finalizedCountRef.current = 0;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      startAudioAnalyser();
    } catch (err) {
      console.warn('Speech recognition already active or unavailable:', err);
    }
  }, [isSupported, startAudioAnalyser]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (err) {
      console.warn('Speech recognition stop notice:', err);
    }
    stopAudioAnalyser();
    setIsListening(false);
  }, [stopAudioAnalyser]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    clearTranscript,
    error,
    isSupported,
  };
}
