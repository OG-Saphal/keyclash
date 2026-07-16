import React, { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '../ui/FormElements';

// 🆕 Feature 3 — profile sharing. /u/:username is now a fully public route
// (see FriendProfilePage.tsx — the sign-in gate was removed there), so the
// link this generates works for anyone, signed in or not.

interface ShareProfileButtonProps {
  username: string;
}

const ShareProfileButton: React.FC<ShareProfileButtonProps> = ({ username }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // HashRouter is in use (see App.tsx / architecture notes — GitHub Pages
  // has no SPA server-side rewrite support), so the shareable URL must
  // include the '#/' segment.
  const profileUrl = `${window.location.origin}${window.location.pathname}#/u/${username}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permissions denied — silently ignore, copy button still shows the link on click */
    }
  };

  const shareText = encodeURIComponent(`Check out my typing stats on KeyClash!`);
  const encodedUrl = encodeURIComponent(profileUrl);

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen(o => !o)} className="flex items-center gap-2">
        <Share2 size={14} /> Share profile
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-bg-secondary border border-bg-tertiary/60 rounded-xl p-3 shadow-card z-50 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-bg-primary/50 rounded-lg px-2.5 py-2">
              <input
                readOnly
                value={profileUrl}
                className="flex-1 bg-transparent text-xs text-text-muted font-mono outline-none truncate"
                onFocus={e => e.currentTarget.select()}
              />
              <button
                onClick={handleCopy}
                title="Copy link"
                className="text-text-muted hover:text-accent-primary transition-colors shrink-0"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-mono py-1.5 rounded-lg bg-bg-primary/50 text-text-muted hover:text-text-primary transition-colors"
              >
                Twitter / X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-mono py-1.5 rounded-lg bg-bg-primary/50 text-text-muted hover:text-text-primary transition-colors"
              >
                Facebook
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareProfileButton;
