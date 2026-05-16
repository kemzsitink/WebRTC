export declare class VideoElement {
    private masterIdPrefix;
    private remoteUserId;
    private videoDomId;
    private remoteVideoId;
    private containerId;
    private remoteVideo;
    private eventListeners;
    constructor(masterIdPrefix: string, remoteUserId: string);
    getVideoDomId(): string;
    getRemoteVideoId(): string;
    getContainerId(): string;
    getRemoteVideo(): HTMLVideoElement;
    createElements(): HTMLElement;
    private createRemoteVideoElement;
    bindDomEvent(type: string, listener: EventListener): void;
    removeAllEvents(): void;
    private createDivElement;
    private createDiv;
    destroy(): void;
}
