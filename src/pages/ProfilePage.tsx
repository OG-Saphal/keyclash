import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import ProfileView from '../profile/ProfileView';

// 🆕 This page used to duplicate ProfileView's entire profile-card/stats/
// table markup inline (drift risk — FriendProfilePage already used
// ProfileView while this page didn't). It now just supplies the page chrome
// (header/back link) and renders the shared ProfileView, same as
// FriendProfilePage does, so every new feature (time filters, streak, bio,
// multiplayer stats, heatmap, share button) only needs to be built once.
const ProfilePage: React.FC = () => {
  const user = useAuthStore(s => s.user);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">
          <Link to="/login" className="text-accent-primary hover:underline">Sign in</Link> to view your profile.
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

      <main className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to typing
        </Link>

        <ProfileView user={user} isOwnProfile />
      </main>
    </div>
  );
};

export default ProfilePage;
