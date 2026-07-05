import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Target, Clock, BookOpen, Settings as SettingsIcon, Users, Lock, Globe } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';
import type { CreateRoomInput } from '../../types/multiplayer';

const Switch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-accent' : 'bg-border'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
    />
  </button>
);

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-bg-primary/60 border border-border rounded-xl p-4 flex flex-col gap-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-text-muted">{icon}{title}</div>
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

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Pencil className="w-5 h-5 text-accent" /> Create Room</h1>

          <SectionCard icon={<Pencil className="w-4 h-4" />} title="Room Name">
            <input
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={40}
            />
          </SectionCard>

          <div className="grid grid-cols-2 gap-3">
            <SectionCard icon={<Target className="w-4 h-4" />} title="Mode">
              <select
                className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as 'time' | 'words' })}
              >
                <option value="time">Time</option>
                <option value="words">Words</option>
              </select>
            </SectionCard>

            {form.mode === 'time' ? (
              <SectionCard icon={<Clock className="w-4 h-4" />} title="Duration">
                <select
                  className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) as any })}
                >
                  {[15, 30, 60, 120].map((d) => <option key={d} value={d}>{d} seconds</option>)}
                </select>
              </SectionCard>
            ) : (
              <SectionCard icon={<Target className="w-4 h-4" />} title="Word count">
                <select
                  className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
                  value={form.wordCount}
                  onChange={(e) => setForm({ ...form, wordCount: Number(e.target.value) as any })}
                >
                  {[10, 25, 50, 100].map((w) => <option key={w} value={w}>{w} words</option>)}
                </select>
              </SectionCard>
            )}
          </div>

          <SectionCard icon={<BookOpen className="w-4 h-4" />} title="Word Set">
            <select
              className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
              value={form.wordSet}
              onChange={(e) => setForm({ ...form, wordSet: e.target.value as any })}
            >
              <option value="english200">English 200</option>
              <option value="english1k">English 1k</option>
              <option value="common">Common</option>
            </select>
          </SectionCard>

          <SectionCard icon={<SettingsIcon className="w-4 h-4" />} title="Options">
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between text-sm text-text-primary">
                Punctuation
                <Switch checked={form.punctuation} onChange={() => setForm({ ...form, punctuation: !form.punctuation })} />
              </label>
              <label className="flex items-center justify-between text-sm text-text-primary">
                Numbers
                <Switch checked={form.numbers} onChange={() => setForm({ ...form, numbers: !form.numbers })} />
              </label>
            </div>
          </SectionCard>

          <SectionCard icon={<Users className="w-4 h-4" />} title={`Max Players: ${form.maxPlayers}`}>
            <input
              type="range"
              min={2}
              max={10}
              value={form.maxPlayers}
              onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
              className="accent-current"
              style={{ accentColor: 'var(--color-accent, #6366f1)' }}
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>2</span><span>10</span>
            </div>
          </SectionCard>

          <SectionCard icon={form.visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />} title="Visibility">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, visibility: 'public' })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.visibility === 'public' ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-muted'
                }`}
              >
                <Globe className="w-4 h-4" /> Public
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, visibility: 'private' })}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.visibility === 'private' ? 'bg-accent/15 border-accent text-accent' : 'border-border text-text-muted'
                }`}
              >
                <Lock className="w-4 h-4" /> Private
              </button>
            </div>

            {form.visibility === 'private' && (
              <input
                type="password"
                placeholder="Room password"
                className="bg-bg-secondary border border-border rounded-lg px-3 py-2 mt-1"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
          </SectionCard>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <button
            className="mt-1 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-bg-primary font-bold tracking-wide disabled:opacity-50"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Creating…' : 'CREATE & GO TO LOBBY'}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateRoomPage;
