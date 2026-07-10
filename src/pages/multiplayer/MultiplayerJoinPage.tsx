import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

/**
 * 🐛 FIX (Bug #4) — real destination for copied invite links
 * (/#/multiplayer/join?roomId=ABC123).
 *
 * Previously, "Copy link" in LobbyPage built a URL pointing at
 * RoomBrowserPage (`#/multiplayer/browse?code=...`), a param that page
 * never even read — and whether reached that way or navigated to directly,
 * RoomBrowserPage's mount effect called refreshRoomList() unconditionally.
 * If the socket hadn't connected yet (e.g. a fresh tab opened straight from
 * a copied link, with no prior /multiplayer visit to have triggered
 * connect()), that threw "Multiplayer socket not connected." with nothing
 * on screen to catch it — a blank page.
 *
 * This page is the single place invite links land (see the matching fix in
 * LobbyPage.tsx's copyInviteLink). It always renders SOMETHING (loading /
 * password / error state), explicitly awaits connect() — a no-op if
 * already connected/connecting — before touching any room API, and only
 * then calls joinRoom().
 */
const MultiplayerJoinPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const roomId = (params.get('roomId') || params.get('code') || '').trim().toUpperCase();

  const connect = useMultiplayerStore((s) => s.connect);
  const joinRoom = useMultiplayerStore((s) => s.joinRoom);
  const currentUser = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.authLoading);

  const [phase, setPhase] = useState<'connecting' | 'joining' | 'password' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (!roomId) {
      setPhase('error');
      setError('This invite link is missing a room code.');
      return;
    }
    // initializeAuth() runs once at App mount and briefly leaves
    // currentUser null — wait for it to resolve before deciding anything,
    // rather than bouncing a genuinely-logged-in user to a login prompt.
    if (authLoading) return;
    if (!currentUser) {
      setPhase('error');
      setError('You need to be logged in to join a multiplayer room.');
      return;
    }
    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      setPhase('connecting');
      await connect();
      const status = useMultiplayerStore.getState().connectionStatus;
      if (status !== 'connected') {
        setPhase('error');
        setError(useMultiplayerStore.getState().connectionError || 'Could not connect to the multiplayer server.');
        return;
      }
      setPhase('joining');
      // 🐛 FIX (private room link "not working") — joinRoom() resolves to
      // an object ({ ok, code? }), never a plain boolean. `if (ok)` was
      // checking the truthiness of that OBJECT, which is always truthy —
      // so this branch ran unconditionally, even when the join genuinely
      // failed (room not found, wrong/missing password, rate-limited).
      // The client would navigate to /multiplayer/lobby anyway, find
      // `currentRoom` was never actually set (joinRoom() in the store only
      // sets it on a real success), and RoomStatusRouter would immediately
      // bounce back out to /multiplayer — which is exactly the silent
      // "link doesn't work" symptom, with the password prompt never given
      // a chance to appear. Destructuring `.ok` here fixes that.
      //
      // This also fixes "don't ask a password for an invite link": the
      // server already waives the password for a genuinely invited user
      // (see roomManager.ts's `invitedUserIds` check), so their very first
      // no-password attempt here already succeeds server-side — now that
      // success is actually recognized, they go straight to the lobby
      // instead of ever seeing a password prompt.
      const res = await joinRoom(roomId);
      if (res.ok) {
        navigate('/multiplayer/lobby', { replace: true });
      } else if (res.code === 'ROOM_NOT_FOUND') {
        setPhase('error');
        setError('This room no longer exists.');
      } else if (res.code === 'RATE_LIMITED') {
        setPhase('error');
        setError('Too many attempts — wait a minute and try again.');
      } else {
        // BAD_PASSWORD (or an unrecognized code) — most common cause of a
        // first-try failure for a private room; also doubles as a general
        // retry step for anything else that isn't explicitly handled above.
        setPhase('password');
      }
    })();
  }, [roomId, currentUser, authLoading, connect, joinRoom, navigate]);

  const retryWithPassword = async () => {
    setError(null);
    setPhase('joining');
    // 🐛 FIX (same truthiness bug as the initial attempt above) — `ok` was
    // an object, not a boolean, so this always looked successful even on a
    // genuinely wrong password.
    const res = await joinRoom(roomId, password);
    if (res.ok) {
      navigate('/multiplayer/lobby', { replace: true });
    } else if (res.code === 'RATE_LIMITED') {
      setError('Too many attempts — wait a minute and try again.');
      setPhase('password');
    } else {
      setError('Incorrect password, or the room may be full or no longer exist.');
      setPhase('password');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-bg-secondary/80 rounded-xl p-6 shadow-md flex flex-col items-center gap-4 text-center">
          {(phase === 'connecting' || phase === 'joining') && (
            <>
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              <p className="text-sm text-text-muted">
                {phase === 'connecting'
                  ? 'Connecting to the multiplayer server…'
                  : `Joining room ${roomId}…`}
              </p>
            </>
          )}

          {phase === 'password' && (
            <>
              <Lock className="w-8 h-8 text-accent-primary" />
              <p className="font-semibold">This room needs a password</p>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && retryWithPassword()}
                placeholder="Enter password"
                className="w-full bg-bg-primary/70 border border-accent-primary/30 rounded-lg px-4 py-2 text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                onClick={retryWithPassword}
                className="w-full px-4 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:brightness-105"
              >
                Join
              </button>
              <button
                onClick={() => navigate('/multiplayer/browse')}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                Not the right room? Browse rooms instead
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <AlertCircle className="w-8 h-8 text-red-400" />
              <p className="text-sm text-text-muted">{error}</p>
              {!currentUser ? (
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:brightness-105"
                >
                  Log in
                </Link>
              ) : (
                <button
                  onClick={() => navigate('/multiplayer')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-primary/50 text-text-muted hover:text-text-primary"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Multiplayer
                </button>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MultiplayerJoinPage;
