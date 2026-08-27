import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PlaylistItem {
  id?: string;
  title: string;
  text: string;
  author?: string;
  section?: string;
  url?: string;
  image?: string;
}

interface Props {
  title?: string;
  text?: string;
  playlist?: PlaylistItem[];
  autoPlayNext?: boolean;
}

type Status = 'idle' | 'playing' | 'paused';

const RATES: number[] = [1, 1.25, 1.5, 2];
const WPM = 140; // Words per minute for speech duration estimation

const splitSentences = (raw: string): string[] => {
  if (!raw) return [];
  return raw
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?\u061F\u06D4])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const PlayIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
    <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
  </svg>
);

const PauseIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 320 512" fill="currentColor" className={className} aria-hidden="true">
    <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
  </svg>
);

const StopIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 384 512" fill="currentColor" className={className} aria-hidden="true">
    <path d="M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z" />
  </svg>
);

const SkipBack15Icon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M1 4v6h6" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    <text x="12" y="15.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontWeight="bold" fontFamily="sans-serif">15</text>
  </svg>
);

const SkipForward15Icon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    <text x="12" y="15.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7" fontWeight="bold" fontFamily="sans-serif">15</text>
  </svg>
);

const PlaylistIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

const RadioIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 640 512" fill="currentColor" className={className} aria-hidden="true">
    <path d="M533.6 57.4C515.3 40.5 486.5 41.7 469.6 60l-19.5 21.1c-12 13-11.1 33.3 .9 45.3l.4 .4c60 60 60 159.1 0 219.1l-.4 .4c-12 12-12.9 32.3-.9 45.3l19.5 21.1c16.9 18.3 45.7 19.4 64 2.5c78.1-71.4 122.4-172.5 122.4-278.9S611.7 128.8 533.6 57.4zM400 96a48 48 0 1 0 -96 0v51.2c-88 14.3-160 91.2-160 184.8 0 98.4 83.6 176 180.8 176c15.7 0 31.1-1.9 45.9-5.6c-8.3-25.6-3.5-54.5 15-76.1c-20.7 12.9-45.1 20.3-71.3 20.3c-66.7 0-120.8-51.4-120.8-114.7c0-63.3 54.1-114.7 120.8-114.7c26.2 0 50.6 7.4 71.3 20.3c-18.5-21.6-23.3-50.5-15-76.1c-14.8-3.7-30.2-5.6-45.9-5.6V96z" />
  </svg>
);

const ChevronDownIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const CloseIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const NextTrackIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M5 4l10 8-10 8V4zM17 4h2v16h-2V4z" />
  </svg>
);

