import type { ArmcloudCallbacks, ArmcloudRtcOptions } from "../../types/index";
declare class WebGroupRTC {
    private params;
    private pingTimer;
    private callbacks;
    private socket;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    private sourceArr;
    constructor(params: ArmcloudRtcOptions | null, pads: Array<string>, callbacks: ArmcloudCallbacks | null);
    close(): void;
    sendMessage(message: string): void;
    startHeartbeat(): void;
    initSocket(signalServer: string, roomToken: string): void;
    handleReconnect(signalServer: string, roomToken: string): void;
    joinRoom(pads: any): void;
}
export default WebGroupRTC;
