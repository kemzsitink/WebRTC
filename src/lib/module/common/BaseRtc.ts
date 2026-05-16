import type { ArmcloudRtcOptions, ArmcloudCallbacks, CustomDefinition, EquipmentInfoType, KeyboardMode, RotateDirection, InjectStreamStatusType } from "../../types/index";
import { TouchType, MessageKey, MediaType } from "../../types/webrtcType";

import { IRtcInstance } from "../../types/rtcInterface";
import { InputService } from "../../services/InputService";
import { IGroupControl } from "../../types/groupControlInterface";

export abstract class BaseRtc implements IRtcInstance {
  protected videoDomId: string = "";
  protected remoteUserId: string = "";
  protected isCameraInject: boolean = false;
  protected isMicrophoneInject: boolean = false;
  protected hasPushDown: boolean = false;
  protected enableMicrophone: boolean = true;
  protected enableCamera: boolean = true;
  protected videoDeviceId: string = "";
  protected audioDeviceId: string = "";
  protected isGroupControl: boolean = false;
  protected inputService: InputService;
  protected groupRtc: IGroupControl | null = null;


  constructor(
    protected initDomId: string,
    protected options: ArmcloudRtcOptions,
    protected callbacks: ArmcloudCallbacks
  ) {
    this.setupCallbacks();
    this.inputService = new InputService(this as any); // Cast to any to avoid incomplete abstract class issues during init
  }

  protected setupCallbacks() {
    if (!this.callbacks) {
      this.callbacks = {};
    }
  }

  public getRequestId(): string {
    return this.options.requestId || "";
  }

  protected createVideoContainer(padCode: string, masterIdPrefix: string): HTMLDivElement {
    const videoDomId = `${masterIdPrefix}_${padCode}_armcloudVideo`;
    this.videoDomId = videoDomId;

    const videoContainer = document.createElement("div");
    videoContainer.id = videoDomId;
    videoContainer.style.position = "relative";

    const parentContainer = document.getElementById(this.initDomId);
    if (parentContainer) {
      parentContainer.appendChild(videoContainer);
    }

    return videoContainer;
  }

  protected getMsgTemplate(touchType: TouchType, content: any): string {
    return JSON.stringify({
      touchType,
      content: typeof content === "string" ? content : JSON.stringify(content),
    });
  }

  // --- IRtcInstance methods to be implemented by subclasses ---
  abstract start(isGroupControl?: boolean, pads?: string[]): void;
  abstract stop(): Promise<void> | void;
  abstract reshapeWindow?(): void;
  abstract triggerKeyboardShortcut?(metaState: number | string, actionKey: number | string, forwardOff?: boolean): void;
  abstract setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
  abstract getInjectStreamStatus(type: InjectStreamStatusType, timeout?: number): Promise<any> | any;
  abstract triggerClickEvent(options: { x: number; y: number; width: number; height: number }, forwardOff?: boolean): void;
  abstract triggerPointerEvent(action: 0 | 1 | 2, options: { x: number; y: number; width: number; height: number }, forwardOff?: boolean): void;
  abstract setMicrophone(val: boolean): void;
  abstract setCamera(val: boolean): void;
  abstract startPlay(): Promise<void> | void;
  abstract setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
  abstract joinGroupRoom(pads?: string[]): void;
  abstract kickItOutRoom(pads?: string[]): void;
  abstract toggleGroupControlSync(flag?: boolean): void;
  abstract muted(): void;
  abstract unmuted(): void;
  abstract appUnInstall(pkgNames: string[]): void;
  abstract getEquipmentInfo(type: EquipmentInfoType | "app" | "attr"): void;
  abstract setVideoDeviceId(val: string): Promise<void> | void;
  abstract setAudioDeviceId(val: string): Promise<void> | void;
  abstract sendInputClipper(inputStr: string, forwardOff?: boolean): void;
  abstract sendGroupInputClipper(pads: any, strs: any): void;
  abstract sendGroupInputString(pads: any, strs: any): void;
  abstract sendInputString(inputStr: string, forwardOff?: boolean): void;
  abstract setStreamConfig(config: CustomDefinition, forwardOff?: boolean): void;
  abstract unsubscribeStream(mediaType: number): Promise<void> | void;
  abstract subscribeStream(mediaType: number): Promise<void> | void;
  abstract saveScreenShotToLocal(): Promise<any>;
  abstract setScreenResolution(options: { width: number; height: number; dpi: number; type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY }, forwardOff?: boolean): void;
  abstract saveScreenShotToRemote(): void;
  abstract resizeScreenshot(width: number, height: number): void;
  abstract showScreenShot(): void;
  abstract hideScreenShot(): void;
  abstract setScreenshotRotation(rotation: number): void;
  abstract takeScreenshot(rotation: number): void;
  abstract clearScreenShot(): void;
  abstract setPhoneRotation(type: RotateDirection): void;
  abstract setVideoEncoder(width: number, height: number): void;
  abstract setGPS(longitude: number, latitude: number): void;
  abstract executeAdbCommand(command: string, forwardOff?: boolean): void;
  abstract setKeyboardStyle(keyBoardType: KeyboardMode): void;
  abstract setAutoRecycleTime(second: number): void;
  abstract getAutoRecycleTime(): number | undefined;
  abstract sendCommand(command: string, forwardOff?: boolean): void;
  abstract increaseVolume(forwardOff?: boolean): void;
  abstract decreaseVolume(forwardOff?: boolean): void;
  abstract saveCloudClipboard(flag: boolean): void;
  abstract startMediaStream(mediaType: MediaType): Promise<any> | void;
  abstract stopMediaStream(mediaType: MediaType): Promise<any> | void;
  abstract injectVideoStream(type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO, options?: any, timeout?: number, forwardOff?: boolean): Promise<any> | any;
  abstract sendShakeInfo(time?: number): void;
  abstract getRotateType(): RotateDirection | number | undefined;
}
