// src/components/multiplayer/InviteNotification.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useInviteStore } from '../../store/useInviteStore';

const InviteNotification: React.FC = () => {
    const invite = useInviteStore((s) => s.invite);
    const clearInvite = useInviteStore((s) => s.clearInvite);
    const navigate = useNavigate();
    const joinRoom = useMultiplayerStore((s) => s.joinRoom);
    // 🐛 FIX (accept not working for private rooms) — joinRoom() resolves to
    // a result OBJECT ({ ok: boolean; code?: string }), never a bare
    // boolean. `if (ok)` was checking the truthiness of that object, which
    // is always true — even `{ ok: false, code: 'BAD_PASSWORD' }` is a
    // truthy object — so this navigated to the lobby unconditionally, on
    // every accept, regardless of whether the join actually succeeded. For
    // a private room the join legitimately failed server-side (no password
    // was ever collected for an invite accept — see roomManager.joinRoom's
    // new invitedUserIds bypass, which is the real fix on the server side),
    // so the user landed on /multiplayer/lobby with no room loaded, which
    // immediately redirects away — reading as "accept does nothing."
    const [error, setError] = useState<string | null>(null);

    const accept = async () => {
        if (!invite) return;
        setError(null);
        const result = await joinRoom(invite.roomId);
        if (result.ok) {
            clearInvite();
            navigate('/multiplayer/lobby');
        } else {
            // Keep the invite visible so the user can retry instead of it
            // silently vanishing on a failed join.
            setError(
                result.code === 'BAD_PASSWORD'
                    ? "Couldn't join — this invite may have expired. Ask for a new one."
                    : result.code === 'ROOM_NOT_FOUND'
                    ? 'This room no longer exists.'
                    : "Couldn't join that room. Try again."
            );
        }
    };

    const decline = () => {
        setError(null);
        clearInvite();
    };

    if (!invite) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-bg-secondary rounded-xl shadow-xl p-4 max-w-sm border border-bg-tertiary/60">
            <p className="text-sm font-semibold">
                {invite.inviterUsername} invited you to{' '}
                <span className="text-accent-primary">{invite.roomName}</span>
            </p>
            {error && <p className="text-xs text-status-error mt-1">{error}</p>}
            <div className="flex gap-2 mt-2">
                <button
                    className="px-3 py-1 bg-accent-primary text-white rounded-lg text-sm font-semibold hover:brightness-105 transition-colors"
                    onClick={accept}
                >
                    Accept
                </button>
                <button
                    className="px-3 py-1 bg-bg-tertiary/30 text-text-muted rounded-lg text-sm hover:bg-bg-tertiary/50 transition-colors"
                    onClick={decline}
                >
                    Decline
                </button>
            </div>
        </div>
    );
};

export default InviteNotification;