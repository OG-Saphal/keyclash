import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useFriendsStore } from '../store/useFriendsStore';
import UserSearch from '../components/friends/UserSearch';
import FriendRequests from '../components/friends/FriendRequests';
import FriendsList from '../components/friends/FriendsList';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-bg-secondary border border-bg-tertiary/60 rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="font-mono font-semibold text-sm text-text-muted uppercase tracking-wider">{title}</h2>
        {children}
    </div>
);

const FriendsPage: React.FC = () => {
    const user = useAuthStore(s => s.user);
    const loadAll = useFriendsStore(s => s.loadAll);

    useEffect(() => {
        if (user) loadAll(user.id);
    }, [user, loadAll]);

    if (!user) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <p className="text-text-muted">
                    <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to manage friends.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary">
            <header className="flex items-center justify-between px-8 py-4 border-b border-bg-tertiary/40">
                <Link to="/" className="flex items-center gap-0.5">
                    <span className="text-accent-primary font-mono font-bold text-xl">key</span>
                    <span className="text-text-primary font-mono font-bold text-xl">Clash</span>
                </Link>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
                <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
                    <ArrowLeft size={14} /> Back to profile
                </Link>

                <h1 className="font-mono font-bold text-2xl">Friends</h1>

                <Section title="Add a friend">
                    <UserSearch />
                </Section>

                <Section title="Requests">
                    <FriendRequests />
                </Section>

                <Section title="Your friends">
                    <FriendsList />
                </Section>
            </main>
        </div>
    );
};

export default FriendsPage;