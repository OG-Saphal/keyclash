import { getSocket } from './multiplayer.service';
import { useVoiceStore } from '../store/useVoiceStore';
import { useMultiplayerStore } from '../store/useMultiplayerStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Socket } from 'socket.io-client';

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

    private isPolite(peerId: string): boolean {
        return this.userId! < peerId;
    }

    constructor() { }

    private ensureSocketAndListeners() {
        if (this.listenersSetup) return;

        try {
            this.socket = getSocket();
        } catch (e) {
            console.error('Cannot get multiplayer socket – is it connected?', e);
            throw e;
        }

        this.socket.on('voice:peer-joined', this.handlePeerJoined.bind(this));
        this.socket.on('voice:peer-left', this.handlePeerLeft.bind(this));
        this.socket.on('voice:signal', this.handleSignal.bind(this));
        this.socket.on('voice:mute-state', this.handleMuteState.bind(this));
        this.socket.on('voice:roster', this.handleRoster.bind(this));

        this.socket.on('connect', () => {
            if (this.wasInVoice && this.roomId && this.userId) {
                this.rejoinVoice();
            }
        });

        this.listenersSetup = true;
    }

    async joinVoice() {
        const room = useMultiplayerStore.getState().currentRoom;
        const user = useAuthStore.getState().user;
        if (!room || !user) {
            console.warn('[voice-client] cannot join - no room or user');
            return;
        }

        this.userId = user.id;
        this.roomId = room.id;
        this.wasInVoice = true;

        this.ensureSocketAndListeners();

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            useVoiceStore.getState().setLocalStream(this.localStream);
        } catch (err) {
            console.error('Failed to get mic', err);
            return;
        }

        // Send roomId explicitly to the server
        this.socket!.emit('voice:join', { userId: this.userId, roomId: this.roomId }, (roster: string[]) => {
            console.log('[voice-client] roster received:', roster);
            roster.forEach(peerId => {
                if (peerId !== this.userId) {
                    this.createPeerConnection(peerId, true);
                }
            });
        });
    }

    leaveVoice() {
        if (!this.userId) return;
        this.socket?.emit('voice:leave', this.userId);

        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.makingOffer.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        useVoiceStore.getState().reset();
        this.userId = null;
        this.roomId = null;
        this.wasInVoice = false;
    }

    toggleMute() {
        const store = useVoiceStore.getState();
        if (!this.localStream) return;
        const muted = !store.isMuted;
        this.localStream.getAudioTracks().forEach(track => (track.enabled = !muted));
        store.setMuted(muted);
        this.socket?.emit('voice:mute-state', { userId: this.userId, muted });
    }

    private createPeerConnection(peerId: string, isInitiator: boolean) {
        if (this.peerConnections.has(peerId)) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        this.peerConnections.set(peerId, pc);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
        }

        pc.ontrack = (event) => {
            console.log('[voice] ontrack from', peerId, 'track kind:', event.track.kind);
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track);
            useVoiceStore.getState().addPeerStream(peerId, remoteStream);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && this.socket) {
                this.socket.emit('voice:signal', {
                    type: 'ice-candidate',
                    targetUserId: peerId,
                    candidate: event.candidate,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[voice] connection state with ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.removePeer(peerId);
            }
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
        } catch (err) {
            console.error('Error creating offer', err);
            this.makingOffer.delete(peerId);
        }
    }

    private handlePeerJoined(userId: string) {
        if (userId === this.userId || !this.roomId) return;
        this.createPeerConnection(userId, true);
    }

    private handlePeerLeft(userId: string) {
        this.removePeer(userId);
    }

    private removePeer(userId: string) {
        this.makingOffer.delete(userId);
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
        }
        useVoiceStore.getState().removePeerStream(userId);
    }

    private async handleSignal(payload: any) {
        const { type, fromUserId, sdp, candidate } = payload;
        if (!fromUserId) return;

        let pc = this.peerConnections.get(fromUserId);

        // Perfect negotiation collision handling
        if (type === 'offer') {
            const collision = this.makingOffer.has(fromUserId);
            if (collision) {
                if (this.isPolite(fromUserId)) {
                    console.log('[voice] Collision: we are polite, rolling back offer to', fromUserId);
                    this.makingOffer.delete(fromUserId);
                    if (pc) {
                        pc.close();
                        this.peerConnections.delete(fromUserId);
                    }
                    this.createPeerConnection(fromUserId, false);
                    pc = this.peerConnections.get(fromUserId);
                } else {
                    console.log('[voice] Collision: we are impolite, ignoring offer from', fromUserId);
                    return;
                }
            }
        }

        if (!pc) {
            if (type === 'offer') {
                this.createPeerConnection(fromUserId, false);
                pc = this.peerConnections.get(fromUserId);
            } else {
                console.warn(`Ignoring signal, no peer connection for ${fromUserId}`);
                return;
            }
        }

        if (!pc) return;

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                this.socket?.emit('voice:signal', {
                    type: 'answer',
                    targetUserId: fromUserId,
                    sdp: answer,
                });
            } else if (type === 'answer') {
                this.makingOffer.delete(fromUserId);
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } else if (type === 'ice-candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (err) {
            console.error('Error handling signal', err);
        }
    }

    private handleMuteState(payload: { userId: string; muted: boolean }) {
        useVoiceStore.getState().setPeerMuted(payload.userId, payload.muted);
    }

    private handleRoster(payload: { users: string[] }) {
        const currentPeers = Array.from(this.peerConnections.keys());
        currentPeers.forEach(peerId => {
            if (!payload.users.includes(peerId)) {
                this.removePeer(peerId);
            }
        });
    }

    private rejoinVoice() {
        if (!this.roomId || !this.userId) return;
        this.socket?.emit('voice:join', { userId: this.userId, roomId: this.roomId }, (roster: string[]) => {
            this.peerConnections.forEach(pc => pc.close());
            this.peerConnections.clear();
            this.makingOffer.clear();
            useVoiceStore.getState().clearPeers();

            roster.forEach(peerId => {
                if (peerId !== this.userId) {
                    this.createPeerConnection(peerId, true);
                }
            });
        });
    }
}

export const voiceService = new VoiceService();