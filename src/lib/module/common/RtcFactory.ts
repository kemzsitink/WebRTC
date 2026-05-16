import type { ArmcloudRtcOptions, ArmcloudCallbacks } from "../../types/index";
import { IRtcInstance } from "../../types/rtcInterface";
import WebRtc from "../p2p/WebRtc";
import TcgRtc from "../tcg/TcgRtc";
import CustomRtc from "../volc/CustomRtc";

export class RtcFactory {
  /**
   * Tạo instance RTC dựa trên streamType
   * @param streamType 1: WebRtc, 2: TcgRtc, 3: CustomRtc
   * @param viewId View container ID
   * @param options Cấu hình RTC
   * @param callbacks Callbacks của SDK
   */
  static create(
    streamType: number,
    viewId: string,
    options: ArmcloudRtcOptions,
    callbacks: ArmcloudCallbacks
  ): IRtcInstance {
    switch (streamType) {
      case 1:
        return new CustomRtc(viewId, options, callbacks);
      case 2:
        return new WebRtc(viewId, options, callbacks);
      case 3:
        return new TcgRtc(viewId, options, callbacks);
      default:
        throw new Error(`Unsupported streamType: ${streamType}`);
    }

  }
}
