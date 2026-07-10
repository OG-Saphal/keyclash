// voice.service.ts – TEMPORARY TEST: ignore mute states, force peers unmuted
import { connectMultiplayerSocket } from './multiplayer.service';
import { useVoiceStore } from '../store/useVoiceStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Socket } from 'socket.io-client';

const DEBUG_VOICE = true;

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:global.relay.metered.ca:80',
            username: 'af8144af8e6b1b9e714925c8',
            credential: 'JOnxdfLjdjSL01MU',
        },
        {
            urls: 'turn:global.relay.metered.ca:80?transport=tcp',
            username: 'af8144af8e6b1b9e714925c8',
            credential: 'JOnxdfLjdjSL01MU',
        },
        {
            urls: 'turn:global.relay.metered.ca:443',
            username: 'af8144af8e6b1b9e714925c8',
            credential: 'JOnxdfLjdjSL01MU',
        },
        {
            urls: 'turns:global.relay.metered.ca:443?transport=tcp',
            username: 'af8144af8e6b1b9e714925c8',
            credential: 'JOnxdfLjdjSL01MU',
        },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

class VoiceService {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private userId: string | null = null;
    private roomId: string | null = null;
    private socket: Socket | null = null;
    private listenersSetup = false;
    private makingOffer: Set<string> = new Set();
    private wasInVoice = false;
    private joined = false;
    private disconnectedWhileInVoice = false;
    private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

    private isPolite(peerId: string): boolean {
        return this.userId! < peerId;
    }

    private get localUserId(): string | null {
        if (this.userId) return this.userId;
        const user = useAuthStore.getState().user;
        return user?.id ?? null;
    }

    constructor() { }

    private addLocalTracks(pc: RTCPeerConnection, peerId: string): void {
        if (!this.localStream) {
            console.warn(`[voice] ⚠️ No localStream to add tracks for ${peerId}`);
            return;
        }
        const tracks = this.localStream.getTracks();
        if (tracks.length === 0) {
            console.warn(`[voice] ⚠️ No tracks in localStream for ${peerId}`);
            return;
        }
        tracks.forEach(track => {
            pc.addTrack(track, this.localStream!);
            if (DEBUG_VOICE) {
                console.log(`[voice] 🎵 Added track for ${peerId}, kind: ${track.kind}, enabled: ${track.enabled}`);
            }
        });
        if (DEBUG_VOICE) {
            console.log(`[voice] 🎵 Added ${tracks.length} track(s) to PC for ${peerId}`);
        }
    }

