import React from 'react';
import { Link } from 'react-router-dom';
import { useFriendsStore } from '../../store/useFriendsStore';
import UserAvatar from '../auth/UserAvatar';

const FriendsList: React.FC = () => {
    const friends = useFriendsStore(s => s.friends);

    if (friends.length === 0) {
        return <p className="text-sm text-text-muted">No friends yet — search above to add some.</p>;
    }

    return (
        <ul className="flex flex-col gap-1">
            {friends.map(f => (
                <li key={f.id}>
                    <Link
                        to={`/u/${f.otherUser.username}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-tertiary/30 transition-colors"
                    >
                        <UserAvatar user={{ displayName: f.otherUser.displayName, username: f.otherUser.username, avatarUrl: f.otherUser.avatarUrl } as any} size={36} />
                        <div className="min-w-0">
                            <p className="text-sm text-text-primary truncate">{f.otherUser.displayName}</p>
                            <p className="text-xs text-text-muted truncate">@{f.otherUser.username}</p>
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    );
};

export default FriendsList;