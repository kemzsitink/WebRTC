import type { CustomDefinition } from "../../types/index";
import { KeyboardMode, RotateDirection } from "../../types/index";
import { MediaType, MessageKey } from "../../types/webrtcType";
import type { ArmcloudRtcOptions, ArmcloudCallbacks } from "../../types/index";
declare class WebRTC {
    private initDomId;
    private videoDomId;
    private remoteVideoContainerId;
    private remoteVideoId;
    private screenShotInstance;
    private pingTimer;
    private hasPushDown;
    private refreshUiMsgNumber;
    private isVideoFirstFrame;
    private enableMicrophone;
    private enableCamera;
    private videoDeviceId;
    private audioDeviceId;
    private isCameraInject;
    private isMicrophoneInject;
    private groupControlSync;
    private promiseMap;
    private remoteResolution;
    private roomMessage;
    private options;
    private socket;
    private retryCount;
    private retryCountBackup;
    private retryTime;
    private remotePc;
    private dataChannel;
    private remoteUserId;
    private inputElement;
    private autoRecoveryTimer;
    private runInfoTimer;
    private touchConfig;
    private touchInfo;
    /**
     * 安卓对应回车值
     * go：前往 2
     * search：搜索 3
     * send：发送 4
     * next：下一个 5
     * done：完成 6
     * previous：上一个 7
     */
    enterkeyhintObj: Record<number, string>;
    private socketParams;
    private callbacks;
    private videoStreams;
    private audioStreams;
    private videoSenders;
    private audioSenders;
    private senderVideoTracks;
    private senderAudioTracks;
    private isGroupControl;
    private groupRtc;
    private groupPads;
    private masterIdPrefix;
    private stopOperation;
    private videoElement;
    constructor(viewId: string, params: ArmcloudRtcOptions, callbacks: ArmcloudCallbacks);
    /**
     * AES 解密方法
     * @param {*} encryptData 加密数据
     * @param {*} key 秘钥
     * @returns 解密后数据
     */
    private decryptAES;
    private getMsgTemplate;
    /** 获取应用信息 */
    getEquipmentInfo(type: "app" | "attr"): void;
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag?: boolean): void;
    /** 应用卸载 */
    appUnInstall(pkgNames: Array<string>): void;
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState: number | string, keyCode: number | string, forwardOff?: boolean): void;
    /** 旋转截图 */
    setScreenshotRotation(rotation?: number): void;
    /** 生成封面图 */
    takeScreenshot(rotation?: number): void;
    /** 重新设置大小 */
    resizeScreenshot(width: number, height: number): void;
    /** 显示封面图 */
    showScreenShot(): void;
    /** 显示封面图 */
    hideScreenShot(): void;
    /** 清空封面图 */
    clearScreenShot(): void;
    setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
    /**
     * 获取媒体流的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     * @param msgData 消息数据（仅视频需要）
     * @returns MediaStream
     */
    private getMediaStream;
    /** 设置摄像头设备 */
    setVideoDeviceId(val: string): Promise<void>;
    /** 设置麦克风设备 */
    setAudioDeviceId(val: string): Promise<void>;
    /** 推送摄像头 */
    private captureVideo;
    getRotateType(): RotateDirection | undefined;
    /** 推送麦克风 */
    private captureAudio;
    /**
     * 停止轨道和流的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     */
    private stopTracksAndStreams;
    /**
     * 平滑切换轨道的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     * @param msgData 消息数据（仅视频需要）
     */
    private smoothTrackReplace;
    private startHeartbeat;
    /** 麦克风注入 */
    private microphoneInject;
    /** 摄像头注入 */
    private cameraInject;
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    startMediaStream(mediaType: MediaType, msgData?: any): Promise<void>;
    /** 通知手机需要注入 */
    private notifyInject;
    setScreenResolution(options: {
        width: number;
        height: number;
        dpi: number;
        type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY;
    }, forwardOff?: boolean): void;
    setVideoEncoder(width: number, height: number): void;
    triggerClickEvent(options: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, forwardOff?: boolean): void;
    triggerPointerEvent(action: 0 | 1 | 2, options: {
        x: number;
        y: number;
        width: number;
        height: number;
    }, forwardOff?: boolean): void;
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    stopMediaStream(mediaType: MediaType): Promise<void>;
    /** 初始化ws */
    private setupWebSocket;
    /**
     * 静音
     */
    muted(): void;
    /**
     * 取消静音
     */
    unmuted(): void;
    startPlay(): void;
    private sendGroupMag;
    /** 群控退出房间 */
    kickItOutRoom(pads: any): void;
    /** 群控加入房间 */
    joinGroupRoom(pads: any): void;
    private createWebGroupRtc;
    /** 滚轮事件 */
    private handleVideoWheel;
    /** 鼠标移出 */
    private handleVideoMouseleave;
    /** 鼠标按下 */
    private handleVideoMousedown;
    /** 鼠标移动 */
    private handleVideoMousemove;
    /** 鼠标结束 */
    private handleVideoMouseup;
    /** 加入房间 */
    start(isGroupControl?: boolean, pads?: never[]): void;
    /** 注册PeerConnection事件 */
    private setupPeerConnectionEvents;
    /** 注册dataChannel事件 */
    private setupDataChannelEvents;
    /** 注册Touch事件 */
    private setupTouchEvents;
    /**  发送local offer */
    private sendOffer;
    /** 接收remote offer */
    private receiveOffer;
    /** 获取注入推流状态 */
    getInjectStreamStatus(type: "video" | "camera" | "audio", timeout?: number): Promise<unknown>;
    /** 注入视频到相机 */
    injectVideoStream(type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO, options: any, timeout?: number, forwardOff?: boolean): Promise<unknown>;
    /** 获取摄像头状态 */
    private getCameraState;
    /** 接收remote answer */
    private receiveAnswer;
    /** 只保留最后一次协商（last-one-wins） */
    private negotiateOffer;
    /** 发送local answer */
    private sendAnswer;
    /** 第一帧加载完成 */
    private renderedFirstFrame;
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     * @param mediaType
     * @returns
     */
    subscribeStream(mediaType: MediaType): Promise<void>;
    executeAdbCommand(command: string): void;
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    unsubscribeStream(mediaType: MediaType): Promise<void>;
    private handleMediaPlay;
    /** 等待视频首帧画面被渲染 */
    private waitForFirstFrameRendered;
    /** 停止所有操作 */
    private stopOperations;
    /** 关闭所有资源 但不销毁元素 */
    private close;
    /** 销毁 */
    private destroy;
    stop(): void;
    /** 定期获取统计信息的函数 */
    private getStats;
    /** 浏览器是否支持 */
    isSupported(): boolean;
    /** 触发无操作回收回调函数 */
    private triggerRecoveryTimeCallback;
    /** 发送消息 */
    sendUserMessage(message: string, notRecycling?: boolean): Promise<void>;
    setMicrophone(val: boolean): void;
    setCamera(val: boolean): void;
    setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
    /** 监听广播消息 */
    private onRoomMessageReceived;
    /** 设置摄像头设备 */
    /** 调整坐标 */
    reshapeWindow(): void;
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 需要发送的字符串
     */
    sendInputClipper(inputStr: string): Promise<void>;
    /** 群控剪切板 */
    sendGroupInputClipper(pads: any, strs: any): void;
    /** 按顺序发送文本框 */
    sendGroupInputString(pads: any, strs: any): void;
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 需要发送的字符串
     */
    sendInputString(inputStr: string): Promise<void>;
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time: number): void;
    /** 清晰度切换 */
    setStreamConfig(config: CustomDefinition): void;
    private handleSendData;
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType?: number): void;
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType?: number): void;
    /** 截图-保存到本地 */
    saveScreenShotToLocal(): Promise<unknown> | undefined;
    /** 截图-保存到云机 */
    saveScreenShotToRemote(): void;
    /**
     * 手动横竖屏：0竖屏，1横屏
     * 对标百度API
     */
    setPhoneRotation(type: RotateDirection): void;
    /**
     * 旋转屏幕
     * @param type 旋转方向：0竖屏，1横屏
     */
    rotateScreen(type: RotateDirection): Promise<void>;
    /** 手动定位 */
    setGPS(longitude: number, latitude: number): void;
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType: KeyboardMode): void;
    /** 查询输入状态 */
    onCheckInputState(): Promise<void>;
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second: number): void;
    /** 获取无操作回收时间 */
    getAutoRecycleTime(): number | undefined;
    /** 底部栏操作按键 */
    sendCommand(command: string): void;
    /** 返回按键事件 */
    private goAppUpPage;
    /** 主页按键事件 */
    private goAppHome;
    /** 菜单按键事件 */
    private goAppMenu;
    /** 音量增加按键事件 */
    increaseVolume(): void;
    /** 音量减少按键事件 */
    decreaseVolume(): void;
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag: boolean): void;
}
export default WebRTC;
