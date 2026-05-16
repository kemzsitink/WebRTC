import type { CustomDefinition, ArmcloudRtcOptions, ArmcloudCallbacks } from "../../types/index";
import { KeyboardMode } from "../../types/index";
import { EquipmentInfoType, InjectStreamStatusType, RotateDirection } from "../../types/index";
import { MediaType, MessageKey } from "../../types/webrtcType";
declare class tcgRtc {
    private initDomId;
    private options;
    private callbacks;
    private TCGSDK;
    private androidInstance;
    private videoDomId;
    private remoteUserId;
    private metricsReporter;
    private abortController;
    private dataChannel;
    private groupDataChannel;
    private isGroupControl;
    private groupPads;
    private promiseMap;
    private isCameraInject;
    private isMicrophoneInject;
    private enableCamera;
    private enableMicrophone;
    private videoDeviceId;
    private audioDeviceId;
    private metricsTimer;
    private inputElement;
    private rotateType;
    private remoteInputState;
    private lastStreamResolution;
    private remoteDesktopResolution;
    /**
     * 安卓对应回车值
     * go：前往 2
     * search：搜索 3
     * send：发送 4
     * next：下一个 5
     * done：完成 6
     * previous：上一个 7
     */
    private enterkeyhintObj;
    constructor(initDomId: string, options: ArmcloudRtcOptions, callbacks: ArmcloudCallbacks);
    private setupVideoDom;
    /** 获取消息模板 */
    private getMsgTemplate;
    setMicrophone(val: boolean): void;
    setCamera(val: boolean): void;
    /** 设置摄像头设备 */
    setVideoDeviceId(val: string): Promise<undefined>;
    /** 设置麦克风设备 */
    setAudioDeviceId(val: string): Promise<undefined>;
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
    /** 触发无操作回收回调函数 */
    triggerRecoveryTimeCallback(): void;
    setVideoEncoder(width: number, height: number): void;
    /**
     * 静音
     */
    muted(): void;
    getRequestId(): any;
    /**
     * 取消静音
     */
    unmuted(): void;
    /** 手动开启音视频流播放 */
    startPlay(): any;
    /** 群控房间信息 */
    sendGroupRoomMessage(message: string): Promise<void>;
    /** 获取应用信息 */
    getEquipmentInfo(type: EquipmentInfoType): void;
    /** 获取注入推流状态 */
    getInjectStreamStatus(type: InjectStreamStatusType, timeout?: number): Promise<unknown>;
    /** 应用卸载 */
    appUnInstall(pkgNames: Array<string>): void;
    /** 通知手机需要注入 */
    private notifyInject;
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    startMediaStream(mediaType: MediaType, msgData?: any): Promise<void>;
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    stopMediaStream(mediaType: MediaType): Promise<void>;
    /** 摄像头注入 */
    private cameraInject;
    /** 麦克风注入 */
    private microphoneInject;
    /** 群控退出房间 */
    kickItOutRoom(pads: Array<string>): void;
    private getAndroidInstanceToken;
    /** 群控加入房间 */
    joinGroupRoom(pads: Array<string>): void;
    /** 浏览器是否支持 */
    isSupported(): boolean;
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second: number): void;
    /** 获取无操作回收时间 */
    getAutoRecycleTime(): number;
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag?: boolean): void;
    /** 远端视频首帧渲染 */
    private onRemoteVideoFirstFrame;
    /** 初始化输入框 */
    private setupInputElement;
    /** 获取远端输入框状态 */
    private getRemoteInputState;
    /** 同步远端输入状态到本地输入框 */
    private syncInputFocusState;
    /** 根据云端分辨率比例修正目标分辨率 */
    private matchResolution;
    private setDomResolution;
    /** 初始化推流分辨率 */
    private setupStreamResolution;
    /** 控制音视频流渲染模式 */
    private setMediaStreamRender;
    /** 隐藏a标签 */
    private hideATags;
    private setupSDK;
    /**
     * 设置手机旋转
     * @param type 1: 横屏，0: 竖屏
     */
    setPhoneRotation(type: RotateDirection): void;
    /** 触发 change rotate 事件 */
    private triggerChangeRotateEvent;
    /**
     * 屏幕旋转
     * @param type @param type 1: 横屏，0: 竖屏
     * @param degree
     * @returns
     */
    private screenRotation;
    private setupDataChannel;
    private sendUserMessage;
    /** 按顺序发送文本框 */
    sendGroupInputString(pads: any, strs: any): void;
    /**  群控剪切板  */
    sendGroupInputClipper(pads: any, strs: any): void;
    /** 执行adb命令 */
    executeAdbCommand(command: string, forwardOff?: boolean): void;
    /** 进入 RTC 房间 */
    start(isGroupControl?: boolean, pads?: never[]): void;
    /** 远端用户离开房间 */
    onUserLeave(): void;
    setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
    private getCameraState;
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
    /** 离开 RTC 房间 */
    stop(): Promise<void>;
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time: number): void;
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
    setStreamConfig(config: CustomDefinition): void;
    setScreenResolution(options: {
        width: number;
        height: number;
        dpi: number;
        type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY;
    }, forwardOff?: boolean): Promise<void>;
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    subscribeStream(mediaType: MediaType): Promise<void>;
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
    unsubscribeStream(mediaType: MediaType): Promise<void>;
    /** 截图-保存到本地 */
    saveScreenShotToLocal(): Promise<any>;
    /** 截图-保存到云机 */
    saveScreenShotToRemote(): void;
    getRotateType(): RotateDirection | undefined;
    /** 手动定位 */
    setGPS(longitude: number, latitude: number): void;
    /** 调整坐标 */
    reshapeWindow(): void;
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType: KeyboardMode): void;
    /** 底部栏操作按键 */
    sendCommand(command: string): void;
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState: number | string, keyCode: number | string, forwardOff?: boolean): void;
    /** 注入视频到相机 */
    injectVideoStream(type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO, options: any, timeout?: number): Promise<unknown>;
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
export default tcgRtc;
