import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import ProfileView from '../profile/ProfileView';
import type { UserProfile } from '../types/auth';
import type { FriendshipStatus } from '../types/friends';

// 🆕 Per product decision: this route (/u/:username) is now a fully public
// profile page — the previous "sign in to view profiles" gate is removed
// entirely, since it's also the destination of the new Share Profile link
// (Feature 3), which has to work for signed-out visitors too. Friend-request
// UI (Add friend / pending / friends badge) still only renders for a
// SIGNED-IN viewer — an anonymous visitor just sees the public stats.
//
// 🆕 recentResults/avgWpm fetching moved into ProfileView itself (it now
// takes just `user` + `isOwnProfile` + `friendsSince` and fetches everything
// else — time-filtered stats, streak, heatmap, multiplayer stats — using
// user.id). That removes the duplicate fetchHistory() call this page used
// to make purely to compute an avgWpm fallback.
const FriendProfilePage: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const myUser = useAuthStore(s => s.user);
    const sendRequest = useFriendsStore(s => s.sendRequest);
    const getFriendshipStatus = useFriendsStore(s => s.getFriendshipStatus);
    const toggleSidebar = useFriendsStore(s => s.toggleSidebar);
    const navigate = useNavigate();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [friendship, setFriendship] = useState<FriendshipStatus>('none');
    const [friendsSince, setFriendsSince] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!username) return;
        let cancelled = false;

        (async () => {
            setLoading(true);

            try {
                // 1) Fetch the target profile by username — public, works
                // whether or not anyone is signed in.
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
                let friendsSinceLocal: string | null = null;

                // 2) Friendship status only matters (and is only computable)
                // when someone is actually signed in.
                if (myUser) {
                    const { status, requestId } = await getFriendshipStatus(myUser.id, targetUserId);
                    if (cancelled) return;
                    setFriendship(status);

                    if (status === 'friends' && requestId) {
                        const { data: sinceData } = await supabase
                            .from('friend_requests')
                            .select('responded_at')
                            .eq('id', requestId)
                            .single();
                        if (!cancelled && sinceData?.responded_at) {
                            friendsSinceLocal = new Date(sinceData.responded_at).toLocaleDateString();
                        }
                    }
                } else {
                    setFriendship('none');
                }

                if (!cancelled) {
                    const fullProfile: UserProfile = {
                        id: profileData.id,
                        username: profileData.username,
                        displayName: profileData.display_name,
                        avatarUrl: profileData.avatar_url,
                        email: '',
                        emailVerified: false,
                        createdAt: profileData.created_at,
                        totalTests: profileData.total_tests ?? 0,
                        totalTimeTyped: profileData.total_time_typed ?? 0,
                        bio: profileData.bio ?? null,
                        preferences: profileData.preferences ?? {
                            theme: 'dark',
                            defaultMode: 'time',
                            defaultWordSet: 'english200',
                            defaultDuration: 15,
                            defaultWordCount: 25,
                        },
                        avgwpm: 0, // ProfileView computes its own time-filtered avg internally
                    };

                    setProfile(fullProfile);
                    setFriendsSince(friendsSinceLocal);
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

    const isOwnProfile = myUser?.id === profile.id;

    const handleAdd = async () => {
        if (!myUser) return;
        await sendRequest(myUser.id, profile.id);
        setFriendship('pending_sent');
    };

    const handleBackToFriends = () => {
        if (myUser) toggleSidebar();
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
                    <ArrowLeft size={14} /> Back
                </button>

                {/* Friend-request UI only makes sense for a signed-in viewer
                    looking at someone ELSE's profile. */}
                {myUser && !isOwnProfile && friendship !== 'friends' && (
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

                {myUser && !isOwnProfile && friendship === 'friends' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-400 font-mono">
                        <Check size={12} /> Friends
                    </div>
                )}

                {!myUser && (
                    <p className="text-xs text-text-muted">
                        <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to add friends and see more.
                    </p>
                )}

                <ProfileView
                    user={profile}
                    isOwnProfile={isOwnProfile}
                    friendsSince={friendsSince}
                />
            </main>
        </div>
    );
};

export default FriendProfilePage;
