import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import { fetchHistory } from '../services/results.service';
import ProfileView from '../profile/ProfileView';
import type { UserProfile } from '../types/auth';
import type { StoredResult } from '../types/auth';
import type { FriendshipStatus } from '../types/friends';

const FriendProfilePage: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const myUser = useAuthStore(s => s.user);
    const sendRequest = useFriendsStore(s => s.sendRequest);
    const getFriendshipStatus = useFriendsStore(s => s.getFriendshipStatus);
    const toggleSidebar = useFriendsStore(s => s.toggleSidebar);
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [results, setResults] = useState<StoredResult[]>([]);
    const [friendship, setFriendship] = useState<FriendshipStatus>('none');
    const [friendsSince, setFriendsSince] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!username || !myUser) return;
        let cancelled = false;

        (async () => {
            setLoading(true);

            try {
                // 1) Fetch the target profile by username
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();

                if (cancelled) return;
                if (profileError || !profileData) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                const targetUserId = profileData.id;

                // 2) Check friendship status
                const { status, requestId } = await getFriendshipStatus(myUser.id, targetUserId);
                if (cancelled) return;
                setFriendship(status);

                // 3) Build the full profile object
                const fullProfile: UserProfile = {
                    id: profileData.id,
                    username: profileData.username,
                    displayName: profileData.display_name,
                    avatarUrl: profileData.avatar_url,
                    email: '', // not stored in profiles
                    emailVerified: false,
                    createdAt: profileData.created_at,
                    totalTests: profileData.total_tests ?? 0,
                    totalTimeTyped: profileData.total_time_typed ?? 0,
                    preferences: profileData.preferences ?? {
                        theme: 'dark',
                        defaultMode: 'time',
                        defaultWordSet: 'english200',
                        defaultDuration: 15,
                        defaultWordCount: 25,
                    },
                    avgwpm: profileData.total_time_typed > 0
                        ? (profileData.total_keystrokes / 5) / (profileData.total_time_typed / 60)
                        : 0,
                };

                let friendsSince: string | null = null;
                let results: StoredResult[] = [];

                // 4) If friends, fetch "friends since" and recent results in parallel
                if (status === 'friends' && requestId) {
                    const [sinceData, histData] = await Promise.all([
                        supabase
                            .from('friend_requests')
                            .select('responded_at')
                            .eq('id', requestId)
                            .single(),
                        fetchHistory(targetUserId, 1, 10),
                    ]);

                    if (!cancelled) {
                        if (sinceData.data?.responded_at) {
                            friendsSince = new Date(sinceData.data.responded_at).toLocaleDateString();
                        }
                        if (histData.results) {
                            results = histData.results;
                        }
                    }
                }

                if (!cancelled) {
                    setProfile(fullProfile);
                    setFriendsSince(friendsSince);
                    setResults(results);
                    setLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    setLoading(false);
                }
            }
        })();

        return () => { cancelled = true; };
    }, [username, myUser, getFriendshipStatus]);

    if (!myUser) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <p className="text-text-muted">
                    <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to view profiles.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen bg-bg-primary" />;
    }

    if (notFound || !profile) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <p className="text-text-muted">User not found.</p>
            </div>
        );
    }

    const handleAdd = async () => {
        await sendRequest(myUser.id, profile.id);
        setFriendship('pending_sent');
    };

    const handleBackToFriends = () => {
        toggleSidebar();
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <header className="flex items-center justify-between px-8 py-4 border-b border-bg-tertiary/40">
                <Link to="/" className="flex items-center gap-0.5">
                    <span className="text-accent-primary font-mono font-bold text-xl">key</span>
                    <span className="text-text-primary font-mono font-bold text-xl">Clash</span>
                </Link>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">
                <button
                    onClick={handleBackToFriends}
                    className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                    <ArrowLeft size={14} /> Back to friends
                </button>

                {friendship !== 'friends' && (
                    <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-4 flex items-center justify-between">
                        <p className="text-sm text-text-muted">
                            {friendship === 'pending_sent' && 'Friend request sent.'}
                            {friendship === 'pending_received' && 'This user sent you a friend request — check your Friends page.'}
                            {friendship === 'none' && 'Add this person to see their stats and recent tests.'}
                        </p>
                        {friendship === 'none' && (
                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-accent-primary text-bg-primary hover:opacity-90 transition-opacity shrink-0"
                            >
                                <UserPlus size={12} /> Add friend
                            </button>
                        )}
                        {friendship === 'pending_sent' && (
                            <span className="flex items-center gap-1 text-xs text-text-muted shrink-0"><Clock size={12} /> Pending</span>
                        )}
                    </div>
                )}

                {friendship === 'friends' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono">
                        <Check size={12} /> Friends
                    </div>
                )}

                {/*  Pass friendsSince to ProfileView */}
                <ProfileView
                    user={profile}
                    recentResults={results}
                    isOwnProfile={false}
                    avgWpm={profile.avgwpm}
                    friendsSince={friendsSince}
                />
            </main>
        </div>
    );
};

export default FriendProfilePage;