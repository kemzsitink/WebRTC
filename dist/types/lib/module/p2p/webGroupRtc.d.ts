import type { ArmcloudCallbacks, ArmcloudRtcOptions } from "../../types/index";
import { IGroupControl } from "../../types/groupControlInterface";
declare class WebGroupRtc implements IGroupControl {
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
    kickItOutRoom(pads: string[]): void;
    sendMessage(message: string): void;
    startHeartbeat(): void;
    initSocket(signalServer: string, roomToken: string): void;
    handleReconnect(signalServer: string, roomToken: string): void;
    joinRoom(pads: any): Promise<any>;
}
export default WebGroupRtc;
