import type { ArmcloudRtcOptions, ArmcloudCallbacks } from "../../types/index";
import { IRtcInstance } from "../../types/rtcInterface";
import WebRtc from "../p2p/WebRtc";
import TcgRtc from "../tcg/TcgRtc";
import CustomRtc from "../volc/CustomRtc";
import { StreamType } from "../../constant/index";

export class RtcFactory {
  /**
   * Tạo instance RTC dựa trên streamType
   * @param streamType 1: CustomRtc (Volcengine), 2: WebRtc (P2P), 3: TcgRtc (Tencent)
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
      case StreamType.CUSTOM:
        return new CustomRtc(viewId, options, callbacks);
      case StreamType.WEBRTC:
        return new WebRtc(viewId, options, callbacks);
      case StreamType.TCGRTC:
        return new TcgRtc(viewId, options, callbacks);
      default:
        throw new Error(`Unsupported streamType: ${streamType}`);
    }

  }
}
