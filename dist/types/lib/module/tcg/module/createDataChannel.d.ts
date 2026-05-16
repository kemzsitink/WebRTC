import { CloudGamingWebSDK } from "../core/index";
export declare const enum EventType {
    MESSAGE = "message",
    INITIALIZED = "initialized",
    CALLBACK = "callBack"
}
type Listener<T = any> = (payload: T) => void;
export default class CreateDataChannel {
    private TCGSDK;
    private destPort;
    private sendMessage;
    private code;
    private events;
    constructor(TCGSDK: CloudGamingWebSDK, destPort: number);
    init(type?: 'android_broadcast' | 'android'): Promise<void>;
    send(message: string | Object): void;
    on(event: EventType, listener: Listener): any;
    once(event: EventType, listener: Listener): this;
    off(event: EventType, listener: Listener): this;
    private emit;
    getCode(): number | null;
}
export {};
