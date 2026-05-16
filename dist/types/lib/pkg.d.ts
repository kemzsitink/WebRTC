import "webrtc-adapter";
import type { IRtcInstance } from "./types/rtcInterface";
import { RotateDirection, InjectStreamStatusType, KeyboardMode } from "./types/index";
import type { CustomDefinition, ArmcloudEngineParams, ArmcloudRtcOptions, ArmcloudCallbacks, EquipmentInfoType } from "./types/index";
import { MessageKey, MediaType } from "./types/webrtcType";
declare class ArmcloudEngine {
    version: string;
    rtcInstance: IRtcInstance | null;
    rtcOptions: ArmcloudRtcOptions | null;
    callbacks: ArmcloudCallbacks | null;
    streamType: number | null;
    private axiosSource;
    constructor(params: ArmcloudEngineParams);
    private applyToken;
    /** 静态方法 浏览器是否支持webrTC */
    static isSupported(): boolean;
    reshapeWindow(): void;
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState: number | string, actionKey: number | string, forwardOff?: boolean): void;
    /** 获取初始化配置 */
    setupInitConfig(params: ArmcloudEngineParams): void;
    /** 设置回调 */
    setupCallbacks(params: ArmcloudEngineParams): void;
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
    /** 获取注入推流状态 */
    getInjectStreamStatus(type: InjectStreamStatusType, timeout?: number): any;
    /** 生成uuid */
    generateUUID(): string;
    getRequestId(): string | undefined;
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
    /** 是否开启麦克风 */
    setMicrophone(val: boolean): void;
    /** 是否开启摄像头 */
    setCamera(val: boolean): void;
    /** 手动开启音视频流播放 */
    startPlay(): void;
    setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
    /** 加入房间 */
    start(isGroupControl?: boolean, pads?: never[]): void;
    /** 群控加入房间 */
    joinGroupRoom(pads?: never[]): void;
    /** 踢出群控房间 */
    kickItOutRoom(pads?: never[]): void;
    toggleGroupControlSync(flag?: boolean): void;
    /** 离开房间 */
    stop(): Promise<void | undefined>;
    /**
     * 静音
     */
    muted(): void;
    /**
     * 取消静音
     */
    unmuted(): void;
    /** app卸载 */
    appUnInstall(pkgNames: Array<string>): void;
    /** 获取云机信息 */
    getEquipmentInfo(type: EquipmentInfoType): void;
    /** 指定摄像头 */
    setVideoDeviceId(val: string): void;
    /** 指定麦克风 */
    setAudioDeviceId(val: string): void;
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 剪切板内容
     */
    sendInputClipper(inputStr: string, forwardOff?: boolean): void;
    /**
     * 将字符串 分别发到云机的剪切板中
     * @param inputStr 剪切板内容
     */
    sendGroupInputClipper(pads: any, strs: any): void;
    /**
     * 将字符串 分别发到云机的输入框中
     * @param inputStr 剪切板内容
     */
    sendGroupInputString(pads: any, strs: any): void;
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 剪切板内容
     */
    sendInputString(inputStr: string, forwardOff?: boolean): void;
    /** 清晰度切换 */
    setStreamConfig(config: CustomDefinition, forwardOff?: boolean): void;
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType?: number): void | Promise<void>;
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType?: number): void | Promise<void>;
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    subscribeStream(mediaType?: number): void | Promise<void>;
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     * 该方法对自动订阅和手动订阅模式均适用。
     */
    unsubscribeStream(mediaType?: number): void | Promise<void>;
    /** 截图-保存到本地 */
    saveScreenShotToLocal(): Promise<unknown>;
    /** 修改屏幕分辨率和dpi */
    setScreenResolution(options: {
        width: number;
        height: number;
        dpi: number;
        type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY;
    }, forwardOff?: boolean): void;
    /** 截图-保存到云机 */
    saveScreenShotToRemote(): void;
    /** 重新设置大小 */
    resizeScreenshot(width: number, height: number): void;
    /** 显示封面图 */
    showScreenShot(): void;
    /** 隐藏封面图 */
    hideScreenShot(): void;
    /** 旋转截图 */
    setScreenshotRotation(rotation?: number): void;
    /** 生成封面图 */
    takeScreenshot(rotation?: number): void;
    /** 清空封面图 */
    clearScreenShot(): void;
    /**
     * 手动横竖屏
     */
    setPhoneRotation(type: RotateDirection): void;
    setVideoEncoder(width: number, height: number): void;
    /** 手动定位 */
    setGPS(longitude: number, latitude: number): void;
    /** 执行adb命令 */
    executeAdbCommand(command: string, forwardOff?: boolean): void;
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType: KeyboardMode): void;
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second: number): void;
    /** 获取无操作回收时间 */
    getAutoRecycleTime(): number | undefined;
    /** 底部栏操作按键 */
    sendCommand(command: string, forwardOff?: boolean): void;
    /** 音量增加按键事件 */
    increaseVolume(forwardOff?: boolean): void;
    /** 音量减少按键事件 */
    decreaseVolume(forwardOff?: boolean): void;
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag: boolean): void;
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    startMediaStream(mediaType: MediaType): void | Promise<any>;
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    stopMediaStream(mediaType: MediaType): void | Promise<any>;
    /**  注入视频到相机 */
    injectVideoStream(type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO, options?: any, timeout?: number, forwardOff?: boolean): any;
    /**
     * 摇一摇
     * @param time
     */
    sendShake(time?: number): void;
    /**
     * 获取当前旋转类型
     * @returns 0 竖屏 1 横屏
     */
    getRotateType(): number | undefined;
}
export default ArmcloudEngine;
