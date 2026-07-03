import React from 'react';
import type { UserProfile } from '../../types/auth';

interface AvatarProps {
  user: UserProfile;
  size?: number;
  className?: string;
}

/**
 * Renders the user's avatar image if present, otherwise a circle
 * with their initials in the accent colour.
 */
const UserAvatar: React.FC<AvatarProps> = ({ user, size = 32, className = '' }) => {
  const initials = (user.displayName || user.username || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        width={size}
        height={size}
        className={`rounded-full object-cover select-none ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-mono font-bold text-accent-primary"
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </span>
    </div>
  );
};

export default UserAvatar;
