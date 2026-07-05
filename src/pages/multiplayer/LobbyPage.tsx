import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Copy, Check, UserPlus, LogOut, Flag, Users } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';
import PlayerAvatar from '../../components/multiplayer/PlayerAvatar';
import RoomSettingsPanel from '../../components/multiplayer/RoomSettingsPanel';

const LobbyPage: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const setReady = useMultiplayerStore((s) => s.setReady);
  const kickPlayer = useMultiplayerStore((s) => s.kickPlayer);
  const transferHost = useMultiplayerStore((s) => s.transferHost);
  const startRaceAction = useMultiplayerStore((s) => s.startRace);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    if (room?.status === 'countdown' || room?.status === 'racing') {
      navigate('/multiplayer/race');
    }
    if (!room) {
      navigate('/multiplayer');
    }
  }, [room?.status, room, navigate]);

  if (!room || !currentUser) return null;

  const me = room.players.find((p) => p.userId === currentUser.id);
  const isHost = me?.isHost ?? false;
  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const spectators = room.players.filter((p) => p.isSpectator);
  const allReady = activePlayers.every((p) => p.isHost || p.isReady);
  const canStart = activePlayers.length >= 2 && allReady;
  const emptySlots = Math.max(0, room.settings.maxPlayers - activePlayers.length);

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied('code');
    setTimeout(() => setCopied(null), 1500);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#/multiplayer/browse?code=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied('link');
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full flex flex-col gap-4">
        {/* Header card */}
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold truncate">{room.settings.name}</h1>
            <button
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-red-400 shrink-0"
              onClick={() => { leaveRoom(); navigate('/multiplayer'); }}
            >
              <LogOut className="w-4 h-4" /> Leave
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-bg-primary border border-border rounded-lg px-3 py-1.5 font-mono text-sm tracking-widest hover:border-accent/60 transition-colors"
            >
              {room.id}
              {copied === 'code' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
            </button>
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-accent/60 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {copied === 'link' ? 'Link copied!' : 'Invite Friends'}
            </button>
          </div>
        </div>

        <RoomSettingsPanel room={room} isHost={isHost} />

        {/* Player list */}
        <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 text-sm font-semibold text-text-muted">
            <Users className="w-4 h-4" /> Players ({activePlayers.length}/{room.settings.maxPlayers})
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {activePlayers.map((p) => (
                <motion.div
                  key={p.userId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} ring={p.isHost} />
                    <span className="font-medium truncate">{p.username}</span>
                    {p.isHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.isHost || p.isReady ? 'bg-green-500/15 text-green-400' : 'bg-bg-primary text-text-muted'
                      }`}
                    >
                      {p.isHost ? 'Host' : p.isReady ? '● Ready' : 'Not ready'}
                    </span>
                    {isHost && !p.isHost && (
                      <div className="flex items-center gap-2">
                        <button className="text-xs underline text-text-muted hover:text-text-primary" onClick={() => transferHost(p.userId)}>
                          Make host
                        </button>
                        <button className="text-xs underline text-red-400/80 hover:text-red-400" onClick={() => kickPlayer(p.userId)}>
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {Array.from({ length: emptySlots }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 opacity-50">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-border" />
                <span className="text-sm text-text-muted">Waiting for player…</span>
              </div>
            ))}
          </div>
        </div>

        {spectators.length > 0 && (
          <p className="text-sm text-text-muted text-center">
            👀 {spectators.length} spectator{spectators.length > 1 ? 's' : ''} watching
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!isHost && (
            <button
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-colors ${
                me?.isReady ? 'bg-bg-secondary border border-border text-text-muted' : 'bg-accent text-bg-primary'
              }`}
              onClick={() => setReady(!me?.isReady)}
            >
              {me?.isReady ? 'Unready' : "I'm Ready"}
            </button>
          )}
          {isHost && (
            <button
              className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-accent to-accent/80 text-bg-primary disabled:opacity-40 disabled:grayscale"
              disabled={!canStart}
              onClick={startRaceAction}
              title={!canStart ? 'Need at least 2 players, all ready' : undefined}
            >
              <Flag className="w-4 h-4" /> Start Race
            </button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LobbyPage;
