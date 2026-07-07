// src/components/multiplayer/InviteNotification.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import { useInviteStore } from '../../store/useInviteStore';

const InviteNotification: React.FC = () => {
    const invite = useInviteStore((s) => s.invite);
    const clearInvite = useInviteStore((s) => s.clearInvite);
    const navigate = useNavigate();
    const joinRoom = useMultiplayerStore((s) => s.joinRoom);

    const accept = async () => {
        if (!invite) return;
        const ok = await joinRoom(invite.roomId);
        if (ok) {
            navigate('/multiplayer/lobby');
        }
        clearInvite();
    };

    const decline = () => {
        clearInvite();
    };

    if (!invite) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-bg-secondary rounded-xl shadow-xl p-4 max-w-sm border border-bg-tertiary/60">
            <p className="text-sm font-semibold">
                {invite.inviterUsername} invited you to{' '}
                <span className="text-accent-primary">{invite.roomName}</span>
            </p>
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