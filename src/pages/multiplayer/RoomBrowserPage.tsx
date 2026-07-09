import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Lock, Crown, RefreshCw, PlusCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import Header from '../../components/Header';
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
  const connect = useMultiplayerStore((s) => s.connect); // 🐛 FIX (Bug #4)
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'time' | 'words'>('all');
  const [hideFullOrRacing, setHideFullOrRacing] = useState(false);
  const [codeEntry, setCodeEntry] = useState('');
  const [pendingPasswordRoomId, setPendingPasswordRoomId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  // 🐛 FIX (Bug #4) — this used to call refreshRoomList() unconditionally on
  // mount, which throws "Multiplayer socket not connected." (an uncaught
  // error, resulting in a blank page) whenever this page is reached before
  // the socket has ever connected — e.g. navigating here directly rather
  // than via a page that already called connect(). connect() itself is a
  // no-op if already connected/connecting, so awaiting it here is always
  // safe and never double-connects.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await connect();
      if (!cancelled) refreshRoomList();
    })();
    const t = setInterval(() => setLastRefreshed((prev) => prev), 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refreshRoomList, connect]);

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
      setPasswordInput('');
      setPendingPasswordRoomId(roomId);
      return;
    }
    const res = await joinRoom(roomId);
    if (res.ok) navigate('/multiplayer/lobby');
    else setJoinError('Could not join that room — it may be full or no longer exist.');
  };

  const handlePasswordSubmit = async () => {
    if (!pendingPasswordRoomId) return;
    const res = await joinRoom(pendingPasswordRoomId, passwordInput);
    if (res.ok) {
      setPendingPasswordRoomId(null);
      navigate('/multiplayer/lobby');
    } else if (res.code === 'RATE_LIMITED') {
      setJoinError('Too many attempts — wait a minute and try again.');
      setPendingPasswordRoomId(null);
    } else {
      // Wrong password — keep the modal open so they can just retry, rather
      // than bouncing them back out to the room list.
      setJoinError('Incorrect password.');
      setPasswordInput('');
    }
  };

  // 🐛 FIX (Bug #1) — this used to call joinRoom() with no password and,
  // on ANY failure, show "Room code not found" — including for a valid
  // private-room code, since the server ack carried no reason. Now that the
  // ack includes a code, a BAD_PASSWORD result (valid room, just needs a
  // password) opens the same password modal used from the room list,
  // instead of dead-ending on a misleading "not found" message.
  const handleEnterCode = async () => {
    if (!codeEntry.trim()) return;
    setJoinError(null);
    const code = codeEntry.trim().toUpperCase();
    const res = await joinRoom(code);
    if (res.ok) {
      navigate('/multiplayer/lobby');
      return;
    }
    if (res.code === 'BAD_PASSWORD') {
      setPasswordInput('');
      setPendingPasswordRoomId(code);
    } else if (res.code === 'RATE_LIMITED') {
      setJoinError('Too many attempts — wait a minute and try again.');
    } else {
      setJoinError('Room code not found.');
    }
  };

  // Input class – with subtle purple border
  const inputClass =
    'w-full bg-bg-secondary/90 border border-accent-primary/30 rounded-lg px-4 py-2 text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 shadow-sm';

  // Select class – with custom arrow spacing
  const selectClass =
    'w-full bg-bg-secondary/90 border border-accent-primary/30 rounded-lg pl-4 pr-10 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 shadow-sm appearance-none';

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-4 overflow-hidden">
        <div className="w-full max-w-4xl bg-bg-secondary/60 rounded-xl p-6 shadow-md flex flex-col h-full max-h-full">
          {/* Header with Back button */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/multiplayer')}
              className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Search className="w-5 h-5 text-accent-primary" /> Join a Room
            </h1>
            <span className="text-xs text-text-muted flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3" /> {secondsAgo}s ago
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={inputClass + ' pl-9'}
                placeholder="Search by room or host…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Mode filter dropdown with custom arrow */}
            <div className="relative w-auto min-w-[120px]">
              <select
                className={selectClass}
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
              >
                <option value="all">All modes</option>
                <option value="time">Time</option>
                <option value="words">Words</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideFullOrRacing}
                onChange={(e) => setHideFullOrRacing(e.target.checked)}
                className="accent-accent-primary w-4 h-4 rounded"
              />
              Hide full/racing
            </label>
          </div>

          {/* Quick join */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Quick join</span>
            <input
              className={inputClass + ' w-40 uppercase font-mono tracking-widest'}
              placeholder="CODE"
              value={codeEntry}
              onChange={(e) => setCodeEntry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnterCode()}
            />
            <button
              className="px-4 py-1.5 rounded-lg bg-accent-primary text-white font-medium shadow-sm hover:brightness-105"
              onClick={handleEnterCode}
            >
              Join
            </button>
          </div>

          {joinError && (
            <div className="bg-red-500/10 text-red-400 rounded-lg px-4 py-2 text-sm mb-4">
              ⚠ {joinError}
            </div>
          )}

          {/* Room list – scrollable */}
          <div className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col">
            {filtered.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full flex flex-col items-center justify-center gap-4 p-10">
                  <Search className="w-10 h-10 opacity-30" />
                  <p className="text-base text-text-muted">No public rooms match your criteria.</p>
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-primary text-white font-semibold shadow-sm hover:brightness-105"
                    onClick={() => navigate('/multiplayer/create')}
                  >
                    <PlusCircle className="w-4 h-4" /> Create your own
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filtered.map((r) => {
                  const isFull = r.playerCount >= r.maxPlayers;
                  const isRacing = r.status !== 'waiting';
                  const actionLabel = r.visibility === 'private' ? 'Enter Password' : isFull || isRacing ? 'Spectate' : 'Join';
                  const status = STATUS_STYLES[r.status];
                  return (
                    <div
                      key={r.id}
                      className="bg-bg-secondary/80 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{r.name}</p>
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                          <Crown className="w-3 h-3 text-amber-400" /> {r.hostUsername}
                        </p>
                      </div>
                      <span className="text-xs text-text-muted w-16 capitalize hidden sm:block">{r.mode}</span>
                      <span className="text-xs text-text-muted w-14 hidden sm:block">{r.playerCount}/{r.maxPlayers}</span>
                      <span className={`text-xs flex items-center gap-1.5 w-20 ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} /> {status.label}
                      </span>
                      <span className="text-text-muted w-8 flex justify-center" title={r.visibility}>
                        {r.visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </span>
                      <button
                        className="px-3.5 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary font-medium hover:bg-accent-primary/20 shadow-sm"
                        onClick={() => handleJoin(r.id, r.visibility === 'private')}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Password modal */}
      {pendingPasswordRoomId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">
          <div className="bg-bg-secondary/90 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 className="font-semibold flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-accent-primary" /> Room password
            </h2>
            <input
              type="password"
              autoFocus
              className={inputClass + ' mt-3'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Enter password"
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 rounded-lg bg-bg-primary/40 text-text-muted hover:bg-bg-primary/60"
                onClick={() => setPendingPasswordRoomId(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-accent-primary text-white font-semibold shadow-sm hover:brightness-105"
                onClick={handlePasswordSubmit}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default RoomBrowserPage;