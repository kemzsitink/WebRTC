export declare const COMMON_CODE: Record<string, 0 | -1 | 1>;
export declare const ERROR_CODE: Record<string, 0 | 1>;
export declare const LOG_TYPE: {
    SUCCESS: number;
    FAIL: number;
};
export declare const enum MEDIA_CONTROL_TYPE {
    AUDIO_ONLY = 1,
    VIDEO_ONLY = 2,
    AUDIO_VIDEO = 3
}
export declare const MEDIA_VOICE_TYPE: {
    AUDIO: number;
    VIDEO: number;
    AUDIO_VIDEO: number;
};
export declare const PROGRESS_INFO: {
    WS_CONNECT: {
        code: number;
        msg: string;
    };
    WS_SUCCESS: {
        code: number;
        msg: string;
    };
    WS_CLOSE: {
        code: number;
        msg: string;
    };
    WS_ERROR: {
        code: number;
        msg: string;
    };
    WS_RETRY: {
        code: number;
        msg: string;
    };
    OWN_JOIN_ROOM: {
        code: number;
        msg: string;
    };
    RECEIVE_OFFER: {
        code: number;
        msg: string;
    };
    RECEIVE_OFFER_ERR: {
        code: number;
        msg: string;
    };
    SEND_ANSWER: {
        code: number;
        msg: string;
    };
    SEND_ANSWER_ERR: {
        code: number;
        msg: string;
    };
    RECEIVE_ICE: {
        code: number;
        msg: string;
    };
    RECEIVE_ICE_ERR: {
        code: number;
        msg: string;
    };
    SEND_ICE: {
        code: number;
        msg: string;
    };
    RTC_CONNECTING: {
        code: number;
        msg: string;
    };
    RTC_CONNECTED: {
        code: number;
        msg: string;
    };
    RTC_DISCONNECTED: {
        code: number;
        msg: string;
    };
    RTC_CLOSE: {
        code: number;
        msg: string;
    };
    RTC_FAILED: {
        code: number;
        msg: string;
    };
    RTC_TRACK_VIDEO: {
        code: number;
        msg: string;
    };
    RTC_TRACK_VIDEO_LOAD: {
        code: number;
        msg: string;
    };
    RTC_CHANNEL_OPEN: {
        code: number;
        msg: string;
    };
    RTC_CHANNEL_ERR: {
        code: number;
        msg: string;
    };
    VIDEO_UI_NUMBER: {
        code: number;
        msg: string;
    };
    VIDEO_FIRST_FRAME: {
        code: number;
        msg: string;
    };
};