    private async ensureSocketAndListeners() {
        if (this.listenersSetup) return;
        this.socket = await connectMultiplayerSocket();

        this.socket.on('voice:peer-joined', this.handlePeerJoined.bind(this));
        this.socket.on('voice:peer-left', this.handlePeerLeft.bind(this));
        this.socket.on('voice:signal', this.handleSignal.bind(this));
        this.socket.on('voice:mute-state', this.handleMuteState.bind(this));
        this.socket.on('voice:roster', this.handleRoster.bind(this));

        this.socket.on('disconnect', () => {
            if (this.wasInVoice) {
                if (DEBUG_VOICE) console.log('[voice] 🔌 Socket disconnected – cleaning up temporarily');
                this.peerConnections.forEach(pc => pc.close());
                this.peerConnections.clear();
                this.makingOffer.clear();
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop());
                    this.localStream = null;
                }
                this.disconnectedWhileInVoice = true;
            }
        });

        this.socket.on('connect', () => {
            if (
                this.disconnectedWhileInVoice &&
                this.wasInVoice &&
                this.roomId &&
                this.userId &&
                useMultiplayerStore.getState().currentRoom?.id === this.roomId
            ) {
                if (DEBUG_VOICE) console.log('[voice] 🔄 Reconnected – rejoining voice');
                this.rejoinVoice();
                this.disconnectedWhileInVoice = false;
            }
        });

        this.listenersSetup = true;
    }

    async joinVoice() {
        const room = useMultiplayerStore.getState().currentRoom;
        const user = useAuthStore.getState().user;

        if (this.joined || this.wasInVoice) {
            if (DEBUG_VOICE) console.log('[voice] ⚠️ Forcing clean start before join');
            this.leaveVoiceInternal();
        }

        if (!room || !user) return;

        this.userId = user.id;
        this.roomId = room.id;
        this.joined = true;

        if (DEBUG_VOICE) console.log('[voice] 🟢 Joining voice room', { roomId: this.roomId, userId: this.userId });

        await this.ensureSocketAndListeners();

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getAudioTracks().forEach(track => (track.enabled = true));
            useVoiceStore.getState().setLocalStream(this.localStream);
            useVoiceStore.getState().setMuted(false);
            this.wasInVoice = true;
            this.disconnectedWhileInVoice = false;
            if (DEBUG_VOICE) console.log('[voice] 🎤 Local microphone acquired');
        } catch (err) {
            console.error('[voice] Failed to get mic:', err);
            this.joined = false;
            return;
        }

        this.socket!.emit('voice:join', { userId: this.userId, roomId: this.roomId }, (roster: string[]) => {
            if (DEBUG_VOICE) console.log('[voice] 📋 Received roster:', roster);
            const localId = this.localUserId;
            roster.forEach(peerId => {
                if (peerId !== localId && !this.peerConnections.has(peerId)) {
                    this.createPeerConnection(peerId, true);
                }
            });
        });
    }

    leaveVoice() {
        this.leaveVoiceInternal();
    }

    private leaveVoiceInternal() {
        if (!this.userId) return;
        if (DEBUG_VOICE) console.log('[voice] 🔴 Leaving voice room', { userId: this.userId });
        this.socket?.emit('voice:leave', this.userId);

        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.makingOffer.clear();
        this.pendingCandidates.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        useVoiceStore.getState().reset();
        this.joined = false;
        this.wasInVoice = false;
        this.disconnectedWhileInVoice = false;
        this.userId = null;
        this.roomId = null;
    }

    toggleMute() {
        const store = useVoiceStore.getState();
        if (!this.localStream) return;
        const muted = !store.isMuted;
        this.localStream.getAudioTracks().forEach(track => (track.enabled = !muted));
        store.setMuted(muted);
        this.socket?.emit('voice:mute-state', { userId: this.userId, muted });
        if (DEBUG_VOICE) console.log(`[voice] 🎤 Mute toggled: ${muted ? '🔇 MUTED' : '🔊 UNMUTED'}`);
    }

    /**
     * Force all peer audio elements to play.
     * Call this on a user gesture (e.g., clicking the voice panel or mute button).
     */
    forcePlayAllPeerAudio() {
        if (DEBUG_VOICE) console.log('[voice] 🔔 Force‑play all peer audio');
        useVoiceStore.getState().triggerForcePlay();
    }

    private createPeerConnection(peerId: string, isInitiator: boolean) {
        if (peerId === this.localUserId) {
            if (DEBUG_VOICE) console.warn(`[voice] ⛔ Skipping self-connection for ${peerId}`);
            return;
        }

        if (this.peerConnections.has(peerId)) {
            if (DEBUG_VOICE) console.log(`[voice] ⏭️ Peer ${peerId} already connected, skipping`);
            return;
        }

        if (DEBUG_VOICE) console.log(`[voice] 📞 Creating peer connection for ${peerId}`, { isInitiator });

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peerConnections.set(peerId, pc);

        this.addLocalTracks(pc, peerId);

        pc.ontrack = (event) => {
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track);
            useVoiceStore.getState().addPeerStream(peerId, remoteStream);
            // 🔥 TEMPORARY TEST: force this peer to be considered unmuted in the store
            useVoiceStore.getState().setPeerMuted(peerId, false);
            if (DEBUG_VOICE) {
                console.log(`[voice] 📥 Received track for peer ${peerId}, kind: ${event.track.kind}, enabled: ${event.track.enabled}`);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && this.socket) {
                this.socket.emit('voice:signal', {
                    type: 'ice-candidate',
                    targetUserId: peerId,
                    candidate: event.candidate,
                });
                if (DEBUG_VOICE) console.log(`[voice] ❄️ ICE candidate sent to ${peerId}`);
            }
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (DEBUG_VOICE) console.log(`[voice] 🔗 Peer ${peerId} connection state: ${state}`);
            if (state === 'failed' || state === 'disconnected') {
                this.removePeer(peerId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (DEBUG_VOICE) console.log(`[voice] ❄️ Peer ${peerId} ICE state: ${pc.iceConnectionState}`);
        };

        if (isInitiator) {
            this.makeOffer(peerId, pc);
        }
    }

    private async makeOffer(peerId: string, pc: RTCPeerConnection) {
        this.makingOffer.add(peerId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket?.emit('voice:signal', {
                type: 'offer',
                targetUserId: peerId,
                sdp: offer,
            });
            if (DEBUG_VOICE) console.log(`[voice] 📤 Offer sent to ${peerId}`);
        } catch (err) {
            console.error('Error creating offer', err);
            this.makingOffer.delete(peerId);
        }
    }

    private handlePeerJoined(userId: string) {
        if (!userId || userId === this.localUserId) return;
        // Defense-in-depth: don't trust a stale/dead connection object left
        // over from a previous session with this peer (e.g. they left via
        // room:leave/kick and we never got a matching peer-left/roster
        // event to clean it up). A closed/failed/disconnected pc for a peer
        // that's rejoining should never block a fresh connection attempt.
        const existing = this.peerConnections.get(userId);
        if (existing) {
            if (existing.connectionState === 'connected' || existing.connectionState === 'connecting') {
                return;
            }
            if (DEBUG_VOICE) console.log(`[voice] 🧟 Discarding stale pc for ${userId} (state: ${existing.connectionState})`);
            this.removePeer(userId);
        }
        if (DEBUG_VOICE) console.log(`[voice] 👤 Peer joined: ${userId}`);
        this.createPeerConnection(userId, true);
    }

    private handlePeerLeft(userId: string) {
        if (DEBUG_VOICE) console.log(`[voice] 🚪 Peer left: ${userId}`);
        this.removePeer(userId);
    }

    private removePeer(userId: string) {
        this.makingOffer.delete(userId);
        this.pendingCandidates.delete(userId);
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
        }
        useVoiceStore.getState().removePeerStream(userId);
    }

    private async flushPendingCandidates(peerId: string, pc: RTCPeerConnection) {
        const queued = this.pendingCandidates.get(peerId);
        if (!queued || queued.length === 0) return;
        this.pendingCandidates.delete(peerId);
        for (const c of queued) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (err) {
                console.error(`[voice] Failed to flush queued candidate for ${peerId}:`, err);
            }
        }
        if (DEBUG_VOICE) console.log(`[voice] 🧹 Flushed ${queued.length} queued candidates for ${peerId}`);
    }

    private async handleSignal(payload: any) {
        const { type, fromUserId, sdp, candidate } = payload;
        if (!fromUserId) return;

        if (fromUserId === this.localUserId) {
            if (DEBUG_VOICE) console.log(`[voice] ⛔ Ignoring signal from self (${fromUserId})`);
            return;
        }

        if (DEBUG_VOICE) console.log(`[voice] 📡 Signal from ${fromUserId}`, { type, sdp: !!sdp, candidate: !!candidate });

        let pc = this.peerConnections.get(fromUserId);

        if (type === 'offer') {
            if (this.makingOffer.has(fromUserId)) {
                if (this.isPolite(fromUserId)) {
                    this.makingOffer.delete(fromUserId);
                    if (pc) {
                        pc.close();
                        this.peerConnections.delete(fromUserId);
                    }
                    this.createPeerConnection(fromUserId, false);
                    pc = this.peerConnections.get(fromUserId);
                } else {
                    if (DEBUG_VOICE) console.log(`[voice] 🛑 Ignoring duplicate offer from ${fromUserId}`);
                    return;
                }
            }
        }

        // Defense-in-depth: same stale-connection issue as handlePeerJoined —
        // an offer arriving for a peerId we already have a `pc` for is only
        // valid if that pc is actually alive. A closed/failed one (e.g. left
        // over from before this peer rejoined) must be discarded, not reused,
        // or the incoming offer/answer/candidates get applied to a dead
        // connection and silently go nowhere.
        if (pc && type === 'offer' && !this.makingOffer.has(fromUserId)) {
            if (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                if (DEBUG_VOICE) console.log(`[voice] 🧟 Replacing stale pc for ${fromUserId} (state: ${pc.connectionState}) before handling offer`);
                this.removePeer(fromUserId);
                pc = undefined;
            }
        }

        if (!pc) {
            if (type === 'offer') {
                this.createPeerConnection(fromUserId, false);
                pc = this.peerConnections.get(fromUserId);
            } else {
                return;
            }
        }

        if (!pc) return;

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await this.flushPendingCandidates(fromUserId, pc);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.socket?.emit('voice:signal', {
                    type: 'answer',
                    targetUserId: fromUserId,
                    sdp: answer,
                });
                if (DEBUG_VOICE) console.log(`[voice] 📤 Answer sent to ${fromUserId}`);
            } else if (type === 'answer') {
                if (pc.signalingState !== 'have-local-offer') {
                    if (DEBUG_VOICE) {
                        console.log(
                            `[voice] 🧹 Ignoring stale/duplicate answer from ${fromUserId} (pc state: ${pc.signalingState})`
                        );
                    }
                    return;
                }
                this.makingOffer.delete(fromUserId);
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                await this.flushPendingCandidates(fromUserId, pc);
                if (DEBUG_VOICE) console.log(`[voice] 📥 Remote description set for ${fromUserId}`);
            } else if (type === 'ice-candidate') {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    const queue = this.pendingCandidates.get(fromUserId) || [];
                    queue.push(candidate);
                    this.pendingCandidates.set(fromUserId, queue);
                    if (DEBUG_VOICE) console.log(`[voice] ⏳ Queued ICE candidate for ${fromUserId} (remote desc not set)`);
                }
            }
        } catch (err) {
            console.error('Signal error:', err);
        }
    }

    // 🔥 TEMPORARY TEST: ignore incoming mute state updates
    private handleMuteState = (payload: { userId: string; muted: boolean }) => {
        // useVoiceStore.getState().setPeerMuted(payload.userId, payload.muted);
        if (DEBUG_VOICE) console.log(`[voice] ${payload.muted ? '🔇' : '🔊'} Peer ${payload.userId} ${payload.muted ? 'muted' : 'unmuted'} (IGNORED for test)`);
    };

    private handleRoster = (payload: { users: string[] }) => {
        const localId = this.localUserId;
        if (!localId) return;

        const rosterSet = new Set(payload.users.filter(id => id !== localId));

        for (const peerId of Array.from(this.peerConnections.keys())) {
            if (!rosterSet.has(peerId)) {
                if (DEBUG_VOICE) console.log(`[voice] 🧹 Roster cleanup: removing ${peerId}`);
                this.removePeer(peerId);
            }
        }

        for (const peerId of rosterSet) {
            if (!this.peerConnections.has(peerId)) {
                if (DEBUG_VOICE) console.log(`[voice] 📥 Roster add: connecting to ${peerId}`);
                this.createPeerConnection(peerId, true);
            }
        }
    };

    private async rejoinVoice() {
        if (!this.roomId || !this.userId) return;
        if (DEBUG_VOICE) console.log('[voice] 🔄 Rejoining voice – reacquiring mic');

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getAudioTracks().forEach(track => (track.enabled = true));
            useVoiceStore.getState().setLocalStream(this.localStream);
            useVoiceStore.getState().setMuted(false);
        } catch (err) {
            console.error('[voice] Failed to re‑get mic on rejoin:', err);
            this.localStream = null;
        }

        this.joined = true;
        this.socket?.emit('voice:join', { userId: this.userId, roomId: this.roomId }, (roster: string[]) => {
            const localId = this.localUserId;
            const rosterSet = new Set(roster.filter(id => id !== localId));

            for (const [peerId, pc] of this.peerConnections) {
                if (!rosterSet.has(peerId)) {
                    pc.close();
                    this.peerConnections.delete(peerId);
                    useVoiceStore.getState().removePeerStream(peerId);
                }
            }
            this.makingOffer.clear();

            roster.forEach(peerId => {
                if (peerId !== localId && !this.peerConnections.has(peerId)) {
                    this.createPeerConnection(peerId, true);
                }
            });
        });
    }
}

export const voiceService = new VoiceService();