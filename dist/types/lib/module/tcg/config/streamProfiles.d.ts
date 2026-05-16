/**
 * ARMCLOUD H5 SDK - 分辨率/帧率/码率 映射
 * 参考文档: https://docs.armcloud.net/cn/client/h5/h5-sdk.html#设置分辨率码率帧率
 */
export type ResolutionId = 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;
export type FramerateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type BitrateId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export interface ResolutionInfo {
    width: number;
    height: number;
}
export interface FramerateInfo {
    fps: number;
}
export interface BitrateInfo {
    kbps: number;
}
/** 分辨率ID -> 宽高 */
export declare const RESOLUTION_BY_ID: Record<ResolutionId, ResolutionInfo>;
/** 帧率ID -> fps */
export declare const FRAMERATE_BY_ID: Record<FramerateId, FramerateInfo>;
/** 码率ID -> kbps */
export declare const BITRATE_BY_ID: Record<BitrateId, BitrateInfo>;
/** 辅助函数 */
export declare function getResolution(definitionId: ResolutionId): ResolutionInfo;
export declare function getFps(framerateId: FramerateId): number;
export declare function getKbps(bitrateId: BitrateId): number;
