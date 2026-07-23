import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Camera,
    Trash2,
    CheckCircle,
    Clock,
    Keyboard,
    BarChart3,
    Calendar,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import UserAvatar from '../components/auth/UserAvatar';
import { Button } from '../components/ui/FormElements';
import StatsModeToggle, { type StatsMode } from '../components/profile/StatsModeToggle';
import ActivityHeatmap from '../components/profile/ActivityHeatmap';
import ShareProfileButton from '../components/profile/ShareProfileButton';
import MultiplayerStatsSection from '../components/profile/MultiplayerStatsSection';
import { fetchHistory, fetchUserStats, fetchStreak, fetchActivityHeatmap } from '../services/results.service';
import { fetchMultiplayerStats, fetchRecentMultiplayerResults } from '../services/multiplayerStats.service';
import type { StreakStats, ActivityDay } from '../types/auth';
import type { UserProfile } from '../types/auth';
import type { StoredResult } from '../types/auth';
import type { MultiplayerStatsSummary, MultiplayerRecentResult } from '../types/multiplayerStats';

interface ProfileViewProps {
    user: UserProfile;
    isOwnProfile: boolean;
    friendsSince?: string | null;
}

// ── Local time‑range type (only 7d / 15d / 30d) ──
type TimeRange = '7d' | '15d' | '30d';

