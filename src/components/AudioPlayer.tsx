import { useEffect, useMemo, useRef, useState } from 'react';

interface Props {
  title: string;
  text: string;
}

type Status = 'idle' | 'playing' | 'paused';

const RATES: number[] = [0.75, 1, 1.25, 1.5];

const splitSentences = (raw: string): string[] =>
  raw
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?\u061F\u06D4])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const PlayIcon = () => (
  <svg viewBox="0 0 384 512" fill="currentColor" className="w-4 h-4 ml-0.5" aria-hidden="true">
    <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 320 512" fill="currentColor" className="w-4 h-4" aria-hidden="true">
    <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 384 512" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M256 0H128c-17.7 0-32 14.3-32 32V224v70.1c0 30.2-11.9 58.5-32 79.6L288 373.7V224 32c0-17.7-14.3-32-32-32z" opacity="0" />
    <path d="M0 128C0 92.7 28.7 64 64 64H320c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128z" />
  </svg>
);

const SpeakerBadge = () => (
  <div className="w-10 h-10 rounded-sm bg-yanci-accent flex items-center justify-center shrink-0">
    <svg viewBox="0 0 640 512" fill="currentColor" className="w-5 h-5 text-[#052962]" aria-hidden="true">
      <path d="M533.6 57.4C515.3 40.5 486.5 41.7 469.6 60l-19.5 21.1c-12 13-11.1 33.3 .9 45.3l.4 .4c60 60 60 159.1 0 219.1l-.4 .4c-12 12-12.9 32.3-.9 45.3l19.5 21.1c16.9 18.3 45.7 19.4 64 2.5c78.1-71.4 122.4-172.5 122.4-278.9S611.7 128.8 533.6 57.4zM400 96a48 48 0 1 0 -96 0v51.2c-88 14.3-160 91.2-160 184.8 0 98.4 83.6 176 180.8 176c15.7 0 31.1-1.9 45.9-5.6c-8.3-25.6-3.5-54.5 15-76.1c-20.7 12.9-45.1 20.3-71.3 20.3c-66.7 0-120.8-51.4-120.8-114.7c0-63.3 54.1-114.7 120.8-114.7c26.2 0 50.6 7.4 71.3 20.3c-18.5-21.6-23.3-50.5-15-76.1c-14.8-3.7-30.2-5.6-45.9-5.6V96z" />
    </svg>
  </div>
);

export default function AudioPlayer({ title, text }: Props) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  const chunks = useMemo(() => splitSentences(text), [text]);
  const runIdRef = useRef(0);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    setSupported(true);

    const loadVoices = () => {
      const match = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('ha'));
      setVoice(match ?? null);
    };
    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices);
      runIdRef.current += 1;
      synth.cancel();
    };
  }, []);

  const speakFrom = (start: number, nextRate: number) => {
    const synth = window.speechSynthesis;
    if (!synth || start >= chunks.length) {
      runIdRef.current += 1;
      setStatus('idle');
      setIndex(0);
      return;
    }
    const id = ++runIdRef.current;
    const utterance = new SpeechSynthesisUtterance(chunks[start]);
    utterance.rate = nextRate;
    if (voice) utterance.voice = voice;
    setIndex(start);
    setStatus('playing');
    utterance.onend = () => {
      if (runIdRef.current !== id) return;
      speakFrom(start + 1, nextRate);
    };
    utterance.onerror = () => {
      if (runIdRef.current !== id) return;
      setStatus('idle');
      setIndex(0);
    };
    synth.speak(utterance);
  };

  const handlePlay = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (status === 'paused') {
      synth.resume();
      setStatus('playing');
    } else {
      speakFrom(0, rate);
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
    setIndex(0);
  };

  const handleRateChange = (nextRate: number) => {
    setRate(nextRate);
    if (status !== 'idle') {
      const synth = window.speechSynthesis;
      if (!synth) return;
      runIdRef.current += 1;
      synth.cancel();
      speakFrom(index, nextRate);
    }
  };

  if (!supported || chunks.length === 0) return null;

  const total = chunks.length;
  const position = Math.min(index + 1, total);
  const progress = status === 'idle' ? 0 : (position / total) * 100;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div
        className="bg-[#052962] text-white shadow-[0_-8px_30px_rgba(5,41,98,0.35)] border-t border-white/10"
        role="region"
        aria-label={`Saurara: ${title}`}
      >
        <div className="absolute top-0 left-0 h-0.5 bg-yanci-accent transition-all duration-300" style={{ width: `${progress}%` }} />
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4">
          <SpeakerBadge />
          <div className="flex-1 min-w-0 hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-yanci-accent bg-white/10 px-2 py-0.5 rounded-sm">
              Yanci FM
            </span>
            <p className="font-serif font-bold leading-none truncate mt-1">{title}</p>
          </div>
          <span className="text-xs font-bold tabular-nums text-white/70 shrink-0" aria-live="polite">
            {position}/{total}
          </span>

          {status === 'playing' ? (
            <button
              type="button"
              onClick={handlePause}
              aria-label="Dakata"
              className="w-10 h-10 bg-white text-[#052962] rounded-full flex items-center justify-center hover:bg-yanci-accent transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yanci-accent"
            >
              <PauseIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlay}
              aria-label={status === 'paused' ? 'Ci gaba' : 'Saurara'}
              className="w-10 h-10 bg-white text-[#052962] rounded-full flex items-center justify-center hover:bg-yanci-accent transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yanci-accent"
            >
              <PlayIcon />
            </button>
          )}

          <button
            type="button"
            onClick={handleStop}
            aria-label="Tasha"
            disabled={status === 'idle'}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-colors disabled:opacity-30 disabled:hover:text-white/70 disabled:hover:border-white/20 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yanci-accent"
          >
            <StopIcon />
          </button>

          <label className="hidden md:flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Gudu</span>
            <select
              value={rate}
              onChange={(e) => handleRateChange(Number(e.target.value))}
              aria-label="Zaɓi saurin karatu"
              className="bg-white/10 border border-white/20 rounded-sm text-xs font-bold px-2 py-1.5 cursor-pointer hover:border-white/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-yanci-accent [&>option]:text-[#052962]"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
