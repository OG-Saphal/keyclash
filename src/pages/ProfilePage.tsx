import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Trash2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { fetchHistory, fetchUserStats } from '../services/results.service';
import UserAvatar from '../components/auth/UserAvatar';
import { Button } from '../components/ui/FormElements';
import type { StoredResult } from '../types/auth';

const ProfilePage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const uploadAvatar = useAuthStore(s => s.uploadAvatar);
  const removeAvatar = useAuthStore(s => s.removeAvatar);

  const [recentResults, setRecentResults] = useState<StoredResult[]>([]);
  const [avgWpm, setAvgWpm] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    fetchHistory(user.id, 1, 10)
      .then(({ results }) => setRecentResults(results))
      .catch(() => null);

    fetchUserStats(user.id)
      .then(stats => setAvgWpm(stats ? Math.round(stats.avgWpm) : 0))
      .catch(() => setAvgWpm(null));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">
          <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to view your profile.
        </p>
      </div>
    );
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await uploadAvatar(file); } catch { /* handled in store */ }
    finally { setUploading(false); }
  };

  const handleRemoveAvatar = async () => {
    setRemoving(true);
    try { await removeAvatar(); } catch { /* handled in store */ }
    finally { setRemoving(false); }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const statCards = [
    { label: 'Total tests', value: user.totalTests.toLocaleString() },
    { label: 'Time typed', value: formatTime(user.totalTimeTyped) },
    { label: 'Avg Speed', value: avgWpm === null ? '—' : `${avgWpm} wpm` },
    { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* 👇 Header – now matches homepage (no extra link) */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-bg-tertiary/40">
        <Link to="/" className="flex items-center gap-0.5">
          <span className="text-accent-primary font-mono font-bold text-xl">key</span>
          <span className="text-text-primary font-mono font-bold text-xl">Clash</span>
        </Link>
        {/* Header right side is empty – the user menu and theme toggle are rendered elsewhere (e.g., in a global layout) */}
        {/* If this component is used standalone, you may add ThemeToggle and UserMenu here */}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to typing
        </Link>

        {/* Profile card */}
        <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 flex items-center gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <UserAvatar user={user} size={80} />
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-7 h-7 rounded-full bg-bg-primary border border-bg-tertiary flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                title="Upload avatar"
              >
                <Camera size={13} />
              </button>
              {user.avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={removing}
                  className="w-7 h-7 rounded-full bg-bg-primary border border-bg-tertiary flex items-center justify-center text-text-muted hover:text-red-400 transition-colors"
                  title="Remove avatar"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-xl text-text-primary truncate">
                {user.displayName}
              </h1>
              {user.emailVerified && (
                <span title="Email verified">
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-text-muted text-sm">@{user.username}</p>
            <p className="text-text-muted text-xs mt-0.5 truncate">{user.email}</p>
          </div>

          {/* 👇 This button remains */}
          <Link to="/account">
            <Button variant="ghost" className="shrink-0">Edit profile</Button>
          </Link>
        </div>

        {/* Stats grid */}
        <div>
          <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">
            Stats
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(card => (
              <div
                key={card.label}
                className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4"
              >
                <p className="text-xs text-text-muted mb-1">{card.label}</p>
                <p className="font-mono font-bold text-text-primary text-lg">{card.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tests */}
        <div>
          <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">
            Recent tests
          </h2>
          {recentResults.length === 0 ? (
            <p className="text-text-muted text-sm">No tests saved yet. Complete a test to see results here.</p>
          ) : (
            <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bg-tertiary/40 text-text-muted text-xs uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">Date</th>
                    <th className="px-4 py-2.5 text-right">WPM</th>
                    <th className="px-4 py-2.5 text-right">Raw</th>
                    <th className="px-4 py-2.5 text-right">Acc</th>
                    <th className="px-4 py-2.5 text-left">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResults.map(r => (
                    <tr
                      key={r.id}
                      className="border-b border-bg-tertiary/20 last:border-0 hover:bg-bg-tertiary/10 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-text-muted font-mono text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-accent-primary font-mono font-bold">
                        {Number(r.wpm).toFixed(0)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-muted font-mono">
                        {Number(r.raw_wpm).toFixed(0)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-muted font-mono">
                        {Number(r.accuracy).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-xs">
                        {r.mode === 'time' ? `${r.duration}s` : `${r.word_count}w`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;