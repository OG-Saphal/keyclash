import React from 'react';
import { Check, X, Loader } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import UserAvatar from '../auth/UserAvatar';

const FriendRequests: React.FC = () => {
    const user = useAuthStore(s => s.user);
    const incoming = useFriendsStore(s => s.incoming);
    const outgoing = useFriendsStore(s => s.outgoing);
    const accept = useFriendsStore(s => s.accept);
    const decline = useFriendsStore(s => s.decline);
    const cancel = useFriendsStore(s => s.cancel);
    const [busy, setBusy] = React.useState<string | null>(null);

    if (!user) return null;

    const withBusy = async (id: string, fn: () => Promise<void>) => {
        setBusy(id);
        try { await fn(); } finally { setBusy(null); }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
                    Incoming ({incoming.length})
                </h3>
                {incoming.length === 0 ? (
                    <p className="text-sm text-text-muted">No pending requests.</p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {incoming.map(r => (
                            <li key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary/30">
                                <UserAvatar user={r.otherUser} size={32} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary truncate">{r.otherUser.displayName}</p>
                                    <p className="text-xs text-text-muted truncate">@{r.otherUser.username}</p>
                                </div>
                                {busy === r.id ? (
                                    <Loader size={14} className="animate-spin text-text-muted" />
                                ) : (
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => withBusy(r.id, () => accept(r.id, user.id))}
                                            className="w-7 h-7 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                                            title="Accept"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => withBusy(r.id, () => decline(r.id, user.id))}
                                            className="w-7 h-7 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                            title="Decline"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted mb-2">
                    Sent ({outgoing.length})
                </h3>
                {outgoing.length === 0 ? (
                    <p className="text-sm text-text-muted">No outgoing requests.</p>
                ) : (
                    <ul className="flex flex-col gap-1">
                        {outgoing.map(r => (
                            <li key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary/30">
                                <UserAvatar user={r.otherUser} size={32} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary truncate">{r.otherUser.displayName}</p>
                                    <p className="text-xs text-text-muted truncate">@{r.otherUser.username}</p>
                                </div>
                                <button
                                    onClick={() => withBusy(r.id, () => cancel(r.id, user.id))}
                                    disabled={busy === r.id}
                                    className="text-xs font-mono text-text-muted hover:text-red-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default FriendRequests; 