import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Loader } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import UserAvatar from '../auth/UserAvatar';

const UserSearch: React.FC = () => {
    const myUser = useAuthStore(s => s.user);
    const search = useFriendsStore(s => s.search);
    const clearSearch = useFriendsStore(s => s.clearSearch);
    const searchResults = useFriendsStore(s => s.searchResults);
    const sendRequest = useFriendsStore(s => s.sendRequest);

    const [query, setQuery] = useState('');
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        if (!myUser) return;
        const t = setTimeout(() => {
            if (query.trim()) search(query, myUser.id);
            else clearSearch();
        }, 300);
        return () => clearTimeout(t);
    }, [query, myUser, search, clearSearch]);

    if (!myUser) return null;

    const handleAdd = async (receiverId: string) => {
        setSending(receiverId);
        try {
            await sendRequest(myUser.id, receiverId);
            setSentTo(prev => new Set(prev).add(receiverId));
        } catch { /* surfaced via store error if you want to show it */ }
        finally { setSending(null); }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by username…"
                    className="w-full bg-bg-secondary border border-bg-tertiary rounded-lg pl-9 pr-4 py-2.5
                     text-text-primary placeholder:text-text-muted font-mono text-sm
                     focus:outline-none focus:border-accent-primary transition-colors"
                />
            </div>

            {searchResults.length > 0 && (
                <ul className="flex flex-col gap-1">
                    {searchResults.map(u => (
                        <li
                            key={u.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors"
                        >
                            <UserAvatar user={{ displayName: u.displayName, username: u.username, avatarUrl: u.avatarUrl } as any} size={32} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary truncate">{u.displayName}</p>
                                <p className="text-xs text-text-muted truncate">@{u.username}</p>
                            </div>
                            <button
                                onClick={() => handleAdd(u.id)}
                                disabled={sentTo.has(u.id) || sending === u.id}
                                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg
                           bg-accent-primary text-bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {sending === u.id ? (
                                    <Loader size={12} className="animate-spin" />
                                ) : sentTo.has(u.id) ? (
                                    'Sent'
                                ) : (
                                    <>
                                        <UserPlus size={12} /> Add
                                    </>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default UserSearch;