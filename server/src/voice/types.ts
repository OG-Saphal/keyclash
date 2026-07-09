// These replace browser-specific WebRTC types that don't exist in Node.js.
// They only need to match the JSON structure sent by the client.
interface SignalSdp {
    type?: string;
    sdp?: string;
}

interface SignalCandidate {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
}

export interface VoiceSignalPayload {
    type: 'offer' | 'answer' | 'ice-candidate';
    targetUserId: string;
    sdp?: SignalSdp;
    candidate?: SignalCandidate;
}

export interface VoiceMuteStatePayload {
    userId: string;
    muted: boolean;
}