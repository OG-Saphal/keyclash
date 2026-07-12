import React from 'react';
import { Link } from 'react-router-dom';
import { useFriendsStore } from '../../store/useFriendsStore';
import { useMultiplayerStore } from '../../store/useMultiplayerStore';
import UserAvatar from '../auth/UserAvatar';

const FriendsList: React.FC = () => {
    const friends = useFriendsStore((s) => s.friends);
    const currentRoom = useMultiplayerStore((s) => s.currentRoom);
    const inviteFriendToRoom = useMultiplayerStore((s) => s.inviteFriendToRoom);

    if (friends.length === 0) {
        return <p className="text-sm text-text-muted">No friends yet — search above to add some.</p>;
    }

    return (
        <ul className="flex flex-col gap-1">
            {friends.map((friend) => {
                // 🔍 DEBUG: log the online status
                console.log(`Friend: ${friend.otherUser.username}, online:`, friend.otherUser.online);

                // Always default to false if online is missing or not a boolean
                const isFriendOnline = friend.otherUser.online === true; // strict check
                const isInRoom = !!currentRoom?.id;
                const canInvite = isFriendOnline && isInRoom;

                return (
                    <li
                        key={friend.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors"
                    >
                        <Link
                            to={`/u/${friend.otherUser.username}`}
                            className="flex items-center gap-3 flex-1 min-w-0"
                        >
                            <UserAvatar user={friend.otherUser} size={36} />
                            <div className="min-w-0">
                                <p className="text-sm text-text-primary truncate">
                                    {friend.otherUser.displayName}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                    @{friend.otherUser.username}
                                </p>
                            </div>
                        </Link>

                        <button
                            onClick={canInvite ? () => inviteFriendToRoom(friend.id) : undefined}
                            disabled={!canInvite}
                            title={
                                !isFriendOnline
                                    ? 'Friend is offline'
                                    : !isInRoom
                                        ? 'You are not in a room'
                                        : 'Invite to room'
                            }
                            className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${canInvite
                                    ? 'bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 cursor-pointer'
                                    : 'bg-bg-tertiary/30 text-text-muted/50 cursor-not-allowed'
                                }`}
                        >
                            Invite to Room
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default FriendsList;