import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Link as LinkIcon,
  LogOut,
  Flag,
  Users,
  Pencil,
  ChevronDown,
  Globe,
  Lock,
  Crown,
} from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { resolvePlayerColor } from '../../data/playerColors';
import Header from '../../components/Header';
import ModeTabBar from '../../components/ModeTabBar';
import Footer from '../../components/Footer';
import PlayerAvatar from '../../components/multiplayer/PlayerAvatar';
import PlayerColorSwatches from '../../components/multiplayer/PlayerColorSwatches';
import type { RoomSettingsDTO, CreateRoomInput } from '../../types/multiplayer';

const LobbyPage: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const setReady = useMultiplayerStore((s) => s.setReady);
  const kickPlayer = useMultiplayerStore((s) => s.kickPlayer);
  const transferHost = useMultiplayerStore((s) => s.transferHost);
  const startRaceAction = useMultiplayerStore((s) => s.startRace);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);
  const updateSettings = useMultiplayerStore((s) => s.updateSettings);
  const currentUser = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const navigate = useNavigate();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editSettings, setEditSettings] = useState<RoomSettingsDTO | null>(null);

  // Navigation effects removed – handled globally by <RoomStatusRouter />

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

  const settings = room.settings;

  const openEdit = () => {
    setEditSettings({ ...settings });
    setEditMode(true);
  };

  const saveSettings = async () => {
    if (!editSettings) return;
    const patch: Partial<CreateRoomInput> = {
      name: editSettings.name,
      mode: editSettings.mode,
      duration: editSettings.duration,
      wordCount: editSettings.wordCount,
      wordSet: editSettings.wordSet,
      punctuation: editSettings.punctuation,
      numbers: editSettings.numbers,
      maxPlayers: editSettings.maxPlayers,
      visibility: editSettings.visibility,
    };
    await updateSettings(patch);
    setEditMode(false);
    setEditSettings(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditSettings(null);
  };

  const selectClass =
    'w-full bg-bg-secondary/90 border cursor-pointer border-accent-primary/30 rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 shadow-sm appearance-none';

  const min = 2;
  const max = 10;
  const fillPercent = ((editSettings?.maxPlayers || 4) - min) / (max - min) * 100;

  return (
    <div className="h-screen bg-bg-primary text-text-primary flex flex-col overflow-hidden">
      <Header />
      <ModeTabBar />

      <main className="flex-1 flex flex-col px-4 py-4 max-w-5xl mx-auto w-full overflow-hidden gap-3">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-full">
          {/* Left column */}
          <div className="lg:col-span-3 flex flex-col gap-3 h-full">
            {/* Room header */}
            <div className="bg-bg-secondary/80 rounded-xl p-4 shadow-sm flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold truncate">{settings.name}</h1>
                <button
                  className="flex items-center cursor-pointer gap-1.5 text-sm text-text-muted hover:text-red-400 transition-colors"
                  onClick={() => { leaveRoom(); navigate('/multiplayer'); }}
                >
                  <LogOut className="w-4 h-4" /> Leave
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 bg-bg-primary/70 rounded-lg px-3 py-1.5 font-mono text-sm tracking-widest hover:bg-bg-primary shadow-sm transition-colors"
                >
                  {room.id}
                  {copied === 'code' ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  )}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="flex items-center cursor-pointer gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-bg-primary/70 text-text-muted hover:text-text-primary hover:bg-bg-primary shadow-sm transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  {copied === 'link' ? 'Link copied!' : 'Copy link'}
                </button>
              </div>
            </div>

            {/* Room settings – only host can edit */}
            {isHost && (
              <div className="bg-bg-secondary/80 rounded-xl p-4 shadow-sm flex-shrink-0 max-h-[calc(100%-140px)] overflow-y-auto">
                {editMode ? (
                  // Edit form
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-accent-primary" /> Edit Room Settings
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-text-muted uppercase tracking-wider">Mode</label>
                        <div className="relative">
                          <select
                            className={selectClass}
                            value={editSettings?.mode || 'time'}
                            onChange={(e) =>
                              setEditSettings((prev) =>
                                prev ? { ...prev, mode: e.target.value as 'time' | 'words' } : null
                              )
                            }
                          >
                            <option value="time">Time</option>
                            <option value="words">Words</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-muted uppercase tracking-wider">
                          {editSettings?.mode === 'time' ? 'Duration' : 'Word Count'}
                        </label>
                        <div className="relative">
                          <select
                            className={selectClass}
                            value={
                              editSettings?.mode === 'time'
                                ? editSettings?.duration || 30
                                : editSettings?.wordCount || 25
                            }
                            onChange={(e) =>
                              setEditSettings((prev) => {
                                if (!prev) return null;
                                if (prev.mode === 'time') {
                                  return { ...prev, duration: Number(e.target.value) as any };
                                } else {
                                  return { ...prev, wordCount: Number(e.target.value) as any };
                                }
                              })
                            }
                          >
                            {editSettings?.mode === 'time'
                              ? [15, 30, 60, 120].map((d) => (
                                  <option key={d} value={d}>{d}s</option>
                                ))
                              : [10, 25, 50, 100].map((w) => (
                                  <option key={w} value={w}>{w} words</option>
                                ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-text-muted uppercase tracking-wider">Word Set</label>
                        <div className="relative">
                          <select
                            className={selectClass}
                            value={editSettings?.wordSet || 'english200'}
                            onChange={(e) =>
                              setEditSettings((prev) =>
                                prev ? { ...prev, wordSet: e.target.value as any } : null
                              )
                            }
                          >
                            <option value="english200">English 200</option>
                            <option value="english1k">English 1k</option>
                            <option value="common">Common</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-xs text-text-muted uppercase tracking-wider">Max Players</label>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="relative flex-1 max-w-[220px] h-4 flex items-center">
                            <div className="absolute inset-0 h-1.5 bg-bg-tertiary/60 rounded-full top-1/2 -translate-y-1/2 overflow-hidden">
                              <div
                                className="h-full bg-accent-primary rounded-full transition-none"
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>
                            <input
                              type="range"
                              min={min}
                              max={max}
                              value={editSettings?.maxPlayers || 4}
                              onChange={(e) =>
                                setEditSettings((prev) =>
                                  prev ? { ...prev, maxPlayers: Number(e.target.value) } : null
                                )
                              }
                              className="relative w-full h-4 bg-transparent appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                              style={{ zIndex: 1 }}
                            />
                          </div>
                          <span className="text-sm font-bold text-accent-primary min-w-[1.8rem] text-center">
                            {editSettings?.maxPlayers || 4}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        <label className="text-xs text-text-muted uppercase tracking-wider">Visibility</label>
                        <div className="flex gap-2 mt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditSettings((prev) =>
                                prev ? { ...prev, visibility: 'public' } : null
                              )
                            }
                            className={`flex-1 flex items-center cursor-pointer justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                              editSettings?.visibility === 'public'
                                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-sm'
                                : 'bg-bg-primary/40 border-border/30 text-text-muted hover:bg-bg-primary/60'
                            }`}
                          >
                            <Globe className="w-4 h-4" /> Public
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditSettings((prev) =>
                                prev ? { ...prev, visibility: 'private' } : null
                              )
                            }
                            className={`flex-1 flex items-center cursor-pointer justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                              editSettings?.visibility === 'private'
                                ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-sm'
                                : 'bg-bg-primary/40 border-border/30 text-text-muted hover:bg-bg-primary/60'
                            }`}
                          >
                            <Lock className="w-4 h-4" /> Private
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-3" />

                    <div className="flex justify-between items-center">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 rounded-lg cursor-pointer text-sm text-text-muted border border-transparent hover:text-red-400 hover:border-red-400/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveSettings}
                        className="px-4 py-1.5 rounded-lg cursor-pointer bg-accent-primary text-white font-semibold hover:brightness-105 shadow-sm transition-colors text-sm"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold flex items-center gap-2">
                        <span className="text-text-muted">Room Settings</span>
                      </span>
                      <button
                        onClick={openEdit}
                        className="text-sm text-accent-primary cursor-pointer hover:brightness-105 transition-colors flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-text-muted text-xs uppercase tracking-wider">Mode</span>
                        <p className="font-medium capitalize">{settings.mode}</p>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs uppercase tracking-wider">Word Set</span>
                        <p className="font-medium">{settings.wordSet}</p>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs uppercase tracking-wider">Duration</span>
                        <p className="font-medium">
                          {settings.mode === 'time' ? `${settings.duration}s` : `${settings.wordCount} words`}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-muted text-xs uppercase tracking-wider">Visibility</span>
                        <p className="font-medium capitalize">{settings.visibility}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spectators & Actions – pinned at bottom */}
            <div className="mt-auto pt-2 flex flex-col gap-3 flex-shrink-0">
              {spectators.length > 0 && (
                <p className="text-sm text-text-muted text-center">
                  👀 {spectators.length} spectator{spectators.length > 1 ? 's' : ''} watching
                </p>
              )}
              <div className="flex gap-3">
                {!isHost && (
                  <button
                    className={`flex-1 px-4 py-3 rounded-xl cursor-pointer font-semibold text-center transition-colors ${
                      me?.isReady
                        ? 'bg-bg-secondary/80 text-text-muted shadow-sm border border-transparent hover:text-red-400 hover:border-red-400'
                        : 'bg-accent-primary text-white shadow-sm hover:brightness-105'
                    }`}
                    onClick={() => setReady(!me?.isReady)}
                  >
                    {me?.isReady ? 'Unready' : 'Ready'}
                  </button>
                )}
                {isHost && (
                  <button
                    className="flex items-center justify-center gap-2 flex-1 px-4 py-3 rounded-xl font-semibold bg-accent-primary text-white shadow-sm hover:brightness-105 disabled:opacity-40 disabled:grayscale"
                    disabled={!canStart}
                    onClick={startRaceAction}
                    title={!canStart ? 'Need at least 2 players, all ready' : undefined}
                  >
                    <Flag className="w-4 h-4" /> Start Race
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right column – Player List with color features */}
          <div className="lg:col-span-2 bg-bg-secondary/80 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold text-text-muted">
              <Users className="w-4 h-4" /> Players ({activePlayers.length}/{settings.maxPlayers})
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              <AnimatePresence initial={false}>
                {activePlayers.map((p) => {
                  const isMe = p.userId === currentUser.id;
                  return (
                    <motion.div
                      key={p.userId}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-col gap-2 px-4 py-3 hover:bg-bg-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatar username={p.username} avatarUrl={p.avatarUrl} ring={p.isHost} />
                          {/* Static color dot for every player */}
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: resolvePlayerColor(p.colorId, theme) }}
                            title={isMe ? undefined : `${p.username}'s color`}
                          />
                          <span className="font-medium truncate">{p.username}</span>
                          {p.isHost && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              p.isHost || p.isReady
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-bg-primary/50 text-text-muted'
                            }`}
                          >
                            {p.isHost ? 'Host' : p.isReady ? '● Ready' : 'Not ready'}
                          </span>
                          {isHost && !p.isHost && (
                            <div className="flex items-center gap-2">
                              <button
                                className="text-xs text-text-muted hover:text-text-primary transition-colors"
                                onClick={() => transferHost(p.userId)}
                              >
                                Make host
                              </button>
                              <button
                                className="text-xs text-red-400/80 hover:text-red-400 transition-colors"
                                onClick={() => kickPlayer(p.userId)}
                              >
                                Kick
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Color swatch picker only for the local player */}
                      {isMe && (
                        <div className="pl-12">
                          <PlayerColorSwatches players={activePlayers} myColorId={p.colorId} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 opacity-50">
                  <div className="w-9 h-9 rounded-full border-2 border-dashed border-border/40" />
                  <span className="text-sm text-text-muted">Waiting for player…</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LobbyPage;