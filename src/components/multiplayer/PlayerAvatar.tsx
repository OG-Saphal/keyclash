import React from 'react';

interface Props {
  username: string;
  avatarUrl: string | null;
  size?: number;
  ring?: boolean;
}

const COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-pink-500'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Renders the player's real avatar when present, otherwise a colored circle
 * with their initial — never an empty gray box. (Root cause of avatars not
 * showing at all was upstream, in multiplayer.service.ts's handshake payload
 * — see that file's fix note — but every avatar slot should degrade
 * gracefully regardless, since not everyone sets a profile picture.)
 */
const PlayerAvatar: React.FC<Props> = ({ username, avatarUrl, size = 36, ring = false }) => {
  const style = { width: size, height: size };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        style={style}
        className={`rounded-full object-cover ${ring ? 'ring-2 ring-accent' : ''}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${colorForName(username)} ${ring ? 'ring-2 ring-accent' : ''}`}
    >
      <span style={{ fontSize: size * 0.42 }}>{username.charAt(0).toUpperCase()}</span>
    </div>
  );
};

export default PlayerAvatar;
