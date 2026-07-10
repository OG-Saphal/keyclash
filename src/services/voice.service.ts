// voice.service.ts
import { connectMultiplayerSocket } from './multiplayer.service';
import { useVoiceStore } from '../store/useVoiceStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Socket } from 'socket.io-client';

// Enable/disable debug logs
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

    constructor() { }

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
            roster.forEach(peerId => {
                if (peerId !== this.userId && !this.peerConnections.has(peerId)) {
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

    private createPeerConnection(peerId: string, isInitiator: boolean) {
        if (this.peerConnections.has(peerId)) {
            if (DEBUG_VOICE) console.log(`[voice] ⏭️ Peer ${peerId} already connected, skipping`);
            return;
        }

        if (DEBUG_VOICE) console.log(`[voice] 📞 Creating peer connection for ${peerId}`, { isInitiator });

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peerConnections.set(peerId, pc);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        }

        pc.ontrack = (event) => {
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track);
            useVoiceStore.getState().addPeerStream(peerId, remoteStream);
            if (DEBUG_VOICE) console.log(`[voice] 📥 Received track for peer ${peerId}`);
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
        if (!userId || userId === this.userId) return;
        if (this.peerConnections.has(userId)) return;
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

        if (DEBUG_VOICE) console.log(`[voice] 📡 Signal from ${fromUserId}`, { type, sdp: !!sdp, candidate: !!candidate });

        let pc = this.peerConnections.get(fromUserId);

        if (type === 'offer') {
            if (this.makingOffer.has(fromUserId)) {
                if (this.isPolite(fromUserId)) {
                    this.makingOffer.delete(fromUserId);
                    // 🐛 FIX (glare/ICE-candidate loss): do NOT clear
                    // pendingCandidates here. Only the local ("polite" side's)
                    // RTCPeerConnection is being torn down and recreated below —
                    // the remote peer's ICE session (and any candidates it has
                    // already sent us for the old PC) is still valid and needs
                    // to be replayed against the NEW answerer PC via
                    // flushPendingCandidates() right after setRemoteDescription.
                    // Deleting the queue here silently dropped every ICE
                    // candidate that arrived before the glare resolved — if
                    // that batch contained the only usable candidate pair
                    // (e.g. fast host/srflx candidates on a LAN), the peer
                    // never connected and stayed silent.
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
                // 🐛 FIX (leave+rejoin crash — "Called in wrong state: stable"):
                // peerConnections is keyed only by userId, with nothing to
                // distinguish a signal meant for the CURRENT connection from
                // one left over from a PREVIOUS connection to the same peer
                // (e.g. this user left and rejoined the same room quickly,
                // reusing the same socket). A stale answer from the old
                // offer/answer round can arrive after a fresh round with a
                // brand-new pc has already completed, and applying it to an
                // already-`stable` connection throws. We only ever expect an
                // answer while we have an outstanding local offer — anything
                // else is stale/duplicate and safe to drop; the legitimate,
                // correctly-ordered new round is unaffected and still
                // completes normally.
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

    private handleMuteState = (payload: { userId: string; muted: boolean }) => {
        useVoiceStore.getState().setPeerMuted(payload.userId, payload.muted);
        if (DEBUG_VOICE) console.log(`[voice] ${payload.muted ? '🔇' : '🔊'} Peer ${payload.userId} ${payload.muted ? 'muted' : 'unmuted'}`);
    };

    private handleRoster = (payload: { users: string[] }) => {
        const currentPeers = Array.from(this.peerConnections.keys());
        currentPeers.forEach(peerId => {
            if (!payload.users.includes(peerId)) {
                if (DEBUG_VOICE) console.log(`[voice] 🧹 Roster cleanup: removing ${peerId}`);
                this.removePeer(peerId);
            }
        });
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
            const rosterSet = new Set(roster.filter(id => id !== this.userId));

            for (const [peerId, pc] of this.peerConnections) {
                if (!rosterSet.has(peerId)) {
                    pc.close();
                    this.peerConnections.delete(peerId);
                    useVoiceStore.getState().removePeerStream(peerId);
                }
            }
            this.makingOffer.clear();

            roster.forEach(peerId => {
                if (peerId !== this.userId && !this.peerConnections.has(peerId)) {
                    this.createPeerConnection(peerId, true);
                }
            });
        });
    }
}

export const voiceService = new VoiceService();