import type { CustomDefinition } from "../../types/index";
import { KeyboardMode } from "../../types/index";
import { MediaType, MessageKey } from "../../types/webrtcType";
declare class customRtc {
    private initDomId;
    private videoDomId;
    private hasPushDown;
    private enableMicrophone;
    private enableCamera;
    private screenShotInstance;
    private isFirstRotate;
    private metricsReporter;
    private remoteResolution;
    private touchConfig;
    private _listenKeyboardShortcut;
    private isContainerActive;
    private touchInfo;
    private simulateTouchInfo;
    private options;
    private groupControlSync;
    private engine;
    private groupEngine;
    private groupRtc;
    private inputElement;
    private promiseMap;
    roomMessage: any;
    autoRecoveryTimer: any;
    isFirstFrame: boolean;
    firstFrameCount: number;
    rotation: number;
    isGroupControl: boolean;
    private metricsTimer;
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
    callbacks: any;
    remoteUserId: string;
    private rotateType;
    private videoDeviceId;
    private audioDeviceId;
    private isCameraInject;
    private isMicrophoneInject;
    private cameraResolution;
    constructor(viewId: string, params: any, callbacks: any);
    /** 浏览器是否支持 */
    isSupported(): Promise<boolean>;
    setMicrophone(val: boolean): void;
    setCamera(val: boolean): void;
    /** 设置摄像头设备 */
    setVideoDeviceId(val: string): Promise<undefined>;
    /** 设置麦克风设备 */
    setAudioDeviceId(val: string): Promise<any>;
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
    /** 触发无操作回收回调函数 */
    triggerRecoveryTimeCallback(): void;
    setVideoEncoder(width: number, height: number): void;
    /** 调用 createEngine 创建一个本地 Engine 引擎对象 */
    createEngine(): Promise<void>;
    createGroupEngine(pads?: never[], config?: any): Promise<void>;
    /** 手动销毁通过 createEngine 所创建的引擎对象 */
    destroyEngine(): void;
    /**
     * 静音
     */
    muted(): void;
    /**
     * 取消静音
     */
    unmuted(): void;
    /** 按顺序发送文本框 */
    sendGroupInputString(pads: any, strs: any): void;
    /**  群控剪切板  */
    sendGroupInputClipper(pads: any, strs: any): void;
    /** 手动开启音视频流播放 */
    startPlay(): void;
    /** 群控房间信息 */
    sendGroupRoomMessage(message: string): Promise<any>;
    getMsgTemplate(touchType: string, content: object): string;
    /** 获取应用信息 */
    getEquipmentInfo(type: "app" | "attr"): void;
    /** 获取注入推流状态 */
    getInjectStreamStatus(type: "video" | "camera" | "audio", timeout?: number): Promise<unknown>;
    /** 应用卸载 */
    appUnInstall(pkgNames: Array<string>): void;
    /** 通知手机需要注入 */
    private notifyInject;
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    startMediaStream(mediaType: MediaType, msgData?: any): Promise<{
        audio: any;
        video: any;
    }>;
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    stopMediaStream(mediaType: MediaType): Promise<void>;
    /** 摄像头注入 */
    private cameraInject;
    /** 麦克风注入 */
    private microphoneInject;
    /** 发送消息 */
    sendUserMessage(userId: string, message: string, notSendInGroups?: boolean): Promise<unknown>;
    /** 群控退出房间 */
    kickItOutRoom(pads: Array<string>): void;
    /** 群控加入房间 */
    joinGroupRoom(pads: any): void;
    /** 进入 RTC 房间 */
    start(isGroupControl?: boolean, pads?: never[]): void;
    startCV(): void;
    private bindContainerActiveState;
    enableKeyboardShortcut(): void;
    disableKeyboardShortcut(): void;
    /**
   * 监听键盘快捷键
   */
    listenKeyboardShortcut(e: KeyboardEvent): void;
    /** 远端用户离开房间 */
    onUserLeave(): void;
    setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
    getCameraState(isRetry?: boolean): Promise<void>;
    updateUiH5(isRetry?: boolean): Promise<void>;
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
    /** 远端可见用户加入房间 */
    onUserJoined(): void;
    /** 视频首帧渲染 */
    onRemoteVideoFirstFrame(): void;
    /** 离开 RTC 房间 */
    stop(): Promise<undefined>;
    /** 房间内新增远端摄像头/麦克风采集音视频流的回调 */
    onUserPublishStream(): void;
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time: number): void;
    checkInputState(msg: any): void;
    /** 监听 onRoomMessageReceived 事件 */
    onRoomMessageReceived(): void;
    /** 监听 onUserMessageReceived 事件 */
    onUserMessageReceived(): void;
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 需要发送的字符串
     */
    sendInputClipper(inputStr: string, forwardOff?: boolean): Promise<void>;
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 需要发送的字符串
     */
    sendInputString(inputStr: string, forwardOff?: boolean): Promise<void>;
    /** 清晰度切换 */
    setStreamConfig(config: CustomDefinition, forwardOff?: boolean): void;
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType?: number): Promise<void> | undefined;
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType?: number): Promise<void> | undefined;
    setRemoteVideoRotation(rotation: number): Promise<void>;
    setScreenResolution(options: {
        width: number;
        height: number;
        dpi: number;
        type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY;
    }, forwardOff?: boolean): void;
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    subscribeStream(mediaType: MediaType): Promise<void | undefined>;
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
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    unsubscribeStream(mediaType: MediaType): Promise<void> | undefined;
    /** 截图-保存到本地 */
    saveScreenShotToLocal(): Promise<ImageData> | undefined;
    /** 截图-保存到云机 */
    saveScreenShotToRemote(): void;
    /**
     * 手动横竖屏：0竖屏，1横屏
     * 对标百度API
     */
    setPhoneRotation(type: number): void;
    getRotateType(): number;
    private initRotateScreen;
    /**
     * 旋转屏幕
     * @param type 横竖屏：0竖屏，1横屏
     */
    rotateScreen(type: number): Promise<void>;
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState: number | string, keyCode: number | string, forwardOff?: boolean): void;
    /** 手动定位 */
    setGPS(longitude: number, latitude: number): void;
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag?: boolean): void;
    executeAdbCommand(command: string, forwardOff?: boolean): void;
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
    getAutoRecycleTime(): any;
    /** 调整坐标 */
    reshapeWindow(): void;
    /** 底部栏操作按键 */
    sendCommand(command: string, forwardOff?: boolean): void;
    /**  注入视频到相机 */
    injectVideoStream(type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO, options: any, timeout?: number, forwardOff?: boolean): Promise<unknown>;
    /** 音量增加按键事件 */
    increaseVolume(forwardOff?: boolean): void;
    /** 音量减少按键事件 */
    decreaseVolume(forwardOff?: boolean): void;
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag: boolean): void;
}
export default customRtc;
