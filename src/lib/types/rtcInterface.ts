import type {
  RotateDirection,
  InjectStreamStatusType,
  KeyboardMode,
  CustomDefinition,
  EquipmentInfoType,
} from "./index";
import { MediaType, MessageKey } from "./webrtcType";


export interface IRtcInstance {
  start(isGroupControl?: boolean, pads?: string[]): void;
  stop(): Promise<void> | void;
  reshapeWindow?(): void;
  triggerKeyboardShortcut?(
    metaState: number | string,
    actionKey: number | string,
    forwardOff?: boolean
  ): void;
  setMonitorOperation(isMonitor: boolean, forwardOff?: boolean): void;
  getInjectStreamStatus(type: InjectStreamStatusType, timeout?: number): Promise<any> | any;
  getRequestId(): string;
  triggerClickEvent(
    options: { x: number; y: number; width: number; height: number },
    forwardOff?: boolean
  ): void;
  triggerPointerEvent(
    action: 0 | 1 | 2,
    options: { x: number; y: number; width: number; height: number },
    forwardOff?: boolean
  ): void;
  setMicrophone(val: boolean): void;
  setCamera(val: boolean): void;
  startPlay(): Promise<void> | void;
  setViewSize(width: number, height: number, rotateType?: 0 | 1): void;
  joinGroupRoom(pads?: string[]): void;
  kickItOutRoom(pads?: string[]): void;
  toggleGroupControlSync(flag?: boolean): void;
  muted(): void;
  unmuted(): void;
  appUnInstall(pkgNames: string[]): void;
  getEquipmentInfo(type: EquipmentInfoType | "app" | "attr"): void;
  setVideoDeviceId(val: string): Promise<void> | void;
  setAudioDeviceId(val: string): Promise<void> | void;
  sendInputClipper(inputStr: string, forwardOff?: boolean): void;
  sendGroupInputClipper(pads: any, strs: any): void;
  sendGroupInputString(pads: any, strs: any): void;
  sendInputString(inputStr: string, forwardOff?: boolean): void;
  setStreamConfig(config: CustomDefinition, forwardOff?: boolean): void;
  unsubscribeStream(mediaType: number): Promise<void> | void;
  subscribeStream(mediaType: number): Promise<void> | void;
  saveScreenShotToLocal(): Promise<any>;
  setScreenResolution(
    options: {
      width: number;
      height: number;
      dpi: number;
      type: MessageKey.RESET_DENSITY | MessageKey.UPDATE_DENSITY;
    },
    forwardOff?: boolean
  ): void;
  saveScreenShotToRemote(): void;
  resizeScreenshot(width: number, height: number): void;
  showScreenShot(): void;
  hideScreenShot(): void;
  setScreenshotRotation(rotation: number): void;
  takeScreenshot(rotation: number): void;
  clearScreenShot(): void;
  setPhoneRotation(type: RotateDirection): void;
  setVideoEncoder(width: number, height: number): void;
  setGPS(longitude: number, latitude: number): void;
  executeAdbCommand(command: string, forwardOff?: boolean): void;
  setKeyboardStyle(keyBoardType: KeyboardMode): void;
  setAutoRecycleTime(second: number): void;
  getAutoRecycleTime(): number | undefined;
  sendCommand(command: string, forwardOff?: boolean): void;
  increaseVolume(forwardOff?: boolean): void;
  decreaseVolume(forwardOff?: boolean): void;
  saveCloudClipboard(flag: boolean): void;
  startMediaStream(mediaType: MediaType): Promise<any> | void;
  stopMediaStream(mediaType: MediaType): Promise<any> | void;

  injectVideoStream(
    type: MessageKey.START_INJECTION_VIDEO | MessageKey.STOP_INJECTION_VIDEO,
    options?: any,
    timeout?: number,
    forwardOff?: boolean
  ): Promise<any> | any;
  sendGroupMessage(message: string): void;
  sendShakeInfo(time?: number): void;
  getRotateType(): RotateDirection | number | undefined;
}
