import { IGroupControl } from "../../types/groupControlInterface";
declare class CustomGroupRtc implements IGroupControl {
    private engine;
    private params;
    private pads;
    private callbacks;
    private sourceArr;
    constructor(params: any, pads: Array<string>, callbacks: any);
    close(): void;
    kickItOutRoom(pads: Array<string>): void;
    joinRoom(pads: any): Promise<void>;
    getEngine(): Promise<void>;
    sendUserMessage(userId: string, message?: string): Promise<any>;
    sendRoomMessage(message: string): Promise<any>;
    getMsgTemplate(touchType: string, content: object): string;
    /** 远端可见用户加入房间 */
    onUserJoined(): void;
    /** 监听 onUserMessageReceived 事件 */
    onUserMessageReceived(): void;
    /** 远端可见用户加离开房间 */
    onUserLeave(): void;
    createEngine(options: any): Promise<void>;
}
export default CustomGroupRtc;
