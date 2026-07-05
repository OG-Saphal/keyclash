import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Lock, Crown, RefreshCw, PlusCircle } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';
import type { RoomListEntry } from '../../types/multiplayer';

const STATUS_STYLES: Record<RoomListEntry['status'], { dot: string; label: string; text: string }> = {
  waiting: { dot: 'bg-green-400', label: 'Waiting', text: 'text-green-400' },
  countdown: { dot: 'bg-amber-400', label: 'Starting', text: 'text-amber-400' },
  racing: { dot: 'bg-amber-400', label: 'In Game', text: 'text-amber-400' },
  finished: { dot: 'bg-text-muted', label: 'Finished', text: 'text-text-muted' },
};

const RoomBrowserPage: React.FC = () => {
  const roomList = useMultiplayerStore((s) => s.roomList);
  const refreshRoomList = useMultiplayerStore((s) => s.refreshRoomList);
  const joinRoom = useMultiplayerStore((s) => s.joinRoom);
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'time' | 'words'>('all');
  const [hideFullOrRacing, setHideFullOrRacing] = useState(false);
  const [codeEntry, setCodeEntry] = useState('');
  const [pendingPasswordRoomId, setPendingPasswordRoomId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  useEffect(() => {
    refreshRoomList();
    // Live-updating via room:list_updated diff-broadcasts — this interval is
    // just a friendly "last synced Ns ago" indicator, not a poll.
    const t = setInterval(() => setLastRefreshed((prev) => prev), 1000);
    return () => clearInterval(t);
  }, [refreshRoomList]);

  useEffect(() => {
    setLastRefreshed(Date.now());
  }, [roomList]);

  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastRefreshed) / 1000));

  const filtered = useMemo(() => {
    return roomList.filter((r) => {
      if (modeFilter !== 'all' && r.mode !== modeFilter) return false;
      if (hideFullOrRacing && (r.playerCount >= r.maxPlayers || r.status !== 'waiting')) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.hostUsername.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [roomList, modeFilter, hideFullOrRacing, search]);

  const handleJoin = async (roomId: string, isPrivate: boolean) => {
    setJoinError(null);
    if (isPrivate) {
      setPendingPasswordRoomId(roomId);
      return;
    }
    const ok = await joinRoom(roomId);
    if (ok) navigate('/multiplayer/lobby');
    else setJoinError('Could not join that room — it may be full or no longer exist.');
  };

  const handlePasswordSubmit = async () => {
    if (!pendingPasswordRoomId) return;
    const ok = await joinRoom(pendingPasswordRoomId, passwordInput);
    if (ok) {
      navigate('/multiplayer/lobby');
    } else {
      setJoinError('Incorrect password, or too many attempts — wait a minute and try again.');
      setPendingPasswordRoomId(null);
    }
  };

  const handleEnterCode = async () => {
    if (!codeEntry.trim()) return;
    const ok = await joinRoom(codeEntry.trim().toUpperCase());
    if (ok) navigate('/multiplayer/lobby');
    else setJoinError('Room code not found.');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="w-5 h-5 text-accent" /> Join a Room</h1>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <RefreshCw className="w-3 h-3" /> synced {secondsAgo}s ago
          </span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="bg-bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 w-full"
              placeholder="Search by room or host…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-bg-secondary border border-border rounded-lg px-3 py-2"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
          >
            <option value="all">All modes</option>
            <option value="time">Time</option>
            <option value="words">Words</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input type="checkbox" checked={hideFullOrRacing} onChange={(e) => setHideFullOrRacing(e.target.checked)} />
            Hide full/racing
          </label>
        </div>

        <div className="flex gap-2">
          <input
            className="bg-bg-secondary border border-border rounded-lg px-3 py-2 w-32 uppercase font-mono tracking-widest"
            placeholder="CODE"
            value={codeEntry}
            onChange={(e) => setCodeEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnterCode()}
          />
          <button className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-accent/60" onClick={handleEnterCode}>
            Join by Code
          </button>
        </div>

        {joinError && <p className="text-red-400 text-sm">{joinError}</p>}

        {filtered.length === 0 ? (
          <div className="bg-bg-secondary border border-border rounded-2xl p-10 text-center text-text-muted flex flex-col items-center gap-4">
            <Search className="w-8 h-8 opacity-40" />
            <p>No public rooms match right now.</p>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg-primary font-semibold"
              onClick={() => navigate('/multiplayer/create')}
            >
              <PlusCircle className="w-4 h-4" /> Start your own
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((r) => {
              const isFull = r.playerCount >= r.maxPlayers;
              const isRacing = r.status !== 'waiting';
              const actionLabel = r.visibility === 'private' ? 'Enter Password' : isFull || isRacing ? 'Spectate' : 'Join';
              const status = STATUS_STYLES[r.status];
              return (
                <div
                  key={r.id}
                  className="bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-accent/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                      <Crown className="w-3 h-3 text-amber-400" /> {r.hostUsername}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted w-16 capitalize hidden sm:block">{r.mode}</span>
                  <span className="text-xs text-text-muted w-16 hidden sm:block">{r.playerCount}/{r.maxPlayers}</span>
                  <span className={`text-xs flex items-center gap-1.5 w-20 ${status.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {status.label}
                  </span>
                  <span className="text-xs text-text-muted w-8 flex justify-center" title={r.visibility}>
                    {r.visibility === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-accent hover:text-bg-primary hover:border-accent transition-colors shrink-0"
                    onClick={() => handleJoin(r.id, r.visibility === 'private')}
                  >
                    {actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {pendingPasswordRoomId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
            <div className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-sm w-full flex flex-col gap-3">
              <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Room password</h2>
              <input
                type="password"
                autoFocus
                className="bg-bg-primary border border-border rounded-lg px-3 py-2"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-2 rounded-lg border border-border" onClick={() => setPendingPasswordRoomId(null)}>
                  Cancel
                </button>
                <button className="px-3 py-2 rounded-lg bg-accent text-bg-primary font-semibold" onClick={handlePasswordSubmit}>
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default RoomBrowserPage;
