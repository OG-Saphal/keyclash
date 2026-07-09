import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Target, BookOpen, Users, Lock, Globe, ArrowLeft, ChevronDown } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import type { CreateRoomInput } from '../../types/multiplayer';

// --- Switch (used for Punctuation & Numbers) ---
const Switch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full shrink-0 ${checked ? 'bg-accent-primary' : 'bg-bg-tertiary'
      } shadow-inner transition-colors duration-200`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md ${checked ? 'translate-x-5' : ''
        } transition-transform duration-200`}
    />
  </button>
);

// --- Card ---
const Card: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="bg-bg-secondary rounded-lg p-5 flex flex-col gap-4 shadow-sm">
    <div className="flex items-center gap-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
      <span className="text-accent-primary">{icon}</span>
      {title}
    </div>
    {children}
  </div>
);

const CreateRoomPage: React.FC = () => {
  const createRoom = useMultiplayerStore((s) => s.createRoom);
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateRoomInput>({
    name: 'My Race',
    mode: 'time',
    duration: 30,
    wordCount: 25,
    wordSet: 'english200',
    punctuation: false,
    numbers: false,
    maxPlayers: 4,
    visibility: 'public',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setFormError(null);
    if (form.visibility === 'private' && !form.password) {
      setFormError('Private rooms need a password.');
      return;
    }
    setSubmitting(true);
    const room = await createRoom(form);
    setSubmitting(false);
    if (room) navigate('/multiplayer/lobby');
    else setFormError('Could not create room. Try again.');
  };

  // Input with subtle purple border - Removed opacity modifier
  const inputClass =
    'w-full bg-bg-secondary border border-accent-primary/30 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 shadow-sm';

  // Select with custom arrow – Removed opacity modifier
  const selectClass =
    'w-full bg-bg-secondary border border-accent-primary/30 rounded-lg pl-4 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 shadow-sm appearance-none';

  const min = 2;
  const max = 10;
  const fillPercent = ((form.maxPlayers - min) / (max - min)) * 100;

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-6 overflow-hidden">
        {/* Container - Removed opacity modifier */}
        <div className="w-full max-w-4xl bg-bg-secondary rounded-xl p-8 shadow-md flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/multiplayer')}
              className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Pencil className="w-6 h-6 text-accent-primary" /> Create Room
            </h1>
            <div className="w-20" />
          </div>

          {/* 2×2 grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* Card 1: Room Name */}
            <Card icon={<Pencil className="w-4 h-4" />} title="Room Name">
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={40}
                placeholder="Enter room name"
              />
            </Card>

            {/* Card 2: Mode & Duration */}
            <Card icon={<Target className="w-4 h-4" />} title="Mode & Duration">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <select
                    className={selectClass}
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value as 'time' | 'words' })}
                  >
                    <option value="time">Time</option>
                    <option value="words">Words</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>

                {form.mode === 'time' ? (
                  <div className="relative flex-1">
                    <select
                      className={selectClass}
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: Number(e.target.value) as any })}
                    >
                      {[15, 30, 60, 120].map((d) => (
                        <option key={d} value={d}>{d}s</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                ) : (
                  <div className="relative flex-1">
                    <select
                      className={selectClass}
                      value={form.wordCount}
                      onChange={(e) => setForm({ ...form, wordCount: Number(e.target.value) as any })}
                    >
                      {[10, 25, 50, 100].map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                )}
              </div>
            </Card>

            {/* Card 3: Word Set & Options */}
            <Card icon={<BookOpen className="w-4 h-4" />} title="Word Set & Options">
              <div className="relative">
                <select
                  className={selectClass}
                  value={form.wordSet}
                  onChange={(e) => setForm({ ...form, wordSet: e.target.value as any })}
                >
                  <option value="english200">English 200</option>
                  <option value="english1k">English 1k</option>
                  <option value="common">Common</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              </div>

              {/* Options switches */}
              <div className="flex flex-col gap-2 mt-0.5">
                <label className="flex items-center justify-between cursor-pointer text-sm text-text-primary">
                  Punctuation
                  <Switch
                    checked={form.punctuation}
                    onChange={() => setForm({ ...form, punctuation: !form.punctuation })}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-sm text-text-primary">
                  Numbers
                  <Switch
                    checked={form.numbers}
                    onChange={() => setForm({ ...form, numbers: !form.numbers })}
                  />
                </label>
              </div>
            </Card>

            <Card icon={<Users className="w-4 h-4" />} title={`Players: ${form.maxPlayers}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 h-4 flex items-center">
                  <div className="absolute inset-0 h-1.5 bg-bg-tertiary/60 rounded-full top-1/2 -translate-y-1/2 overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={form.maxPlayers}
                    onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                    className="relative w-full h-4 bg-transparent appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                    style={{ zIndex: 1 }}
                  />
                </div>
                <span className="text-sm font-bold text-accent-primary min-w-[1.8rem] text-center">
                  {form.maxPlayers}
                </span>
              </div>

              {form.visibility === 'private' && (
                <input
                  type="password"
                  placeholder="Enter password"
                  className={inputClass}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              )}

              <div className="flex gap-3 mt-auto">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: 'public', password: '' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${form.visibility === 'public'
                    ? 'bg-accent-primary/20 cursor-pointer text-accent-primary shadow-sm'
                    : 'bg-bg-primary/40 text-text-muted cursor-pointer hover:bg-bg-primary/60'
                    }`}
                >
                  <Globe className="w-4 h-4" /> Public
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, visibility: 'private' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${form.visibility === 'private'
                    ? 'bg-accent-primary/20 cursor-pointer text-accent-primary shadow-sm'
                    : 'bg-bg-primary/40 text-text-muted cursor-pointer hover:bg-bg-primary/60'
                    }`}
                >
                  <Lock className="w-4 h-4" /> Private
                </button>
              </div>
            </Card>
          </div>

          {formError && (
            <div className="bg-red-500/10 border border-red-400/20 text-red-400 rounded-lg px-4 py-2.5 text-sm">
              ⚠ {formError}
            </div>
          )}

          <div className="flex justify-center mt-4">
            <button
              className="px-8 py-2.5 rounded-lg cursor-pointer bg-accent-primary text-white font-bold text-base shadow-md hover:shadow-lg hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <span className="flex items-center gap-3 text-[13px]">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Creating…
                </span>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateRoomPage;