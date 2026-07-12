import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, Search, UserMinus, Loader, UserPlus, UserCog, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { useFriendsStore } from '../../store/useFriendsStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import UserAvatar from '../auth/UserAvatar';

// ─── Debounce ────────────────────────────────────────────────────────────────
const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearInterval(handler);
    }, [value, delay]);
    return debouncedValue;
};

// ─── Component ──────────────────────────────────────────────────────────────
const FriendsSidebar: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const onlineUsers = usePresenceStore(s => s.onlineUsers);
    const currentRoom = useMultiplayerStore(s => s.currentRoom);
    const inviteFriendToRoom = useMultiplayerStore(s => s.inviteFriendToRoom);

    const sidebarOpen = useFriendsStore(s => s.sidebarOpen);
    const closeSidebar = useFriendsStore(s => s.closeSidebar);
    const friends = useFriendsStore(s => s.friends);
    const incoming = useFriendsStore(s => s.incoming);
    const outgoing = useFriendsStore(s => s.outgoing);
    const searchResults = useFriendsStore(s => s.searchResults);
    const loadAll = useFriendsStore(s => s.loadAll);
    const search = useFriendsStore(s => s.search);
    const clearSearch = useFriendsStore(s => s.clearSearch);
    const sendRequest = useFriendsStore(s => s.sendRequest);
    const accept = useFriendsStore(s => s.accept);
    const decline = useFriendsStore(s => s.decline);
    const cancelRequest = useFriendsStore(s => s.cancel);
    const unfriend = useFriendsStore(s => s.unfriend);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    // ─── Context menu ────────────────────────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        friendId: string;
        username: string;
    } | null>(null);

    // ─── Nicknames (stored in localStorage) ─────────────────────────────────────
    const [nicknames, setNicknames] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('friendNicknames');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [nicknameModal, setNicknameModal] = useState<{
        friendId: string;
        currentNickname: string;
    } | null>(null);
    const [nicknameInput, setNicknameInput] = useState('');

    const addInputRef = useRef<HTMLInputElement>(null);
    const filterInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const nicknameInputRef = useRef<HTMLInputElement>(null); // 👈 added for focus
    const debouncedSearch = useDebounce(searchQuery, 300);

    // ─── Effects ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (sidebarOpen && user) loadAll(user.id);
    }, [sidebarOpen, user, loadAll]);

    useEffect(() => {
        if (!sidebarOpen) {
            setSearchQuery('');
            clearSearch();
            setFilterQuery('');
            setConfirmRemoveId(null);
            setContextMenu(null);
        }
    }, [sidebarOpen, clearSearch]);

    useEffect(() => {
        if (!debouncedSearch.trim() || !user) {
            clearSearch();
            return;
        }
        setSearchLoading(true);
        search(debouncedSearch.trim(), user.id)
            .finally(() => setSearchLoading(false));
    }, [debouncedSearch, user, search, clearSearch]);

    // Close context menu on scroll or resize
    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('scroll', close);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, []);

    // Click outside closes context menu
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [contextMenu]);

    // ─── Focus nickname input when modal opens ─────────────────────────────────
    useEffect(() => {
        if (nicknameModal) {
            setTimeout(() => nicknameInputRef.current?.focus(), 50);
        }
    }, [nicknameModal]);

    // ─── Helpers ────────────────────────────────────────────────────────────────
    const forceFocus = (ref: React.RefObject<HTMLInputElement>) => (e: React.MouseEvent | React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (ref.current) {
            ref.current.focus();
            setTimeout(() => ref.current?.focus(), 10);
        }
    };

    useEffect(() => {
        if (sidebarOpen) {
            setTimeout(() => addInputRef.current?.focus(), 100);
        }
    }, [sidebarOpen]);

    // ─── Memoized lookups ──────────────────────────────────────────────────────
    const friendIds = useMemo(() => new Set(friends.map(f => f.otherUser.id)), [friends]);
    const incomingIds = useMemo(() => new Set(incoming.map(r => r.otherUser.id)), [incoming]);
    const outgoingMap = useMemo(() => {
        const map = new Map<string, string>();
        outgoing.forEach(r => map.set(r.otherUser.id, r.id));
        return map;
    }, [outgoing]);

    const filteredFriends = useMemo(() => {
        if (!filterQuery.trim()) return friends;
        const q = filterQuery.trim().toLowerCase();
        return friends.filter(
            f =>
                f.otherUser.username.toLowerCase().includes(q) ||
                f.otherUser.displayName.toLowerCase().includes(q),
        );
    }, [friends, filterQuery]);

    const isFriend = (userId: string) => friendIds.has(userId);
    const isIncoming = (userId: string) => incomingIds.has(userId);
    const isOutgoing = (userId: string) => outgoingMap.has(userId);
    const isSelf = (userId: string) => user?.id === userId;
    const isOnline = (userId: string) => onlineUsers.has(userId);

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const handleSendRequest = async (targetUserId: string) => {
        if (!user) return;
        await sendRequest(user.id, targetUserId);
    };

    const handleCancel = async (requestId: string) => {
        if (!user) return;
        await cancelRequest(requestId, user.id);
    };

    const handleUnfriend = async (requestId: string) => {
        if (!user) return;
        await unfriend(requestId, user.id);
        setConfirmRemoveId(null);
        setContextMenu(null);
    };

    const handleInvite = (friendId: string) => {
        // Only allow invite if we're currently in a room
        if (!currentRoom) return;
        inviteFriendToRoom(friendId);
        setContextMenu(null);
    };

    const handleViewProfile = (username: string) => {
        navigate(`/u/${username}`);
        setContextMenu(null);
    };

    const openNicknameModal = (friendId: string, currentName: string) => {
        setNicknameModal({ friendId, currentNickname: currentName });
        setNicknameInput(nicknames[friendId] || '');
        setContextMenu(null);
    };

    const saveNickname = () => {
        if (!nicknameModal) return;
        const updated = { ...nicknames };
        if (nicknameInput.trim()) {
            updated[nicknameModal.friendId] = nicknameInput.trim();
        } else {
            delete updated[nicknameModal.friendId];
        }
        setNicknames(updated);
        localStorage.setItem('friendNicknames', JSON.stringify(updated));
        setNicknameModal(null);
    };

    const getDisplayName = (friend: { otherUser: { id: string; displayName: string; username: string } }) => {
        return nicknames[friend.otherUser.id] || friend.otherUser.displayName;
    };

    if (!user) return null;

    return (
        <AnimatePresence>
            {sidebarOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 z-40"
                        onClick={closeSidebar}
                    />
                    <motion.aside
                        initial={{ x: 320 }}
                        animate={{ x: 0 }}
                        exit={{ x: 320 }}
                        transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                        className="fixed top-0 right-0 h-full w-80 bg-bg-secondary border-l border-bg-tertiary/60 z-50 flex flex-col shadow-2xl pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-4 border-b border-bg-tertiary/40 shrink-0">
                            <h2 className="font-mono font-bold text-sm uppercase tracking-wider text-text-primary">Friends</h2>
                            <button onClick={closeSidebar} className="text-text-muted hover:text-text-primary transition-colors p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
                            {/* ─── Add a friend ─── */}
                            <section className="space-y-2">
                                <h3 className="font-mono font-semibold text-xs text-text-muted uppercase tracking-wider">Add a friend</h3>
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        ref={addInputRef}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onMouseDown={forceFocus(addInputRef)}
                                        onPointerDown={forceFocus(addInputRef)}
                                        onClick={forceFocus(addInputRef)}
                                        placeholder="Search by username…"
                                        className="w-full bg-bg-primary border border-bg-tertiary rounded-lg pl-8 pr-3 py-2
                               text-text-primary placeholder:text-text-muted font-mono text-xs
                               focus:outline-none focus:border-accent-primary transition-colors
                               pointer-events-auto select-text"
                                    />
                                    {searchLoading && (
                                        <Loader size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
                                    )}
                                </div>
                                <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 pr-1">
                                    {searchQuery.trim() && searchResults.length === 0 && !searchLoading && (
                                        <p className="text-xs text-text-muted py-1">No users found.</p>
                                    )}
                                    {searchResults.map(result => {
                                        const alreadyFriend = isFriend(result.id);
                                        const hasOutgoing = isOutgoing(result.id);
                                        const hasIncoming = isIncoming(result.id);
                                        const isOwn = isSelf(result.id);
                                        const disabled = alreadyFriend || isOwn;
                                        return (
                                            <div key={result.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors">
                                                <UserAvatar
                                                    user={{ displayName: result.displayName, username: result.username, avatarUrl: result.avatarUrl } as any}
                                                    size={28}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-text-primary truncate">{result.displayName}</p>
                                                    <p className="text-[10px] text-text-muted truncate">@{result.username}</p>
                                                </div>
                                                {hasOutgoing ? (
                                                    <button
                                                        onClick={() => handleCancel(outgoingMap.get(result.id)!)}
                                                        className="shrink-0 px-3 py-1 rounded-md text-[10px] font-mono transition-all
                                       bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : hasIncoming ? (
                                                    <span className="shrink-0 px-3 py-1 rounded-md text-[10px] font-mono bg-bg-tertiary/30 text-text-muted cursor-not-allowed">
                                                        Received
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSendRequest(result.id)}
                                                        disabled={disabled}
                                                        className={`shrink-0 px-3 py-1 rounded-md text-[10px] font-mono transition-all
                              ${disabled
                                                                ? 'bg-bg-tertiary/30 text-text-muted cursor-not-allowed'
                                                                : 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20'
                                                            }`}
                                                    >
                                                        {alreadyFriend ? 'Friend' : 'Add'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* ─── Requests ─── */}
                            <section className="space-y-2">
                                <h3 className="font-mono font-semibold text-xs text-text-muted uppercase tracking-wider">
                                    Requests ({incoming.length})
                                </h3>
                                {incoming.length === 0 ? (
                                    <p className="text-xs text-text-muted py-1">No pending requests.</p>
                                ) : (
                                    <ul className="flex flex-col gap-1">
                                        {incoming.map(r => (
                                            <li key={r.id} className="flex items-center gap-2.5 py-1.5">
                                                <UserAvatar
                                                    user={{ displayName: r.otherUser.displayName, username: r.otherUser.username, avatarUrl: r.otherUser.avatarUrl } as any}
                                                    size={28}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-text-primary truncate">{r.otherUser.displayName}</p>
                                                </div>
                                                <button
                                                    onClick={() => accept(r.id, user.id)}
                                                    className="w-6 h-6 rounded-full bg-green-500/10 text-green-400 hover:bg-green-500/20 flex items-center justify-center transition-colors"
                                                >
                                                    <Check size={12} />
                                                </button>
                                                <button
                                                    onClick={() => decline(r.id, user.id)}
                                                    className="w-6 h-6 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {/* ─── Your friends ─── */}
                            <section className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-mono font-semibold text-xs text-text-muted uppercase tracking-wider">
                                        Your friends ({friends.length})
                                    </h3>
                                    <div className="relative w-32">
                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
                                        <input
                                            ref={filterInputRef}
                                            value={filterQuery}
                                            onChange={e => setFilterQuery(e.target.value)}
                                            onMouseDown={forceFocus(filterInputRef)}
                                            onPointerDown={forceFocus(filterInputRef)}
                                            onClick={forceFocus(filterInputRef)}
                                            placeholder="Filter…"
                                            className="w-full bg-bg-primary border border-bg-tertiary rounded-md pl-7 pr-2 py-1
                                 text-text-primary placeholder:text-text-muted font-mono text-[10px]
                                 focus:outline-none focus:border-accent-primary transition-colors
                                 pointer-events-auto select-text"
                                        />
                                    </div>
                                </div>

                                {friends.length === 0 ? (
                                    <p className="text-xs text-text-muted py-1">No friends yet. Add some above!</p>
                                ) : filteredFriends.length === 0 ? (
                                    <p className="text-xs text-text-muted py-1">No matches.</p>
                                ) : (
                                    <ul className="flex flex-col gap-0.5">
                                        {filteredFriends.map(f => {
                                            const online = isOnline(f.otherUser.id);
                                            const displayName = getDisplayName(f);
                                            return (
                                                <li
                                                    key={f.id}
                                                    className={`group relative flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors ${!online ? 'opacity-60' : ''}`}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        setContextMenu({
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            friendId: f.otherUser.id,
                                                            username: f.otherUser.username,
                                                        });
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                        <div className="relative">
                                                            <UserAvatar
                                                                user={{ displayName: f.otherUser.displayName, username: f.otherUser.username, avatarUrl: f.otherUser.avatarUrl } as any}
                                                                size={28}
                                                            />
                                                            <span
                                                                className={`absolute -bottom-0.5  -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-secondary ${online ? 'bg-green-500' : 'bg-red-500'}`}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0 cursor-pointer">
                                                            <p className="text-xs text-text-primary truncate">{displayName}</p>
                                                            <p className="text-[10px] text-text-muted truncate">@{f.otherUser.username}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setConfirmRemoveId(prev => (prev === f.id ? null : f.id));
                                                        }}
                                                        title="Remove friend"
                                                        className="w-6 h-6 rounded-full flex cursor-pointer items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <UserMinus size={12} />
                                                    </button>
                                                    {confirmRemoveId === f.id && (
                                                        <div className="absolute right-0 top-full mt-1 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-tertiary/90 backdrop-blur-sm border border-bg-tertiary/60">
                                                            <button
                                                                onClick={() => handleUnfriend(f.id)}
                                                                className="text-[10px] font-mono cursor-pointer px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmRemoveId(null)}
                                                                className="text-[10px] font-mono px-2 py-0.5 cursor-pointer rounded-md text-text-muted hover:text-text-primary transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </motion.aside>
                </>
            )}

            {/* ─── Context Menu ────────────────────────────────────────────────────── */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[60] min-w-[180px] bg-bg-secondary rounded-lg shadow-xl border border-bg-tertiary/60 py-1 overflow-hidden"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full px-4 py-2 text-xs cursor-pointer text-text-primary hover:bg-bg-tertiary/30 flex items-center gap-2 transition-colors"
                        onClick={() => handleViewProfile(contextMenu.username)}
                    >
                        <User size={14} />
                        View Profile
                    </button>

                    {/* Invite button – now checks both room and online status */}
                    {(() => {
                        const isFriendOnline = onlineUsers.has(contextMenu.friendId);
                        const canInvite = currentRoom && isFriendOnline;
                        let label = 'Invite to Room';
                        let disabled = true;
                        if (!isFriendOnline) {
                            label = 'Offline';
                        } else if (!currentRoom) {
                            label = 'Room unavailable';
                        } else {
                            label = 'Invite to Room';
                            disabled = false;
                        }
                        return (
                            <button
                                className={`w-full px-4 py-2 text-xs flex items-center gap-2 transition-colors ${disabled
                                    ? 'text-text-muted cursor-not-allowed'
                                    : 'text-text-primary cursor-pointer hover:bg-bg-tertiary/30'
                                    }`}
                                onClick={canInvite ? () => handleInvite(contextMenu.friendId) : undefined}
                                disabled={disabled}
                            >
                                <UserPlus size={14} />
                                {label}
                            </button>
                        );
                    })()}

                    <button
                        className="w-full px-4 py-2 text-xs cursor-pointer text-text-primary hover:bg-bg-tertiary/30 flex items-center gap-2 transition-colors"
                        onClick={() => openNicknameModal(contextMenu.friendId, contextMenu.username)}
                    >
                        <UserCog size={14} />
                        Set Nickname
                    </button>
                </div>
            )}

            {/* ─── Nickname Modal ──────────────────────────────────────────────────── */}
            {nicknameModal && (
                <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center px-4">
                    <div className="bg-bg-secondary rounded-xl p-6 max-w-sm w-full shadow-xl">
                        <h3 className="text-sm font-semibold mb-2">Set Nickname</h3>
                        <p className="text-xs text-text-muted mb-3">Nickname for @{nicknameModal.currentNickname}</p>
                        <input
                            ref={nicknameInputRef}
                            type="text"
                            className="w-full bg-bg-primary border border-bg-tertiary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent-primary transition-colors"
                            placeholder="Enter nickname"
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveNickname()}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-primary transition-colors"
                                onClick={() => setNicknameModal(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-3 py-1.5 rounded-lg bg-accent-primary text-white text-sm font-semibold hover:brightness-105 transition-colors"
                                onClick={saveNickname}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FriendsSidebar;