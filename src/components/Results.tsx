import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTypingStore } from '../store/useTypingStore';
import { useSaveResult } from '../hooks/useSaveResult';
import SaveResultIndicator from './auth/SaveResultIndicator';

// ─── Sub-component: a single big stat ────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, accent = false, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className={[
      'flex flex-col items-center gap-1.5 px-6 py-4 rounded-xl',
      accent ? 'bg-bg-secondary border border-bg-tertiary/50' : '',
    ].join(' ')}
  >
    <span className="text-text-muted text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>
    <span
      className={[
        'font-mono font-bold tabular-nums tracking-tight',
        accent ? 'text-accent-primary text-6xl' : 'text-text-primary text-4xl',
      ].join(' ')}
    >
      {value}
    </span>
  </motion.div>
);

// ─── Sub-component: custom tooltip ────────────────────────────────────────────

const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-lg px-3 py-2 text-xs font-mono">
      <p className="text-text-muted mb-1">{label}s</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Sub-component: WPM graph ─────────────────────────────────────────────────

const WpmGraph: React.FC<{ data: { time: number; wpm: number; raw: number }[] }> = ({ data }) => {
  if (data.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="w-full max-w-xl h-40 select-none"
      // Purely decorative — not part of the keyboard flow on this screen.
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--bg-tertiary))" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => `${t}s`}
            stroke="rgb(var(--text-muted))"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="rgb(var(--text-muted))"
            tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="raw" name="raw" stroke="rgb(var(--text-muted))" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="wpm" name="wpm" stroke="rgb(var(--accent-primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

// ─── Main Results ─────────────────────────────────────────────────────────────

const Results: React.FC = () => {
  const result = useTypingStore(s => s.result);
  const restart = useTypingStore(s => s.restart);
  const { save, status, isAuthenticated } = useSaveResult();

  const restartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result) save(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // ── Focus + trap: as soon as results appear, the Restart button becomes
  // the sole keyboard target. Autofocus it immediately (Enter works right
  // away with no Tab needed), and on every subsequent Tab press — no matter
  // where the browser would otherwise send focus (header links, the graph,
  // anything) — force it straight back to Restart.
  useEffect(() => {
    if (!result) return;

    restartBtnRef.current?.focus();

    const trapTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        restartBtnRef.current?.focus();
      }
    };

    // Capture phase so this runs before any other element's own handling.
    document.addEventListener('keydown', trapTab, true);
    return () => document.removeEventListener('keydown', trapTab, true);
  }, [result]);

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-8 py-6 animate-fadeIn"
    >
      {/* Primary stats row */}
      <div className="flex flex-wrap items-end justify-center gap-6">
        <StatCard label="wpm" value={result.wpm} accent delay={0} />
        <StatCard label="raw wpm" value={result.rawWpm} delay={0.1} />
        <StatCard label="accuracy" value={`${result.accuracy}%`} delay={0.2} />
      </div>

      <WpmGraph data={result.wpmHistory} />

      <div className="w-48 h-px bg-bg-tertiary/60" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex flex-wrap items-start justify-center gap-8"
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
            characters
          </span>
          <span className="text-text-primary font-mono text-lg">
            <span className="text-status-success font-semibold">{result.correctChars}</span>
            <span className="text-text-muted mx-1">/</span>
            <span className="text-status-error font-semibold">{result.incorrectChars}</span>
            <span className="text-text-muted text-xs ml-2">of {result.totalChars}</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
            words correct
          </span>
          <span className="text-text-primary font-mono text-lg font-semibold">{result.wordsTyped}</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
            {result.mode === 'time' ? 'duration' : 'words'}
          </span>
          <span className="text-text-primary font-mono text-lg font-semibold">
            {result.mode === 'time' ? `${result.duration}s` : result.wordCount}
          </span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
        <SaveResultIndicator status={status} isAuthenticated={isAuthenticated} />
      </motion.div>

      {/* Restart button — the only keyboard-reachable element on this screen */}
      <motion.button
        ref={restartBtnRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.65 }}
        onClick={restart}
        className="group flex items-center gap-2 px-6 py-2.5 rounded-lg bg-bg-secondary border border-bg-tertiary/50
                   text-text-muted font-mono text-sm hover:border-accent-primary/60 hover:text-accent-primary
                   transition-all duration-200 cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300"
        >
          <path
            fillRule="evenodd"
            d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H5.498a.75.75 0 0 0-.75.75v3.268a.75.75 0 0 0 1.5 0v-1.67l.311.311a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.454-.379ZM4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311h-2.433a.75.75 0 0 0 0 1.5h3.434a.75.75 0 0 0 .75-.75V3.903a.75.75 0 0 0-1.5 0v1.67l-.311-.311A7 7 0 0 0 3.229 8.4a.75.75 0 0 0 1.46.176Z"
            clipRule="evenodd"
          />
        </svg>
        restart
        <kbd className="ml-1 text-[10px] text-text-muted bg-bg-tertiary/60 px-1.5 py-0.5 rounded border border-bg-tertiary/40 leading-none">
          tab
        </kbd>
      </motion.button>
    </motion.div>
  );
};

export default Results;