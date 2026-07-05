import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, ListFilter, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';

/** Guests land here only via a direct URL — the tab bar already gates the normal path. */
const GuestGate: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-bg-secondary rounded-2xl p-8 border border-border">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent/15 flex items-center justify-center relative mb-4">
            <Zap className="w-7 h-7 text-accent" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-secondary border border-border flex items-center justify-center">
              <Lock className="w-3 h-3 text-text-muted" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Multiplayer is for logged-in racers</h1>
          <p className="text-text-muted mb-6">
            Log in or create a free account to race against other typists in real time.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              className="px-5 py-2 rounded-lg bg-accent text-bg-primary font-semibold"
              onClick={() => navigate('/login?redirect=/multiplayer')}
            >
              Log In
            </button>
            <button
              className="px-5 py-2 rounded-lg border border-border"
              onClick={() => navigate('/signup?redirect=/multiplayer')}
            >
              Sign Up
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const MultiplayerMenuPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const connectionStatus = useMultiplayerStore((s) => s.connectionStatus);
  const connect = useMultiplayerStore((s) => s.connect);
  const joinQuickMatch = useMultiplayerStore((s) => s.joinQuickMatch);
  const navigate = useNavigate();

  const [mode, setMode] = useState<'time' | 'words'>('time');
  const [wordSet, setWordSet] = useState<'english200' | 'english1k' | 'common'>('english200');

  useEffect(() => {
    if (isAuthenticated && connectionStatus === 'disconnected') {
      connect();
    }
  }, [isAuthenticated, connectionStatus, connect]);

  if (!isAuthenticated) return <GuestGate />;

  const wordSetLabel = { english200: 'English 200', english1k: 'English 1k', common: 'Common' }[wordSet];
  const modeLabel = mode === 'time' ? 'Time' : 'Words';

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-8 py-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold flex items-center gap-2 justify-center">
            <Zap className="w-7 h-7 text-accent" /> Multiplayer
          </h1>
          {connectionStatus === 'connecting' && (
            <p className="text-text-muted text-sm mt-2">Connecting to the race server…</p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-red-400 text-sm mt-2">
              Couldn't reach the multiplayer server. Check your connection and try again.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          {/* Quick Match — hero card, spans both columns */}
          <div className="md:col-span-2 bg-gradient-to-br from-accent/15 to-bg-secondary border border-accent/30 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-accent" /> Quick Match</h2>
                <p className="text-sm text-text-muted mt-1">Jump into the next available race.</p>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="bg-bg-primary border border-border rounded-full px-3 py-1.5 text-sm"
              >
                <option value="time">Mode: Time</option>
                <option value="words">Mode: Words</option>
              </select>
              <select
                value={wordSet}
                onChange={(e) => setWordSet(e.target.value as any)}
                className="bg-bg-primary border border-border rounded-full px-3 py-1.5 text-sm"
              >
                <option value="english200">Word Set: English 200</option>
                <option value="english1k">Word Set: English 1k</option>
                <option value="common">Word Set: Common</option>
              </select>
            </div>

            <button
              className="px-5 py-3 rounded-xl bg-accent text-bg-primary font-bold tracking-wide hover:brightness-110 transition-all"
              onClick={() => {
                joinQuickMatch({ mode, wordSet });
                navigate('/multiplayer/quick-match');
              }}
            >
              FIND MATCH
            </button>
            <p className="text-xs text-text-muted -mt-2">Searching for {modeLabel} · {wordSetLabel}</p>
          </div>

          <button
            className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col items-start gap-3 text-left hover:border-accent/50 hover:-translate-y-0.5 transition-all"
            onClick={() => navigate('/multiplayer/create')}
          >
            <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold">Create Room</h2>
              <p className="text-sm text-text-muted">Configure your own race and invite friends.</p>
            </div>
          </button>

          <button
            className="bg-bg-secondary border border-border rounded-2xl p-6 flex flex-col items-start gap-3 text-left hover:border-accent/50 hover:-translate-y-0.5 transition-all"
            onClick={() => navigate('/multiplayer/browse')}
          >
            <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center">
              <ListFilter className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-semibold">Join Room</h2>
              <p className="text-sm text-text-muted">Browse public rooms or enter a code.</p>
            </div>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MultiplayerMenuPage;
