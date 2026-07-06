import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, ListFilter, Lock, Swords, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';

/** Guest gate – shown to unauthenticated users */
const GuestGate: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-bg-secondary rounded-2xl p-8 shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-full bg-accent-primary/15 flex items-center justify-center relative mb-4">
            <Zap className="w-7 h-7 text-accent-primary" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-bg-secondary flex items-center justify-center shadow-sm">
              <Lock className="w-3 h-3 text-text-muted" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Multiplayer is for logged-in racers</h1>
          <p className="text-text-muted mb-6">
            Log in or create a free account to race against other typists in real time.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              className="px-5 py-2 rounded-lg bg-accent-primary text-bg-primary font-semibold"
              onClick={() => navigate('/login?redirect=/multiplayer')}
            >
              Log In
            </button>
            <button
              className="px-5 py-2 rounded-lg bg-bg-secondary shadow-sm"
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

/** Main multiplayer menu – only visible to authenticated users */
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

  // Select class with custom arrow
  const selectClass =
    'bg-bg-primary/60 border-0 rounded-full px-3 py-1.5 pr-8 text-[13px] focus:outline-none focus:ring-1 focus:ring-accent-primary shadow-sm appearance-none';

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      <Header />
      <ModeTabBar />

      <div className="text-center pt-9 pb-0">
        <h1 className="text-2xl font-bold flex items-center gap-2 justify-center">
          <Swords className="w-6 h-6 text-accent-primary" /> Multiplayer
        </h1>
        {connectionStatus === 'connecting' && (
          <p className="text-text-muted text-xs mt-1">Connecting to the race server…</p>
        )}
        {connectionStatus === 'error' && (
          <p className="text-red-400 text-xs mt-1">
            Couldn't reach the multiplayer server. Check your connection and try again.
          </p>
        )}
      </div>

      <main className="flex-1 flex items-center justify-center px-4 pb-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-3 w-full max-w-3xl">
          {/* Quick Match */}
          <div className="md:row-span-2 bg-bg-secondary rounded-xl p-6 flex flex-col justify-between gap-4 shadow-md h-full min-h-[260px]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-[17px] flex items-center gap-1.5">
                    <Zap className="w-5 h-5 text-accent-primary" /> Quick Match
                  </h2>
                  <p className="text-[14px] text-text-muted my-2">Jump into the next available race.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Mode dropdown */}
              <div className="relative">
                <select
                  className={selectClass}
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                >
                  <option value="time">Mode: Time</option>
                  <option value="words">Mode: Words</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>

              {/* Word Set dropdown */}
              <div className="relative">
                <select
                  className={selectClass}
                  value={wordSet}
                  onChange={(e) => setWordSet(e.target.value as any)}
                >
                  <option value="english200">Word Set: English 200</option>
                  <option value="english1k">Word Set: English 1k</option>
                  <option value="common">Word Set: Common</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </div>

            <button
              className="px-4 py-3 rounded-lg bg-accent-primary text-white font-[600] text-[13px] tracking-wide text-center cursor-pointer 
                   hover:scale-95 active:scale-90 transition-transform duration-200"
              onClick={() => {
                joinQuickMatch({ mode, wordSet });
                navigate('/multiplayer/quick-match');
              }}
            >
              FIND MATCH
            </button>

            <p className="text-[11px] text-text-muted text-center">
              Searching for {modeLabel} · {wordSetLabel}
            </p>
          </div>

          {/* Create Room */}
          <button
            className="bg-bg-secondary rounded-xl px-4 py-4 flex items-center gap-3 text-left 
                 hover:scale-[0.98] active:scale-[0.95] cursor-pointer transition-transform duration-200 hover:shadow-lg"
            onClick={() => navigate('/multiplayer/create')}
          >
            <div className="w-10 h-10 rounded-full bg-accent-primary/15 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold text-[16px]">Create Room</h2>
              <p className="text-[14px] text-text-muted">Configure your own race and invite friends.</p>
            </div>
          </button>

          {/* Join Room */}
          <button
            className="bg-bg-secondary rounded-xl px-4 py-4 flex items-center gap-3 text-left 
                 hover:scale-[0.98] active:scale-[0.95] cursor-pointer transition-transform duration-200 hover:shadow-lg"
            onClick={() => navigate('/multiplayer/browse')}
          >
            <div className="w-10 h-10 rounded-full bg-accent-primary/15 flex items-center justify-center shrink-0">
              <ListFilter className="w-5 h-5 text-accent-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="font-semibold text-[16px]">Join Room</h2>
              <p className="text-[14px] text-text-muted">Browse public rooms or enter a code.</p>
            </div>
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MultiplayerMenuPage;