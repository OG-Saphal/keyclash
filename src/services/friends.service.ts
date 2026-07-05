import { supabase } from '../lib/supabase';
import type {
    FriendRequestStatus,
    FriendRequestRow,
    FriendProfileSummary,
    FriendshipStatus,
    FriendRequest,
} from '../types/friends';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToSummary(row: Record<string, unknown>): FriendProfileSummary {
    return {
        id: row.id as string,
        username: row.username as string,
        displayName: row.display_name as string,
        avatarUrl: (row.avatar_url as string | null) ?? null,
    };
}

async function attachOtherUser(
    rows: FriendRequestRow[],
    myUserId: string,
): Promise<FriendRequest[]> {
    if (rows.length === 0) return [];

    const otherIds = Array.from(
        new Set(rows.map(r => (r.sender_id === myUserId ? r.receiver_id : r.sender_id))),
    );

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', otherIds);

    if (error) throw new Error(error.message);

    const byId = new Map(
        (profiles as Record<string, unknown>[]).map(p => [p.id as string, rowToSummary(p)]),
    );

    return rows.map(r => {
        const otherId = r.sender_id === myUserId ? r.receiver_id : r.sender_id;
        const other = byId.get(otherId);
        return {
            id: r.id,
            senderId: r.sender_id,
            receiverId: r.receiver_id,
            status: r.status,
            createdAt: r.created_at,
            respondedAt: r.responded_at,
            otherUser: other ?? {
                id: otherId,
                username: 'unknown',
                displayName: 'Unknown user',
                avatarUrl: null,
            },
        };
    });
}

// ─── Search (new – uses Supabase) ────────────────────────────────────────────

/**
 * Search for users by username (case‑insensitive, partial match).
 * Returns an array of FriendProfileSummary (used for the "Add a friend" UI).
 */
export async function searchUsers(
    query: string,
    excludeUserId: string,
): Promise<FriendProfileSummary[]> {
    if (query.trim().length < 2) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', excludeUserId)
        .limit(20);

    if (error) throw new Error(error.message);
    return (data as Record<string, unknown>[]).map(rowToSummary);
}

// ─── (Optional) keep the old name for compatibility ──────────────────────────
export { searchUsers as searchUsersByUsername };

// ─── Existing functions (unchanged) ──────────────────────────────────────────

export async function fetchProfileByUsername(
    username: string,
): Promise<FriendProfileSummary | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('username', username)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? rowToSummary(data as Record<string, unknown>) : null;
}

export async function fetchFriendshipStatus(
    myUserId: string,
    otherUserId: string,
): Promise<{ status: FriendshipStatus; requestId: string | null }> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(
            `and(sender_id.eq.${myUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myUserId})`,
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return { status: 'none', requestId: null };

    const row = data as Record<string, unknown>;
    const status = row.status as FriendRequestStatus;

    if (status === 'accepted') return { status: 'friends', requestId: row.id as string };
    if (status === 'pending') {
        return {
            status: row.sender_id === myUserId ? 'pending_sent' : 'pending_received',
            requestId: row.id as string,
        };
    }
    // declined / cancelled → treat as no relationship
    return { status: 'none', requestId: null };
}

export async function sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
    const { error } = await supabase
        .from('friend_requests')
        .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });
    if (error) throw new Error(error.message);
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<void> {
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', requestId);
    if (error) throw new Error(error.message);
}

export async function cancelRequest(requestId: string): Promise<void> {
    const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);
    if (error) throw new Error(error.message);
}

/** Unfriend: delete the accepted request so a fresh one can be created. */
export async function removeFriend(requestId: string): Promise<void> {
    const { error } = await supabase.from('friend_requests').delete().eq('id', requestId);
    if (error) throw new Error(error.message);
}

export async function fetchFriends(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('responded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return attachOtherUser(data as FriendRequestRow[], userId);
}

export async function fetchIncomingRequests(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')
        .eq('receiver_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return attachOtherUser(data as FriendRequestRow[], userId);
}

export async function fetchOutgoingRequests(userId: string): Promise<FriendRequest[]> {
    const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('status', 'pending')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return attachOtherUser(data as FriendRequestRow[], userId);
}