export default function AudioPlayer({
  title = '',
  text = '',
  playlist = [],
  autoPlayNext = true,
}: Props) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [continuousStream, setContinuousStream] = useState(autoPlayNext);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const chunkStartedAtRef = useRef(0);

  // Normalize playlist: if empty, build from single title & text
  const tracks: PlaylistItem[] = useMemo(() => {
    if (playlist && playlist.length > 0) {
      return playlist;
    }
    if (title || text) {
      return [{ title, text }];
    }
    return [];
  }, [playlist, title, text]);

  const activeTrack: PlaylistItem | undefined = tracks[currentTrackIndex] || tracks[0];

  // Prepare chunks for active track
  const chunks = useMemo(() => {
    if (!activeTrack) return [];
    const fullText = activeTrack.title
      ? `${activeTrack.title}. ${activeTrack.text}`
      : activeTrack.text;
    return splitSentences(fullText);
  }, [activeTrack]);

  // Duration calculations
  const chunkDurations = useMemo(() => {
    return chunks.map((chunk) => {
      const words = chunk.split(/\s+/).filter(Boolean).length;
      return Math.max(1.5, (words / WPM) * 60);
    });
  }, [chunks]);

  const totalBaseDuration = useMemo(() => {
    return chunkDurations.reduce((acc, d) => acc + d, 0);
  }, [chunkDurations]);

  const totalDuration = useMemo(() => {
    return Math.max(1, totalBaseDuration / rate);
  }, [totalBaseDuration, rate]);

  const chunkStartTimes = useMemo(() => {
    const starts: number[] = [];
    let cum = 0;
    for (let i = 0; i < chunkDurations.length; i++) {
      starts.push(cum / rate);
      cum += chunkDurations[i];
    }
    return starts;
  }, [chunkDurations, rate]);

  // Check SpeechSynthesis support & load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setSupported(true);

    const loadVoices = () => {
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      const match = voices.find((v) => v.lang.toLowerCase().startsWith('ha'));
      setVoice(match ?? null);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        runIdRef.current += 1;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Monitor scrolling past the hero / inline container
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === 'undefined') return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      // Scrolled past when inline container is completely above the viewport top
      setIsScrolledPast(rect.bottom < 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update current time timer while playing
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      const startSec = chunkStartTimes[chunkIndex] || 0;
      const dur = (chunkDurations[chunkIndex] || 1.5) / rate;
      const elapsed = (Date.now() - chunkStartedAtRef.current) / 1000;
      const progressInChunk = Math.min(dur, Math.max(0, elapsed));
      const nowTime = Math.min(totalDuration, startSec + progressInChunk);
      setCurrentTime(nowTime);
    }, 100);

    return () => clearInterval(interval);
  }, [status, chunkIndex, chunkStartTimes, chunkDurations, rate, totalDuration]);

  // Speech playback engine
  const speakFrom = useCallback(
    (startChunk: number, nextRate: number, trackIdx = currentTrackIndex) => {
      const synth = window.speechSynthesis;
      if (!synth) return;

      if (startChunk >= chunks.length) {
        runIdRef.current += 1;
        // Check continuous stream for next story in playlist
        if (continuousStream && trackIdx < tracks.length - 1) {
          const nextIdx = trackIdx + 1;
          setCurrentTrackIndex(nextIdx);
          setChunkIndex(0);
          setCurrentTime(0);
          // Small timeout to allow state to settle
          setTimeout(() => {
            const nextTrack = tracks[nextIdx];
            if (!nextTrack) return;
            const nextChunks = splitSentences(
              nextTrack.title ? `${nextTrack.title}. ${nextTrack.text}` : nextTrack.text,
            );
            if (nextChunks.length === 0) return;

            const id = ++runIdRef.current;
            const utterance = new SpeechSynthesisUtterance(nextChunks[0]);
            utterance.rate = nextRate;
            if (voice) utterance.voice = voice;
            chunkStartedAtRef.current = Date.now();
            setChunkIndex(0);
            setStatus('playing');

            utterance.onend = () => {
              if (runIdRef.current !== id) return;
              speakFrom(1, nextRate, nextIdx);
            };
            utterance.onerror = () => {
              if (runIdRef.current !== id) return;
              setStatus('idle');
              setChunkIndex(0);
              setCurrentTime(0);
            };
            synth.speak(utterance);
          }, 300);
          return;
        }

        setStatus('idle');
        setChunkIndex(0);
        setCurrentTime(0);
        return;
      }

      const id = ++runIdRef.current;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(chunks[startChunk]);
      utterance.rate = nextRate;
      if (voice) utterance.voice = voice;

      chunkStartedAtRef.current = Date.now();
      setChunkIndex(startChunk);
      setCurrentTime(chunkStartTimes[startChunk] || 0);
      setStatus('playing');

      utterance.onend = () => {
        if (runIdRef.current !== id) return;
        speakFrom(startChunk + 1, nextRate, trackIdx);
      };

      utterance.onerror = () => {
        if (runIdRef.current !== id) return;
        setStatus('idle');
        setChunkIndex(0);
        setCurrentTime(0);
      };

      synth.speak(utterance);
    },
    [chunks, continuousStream, currentTrackIndex, tracks, voice, chunkStartTimes],
  );

  const handlePlay = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (status === 'paused') {
      synth.resume();
      chunkStartedAtRef.current = Date.now();
      setStatus('playing');
    } else {
      speakFrom(chunkIndex, rate);
    }
  };

  const handlePause = () => {
    const synth = window.speechSynthesis;
    if (!synth || status !== 'playing') return;
    synth.pause();
    setStatus('paused');
  };

  const handleStop = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    runIdRef.current += 1;
    synth.cancel();
    setStatus('idle');
    setChunkIndex(0);
    setCurrentTime(0);
  };

  // Seek / Scrubber handler
  const handleSeek = (targetSec: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, targetSec));
    setCurrentTime(clamped);

    // Find the chunk corresponding to targetSec
    let targetIdx = 0;
    for (let i = 0; i < chunkStartTimes.length; i++) {
      if (chunkStartTimes[i] <= clamped) {
        targetIdx = i;
      } else {
        break;
      }
    }

    if (status === 'playing') {
      const synth = window.speechSynthesis;
      if (synth) {
        runIdRef.current += 1;
        synth.cancel();
      }
      speakFrom(targetIdx, rate);
    } else {
      setChunkIndex(targetIdx);
    }
  };

  // 15s forward & backward skips
  const handleSkipBack15 = () => {
    handleSeek(currentTime - 15);
  };

  const handleSkipForward15 = () => {
    handleSeek(currentTime + 15);
  };

  // Speed change handler
  const handleRateChange = (nextRate: number) => {
    setRate(nextRate);
    if (status === 'playing') {
      const synth = window.speechSynthesis;
      if (synth) {
        runIdRef.current += 1;
        synth.cancel();
      }
      speakFrom(chunkIndex, nextRate);
    }
  };

  // Switch to another track in the playlist
  const handleSelectTrack = (trackIdx: number) => {
    if (trackIdx === currentTrackIndex && status === 'playing') return;

    const synth = window.speechSynthesis;
    if (synth) {
      runIdRef.current += 1;
      synth.cancel();
    }

    setCurrentTrackIndex(trackIdx);
    setChunkIndex(0);
    setCurrentTime(0);

    // Trigger playback of selected track
    setTimeout(() => {
      const newTrack = tracks[trackIdx];
      if (!newTrack) return;
      const newChunks = splitSentences(
        newTrack.title ? `${newTrack.title}. ${newTrack.text}` : newTrack.text,
      );
      if (newChunks.length === 0) return;

      const id = ++runIdRef.current;
      const utterance = new SpeechSynthesisUtterance(newChunks[0]);
      utterance.rate = rate;
      if (voice) utterance.voice = voice;
      chunkStartedAtRef.current = Date.now();
      setChunkIndex(0);
      setStatus('playing');

      utterance.onend = () => {
        if (runIdRef.current !== id) return;
        speakFrom(1, rate, trackIdx);
      };
      utterance.onerror = () => {
        if (runIdRef.current !== id) return;
        setStatus('idle');
        setChunkIndex(0);
        setCurrentTime(0);
      };
      if (synth) synth.speak(utterance);
    }, 150);
  };

  if (!supported || tracks.length === 0) return null;

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const hasMultipleTracks = tracks.length > 1;

  return (
    <>
      {/* ── 1. Inline Audio Player ──────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="my-8 rounded-2xl bg-gradient-to-br from-[#052962] via-[#09357a] to-[#041d45] text-white p-5 sm:p-6 shadow-xl border border-white/10 relative overflow-hidden"
        role="region"
        aria-label={`Saurari Labari: ${activeTrack?.title || title}`}
      >
        {/* Ambient background glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-yanci-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yanci-accent text-[#052962] flex items-center justify-center font-bold shadow-md shadow-yanci-accent/20 shrink-0">
              {status === 'playing' ? (
                <div className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
                  <span className="w-1 bg-[#052962] rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-full" />
                  <span className="w-1 bg-[#052962] rounded-full animate-[bounce_1.1s_ease-in-out_infinite_0.2s] h-3/4" />
                  <span className="w-1 bg-[#052962] rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.4s] h-1/2" />
                </div>
              ) : (
                <RadioIcon className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-yanci-accent bg-white/10 px-2 py-0.5 rounded">
                  Yanci Audio
                </span>
                {hasMultipleTracks && (
                  <span className="text-[10px] font-bold text-white/70">
                    Labari {currentTrackIndex + 1} na {tracks.length}
                  </span>
                )}
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-white leading-tight mt-0.5">
                Saurari Labaran Yau a Jere
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleTracks && (
              <button
                type="button"
                onClick={() => setContinuousStream(!continuousStream)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  continuousStream
                    ? 'bg-yanci-accent/20 border-yanci-accent text-yanci-accent'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
                title="Kunna labarai a jere ta atomatik"
              >
                <span className={`w-2 h-2 rounded-full ${continuousStream ? 'bg-yanci-accent animate-pulse' : 'bg-white/40'}`} />
                <span>A Jere</span>
              </button>
            )}

            {hasMultipleTracks && (
              <button
                type="button"
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  showPlaylist
                    ? 'bg-white text-[#052962] border-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                }`}
                aria-expanded={showPlaylist}
                aria-label="Jerin labarai masu zuwa"
              >
                <PlaylistIcon className="w-3.5 h-3.5" />
                <span>Jerin Labarai ({tracks.length})</span>
                <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${showPlaylist ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Current Track Info */}
        <div className="relative z-10 my-4">
          <p className="font-serif font-bold text-lg sm:text-xl text-white/95 leading-snug line-clamp-2">
            {activeTrack?.title}
          </p>
          {activeTrack?.section && (
            <p className="text-xs text-white/60 mt-1 font-sans">
              Sashe: <span className="text-yanci-accent font-semibold">{activeTrack.section}</span>
              {activeTrack.author && ` • Daga ${activeTrack.author}`}
            </p>
          )}
        </div>

        {/* Scrubber & Timing */}
        <div className="relative z-10 my-4">
          <div className="relative group">
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.5"
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yanci-accent focus:outline-none"
              aria-label="Matsayin sauti"
            />
            {/* Visual fill track */}
            <div
              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-yanci-accent to-[#ffd700] rounded-lg pointer-events-none transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono font-bold text-white/70 mt-1.5">
            <span>{formatTime(currentTime)}</span>
            <span className="text-yanci-accent font-semibold">{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Speed control */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Gudu:</span>
            <select
              value={rate}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              aria-label="Saurin karatu"
              className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-xs font-bold px-2.5 py-1.5 cursor-pointer text-white transition-colors focus:outline-none focus:ring-2 focus:ring-yanci-accent [&>option]:text-[#052962] [&>option]:bg-white"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </div>

          {/* Core buttons: Skip back 15s, Play/Pause, Skip forward 15s */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleSkipBack15}
              aria-label="Koma baya da dakika 15"
              title="Koma baya da dakika 15"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yanci-accent"
            >
              <SkipBack15Icon className="w-5 h-5" />
            </button>

            {status === 'playing' ? (
              <button
                type="button"
                onClick={handlePause}
                aria-label="Dakata"
                title="Dakata"
                className="w-14 h-14 bg-gradient-to-br from-yanci-accent to-[#e6b800] text-[#052962] rounded-full flex items-center justify-center shadow-lg shadow-yanci-accent/30 hover:scale-105 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <PauseIcon className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                aria-label={status === 'paused' ? 'Ci gaba da sauraro' : 'Fara sauraro'}
                title={status === 'paused' ? 'Ci gaba da sauraro' : 'Fara sauraro'}
                className="w-14 h-14 bg-gradient-to-br from-yanci-accent to-[#e6b800] text-[#052962] rounded-full flex items-center justify-center shadow-lg shadow-yanci-accent/30 hover:scale-105 active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white pl-0.5"
              >
                <PlayIcon className="w-6 h-6" />
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipForward15}
              aria-label="Tafi gaba da dakika 15"
              title="Tafi gaba da dakika 15"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yanci-accent"
            >
              <SkipForward15Icon className="w-5 h-5" />
            </button>
          </div>

          {/* Secondary actions: Next Story / Stop */}
          <div className="flex items-center gap-2">
            {hasMultipleTracks && currentTrackIndex < tracks.length - 1 && (
              <button
                type="button"
                onClick={() => handleSelectTrack(currentTrackIndex + 1)}
                aria-label="Labari na gaba"
                title="Labari na gaba"
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <span>Na Gaba</span>
                <NextTrackIcon className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              aria-label="Tasha sauti"
              title="Tasha sauti"
              disabled={status === 'idle'}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <StopIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Playlist Queue Drawer ───────────────────────────────────── */}
        {showPlaylist && hasMultipleTracks && (
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-serif font-bold text-sm text-yanci-accent flex items-center gap-2">
                <PlaylistIcon className="w-4 h-4" />
                Jerin Labaran Sauraro (Queue)
              </h4>
              <span className="text-[11px] text-white/50">Danna kowane labari don sauraro</span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tracks.map((track, idx) => {
                const isCurrent = idx === currentTrackIndex;
                return (
                  <button
                    key={track.id || idx}
                    type="button"
                    onClick={() => handleSelectTrack(idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 border ${
                      isCurrent
                        ? 'bg-white/15 border-yanci-accent text-white shadow-md'
                        : 'bg-white/5 border-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        isCurrent
                          ? 'bg-yanci-accent text-[#052962]'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {isCurrent && status === 'playing' ? (
                        <div className="flex items-end gap-0.5 h-2.5" aria-hidden="true">
                          <span className="w-0.5 bg-[#052962] rounded-full animate-[bounce_0.6s_ease-in-out_infinite] h-full" />
                          <span className="w-0.5 bg-[#052962] rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.2s] h-3/4" />
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-serif text-sm leading-snug line-clamp-1 ${isCurrent ? 'font-bold text-white' : 'font-medium'}`}>
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-white/50">
                        {track.section && <span className="text-yanci-accent font-semibold">{track.section}</span>}
                        {track.author && <span>• {track.author}</span>}
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-yanci-accent/20 text-yanci-accent px-2 py-0.5 rounded shrink-0">
                        {status === 'playing' ? 'Yana tashi' : 'A tsaye'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Persistent Floating Mini-Player ────────────────────────── */}
      {isScrolledPast && (
        <div
          className={`fixed bottom-0 inset-x-0 z-50 transition-all duration-300 transform ${
            isMinimized ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'
          }`}
          role="complementary"
          aria-label="Dan Karamin Dan Wasan Sauti"
        >
          <div className="bg-[#052962]/95 backdrop-blur-md text-white border-t border-white/15 shadow-[0_-8px_30px_rgba(5,41,98,0.45)]">
            {/* Top edge progress line / scrubber */}
            <div className="relative w-full h-1 bg-white/20 group cursor-pointer">
              <div
                className="absolute top-0 left-0 h-full bg-yanci-accent transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
              <input
                type="range"
                min="0"
                max={totalDuration}
                step="0.5"
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Matsayin sauti (mini-player)"
              />
            </div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
              {/* Left info: Speaker badge + Title + Time */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-yanci-accent text-[#052962] flex items-center justify-center shrink-0 shadow">
                  {status === 'playing' ? (
                    <div className="flex items-end gap-0.5 h-3" aria-hidden="true">
                      <span className="w-0.5 bg-[#052962] rounded-full animate-[bounce_0.8s_infinite] h-full" />
                      <span className="w-0.5 bg-[#052962] rounded-full animate-[bounce_1s_infinite_0.2s] h-2/3" />
                      <span className="w-0.5 bg-[#052962] rounded-full animate-[bounce_0.7s_infinite_0.4s] h-4/5" />
                    </div>
                  ) : (
                    <RadioIcon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-yanci-accent bg-white/10 px-1.5 py-0.2 rounded">
                      Yanci FM
                    </span>
                    <span className="text-xs font-mono font-bold text-white/70">
                      {formatTime(currentTime)} / {formatTime(totalDuration)}
                    </span>
                  </div>
                  <p className="font-serif font-bold text-xs sm:text-sm text-white truncate mt-0.5">
                    {activeTrack?.title}
                  </p>
                </div>
              </div>

              {/* Center controls: Skip 15s back, Play/Pause, Skip 15s forward */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSkipBack15}
                  aria-label="Koma baya da dakika 15"
                  title="-15s"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <SkipBack15Icon className="w-4 h-4" />
                </button>

                {status === 'playing' ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    aria-label="Dakata"
                    className="w-10 h-10 bg-yanci-accent hover:bg-[#ffd700] text-[#052962] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow"
                  >
                    <PauseIcon className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlay}
                    aria-label="Saurara"
                    className="w-10 h-10 bg-yanci-accent hover:bg-[#ffd700] text-[#052962] rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow pl-0.5"
                  >
                    <PlayIcon className="w-5 h-5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSkipForward15}
                  aria-label="Tafi gaba da dakika 15"
                  title="+15s"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <SkipForward15Icon className="w-4 h-4" />
                </button>
              </div>

              {/* Right controls: Speed, Playlist toggle, Minimize */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Speed selector */}
                <select
                  value={rate}
                  onChange={(e) => handleRateChange(Number(e.target.value))}
                  aria-label="Saurin karatu"
                  className="bg-white/10 hover:bg-white/20 border border-white/20 rounded text-xs font-bold px-2 py-1 text-white cursor-pointer focus:outline-none [&>option]:text-[#052962]"
                >
                  {RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}x
                    </option>
                  ))}
                </select>

                {/* Playlist button */}
                {hasMultipleTracks && (
                  <button
                    type="button"
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={`p-1.5 rounded border transition-colors flex items-center gap-1 text-xs font-bold ${
                      showPlaylist
                        ? 'bg-yanci-accent text-[#052962] border-yanci-accent'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                    title="Jerin labarai"
                  >
                    <PlaylistIcon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{tracks.length}</span>
                  </button>
                )}

                {/* Minimize toggle */}
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  title={isMinimized ? 'Fadada' : 'Kankance'}
                  aria-label={isMinimized ? 'Fadada dan wasan sauti' : 'Kankance dan wasan sauti'}
                >
                  {isMinimized ? (
                    <ChevronDownIcon className="w-4 h-4 rotate-180" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded playlist inside mini player if open */}
            {showPlaylist && hasMultipleTracks && !isMinimized && (
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-3 pt-2 border-t border-white/10 max-h-48 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-yanci-accent">Jerin Labaran Yau ({tracks.length})</span>
                  <button
                    type="button"
                    onClick={() => setShowPlaylist(false)}
                    className="text-white/50 hover:text-white text-xs flex items-center gap-1"
                  >
                    <CloseIcon className="w-3.5 h-3.5" /> Rufe
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tracks.map((t, idx) => (
                    <button
                      key={t.id || idx}
                      type="button"
                      onClick={() => handleSelectTrack(idx)}
                      className={`text-left p-2 rounded-lg text-xs flex items-center gap-2 border truncate ${
                        idx === currentTrackIndex
                          ? 'bg-white/20 border-yanci-accent text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="w-5 h-5 rounded bg-white/10 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
