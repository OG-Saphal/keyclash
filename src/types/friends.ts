export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface FriendRequestRow {
    id: string;
    sender_id: string;
    receiver_id: string;
    status: FriendRequestStatus;
    created_at: string;
    responded_at: string | null;
    online?: boolean;
}

export interface FriendRequest {
    id: string;
    senderId: string;
    receiverId: string;
    status: FriendRequestStatus;
    createdAt: string;
    respondedAt: string | null;
    // Populated by joining profiles for display
    otherUser: FriendProfileSummary;
}

export interface FriendProfileSummary {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    online?: boolean;
}

export type FriendshipStatus =
    | 'none'
    | 'pending_sent'
    | 'pending_received'
    | 'friends';