const TIME_RANGES: { key: TimeRange; label: string; days: number }[] = [
    { key: '7d', label: '7 days', days: 7 },
    { key: '15d', label: '15 days', days: 15 },
    { key: '30d', label: '30 days', days: 30 },
];

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

    // ── Time filter state ──────────────────────────────────────────────
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const [recentResults, setRecentResults] = useState<StoredResult[]>([]);
    const [avgWpm, setAvgWpm] = useState<number | null>(null);
    const [totalTestsInRange, setTotalTestsInRange] = useState<number | null>(null);
    const [timeTypedInRange, setTimeTypedInRange] = useState<number | null>(null); // <-- added
    const [statsLoading, setStatsLoading] = useState(true);

    // ── Streak ──────────────────────────────────────────────────────────
    const [streak, setStreak] = useState<StreakStats | null>(null);

    // ── Activity heatmap ───────────────────────────────────────────────
    const [heatmapData, setHeatmapData] = useState<ActivityDay[]>([]);
    const [heatmapLoading, setHeatmapLoading] = useState(true);

    // ── Multiplayer stats ──────────────────────────────────────────────
    const [mpSummary, setMpSummary] = useState<MultiplayerStatsSummary | null>(null);
    const [mpRecent, setMpRecent] = useState<MultiplayerRecentResult[]>([]);
    const [mpLoading, setMpLoading] = useState(true);

    // ── Stats mode toggle (single / multiplayer) ─────────────────────
    const [statsMode, setStatsMode] = useState<StatsMode>('single');

    // ── Fallback to single if no multiplayer data ─────────────────────
    useEffect(() => {
        if (!mpLoading && !mpSummary && statsMode === 'multiplayer') {
            setStatsMode('single');
        }
    }, [mpLoading, mpSummary, statsMode]);

    // ── Load time‑filtered data (single‑player stats + recent tests) ──
    const loadFilteredData = useCallback(async (range: TimeRange) => {
        setStatsLoading(true);
        const selected = TIME_RANGES.find(r => r.key === range);
        let dateFrom: string | undefined;
        if (selected) {
            const d = new Date();
            d.setDate(d.getDate() - selected.days);
            dateFrom = d.toISOString();
        }
        const filters = dateFrom ? { dateFrom } : undefined;

        try {
            const [historyRes, statsRes] = await Promise.all([
                fetchHistory(user.id, 1, 20, filters),
                fetchUserStats(user.id, filters),
            ]);
            setRecentResults(historyRes.results);
            setTotalTestsInRange(historyRes.total);
            setAvgWpm(statsRes ? statsRes.avgWpm : 0);
            setTimeTypedInRange(statsRes ? statsRes.totalTimeTyped : 0); // <-- read filtered time
        } catch {
            setRecentResults([]);
            setAvgWpm(null);
            setTotalTestsInRange(null);
            setTimeTypedInRange(null);
        } finally {
            setStatsLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        loadFilteredData(timeRange);
    }, [loadFilteredData, timeRange]);

    // ── Fetch streak ──────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        fetchStreak(user.id)
            .then(s => { if (!cancelled) setStreak(s); })
            .catch(() => { if (!cancelled) setStreak(null); });
        return () => { cancelled = true; };
    }, [user.id]);

    // ── Fetch heatmap ──────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setHeatmapLoading(true);
        fetchActivityHeatmap(user.id, 365)
            .then(d => { if (!cancelled) setHeatmapData(d); })
            .catch(() => { if (!cancelled) setHeatmapData([]); })
            .finally(() => { if (!cancelled) setHeatmapLoading(false); });
        return () => { cancelled = true; };
    }, [user.id]);

    // ── Fetch multiplayer stats ───────────────────────────────────────
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

    // ── Avatar handlers ───────────────────────────────────────────────
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

    // ── Stat cards data (now timeTypedInRange is filtered) ──────────
    const statCards = [
        {
            label: 'Tests',
            value: (totalTestsInRange ?? 0).toLocaleString(),
            icon: Keyboard,
        },
        {
            label: 'Time typed',
            value: timeTypedInRange !== null ? formatTime(timeTypedInRange) : '—',
            icon: Clock,
        },
        {
            label: 'Avg WPM',
            value: avgWpm !== null ? Math.round(avgWpm).toString() : '—',
            icon: BarChart3,
        },
        {
            label: 'Member since',
            value: new Date(user.createdAt).toLocaleDateString(),
            icon: Calendar,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
            {/* ── Profile card ── */}
            <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 flex items-center gap-6 flex-wrap shadow-sm">
                {/* Avatar */}
                <div className="relative shrink-0">
                    <UserAvatar user={user} size={80} />
                    {isOwnProfile && (
                        <div className="absolute -bottom-1 -right-1 flex gap-1">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="w-7 h-7 rounded-full bg-bg-primary border border-bg-tertiary flex items-center justify-center text-text-muted hover:text-accent-primary transition-colors"
                                title="Change avatar"
                            >
                                <Camera size={13} />
                            </button>
                            {user.avatarUrl && (
                                <button
                                    type="button"
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-mono font-bold text-xl text-text-primary truncate">
                            {user.displayName}
                        </h1>
                        {user.emailVerified && (
                            <span title="Email verified">
                                <CheckCircle size={16} className="text-green-400 shrink-0" />
                            </span>
                        )}
                        {/* Streak badge */}
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
                    {isOwnProfile && (
                        <p className="text-text-muted text-xs mt-0.5 truncate">{user.email}</p>
                    )}
                </div>

                {/* Right actions */}
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

            {/* ── Bio ── */}
            {user.bio && (
                <div>
                    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-2">
                        About me
                    </h2>
                    <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4">
                        <p className="text-text-secondary text-sm whitespace-pre-wrap break-words">
                            {user.bio}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Stats ── */}
            <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider">
                        Stats
                    </h2>
                    <div className="flex items-center gap-2">
                        {statsMode === 'single' && (
                            <>
                                <div className="flex items-center gap-1 bg-bg-secondary border border-bg-tertiary/60 rounded-lg p-0.5">
                                    {TIME_RANGES.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            onClick={() => setTimeRange(key)}
                                            disabled={statsLoading}
                                            className={`
                        px-3 py-1 text-xs font-mono rounded-md transition-all cursor-pointer
                        ${timeRange === key
                                                    ? 'bg-accent-primary/20 text-accent-primary font-semibold'
                                                    : 'text-text-muted hover:text-text-primary'
                                                }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="w-px h-6 bg-bg-tertiary/40" />
                            </>
                        )}
                        <div className="cursor-pointer">
                            <StatsModeToggle
                                value={statsMode}
                                onChange={setStatsMode}
                                multiplayerDisabledReason={!mpLoading && !mpSummary ? 'No multiplayer races yet' : null}
                            />
                        </div>
                    </div>
                </div>

                {statsMode === 'single' ? (
                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 transition-opacity ${statsLoading ? 'opacity-60' : ''}`}>
                        {statCards.map(({ label, value, icon: Icon }) => (
                            <div
                                key={label}
                                className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4 flex items-start gap-3"
                            >
                                <Icon size={18} className="text-text-muted shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-text-muted">{label}</p>
                                    <p className="font-mono font-bold text-text-primary text-lg leading-tight">
                                        {value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-4">
                        <MultiplayerStatsSection summary={mpSummary} recent={mpRecent} loading={mpLoading} hideHeading />
                    </div>
                )}
            </div>

            {/* ── Activity heatmap ── */}
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

            {/* ── Recent tests (single‑player only) ── */}
            {statsMode === 'single' && (
                <div>
                    <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider mb-3">
                        Recent tests
                    </h2>
                    {recentResults.length === 0 ? (
                        <p className="text-text-muted text-sm bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4">
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
            )}
        </div>
    );
};

export default ProfileView;