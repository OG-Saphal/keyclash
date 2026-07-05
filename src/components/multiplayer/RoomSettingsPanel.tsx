import React from 'react';
import { Clock, BookOpen, Users, Globe, Lock as LockIcon, Sparkles, Hash } from 'lucide-react';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import type { RoomStateDTO } from '../../types/multiplayer';

interface Props {
  room: RoomStateDTO;
  isHost: boolean;
}

const ToggleChip: React.FC<{ label: string; icon: React.ReactNode; active: boolean; editable: boolean; onToggle: () => void }> = ({
  label,
  icon,
  active,
  editable,
  onToggle,
}) => (
  <button
    disabled={!editable}
    onClick={onToggle}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-bg-primary border-border text-text-muted'
    } ${editable ? 'cursor-pointer hover:border-accent/60' : 'cursor-default opacity-80'}`}
  >
    {icon}
    {label}
  </button>
);

/**
 * Shows every setting the host configured when creating the room (mode,
 * duration/word count, word set, punctuation, numbers, max players,
 * visibility) — previously only mode/duration/wordSet showed up in the
 * lobby header. Non-host players see the same panel read-only; the host can
 * change anything here live (server re-broadcasts room:updated to everyone,
 * so all clients stay in sync). Locked automatically once the race isn't in
 * 'waiting' status, since the server rejects setting changes at that point.
 */
const RoomSettingsPanel: React.FC<Props> = ({ room, isHost }) => {
  const updateSettings = useMultiplayerStore((s) => s.updateSettings);
  const editable = isHost && room.status === 'waiting';
  const { settings } = room;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Room Settings</h3>
        {!editable && isHost && <span className="text-xs text-text-muted">Locked once the race starts</span>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Mode
          <select
            disabled={!editable}
            value={settings.mode}
            onChange={(e) => updateSettings({ mode: e.target.value as 'time' | 'words' })}
            className="bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary disabled:opacity-70"
          >
            <option value="time">Time</option>
            <option value="words">Words</option>
          </select>
        </label>

        {settings.mode === 'time' ? (
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</span>
            <select
              disabled={!editable}
              value={settings.duration}
              onChange={(e) => updateSettings({ duration: Number(e.target.value) as any })}
              className="bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary disabled:opacity-70"
            >
              {[15, 30, 60, 120].map((d) => <option key={d} value={d}>{d}s</option>)}
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Word count</span>
            <select
              disabled={!editable}
              value={settings.wordCount}
              onChange={(e) => updateSettings({ wordCount: Number(e.target.value) as any })}
              className="bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary disabled:opacity-70"
            >
              {[10, 25, 50, 100].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Word set</span>
          <select
            disabled={!editable}
            value={settings.wordSet}
            onChange={(e) => updateSettings({ wordSet: e.target.value as any })}
            className="bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary disabled:opacity-70"
          >
            <option value="english200">English 200</option>
            <option value="english1k">English 1k</option>
            <option value="common">Common</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Max players</span>
          {editable ? (
            <input
              type="range"
              min={2}
              max={10}
              value={settings.maxPlayers}
              onChange={(e) => updateSettings({ maxPlayers: Number(e.target.value) })}
            />
          ) : (
            <span className="text-sm text-text-primary py-1.5">{settings.maxPlayers}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            {settings.visibility === 'public' ? <Globe className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
            Visibility
          </span>
          {editable ? (
            <select
              value={settings.visibility}
              onChange={(e) => updateSettings({ visibility: e.target.value as any })}
              className="bg-bg-primary border border-border rounded px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          ) : (
            <span className="text-sm text-text-primary py-1.5 capitalize">{settings.visibility}</span>
          )}
        </label>
      </div>

      <div className="flex gap-2 flex-wrap pt-1">
        <ToggleChip
          label="Punctuation"
          icon={<Sparkles className="w-3 h-3" />}
          active={settings.punctuation}
          editable={editable}
          onToggle={() => updateSettings({ punctuation: !settings.punctuation })}
        />
        <ToggleChip
          label="Numbers"
          icon={<Hash className="w-3 h-3" />}
          active={settings.numbers}
          editable={editable}
          onToggle={() => updateSettings({ numbers: !settings.numbers })}
        />
      </div>
    </div>
  );
};

export default RoomSettingsPanel;
