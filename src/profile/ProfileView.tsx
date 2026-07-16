import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Trash2, CheckCircle, Flame } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import UserAvatar from '../components/auth/UserAvatar';
import { Button } from '../components/ui/FormElements';
import TimeFilterTabs from '../components/profile/TimeFilterTabs';
import ActivityHeatmap from '../components/profile/ActivityHeatmap';
import ShareProfileButton from '../components/profile/ShareProfileButton';
import MultiplayerStatsSection from '../components/profile/MultiplayerStatsSection';
import { fetchHistory, fetchUserStats, fetchStreak, fetchActivityHeatmap } from '../services/results.service';
import { fetchMultiplayerStats, fetchRecentMultiplayerResults } from '../services/multiplayerStats.service';
import { TIME_RANGE_OPTIONS, type TimeRangeKey, type StreakStats, type ActivityDay } from '../types/auth';
import type { UserProfile } from '../types/auth';
import type { StoredResult } from '../types/auth';
import type { MultiplayerStatsSummary, MultiplayerRecentResult } from '../types/multiplayerStats';

interface ProfileViewProps {
    user: UserProfile;
    isOwnProfile: boolean;
    friendsSince?: string | null;
}

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const ProfileView: React.FC<ProfileViewProps> = ({
    user,
    isOwnProfile,
    friendsSince,
}) => {
    const uploadAvatar = useAuthStore(s => s.uploadAvatar);
    const removeAvatar = useAuthStore(s => s.removeAvatar);
    const [uploading, setUploading] = useState(false);
    const [removing, setRemoving] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // 🆕 Feature 1 — time-range filter, drives both the stat cards and the
    // recent-tests table below.
    const [timeRange, setTimeRange] = useState<TimeRangeKey>('all');
    const [recentResults, setRecentResults] = useState<StoredResult[]>([]);
    const [avgWpm, setAvgWpm] = useState<number | null>(null);
    const [totalTestsInRange, setTotalTestsInRange] = useState<number | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // 🆕 Feature 2 — streak
    const [streak, setStreak] = useState<StreakStats | null>(null);

    // 🆕 Feature 7 — activity heatmap
    const [heatmapData, setHeatmapData] = useState<ActivityDay[]>([]);
    const [heatmapLoading, setHeatmapLoading] = useState(true);

    // 🆕 Feature 4 — multiplayer stats
    const [mpSummary, setMpSummary] = useState<MultiplayerStatsSummary | null>(null);
    const [mpRecent, setMpRecent] = useState<MultiplayerRecentResult[]>([]);
    const [mpLoading, setMpLoading] = useState(true);

    // ── Time-filtered stats + history (Feature 1) ──────────────────────────────
    const loadFilteredData = useCallback(async (range: TimeRangeKey) => {
        setStatsLoading(true);
        const option = TIME_RANGE_OPTIONS.find(o => o.key === range)!;
        const dateFrom = option.toDateFrom() ?? undefined;
        const filters = dateFrom ? { dateFrom } : undefined;

        try {
            const [historyRes, statsRes] = await Promise.all([
                fetchHistory(user.id, 1, 20, filters),
                fetchUserStats(user.id, filters),
            ]);
            setRecentResults(historyRes.results);
            setTotalTestsInRange(historyRes.total);
            setAvgWpm(statsRes ? statsRes.avgWpm : 0);
        } catch {
            setRecentResults([]);
            setAvgWpm(null);
            setTotalTestsInRange(null);
        } finally {
            setStatsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        loadFilteredData(timeRange);
    }, [loadFilteredData, timeRange]);

    // ── Streak (Feature 2) — not affected by the time-range filter, it's
    // always "as of today". ─────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        fetchStreak(user.id)
            .then(s => { if (!cancelled) setStreak(s); })
            .catch(() => { if (!cancelled) setStreak(null); });
        return () => { cancelled = true; };
    }, [user.id]);

    // ── Activity heatmap (Feature 7) ────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setHeatmapLoading(true);
        fetchActivityHeatmap(user.id, 365)
            .then(d => { if (!cancelled) setHeatmapData(d); })
            .catch(() => { if (!cancelled) setHeatmapData([]); })
            .finally(() => { if (!cancelled) setHeatmapLoading(false); });
        return () => { cancelled = true; };
    }, [user.id]);

    // ── Multiplayer stats (Feature 4) ───────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setMpLoading(true);
        Promise.all([
            fetchMultiplayerStats(user.id),
            fetchRecentMultiplayerResults(user.id, 10),
        ])
            .then(([summary, recent]) => {
                if (cancelled) return;
                setMpSummary(summary);
                setMpRecent(recent);
            })
            .catch(() => {
                if (cancelled) return;
                setMpSummary(null);
                setMpRecent([]);
            })
            .finally(() => { if (!cancelled) setMpLoading(false); });
        return () => { cancelled = true; };
    }, [user.id]);

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

    const statCards = [
        {
            label: 'Total tests',
            value: timeRange === 'all'
                ? user.totalTests.toLocaleString()
                : (totalTestsInRange ?? 0).toLocaleString(),
        },
        { label: 'Time typed', value: formatTime(user.totalTimeTyped) },
        { label: 'Avg WPM', value: avgWpm !== null ? Math.round(avgWpm).toString() : '—' },
        { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString() },
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* Profile card */}
            <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 flex items-center gap-6 flex-wrap">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <UserAvatar user={user} size={80} />
                    {isOwnProfile && (
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
                    )}
                    {isOwnProfile && (
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    )}
                </div>

                {/* User info */}
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
                        {/* 🆕 Feature 2 — streak, next to the name so it reads as a badge */}
                        {streak && streak.currentStreak > 0 && (
                            <span
                                title={`Best streak: ${streak.bestStreak} days`}
                                className="flex items-center gap-1 text-xs font-mono text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full shrink-0"
                            >
                                🔥 {streak.currentStreak}
                            </span>
                        )}
                    </div>
                    <p className="text-text-muted text-sm">@{user.username}</p>
                    {isOwnProfile && <p className="text-text-muted text-xs mt-0.5 truncate">{user.email}</p>}
                </div>

                {/* Right side: Friends since (if not own profile) + Edit profile / Share button */}
                <div className="flex items-center gap-3 ml-auto shrink-0">
                    {!isOwnProfile && friendsSince && (
                        <div className="text-right text-text-muted">
                            <p className="text-[10px] font-mono uppercase tracking-wider">Friends since</p>
                            <p className="font-mono text-sm font-medium text-text-primary">{friendsSince}</p>
                        </div>
                    )}
                    {isOwnProfile && <ShareProfileButton username={user.username} />}
                    {isOwnProfile && (
                        <Link to="/account">
                            <Button variant="ghost" className="shrink-0">Edit profile</Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* 🆕 Feature 5 — Bio / about section */}
            {user.bio && (
                <div>
                    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-2">
                        About me
                    </h2>
                    <p className="text-text-secondary text-sm bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4 whitespace-pre-wrap break-words">
                        {user.bio}
                    </p>
                </div>
            )}

            {/* Stats grid + time filter */}
            <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider flex items-center gap-2">
                        Stats
                        {streak && (
                            <span className="normal-case font-normal text-[11px] text-text-muted flex items-center gap-1">
                                <Flame size={11} className="text-orange-400" /> best {streak.bestStreak}d
                            </span>
                        )}
                    </h2>
                    <TimeFilterTabs value={timeRange} onChange={setTimeRange} disabled={statsLoading} />
                </div>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity ${statsLoading ? 'opacity-60' : ''}`}>
                    {statCards.map(card => (
                        <div key={card.label} className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4">
                            <p className="text-xs text-text-muted mb-1">{card.label}</p>
                            <p className="font-mono font-bold text-text-primary text-lg">{card.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent tests (time-filtered) */}
            <div>
                <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">
                    Recent tests
                </h2>
                {recentResults.length === 0 ? (
                    <p className="text-text-muted text-sm">
                        {statsLoading ? 'Loading…' : 'No tests in this range.'}
                    </p>
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
                                    <tr key={r.id} className="border-b border-bg-tertiary/20 last:border-0 hover:bg-bg-tertiary/10 transition-colors">
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

            {/* 🆕 Feature 4 — multiplayer stats */}
            <MultiplayerStatsSection summary={mpSummary} recent={mpRecent} loading={mpLoading} />

            {/* 🆕 Feature 7 — activity heatmap */}
            <div>
                <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">
                    Activity
                </h2>
                {heatmapLoading ? (
                    <div className="h-[100px] bg-bg-secondary/50 rounded-xl animate-pulse" />
                ) : (
                    <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4">
                        <ActivityHeatmap userId={user.id} data={heatmapData} days={365} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileView;
