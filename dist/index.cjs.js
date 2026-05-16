'use strict';

require('webrtc-adapter');
var axios = require('axios');
var CryptoJS = require('crypto-js');
var copy = require('clipboard-copy');
var VERTC = require('@volcengine/rtc');

/**
 * AES Decryption Utility
 * @param encryptData Data to decrypt
 * @param key Secret key (usually padCode)
 * @returns Decrypted string or null
 */
function decryptAES(encryptData, key) {
    try {
        const ciphertext = CryptoJS.enc.Base64.parse(encryptData);
        const stringEncryptData = CryptoJS.format.Hex.parse(ciphertext.toString());
        let keyFormat = key.padEnd(16, "0");
        if (keyFormat.length > 16) {
            keyFormat = keyFormat.slice(0, 16);
        }
        const keyValue = CryptoJS.enc.Utf8.parse(keyFormat);
        const decrypt = CryptoJS.AES.decrypt(stringEncryptData, keyValue, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7,
        });
        const source = CryptoJS.enc.Utf8.stringify(decrypt);
        return source;
    }
    catch (error) {
        console.error("AES Decryption error:", error);
        return null;
    }
}
/**
 * Generate UUID v4
 */
function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

class Logger {
    static isLogEnabled = true;
    static setEnable(enable) {
        this.isLogEnabled = enable;
    }
    static info(message, ...optionalParams) {
        if (this.isLogEnabled) {
            console.log(`[ArmcloudRTC Info]:`, message, ...optionalParams);
        }
    }
    static warn(message, ...optionalParams) {
        if (this.isLogEnabled) {
            console.warn(`[ArmcloudRTC Warn]:`, message, ...optionalParams);
        }
    }
    static error(message, ...optionalParams) {
        if (this.isLogEnabled) {
            console.error(`[ArmcloudRTC Error]:`, message, ...optionalParams);
        }
    }
}

class ShakeSimulator {
    isRunning;
    intervalId;
    constructor() {
        this.isRunning = false;
    }
    startShakeSimulation(duration = 1800, callback) {
        this.isRunning = true;
        const startTime = Date.now();
        this.intervalId = setInterval(() => {
            if (!this.isRunning)
                return;
            // 生成随机加速度值
            const x = this.randomAcceleration();
            const y = this.randomAcceleration();
            const z = this.randomAcceleration();
            callback({
                x,
                y,
                z
            });
            // 检查时间是否到达指定持续时间
            if (Date.now() - startTime > duration) {
                this.stopShakeSimulation();
            }
        }, 10);
    }
    randomAcceleration() {
        // 随机生成一个模拟的加速度值
        return Math.random() * 15 - 5; // 产生 -10 到 15 之间的随机值
    }
    stopShakeSimulation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
            this.isRunning = false;
        }
    }
}

exports.KeyboardMode = void 0;
(function (KeyboardMode) {
    KeyboardMode["LOCAL"] = "local";
    KeyboardMode["PAD"] = "pad";
})(exports.KeyboardMode || (exports.KeyboardMode = {}));
/** 旋转方向 */
exports.RotateDirection = void 0;
(function (RotateDirection) {
    RotateDirection[RotateDirection["PORTRAIT"] = 0] = "PORTRAIT";
    RotateDirection[RotateDirection["LANDSCAPE"] = 1] = "LANDSCAPE";
})(exports.RotateDirection || (exports.RotateDirection = {}));

const COMMON_CODE = {
    SUCCESS: 0,
    FAIL: -1,
    CLOSE: 1,
};
const ERROR_CODE = {
    DATA_CHANNEL: 0, // 通道中断
    DELAY: 1, // 获取统计信息时出错 延迟丢包率
};
const LOG_TYPE = {
    SUCCESS: 1,
    FAIL: 0,
};
const MEDIA_VOICE_TYPE = {
    // 音频
    AUDIO: 1,
    // 视频
    VIDEO: 2,
    // 音视频
    AUDIO_VIDEO: 3,
};
const PROGRESS_INFO = {
    WS_CONNECT: {
        code: 100,
        msg: "WS开始连接",
    },
    WS_SUCCESS: {
        code: 101,
        msg: "WS连接成功",
    },
    WS_CLOSE: {
        code: 102,
        msg: "WS连接关闭",
    },
    WS_ERROR: {
        code: 103,
        msg: "WS连接出错",
    },
    WS_RETRY: {
        code: 104,
        msg: "WS重连中",
    },
    OWN_JOIN_ROOM: {
        code: 200,
        msg: "收到加入房间信息",
    },
    RECEIVE_OFFER: {
        code: 201,
        msg: "设置offer信息成功",
    },
    RECEIVE_OFFER_ERR: {
        code: 202,
        msg: "设置offer信息失败",
    },
    SEND_ANSWER: {
        code: 203,
        msg: "发送answer信息",
    },
    SEND_ANSWER_ERR: {
        code: 204,
        msg: "发送answer信息失败",
    },
    RECEIVE_ICE: {
        code: 205,
        msg: "添加ICE信息成功",
    },
    RECEIVE_ICE_ERR: {
        code: 206,
        msg: "添加ICE信息失败",
    },
    SEND_ICE: {
        code: 207,
        msg: "发送ICE信息",
    },
    RTC_CONNECTING: {
        code: 300,
        msg: "RTC正在连接",
    },
    RTC_CONNECTED: {
        code: 301,
        msg: "RTC连接成功",
    },
    RTC_DISCONNECTED: {
        code: 302,
        msg: "RTC断开连接",
    },
    RTC_CLOSE: {
        code: 303,
        msg: "RTC连接关闭",
    },
    RTC_FAILED: {
        code: 304,
        msg: "RTC连接失败",
    },
    RTC_TRACK_VIDEO: {
        code: 305,
        msg: "RTC接收VIDEO流",
    },
    RTC_TRACK_VIDEO_LOAD: {
        code: 306,
        msg: "RTC接收VIDEO流后在VIDEO中加载成功",
    },
    RTC_CHANNEL_OPEN: {
        code: 307,
        msg: "RTC消息通道连接成功",
    },
    RTC_CHANNEL_ERR: {
        code: 308,
        msg: "RTC消息通道连接失败",
    },
    VIDEO_UI_NUMBER: {
        code: 309,
        msg: "VIDEO加载成功当未收到云机的UI信息",
    },
    VIDEO_FIRST_FRAME: {
        code: 310,
        msg: "VIDEO第一帧渲染成功",
    },
};
exports.StreamType = void 0;
(function (StreamType) {
    StreamType[StreamType["CUSTOM"] = 1] = "CUSTOM";
    StreamType[StreamType["WEBRTC"] = 2] = "WEBRTC";
    StreamType[StreamType["TCGRTC"] = 3] = "TCGRTC";
})(exports.StreamType || (exports.StreamType = {}));

const blobToText = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result); // 读取结果为文本
        };
        reader.onerror = () => {
            reject(new Error("Failed to read blob as text"));
        };
        reader.readAsText(blob); // 读取 Blob 为文本
    });
};
const arrayBufferToText = (buffer) => {
    if (typeof TextDecoder !== "undefined") {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(buffer);
    }
    else {
        return String.fromCharCode.apply(null, new Uint8Array(buffer));
    }
};
const checkType = (input) => {
    if (input instanceof ArrayBuffer) {
        return "ArrayBuffer";
    }
    else if (input instanceof Blob) {
        return "Blob";
    }
    else {
        return "String";
    }
};
/** 判断是否是手机 */
const isMobile = () => {
    const flag = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile\//i.test(
    // eslint-disable-next-line comma-dangle
    navigator.userAgent);
    return flag;
};
const isTouchDevice = () => !!("ontouchstart" in document.documentElement);
const waitStyleApplied = async (el) => {
    void el.offsetWidth;
    await nextFrame();
};
const nextFrame = () => {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
};
const copyText = (text) => {
    return copy(text);
};
/**
 * 根据 RTT 和丢包率计算网络质量等级
 * @param rtt 往返时延 (ms)
 * @param lossRate 丢包率 (0-1)
 * @returns 网络质量等级 (1-6)
 */
const calculateNetworkQuality = (rtt, lossRate) => {
    if (rtt > 800 || lossRate > 0.2)
        return 5;
    if (rtt > 400 || lossRate > 0.1)
        return 4;
    if (rtt > 200 || lossRate > 0.05)
        return 3;
    if (rtt > 100 || lossRate > 0.02)
        return 2;
    return 1;
};

class WebGroupRtc {
    params = null; // 传入的参数
    pingTimer = null;
    callbacks = null; // 回调函数
    socket = null; // WebSocket 对象
    reconnectAttempts = 0; // 当前重连尝试次数
    maxReconnectAttempts = 3; // 最大重连次数
    reconnectDelay = 1500; // 每次重连的间隔时间（毫秒）
    sourceArr = [];
    constructor(params, pads, callbacks) {
        this.params = params;
        this.callbacks = callbacks;
        pads.length && this.joinRoom(pads); // 如果有房间需要加入，调用加入房间方法
    }
    // 关闭 WebSocket 连接
    close() {
        clearInterval(this.pingTimer);
        this.sourceArr?.forEach((v) => {
            v.cancel();
        });
        this.sourceArr = [];
        this.socket?.close();
        this.socket = null;
    }
    kickItOutRoom(pads) {
        this.sendMessage(JSON.stringify({
            event: "broadcastMsg",
            data: JSON.stringify({
                touchType: "kickOutUser",
                content: JSON.stringify(pads),
            }),
        }));
    }
    // 发送消息给 WebSocket 服务端
    sendMessage(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        }
    }
    startHeartbeat() {
        this.pingTimer = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    event: "ping",
                }));
                return;
            }
            clearInterval(this.pingTimer);
        }, 5000);
    }
    // 初始化 WebSocket 连接
    initSocket(signalServer, roomToken) {
        const { isWsProxy } = this.params || {};
        let url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/sdk-ws/${roomToken}`;
        if (!isWsProxy) {
            url = `${signalServer}/${roomToken}`;
        }
        this.socket = new WebSocket(url);
        this.socket.onopen = () => {
            this.reconnectAttempts = 0; // 重置重连次数
            this.startHeartbeat();
        };
        this.socket.onerror = (error) => {
            this.callbacks?.onGroupControlError?.({
                code: error?.code || "WS_ERROR",
                msg: error.message || "WebSocket 连接出错",
            });
            this.handleReconnect(signalServer, roomToken); // 出错时尝试重连
        };
    }
    // 处理 WebSocket 重连
    handleReconnect(signalServer, roomToken) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                console.log(`正在尝试第 ${this.reconnectAttempts} 次重连...`);
                this.initSocket(signalServer, roomToken);
            }, this.reconnectDelay);
        }
        else {
            console.log("达到最大重连次数，停止重连。");
            this.callbacks?.onGroupControlError?.({
                code: "MAX_RECONNECT_ATTEMPTS",
                msg: "达到最大重连次数，无法连接到服务器。",
            });
        }
    }
    // 加入房间
    joinRoom(pads) {
        const source = axios.CancelToken.source(); // 创建一个取消令牌
        this.sourceArr.push(source);
        const { userId, videoStream, uuid, token, manageToken } = this.params || {};
        const url = manageToken
            ? "/manage/rtc/room/share/applyToken"
            : `/sdk/rtc/open/room/sdk/share/applyToken`;
        const tok = manageToken || token;
        return axios
            .post(url, {
            userId: userId || "",
            uuid: uuid || "",
            terminal: "h5",
            pushPublicStream: false,
            pads: pads.map((padCode) => ({
                padCode,
                videoStream: {
                    resolution: 7, // 分辨率
                    frameRate: 5, // 帧率
                    bitrate: 13, // 码率
                },
                userId,
            })),
        }, {
            headers: manageToken ? { Authorization: tok } : { token: tok },
            cancelToken: source.token,
        })
            .then((res) => {
            const { signalServer, roomToken } = res?.data?.data;
            if (!this.socket) {
                this.initSocket(signalServer, roomToken); // 初始化 WebSocket 连接
            }
        })
            .catch((err) => {
            if (axios.isCancel(err)) {
                return;
            }
            const error = new Error("加入房间出错");
            error.code = "JOIN_ROOM_ERR";
            this.callbacks?.onGroupControlError?.({
                code: error?.code,
                msg: error?.message,
            });
        });
    }
}

class VideoElement {
    masterIdPrefix;
    remoteUserId;
    videoDomId; // 视频 DOM 元素的 ID
    remoteVideoId; // 远程视频元素的 ID
    containerId; // 容器元素的 ID
    remoteVideo; // 远程视频元素
    eventListeners = []; // 存储事件类型和对应的监听器
    constructor(masterIdPrefix, remoteUserId) {
        this.masterIdPrefix = masterIdPrefix;
        this.remoteUserId = remoteUserId;
        // 初始化 ID
        this.videoDomId = `${this.masterIdPrefix}_${this.remoteUserId}_armcloudVideo`;
        this.remoteVideoId = `${this.masterIdPrefix}_${this.remoteUserId}_remoteVideo`;
        this.containerId = `${this.masterIdPrefix}_${this.remoteUserId}_remoteVideoContainer`;
        // 创建远程视频元素
        this.remoteVideo = this.createRemoteVideoElement();
    }
    getVideoDomId() {
        // 获取视频 DOM 元素的 ID
        return this.videoDomId;
    }
    getRemoteVideoId() {
        // 获取远程视频元素的 ID
        return this.remoteVideoId;
    }
    getContainerId() {
        // 获取容器元素的 ID
        return this.containerId;
    }
    getRemoteVideo() {
        // 获取远程视频元素
        return this.remoteVideo;
    }
    createElements() {
        // 创建包含视频的 DOM 元素结构
        const newDiv = this.createDivElement(this.videoDomId); // 创建主 div
        const newDiv2 = this.createDiv("100%", "100%", "relative", "hidden"); // 创建相对定位的 div
        const newDiv3 = this.createDiv("100%", "100%", "absolute", "hidden", this.containerId); // 创建绝对定位的 div
        // 将远程视频添加到新创建的 div 中
        newDiv3.appendChild(this.remoteVideo);
        newDiv2.appendChild(newDiv3);
        newDiv.appendChild(newDiv2);
        return newDiv; // 返回最外层的 div
    }
    createRemoteVideoElement() {
        // 创建远程视频元素
        const video = document.createElement("video");
        video.setAttribute("id", this.remoteVideoId);
        video.setAttribute("playsinline", ""); // 设置 inline 播放属性
        video.setAttribute("webkit-playsinline", ""); // WebKit 浏览器支持
        video.setAttribute("x5-playsinline", ""); // X5 浏览器支持
        video.setAttribute("x5-video-player-type", "h5"); // X5 视频播放器类型
        // 设置视频属性
        video.controls = false; // 禁用控制条
        video.muted = true; // 静音
        video.style.width = "100%"; // 设置宽度为 100%
        video.style.height = "100%"; // 设置高度为 100%
        video.style.objectFit = "contain"; // 填充视频
        video.style.transform = "scale(1)"; // 缩放比例
        return video; // 返回创建的远程视频元素
    }
    // 允许绑定事件到 videoDomId 对应的元素，并阻止事件冒泡
    bindDomEvent(type, listener) {
        const domElement = document.getElementById(this.videoDomId);
        if (domElement) {
            const wrappedListener = (event) => {
                type !== "wheel" && event.preventDefault(); // 阻止默认行为
                listener(event); // 执行传入的监听器函数
            };
            domElement.addEventListener(type, wrappedListener);
            // 保存事件类型、监听器和元素
            this.eventListeners.push({
                type,
                listener: wrappedListener,
                element: domElement,
            });
        }
    }
    // 卸载所有绑定到视频和 videoDomId 元素上的事件
    removeAllEvents() {
        // 遍历所有存储的事件监听器，并卸载它们
        this.eventListeners.forEach(({ type, listener, element }) => {
            element.removeEventListener(type, listener);
        });
        // 清空事件列表
        this.eventListeners = [];
    }
    createDivElement(id) {
        // 创建一个带 ID 的 div 元素
        const div = document.createElement("div");
        div.setAttribute("id", id);
        return div; // 返回创建的 div
    }
    createDiv(width, height, position, overflow, id) {
        // 创建一个指定样式的 div 元素
        const div = document.createElement("div");
        div.style.width = width; // 设置宽度
        div.style.height = height; // 设置高度
        div.style.position = position; // 设置定位
        div.style.overflow = overflow; // 设置溢出样式
        // 如果提供了 ID，则设置 ID
        if (id) {
            div.setAttribute("id", id);
        }
        return div; // 返回创建的 div
    }
    // 销毁方法，移除事件，清理 DOM，并释放类实例
    destroy() {
        // 1. 移除所有事件监听器
        this.removeAllEvents();
        // 2. 从 DOM 中删除 videoDomId 对应的元素
        const videoDomElement = document.getElementById(this.videoDomId);
        if (videoDomElement && videoDomElement.parentNode) {
            videoDomElement.parentNode.removeChild(videoDomElement);
        }
        // 3. 释放类的属性
        this.remoteVideo = null;
        this.eventListeners = [];
    }
}

exports.MediaType = void 0;
(function (MediaType) {
    MediaType[MediaType["AUDIO"] = 1] = "AUDIO";
    MediaType[MediaType["VIDEO"] = 2] = "VIDEO";
    MediaType[MediaType["AUDIO_AND_VIDEO"] = 3] = "AUDIO_AND_VIDEO";
})(exports.MediaType || (exports.MediaType = {}));
// 触摸类型枚举
exports.TouchType = void 0;
(function (TouchType) {
    TouchType["GESTURE"] = "gesture";
    TouchType["GESTURE_SWIPE"] = "gestureSwipe";
    TouchType["EVENT_SDK"] = "eventSdk";
    TouchType["KEYSTROKE"] = "keystroke";
    TouchType["CLIPBOARD"] = "clipboard";
    TouchType["INPUT_BOX"] = "inputBox";
    TouchType["INPUT_STATE"] = "inputState";
    TouchType["RTC_STATS"] = "rtcStats";
    TouchType["KICK_OUT_USER"] = "kickOutUser";
    TouchType["EQUIPMENT_INFO"] = "equipmentInfo";
    TouchType["APP_UNINSTALL"] = "appUnInstall";
})(exports.TouchType || (exports.TouchType = {}));

const generateTouchCoord = () => {
    const params = {
        pressure: 0.5 + 0.3 * Math.random(),
        size: 0.05 + 0.03 * Math.random(),
        touchMajor: 80 + Math.floor(130 * Math.random()),
        touchMinor: 0,
        toolMajor: 0,
        toolMinor: 0,
    };
    params.touchMinor = params.touchMajor - (15 + Math.floor(30 * Math.random()));
    params.toolMajor = params.touchMajor;
    params.toolMinor = params.touchMinor;
    return params;
};

const KEY_CODE_MAP = {
    ArrowUp: 19,
    ArrowDown: 20,
    ArrowLeft: 21,
    ArrowRight: 22,
    Enter: 66,
    Backspace: 67,
};

class InputService {
    rtc;
    inputElement = null;
    isComposing = false;
    constructor(rtc) {
        this.rtc = rtc;
    }
    /**
     * Khởi tạo hidden input cho IME (mobile/local keyboard)
     * @param containerId DOM ID của container
     * @param options Cấu hình (disableLocalIME, etc.)
     */
    initIme(containerId, options = {}) {
        if (options.disableLocalIME)
            return;
        if (!isMobile())
            return;
        const container = document.getElementById(containerId);
        if (!container)
            return;
        // Tránh khởi tạo nhiều lần
        if (this.inputElement)
            return;
        const el = document.createElement("textarea");
        el.autocomplete = "off";
        el.className = "play-text-input";
        el.style.cssText = `
        position:absolute;
        top:0;
        left:0;
        pointer-events:none;
        opacity:0.01;
        width:100%;
        max-width:95%;
        height: 40px;
        resize: none;
        overflow: hidden;
    `;
        el.addEventListener("compositionstart", () => {
            this.isComposing = true;
        });
        el.addEventListener("compositionend", (e) => {
            this.isComposing = false;
            const target = e.target;
            this.rtc.sendInputString(target.value);
            el.value = "";
        });
        el.addEventListener("input", (e) => {
            if (this.isComposing)
                return;
            const target = e.target;
            this.rtc.sendInputString(target.value);
            el.value = "";
        });
        el.addEventListener("keydown", (e) => {
            const code = KEY_CODE_MAP[e.key];
            if (code !== undefined) {
                if (e.key === "Enter")
                    el.blur();
                this.rtc.triggerKeyboardShortcut?.(0, code);
            }
        });
        container.appendChild(el);
        container.style.position = "relative";
        this.inputElement = el;
    }
    getInputElement() {
        return this.inputElement;
    }
    focus() {
        this.inputElement?.focus();
    }
    blur() {
        this.inputElement?.blur();
    }
    destroy() {
        this.inputElement?.remove();
        this.inputElement = null;
    }
}

class BaseRtc {
    initDomId;
    options;
    callbacks;
    videoDomId = "";
    remoteUserId = "";
    isCameraInject = false;
    isMicrophoneInject = false;
    hasPushDown = false;
    enableMicrophone = true;
    enableCamera = true;
    videoDeviceId = "";
    audioDeviceId = "";
    isGroupControl = false;
    inputService;
    groupRtc = null;
    promiseMap = {
        streamStatus: {
            resolve: () => { },
            reject: () => { },
        },
        injectStatus: {
            resolve: null,
            reject: null,
        },
    };
    touchConfig = {
        action: 0,
        widthPixels: document.body.clientWidth,
        heightPixels: document.body.clientHeight,
        pointCount: 1,
        touchType: exports.TouchType.GESTURE,
        properties: [],
        coords: [],
    };
    autoRecoveryTimer = null;
    enterkeyhintObj = {
        2: "go",
        3: "search",
        4: "send",
        5: "next",
        6: "done",
        7: "previous",
    };
    remoteInputState = {
        isOpen: false,
        imeOptions: "",
    };
    constructor(initDomId, options, callbacks) {
        this.initDomId = initDomId;
        this.options = options;
        this.callbacks = callbacks;
        this.setupCallbacks();
        this.inputService = new InputService(this); // Cast to any to avoid incomplete abstract class issues during init
    }
    setupCallbacks() {
        if (!this.callbacks) {
            this.callbacks = {};
        }
    }
    getRequestId() {
        return this.options.requestId || "";
    }
    createVideoContainer(padCode, masterIdPrefix) {
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
    getMsgTemplate(touchType, content) {
        return JSON.stringify({
            touchType,
            content: typeof content === "string" ? content : JSON.stringify(content),
        });
    }
    setMicrophone(val) {
        this.enableMicrophone = val;
    }
    setCamera(val) {
        this.enableCamera = val;
    }
    setAutoRecycleTime(second) {
        this.options.autoRecoveryTime = second;
    }
    getAutoRecycleTime() {
        return this.options.autoRecoveryTime;
    }
    triggerRecoveryTimeCallback() {
        if (this.options.disable ||
            !this.options.autoRecoveryTime ||
            this.isCameraInject ||
            this.isMicrophoneInject) {
            return;
        }
        if (this.autoRecoveryTimer) {
            clearTimeout(this.autoRecoveryTimer);
        }
        this.autoRecoveryTimer = setTimeout(() => {
            this.stop();
            this.callbacks.onAutoRecoveryTime?.();
        }, this.options.autoRecoveryTime * 1000);
    }
}

class WebRtc extends BaseRtc {
    remoteVideoContainerId = "";
    remoteVideoId = "";
    screenShotInstance = null;
    pingTimer = null;
    // 刷新ui消息次数
    refreshUiMsgNumber = 0;
    isVideoFirstFrame = false;
    // 群控同步
    groupControlSync = true;
    remoteResolution = {
        width: 0,
        height: 0,
    };
    roomMessage = {
        inputStateIsOpen: false,
        isVertical: true,
    };
    // websocket
    socket;
    retryCount;
    retryCountBackup;
    retryTime;
    remotePc = null;
    dataChannel;
    poorNetworkCount = 0;
    goodNetworkCount = 0;
    lastPacketsLost = undefined;
    lastPacketsReceived = undefined;
    // 运行信息定时器
    runInfoTimer = null;
    // 触摸坐标信息
    touchInfo = generateTouchCoord();
    socketParams;
    // 回调函数集合
    videoStreams = [];
    audioStreams = [];
    videoSenders = [];
    audioSenders = [];
    senderVideoTracks = [];
    senderAudioTracks = [];
    // 是否群控
    groupPads = [];
    masterIdPrefix = "";
    stopOperation = false;
    videoElement = null;
    iceFailureCount = 0;
    maxIceFailures = 3;
    constructor(viewId, params, callbacks) {
        super(viewId, params, callbacks);
        const whileCallList = ["onAutoRecoveryTime"];
        if (callbacks) {
            Object.keys(callbacks).forEach((key) => {
                const originalCallback = callbacks[key];
                this.callbacks[key] = (...args) => {
                    if (!this.stopOperation || whileCallList.includes(key)) {
                        // @ts-ignore
                        originalCallback?.(...args);
                    }
                };
            });
        }
        this.enableMicrophone = params.enableMicrophone;
        this.enableCamera = params.enableCamera;
        this.remoteUserId = params.padCode;
        this.retryCount = params.retryCount;
        this.retryCountBackup = params.retryCount;
        this.retryTime = params.retryTime;
        this.masterIdPrefix = params.masterIdPrefix;
        this.videoDeviceId = params.videoDeviceId || "";
        this.audioDeviceId = params.audioDeviceId || "";
        // 获取外部容器 div 元素
        const h5Dom = document.getElementById(this.initDomId);
        this.videoElement = new VideoElement(this.masterIdPrefix, this.remoteUserId);
        // 获取 video 元素
        this.videoDomId = this.videoElement?.getVideoDomId();
        this.remoteVideoContainerId = this.videoElement?.getContainerId();
        this.remoteVideoId = this.videoElement?.getRemoteVideoId();
        const videoContainer = this.videoElement?.createElements();
        // 将 div 元素添加到外部容器中
        h5Dom?.appendChild(videoContainer);
        if (!this.options.disable) {
            this.inputService.initIme(this.initDomId, { disableLocalIME: this.options.disableLocalIME });
        }
        // 解密 - ws 地址
        const signalServer = decryptAES(this.options.signalServer, this.options.padCode);
        const { isWsProxy } = this.options;
        let wsUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/sdk-ws/${this.options.roomToken}`;
        if (!isWsProxy) {
            wsUrl = `${signalServer}/${this.options.roomToken}`;
        }
        // stuns 地址
        const stuns = decryptAES(this.options.stuns, this.options.padCode);
        const stunsArr = JSON.parse(stuns);
        // turns 地址
        const turns = decryptAES(this.options.turns, this.options.padCode);
        const turnsArr = JSON.parse(turns);
        // 信令服务器
        const rtcConfig = {
            iceServers: [
                {
                    urls: [stunsArr?.[0]?.uri],
                },
                {
                    urls: [turnsArr[0].uri],
                    username: turnsArr[0].username,
                    credential: turnsArr[0].pwd,
                },
            ],
            iceCandidatePoolSize: 10,
        };
        const audioElement = document.createElement("audio");
        audioElement.id = `${this.masterIdPrefix}_${this.remoteUserId}_remoteAudio`;
        audioElement.style.display = "none";
        audioElement.setAttribute("playsinline", "");
        audioElement.setAttribute("webkit-playsinline", "");
        audioElement.setAttribute("x5-playsinline", "");
        audioElement.setAttribute("x5-video-player-type", "h5");
        h5Dom?.appendChild(audioElement);
        this.socketParams = {
            wsUrl,
            rtcConfig,
            remoteVideo: this.videoElement?.getRemoteVideo(),
            remoteAudio: audioElement,
        };
        // 初始化当前视频
        this.remotePc = new RTCPeerConnection(this.socketParams.rtcConfig);
    }
    /**
     * AES 解密方法
     * @param {*} encryptData 加密数据
     * @param {*} key 秘钥
     * @returns 解密后数据
     */
    /** 获取应用信息 */
    getEquipmentInfo(type) {
        if (this.stopOperation)
            return;
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EQUIPMENT_INFO, {
            type,
        }));
    }
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag = true) {
        if (!this.isGroupControl)
            return;
        this.groupControlSync = flag;
    }
    /** 应用卸载 */
    appUnInstall(pkgNames) {
        if (this.stopOperation)
            return;
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.APP_UNINSTALL, pkgNames));
    }
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState, keyCode, forwardOff = true) {
        const content = JSON.stringify({
            touchType: "shortcutKey" /* MessageKey.SHORTCUT_KEY */,
            metaState: metaState + "",
            keyCode: keyCode + "",
        });
        this.sendUserMessage(content, forwardOff);
    }
    /** 旋转截图 */
    setScreenshotRotation(rotation = 0) {
        // this.screenShotInstance?.setScreenshotRotation(rotation);
    }
    /** 生成封面图 */
    takeScreenshot(rotation = 0) {
        this.screenShotInstance?.takeScreenshot(rotation);
    }
    /** 重新设置大小 */
    resizeScreenshot(width, height) {
        this.screenShotInstance?.resizeScreenshot(width, height);
    }
    /** 显示封面图 */
    showScreenShot() {
        this.screenShotInstance?.showScreenShot();
    }
    /** 显示封面图 */
    hideScreenShot() {
        this.screenShotInstance?.hideScreenShot();
    }
    /** 清空封面图 */
    clearScreenShot() {
        this.screenShotInstance?.clearScreenShot();
    }
    setViewSize(width, height, rotateType = 0) {
        const videoDom = document.getElementById(this.videoDomId);
        const remoteVideoContainerDom = document.getElementById(this.remoteVideoContainerId);
        const remoteVideo = document.getElementById(this.remoteVideoId);
        if (videoDom && remoteVideo) {
            const setDimensions = (element, width, height) => {
                element.style.width = width + "px";
                element.style.height = height + "px";
            };
            // 设置宽高
            setDimensions(videoDom, width, height);
            // 设置宽高
            setDimensions(remoteVideoContainerDom, width, height);
            if (rotateType == 1) {
                setDimensions(remoteVideo, height, width);
                return;
            }
            setDimensions(remoteVideo, width, height);
        }
    }
    /**
     * 获取媒体流的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     * @param msgData 消息数据（仅视频需要）
     * @returns MediaStream
     */
    async getMediaStream(type, msgData) {
        const constraints = {
            video: false,
            audio: false,
        };
        if (type === "video" /* MediaStreamType.VIDEO */) {
            constraints.video = this.videoDeviceId
                ? {
                    deviceId: {
                        exact: this.videoDeviceId ||
                            (msgData?.isFront ? "user" : "environment"),
                    },
                }
                : true;
        }
        else {
            constraints.audio = this.audioDeviceId
                ? { deviceId: { exact: this.audioDeviceId } }
                : true;
        }
        return await navigator.mediaDevices.getUserMedia(constraints);
    }
    /** 设置摄像头设备 */
    async setVideoDeviceId(val) {
        if (this.stopOperation)
            return;
        this.videoDeviceId = val;
        if (this.isCameraInject) {
            try {
                await this.smoothTrackReplace("video" /* MediaStreamType.VIDEO */);
            }
            catch (error) {
                throw error;
            }
        }
    }
    /** 设置麦克风设备 */
    async setAudioDeviceId(val) {
        if (this.stopOperation)
            return;
        this.audioDeviceId = val;
        if (this.isMicrophoneInject) {
            try {
                await this.smoothTrackReplace("audio" /* MediaStreamType.AUDIO */);
            }
            catch (error) {
                throw error;
            }
        }
    }
    /** 推送摄像头 */
    async captureVideo(msgData) {
        if (this.stopOperation)
            return;
        try {
            // 如果存在 就需要平滑过渡
            if (this.videoSenders.length) {
                await this.smoothTrackReplace("video" /* MediaStreamType.VIDEO */, msgData);
                return;
            }
            // 1) 获取流
            const videoStream = await this.getMediaStream("video" /* MediaStreamType.VIDEO */, msgData);
            this.videoStreams.push(videoStream);
            const vTrack = videoStream.getVideoTracks()[0];
            this.senderVideoTracks.push(vTrack);
            this.videoSenders.push(this.remotePc.addTrack(vTrack, videoStream));
            this.callbacks?.onVideoInit?.();
        }
        catch (error) {
            this.callbacks?.onVideoError?.({
                code: COMMON_CODE.FAIL,
                msg: error?.message || error?.name || String(error),
            });
            throw error;
        }
    }
    getRotateType() {
        return this.options.rotateType;
    }
    /** 推送麦克风 */
    async captureAudio() {
        if (this.stopOperation)
            return;
        try {
            // 如果存在 就需要平滑过渡
            if (this.audioSenders.length) {
                await this.smoothTrackReplace("audio" /* MediaStreamType.AUDIO */);
                return;
            }
            // 1) 获取流
            const audioStream = await this.getMediaStream("audio" /* MediaStreamType.AUDIO */);
            this.audioStreams.push(audioStream);
            const aTrack = audioStream.getAudioTracks()[0];
            this.senderAudioTracks.push(aTrack);
            this.audioSenders.push(this.remotePc.addTrack(aTrack, audioStream));
            this.callbacks?.onAudioInit?.();
        }
        catch (error) {
            this.callbacks?.onAudioError?.({
                code: COMMON_CODE.FAIL,
                msg: error?.message || error?.name || String(error),
            });
            throw error;
        }
    }
    /**
     * 停止轨道和流的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     */
    stopTracksAndStreams(type) {
        const tracks = type === "video" /* MediaStreamType.VIDEO */
            ? this.senderVideoTracks
            : this.senderAudioTracks;
        const streams = type === "video" /* MediaStreamType.VIDEO */ ? this.videoStreams : this.audioStreams;
        // 1. 停止轨道
        if (tracks.length) {
            try {
                tracks.forEach((track) => {
                    track.stop();
                });
            }
            catch (error) {
                Logger.info(`停止${type}轨道失败: ${error.message}`, "error");
            }
        }
        // 2. 停止流中的所有轨道
        if (streams.length) {
            streams.forEach((stream) => {
                stream.getTracks().forEach((track) => {
                    try {
                        track.stop();
                    }
                    catch (error) {
                        Logger.info(`停止流轨道失败: ${error.message}`, "error");
                    }
                });
            });
        }
        // 3. 清理引用
        if (type === "video" /* MediaStreamType.VIDEO */) {
            this.senderVideoTracks = [];
            this.videoStreams = [];
        }
        else {
            this.senderAudioTracks = [];
            this.audioStreams = [];
        }
    }
    /**
     * 平滑切换轨道的通用方法
     * @param type 媒体类型：'video' 或 'audio'
     * @param msgData 消息数据（仅视频需要）
     */
    async smoothTrackReplace(type, msgData) {
        const senders = type === "video" /* MediaStreamType.VIDEO */ ? this.videoSenders : this.audioSenders;
        const oldTracks = type === "video" /* MediaStreamType.VIDEO */
            ? this.senderVideoTracks
            : this.senderAudioTracks;
        const oldStreams = type === "video" /* MediaStreamType.VIDEO */ ? this.videoStreams : this.audioStreams;
        // 1. 获取新的媒体流和轨道
        const newStream = await this.getMediaStream(type, msgData);
        const newTrack = type === "video" /* MediaStreamType.VIDEO */
            ? newStream.getVideoTracks()[0]
            : newStream.getAudioTracks()[0];
        // 2. 过滤有效的发送者并替换轨道
        const validSenders = senders.filter((sender) => {
            if (sender.transport) {
                return true;
            }
            this.remotePc.removeTrack(sender);
            return false;
        });
        validSenders.forEach((sender) => sender.replaceTrack(newTrack));
        Logger.info(`${type}轨道已平滑切换`);
        // 3. 停止旧的轨道和流
        oldTracks.forEach((track) => track.stop());
        oldStreams.forEach((stream) => stream.getTracks().forEach((t) => t.stop()));
        // 4. 更新本地引用
        if (type === "video" /* MediaStreamType.VIDEO */) {
            this.videoSenders = validSenders;
            this.senderVideoTracks = [newTrack];
            this.videoStreams = [newStream];
        }
        else {
            this.audioSenders = validSenders;
            this.senderAudioTracks = [newTrack];
            this.audioStreams = [newStream];
        }
    }
    startHeartbeat() {
        this.pingTimer = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    event: "ping" /* WebSocketEventType.PING */,
                }));
                return;
            }
            clearInterval(this.pingTimer);
        }, 5000);
    }
    /** 麦克风注入 */
    async microphoneInject() {
        try {
            await this.stopMediaStream(exports.MediaType.AUDIO);
            await this.startMediaStream(exports.MediaType.AUDIO);
            this.callbacks?.onAudioInit?.();
        }
        catch (error) {
            this.callbacks?.onAudioError?.({
                code: COMMON_CODE.FAIL,
                msg: error?.message || error?.name || String(error),
            });
            throw error;
        }
    }
    /** 摄像头注入 */
    async cameraInject(msgData) {
        try {
            await this.stopMediaStream(exports.MediaType.VIDEO);
            await this.startMediaStream(exports.MediaType.VIDEO, msgData);
            this.callbacks?.onVideoInit?.();
        }
        catch (error) {
            this.callbacks?.onVideoError?.({
                code: COMMON_CODE.FAIL,
                msg: error?.message || error?.name || String(error),
            });
            throw error;
        }
    }
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    async startMediaStream(mediaType, msgData) {
        if (this.stopOperation)
            return;
        try {
            if (mediaType === exports.MediaType.VIDEO) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, true);
                await this.captureVideo(msgData);
                this.isCameraInject = true;
            }
            if (mediaType === exports.MediaType.AUDIO) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, true);
                await this.captureAudio();
                this.isMicrophoneInject = true;
            }
            if (mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, true);
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, true);
                await this.captureVideo(msgData);
                this.isCameraInject = true;
                await this.captureAudio();
                this.isMicrophoneInject = true;
            }
        }
        catch (error) {
            throw error;
        }
    }
    /** 通知手机需要注入 */
    async notifyInject(type, isOpen) {
        await this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type,
            isOpen,
        }), true);
    }
    // 修改屏幕分辨率和dpi
    setScreenResolution(options, forwardOff = true) {
        const contentObj = options.type === "updateDensity" /* MessageKey.UPDATE_DENSITY */
            ? {
                type: options.type,
                width: options.width,
                height: options.height,
                density: options.dpi,
            }
            : {
                type: options.type,
            };
        const message = this.getMsgTemplate(exports.TouchType.EVENT_SDK, contentObj);
        this.sendUserMessage(message, forwardOff);
    }
    setVideoEncoder(width, height) { }
    // 模拟点击事件
    triggerClickEvent(options, forwardOff = false) { }
    // 模拟触摸事件 0 按下 1 抬起 2 触摸中
    triggerPointerEvent(action, options, forwardOff = false) { }
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    async stopMediaStream(mediaType) {
        if (this.stopOperation)
            return;
        try {
            if (mediaType === exports.MediaType.VIDEO) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, false);
                await this.stopTracksAndStreams("video" /* MediaStreamType.VIDEO */);
                this.isCameraInject = false;
            }
            if (mediaType === exports.MediaType.AUDIO) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, false);
                await this.stopTracksAndStreams("audio" /* MediaStreamType.AUDIO */);
                this.isMicrophoneInject = false;
            }
            if (mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, false);
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, false);
                await this.stopTracksAndStreams("video" /* MediaStreamType.VIDEO */);
                this.isCameraInject = false;
                await this.stopTracksAndStreams("audio" /* MediaStreamType.AUDIO */);
                this.isMicrophoneInject = false;
            }
        }
        catch (error) {
            throw error;
        }
    }
    /** 初始化ws */
    setupWebSocket() {
        let isGetSdp = false;
        const iceCandidataArr = [];
        this.callbacks?.onProgress?.(PROGRESS_INFO.WS_CONNECT);
        // 连接websocket
        this.socket = new WebSocket(this.socketParams?.wsUrl);
        // ws连接成功回调
        this.socket.onopen = () => {
            this.retryCount = this.retryCountBackup;
            this.callbacks?.onSocketCallback?.({
                code: COMMON_CODE.SUCCESS,
            });
            this.callbacks?.onProgress?.(PROGRESS_INFO.WS_SUCCESS);
            this.isGroupControl && this.createWebGroupRtc(this.groupPads);
            this.startHeartbeat();
            this.setupPeerConnectionEvents();
            this.setupDataChannelEvents();
            this.setupTouchEvents();
        };
        // ws连接关闭回调
        this.socket.onclose = (event) => {
            Logger.info("WebSocket closed. Code: ", event.code, " Reason: ", event.reason);
            if (this.retryCount === this.retryCountBackup) {
                this.callbacks?.onSocketCallback?.({
                    code: COMMON_CODE.CLOSE,
                });
                this.callbacks?.onProgress?.(PROGRESS_INFO.WS_CLOSE);
            }
        };
        // ws连接错误回调
        this.socket.onerror = (error) => {
            this.retryCount--;
            if (this.retryCount > 0) {
                setTimeout(() => {
                    this.setupWebSocket();
                }, this.retryTime);
                this.callbacks?.onProgress?.(PROGRESS_INFO.WS_RETRY);
            }
            else {
                this.callbacks?.onSocketCallback?.({
                    code: COMMON_CODE.FAIL,
                });
                this.callbacks?.onProgress?.(PROGRESS_INFO.WS_ERROR);
                this.stopOperations();
            }
        };
        const setIce = (item) => {
            this.remotePc
                ?.addIceCandidate({
                candidate: item.candidate,
                sdpMLiineIndex: item.label,
                sdpMid: item.id,
            })
                .then(() => {
                this.callbacks?.onProgress?.(PROGRESS_INFO.RECEIVE_ICE);
            })
                .catch((error) => {
                this.callbacks?.onProgress?.(PROGRESS_INFO.RECEIVE_ICE_ERR);
            });
        };
        // ws收到消息回调
        this.socket.onmessage = async (event) => {
            const messageObj = JSON.parse(event.data);
            if (messageObj.event === "specifiedMsg" /* WebSocketEventType.SPECIFIED_MSG */) {
                const msgDataObj = JSON.parse(messageObj.data);
                if (msgDataObj.key === "re_answer" /* MessageKey.RE_ANSWER */) {
                    const sdp = JSON.parse(msgDataObj.value)?.sdp;
                    this.receiveAnswer(sdp);
                }
                if (msgDataObj.key === "offer" /* MessageKey.OFFER */) {
                    const msgValueOPbj = JSON.parse(msgDataObj.value);
                    // 接收offer
                    await this.receiveOffer(msgValueOPbj.sdp);
                    // 发送Answer
                    await this.sendAnswer();
                    // 已发送sdp相关信息
                    isGetSdp = true;
                    for (const item of iceCandidataArr) {
                        setIce(item);
                    }
                }
                if (msgDataObj.key === "ice_candidate" /* MessageKey.ICE_CANDIDATE */) {
                    const msgValueOPbj = JSON.parse(msgDataObj.value);
                    !isGetSdp ? iceCandidataArr.push(msgValueOPbj) : setIce(msgValueOPbj);
                }
            }
            else if (messageObj.event === "ownJoinRoom" /* WebSocketEventType.OWN_JOIN_ROOM */) {
                this.callbacks?.onProgress?.(PROGRESS_INFO.OWN_JOIN_ROOM);
            }
        };
    }
    /**
     * 静音
     */
    muted() {
        if (this.stopOperation)
            return;
        this.handleMediaPlay(exports.MediaType.AUDIO, false);
    }
    /**
     * 取消静音
     */
    unmuted() {
        if (this.stopOperation)
            return;
        const mediaType = Number(this.options.mediaType);
        const { remoteAudio } = this.socketParams;
        this.handleMediaPlay(exports.MediaType.AUDIO, true);
        if (mediaType === exports.MediaType.VIDEO) {
            remoteAudio.muted = false;
            remoteAudio.play();
        }
    }
    // 火山存在手动播放
    startPlay() {
        if (this.stopOperation)
            return;
        const mediaType = Number(this.options.mediaType);
        const { remoteVideo, remoteAudio } = this.socketParams;
        if ([3 /* MEDIA_CONTROL_TYPE.AUDIO_VIDEO */, 2 /* MEDIA_CONTROL_TYPE.VIDEO_ONLY */].includes(mediaType)) {
            remoteVideo.play();
        }
        if ([1 /* MEDIA_CONTROL_TYPE.AUDIO_ONLY */, 3 /* MEDIA_CONTROL_TYPE.AUDIO_VIDEO */].includes(mediaType)) {
            remoteAudio.play();
            remoteAudio.muted = false;
        }
    }
    sendGroupMessage(msg) {
        this.groupRtc?.sendMessage?.(JSON.stringify({
            event: "broadcastMsg" /* WebSocketEventType.BROADCAST_MSG */,
            data: msg,
        }));
    }
    /** 群控退出房间 */
    kickItOutRoom(pads) {
        if (this.stopOperation)
            return;
        this.groupRtc?.sendMessage?.(JSON.stringify({
            event: "broadcastMsg" /* WebSocketEventType.BROADCAST_MSG */,
            data: JSON.stringify({
                touchType: exports.TouchType.KICK_OUT_USER,
                content: JSON.stringify(pads),
            }),
        }));
    }
    /** 群控加入房间 */
    joinGroupRoom(pads) {
        if (this.stopOperation)
            return;
        const arr = pads?.filter((v) => v !== this.remoteUserId);
        arr.length && this.groupRtc?.joinRoom(arr);
    }
    createWebGroupRtc(pads) {
        const arr = pads?.filter((v) => v !== this.remoteUserId);
        this.groupRtc = new WebGroupRtc(this.options, arr, this.callbacks);
    }
    /** 滚轮事件 */
    handleVideoWheel(videoDom) {
        this.videoElement?.bindDomEvent("wheel", (e) => {
            if (this.options.disable)
                return;
            let { offsetX, offsetY, deltaY } = e;
            const touchConfigMousedown = {
                coords: [{ pressure: 1.0, size: 1.0, x: offsetX, y: offsetY }],
                widthPixels: videoDom.clientWidth,
                heightPixels: videoDom.clientHeight,
                pointCount: 1,
                properties: [{ id: 0, toolType: 1 }],
                touchType: exports.TouchType.GESTURE_SWIPE,
                swipe: deltaY > 0 ? -1 : 1,
            };
            const messageMousedown = JSON.stringify(touchConfigMousedown);
            this.sendUserMessage(messageMousedown);
        });
    }
    /** 鼠标移出 */
    handleVideoMouseleave() {
        this.videoElement?.bindDomEvent("mouseleave", (e) => {
            if (this.options.disable)
                return;
            // 若未按下时，不发送鼠标移动事件
            if (!this.hasPushDown) {
                return;
            }
            this.touchConfig.action = 1; // 抬起
            const message = JSON.stringify(this.touchConfig);
            this.sendUserMessage(message);
        });
    }
    /** 鼠标按下 */
    handleVideoMousedown(key, isMobileFlag, videoDom) {
        this.videoElement?.bindDomEvent(key, (e) => {
            if (this.options.disable)
                return;
            this.hasPushDown = true;
            const { allowLocalIMEInCloud, keyboard } = this.options;
            const { inputStateIsOpen } = this.roomMessage;
            // 处理输入框焦点逻辑
            const shouldHandleFocus = (allowLocalIMEInCloud && keyboard === "pad") || keyboard === "local";
            // 处理IOS本机键盘
            if (this.inputService.getInputElement() &&
                shouldHandleFocus &&
                typeof inputStateIsOpen === "boolean") {
                inputStateIsOpen ? this.inputService.focus() : this.inputService.blur();
            }
            this.touchInfo = generateTouchCoord();
            const videoDomIdRect = videoDom.getBoundingClientRect();
            const distanceToTop = videoDomIdRect.top;
            const distanceToLeft = videoDomIdRect.left;
            // 初始化
            this.touchConfig.properties = [];
            this.touchConfig.coords = [];
            // 计算触摸手指数量
            const touchCount = isMobileFlag ? e?.touches?.length : 1;
            this.touchConfig.action = 0; // 按下操作
            this.touchConfig.pointCount = touchCount;
            // 手指触控节点宽高
            const bigSide = videoDom.clientWidth > videoDom.clientHeight
                ? videoDom.clientWidth
                : videoDom.clientHeight;
            const smallSide = videoDom.clientWidth > videoDom.clientHeight
                ? videoDom.clientHeight
                : videoDom.clientWidth;
            this.touchConfig.widthPixels =
                this.options.rotateType == 1 ? bigSide : smallSide;
            this.touchConfig.heightPixels =
                this.options.rotateType == 1 ? smallSide : bigSide;
            // 横屏但是远端流是竖屏（用户手动旋转屏幕）
            if (this.options.rotateType == 1 &&
                this.remoteResolution.height > this.remoteResolution.width) {
                this.touchConfig.widthPixels = smallSide;
                this.touchConfig.heightPixels = bigSide;
            }
            else if (this.options.rotateType == 0 &&
                this.remoteResolution.width > this.remoteResolution.height) {
                // 竖屏但是远端流是横屏（用户手动旋转屏幕）
                this.touchConfig.widthPixels = bigSide;
                this.touchConfig.heightPixels = smallSide;
            }
            for (let i = 0; i < touchCount; i += 1) {
                const touch = isMobileFlag ? e.touches[i] : e;
                this.touchConfig.properties[i] = {
                    id: i,
                    toolType: 1,
                };
                let x = touch.offsetX;
                let y = touch.offsetY;
                if (x == undefined) {
                    x = touch.clientX - distanceToLeft;
                    y = touch.clientY - distanceToTop;
                    if (this.options.rotateType == 1 &&
                        this.remoteResolution.height > this.remoteResolution.width) {
                        x = videoDomIdRect.bottom - touch.clientY;
                        y = touch.clientX - distanceToLeft;
                    }
                    else if (this.options.rotateType == 0 &&
                        this.remoteResolution.width > this.remoteResolution.height) {
                        x = touch.clientY - distanceToTop;
                        y = videoDomIdRect.right - touch.clientX;
                    }
                }
                this.touchConfig.coords.push({
                    ...this.touchInfo,
                    orientation: 0.01 * Math.random(),
                    x: x,
                    y: y,
                });
            }
            const touchConfig = {
                action: touchCount > 1 ? 261 : 0,
                widthPixels: this.touchConfig.widthPixels,
                heightPixels: this.touchConfig.heightPixels,
                pointCount: touchCount,
                touchType: exports.TouchType.GESTURE,
                properties: this.touchConfig.properties,
                coords: this.touchConfig.coords,
            };
            const message = JSON.stringify(touchConfig);
            this.sendUserMessage(message);
        });
    }
    /** 鼠标移动 */
    handleVideoMousemove(key, isMobileFlag, videoDom) {
        this.videoElement?.bindDomEvent(key, (e) => {
            if (this.options.disable)
                return;
            // 若未按下时，不发送鼠标移动事件
            if (!this.hasPushDown) {
                return;
            }
            const videoDomIdRect = videoDom.getBoundingClientRect();
            const distanceToTop = videoDomIdRect.top;
            const distanceToLeft = videoDomIdRect.left;
            // 计算触摸手指数量
            const touchCount = isMobileFlag ? e?.touches?.length : 1;
            this.touchConfig.action = 2; // 触摸中
            this.touchConfig.pointCount = touchCount;
            this.touchConfig.coords = [];
            const coords = [];
            for (let i = 0; i < touchCount; i += 1) {
                const touch = isMobileFlag ? e.touches[i] : e;
                this.touchConfig.properties[i] = {
                    id: i,
                    toolType: 1,
                };
                let x = touch.offsetX;
                let y = touch.offsetY;
                if (x == undefined) {
                    x = touch.clientX - distanceToLeft;
                    y = touch.clientY - distanceToTop;
                    if (this.options.rotateType == 1 &&
                        this.remoteResolution.height > this.remoteResolution.width) {
                        x = videoDomIdRect.bottom - touch.clientY;
                        y = touch.clientX - distanceToLeft;
                    }
                    else if (this.options.rotateType == 0 &&
                        this.remoteResolution.width > this.remoteResolution.height) {
                        x = touch.clientY - distanceToTop;
                        y = videoDomIdRect.right - touch.clientX;
                    }
                }
                coords.push({
                    ...this.touchInfo,
                    orientation: 0.01 * Math.random(),
                    x: x,
                    y: y,
                });
            }
            this.touchConfig.coords = coords;
            const touchConfig = {
                action: 2,
                widthPixels: this.touchConfig.widthPixels,
                heightPixels: this.touchConfig.heightPixels,
                pointCount: touchCount,
                touchType: exports.TouchType.GESTURE,
                properties: this.touchConfig.properties,
                coords: this.touchConfig.coords,
            };
            const message = JSON.stringify(touchConfig);
            this.sendUserMessage(message);
        });
    }
    /** 鼠标结束 */
    handleVideoMouseup(key, isMobileFlag) {
        this.videoElement?.bindDomEvent(key, (e) => {
            if (this.options.disable)
                return;
            this.hasPushDown = false; // 按下状态重置
            this.touchConfig.action = 1;
            if (!isMobileFlag || (isMobileFlag && e.touches.length === 0)) {
                const message = JSON.stringify(this.touchConfig);
                this.sendUserMessage(message);
            }
        });
    }
    /** 加入房间 */
    start(isGroupControl = false, pads = []) {
        if (this.stopOperation)
            return;
        this.isGroupControl = isGroupControl;
        this.groupPads = pads;
        this.setupWebSocket();
    }
    /** 注册PeerConnection事件 */
    setupPeerConnectionEvents() {
        // 接收ICE候选人
        this.remotePc.addEventListener("icecandidate", (e) => {
            if (e.candidate) {
                const candidateMsg = {
                    event: "specifiedMsg" /* WebSocketEventType.SPECIFIED_MSG */,
                    targetUserIds: [this.remoteUserId],
                    data: JSON.stringify({
                        key: "ice_candidate" /* MessageKey.ICE_CANDIDATE */,
                        value: JSON.stringify({
                            candidate: e.candidate?.candidate,
                            label: e.candidate.sdpMLineIndex,
                            id: e.candidate.sdpMid,
                        }),
                    }),
                };
                const candidateMsgStr = JSON.stringify(candidateMsg);
                this.socket.send(candidateMsgStr);
                this.callbacks?.onProgress?.(PROGRESS_INFO.SEND_ICE);
            }
        });
        //  远端接收到流，交给video去播放
        this.remotePc.addEventListener("track", (event) => {
            // 优化延迟：尝试将播放延迟提示设置为 0 以最小化 Jitter Buffer 延迟
            if ("playoutDelayHint" in event.receiver) {
                event.receiver.playoutDelayHint = 0;
            }
            const { remoteVideo: video, remoteAudio: audio } = this.socketParams;
            const mediaType = Number(this.options.mediaType);
            switch (event?.track?.kind) {
                case "video":
                    // if (supportsSetCodecPreferences) {
                    //   const { codecs } = RTCRtpReceiver.getCapabilities("video")
                    //   const preferredCodecs = ["video/H264", "video/VP9", "video/VP8"]
                    //   const sortedCodecs = sortByMimeTypes(codecs, preferredCodecs)
                    //   event.transceiver.setCodecPreferences(sortedCodecs)
                    // }
                    // 监听事件
                    const videoMediaStream = new MediaStream([event?.track]);
                    video.srcObject = videoMediaStream;
                    video.addEventListener("loadeddata", (event) => {
                        video.play().catch((err) => {
                            Logger.error("播放失败:", err);
                            this.callbacks?.onAutoplayFailed?.({
                                userId: this.options.userId,
                                kind: "video",
                            });
                        });
                        this.isVideoFirstFrame = true;
                        if (this.refreshUiMsgNumber > 0) {
                            this.renderedFirstFrame();
                        }
                    });
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_TRACK_VIDEO);
                    break;
                case "audio":
                    const audioMediaStream = new MediaStream([event?.track]);
                    audio.srcObject = audioMediaStream;
                    audio.addEventListener("loadeddata", (event) => {
                        const flag = [
                            1 /* MEDIA_CONTROL_TYPE.AUDIO_ONLY */,
                            3 /* MEDIA_CONTROL_TYPE.AUDIO_VIDEO */,
                        ].includes(mediaType);
                        audio.muted = !flag;
                        if (flag) {
                            audio.play().catch((err) => {
                                Logger.error("播放失败:", err);
                                this.callbacks?.onAutoplayFailed?.({
                                    userId: this.options.userId,
                                    kind: "audio",
                                });
                            });
                        }
                    });
                    break;
            }
        });
        // 连接状态，其返回值为以下字符串之一：new、connecting、connected、disconnected、failed 或 closed。
        this.remotePc.addEventListener("connectionstatechange", (event) => {
            const state = this.remotePc.connectionState;
            let stateCode = 0;
            switch (state) {
                // 正在连接
                case "new":
                    stateCode = 0;
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CONNECTING);
                    break;
                case "connecting":
                    stateCode = 2;
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CONNECTING);
                    break;
                // 连接成功
                case "connected":
                    stateCode = 3;
                    this.iceFailureCount = 0; // 重置 ICE 失败计数
                    this.triggerRecoveryTimeCallback();
                    this.callbacks?.onConnectSuccess?.();
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CONNECTED);
                    break;
                // 断开连接
                case "disconnected":
                    stateCode = 4;
                    Logger.info("disconnected", this.remoteUserId);
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_DISCONNECTED);
                    this.handleIceFailure();
                    break;
                // 连接关闭
                case "closed":
                    stateCode = 1;
                    Logger.info("rtc closed");
                    this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CLOSE);
                    this.stopOperations();
                    break;
                // 连接失败
                case "failed":
                    stateCode = 1;
                    Logger.info("failed", this.remoteUserId);
                    this.handleIceFailure();
                    break;
            }
            this.callbacks?.onConnectionStateChanged?.({
                state: stateCode,
                msg: `RTC state: ${state}`,
            });
        });
        // ICE协商错误
        // this.remotePc.addEventListener("icecandidateerror", (error) => {
        //   Logger.info("icecandidateerror", error);
        //   // ICE协商错误处理
        // });
    }
    /** 处理 ICE 连接失败 */
    async handleIceFailure() {
        if (this.stopOperation)
            return;
        if (this.iceFailureCount >= this.maxIceFailures) {
            Logger.error("Max ICE failures reached, stopping operations.");
            this.callbacks?.onConnectFail?.({
                code: COMMON_CODE.FAIL,
                msg: "云机连接失败，重试次数超限",
            });
            this.stopOperations();
            return;
        }
        this.iceFailureCount++;
        Logger.info(`ICE failure detected, attempt ${this.iceFailureCount} to restart ICE...`);
        try {
            // 尝试重新发送 offer 触发 ICE restart
            const offer = await this.remotePc?.createOffer({ iceRestart: true });
            if (offer && this.remotePc) {
                await this.remotePc.setLocalDescription(offer);
                const offerMsg = {
                    event: "specifiedMsg" /* WebSocketEventType.SPECIFIED_MSG */,
                    targetUserIds: [this.remoteUserId],
                    data: JSON.stringify({
                        key: "re_offer" /* MessageKey.RE_OFFER */,
                        value: JSON.stringify({
                            sdp: offer.sdp,
                        }),
                    }),
                };
                this.socket.send(JSON.stringify(offerMsg));
            }
        }
        catch (e) {
            Logger.error("Failed to restart ICE:", e);
        }
    }
    /** 注册dataChannel事件 */
    setupDataChannelEvents() {
        this.dataChannel = this.remotePc.createDataChannel("dataChannel");
        // 监听通道正常打开
        this.dataChannel.addEventListener("open", (event) => {
            this.handleMediaPlay(this.options.mediaType, true);
            // this.waitForFirstFrameRendered(videoElement)
            // 每隔一段时间获取一次统计信息
            if (this.remotePc) {
                if (this.runInfoTimer) {
                    clearInterval(this.runInfoTimer);
                    this.runInfoTimer = null;
                }
                if (this.stopOperation)
                    return;
                this.runInfoTimer = setInterval(() => {
                    this.getStats();
                }, 2000);
            }
            // 查询输入状态
            this.onCheckInputState();
            this.setKeyboardStyle(this.options.keyboard);
            this.getCameraState();
            // 有些情况下用户收取不到UI消息，需手动触发
            const messageObj = {
                touchType: exports.TouchType.EVENT_SDK,
                content: JSON.stringify({
                    type: "updateUiH5" /* SdkEventType.UPDATE_UI_H5 */,
                }),
            };
            const message = JSON.stringify(messageObj);
            this.sendUserMessage(message);
            this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CHANNEL_OPEN);
        });
        // 监听数据通道的状态变化和错误事件
        this.dataChannel.addEventListener("error", (error) => {
            Logger.error("dataChannel error: ", error.errorDetail, error.message, error);
            clearInterval(this.runInfoTimer);
            this.callbacks?.onErrorMessage?.({
                code: ERROR_CODE.DELAY,
                msg: error.message || error.name,
            });
            this.callbacks?.onProgress?.(PROGRESS_INFO.RTC_CHANNEL_ERR);
            this.stopOperations();
        });
        this.onRoomMessageReceived();
    }
    /** 注册Touch事件 */
    setupTouchEvents() {
        // 添加触摸事件
        const videoDom = document.getElementById(this.videoDomId);
        const isMobileFlag = isTouchDevice() || isMobile();
        let eventTypeStart = "touchstart";
        let eventTypeMove = "touchmove";
        let eventTypeEnd = "touchend";
        if (!isMobileFlag) {
            eventTypeStart = "mousedown";
            eventTypeMove = "mousemove";
            eventTypeEnd = "mouseup";
        }
        /** 滚轮事件 */
        this.handleVideoWheel(videoDom);
        // 触摸开始
        this.handleVideoMousedown(eventTypeStart, isMobileFlag, videoDom);
        // 触摸中
        this.handleVideoMousemove(eventTypeMove, isMobileFlag, videoDom);
        // 触摸结束
        this.handleVideoMouseup(eventTypeEnd, isMobileFlag);
        // 触摸离开
        this.handleVideoMouseleave();
    }
    /**  发送local offer */
    async sendOffer() {
        try {
            const offer = await this.remotePc.createOffer();
            await this.remotePc.setLocalDescription(offer);
            const offerMsg = {
                event: "specifiedMsg" /* WebSocketEventType.SPECIFIED_MSG */,
                targetUserIds: [this.remoteUserId],
                data: JSON.stringify({
                    key: "re_offer" /* MessageKey.RE_OFFER */,
                    value: JSON.stringify({
                        sdp: offer.sdp,
                    }),
                }),
            };
            const offerMsgStr = JSON.stringify(offerMsg);
            this.socket.send(offerMsgStr);
        }
        catch (error) {
            Logger.error("发送webrtc offer失败:", error);
        }
    }
    /** 接收remote offer */
    async receiveOffer(offer) {
        // 建立连接，此时就会触发onicecandidate，然后注册ontrack
        const remoteSdp = {
            type: "offer" /* MessageKey.OFFER */,
            sdp: offer,
        };
        try {
            await this.remotePc.setRemoteDescription(remoteSdp);
            this.callbacks?.onProgress?.(PROGRESS_INFO.RECEIVE_OFFER);
        }
        catch (error) {
            Logger.error("接收webrtc offer失败:", error);
            this.callbacks?.onProgress?.(PROGRESS_INFO.RECEIVE_OFFER_ERR);
        }
    }
    /** 获取注入推流状态 */
    getInjectStreamStatus(type, timeout = 0) {
        return new Promise((resolve) => {
            // 创建超时处理器
            let timeoutHandler = null;
            if (timeout !== 0) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        status: "unknown",
                        type,
                    });
                }, timeout);
            }
            // 根据类型处理不同的流状态
            const handleStreamStatus = () => {
                switch (type) {
                    case "video":
                        try {
                            // 保存resolve函数以便在收到响应时调用
                            Object.assign(this.promiseMap.streamStatus, {
                                resolve: (result) => {
                                    if (timeoutHandler)
                                        clearTimeout(timeoutHandler);
                                    resolve(result);
                                },
                            });
                            this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
                                type: "injectionVideoStats" /* MessageKey.INJECTION_VIDEO_STATS */,
                            }), true);
                        }
                        catch (error) {
                            if (timeoutHandler)
                                clearTimeout(timeoutHandler);
                            resolve({
                                status: "unknown",
                                type,
                            });
                        }
                        break;
                    case "camera":
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isCameraInject ? "live" : "offline",
                            type,
                        });
                        break;
                    case "audio":
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isMicrophoneInject ? "live" : "offline",
                            type,
                        });
                        break;
                }
            };
            handleStreamStatus();
        });
    }
    /** 注入视频到相机 */
    injectVideoStream(type, options, timeout = 0, forwardOff = true) {
        return new Promise(async (resolve) => {
            let timeoutHandler = null;
            if (timeout) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        type,
                        status: "timeout",
                        result: null,
                    });
                }, timeout);
            }
            try {
                // 保存resolve函数以便在收到响应时调用
                Object.assign(this.promiseMap.injectStatus, {
                    resolve: (result) => {
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve(result);
                    },
                });
                const message = this.getMsgTemplate(exports.TouchType.EVENT_SDK, type === "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */
                    ? {
                        type,
                        fileUrl: options?.fileUrl,
                        isLoop: options?.isLoop ?? true,
                        fileName: options?.fileName,
                    }
                    : {
                        type,
                    });
                await this.sendUserMessage(message, forwardOff);
            }
            catch {
                resolve({
                    type,
                    status: "unknown",
                    result: null,
                });
            }
        });
    }
    /** 获取摄像头状态 */
    getCameraState() {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "cameraState" /* SdkEventType.GET_CAMERA_STATE */,
        }));
    }
    /** 接收remote answer */
    async receiveAnswer(answer) {
        try {
            const remoteSdp = {
                type: "answer" /* MessageKey.ANSWER */,
                sdp: answer,
            };
            await this.remotePc.setRemoteDescription(remoteSdp);
        }
        catch (error) {
            Logger.info("接收remote answer失败:", error);
            throw error;
        }
    }
    /** 只保留最后一次协商（last-one-wins） */
    negotiateOffer() {
        let running = false; // 当前是否在跑协商
        let pendingFlag = false; // 是否有“待协商”的请求（合并标记）
        const kick = async () => {
            if (running)
                return; // 已在跑，等这轮结束
            running = true;
            try {
                // 把本轮内积累的所有触发合并处理
                while (pendingFlag) {
                    // “取走”这次待处理
                    pendingFlag = false;
                    // 仅在 stable 时发起；否则等下一轮
                    if (this.remotePc.signalingState !== "stable") {
                        // 等待状态回到 stable（可选：稍作延迟或直接 break，让下次 kick 再试）
                        break;
                    }
                    await this.sendOffer();
                }
            }
            catch (e) {
                Logger.error("negotiateOffer error:", e);
            }
            finally {
                running = false;
            }
        };
        // 合并触发：只打标，不直接协商
        this.remotePc.addEventListener("negotiationneeded", () => {
            pendingFlag = true; // 只保留“有待处理”这个事实，之前的都被覆盖
            // 立即尝试启动一轮（如果已有在跑，会被 running 拦住）
            void kick();
        });
    }
    /** 发送local answer */
    async sendAnswer() {
        try {
            const answer = await this.remotePc.createAnswer();
            await this.remotePc.setLocalDescription(answer);
            const answerMsg = {
                event: "specifiedMsg" /* WebSocketEventType.SPECIFIED_MSG */,
                targetUserIds: [this.remoteUserId],
                data: JSON.stringify({
                    key: "re_answer" /* MessageKey.RE_ANSWER */,
                    value: JSON.stringify({
                        sdp: answer.sdp,
                    }),
                }),
            };
            const answerMsgStr = JSON.stringify(answerMsg);
            this.socket.send(answerMsgStr);
            this.callbacks?.onProgress?.(PROGRESS_INFO.SEND_ANSWER);
            this.negotiateOffer();
        }
        catch (error) {
            Logger.error("发送webrtc answer失败:", error);
            this.callbacks?.onProgress?.(PROGRESS_INFO.SEND_ANSWER_ERR);
        }
    }
    /** 第一帧加载完成 */
    renderedFirstFrame() {
        if (this.stopOperation)
            return;
        this.callbacks?.onRenderedFirstFrame?.();
        this.callbacks?.onProgress?.(PROGRESS_INFO.VIDEO_FIRST_FRAME);
    }
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     * @param mediaType
     * @returns
     */
    subscribeStream(mediaType) {
        return new Promise((resolve) => {
            this.handleMediaPlay(mediaType, true);
            resolve();
        });
    }
    executeAdbCommand(command) {
        this.options.clientId;
        const message = JSON.stringify({
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify({
                type: "inputAdb" /* SdkEventType.INPUT_ADB */,
                content: command,
            }),
        });
        this.sendUserMessage(message, false);
    }
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    async unsubscribeStream(mediaType) {
        this.handleMediaPlay(mediaType, false);
        return Promise.resolve();
    }
    handleMediaPlay(mediaType, isOpen) {
        switch (Number(mediaType)) {
            case exports.MediaType.AUDIO:
                this.sendUserMessage(this.handleSendData({
                    type: "openAudio" /* MediaOperationType.OPEN_AUDIO */,
                    isOpen,
                }));
                break;
            case exports.MediaType.VIDEO:
                this.sendUserMessage(this.handleSendData({
                    type: "openVideo" /* MediaOperationType.OPEN_VIDEO */,
                    isOpen,
                }));
                break;
            case exports.MediaType.AUDIO_AND_VIDEO:
                this.sendUserMessage(this.handleSendData({
                    type: "openAudioAndVideo" /* MediaOperationType.OPEN_AUDIO_AND_VIDEO */,
                    isOpen,
                }));
                break;
        }
    }
    /** 等待视频首帧画面被渲染 */
    waitForFirstFrameRendered(video) {
        if (this.stopOperation)
            return;
        // 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
        if (video.currentTime > 0) {
            if (this.isVideoFirstFrame && this.refreshUiMsgNumber <= 0) {
                this.callbacks?.onProgress?.(PROGRESS_INFO.VIDEO_UI_NUMBER);
            }
        }
        else {
            // 如果currentTime仍然是0，继续请求下一帧
            !this.stopOperation &&
                requestAnimationFrame(() => {
                    this.waitForFirstFrameRendered(video);
                });
        }
    }
    /** 停止所有操作 */
    stopOperations() {
        this.stopOperation = true;
        clearTimeout(this.autoRecoveryTimer);
        clearInterval(this.runInfoTimer);
        clearInterval(this.pingTimer);
        this.autoRecoveryTimer = null;
        this.runInfoTimer = null;
        this.pingTimer = null;
        this.videoElement?.removeAllEvents();
    }
    /** 关闭所有资源 但不销毁元素 */
    close() {
        this.stopOperations();
        // 断开webrtc
        if (this.remotePc) {
            this.remotePc
                ?.getSenders()
                ?.forEach((sender) => this.remotePc.removeTrack(sender));
            this.remotePc?.close();
            this.dataChannel?.close();
            this.remotePc = null;
            this.dataChannel = null;
            this.stopTracksAndStreams("video" /* MediaStreamType.VIDEO */);
            this.stopTracksAndStreams("audio" /* MediaStreamType.AUDIO */);
            this.videoSenders = [];
            this.audioSenders = [];
            this.senderVideoTracks = [];
            this.senderAudioTracks = [];
            this.videoStreams = [];
            this.audioStreams = [];
            this.remotePc?.close();
        }
        // 断开ws连接
        this.socket?.close();
        this.groupRtc?.close();
        this.groupRtc = null;
        this.socket = null;
    }
    /** 销毁 */
    destroy() {
        this.close();
        // inputService handled in BaseRtc/destroy
        this.videoElement?.destroy();
        this.socketParams?.remoteVideo?.remove();
        this.socketParams?.remoteAudio?.remove();
        this.screenShotInstance?.destroy();
        this.screenShotInstance = null;
        this.videoElement = null;
        this.socketParams = null;
    }
    stop() {
        this.destroy();
    }
    /** 定期获取统计信息的函数 */
    async getStats() {
        try {
            const stats = await this.remotePc?.getStats();
            // 丢包率
            let packetLossRate = 0;
            // 延迟
            let rtt = "0";
            stats.forEach((report) => {
                // 处理RTT（往返时间）统计信息
                if (report.type === "candidate-pair" && report.state === "succeeded") {
                    const currentRoundTripTime = report.currentRoundTripTime || 0;
                    rtt = (currentRoundTripTime * 1000).toFixed(2);
                }
                // 计算丢包率 (inbound-rtp)
                if (report.type === "inbound-rtp" && report.kind === "video") {
                    const packetsLost = report.packetsLost || 0;
                    const packetsReceived = report.packetsReceived || 0;
                    if (this.lastPacketsLost !== undefined && this.lastPacketsReceived !== undefined) {
                        const lostDelta = packetsLost - this.lastPacketsLost;
                        const receivedDelta = packetsReceived - this.lastPacketsReceived;
                        const totalDelta = lostDelta + receivedDelta;
                        if (totalDelta > 0) {
                            packetLossRate = lostDelta / totalDelta;
                        }
                    }
                    this.lastPacketsLost = packetsLost;
                    this.lastPacketsReceived = packetsReceived;
                }
            });
            const rttNum = parseFloat(rtt);
            const networkQuality = calculateNetworkQuality(rttNum, packetLossRate);
            const remoteStreamStats = {
                userId: this.options.userId,
                audioStats: null,
                videoStats: {
                    videoLossRate: packetLossRate, // 视频丢包率
                    rtt: rttNum, // 客户端到服务端数据传输的往返时延，单位：ms
                },
            };
            this.handleAdaptiveOptimization(remoteStreamStats.videoStats);
            this.callbacks?.onRunInformation?.(remoteStreamStats);
            this.callbacks?.onNetworkQuality?.(networkQuality, networkQuality);
        }
        catch (error) {
            Logger.error("获取统计信息时出错:", error);
            this.callbacks?.onErrorMessage?.({
                code: ERROR_CODE.DATA_CHANNEL,
                msg: error.message || error.name,
            });
        }
    }
    /**
     * 根据网络统计自动调整流性能
     */
    handleAdaptiveOptimization(stats) {
        if (this.stopOperation)
            return;
        const { videoLossRate, rtt } = stats;
        const rttNum = parseFloat(rtt);
        // 网络较差 (丢包 > 5% 或 RTT > 400ms)
        if (videoLossRate > 0.05 || rttNum > 400) {
            this.poorNetworkCount++;
            this.goodNetworkCount = 0;
            if (this.poorNetworkCount >= 3) {
                const { resolution, frameRate, bitrate } = this.options.videoStream;
                if (bitrate && bitrate > 1) {
                    Logger.info("WebRtc: Network poor, reducing bitrate", { videoLossRate, rtt });
                    this.setStreamConfig({
                        definitionId: resolution || 12,
                        framerateId: frameRate || 2,
                        bitrateId: Math.max(1, (bitrate || 3) - 1),
                    });
                }
                this.poorNetworkCount = 0;
            }
        }
        else if (videoLossRate < 0.01 && rttNum < 200) {
            this.goodNetworkCount++;
            this.poorNetworkCount = 0;
            if (this.goodNetworkCount >= 10) {
                this.goodNetworkCount = 0;
            }
        }
    }
    /** 浏览器是否支持 */
    isSupported() {
        const support = {
            RTCPeerConnection: typeof RTCPeerConnection !== "undefined",
            RTCDataChannel: typeof RTCDataChannel !== "undefined"};
        return support.RTCPeerConnection && support.RTCDataChannel;
    }
    /** 触发无操作回收回调函数 */
    /** 发送消息 */
    async sendUserMessage(message, notRecycling = false) {
        if (!this.stopOperation) {
            // 重置无操作回收定时器
            if (!notRecycling && this.groupControlSync) {
                this.sendGroupMessage(message);
                this.triggerRecoveryTimeCallback();
            }
            if (this.dataChannel)
                await this.dataChannel?.send(message);
        }
    }
    setMonitorOperation(isMonitor, forwardOff = true) { }
    /** 监听广播消息 */
    onRoomMessageReceived() {
        const parseResolution = (resolution) => {
            const [width, height] = resolution?.split("*").map(Number);
            return { width, height };
        };
        this.remotePc?.addEventListener("datachannel", (event) => {
            // 成功拿到 RTCDataChannel
            const dataChannel = event.channel;
            const run = async (msgString) => {
                const msg = JSON.parse(msgString || "{}");
                if (["videoAndAudioControl" /* MessageKey.VIDEO_AND_AUDIO_CONTROL */].includes(msg.key)) {
                    const msgData = JSON.parse(msg.data) || {};
                    Logger.info("VIDEO_AND_AUDIO_CONTROL", msg);
                    this.callbacks?.onMediaDevicesToggle?.({
                        type: "media",
                        enabled: msgData.isOpen,
                        isFront: msgData.isFront,
                    });
                    if (!this.enableMicrophone && !this.enableCamera) {
                        return;
                    }
                    const pushType = this.enableMicrophone && this.enableCamera
                        ? exports.MediaType.AUDIO_AND_VIDEO
                        : this.enableCamera
                            ? exports.MediaType.VIDEO
                            : exports.MediaType.AUDIO;
                    if (msgData.isOpen) {
                        if (this.enableCamera && this.enableMicrophone) {
                            await Promise.allSettled([
                                this.cameraInject(msgData),
                                this.microphoneInject(),
                            ]);
                        }
                        else if (this.enableCamera) {
                            await this.cameraInject(msgData);
                        }
                        else if (this.enableMicrophone) {
                            await this.microphoneInject();
                        }
                    }
                    else {
                        await this.stopMediaStream(pushType);
                    }
                }
                if (["audioControl" /* MessageKey.AUDIO_CONTROL */].includes(msg.key)) {
                    const { isOpen } = JSON.parse(msg.data) || {};
                    Logger.info("AUDIO_CONTROL", msg);
                    if (isOpen) {
                        await this.microphoneInject();
                    }
                    else {
                        await this.stopMediaStream(exports.MediaType.AUDIO);
                    }
                }
                // 消息透传
                if (msg.key === "message" /* MessageKey.MESSAGE */) {
                    this.callbacks?.onTransparentMsg?.(0, msg.data);
                }
                if (msg.key === "inputAdb" /* MessageKey.INPUT_ADB */) {
                    this.callbacks?.onAdbOutput?.(JSON.parse(msg.data || {}));
                }
                if (msg.key === "equipmentInfo" /* MessageKey.EQUIPMENT_INFO */) {
                    this.callbacks?.onEquipmentInfo?.(JSON.parse(msg.data || []));
                }
                if (msg.key === "callBack" /* MessageKey.CALL_BACK_EVENT */) {
                    const callData = JSON.parse(msg.data);
                    const result = JSON.parse(callData.data);
                    switch (callData.type) {
                        case "definition" /* MessageKey.DEFINITION */:
                            this.callbacks?.onChangeResolution?.({
                                from: parseResolution(result.from),
                                to: parseResolution(result.to),
                            });
                            break;
                        case "stopVideoInjection" /* MessageKey.STOP_INJECTION_VIDEO */:
                        case "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */:
                            const { resolve: injectResolve } = this.promiseMap.injectStatus;
                            if (injectResolve) {
                                injectResolve({
                                    type: callData.type,
                                    status: result?.isSuccess ? "success" : "error",
                                    result,
                                });
                                this.promiseMap.injectStatus.resolve = null;
                            }
                            this.callbacks?.onInjectVideoResult?.(callData.type, result);
                            break;
                        case "injectionVideoStats" /* MessageKey.INJECTION_VIDEO_STATS */:
                            const { resolve: streamResolve } = this.promiseMap.streamStatus;
                            streamResolve({
                                path: result.path,
                                status: result.status || (result.path ? "live" : "offline"),
                                type: "video",
                            });
                            break;
                    }
                }
                // ui消息
                if (msg.key === "refreshUiType" /* MessageKey.REFRESH_UI_TYPE */) {
                    const msgData = JSON.parse(msg.data);
                    // 若宽高没变，则不重新绘制页面
                    if (msgData.width == this.remoteResolution.width &&
                        msgData.height == this.remoteResolution.height) {
                        return false;
                    }
                    if (this.isVideoFirstFrame && this.refreshUiMsgNumber <= 0) {
                        this.callbacks?.onProgress?.(PROGRESS_INFO.VIDEO_UI_NUMBER);
                    }
                    this.roomMessage.isVertical = msgData.isVertical;
                    // 储存云机分辨率
                    this.remoteResolution.width = msgData.width;
                    this.remoteResolution.height = msgData.height;
                    // 移动端需要强制竖屏
                    if (isTouchDevice() || isMobile()) {
                        this.options.rotateType = 0;
                    }
                    const { rotateType } = this.options;
                    // 0 为竖屏，1 为横屏
                    let targetRotateType;
                    // 判断是否为 0 或 1
                    if (rotateType == 0 || rotateType == 1) {
                        targetRotateType = rotateType;
                    }
                    else {
                        // 根据宽高自动设置旋转类型，
                        targetRotateType = msgData.width > msgData.height ? 1 : 0;
                    }
                    this.rotateScreen(targetRotateType);
                    this.refreshUiMsgNumber++;
                    // 只有在初次渲染的ui的时候，才把流交给video去播放
                    if (this.isVideoFirstFrame) {
                        this.renderedFirstFrame();
                    }
                }
                // 云机、本机键盘使用消息
                if (msg.key === "inputState" /* MessageKey.INPUT_STATE */ && this.inputService.getInputElement()) {
                    const msgData = JSON.parse(msg.data);
                    this.roomMessage.inputStateIsOpen = msgData.isOpen;
                    const { allowLocalIMEInCloud, keyboard } = this.options;
                    const { inputStateIsOpen } = this.roomMessage;
                    // 处理输入框焦点逻辑
                    const shouldHandleFocus = (allowLocalIMEInCloud && keyboard === "pad") ||
                        keyboard === "local";
                    // 设置回车按钮文案
                    const enterkeyhintText = this.enterkeyhintObj[msgData.imeOptions];
                    this.inputService.getInputElement()?.setAttribute("enterkeyhint", enterkeyhintText);
                    Logger.info("inputStateIsOpen", inputStateIsOpen);
                    // 若存在inputElement，则判断当前本机键盘是否打开
                    if (this.inputService.getInputElement() &&
                        shouldHandleFocus &&
                        typeof inputStateIsOpen === "boolean") {
                        inputStateIsOpen
                            ? this.inputService.focus()
                            : this.inputService.blur();
                    }
                }
                // 将云机内容复制到本机剪切板
                if (msg.key === "clipboard" /* MessageKey.CLIPBOARD */) {
                    if (this.options.saveCloudClipboard) {
                        const msgData = JSON.parse(msg.data);
                        this.callbacks?.onOutputClipper?.(msgData);
                    }
                }
            };
            dataChannel?.addEventListener("message", (e) => {
                if (e.data) {
                    switch (checkType(e.data)) {
                        case "ArrayBuffer":
                            run(arrayBufferToText(e.data));
                            break;
                        case "Blob":
                            blobToText(e.data).then((res) => {
                                run(res);
                            });
                            break;
                        default:
                            run(e.data);
                            break;
                    }
                }
            });
        });
    }
    /** 设置摄像头设备 */
    // public async setVideoDeviceId(val: string) {
    //   if (this.stopOperation) return;
    //   this.videoDeviceId = val;
    //   if (this.isCameraInject) {
    //     try {
    //       await this.stopMediaStream(MediaType.VIDEO);
    //     } catch (error) {}
    //     return this.cameraInject();
    //   }
    // }
    /** 调整坐标 */
    reshapeWindow() {
    }
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 需要发送的字符串
     */
    async sendInputClipper(inputStr) {
        if (this.stopOperation)
            return;
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.CLIPBOARD,
        });
        await this.sendUserMessage(message);
    }
    /** 群控剪切板 */
    sendGroupInputClipper(pads, strs) {
        if (this.stopOperation)
            return;
        strs?.map((v, index) => {
            const message = JSON.stringify({
                text: v,
                pads: [pads[index]],
                touchType: exports.TouchType.CLIPBOARD,
            });
            this.sendGroupMessage(message);
        });
    }
    /** 按顺序发送文本框 */
    sendGroupInputString(pads, strs) {
        strs?.map((v, index) => {
            const message = JSON.stringify({
                text: v,
                pads: [pads[index]],
                touchType: exports.TouchType.INPUT_BOX,
            });
            this.sendGroupMessage(message);
        });
    }
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 需要发送的字符串
     */
    async sendInputString(inputStr) {
        if (this.stopOperation)
            return;
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.INPUT_BOX,
        });
        await this.sendUserMessage(message);
    }
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time) {
        if (this.stopOperation)
            return;
        const shake = new ShakeSimulator();
        shake.startShakeSimulation(time, (content) => {
            const getOptions = (sensorType) => {
                return JSON.stringify({
                    coords: [],
                    heightPixels: 0,
                    isOpenScreenFollowRotation: false,
                    keyCode: 0,
                    pointCount: 0,
                    properties: [],
                    text: "",
                    touchType: exports.TouchType.EVENT_SDK,
                    widthPixels: 0,
                    action: 0,
                    content: JSON.stringify({
                        ...content,
                        type: "sdkSensor" /* SdkEventType.SDK_SENSOR */,
                        sensorType,
                    }),
                });
            };
            this.sendUserMessage(getOptions("gyroscope" /* SensorType.GYROSCOPE */));
            this.sendUserMessage(getOptions("gravity" /* SensorType.GRAVITY */));
            this.sendUserMessage(getOptions("acceleration" /* SensorType.ACCELERATION */));
        });
    }
    /** 清晰度切换 */
    setStreamConfig(config) {
        if (this.stopOperation)
            return;
        const regExp = /^[1-9]\d*$/;
        // 判断字段是否缺失
        if (config.definitionId && config.framerateId && config.bitrateId) {
            const values = Object.values(config);
            // 判断输入值是否为正整数
            if (values.every((value) => regExp.test(value))) {
                if (config.definitionId >= 7 &&
                    config.definitionId <= 20 &&
                    config.framerateId >= 1 &&
                    config.framerateId <= 9 &&
                    config.bitrateId >= 1 &&
                    config.bitrateId <= 15) {
                    const contentObj = {
                        type: "definitionUpdata" /* SdkEventType.DEFINITION_UPDATE */,
                        definitionId: config.definitionId,
                        framerateId: config.framerateId,
                        bitrateId: config.bitrateId,
                    };
                    const messageObj = {
                        touchType: exports.TouchType.EVENT_SDK,
                        content: JSON.stringify(contentObj),
                    };
                    // const userId = this.options.clientId;
                    const message = JSON.stringify(messageObj);
                    this.sendUserMessage(message);
                }
            }
        }
    }
    handleSendData(options) {
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(options),
        };
        return JSON.stringify(messageObj);
    }
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType = 3) {
        // 重置无操作回收定时器
        this.triggerRecoveryTimeCallback();
        this.handleMediaPlay(mediaType, false);
    }
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType = 3) {
        // 重置无操作回收定时器
        this.triggerRecoveryTimeCallback();
        this.handleMediaPlay(mediaType, true);
    }
    /** 截图-保存到本地 */
    saveScreenShotToLocal() {
        if (this.stopOperation)
            return Promise.reject("Operation stopped");
        return new Promise((resolve, reject) => {
            try {
                const video = document.getElementById(this.remoteVideoId);
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
                resolve(imageData);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /** 截图-保存到云机 */
    saveScreenShotToRemote() {
        if (this.stopOperation)
            return;
        const contentObj = {
            type: "localScreenshot" /* SdkEventType.LOCAL_SCREENSHOT */,
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj),
        };
        // const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.sendUserMessage(message);
    }
    /**
     * 手动横竖屏：0竖屏，1横屏
     * 对标百度API
     */
    setPhoneRotation(type) {
        if (this.stopOperation)
            return;
        this.triggerRecoveryTimeCallback();
        this.rotateScreen(type);
    }
    /**
     * 旋转屏幕
     * @param type 旋转方向：0竖屏，1横屏
     */
    async rotateScreen(type) {
        this.options.rotateType = type;
        try {
            await this.callbacks?.onBeforeRotate?.(type);
        }
        catch (error) { }
        // 获取父元素（调用方）的原始宽度和高度，这里要重新获取，因为外层的div可能宽高发生变化
        const h5Dom = document.getElementById(this.initDomId);
        let parentWidth = h5Dom?.clientWidth;
        let parentHeight = h5Dom?.clientHeight;
        let bigSide = parentHeight;
        let smallSide = parentWidth;
        if (parentWidth > parentHeight) {
            bigSide = parentWidth;
            smallSide = parentHeight;
        }
        const wrapperBox = h5Dom.parentElement;
        const wrapperBoxWidth = wrapperBox.clientWidth;
        const toolsWidth = this.options.toolsWidth ?? 0;
        if (type == exports.RotateDirection.LANDSCAPE) {
            // 因为右侧可能有操作栏，所以预留60px
            if (toolsWidth) {
                parentWidth = bigSide > wrapperBoxWidth ? wrapperBoxWidth - toolsWidth : bigSide;
            }
            else {
                parentWidth = bigSide;
            }
            parentHeight = smallSide;
        }
        else {
            parentWidth = smallSide;
            parentHeight = bigSide;
        }
        h5Dom.style.width = parentWidth + "px";
        h5Dom.style.height = parentHeight + "px";
        // 判断视频的宽高方向
        // video 是否是横屏
        const videoIsLandscape = this.remoteResolution.width > this.remoteResolution.height;
        // 判断当前界面中的video宽高方向
        const videoWrapperDom = document.getElementById(this.remoteVideoContainerId);
        let videoWrapperWidth = videoWrapperDom.clientWidth;
        let videoWrapperHeight = videoWrapperDom.clientHeight;
        // 外层 div
        let armcloudVideoWidth = 0;
        let armcloudVideoHeight = 0;
        // 旋转角度
        let videoWrapperRotate = 0;
        let videoWrapperTop = 0;
        let videoWrapperLeft = 0;
        if (type == 1) {
            // 横屏
            const w = videoIsLandscape
                ? this.remoteResolution.width
                : this.remoteResolution.height;
            const h = videoIsLandscape
                ? this.remoteResolution.height
                : this.remoteResolution.width;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
            videoWrapperWidth = armcloudVideoWidth;
            videoWrapperHeight = armcloudVideoHeight;
            // 顺时针旋转视频90度
            if (!videoIsLandscape) {
                videoWrapperRotate = -90;
                videoWrapperTop = (armcloudVideoHeight - armcloudVideoWidth) / 2;
                videoWrapperLeft = (armcloudVideoWidth - armcloudVideoHeight) / 2;
                videoWrapperWidth = armcloudVideoHeight;
                videoWrapperHeight = armcloudVideoWidth;
            }
            else {
                videoWrapperRotate = 0;
                videoWrapperTop = 0;
                videoWrapperLeft = 0;
            }
        }
        else {
            // 竖屏处理
            const w = videoIsLandscape
                ? this.remoteResolution.height
                : this.remoteResolution.width;
            const h = videoIsLandscape
                ? this.remoteResolution.width
                : this.remoteResolution.height;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
            videoWrapperWidth = videoIsLandscape
                ? armcloudVideoHeight
                : armcloudVideoWidth;
            videoWrapperHeight = videoIsLandscape
                ? armcloudVideoWidth
                : armcloudVideoHeight;
            videoWrapperRotate = videoIsLandscape ? 90 : 0;
            videoWrapperTop = videoIsLandscape
                ? (armcloudVideoHeight - armcloudVideoWidth) / 2
                : 0;
            videoWrapperLeft = videoIsLandscape
                ? (armcloudVideoWidth - armcloudVideoHeight) / 2
                : 0;
        }
        // armcloudVideo
        const videoDom = document.getElementById(this.videoDomId);
        videoDom.style.width = `${armcloudVideoWidth}px`;
        videoDom.style.height = `${armcloudVideoHeight}px`;
        videoWrapperDom.style.width = `${videoWrapperWidth}px`;
        videoWrapperDom.style.height = `${videoWrapperHeight}px`;
        videoWrapperDom.style.top = `${videoWrapperTop}px`;
        videoWrapperDom.style.left = `${videoWrapperLeft}px`;
        videoWrapperDom.style.transform = `rotate(${videoWrapperRotate}deg)`;
        this.callbacks?.onChangeRotate?.(type, {
            width: armcloudVideoWidth,
            height: armcloudVideoHeight,
        });
    }
    /** 手动定位 */
    setGPS(longitude, latitude) {
        if (this.stopOperation)
            return;
        const contentObj1 = {
            latitude,
            longitude,
            time: new Date().getTime(),
        };
        const contentObj2 = {
            type: "sdkLocation" /* SdkEventType.SDK_LOCATION */,
            content: JSON.stringify(contentObj1),
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj2),
        };
        const message = JSON.stringify(messageObj);
        this.sendUserMessage(message);
    }
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType) {
        if (this.stopOperation)
            return;
        const contentObj = {
            type: "keyBoardType" /* SdkEventType.KEYBOARD_TYPE */,
            isLocalKeyBoard: keyBoardType === "local",
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj),
        };
        // const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.options.keyboard = keyBoardType;
        this.sendUserMessage(message);
    }
    /** 查询输入状态 */
    async onCheckInputState() {
        if (this.stopOperation)
            return;
        const message = JSON.stringify({
            touchType: exports.TouchType.INPUT_STATE,
        });
        this.sendUserMessage(message);
    }
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second) {
        if (this.stopOperation)
            return;
        // 设置过期时间，单位为毫秒
        this.options.autoRecoveryTime = second;
        // 定时器，当指定时间内无操作时执行离开房间操作
        this.triggerRecoveryTimeCallback();
    }
    /** 获取无操作回收时间 */
    getAutoRecycleTime() {
        if (this.stopOperation)
            return;
        return this.options.autoRecoveryTime;
    }
    /** 底部栏操作按键 */
    sendCommand(command) {
        if (this.stopOperation)
            return;
        // 定义按键映射表 兼容老版本
        const keyCodeMap = {
            back: 4,
            home: 3,
            menu: 187,
        };
        // 获取keyCode,如果command不在映射表中则使用command本身
        const keyCode = keyCodeMap[command] ?? command;
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode,
            text: "",
        };
        const message = JSON.stringify(messageObj);
        const userId = this.options.clientId;
        if (userId) {
            // 按下
            this.sendUserMessage(message);
        }
    }
    /** 返回按键事件 */
    goAppUpPage() {
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 4,
            text: "",
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        if (userId) {
            // 抬起
            this.sendUserMessage(message);
        }
    }
    /** 主页按键事件 */
    goAppHome() {
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 3,
            text: "",
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        if (userId) {
            // 按下
            this.sendUserMessage(message);
        }
    }
    /** 菜单按键事件 */
    goAppMenu() {
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 187,
            text: "",
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        if (userId) {
            // 按下
            this.sendUserMessage(message);
        }
    }
    /** 音量增加按键事件 */
    increaseVolume() {
        if (this.stopOperation)
            return;
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 24,
            text: "",
        };
        const message = JSON.stringify(messageObj);
        // 按下
        this.sendUserMessage(message);
    }
    /** 音量减少按键事件 */
    decreaseVolume() {
        if (this.stopOperation)
            return;
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 25,
            text: "",
        };
        const message = JSON.stringify(messageObj);
        // 按下
        this.sendUserMessage(message);
    }
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag) {
        if (this.stopOperation)
            return;
        this.options.saveCloudClipboard = flag;
    }
}

/*! For license information please see index.mjs.LICENSE.txt */
var e={943:e=>{var t={utf8:{stringToBytes:function(e){return t.bin.stringToBytes(unescape(encodeURIComponent(e)))},bytesToString:function(e){return decodeURIComponent(escape(t.bin.bytesToString(e)))}},bin:{stringToBytes:function(e){for(var t=[],n=0;n<e.length;n++)t.push(255&e.charCodeAt(n));return t},bytesToString:function(e){for(var t=[],n=0;n<e.length;n++)t.push(String.fromCharCode(e[n]));return t.join("")}}};e.exports=t;},677:e=>{var t,n;t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",n={rotl:function(e,t){return e<<t|e>>>32-t},rotr:function(e,t){return e<<32-t|e>>>t},endian:function(e){if(e.constructor==Number)return 16711935&n.rotl(e,8)|4278255360&n.rotl(e,24);for(var t=0;t<e.length;t++)e[t]=n.endian(e[t]);return e},randomBytes:function(e){for(var t=[];e>0;e--)t.push(Math.floor(256*Math.random()));return t},bytesToWords:function(e){for(var t=[],n=0,o=0;n<e.length;n++,o+=8)t[o>>>5]|=e[n]<<24-o%32;return t},wordsToBytes:function(e){for(var t=[],n=0;n<32*e.length;n+=8)t.push(e[n>>>5]>>>24-n%32&255);return t},bytesToHex:function(e){for(var t=[],n=0;n<e.length;n++)t.push((e[n]>>>4).toString(16)),t.push((15&e[n]).toString(16));return t.join("")},hexToBytes:function(e){for(var t=[],n=0;n<e.length;n+=2)t.push(parseInt(e.substr(n,2),16));return t},bytesToBase64:function(e){for(var n=[],o=0;o<e.length;o+=3)for(var r=e[o]<<16|e[o+1]<<8|e[o+2],i=0;i<4;i++)8*o+6*i<=8*e.length?n.push(t.charAt(r>>>6*(3-i)&63)):n.push("=");return n.join("")},base64ToBytes:function(e){e=e.replace(/[^A-Z0-9+\/]/gi,"");for(var n=[],o=0,r=0;o<e.length;r=++o%4)0!=r&&n.push((t.indexOf(e.charAt(o-1))&Math.pow(2,-2*r+8)-1)<<2*r|t.indexOf(e.charAt(o))>>>6-2*r);return n}},e.exports=n;},112:function(e,t,n){var o;e.exports=(o=o||function(e,t){var o;if("undefined"!=typeof window&&window.crypto&&(o=window.crypto),"undefined"!=typeof self&&self.crypto&&(o=self.crypto),"undefined"!=typeof globalThis&&globalThis.crypto&&(o=globalThis.crypto),!o&&"undefined"!=typeof window&&window.msCrypto&&(o=window.msCrypto),!o&&void 0!==n.g&&n.g.crypto&&(o=n.g.crypto),!o)try{o=n(429);}catch(e){}var r=function(){if(o){if("function"==typeof o.getRandomValues)try{return o.getRandomValues(new Uint32Array(1))[0]}catch(e){}if("function"==typeof o.randomBytes)try{return o.randomBytes(4).readInt32LE()}catch(e){}}throw new Error("Native crypto module could not be used to get secure random number.")},i=Object.create||function(){function e(){}return function(t){var n;return e.prototype=t,n=new e,e.prototype=null,n}}(),s={},a=s.lib={},c=a.Base={extend:function(e){var t=i(this);return e&&t.mixIn(e),t.hasOwnProperty("init")&&this.init!==t.init||(t.init=function(){t.$super.init.apply(this,arguments);}),t.init.prototype=t,t.$super=this,t},create:function(){var e=this.extend();return e.init.apply(e,arguments),e},init:function(){},mixIn:function(e){for(var t in e)e.hasOwnProperty(t)&&(this[t]=e[t]);e.hasOwnProperty("toString")&&(this.toString=e.toString);},clone:function(){return this.init.prototype.extend(this)}},d=a.WordArray=c.extend({init:function(e,t){e=this.words=e||[],this.sigBytes=null!=t?t:4*e.length;},toString:function(e){return (e||u).stringify(this)},concat:function(e){var t=this.words,n=e.words,o=this.sigBytes,r=e.sigBytes;if(this.clamp(),o%4)for(var i=0;i<r;i++){var s=n[i>>>2]>>>24-i%4*8&255;t[o+i>>>2]|=s<<24-(o+i)%4*8;}else for(var a=0;a<r;a+=4)t[o+a>>>2]=n[a>>>2];return this.sigBytes+=r,this},clamp:function(){var t=this.words,n=this.sigBytes;t[n>>>2]&=4294967295<<32-n%4*8,t.length=e.ceil(n/4);},clone:function(){var e=c.clone.call(this);return e.words=this.words.slice(0),e},random:function(e){for(var t=[],n=0;n<e;n+=4)t.push(r());return new d.init(t,e)}}),l=s.enc={},u=l.Hex={stringify:function(e){for(var t=e.words,n=e.sigBytes,o=[],r=0;r<n;r++){var i=t[r>>>2]>>>24-r%4*8&255;o.push((i>>>4).toString(16)),o.push((15&i).toString(16));}return o.join("")},parse:function(e){for(var t=e.length,n=[],o=0;o<t;o+=2)n[o>>>3]|=parseInt(e.substr(o,2),16)<<24-o%8*4;return new d.init(n,t/2)}},h=l.Latin1={stringify:function(e){for(var t=e.words,n=e.sigBytes,o=[],r=0;r<n;r++){var i=t[r>>>2]>>>24-r%4*8&255;o.push(String.fromCharCode(i));}return o.join("")},parse:function(e){for(var t=e.length,n=[],o=0;o<t;o++)n[o>>>2]|=(255&e.charCodeAt(o))<<24-o%4*8;return new d.init(n,t)}},p=l.Utf8={stringify:function(e){try{return decodeURIComponent(escape(h.stringify(e)))}catch(e){throw new Error("Malformed UTF-8 data")}},parse:function(e){return h.parse(unescape(encodeURIComponent(e)))}},f=a.BufferedBlockAlgorithm=c.extend({reset:function(){this._data=new d.init,this._nDataBytes=0;},_append:function(e){"string"==typeof e&&(e=p.parse(e)),this._data.concat(e),this._nDataBytes+=e.sigBytes;},_process:function(t){var n,o=this._data,r=o.words,i=o.sigBytes,s=this.blockSize,a=i/(4*s),c=(a=t?e.ceil(a):e.max((0|a)-this._minBufferSize,0))*s,l=e.min(4*c,i);if(c){for(var u=0;u<c;u+=s)this._doProcessBlock(r,u);n=r.splice(0,c),o.sigBytes-=l;}return new d.init(n,l)},clone:function(){var e=c.clone.call(this);return e._data=this._data.clone(),e},_minBufferSize:0}),m=(a.Hasher=f.extend({cfg:c.extend(),init:function(e){this.cfg=this.cfg.extend(e),this.reset();},reset:function(){f.reset.call(this),this._doReset();},update:function(e){return this._append(e),this._process(),this},finalize:function(e){return e&&this._append(e),this._doFinalize()},blockSize:16,_createHelper:function(e){return function(t,n){return new e.init(n).finalize(t)}},_createHmacHelper:function(e){return function(t,n){return new m.HMAC.init(e,n).finalize(t)}}}),s.algo={});return s}(Math),o);},652:function(e,t,n){var o;e.exports=(o=n(112),n(232),n(456),o.HmacSHA256);},456:function(e,t,n){var o,r,i;e.exports=(r=(o=n(112)).lib.Base,i=o.enc.Utf8,void(o.algo.HMAC=r.extend({init:function(e,t){e=this._hasher=new e.init,"string"==typeof t&&(t=i.parse(t));var n=e.blockSize,o=4*n;t.sigBytes>o&&(t=e.finalize(t)),t.clamp();for(var r=this._oKey=t.clone(),s=this._iKey=t.clone(),a=r.words,c=s.words,d=0;d<n;d++)a[d]^=1549556828,c[d]^=909522486;r.sigBytes=s.sigBytes=o,this.reset();},reset:function(){var e=this._hasher;e.reset(),e.update(this._iKey);},update:function(e){return this._hasher.update(e),this},finalize:function(e){var t=this._hasher,n=t.finalize(e);return t.reset(),t.finalize(this._oKey.clone().concat(n))}})));},232:function(e,t,n){var o;e.exports=(o=n(112),function(e){var t=o,n=t.lib,r=n.WordArray,i=n.Hasher,s=t.algo,a=[],c=[];!function(){function t(t){for(var n=e.sqrt(t),o=2;o<=n;o++)if(!(t%o))return  false;return  true}function n(e){return 4294967296*(e-(0|e))|0}for(var o=2,r=0;r<64;)t(o)&&(r<8&&(a[r]=n(e.pow(o,.5))),c[r]=n(e.pow(o,1/3)),r++),o++;}();var d=[],l=s.SHA256=i.extend({_doReset:function(){this._hash=new r.init(a.slice(0));},_doProcessBlock:function(e,t){for(var n=this._hash.words,o=n[0],r=n[1],i=n[2],s=n[3],a=n[4],l=n[5],u=n[6],h=n[7],p=0;p<64;p++){if(p<16)d[p]=0|e[t+p];else {var f=d[p-15],m=(f<<25|f>>>7)^(f<<14|f>>>18)^f>>>3,v=d[p-2],g=(v<<15|v>>>17)^(v<<13|v>>>19)^v>>>10;d[p]=m+d[p-7]+g+d[p-16];}var y=o&r^o&i^r&i,b=(o<<30|o>>>2)^(o<<19|o>>>13)^(o<<10|o>>>22),k=h+((a<<26|a>>>6)^(a<<21|a>>>11)^(a<<7|a>>>25))+(a&l^~a&u)+c[p]+d[p];h=u,u=l,l=a,a=s+k|0,s=i,i=r,r=o,o=k+(b+y)|0;}n[0]=n[0]+o|0,n[1]=n[1]+r|0,n[2]=n[2]+i|0,n[3]=n[3]+s|0,n[4]=n[4]+a|0,n[5]=n[5]+l|0,n[6]=n[6]+u|0,n[7]=n[7]+h|0;},_doFinalize:function(){var t=this._data,n=t.words,o=8*this._nDataBytes,r=8*t.sigBytes;return n[r>>>5]|=128<<24-r%32,n[14+(r+64>>>9<<4)]=e.floor(o/4294967296),n[15+(r+64>>>9<<4)]=o,t.sigBytes=4*n.length,this._process(),this._hash},clone:function(){var e=i.clone.call(this);return e._hash=this._hash.clone(),e}});t.SHA256=i._createHelper(l),t.HmacSHA256=i._createHmacHelper(l);}(Math),o.SHA256);},408:function(e){var t;t=()=>(()=>{var e={944:function(e){e.exports=(()=>{var e={d:(t,n)=>{for(var o in n)e.o(n,o)&&!e.o(t,o)&&Object.defineProperty(t,o,{enumerable:true,get:n[o]});},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t)},t={};function n(e){return (n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}function o(e,t){var n="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!n){if(Array.isArray(e)||(n=i(e))||t){n&&(e=n);var o=0,r=function(){};return {s:r,n:function(){return o>=e.length?{done:true}:{done:false,value:e[o++]}},e:function(e){throw e},f:r}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var s,a=true,c=false;return {s:function(){n=n.call(e);},n:function(){var e=n.next();return a=e.done,e},e:function(e){c=true,s=e;},f:function(){try{a||null==n.return||n.return();}finally{if(c)throw s}}}}function r(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var n=e&&("undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"]);if(null!=n){var o,r,i=[],s=true,a=false;try{for(n=n.call(e);!(s=(o=n.next()).done)&&(i.push(o.value),!t||i.length!==t);s=!0);}catch(e){a=true,r=e;}finally{try{s||null==n.return||n.return();}finally{if(a)throw r}}return i}}(e,t)||i(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function i(e,t){if(e){if("string"==typeof e)return s(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return "Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?s(e,t):void 0}}function s(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,o=new Array(t);n<t;n++)o[n]=e[n];return o}function a(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}e.d(t,{default:()=>c});var c=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];a(this,e),this.allowExtra=t,this.defaults=new Map,this.types=new Map,this.optional=new Set,this.required=new Set;}var t;return (t=[{key:"setDefaults",value:function(e){var t=this;return Object.entries(e).forEach((function(e){var n=r(e,2),o=n[0],i=n[1];return t.defaults.set(o,i)})),this}},{key:"setTypes",value:function(e){var t=this;return Object.entries(e).forEach((function(e){var n=r(e,2),o=n[0],i=n[1];return t.types.set(o,i)})),this}},{key:"setOptional",value:function(e){var t=this;return e.forEach((function(e){return t.optional.add(e)})),this}},{key:"setRequired",value:function(e){var t=this;return e.forEach((function(e){return t.required.add(e)})),this}},{key:"resolve",value:function(e){var t=Object.assign(this.getDefaults(),e);return this.validate(t),t}},{key:"getDefaults",value:function(){var e,t={},n=o(this.defaults);try{for(n.s();!(e=n.n()).done;){var i=r(e.value,2),s=i[0],a=i[1];t[s]=a;}}catch(e){n.e(e);}finally{n.f();}return t}},{key:"validate",value:function(e){for(var t in e){if(!this.optionExists(t))throw new Error('Unkown option "'.concat(t,'".'));this.checkType(t,e[t]);}var n,r=o(this.required.values());try{for(r.s();!(n=r.n()).done;){var i=n.value;if(void 0===e[i])throw new Error('Option "'.concat(i,'" is required.'))}}catch(e){r.e(e);}finally{r.f();}}},{key:"checkType",value:function(e,t){if(this.types.has(e)){var o=this.types.get(e),r=n(t);if(r!==o)throw new Error('Wrong value for option "'.concat(e,'". Expected type "').concat(o,'" but got "').concat(r,'".'))}}},{key:"optionExists",value:function(e){return !!this.allowExtra||this.defaults.has(e)||this.optional.has(e)||this.required.has(e)||this.types.has(e)}}])&&function(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||false,o.configurable=true,"value"in o&&(o.writable=true),Object.defineProperty(e,o.key,o);}}(e.prototype,t),e}();return t.default})();},162:function(e){e.exports=(()=>{var e={d:(t,n)=>{for(var o in n)e.o(n,o)&&!e.o(t,o)&&Object.defineProperty(t,o,{enumerable:true,get:n[o]});},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t)},t={};e.d(t,{default:()=>n});var n=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this._events={},this.on=this.addEventListener,this.off=this.removeEventListener;}var t;return (t=[{key:"emit",value:function(e,t){if(Object.prototype.hasOwnProperty.call(this._events,e))for(var n=this._events[e],o={type:e,detail:t},r=n.length,i=0;i<r;i++)this.handle(n[i],o);}},{key:"handle",value:function(e,t){e(t);}},{key:"addEventListener",value:function(e,t){Object.prototype.hasOwnProperty.call(this._events,e)||(this._events[e]=[]),this._events[e].indexOf(t)<0&&this._events[e].push(t);}},{key:"removeEventListener",value:function(e,t){if(Object.prototype.hasOwnProperty.call(this._events,e)){var n=this._events[e],o=n.indexOf(t);o>=0&&n.splice(o,1),0===n.length&&delete this._events[e];}}}])&&function(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||false,o.configurable=true,"value"in o&&(o.writable=true),Object.defineProperty(e,o.key,o);}}(e.prototype,t),e}();return t.default})();}},t={};function n(o){var r=t[o];if(void 0!==r)return r.exports;var i=t[o]={exports:{}};return e[o].call(i.exports,i,i.exports,n),i.exports}n.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return n.d(t,{a:t}),t},n.d=(e,t)=>{for(var o in t)n.o(t,o)&&!n.o(e,o)&&Object.defineProperty(e,o,{enumerable:true,get:t[o]});},n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:true});};var o={};return (()=>{n.r(o),n.d(o,{GamepadHandler:()=>p,GamepadListener:()=>C});var e=n(162),t=n.n(e),r=n(944),i=n.n(r);function s(e){return s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(e)}function a(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function c(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||false,o.configurable=true,"value"in o&&(o.writable=true),Object.defineProperty(e,(r=function(e,t){if("object"!==s(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,"string");if("object"!==s(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(o.key),"symbol"===s(r)?r:String(r)),o);}var r;}function d(e,t){return d=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},d(e,t)}function l(e,t){if(t&&("object"===s(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return u(e)}function u(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function h(e){return h=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},h(e)}var p=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:true,configurable:true}}),Object.defineProperty(e,"prototype",{writable:false}),t&&d(e,t);}(p,e);var t,n,o,r,i,s=(r=p,i=function(){if("undefined"==typeof Reflect||!Reflect.construct)return  false;if(Reflect.construct.sham)return  false;if("function"==typeof Proxy)return  true;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return  false}}(),function(){var e,t=h(r);if(i){var n=h(this).constructor;e=Reflect.construct(t,arguments,n);}else e=t.apply(this,arguments);return l(this,e)});function p(e,t){var n,o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};return a(this,p),(n=s.call(this)).index=e,n.options=n.constructor.resolveOptions(o),n.sticks=new Array(Math.ceil(t.axes.length/2)).fill(null).map((function(){return [null,null]})),n.buttons=new Array(t.buttons.length).fill(null),n.updateStick=n.updateStick.bind(u(n)),n.updateButton=n.updateButton.bind(u(n)),n}return t=p,o=[{key:"resolveOptions",value:function(e){var t=void 0!==e.stick,n=void 0!==e.button,o={stick:this.optionResolver.resolve(t?e.stick:n?{}:e),button:this.optionResolver.resolve(n?e.button:t?{}:e)};return o.stick.deadZone=Math.max(Math.min(o.stick.deadZone,1),0),o.button.deadZone=Math.max(Math.min(o.button.deadZone,1),0),o.stick.precision=o.stick.precision?Math.pow(10,o.stick.precision):0,o.button.precision=o.button.precision?Math.pow(10,o.button.precision):0,o}}],(n=[{key:"update",value:function(e){for(var t=0,n=this.sticks.length,o=0;o<n;o++)for(var r=0;r<2;r++)this.updateStick(e,o,r,e.axes[t++]);var i=this.buttons.length;for(t=0;t<i;t++)this.updateButton(e,e.buttons[t],t);}},{key:"updateStick",value:function(e,t,n,o){var r=this.options.stick,i=r.deadZone,s=r.analog,a=r.precision;i&&o<i&&o>-i&&(o=0),s?a&&(o=Math.round(o*a)/a):o=o>0?1:o<0?-1:0,this.sticks[t][n]!==o&&(this.sticks[t][n]=o,this.emit("axis",{gamepad:e,stick:t,axis:n,value:o,index:this.index}));}},{key:"updateButton",value:function(e,t,n){var o=this.options.button,r=o.deadZone,i=o.analog,s=o.precision,a=t.value,c=t.pressed,d=a;r&&t.value<r&&t.value>-r&&(d=0),i?s&&(d=Math.round(d*s)/s):d=c?1:0,this.buttons[n]!==d&&(this.buttons[n]=d,this.emit("button",{gamepad:e,button:n,pressed:c,value:d,index:this.index}));}}])&&c(t.prototype,n),o&&c(t,o),Object.defineProperty(t,"prototype",{writable:false}),p}(t());function f(e){return f="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},f(e)}p.optionResolver=(new(i())).setDefaults({analog:true,deadZone:0,precision:0}).setTypes({analog:"boolean",deadZone:"number",precision:"number"});var m=function(){function e(t){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e),this.callback=t,this.frame=null,this.update=this.update.bind(this);}var t,n;return t=e,(n=[{key:"setCallback",value:function(e){this.callback=e;}},{key:"start",value:function(){this.frame||(this.frame=window.requestAnimationFrame(this.update));}},{key:"stop",value:function(){this.frame&&(window.cancelAnimationFrame(this.frame),this.frame=null);}},{key:"update",value:function(){this.frame=window.requestAnimationFrame(this.update),this.callback();}}])&&function(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||false,o.configurable=true,"value"in o&&(o.writable=true),Object.defineProperty(e,(r=function(e,t){if("object"!==f(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,"string");if("object"!==f(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(o.key),"symbol"===f(r)?r:String(r)),o);}var r;}(t.prototype,n),Object.defineProperty(t,"prototype",{writable:false}),e}();function v(e){return v="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},v(e)}function g(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function y(e,t){return y=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},y(e,t)}function b(e,t){if(t&&("object"===v(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return k(e)}function k(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function S(e){return S=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},S(e)}var C=function(e){!function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:true,configurable:true}}),Object.defineProperty(e,"prototype",{writable:false}),t&&y(e,t);}(s,e);var t,n,o,r,i=(o=s,r=function(){if("undefined"==typeof Reflect||!Reflect.construct)return  false;if(Reflect.construct.sham)return  false;if("function"==typeof Proxy)return  true;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return  false}}(),function(){var e,t=S(o);if(r){var n=S(this).constructor;e=Reflect.construct(t,arguments,n);}else e=t.apply(this,arguments);return b(this,e)});function s(){var e,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(g(this,s),e=i.call(this),"function"!=typeof navigator.getGamepads)throw new Error("This browser does not support gamepad API.");return e.options=t,e.onAxis=e.onAxis.bind(k(e)),e.update=e.update.bind(k(e)),e.start=e.start.bind(k(e)),e.stop=e.stop.bind(k(e)),e.discover=e.discover.bind(k(e)),e.onButton=e.onButton.bind(k(e)),e.handlers=new Array(4).fill(null),e.loop=new m(e.update),window.addEventListener("error",e.stop),e}return t=s,(n=[{key:"start",value:function(){this.loop.start();}},{key:"stop",value:function(){this.loop.stop();}},{key:"update",value:function(){var e=navigator.getGamepads();this.discover(e[0],0),this.discover(e[1],1),this.discover(e[2],2),this.discover(e[3],3);}},{key:"discover",value:function(e,t){e?(this.handlers[t]||this.registerHandler(t,e),this.handlers[t].update(e)):this.handlers[t]&&this.removeGamepad(t);}},{key:"registerHandler",value:function(e,t){if(this.handlers[e])throw new Error("Gamepad #".concat(e," is already registered."));var n=new p(e,t,this.options);this.handlers[e]=n,n.addEventListener("axis",this.onAxis),n.addEventListener("button",this.onButton),this.emit("gamepad:connected",{index:e,gamepad:t}),this.emit("gamepad:".concat(e,":connected"),{index:e,gamepad:t});}},{key:"removeGamepad",value:function(e){if(!this.handlers[e])throw new Error("Gamepad #".concat(e," is not registered."));this.handlers[e].removeEventListener("axis",this.onAxis),this.handlers[e].removeEventListener("button",this.onButton),this.handlers[e]=null,this.emit("gamepad:disconnected",{index:e}),this.emit("gamepad:".concat(e,":disconnected"),{index:e});}},{key:"onAxis",value:function(e){var t=e.detail.index;this.emit("gamepad:axis",e.detail),this.emit("gamepad:".concat(t,":axis"),e.detail),this.emit("gamepad:".concat(t,":axis:").concat(e.detail.axis),e.detail);}},{key:"onButton",value:function(e){var t=e.detail.index;this.emit("gamepad:button",e.detail),this.emit("gamepad:".concat(t,":button"),e.detail),this.emit("gamepad:".concat(t,":button:").concat(e.detail.button),e.detail);}}])&&function(e,t){for(var n=0;n<t.length;n++){var o=t[n];o.enumerable=o.enumerable||false,o.configurable=true,"value"in o&&(o.writable=true),Object.defineProperty(e,(r=function(e,t){if("object"!==v(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var o=n.call(e,"string");if("object"!==v(o))return o;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(o.key),"symbol"===v(r)?r:String(r)),o);}var r;}(t.prototype,n),Object.defineProperty(t,"prototype",{writable:false}),s}(t());})(),o})(),e.exports=t();},809:e=>{function t(e){return !!e.constructor&&"function"==typeof e.constructor.isBuffer&&e.constructor.isBuffer(e)}e.exports=function(e){return null!=e&&(t(e)||function(e){return "function"==typeof e.readFloatLE&&"function"==typeof e.slice&&t(e.slice(0,0))}(e)||!!e._isBuffer)};},586:(e,t,n)=>{var o,r,i,s,a;o=n(677),r=n(943).utf8,i=n(809),s=n(943).bin,(a=function(e,t){e.constructor==String?e=t&&"binary"===t.encoding?s.stringToBytes(e):r.stringToBytes(e):i(e)?e=Array.prototype.slice.call(e,0):Array.isArray(e)||e.constructor===Uint8Array||(e=e.toString());for(var n=o.bytesToWords(e),c=8*e.length,d=1732584193,l=-271733879,u=-1732584194,h=271733878,p=0;p<n.length;p++)n[p]=16711935&(n[p]<<8|n[p]>>>24)|4278255360&(n[p]<<24|n[p]>>>8);n[c>>>5]|=128<<c%32,n[14+(c+64>>>9<<4)]=c;var f=a._ff,m=a._gg,v=a._hh,g=a._ii;for(p=0;p<n.length;p+=16){var y=d,b=l,k=u,S=h;d=f(d,l,u,h,n[p+0],7,-680876936),h=f(h,d,l,u,n[p+1],12,-389564586),u=f(u,h,d,l,n[p+2],17,606105819),l=f(l,u,h,d,n[p+3],22,-1044525330),d=f(d,l,u,h,n[p+4],7,-176418897),h=f(h,d,l,u,n[p+5],12,1200080426),u=f(u,h,d,l,n[p+6],17,-1473231341),l=f(l,u,h,d,n[p+7],22,-45705983),d=f(d,l,u,h,n[p+8],7,1770035416),h=f(h,d,l,u,n[p+9],12,-1958414417),u=f(u,h,d,l,n[p+10],17,-42063),l=f(l,u,h,d,n[p+11],22,-1990404162),d=f(d,l,u,h,n[p+12],7,1804603682),h=f(h,d,l,u,n[p+13],12,-40341101),u=f(u,h,d,l,n[p+14],17,-1502002290),d=m(d,l=f(l,u,h,d,n[p+15],22,1236535329),u,h,n[p+1],5,-165796510),h=m(h,d,l,u,n[p+6],9,-1069501632),u=m(u,h,d,l,n[p+11],14,643717713),l=m(l,u,h,d,n[p+0],20,-373897302),d=m(d,l,u,h,n[p+5],5,-701558691),h=m(h,d,l,u,n[p+10],9,38016083),u=m(u,h,d,l,n[p+15],14,-660478335),l=m(l,u,h,d,n[p+4],20,-405537848),d=m(d,l,u,h,n[p+9],5,568446438),h=m(h,d,l,u,n[p+14],9,-1019803690),u=m(u,h,d,l,n[p+3],14,-187363961),l=m(l,u,h,d,n[p+8],20,1163531501),d=m(d,l,u,h,n[p+13],5,-1444681467),h=m(h,d,l,u,n[p+2],9,-51403784),u=m(u,h,d,l,n[p+7],14,1735328473),d=v(d,l=m(l,u,h,d,n[p+12],20,-1926607734),u,h,n[p+5],4,-378558),h=v(h,d,l,u,n[p+8],11,-2022574463),u=v(u,h,d,l,n[p+11],16,1839030562),l=v(l,u,h,d,n[p+14],23,-35309556),d=v(d,l,u,h,n[p+1],4,-1530992060),h=v(h,d,l,u,n[p+4],11,1272893353),u=v(u,h,d,l,n[p+7],16,-155497632),l=v(l,u,h,d,n[p+10],23,-1094730640),d=v(d,l,u,h,n[p+13],4,681279174),h=v(h,d,l,u,n[p+0],11,-358537222),u=v(u,h,d,l,n[p+3],16,-722521979),l=v(l,u,h,d,n[p+6],23,76029189),d=v(d,l,u,h,n[p+9],4,-640364487),h=v(h,d,l,u,n[p+12],11,-421815835),u=v(u,h,d,l,n[p+15],16,530742520),d=g(d,l=v(l,u,h,d,n[p+2],23,-995338651),u,h,n[p+0],6,-198630844),h=g(h,d,l,u,n[p+7],10,1126891415),u=g(u,h,d,l,n[p+14],15,-1416354905),l=g(l,u,h,d,n[p+5],21,-57434055),d=g(d,l,u,h,n[p+12],6,1700485571),h=g(h,d,l,u,n[p+3],10,-1894986606),u=g(u,h,d,l,n[p+10],15,-1051523),l=g(l,u,h,d,n[p+1],21,-2054922799),d=g(d,l,u,h,n[p+8],6,1873313359),h=g(h,d,l,u,n[p+15],10,-30611744),u=g(u,h,d,l,n[p+6],15,-1560198380),l=g(l,u,h,d,n[p+13],21,1309151649),d=g(d,l,u,h,n[p+4],6,-145523070),h=g(h,d,l,u,n[p+11],10,-1120210379),u=g(u,h,d,l,n[p+2],15,718787259),l=g(l,u,h,d,n[p+9],21,-343485551),d=d+y>>>0,l=l+b>>>0,u=u+k>>>0,h=h+S>>>0;}return o.endian([d,l,u,h])})._ff=function(e,t,n,o,r,i,s){var a=e+(t&n|~t&o)+(r>>>0)+s;return (a<<i|a>>>32-i)+t},a._gg=function(e,t,n,o,r,i,s){var a=e+(t&o|n&~o)+(r>>>0)+s;return (a<<i|a>>>32-i)+t},a._hh=function(e,t,n,o,r,i,s){var a=e+(t^n^o)+(r>>>0)+s;return (a<<i|a>>>32-i)+t},a._ii=function(e,t,n,o,r,i,s){var a=e+(n^(t|~o))+(r>>>0)+s;return (a<<i|a>>>32-i)+t},a._blocksize=16,a._digestsize=16,e.exports=function(e,t){if(null==e)throw new Error("Illegal argument "+e);var n=o.wordsToBytes(a(e,t));return t&&t.asBytes?n:t&&t.asString?s.bytesToString(n):o.bytesToHex(n)};},23:function(e,t,n){var o;e=n.nmd(e),function(){var r={function:true,object:true},i=r[typeof window]&&window||this,s=r[typeof t]&&t,a=e&&!e.nodeType&&e,c=s&&a&&"object"==typeof n.g&&n.g;!c||c.global!==c&&c.window!==c&&c.self!==c||(i=c);var d=Math.pow(2,53)-1,l=/\bOpera/,u=Object.prototype,h=u.hasOwnProperty,p=u.toString;function f(e){return (e=String(e)).charAt(0).toUpperCase()+e.slice(1)}function m(e){return e=k(e),/^(?:webOS|i(?:OS|P))/.test(e)?e:f(e)}function v(e,t){for(var n in e)h.call(e,n)&&t(e[n],n,e);}function g(e){return null==e?f(e):p.call(e).slice(8,-1)}function y(e){return String(e).replace(/([ -])(?!$)/g,"$1?")}function b(e,t){var n=null;return function(e,t){var n=-1,o=e?e.length:0;if("number"==typeof o&&o>-1&&o<=d)for(;++n<o;)t(e[n],n);else v(e,t);}(e,(function(o,r){n=t(n,o,r,e);})),n}function k(e){return String(e).replace(/^ +| +$/g,"")}var S=function e(t){var n=i,o=t&&"object"==typeof t&&"String"!=g(t);o&&(n=t,t=null);var r=n.navigator||{},s=r.userAgent||"";t||(t=s);var a,c,d,u,h=o?!!r.likeChrome:/\bChrome\b/.test(t)&&!/internal|\n/i.test(p.toString()),f="Object",S=o?f:"ScriptBridgingProxyObject",C=o?f:"Environment",w=o&&n.java?"JavaPackage":g(n.java),T=o?f:"RuntimeObject",E=/\bJava/.test(w)&&n.java,_=E&&g(n.environment)==C,R=E?"a":"α",M=E?"b":"β",D=n.document||{},I=n.operamini||n.opera,P=l.test(P=o&&I?I["[[Class]]"]:g(I))?P:I=null,x=t,O=[],A=null,L=t==s,G=L&&I&&"function"==typeof I.version&&I.version(),B=b([{label:"EdgeHTML",pattern:"Edge"},"Trident",{label:"WebKit",pattern:"AppleWebKit"},"iCab","Presto","NetFront","Tasman","KHTML","Gecko"],(function(e,n){return e||RegExp("\\b"+(n.pattern||y(n))+"\\b","i").exec(t)&&(n.label||n)})),j=b(["Adobe AIR","Arora","Avant Browser","Breach","Camino","Electron","Epiphany","Fennec","Flock","Galeon","GreenBrowser","iCab","Iceweasel","K-Meleon","Konqueror","Lunascape","Maxthon",{label:"Microsoft Edge",pattern:"(?:Edge|Edg|EdgA|EdgiOS)"},"Midori","Nook Browser","PaleMoon","PhantomJS","Raven","Rekonq","RockMelt",{label:"Samsung Internet",pattern:"SamsungBrowser"},"SeaMonkey",{label:"Silk",pattern:"(?:Cloud9|Silk-Accelerated)"},"Sleipnir","SlimBrowser",{label:"SRWare Iron",pattern:"Iron"},"Sunrise","Swiftfox","Vivaldi","Waterfox","WebPositive",{label:"Yandex Browser",pattern:"YaBrowser"},{label:"UC Browser",pattern:"UCBrowser"},"Opera Mini",{label:"Opera Mini",pattern:"OPiOS"},"Opera",{label:"Opera",pattern:"OPR"},"Chromium","Chrome",{label:"Chrome",pattern:"(?:HeadlessChrome)"},{label:"Chrome Mobile",pattern:"(?:CriOS|CrMo)"},{label:"Firefox",pattern:"(?:Firefox|Minefield)"},{label:"Firefox for iOS",pattern:"FxiOS"},{label:"IE",pattern:"IEMobile"},{label:"IE",pattern:"MSIE"},"Safari"],(function(e,n){return e||RegExp("\\b"+(n.pattern||y(n))+"\\b","i").exec(t)&&(n.label||n)})),F=U([{label:"BlackBerry",pattern:"BB10"},"BlackBerry",{label:"Galaxy S",pattern:"GT-I9000"},{label:"Galaxy S2",pattern:"GT-I9100"},{label:"Galaxy S3",pattern:"GT-I9300"},{label:"Galaxy S4",pattern:"GT-I9500"},{label:"Galaxy S5",pattern:"SM-G900"},{label:"Galaxy S6",pattern:"SM-G920"},{label:"Galaxy S6 Edge",pattern:"SM-G925"},{label:"Galaxy S7",pattern:"SM-G930"},{label:"Galaxy S7 Edge",pattern:"SM-G935"},"Google TV","Lumia","iPad","iPod","iPhone","Kindle",{label:"Kindle Fire",pattern:"(?:Cloud9|Silk-Accelerated)"},"Nexus","Nook","PlayBook","PlayStation Vita","PlayStation","TouchPad","Transformer",{label:"Wii U",pattern:"WiiU"},"Wii","Xbox One",{label:"Xbox 360",pattern:"Xbox"},"Xoom"]),N=b({Apple:{iPad:1,iPhone:1,iPod:1},Alcatel:{},Archos:{},Amazon:{Kindle:1,"Kindle Fire":1},Asus:{Transformer:1},"Barnes & Noble":{Nook:1},BlackBerry:{PlayBook:1},Google:{"Google TV":1,Nexus:1},HP:{TouchPad:1},HTC:{},Huawei:{},Lenovo:{},LG:{},Microsoft:{Xbox:1,"Xbox One":1},Motorola:{Xoom:1},Nintendo:{"Wii U":1,Wii:1},Nokia:{Lumia:1},Oppo:{},Samsung:{"Galaxy S":1,"Galaxy S2":1,"Galaxy S3":1,"Galaxy S4":1},Sony:{PlayStation:1,"PlayStation Vita":1},Xiaomi:{Mi:1,Redmi:1}},(function(e,n,o){return e||(n[F]||n[/^[a-z]+(?: +[a-z]+\b)*/i.exec(F)]||RegExp("\\b"+y(o)+"(?:\\b|\\w*\\d)","i").exec(t))&&o})),W=b(["Windows Phone","KaiOS","Android","CentOS",{label:"Chrome OS",pattern:"CrOS"},"Debian",{label:"DragonFly BSD",pattern:"DragonFly"},"Fedora","FreeBSD","Gentoo","Haiku","Kubuntu","Linux Mint","OpenBSD","Red Hat","SuSE","Ubuntu","Xubuntu","Cygwin","Symbian OS","hpwOS","webOS ","webOS","Tablet OS","Tizen","Linux","Mac OS X","Macintosh","Mac","Windows 98;","Windows "],(function(e,n){var o=n.pattern||y(n);return !e&&(e=RegExp("\\b"+o+"(?:/[\\d.]+|[ \\w.]*)","i").exec(t))&&(e=function(e,t,n){var o={"10.0":"10",6.4:"10 Technical Preview",6.3:"8.1",6.2:"8",6.1:"Server 2008 R2 / 7","6.0":"Server 2008 / Vista",5.2:"Server 2003 / XP 64-bit",5.1:"XP",5.01:"2000 SP1","5.0":"2000","4.0":"NT","4.90":"ME"};return t&&n&&/^Win/i.test(e)&&!/^Windows Phone /i.test(e)&&(o=o[/[\d.]+$/.exec(e)])&&(e="Windows "+o),e=String(e),t&&n&&(e=e.replace(RegExp(t,"i"),n)),m(e.replace(/ ce$/i," CE").replace(/\bhpw/i,"web").replace(/\bMacintosh\b/,"Mac OS").replace(/_PowerPC\b/i," OS").replace(/\b(OS X) [^ \d]+/i,"$1").replace(/\bMac (OS X)\b/,"$1").replace(/\/(\d)/," $1").replace(/_/g,".").replace(/(?: BePC|[ .]*fc[ \d.]+)$/i,"").replace(/\bx86\.64\b/gi,"x86_64").replace(/\b(Windows Phone) OS\b/,"$1").replace(/\b(Chrome OS \w+) [\d.]+\b/,"$1").split(" on ")[0])}(e,o,n.label||n)),e}));function U(e){return b(e,(function(e,n){var o=n.pattern||y(n);return !e&&(e=RegExp("\\b"+o+" *\\d+[.\\w_]*","i").exec(t)||RegExp("\\b"+o+" *\\w+-[\\w]*","i").exec(t)||RegExp("\\b"+o+"(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)","i").exec(t))&&((e=String(n.label&&!RegExp(o,"i").test(n.label)?n.label:e).split("/"))[1]&&!/[\d.]+/.test(e[0])&&(e[0]+=" "+e[1]),n=n.label||n,e=m(e[0].replace(RegExp(o,"i"),n).replace(RegExp("; *(?:"+n+"[_-])?","i")," ").replace(RegExp("("+n+")[-_.]?(\\w)","i"),"$1 $2"))),e}))}function q(e){return b(e,(function(e,n){return e||(RegExp(n+"(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)","i").exec(t)||0)[1]||null}))}if(B&&(B=[B]),/\bAndroid\b/.test(W)&&!F&&(a=/\bAndroid[^;]*;(.*?)(?:Build|\) AppleWebKit)\b/i.exec(t))&&(F=k(a[1]).replace(/^[a-z]{2}-[a-z]{2};\s*/i,"")||null),N&&!F?F=U([N]):N&&F&&(F=F.replace(RegExp("^("+y(N)+")[-_.\\s]","i"),N+" ").replace(RegExp("^("+y(N)+")[-_.]?(\\w)","i"),N+" $2")),(a=/\bGoogle TV\b/.exec(F))&&(F=a[0]),/\bSimulator\b/i.test(t)&&(F=(F?F+" ":"")+"Simulator"),"Opera Mini"==j&&/\bOPiOS\b/.test(t)&&O.push("running in Turbo/Uncompressed mode"),"IE"==j&&/\blike iPhone OS\b/.test(t)?(N=(a=e(t.replace(/like iPhone OS/,""))).manufacturer,F=a.product):/^iP/.test(F)?(j||(j="Safari"),W="iOS"+((a=/ OS ([\d_]+)/i.exec(t))?" "+a[1].replace(/_/g,"."):"")):"Konqueror"==j&&/^Linux\b/i.test(W)?W="Kubuntu":N&&"Google"!=N&&(/Chrome/.test(j)&&!/\bMobile Safari\b/i.test(t)||/\bVita\b/.test(F))||/\bAndroid\b/.test(W)&&/^Chrome/.test(j)&&/\bVersion\//i.test(t)?(j="Android Browser",W=/\bAndroid\b/.test(W)?W:"Android"):"Silk"==j?(/\bMobi/i.test(t)||(W="Android",O.unshift("desktop mode")),/Accelerated *= *true/i.test(t)&&O.unshift("accelerated")):"UC Browser"==j&&/\bUCWEB\b/.test(t)?O.push("speed mode"):"PaleMoon"==j&&(a=/\bFirefox\/([\d.]+)\b/.exec(t))?O.push("identifying as Firefox "+a[1]):"Firefox"==j&&(a=/\b(Mobile|Tablet|TV)\b/i.exec(t))?(W||(W="Firefox OS"),F||(F=a[1])):!j||(a=!/\bMinefield\b/i.test(t)&&/\b(?:Firefox|Safari)\b/.exec(j))?(j&&!F&&/[\/,]|^[^(]+?\)/.test(t.slice(t.indexOf(a+"/")+8))&&(j=null),(a=F||N||W)&&(F||N||/\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(W))&&(j=/[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(W)?W:a)+" Browser")):"Electron"==j&&(a=(/\bChrome\/([\d.]+)\b/.exec(t)||0)[1])&&O.push("Chromium "+a),G||(G=q(["(?:Cloud9|CriOS|CrMo|Edge|Edg|EdgA|EdgiOS|FxiOS|HeadlessChrome|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$)|UCBrowser|YaBrowser)","Version",y(j),"(?:Firefox|Minefield|NetFront)"])),(a=("iCab"==B&&parseFloat(G)>3?"WebKit":/\bOpera\b/.test(j)&&(/\bOPR\b/.test(t)?"Blink":"Presto"))||/\b(?:Midori|Nook|Safari)\b/i.test(t)&&!/^(?:Trident|EdgeHTML)$/.test(B)&&"WebKit"||!B&&/\bMSIE\b/i.test(t)&&("Mac OS"==W?"Tasman":"Trident")||"WebKit"==B&&/\bPlayStation\b(?! Vita\b)/i.test(j)&&"NetFront")&&(B=[a]),"IE"==j&&(a=(/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(t)||0)[1])?(j+=" Mobile",W="Windows Phone "+(/\+$/.test(a)?a:a+".x"),O.unshift("desktop mode")):/\bWPDesktop\b/i.test(t)?(j="IE Mobile",W="Windows Phone 8.x",O.unshift("desktop mode"),G||(G=(/\brv:([\d.]+)/.exec(t)||0)[1])):"IE"!=j&&"Trident"==B&&(a=/\brv:([\d.]+)/.exec(t))&&(j&&O.push("identifying as "+j+(G?" "+G:"")),j="IE",G=a[1]),L){if(u=null!=(d=n)?typeof d.global:"number",/^(?:boolean|number|string|undefined)$/.test(u)||"object"==u&&!d.global)g(a=n.runtime)==S?(j="Adobe AIR",W=a.flash.system.Capabilities.os):g(a=n.phantom)==T?(j="PhantomJS",G=(a=a.version||null)&&a.major+"."+a.minor+"."+a.patch):"number"==typeof D.documentMode&&(a=/\bTrident\/(\d+)/i.exec(t))?(G=[G,D.documentMode],(a=+a[1]+4)!=G[1]&&(O.push("IE "+G[1]+" mode"),B&&(B[1]=""),G[1]=a),G="IE"==j?String(G[1].toFixed(1)):G[0]):"number"==typeof D.documentMode&&/^(?:Chrome|Firefox)\b/.test(j)&&(O.push("masking as "+j+" "+G),j="IE",G="11.0",B=["Trident"],W="Windows");else if(E&&(x=(a=E.lang.System).getProperty("os.arch"),W=W||a.getProperty("os.name")+" "+a.getProperty("os.version")),_){try{G=n.require("ringo/engine").version.join("."),j="RingoJS";}catch(e){(a=n.system)&&a.global.system==n.system&&(j="Narwhal",W||(W=a[0].os||null));}j||(j="Rhino");}else "object"==typeof n.process&&!n.process.browser&&(a=n.process)&&("object"==typeof a.versions&&("string"==typeof a.versions.electron?(O.push("Node "+a.versions.node),j="Electron",G=a.versions.electron):"string"==typeof a.versions.nw&&(O.push("Chromium "+G,"Node "+a.versions.node),j="NW.js",G=a.versions.nw)),j||(j="Node.js",x=a.arch,W=a.platform,G=(G=/[\d.]+/.exec(a.version))?G[0]:null));W=W&&m(W);}if(G&&(a=/(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(G)||/(?:alpha|beta)(?: ?\d)?/i.exec(t+";"+(L&&r.appMinorVersion))||/\bMinefield\b/i.test(t)&&"a")&&(A=/b/i.test(a)?"beta":"alpha",G=G.replace(RegExp(a+"\\+?$"),"")+("beta"==A?M:R)+(/\d+\+?/.exec(a)||"")),"Fennec"==j||"Firefox"==j&&/\b(?:Android|Firefox OS|KaiOS)\b/.test(W))j="Firefox Mobile";else if("Maxthon"==j&&G)G=G.replace(/\.[\d.]+/,".x");else if(/\bXbox\b/i.test(F))"Xbox 360"==F&&(W=null),"Xbox 360"==F&&/\bIEMobile\b/.test(t)&&O.unshift("mobile mode");else if(!/^(?:Chrome|IE|Opera)$/.test(j)&&(!j||F||/Browser|Mobi/.test(j))||"Windows CE"!=W&&!/Mobi/i.test(t))if("IE"==j&&L)try{null===n.external&&O.unshift("platform preview");}catch(e){O.unshift("embedded");}else (/\bBlackBerry\b/.test(F)||/\bBB10\b/.test(t))&&(a=(RegExp(F.replace(/ +/g," *")+"/([.\\d]+)","i").exec(t)||0)[1]||G)?(W=((a=[a,/BB10/.test(t)])[1]?(F=null,N="BlackBerry"):"Device Software")+" "+a[0],G=null):this!=v&&"Wii"!=F&&(L&&I||/Opera/.test(j)&&/\b(?:MSIE|Firefox)\b/i.test(t)||"Firefox"==j&&/\bOS X (?:\d+\.){2,}/.test(W)||"IE"==j&&(W&&!/^Win/.test(W)&&G>5.5||/\bWindows XP\b/.test(W)&&G>8||8==G&&!/\bTrident\b/.test(t)))&&!l.test(a=e.call(v,t.replace(l,"")+";"))&&a.name&&(a="ing as "+a.name+((a=a.version)?" "+a:""),l.test(j)?(/\bIE\b/.test(a)&&"Mac OS"==W&&(W=null),a="identify"+a):(a="mask"+a,j=P?m(P.replace(/([a-z])([A-Z])/g,"$1 $2")):"Opera",/\bIE\b/.test(a)&&(W=null),L||(G=null)),B=["Presto"],O.push(a));else j+=" Mobile";(a=(/\bAppleWebKit\/([\d.]+\+?)/i.exec(t)||0)[1])&&(a=[parseFloat(a.replace(/\.(\d)$/,".0$1")),a],"Safari"==j&&"+"==a[1].slice(-1)?(j="WebKit Nightly",A="alpha",G=a[1].slice(0,-1)):G!=a[1]&&G!=(a[2]=(/\bSafari\/([\d.]+\+?)/i.exec(t)||0)[1])||(G=null),a[1]=(/\b(?:Headless)?Chrome\/([\d.]+)/i.exec(t)||0)[1],537.36==a[0]&&537.36==a[2]&&parseFloat(a[1])>=28&&"WebKit"==B&&(B=["Blink"]),L&&(h||a[1])?(B&&(B[1]="like Chrome"),a=a[1]||((a=a[0])<530?1:a<532?2:a<532.05?3:a<533?4:a<534.03?5:a<534.07?6:a<534.1?7:a<534.13?8:a<534.16?9:a<534.24?10:a<534.3?11:a<535.01?12:a<535.02?"13+":a<535.07?15:a<535.11?16:a<535.19?17:a<536.05?18:a<536.1?19:a<537.01?20:a<537.11?"21+":a<537.13?23:a<537.18?24:a<537.24?25:a<537.36?26:"Blink"!=B?"27":"28")):(B&&(B[1]="like Safari"),a=(a=a[0])<400?1:a<500?2:a<526?3:a<533?4:a<534?"4+":a<535?5:a<537?6:a<538?7:a<601?8:a<602?9:a<604?10:a<606?11:a<608?12:"12"),B&&(B[1]+=" "+(a+="number"==typeof a?".x":/[.+]/.test(a)?"":"+")),"Safari"==j&&(!G||parseInt(G)>45)?G=a:"Chrome"==j&&/\bHeadlessChrome/i.test(t)&&O.unshift("headless")),"Opera"==j&&(a=/\bzbov|zvav$/.exec(W))?(j+=" ",O.unshift("desktop mode"),"zvav"==a?(j+="Mini",G=null):j+="Mobile",W=W.replace(RegExp(" *"+a+"$"),"")):"Safari"==j&&/\bChrome\b/.exec(B&&B[1])?(O.unshift("desktop mode"),j="Chrome Mobile",G=null,/\bOS X\b/.test(W)?(N="Apple",W="iOS 4.3+"):W=null):/\bSRWare Iron\b/.test(j)&&!G&&(G=q("Chrome")),G&&0==G.indexOf(a=/[\d.]+$/.exec(W))&&t.indexOf("/"+a+"-")>-1&&(W=k(W.replace(a,""))),W&&-1!=W.indexOf(j)&&!RegExp(j+" OS").test(W)&&(W=W.replace(RegExp(" *"+y(j)+" *"),"")),B&&!/\b(?:Avant|Nook)\b/.test(j)&&(/Browser|Lunascape|Maxthon/.test(j)||"Safari"!=j&&/^iOS/.test(W)&&/\bSafari\b/.test(B[1])||/^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|SRWare Iron|Vivaldi|Web)/.test(j)&&B[1])&&(a=B[B.length-1])&&O.push(a),O.length&&(O=["("+O.join("; ")+")"]),N&&F&&F.indexOf(N)<0&&O.push("on "+N),F&&O.push((/^on /.test(O[O.length-1])?"":"on ")+F),W&&(a=/ ([\d.+]+)$/.exec(W),c=a&&"/"==W.charAt(W.length-a[0].length-1),W={architecture:32,family:a&&!c?W.replace(a[0],""):W,version:a?a[1]:null,toString:function(){var e=this.version;return this.family+(e&&!c?" "+e:"")+(64==this.architecture?" 64-bit":"")}}),(a=/\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(x))&&!/\bi686\b/i.test(x)?(W&&(W.architecture=64,W.family=W.family.replace(RegExp(" *"+a),"")),j&&(/\bWOW64\b/i.test(t)||L&&/\w(?:86|32)$/.test(r.cpuClass||r.platform)&&!/\bWin64; x64\b/i.test(t))&&O.unshift("32-bit")):W&&/^OS X/.test(W.family)&&"Chrome"==j&&parseFloat(G)>=39&&(W.architecture=64),t||(t=null);var V={};return V.description=t,V.layout=B&&B[0],V.manufacturer=N,V.name=j,V.prerelease=A,V.product=F,V.ua=t,V.version=j&&G,V.os=W||{architecture:null,family:null,version:null,toString:function(){return "null"}},V.parse=e,V.toString=function(){return this.description||""},V.version&&O.unshift(G),V.name&&O.unshift(j),W&&j&&(W!=String(W).split(" ")[0]||W!=j.split(" ")[0]&&!F)&&O.push(F?"("+W+")":"on "+W),O.length&&(V.description=O.join(" ")),V}();i.platform=S,void 0===(o=function(){return S}.call(t,n,t,e))||(e.exports=o);}.call(this);},226:(e,t,n)=>{var o=n(347);function r(e,t,n,r,i){var s=o.writeRtpDescription(e.kind,t);if(s+=o.writeIceParameters(e.iceGatherer.getLocalParameters()),s+=o.writeDtlsParameters(e.dtlsTransport.getLocalParameters(),"offer"===n?"actpass":i||"active"),s+="a=mid:"+e.mid+"\r\n",e.rtpSender&&e.rtpReceiver?s+="a=sendrecv\r\n":e.rtpSender?s+="a=sendonly\r\n":e.rtpReceiver?s+="a=recvonly\r\n":s+="a=inactive\r\n",e.rtpSender){var a=e.rtpSender._initialTrackId||e.rtpSender.track.id;e.rtpSender._initialTrackId=a;var c="msid:"+(r?r.id:"-")+" "+a+"\r\n";s+="a="+c,s+="a=ssrc:"+e.sendEncodingParameters[0].ssrc+" "+c,e.sendEncodingParameters[0].rtx&&(s+="a=ssrc:"+e.sendEncodingParameters[0].rtx.ssrc+" "+c,s+="a=ssrc-group:FID "+e.sendEncodingParameters[0].ssrc+" "+e.sendEncodingParameters[0].rtx.ssrc+"\r\n");}return s+="a=ssrc:"+e.sendEncodingParameters[0].ssrc+" cname:"+o.localCName+"\r\n",e.rtpSender&&e.sendEncodingParameters[0].rtx&&(s+="a=ssrc:"+e.sendEncodingParameters[0].rtx.ssrc+" cname:"+o.localCName+"\r\n"),s}function i(e,t){var n={codecs:[],headerExtensions:[],fecMechanisms:[]},o=function(e,t){e=parseInt(e,10);for(var n=0;n<t.length;n++)if(t[n].payloadType===e||t[n].preferredPayloadType===e)return t[n]},r=function(e,t,n,r){var i=o(e.parameters.apt,n),s=o(t.parameters.apt,r);return i&&s&&i.name.toLowerCase()===s.name.toLowerCase()};return e.codecs.forEach((function(o){for(var i=0;i<t.codecs.length;i++){var s=t.codecs[i];if(o.name.toLowerCase()===s.name.toLowerCase()&&o.clockRate===s.clockRate){if("rtx"===o.name.toLowerCase()&&o.parameters&&s.parameters.apt&&!r(o,s,e.codecs,t.codecs))continue;(s=JSON.parse(JSON.stringify(s))).numChannels=Math.min(o.numChannels,s.numChannels),n.codecs.push(s),s.rtcpFeedback=s.rtcpFeedback.filter((function(e){for(var t=0;t<o.rtcpFeedback.length;t++)if(o.rtcpFeedback[t].type===e.type&&o.rtcpFeedback[t].parameter===e.parameter)return  true;return  false}));break}}})),e.headerExtensions.forEach((function(e){for(var o=0;o<t.headerExtensions.length;o++){var r=t.headerExtensions[o];if(e.uri===r.uri){n.headerExtensions.push(r);break}}})),n}function s(e,t,n){return  -1!=={offer:{setLocalDescription:["stable","have-local-offer"],setRemoteDescription:["stable","have-remote-offer"]},answer:{setLocalDescription:["have-remote-offer","have-local-pranswer"],setRemoteDescription:["have-local-offer","have-remote-pranswer"]}}[t][e].indexOf(n)}function a(e,t){var n=e.getRemoteCandidates().find((function(e){return t.foundation===e.foundation&&t.ip===e.ip&&t.port===e.port&&t.priority===e.priority&&t.protocol===e.protocol&&t.type===e.type}));return n||e.addRemoteCandidate(t),!n}function c(e,t){var n=new Error(t);return n.name=e,n.code={NotSupportedError:9,InvalidStateError:11,InvalidAccessError:15,TypeError:void 0,OperationError:void 0}[e],n}e.exports=function(e,t){function n(t,n){n.addTrack(t),n.dispatchEvent(new e.MediaStreamTrackEvent("addtrack",{track:t}));}function d(t,n,o,r){var i=new Event("track");i.track=n,i.receiver=o,i.transceiver={receiver:o},i.streams=r,e.setTimeout((function(){t._dispatchEvent("track",i);}));}var l=function(n){var r=this,i=document.createDocumentFragment();if(["addEventListener","removeEventListener","dispatchEvent"].forEach((function(e){r[e]=i[e].bind(i);})),this.canTrickleIceCandidates=null,this.needNegotiation=false,this.localStreams=[],this.remoteStreams=[],this._localDescription=null,this._remoteDescription=null,this.signalingState="stable",this.iceConnectionState="new",this.connectionState="new",this.iceGatheringState="new",n=JSON.parse(JSON.stringify(n||{})),this.usingBundle="max-bundle"===n.bundlePolicy,"negotiate"===n.rtcpMuxPolicy)throw c("NotSupportedError","rtcpMuxPolicy 'negotiate' is not supported");switch(n.rtcpMuxPolicy||(n.rtcpMuxPolicy="require"),n.iceTransportPolicy){case "all":case "relay":break;default:n.iceTransportPolicy="all";}switch(n.bundlePolicy){case "balanced":case "max-compat":case "max-bundle":break;default:n.bundlePolicy="balanced";}if(n.iceServers=function(e,t){var n=false;return (e=JSON.parse(JSON.stringify(e))).filter((function(e){if(e&&(e.urls||e.url)){var o=e.urls||e.url;e.url&&!e.urls&&console.warn("RTCIceServer.url is deprecated! Use urls instead.");var r="string"==typeof o;return r&&(o=[o]),o=o.filter((function(e){return 0!==e.indexOf("turn:")||-1===e.indexOf("transport=udp")||-1!==e.indexOf("turn:[")||n?0===e.indexOf("stun:")&&t>=14393&&-1===e.indexOf("?transport=udp"):(n=true,true)})),delete e.url,e.urls=r?o[0]:o,!!o.length}}))}(n.iceServers||[],t),this._iceGatherers=[],n.iceCandidatePoolSize)for(var s=n.iceCandidatePoolSize;s>0;s--)this._iceGatherers.push(new e.RTCIceGatherer({iceServers:n.iceServers,gatherPolicy:n.iceTransportPolicy}));else n.iceCandidatePoolSize=0;this._config=n,this.transceivers=[],this._sdpSessionId=o.generateSessionId(),this._sdpSessionVersion=0,this._dtlsRole=void 0,this._isClosed=false;};Object.defineProperty(l.prototype,"localDescription",{configurable:true,get:function(){return this._localDescription}}),Object.defineProperty(l.prototype,"remoteDescription",{configurable:true,get:function(){return this._remoteDescription}}),l.prototype.onicecandidate=null,l.prototype.onaddstream=null,l.prototype.ontrack=null,l.prototype.onremovestream=null,l.prototype.onsignalingstatechange=null,l.prototype.oniceconnectionstatechange=null,l.prototype.onconnectionstatechange=null,l.prototype.onicegatheringstatechange=null,l.prototype.onnegotiationneeded=null,l.prototype.ondatachannel=null,l.prototype._dispatchEvent=function(e,t){this._isClosed||(this.dispatchEvent(t),"function"==typeof this["on"+e]&&this["on"+e](t));},l.prototype._emitGatheringStateChange=function(){var e=new Event("icegatheringstatechange");this._dispatchEvent("icegatheringstatechange",e);},l.prototype.getConfiguration=function(){return this._config},l.prototype.getLocalStreams=function(){return this.localStreams},l.prototype.getRemoteStreams=function(){return this.remoteStreams},l.prototype._createTransceiver=function(e,t){var n=this.transceivers.length>0,o={track:null,iceGatherer:null,iceTransport:null,dtlsTransport:null,localCapabilities:null,remoteCapabilities:null,rtpSender:null,rtpReceiver:null,kind:e,mid:null,sendEncodingParameters:null,recvEncodingParameters:null,stream:null,associatedRemoteMediaStreams:[],wantReceive:true};if(this.usingBundle&&n)o.iceTransport=this.transceivers[0].iceTransport,o.dtlsTransport=this.transceivers[0].dtlsTransport;else {var r=this._createIceAndDtlsTransports();o.iceTransport=r.iceTransport,o.dtlsTransport=r.dtlsTransport;}return t||this.transceivers.push(o),o},l.prototype.addTrack=function(t,n){if(this._isClosed)throw c("InvalidStateError","Attempted to call addTrack on a closed peerconnection.");var o;if(this.transceivers.find((function(e){return e.track===t})))throw c("InvalidAccessError","Track already exists.");for(var r=0;r<this.transceivers.length;r++)this.transceivers[r].track||this.transceivers[r].kind!==t.kind||(o=this.transceivers[r]);return o||(o=this._createTransceiver(t.kind)),this._maybeFireNegotiationNeeded(),-1===this.localStreams.indexOf(n)&&this.localStreams.push(n),o.track=t,o.stream=n,o.rtpSender=new e.RTCRtpSender(t,o.dtlsTransport),o.rtpSender},l.prototype.addStream=function(e){var n=this;if(t>=15025)e.getTracks().forEach((function(t){n.addTrack(t,e);}));else {var o=e.clone();e.getTracks().forEach((function(e,t){var n=o.getTracks()[t];e.addEventListener("enabled",(function(e){n.enabled=e.enabled;}));})),o.getTracks().forEach((function(e){n.addTrack(e,o);}));}},l.prototype.removeTrack=function(t){if(this._isClosed)throw c("InvalidStateError","Attempted to call removeTrack on a closed peerconnection.");if(!(t instanceof e.RTCRtpSender))throw new TypeError("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.");var n=this.transceivers.find((function(e){return e.rtpSender===t}));if(!n)throw c("InvalidAccessError","Sender was not created by this connection.");var o=n.stream;n.rtpSender.stop(),n.rtpSender=null,n.track=null,n.stream=null,-1===this.transceivers.map((function(e){return e.stream})).indexOf(o)&&this.localStreams.indexOf(o)>-1&&this.localStreams.splice(this.localStreams.indexOf(o),1),this._maybeFireNegotiationNeeded();},l.prototype.removeStream=function(e){var t=this;e.getTracks().forEach((function(e){var n=t.getSenders().find((function(t){return t.track===e}));n&&t.removeTrack(n);}));},l.prototype.getSenders=function(){return this.transceivers.filter((function(e){return !!e.rtpSender})).map((function(e){return e.rtpSender}))},l.prototype.getReceivers=function(){return this.transceivers.filter((function(e){return !!e.rtpReceiver})).map((function(e){return e.rtpReceiver}))},l.prototype._createIceGatherer=function(t,n){var o=this;if(n&&t>0)return this.transceivers[0].iceGatherer;if(this._iceGatherers.length)return this._iceGatherers.shift();var r=new e.RTCIceGatherer({iceServers:this._config.iceServers,gatherPolicy:this._config.iceTransportPolicy});return Object.defineProperty(r,"state",{value:"new",writable:true}),this.transceivers[t].bufferedCandidateEvents=[],this.transceivers[t].bufferCandidates=function(e){var n=!e.candidate||0===Object.keys(e.candidate).length;r.state=n?"completed":"gathering",null!==o.transceivers[t].bufferedCandidateEvents&&o.transceivers[t].bufferedCandidateEvents.push(e);},r.addEventListener("localcandidate",this.transceivers[t].bufferCandidates),r},l.prototype._gather=function(t,n){var r=this,i=this.transceivers[n].iceGatherer;if(!i.onlocalcandidate){var s=this.transceivers[n].bufferedCandidateEvents;this.transceivers[n].bufferedCandidateEvents=null,i.removeEventListener("localcandidate",this.transceivers[n].bufferCandidates),i.onlocalcandidate=function(e){if(!(r.usingBundle&&n>0)){var s=new Event("icecandidate");s.candidate={sdpMid:t,sdpMLineIndex:n};var a=e.candidate,c=!a||0===Object.keys(a).length;if(c)"new"!==i.state&&"gathering"!==i.state||(i.state="completed");else {"new"===i.state&&(i.state="gathering"),a.component=1,a.ufrag=i.getLocalParameters().usernameFragment;var d=o.writeCandidate(a);s.candidate=Object.assign(s.candidate,o.parseCandidate(d)),s.candidate.candidate=d,s.candidate.toJSON=function(){return {candidate:s.candidate.candidate,sdpMid:s.candidate.sdpMid,sdpMLineIndex:s.candidate.sdpMLineIndex,usernameFragment:s.candidate.usernameFragment}};}var l=o.getMediaSections(r._localDescription.sdp);l[s.candidate.sdpMLineIndex]+=c?"a=end-of-candidates\r\n":"a="+s.candidate.candidate+"\r\n",r._localDescription.sdp=o.getDescription(r._localDescription.sdp)+l.join("");var u=r.transceivers.every((function(e){return e.iceGatherer&&"completed"===e.iceGatherer.state}));"gathering"!==r.iceGatheringState&&(r.iceGatheringState="gathering",r._emitGatheringStateChange()),c||r._dispatchEvent("icecandidate",s),u&&(r._dispatchEvent("icecandidate",new Event("icecandidate")),r.iceGatheringState="complete",r._emitGatheringStateChange());}},e.setTimeout((function(){s.forEach((function(e){i.onlocalcandidate(e);}));}),0);}},l.prototype._createIceAndDtlsTransports=function(){var t=this,n=new e.RTCIceTransport(null);n.onicestatechange=function(){t._updateIceConnectionState(),t._updateConnectionState();};var o=new e.RTCDtlsTransport(n);return o.ondtlsstatechange=function(){t._updateConnectionState();},o.onerror=function(){Object.defineProperty(o,"state",{value:"failed",writable:true}),t._updateConnectionState();},{iceTransport:n,dtlsTransport:o}},l.prototype._disposeIceAndDtlsTransports=function(e){var t=this.transceivers[e].iceGatherer;t&&(delete t.onlocalcandidate,delete this.transceivers[e].iceGatherer);var n=this.transceivers[e].iceTransport;n&&(delete n.onicestatechange,delete this.transceivers[e].iceTransport);var o=this.transceivers[e].dtlsTransport;o&&(delete o.ondtlsstatechange,delete o.onerror,delete this.transceivers[e].dtlsTransport);},l.prototype._transceive=function(e,n,r){var s=i(e.localCapabilities,e.remoteCapabilities);n&&e.rtpSender&&(s.encodings=e.sendEncodingParameters,s.rtcp={cname:o.localCName,compound:e.rtcpParameters.compound},e.recvEncodingParameters.length&&(s.rtcp.ssrc=e.recvEncodingParameters[0].ssrc),e.rtpSender.send(s)),r&&e.rtpReceiver&&s.codecs.length>0&&("video"===e.kind&&e.recvEncodingParameters&&t<15019&&e.recvEncodingParameters.forEach((function(e){delete e.rtx;})),e.recvEncodingParameters.length?s.encodings=e.recvEncodingParameters:s.encodings=[{}],s.rtcp={compound:e.rtcpParameters.compound},e.rtcpParameters.cname&&(s.rtcp.cname=e.rtcpParameters.cname),e.sendEncodingParameters.length&&(s.rtcp.ssrc=e.sendEncodingParameters[0].ssrc),e.rtpReceiver.receive(s));},l.prototype.setLocalDescription=function(e){var t,n,r=this;if(-1===["offer","answer"].indexOf(e.type))return Promise.reject(c("TypeError",'Unsupported type "'+e.type+'"'));if(!s("setLocalDescription",e.type,r.signalingState)||r._isClosed)return Promise.reject(c("InvalidStateError","Can not set local "+e.type+" in state "+r.signalingState));if("offer"===e.type)t=o.splitSections(e.sdp),n=t.shift(),t.forEach((function(e,t){var n=o.parseRtpParameters(e);r.transceivers[t].localCapabilities=n;})),r.transceivers.forEach((function(e,t){r._gather(e.mid,t);}));else if("answer"===e.type){t=o.splitSections(r._remoteDescription.sdp),n=t.shift();var a=o.matchPrefix(n,"a=ice-lite").length>0;t.forEach((function(e,t){var s=r.transceivers[t],c=s.iceGatherer,d=s.iceTransport,l=s.dtlsTransport,u=s.localCapabilities,h=s.remoteCapabilities;if(!(o.isRejected(e)&&0===o.matchPrefix(e,"a=bundle-only").length||s.rejected)){var p=o.getIceParameters(e,n),f=o.getDtlsParameters(e,n);a&&(f.role="server"),r.usingBundle&&0!==t||(r._gather(s.mid,t),"new"===d.state&&d.start(c,p,a?"controlling":"controlled"),"new"===l.state&&l.start(f));var m=i(u,h);r._transceive(s,m.codecs.length>0,false);}}));}return r._localDescription={type:e.type,sdp:e.sdp},"offer"===e.type?r._updateSignalingState("have-local-offer"):r._updateSignalingState("stable"),Promise.resolve()},l.prototype.setRemoteDescription=function(r){var l=this;if(-1===["offer","answer"].indexOf(r.type))return Promise.reject(c("TypeError",'Unsupported type "'+r.type+'"'));if(!s("setRemoteDescription",r.type,l.signalingState)||l._isClosed)return Promise.reject(c("InvalidStateError","Can not set remote "+r.type+" in state "+l.signalingState));var u={};l.remoteStreams.forEach((function(e){u[e.id]=e;}));var h=[],p=o.splitSections(r.sdp),f=p.shift(),m=o.matchPrefix(f,"a=ice-lite").length>0,v=o.matchPrefix(f,"a=group:BUNDLE ").length>0;l.usingBundle=v;var g=o.matchPrefix(f,"a=ice-options:")[0];return l.canTrickleIceCandidates=!!g&&g.substr(14).split(" ").indexOf("trickle")>=0,p.forEach((function(s,c){var d=o.splitLines(s),p=o.getKind(s),g=o.isRejected(s)&&0===o.matchPrefix(s,"a=bundle-only").length,y=d[0].substr(2).split(" ")[2],b=o.getDirection(s,f),k=o.parseMsid(s),S=o.getMid(s)||o.generateIdentifier();if(g||"application"===p&&("DTLS/SCTP"===y||"UDP/DTLS/SCTP"===y))l.transceivers[c]={mid:S,kind:p,protocol:y,rejected:true};else {var C,w,T,E,_,R,M,D,I;!g&&l.transceivers[c]&&l.transceivers[c].rejected&&(l.transceivers[c]=l._createTransceiver(p,true));var P,x,O=o.parseRtpParameters(s);g||(P=o.getIceParameters(s,f),(x=o.getDtlsParameters(s,f)).role="client"),M=o.parseRtpEncodingParameters(s);var A=o.parseRtcpParameters(s),L=o.matchPrefix(s,"a=end-of-candidates",f).length>0,G=o.matchPrefix(s,"a=candidate:").map((function(e){return o.parseCandidate(e)})).filter((function(e){return 1===e.component}));if(("offer"===r.type||"answer"===r.type)&&!g&&v&&c>0&&l.transceivers[c]&&(l._disposeIceAndDtlsTransports(c),l.transceivers[c].iceGatherer=l.transceivers[0].iceGatherer,l.transceivers[c].iceTransport=l.transceivers[0].iceTransport,l.transceivers[c].dtlsTransport=l.transceivers[0].dtlsTransport,l.transceivers[c].rtpSender&&l.transceivers[c].rtpSender.setTransport(l.transceivers[0].dtlsTransport),l.transceivers[c].rtpReceiver&&l.transceivers[c].rtpReceiver.setTransport(l.transceivers[0].dtlsTransport)),"offer"!==r.type||g)"answer"!==r.type||g||(w=(C=l.transceivers[c]).iceGatherer,T=C.iceTransport,E=C.dtlsTransport,_=C.rtpReceiver,R=C.sendEncodingParameters,D=C.localCapabilities,l.transceivers[c].recvEncodingParameters=M,l.transceivers[c].remoteCapabilities=O,l.transceivers[c].rtcpParameters=A,G.length&&"new"===T.state&&(!m&&!L||v&&0!==c?G.forEach((function(e){a(C.iceTransport,e);})):T.setRemoteCandidates(G)),v&&0!==c||("new"===T.state&&T.start(w,P,"controlling"),"new"===E.state&&E.start(x)),!i(C.localCapabilities,C.remoteCapabilities).codecs.filter((function(e){return "rtx"===e.name.toLowerCase()})).length&&C.sendEncodingParameters[0].rtx&&delete C.sendEncodingParameters[0].rtx,l._transceive(C,"sendrecv"===b||"recvonly"===b,"sendrecv"===b||"sendonly"===b),!_||"sendrecv"!==b&&"sendonly"!==b?delete C.rtpReceiver:(I=_.track,k?(u[k.stream]||(u[k.stream]=new e.MediaStream),n(I,u[k.stream]),h.push([I,_,u[k.stream]])):(u.default||(u.default=new e.MediaStream),n(I,u.default),h.push([I,_,u.default]))));else {(C=l.transceivers[c]||l._createTransceiver(p)).mid=S,C.iceGatherer||(C.iceGatherer=l._createIceGatherer(c,v)),G.length&&"new"===C.iceTransport.state&&(!L||v&&0!==c?G.forEach((function(e){a(C.iceTransport,e);})):C.iceTransport.setRemoteCandidates(G)),D=e.RTCRtpReceiver.getCapabilities(p),t<15019&&(D.codecs=D.codecs.filter((function(e){return "rtx"!==e.name}))),R=C.sendEncodingParameters||[{ssrc:1001*(2*c+2)}];var B,j=false;"sendrecv"===b||"sendonly"===b?(j=!C.rtpReceiver,_=C.rtpReceiver||new e.RTCRtpReceiver(C.dtlsTransport,p),j&&(I=_.track,k&&"-"===k.stream||(k?(u[k.stream]||(u[k.stream]=new e.MediaStream,Object.defineProperty(u[k.stream],"id",{get:function(){return k.stream}})),Object.defineProperty(I,"id",{get:function(){return k.track}}),B=u[k.stream]):(u.default||(u.default=new e.MediaStream),B=u.default)),B&&(n(I,B),C.associatedRemoteMediaStreams.push(B)),h.push([I,_,B]))):C.rtpReceiver&&C.rtpReceiver.track&&(C.associatedRemoteMediaStreams.forEach((function(t){var n=t.getTracks().find((function(e){return e.id===C.rtpReceiver.track.id}));n&&function(t,n){n.removeTrack(t),n.dispatchEvent(new e.MediaStreamTrackEvent("removetrack",{track:t}));}(n,t);})),C.associatedRemoteMediaStreams=[]),C.localCapabilities=D,C.remoteCapabilities=O,C.rtpReceiver=_,C.rtcpParameters=A,C.sendEncodingParameters=R,C.recvEncodingParameters=M,l._transceive(l.transceivers[c],false,j);}}})),void 0===l._dtlsRole&&(l._dtlsRole="offer"===r.type?"active":"passive"),l._remoteDescription={type:r.type,sdp:r.sdp},"offer"===r.type?l._updateSignalingState("have-remote-offer"):l._updateSignalingState("stable"),Object.keys(u).forEach((function(t){var n=u[t];if(n.getTracks().length){if(-1===l.remoteStreams.indexOf(n)){l.remoteStreams.push(n);var o=new Event("addstream");o.stream=n,e.setTimeout((function(){l._dispatchEvent("addstream",o);}));}h.forEach((function(e){var t=e[0],o=e[1];n.id===e[2].id&&d(l,t,o,[n]);}));}})),h.forEach((function(e){e[2]||d(l,e[0],e[1],[]);})),e.setTimeout((function(){l&&l.transceivers&&l.transceivers.forEach((function(e){e.iceTransport&&"new"===e.iceTransport.state&&e.iceTransport.getRemoteCandidates().length>0&&(console.warn("Timeout for addRemoteCandidate. Consider sending an end-of-candidates notification"),e.iceTransport.addRemoteCandidate({}));}));}),4e3),Promise.resolve()},l.prototype.close=function(){this.transceivers.forEach((function(e){e.iceTransport&&e.iceTransport.stop(),e.dtlsTransport&&e.dtlsTransport.stop(),e.rtpSender&&e.rtpSender.stop(),e.rtpReceiver&&e.rtpReceiver.stop();})),this._isClosed=true,this._updateSignalingState("closed");},l.prototype._updateSignalingState=function(e){this.signalingState=e;var t=new Event("signalingstatechange");this._dispatchEvent("signalingstatechange",t);},l.prototype._maybeFireNegotiationNeeded=function(){var t=this;"stable"===this.signalingState&&true!==this.needNegotiation&&(this.needNegotiation=true,e.setTimeout((function(){if(t.needNegotiation){t.needNegotiation=false;var e=new Event("negotiationneeded");t._dispatchEvent("negotiationneeded",e);}}),0));},l.prototype._updateIceConnectionState=function(){var e,t={new:0,closed:0,checking:0,connected:0,completed:0,disconnected:0,failed:0};if(this.transceivers.forEach((function(e){e.iceTransport&&!e.rejected&&t[e.iceTransport.state]++;})),e="new",t.failed>0?e="failed":t.checking>0?e="checking":t.disconnected>0?e="disconnected":t.new>0?e="new":t.connected>0?e="connected":t.completed>0&&(e="completed"),e!==this.iceConnectionState){this.iceConnectionState=e;var n=new Event("iceconnectionstatechange");this._dispatchEvent("iceconnectionstatechange",n);}},l.prototype._updateConnectionState=function(){var e,t={new:0,closed:0,connecting:0,connected:0,completed:0,disconnected:0,failed:0};if(this.transceivers.forEach((function(e){e.iceTransport&&e.dtlsTransport&&!e.rejected&&(t[e.iceTransport.state]++,t[e.dtlsTransport.state]++);})),t.connected+=t.completed,e="new",t.failed>0?e="failed":t.connecting>0?e="connecting":t.disconnected>0?e="disconnected":t.new>0?e="new":t.connected>0&&(e="connected"),e!==this.connectionState){this.connectionState=e;var n=new Event("connectionstatechange");this._dispatchEvent("connectionstatechange",n);}},l.prototype.createOffer=function(){var n=this;if(n._isClosed)return Promise.reject(c("InvalidStateError","Can not call createOffer after close"));var i=n.transceivers.filter((function(e){return "audio"===e.kind})).length,s=n.transceivers.filter((function(e){return "video"===e.kind})).length,a=arguments[0];if(a){if(a.mandatory||a.optional)throw new TypeError("Legacy mandatory/optional constraints not supported.");void 0!==a.offerToReceiveAudio&&(i=true===a.offerToReceiveAudio?1:false===a.offerToReceiveAudio?0:a.offerToReceiveAudio),void 0!==a.offerToReceiveVideo&&(s=true===a.offerToReceiveVideo?1:false===a.offerToReceiveVideo?0:a.offerToReceiveVideo);}for(n.transceivers.forEach((function(e){"audio"===e.kind?--i<0&&(e.wantReceive=false):"video"===e.kind&&--s<0&&(e.wantReceive=false);}));i>0||s>0;)i>0&&(n._createTransceiver("audio"),i--),s>0&&(n._createTransceiver("video"),s--);var d=o.writeSessionBoilerplate(n._sdpSessionId,n._sdpSessionVersion++);n.transceivers.forEach((function(r,i){var s=r.track,a=r.kind,c=r.mid||o.generateIdentifier();r.mid=c,r.iceGatherer||(r.iceGatherer=n._createIceGatherer(i,n.usingBundle));var d=e.RTCRtpSender.getCapabilities(a);t<15019&&(d.codecs=d.codecs.filter((function(e){return "rtx"!==e.name}))),d.codecs.forEach((function(e){"H264"===e.name&&void 0===e.parameters["level-asymmetry-allowed"]&&(e.parameters["level-asymmetry-allowed"]="1"),r.remoteCapabilities&&r.remoteCapabilities.codecs&&r.remoteCapabilities.codecs.forEach((function(t){e.name.toLowerCase()===t.name.toLowerCase()&&e.clockRate===t.clockRate&&(e.preferredPayloadType=t.payloadType);}));})),d.headerExtensions.forEach((function(e){(r.remoteCapabilities&&r.remoteCapabilities.headerExtensions||[]).forEach((function(t){e.uri===t.uri&&(e.id=t.id);}));}));var l=r.sendEncodingParameters||[{ssrc:1001*(2*i+1)}];s&&t>=15019&&"video"===a&&!l[0].rtx&&(l[0].rtx={ssrc:l[0].ssrc+1}),r.wantReceive&&(r.rtpReceiver=new e.RTCRtpReceiver(r.dtlsTransport,a)),r.localCapabilities=d,r.sendEncodingParameters=l;})),"max-compat"!==n._config.bundlePolicy&&(d+="a=group:BUNDLE "+n.transceivers.map((function(e){return e.mid})).join(" ")+"\r\n"),d+="a=ice-options:trickle\r\n",n.transceivers.forEach((function(e,t){d+=r(e,e.localCapabilities,"offer",e.stream,n._dtlsRole),d+="a=rtcp-rsize\r\n",!e.iceGatherer||"new"===n.iceGatheringState||0!==t&&n.usingBundle||(e.iceGatherer.getLocalCandidates().forEach((function(e){e.component=1,d+="a="+o.writeCandidate(e)+"\r\n";})),"completed"===e.iceGatherer.state&&(d+="a=end-of-candidates\r\n"));}));var l=new e.RTCSessionDescription({type:"offer",sdp:d});return Promise.resolve(l)},l.prototype.createAnswer=function(){var n=this;if(n._isClosed)return Promise.reject(c("InvalidStateError","Can not call createAnswer after close"));if("have-remote-offer"!==n.signalingState&&"have-local-pranswer"!==n.signalingState)return Promise.reject(c("InvalidStateError","Can not call createAnswer in signalingState "+n.signalingState));var s=o.writeSessionBoilerplate(n._sdpSessionId,n._sdpSessionVersion++);n.usingBundle&&(s+="a=group:BUNDLE "+n.transceivers.map((function(e){return e.mid})).join(" ")+"\r\n"),s+="a=ice-options:trickle\r\n";var a=o.getMediaSections(n._remoteDescription.sdp).length;n.transceivers.forEach((function(e,o){if(!(o+1>a)){if(e.rejected)return "application"===e.kind?"DTLS/SCTP"===e.protocol?s+="m=application 0 DTLS/SCTP 5000\r\n":s+="m=application 0 "+e.protocol+" webrtc-datachannel\r\n":"audio"===e.kind?s+="m=audio 0 UDP/TLS/RTP/SAVPF 0\r\na=rtpmap:0 PCMU/8000\r\n":"video"===e.kind&&(s+="m=video 0 UDP/TLS/RTP/SAVPF 120\r\na=rtpmap:120 VP8/90000\r\n"),void(s+="c=IN IP4 0.0.0.0\r\na=inactive\r\na=mid:"+e.mid+"\r\n");var c;e.stream&&("audio"===e.kind?c=e.stream.getAudioTracks()[0]:"video"===e.kind&&(c=e.stream.getVideoTracks()[0]),c&&t>=15019&&"video"===e.kind&&!e.sendEncodingParameters[0].rtx&&(e.sendEncodingParameters[0].rtx={ssrc:e.sendEncodingParameters[0].ssrc+1}));var d=i(e.localCapabilities,e.remoteCapabilities);!d.codecs.filter((function(e){return "rtx"===e.name.toLowerCase()})).length&&e.sendEncodingParameters[0].rtx&&delete e.sendEncodingParameters[0].rtx,s+=r(e,d,"answer",e.stream,n._dtlsRole),e.rtcpParameters&&e.rtcpParameters.reducedSize&&(s+="a=rtcp-rsize\r\n");}}));var d=new e.RTCSessionDescription({type:"answer",sdp:s});return Promise.resolve(d)},l.prototype.addIceCandidate=function(e){var t,n=this;return e&&void 0===e.sdpMLineIndex&&!e.sdpMid?Promise.reject(new TypeError("sdpMLineIndex or sdpMid required")):new Promise((function(r,i){if(!n._remoteDescription)return i(c("InvalidStateError","Can not add ICE candidate without a remote description"));if(e&&""!==e.candidate){var s=e.sdpMLineIndex;if(e.sdpMid)for(var d=0;d<n.transceivers.length;d++)if(n.transceivers[d].mid===e.sdpMid){s=d;break}var l=n.transceivers[s];if(!l)return i(c("OperationError","Can not add ICE candidate"));if(l.rejected)return r();var u=Object.keys(e.candidate).length>0?o.parseCandidate(e.candidate):{};if("tcp"===u.protocol&&(0===u.port||9===u.port))return r();if(u.component&&1!==u.component)return r();if((0===s||s>0&&l.iceTransport!==n.transceivers[0].iceTransport)&&!a(l.iceTransport,u))return i(c("OperationError","Can not add ICE candidate"));var h=e.candidate.trim();0===h.indexOf("a=")&&(h=h.substr(2)),(t=o.getMediaSections(n._remoteDescription.sdp))[s]+="a="+(u.type?h:"end-of-candidates")+"\r\n",n._remoteDescription.sdp=o.getDescription(n._remoteDescription.sdp)+t.join("");}else for(var p=0;p<n.transceivers.length&&(n.transceivers[p].rejected||(n.transceivers[p].iceTransport.addRemoteCandidate({}),(t=o.getMediaSections(n._remoteDescription.sdp))[p]+="a=end-of-candidates\r\n",n._remoteDescription.sdp=o.getDescription(n._remoteDescription.sdp)+t.join(""),!n.usingBundle));p++);r();}))},l.prototype.getStats=function(t){if(t&&t instanceof e.MediaStreamTrack){var n=null;if(this.transceivers.forEach((function(e){e.rtpSender&&e.rtpSender.track===t?n=e.rtpSender:e.rtpReceiver&&e.rtpReceiver.track===t&&(n=e.rtpReceiver);})),!n)throw c("InvalidAccessError","Invalid selector.");return n.getStats()}var o=[];return this.transceivers.forEach((function(e){["rtpSender","rtpReceiver","iceGatherer","iceTransport","dtlsTransport"].forEach((function(t){e[t]&&o.push(e[t].getStats());}));})),Promise.all(o).then((function(e){var t=new Map;return e.forEach((function(e){e.forEach((function(e){t.set(e.id,e);}));})),t}))},["RTCRtpSender","RTCRtpReceiver","RTCIceGatherer","RTCIceTransport","RTCDtlsTransport"].forEach((function(t){var n=e[t];if(n&&n.prototype&&n.prototype.getStats){var o=n.prototype.getStats;n.prototype.getStats=function(){return o.apply(this).then((function(e){var t=new Map;return Object.keys(e).forEach((function(n){var o;e[n].type={inboundrtp:"inbound-rtp",outboundrtp:"outbound-rtp",candidatepair:"candidate-pair",localcandidate:"local-candidate",remotecandidate:"remote-candidate"}[(o=e[n]).type]||o.type,t.set(n,e[n]);})),t}))};}}));var u=["createOffer","createAnswer"];return u.forEach((function(e){var t=l.prototype[e];l.prototype[e]=function(){var e=arguments;return "function"==typeof e[0]||"function"==typeof e[1]?t.apply(this,[arguments[2]]).then((function(t){"function"==typeof e[0]&&e[0].apply(null,[t]);}),(function(t){"function"==typeof e[1]&&e[1].apply(null,[t]);})):t.apply(this,arguments)};})),(u=["setLocalDescription","setRemoteDescription","addIceCandidate"]).forEach((function(e){var t=l.prototype[e];l.prototype[e]=function(){var e=arguments;return "function"==typeof e[1]||"function"==typeof e[2]?t.apply(this,arguments).then((function(){"function"==typeof e[1]&&e[1].apply(null);}),(function(t){"function"==typeof e[2]&&e[2].apply(null,[t]);})):t.apply(this,arguments)};})),["getStats"].forEach((function(e){var t=l.prototype[e];l.prototype[e]=function(){var e=arguments;return "function"==typeof e[1]?t.apply(this,arguments).then((function(){"function"==typeof e[1]&&e[1].apply(null);})):t.apply(this,arguments)};})),l};},995:(e,t)=>{const{hasOwnProperty:n}=Object.prototype,o=p();o.configure=p,o.stringify=o,o.default=o,t.stringify=o,t.configure=p,e.exports=o;const r=/[\u0000-\u001f\u0022\u005c\ud800-\udfff]/;function i(e){return e.length<5e3&&!r.test(e)?`"${e}"`:JSON.stringify(e)}function s(e,t){if(e.length>200||t)return e.sort(t);for(let t=1;t<e.length;t++){const n=e[t];let o=t;for(;0!==o&&e[o-1]>n;)e[o]=e[o-1],o--;e[o]=n;}return e}const a=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Object.getPrototypeOf(new Int8Array)),Symbol.toStringTag).get;function c(e){return void 0!==a.call(e)&&0!==e.length}function d(e,t,n){e.length<n&&(n=e.length);const o=","===t?"":" ";let r=`"0":${o}${e[0]}`;for(let i=1;i<n;i++)r+=`${t}"${i}":${o}${e[i]}`;return r}function l(e,t){let o;if(n.call(e,t)){if(o=e[t],"number"!=typeof o)throw new TypeError(`The "${t}" argument must be of type number`);if(!Number.isInteger(o))throw new TypeError(`The "${t}" argument must be an integer`);if(o<1)throw new RangeError(`The "${t}" argument must be >= 1`)}return void 0===o?1/0:o}function u(e){return 1===e?"1 item":`${e} items`}function h(e){const t=new Set;for(const n of e)"string"!=typeof n&&"number"!=typeof n||t.add(String(n));return t}function p(e){const t=function(e){if(n.call(e,"strict")){const t=e.strict;if("boolean"!=typeof t)throw new TypeError('The "strict" argument must be of type boolean');if(t)return e=>{let t="Object can not safely be stringified. Received type "+typeof e;throw "function"!=typeof e&&(t+=` (${e.toString()})`),new Error(t)}}}(e={...e});t&&(void 0===e.bigint&&(e.bigint=false),"circularValue"in e||(e.circularValue=Error));const o=function(e){if(n.call(e,"circularValue")){const t=e.circularValue;if("string"==typeof t)return `"${t}"`;if(null==t)return t;if(t===Error||t===TypeError)return {toString(){throw new TypeError("Converting circular structure to JSON")}};throw new TypeError('The "circularValue" argument must be of type string or the value null or undefined')}return '"[Circular]"'}(e),r=function(e,t){let o;if(n.call(e,t)&&(o=e[t],"boolean"!=typeof o))throw new TypeError('The "bigint" argument must be of type boolean');return void 0===o||o}(e,"bigint"),a=function(e){let t;if(n.call(e,"deterministic")&&(t=e.deterministic,"boolean"!=typeof t&&"function"!=typeof t))throw new TypeError('The "deterministic" argument must be of type boolean or comparator function');return void 0===t||t}(e),p="function"==typeof a?a:void 0,f=l(e,"maximumDepth"),m=l(e,"maximumBreadth");function v(e,n,d,l,h,g){let y=n[e];switch("object"==typeof y&&null!==y&&"function"==typeof y.toJSON&&(y=y.toJSON(e)),y=l.call(n,e,y),typeof y){case "string":return i(y);case "object":{if(null===y)return "null";if(-1!==d.indexOf(y))return o;let e="",t=",";const n=g;if(Array.isArray(y)){if(0===y.length)return "[]";if(f<d.length+1)return '"[Array]"';d.push(y),""!==h&&(e+=`\n${g+=h}`,t=`,\n${g}`);const o=Math.min(y.length,m);let r=0;for(;r<o-1;r++){const n=v(String(r),y,d,l,h,g);e+=void 0!==n?n:"null",e+=t;}const i=v(String(r),y,d,l,h,g);return e+=void 0!==i?i:"null",y.length-1>m&&(e+=`${t}"... ${u(y.length-m-1)} not stringified"`),""!==h&&(e+=`\n${n}`),d.pop(),`[${e}]`}let r=Object.keys(y);const b=r.length;if(0===b)return "{}";if(f<d.length+1)return '"[Object]"';let k="",S="";""!==h&&(t=`,\n${g+=h}`,k=" ");const C=Math.min(b,m);a&&!c(y)&&(r=s(r,p)),d.push(y);for(let n=0;n<C;n++){const o=r[n],s=v(o,y,d,l,h,g);void 0!==s&&(e+=`${S}${i(o)}:${k}${s}`,S=t);}return b>m&&(e+=`${S}"...":${k}"${u(b-m)} not stringified"`,S=t),""!==h&&S.length>1&&(e=`\n${g}${e}\n${n}`),d.pop(),`{${e}}`}case "number":return isFinite(y)?String(y):t?t(y):"null";case "boolean":return  true===y?"true":"false";case "undefined":return;case "bigint":if(r)return String(y);default:return t?t(y):void 0}}function g(e,n,s,a,c,d){switch("object"==typeof n&&null!==n&&"function"==typeof n.toJSON&&(n=n.toJSON(e)),typeof n){case "string":return i(n);case "object":{if(null===n)return "null";if(-1!==s.indexOf(n))return o;const e=d;let t="",r=",";if(Array.isArray(n)){if(0===n.length)return "[]";if(f<s.length+1)return '"[Array]"';s.push(n),""!==c&&(t+=`\n${d+=c}`,r=`,\n${d}`);const o=Math.min(n.length,m);let i=0;for(;i<o-1;i++){const e=g(String(i),n[i],s,a,c,d);t+=void 0!==e?e:"null",t+=r;}const l=g(String(i),n[i],s,a,c,d);return t+=void 0!==l?l:"null",n.length-1>m&&(t+=`${r}"... ${u(n.length-m-1)} not stringified"`),""!==c&&(t+=`\n${e}`),s.pop(),`[${t}]`}s.push(n);let l="";""!==c&&(r=`,\n${d+=c}`,l=" ");let h="";for(const e of a){const o=g(e,n[e],s,a,c,d);void 0!==o&&(t+=`${h}${i(e)}:${l}${o}`,h=r);}return ""!==c&&h.length>1&&(t=`\n${d}${t}\n${e}`),s.pop(),`{${t}}`}case "number":return isFinite(n)?String(n):t?t(n):"null";case "boolean":return  true===n?"true":"false";case "undefined":return;case "bigint":if(r)return String(n);default:return t?t(n):void 0}}function y(e,n,l,h,v){switch(typeof n){case "string":return i(n);case "object":{if(null===n)return "null";if("function"==typeof n.toJSON){if("object"!=typeof(n=n.toJSON(e)))return y(e,n,l,h,v);if(null===n)return "null"}if(-1!==l.indexOf(n))return o;const t=v;if(Array.isArray(n)){if(0===n.length)return "[]";if(f<l.length+1)return '"[Array]"';l.push(n);let e=`\n${v+=h}`;const o=`,\n${v}`,r=Math.min(n.length,m);let i=0;for(;i<r-1;i++){const t=y(String(i),n[i],l,h,v);e+=void 0!==t?t:"null",e+=o;}const s=y(String(i),n[i],l,h,v);return e+=void 0!==s?s:"null",n.length-1>m&&(e+=`${o}"... ${u(n.length-m-1)} not stringified"`),e+=`\n${t}`,l.pop(),`[${e}]`}let r=Object.keys(n);const g=r.length;if(0===g)return "{}";if(f<l.length+1)return '"[Object]"';const b=`,\n${v+=h}`;let k="",S="",C=Math.min(g,m);c(n)&&(k+=d(n,b,m),r=r.slice(n.length),C-=n.length,S=b),a&&(r=s(r,p)),l.push(n);for(let e=0;e<C;e++){const t=r[e],o=y(t,n[t],l,h,v);void 0!==o&&(k+=`${S}${i(t)}: ${o}`,S=b);}return g>m&&(k+=`${S}"...": "${u(g-m)} not stringified"`,S=b),""!==S&&(k=`\n${v}${k}\n${t}`),l.pop(),`{${k}}`}case "number":return isFinite(n)?String(n):t?t(n):"null";case "boolean":return  true===n?"true":"false";case "undefined":return;case "bigint":if(r)return String(n);default:return t?t(n):void 0}}function b(e,n,l){switch(typeof n){case "string":return i(n);case "object":{if(null===n)return "null";if("function"==typeof n.toJSON){if("object"!=typeof(n=n.toJSON(e)))return b(e,n,l);if(null===n)return "null"}if(-1!==l.indexOf(n))return o;let t="";const r=void 0!==n.length;if(r&&Array.isArray(n)){if(0===n.length)return "[]";if(f<l.length+1)return '"[Array]"';l.push(n);const e=Math.min(n.length,m);let o=0;for(;o<e-1;o++){const e=b(String(o),n[o],l);t+=void 0!==e?e:"null",t+=",";}const r=b(String(o),n[o],l);return t+=void 0!==r?r:"null",n.length-1>m&&(t+=`,"... ${u(n.length-m-1)} not stringified"`),l.pop(),`[${t}]`}let h=Object.keys(n);const v=h.length;if(0===v)return "{}";if(f<l.length+1)return '"[Object]"';let g="",y=Math.min(v,m);r&&c(n)&&(t+=d(n,",",m),h=h.slice(n.length),y-=n.length,g=","),a&&(h=s(h,p)),l.push(n);for(let e=0;e<y;e++){const o=h[e],r=b(o,n[o],l);void 0!==r&&(t+=`${g}${i(o)}:${r}`,g=",");}return v>m&&(t+=`${g}"...":"${u(v-m)} not stringified"`),l.pop(),`{${t}}`}case "number":return isFinite(n)?String(n):t?t(n):"null";case "boolean":return  true===n?"true":"false";case "undefined":return;case "bigint":if(r)return String(n);default:return t?t(n):void 0}}return function(e,t,n){if(arguments.length>1){let o="";if("number"==typeof n?o=" ".repeat(Math.min(n,10)):"string"==typeof n&&(o=n.slice(0,10)),null!=t){if("function"==typeof t)return v("",{"":e},[],t,o,"");if(Array.isArray(t))return g("",e,[],h(t),o,"")}if(0!==o.length)return y("",e,[],o,"")}return b("",e,[])}}},998:e=>{var t=e.exports={v:[{name:"version",reg:/^(\d*)$/}],o:[{name:"origin",reg:/^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,names:["username","sessionId","sessionVersion","netType","ipVer","address"],format:"%s %s %d %s IP%d %s"}],s:[{name:"name"}],i:[{name:"description"}],u:[{name:"uri"}],e:[{name:"email"}],p:[{name:"phone"}],z:[{name:"timezones"}],r:[{name:"repeats"}],t:[{name:"timing",reg:/^(\d*) (\d*)/,names:["start","stop"],format:"%d %d"}],c:[{name:"connection",reg:/^IN IP(\d) (\S*)/,names:["version","ip"],format:"IN IP%d %s"}],b:[{push:"bandwidth",reg:/^(TIAS|AS|CT|RR|RS):(\d*)/,names:["type","limit"],format:"%s:%s"}],m:[{reg:/^(\w*) (\d*) ([\w/]*)(?: (.*))?/,names:["type","port","protocol","payloads"],format:"%s %d %s %s"}],a:[{push:"rtp",reg:/^rtpmap:(\d*) ([\w\-.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,names:["payload","codec","rate","encoding"],format:function(e){return e.encoding?"rtpmap:%d %s/%s/%s":e.rate?"rtpmap:%d %s/%s":"rtpmap:%d %s"}},{push:"fmtp",reg:/^fmtp:(\d*) ([\S| ]*)/,names:["payload","config"],format:"fmtp:%d %s"},{name:"control",reg:/^control:(.*)/,format:"control:%s"},{name:"rtcp",reg:/^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,names:["port","netType","ipVer","address"],format:function(e){return null!=e.address?"rtcp:%d %s IP%d %s":"rtcp:%d"}},{push:"rtcpFbTrrInt",reg:/^rtcp-fb:(\*|\d*) trr-int (\d*)/,names:["payload","value"],format:"rtcp-fb:%s trr-int %d"},{push:"rtcpFb",reg:/^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,names:["payload","type","subtype"],format:function(e){return null!=e.subtype?"rtcp-fb:%s %s %s":"rtcp-fb:%s %s"}},{push:"ext",reg:/^extmap:(\d+)(?:\/(\w+))?(?: (urn:ietf:params:rtp-hdrext:encrypt))? (\S*)(?: (\S*))?/,names:["value","direction","encrypt-uri","uri","config"],format:function(e){return "extmap:%d"+(e.direction?"/%s":"%v")+(e["encrypt-uri"]?" %s":"%v")+" %s"+(e.config?" %s":"")}},{name:"extmapAllowMixed",reg:/^(extmap-allow-mixed)/},{push:"crypto",reg:/^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,names:["id","suite","config","sessionConfig"],format:function(e){return null!=e.sessionConfig?"crypto:%d %s %s %s":"crypto:%d %s %s"}},{name:"setup",reg:/^setup:(\w*)/,format:"setup:%s"},{name:"connectionType",reg:/^connection:(new|existing)/,format:"connection:%s"},{name:"mid",reg:/^mid:([^\s]*)/,format:"mid:%s"},{push:"msid",reg:/^msid:([\w-]+)(?: ([\w-]+))?/,names:["id","appdata"],format:"msid:%s %s"},{name:"ptime",reg:/^ptime:(\d*(?:\.\d*)*)/,format:"ptime:%d"},{name:"maxptime",reg:/^maxptime:(\d*(?:\.\d*)*)/,format:"maxptime:%d"},{name:"direction",reg:/^(sendrecv|recvonly|sendonly|inactive)/},{name:"icelite",reg:/^(ice-lite)/},{name:"iceUfrag",reg:/^ice-ufrag:(\S*)/,format:"ice-ufrag:%s"},{name:"icePwd",reg:/^ice-pwd:(\S*)/,format:"ice-pwd:%s"},{name:"fingerprint",reg:/^fingerprint:(\S*) (\S*)/,names:["type","hash"],format:"fingerprint:%s %s"},{push:"candidates",reg:/^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,names:["foundation","component","transport","priority","ip","port","type","raddr","rport","tcptype","generation","network-id","network-cost"],format:function(e){var t="candidate:%s %d %s %d %s %d typ %s";return t+=null!=e.raddr?" raddr %s rport %d":"%v%v",t+=null!=e.tcptype?" tcptype %s":"%v",null!=e.generation&&(t+=" generation %d"),(t+=null!=e["network-id"]?" network-id %d":"%v")+(null!=e["network-cost"]?" network-cost %d":"%v")}},{name:"endOfCandidates",reg:/^(end-of-candidates)/},{name:"remoteCandidates",reg:/^remote-candidates:(.*)/,format:"remote-candidates:%s"},{name:"iceOptions",reg:/^ice-options:(\S*)/,format:"ice-options:%s"},{push:"ssrcs",reg:/^ssrc:(\d*) ([\w_-]*)(?::(.*))?/,names:["id","attribute","value"],format:function(e){var t="ssrc:%d";return null!=e.attribute&&(t+=" %s",null!=e.value&&(t+=":%s")),t}},{push:"ssrcGroups",reg:/^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,names:["semantics","ssrcs"],format:"ssrc-group:%s %s"},{name:"msidSemantic",reg:/^msid-semantic:\s?(\w*) (\S*)/,names:["semantic","token"],format:"msid-semantic: %s %s"},{push:"groups",reg:/^group:(\w*) (.*)/,names:["type","mids"],format:"group:%s %s"},{name:"rtcpMux",reg:/^(rtcp-mux)/},{name:"rtcpRsize",reg:/^(rtcp-rsize)/},{name:"sctpmap",reg:/^sctpmap:([\w_/]*) (\S*)(?: (\S*))?/,names:["sctpmapNumber","app","maxMessageSize"],format:function(e){return null!=e.maxMessageSize?"sctpmap:%s %s %s":"sctpmap:%s %s"}},{name:"xGoogleFlag",reg:/^x-google-flag:([^\s]*)/,format:"x-google-flag:%s"},{push:"rids",reg:/^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,names:["id","direction","params"],format:function(e){return e.params?"rid:%s %s %s":"rid:%s %s"}},{push:"imageattrs",reg:new RegExp("^imageattr:(\\d+|\\*)[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?"),names:["pt","dir1","attrs1","dir2","attrs2"],format:function(e){return "imageattr:%s %s %s"+(e.dir2?" %s %s":"")}},{name:"simulcast",reg:new RegExp("^simulcast:(send|recv) ([a-zA-Z0-9\\-_~;,]+)(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?$"),names:["dir1","list1","dir2","list2"],format:function(e){return "simulcast:%s %s"+(e.dir2?" %s %s":"")}},{name:"simulcast_03",reg:/^simulcast:[\s\t]+([\S+\s\t]+)$/,names:["value"],format:"simulcast: %s"},{name:"framerate",reg:/^framerate:(\d+(?:$|\.\d+))/,format:"framerate:%s"},{name:"sourceFilter",reg:/^source-filter: *(excl|incl) (\S*) (IP4|IP6|\*) (\S*) (.*)/,names:["filterMode","netType","addressTypes","destAddress","srcList"],format:"source-filter: %s %s %s %s %s"},{name:"bundleOnly",reg:/^(bundle-only)/},{name:"label",reg:/^label:(.+)/,format:"label:%s"},{name:"sctpPort",reg:/^sctp-port:(\d+)$/,format:"sctp-port:%s"},{name:"maxMessageSize",reg:/^max-message-size:(\d+)$/,format:"max-message-size:%s"},{push:"tsRefClocks",reg:/^ts-refclk:([^\s=]*)(?:=(\S*))?/,names:["clksrc","clksrcExt"],format:function(e){return "ts-refclk:%s"+(null!=e.clksrcExt?"=%s":"")}},{name:"mediaClk",reg:/^mediaclk:(?:id=(\S*))? *([^\s=]*)(?:=(\S*))?(?: *rate=(\d+)\/(\d+))?/,names:["id","mediaClockName","mediaClockValue","rateNumerator","rateDenominator"],format:function(e){var t="mediaclk:";return t+=null!=e.id?"id=%s %s":"%v%s",t+=null!=e.mediaClockValue?"=%s":"",(t+=null!=e.rateNumerator?" rate=%s":"")+(null!=e.rateDenominator?"/%s":"")}},{name:"keywords",reg:/^keywds:(.+)$/,format:"keywds:%s"},{name:"content",reg:/^content:(.+)/,format:"content:%s"},{name:"bfcpFloorCtrl",reg:/^floorctrl:(c-only|s-only|c-s)/,format:"floorctrl:%s"},{name:"bfcpConfId",reg:/^confid:(\d+)/,format:"confid:%s"},{name:"bfcpUserId",reg:/^userid:(\d+)/,format:"userid:%s"},{name:"bfcpFloorId",reg:/^floorid:(.+) (?:m-stream|mstrm):(.+)/,names:["id","mStream"],format:"floorid:%s mstrm:%s"},{push:"invalid",names:["value"]}]};Object.keys(t).forEach((function(e){t[e].forEach((function(e){e.reg||(e.reg=/(.*)/),e.format||(e.format="%s");}));}));},423:(e,t,n)=>{var o=n(175);n(983);n(998),t.Qc=o.parse,o.parseParams,o.parseFmtpConfig,o.parsePayloads,o.parseRemoteCandidates,o.parseImageAttributes,o.parseSimulcastStreamList;},175:(e,t,n)=>{var o=function(e){return String(Number(e))===e?Number(e):e},r=function(e,t,n){var r=e.name&&e.names;e.push&&!t[e.push]?t[e.push]=[]:r&&!t[e.name]&&(t[e.name]={});var i=e.push?{}:r?t[e.name]:t;!function(e,t,n,r){if(r&&!n)t[r]=o(e[1]);else for(var i=0;i<n.length;i+=1)null!=e[i+1]&&(t[n[i]]=o(e[i+1]));}(n.match(e.reg),i,e.names,e.name),e.push&&t[e.push].push(i);},i=n(998),s=RegExp.prototype.test.bind(/^([a-z])=(.*)/);t.parse=function(e){var t={},n=[],o=t;return e.split(/(\r\n|\r|\n)/).filter(s).forEach((function(e){var t=e[0],s=e.slice(2);"m"===t&&(n.push({rtp:[],fmtp:[]}),o=n[n.length-1]);for(var a=0;a<(i[t]||[]).length;a+=1){var c=i[t][a];if(c.reg.test(s))return r(c,o,s)}})),t.media=n,t};var a=function(e,t){var n=t.split(/=(.+)/,2);return 2===n.length?e[n[0]]=o(n[1]):1===n.length&&t.length>1&&(e[n[0]]=void 0),e};t.parseParams=function(e){return e.split(/;\s?/).reduce(a,{})},t.parseFmtpConfig=t.parseParams,t.parsePayloads=function(e){return e.toString().split(" ").map(Number)},t.parseRemoteCandidates=function(e){for(var t=[],n=e.split(" ").map(o),r=0;r<n.length;r+=3)t.push({component:n[r],ip:n[r+1],port:n[r+2]});return t},t.parseImageAttributes=function(e){return e.split(" ").map((function(e){return e.substring(1,e.length-1).split(",").reduce(a,{})}))},t.parseSimulcastStreamList=function(e){return e.split(";").map((function(e){return e.split(",").map((function(e){var t,n=false;return "~"!==e[0]?t=o(e):(t=o(e.substring(1,e.length)),n=true),{scid:t,paused:n}}))}))};},983:(e,t,n)=>{var o=n(998),r=/%[sdv%]/g,i=function(e){var t=1,n=arguments,o=n.length;return e.replace(r,(function(e){if(t>=o)return e;var r=n[t];switch(t+=1,e){case "%%":return "%";case "%s":return String(r);case "%d":return Number(r);case "%v":return ""}}))},s=function(e,t,n){var o=[e+"="+(t.format instanceof Function?t.format(t.push?n:n[t.name]):t.format)];if(t.names)for(var r=0;r<t.names.length;r+=1){var s=t.names[r];t.name?o.push(n[t.name][s]):o.push(n[t.names[r]]);}else o.push(n[t.name]);return i.apply(null,o)},a=["v","o","s","i","u","e","p","c","b","t","r","z","a"],c=["i","c","b","a"];e.exports=function(e,t){t=t||{},null==e.version&&(e.version=0),null==e.name&&(e.name=" "),e.media.forEach((function(e){null==e.payloads&&(e.payloads="");}));var n=t.outerOrder||a,r=t.innerOrder||c,i=[];return n.forEach((function(t){o[t].forEach((function(n){n.name in e&&null!=e[n.name]?i.push(s(t,n,e)):n.push in e&&null!=e[n.push]&&e[n.push].forEach((function(e){i.push(s(t,n,e));}));}));})),e.media.forEach((function(e){i.push(s("m",o.m[0],e)),r.forEach((function(t){o[t].forEach((function(n){n.name in e&&null!=e[n.name]?i.push(s(t,n,e)):n.push in e&&null!=e[n.push]&&e[n.push].forEach((function(e){i.push(s(t,n,e));}));}));}));})),i.join("\r\n")+"\r\n"};},347:e=>{var t={generateIdentifier:function(){return Math.random().toString(36).substr(2,10)}};t.localCName=t.generateIdentifier(),t.splitLines=function(e){return e.trim().split("\n").map((function(e){return e.trim()}))},t.splitSections=function(e){return e.split("\nm=").map((function(e,t){return (t>0?"m="+e:e).trim()+"\r\n"}))},t.getDescription=function(e){var n=t.splitSections(e);return n&&n[0]},t.getMediaSections=function(e){var n=t.splitSections(e);return n.shift(),n},t.matchPrefix=function(e,n){return t.splitLines(e).filter((function(e){return 0===e.indexOf(n)}))},t.parseCandidate=function(e){for(var t,n={foundation:(t=0===e.indexOf("a=candidate:")?e.substring(12).split(" "):e.substring(10).split(" "))[0],component:parseInt(t[1],10),protocol:t[2].toLowerCase(),priority:parseInt(t[3],10),ip:t[4],address:t[4],port:parseInt(t[5],10),type:t[7]},o=8;o<t.length;o+=2)switch(t[o]){case "raddr":n.relatedAddress=t[o+1];break;case "rport":n.relatedPort=parseInt(t[o+1],10);break;case "tcptype":n.tcpType=t[o+1];break;case "ufrag":n.ufrag=t[o+1],n.usernameFragment=t[o+1];break;default:n[t[o]]=t[o+1];}return n},t.writeCandidate=function(e){var t=[];t.push(e.foundation),t.push(e.component),t.push(e.protocol.toUpperCase()),t.push(e.priority),t.push(e.address||e.ip),t.push(e.port);var n=e.type;return t.push("typ"),t.push(n),"host"!==n&&e.relatedAddress&&e.relatedPort&&(t.push("raddr"),t.push(e.relatedAddress),t.push("rport"),t.push(e.relatedPort)),e.tcpType&&"tcp"===e.protocol.toLowerCase()&&(t.push("tcptype"),t.push(e.tcpType)),(e.usernameFragment||e.ufrag)&&(t.push("ufrag"),t.push(e.usernameFragment||e.ufrag)),"candidate:"+t.join(" ")},t.parseIceOptions=function(e){return e.substr(14).split(" ")},t.parseRtpMap=function(e){var t=e.substr(9).split(" "),n={payloadType:parseInt(t.shift(),10)};return t=t[0].split("/"),n.name=t[0],n.clockRate=parseInt(t[1],10),n.channels=3===t.length?parseInt(t[2],10):1,n.numChannels=n.channels,n},t.writeRtpMap=function(e){var t=e.payloadType;void 0!==e.preferredPayloadType&&(t=e.preferredPayloadType);var n=e.channels||e.numChannels||1;return "a=rtpmap:"+t+" "+e.name+"/"+e.clockRate+(1!==n?"/"+n:"")+"\r\n"},t.parseExtmap=function(e){var t=e.substr(9).split(" ");return {id:parseInt(t[0],10),direction:t[0].indexOf("/")>0?t[0].split("/")[1]:"sendrecv",uri:t[1]}},t.writeExtmap=function(e){return "a=extmap:"+(e.id||e.preferredId)+(e.direction&&"sendrecv"!==e.direction?"/"+e.direction:"")+" "+e.uri+"\r\n"},t.parseFmtp=function(e){for(var t,n={},o=e.substr(e.indexOf(" ")+1).split(";"),r=0;r<o.length;r++)n[(t=o[r].trim().split("="))[0].trim()]=t[1];return n},t.writeFmtp=function(e){var t="",n=e.payloadType;if(void 0!==e.preferredPayloadType&&(n=e.preferredPayloadType),e.parameters&&Object.keys(e.parameters).length){var o=[];Object.keys(e.parameters).forEach((function(t){e.parameters[t]?o.push(t+"="+e.parameters[t]):o.push(t);})),t+="a=fmtp:"+n+" "+o.join(";")+"\r\n";}return t},t.parseRtcpFb=function(e){var t=e.substr(e.indexOf(" ")+1).split(" ");return {type:t.shift(),parameter:t.join(" ")}},t.writeRtcpFb=function(e){var t="",n=e.payloadType;return void 0!==e.preferredPayloadType&&(n=e.preferredPayloadType),e.rtcpFeedback&&e.rtcpFeedback.length&&e.rtcpFeedback.forEach((function(e){t+="a=rtcp-fb:"+n+" "+e.type+(e.parameter&&e.parameter.length?" "+e.parameter:"")+"\r\n";})),t},t.parseSsrcMedia=function(e){var t=e.indexOf(" "),n={ssrc:parseInt(e.substr(7,t-7),10)},o=e.indexOf(":",t);return o>-1?(n.attribute=e.substr(t+1,o-t-1),n.value=e.substr(o+1)):n.attribute=e.substr(t+1),n},t.parseSsrcGroup=function(e){var t=e.substr(13).split(" ");return {semantics:t.shift(),ssrcs:t.map((function(e){return parseInt(e,10)}))}},t.getMid=function(e){var n=t.matchPrefix(e,"a=mid:")[0];if(n)return n.substr(6)},t.parseFingerprint=function(e){var t=e.substr(14).split(" ");return {algorithm:t[0].toLowerCase(),value:t[1]}},t.getDtlsParameters=function(e,n){return {role:"auto",fingerprints:t.matchPrefix(e+n,"a=fingerprint:").map(t.parseFingerprint)}},t.writeDtlsParameters=function(e,t){var n="a=setup:"+t+"\r\n";return e.fingerprints.forEach((function(e){n+="a=fingerprint:"+e.algorithm+" "+e.value+"\r\n";})),n},t.parseCryptoLine=function(e){var t=e.substr(9).split(" ");return {tag:parseInt(t[0],10),cryptoSuite:t[1],keyParams:t[2],sessionParams:t.slice(3)}},t.writeCryptoLine=function(e){return "a=crypto:"+e.tag+" "+e.cryptoSuite+" "+("object"==typeof e.keyParams?t.writeCryptoKeyParams(e.keyParams):e.keyParams)+(e.sessionParams?" "+e.sessionParams.join(" "):"")+"\r\n"},t.parseCryptoKeyParams=function(e){if(0!==e.indexOf("inline:"))return null;var t=e.substr(7).split("|");return {keyMethod:"inline",keySalt:t[0],lifeTime:t[1],mkiValue:t[2]?t[2].split(":")[0]:void 0,mkiLength:t[2]?t[2].split(":")[1]:void 0}},t.writeCryptoKeyParams=function(e){return e.keyMethod+":"+e.keySalt+(e.lifeTime?"|"+e.lifeTime:"")+(e.mkiValue&&e.mkiLength?"|"+e.mkiValue+":"+e.mkiLength:"")},t.getCryptoParameters=function(e,n){return t.matchPrefix(e+n,"a=crypto:").map(t.parseCryptoLine)},t.getIceParameters=function(e,n){var o=t.matchPrefix(e+n,"a=ice-ufrag:")[0],r=t.matchPrefix(e+n,"a=ice-pwd:")[0];return o&&r?{usernameFragment:o.substr(12),password:r.substr(10)}:null},t.writeIceParameters=function(e){return "a=ice-ufrag:"+e.usernameFragment+"\r\na=ice-pwd:"+e.password+"\r\n"},t.parseRtpParameters=function(e){for(var n={codecs:[],headerExtensions:[],fecMechanisms:[],rtcp:[]},o=t.splitLines(e)[0].split(" "),r=3;r<o.length;r++){var i=o[r],s=t.matchPrefix(e,"a=rtpmap:"+i+" ")[0];if(s){var a=t.parseRtpMap(s),c=t.matchPrefix(e,"a=fmtp:"+i+" ");switch(a.parameters=c.length?t.parseFmtp(c[0]):{},a.rtcpFeedback=t.matchPrefix(e,"a=rtcp-fb:"+i+" ").map(t.parseRtcpFb),n.codecs.push(a),a.name.toUpperCase()){case "RED":case "ULPFEC":n.fecMechanisms.push(a.name.toUpperCase());}}}return t.matchPrefix(e,"a=extmap:").forEach((function(e){n.headerExtensions.push(t.parseExtmap(e));})),n},t.writeRtpDescription=function(e,n){var o="";o+="m="+e+" ",o+=n.codecs.length>0?"9":"0",o+=" UDP/TLS/RTP/SAVPF ",o+=n.codecs.map((function(e){return void 0!==e.preferredPayloadType?e.preferredPayloadType:e.payloadType})).join(" ")+"\r\n",o+="c=IN IP4 0.0.0.0\r\n",o+="a=rtcp:9 IN IP4 0.0.0.0\r\n",n.codecs.forEach((function(e){o+=t.writeRtpMap(e),o+=t.writeFmtp(e),o+=t.writeRtcpFb(e);}));var r=0;return n.codecs.forEach((function(e){e.maxptime>r&&(r=e.maxptime);})),r>0&&(o+="a=maxptime:"+r+"\r\n"),o+="a=rtcp-mux\r\n",n.headerExtensions&&n.headerExtensions.forEach((function(e){o+=t.writeExtmap(e);})),o},t.parseRtpEncodingParameters=function(e){var n,o=[],r=t.parseRtpParameters(e),i=-1!==r.fecMechanisms.indexOf("RED"),s=-1!==r.fecMechanisms.indexOf("ULPFEC"),a=t.matchPrefix(e,"a=ssrc:").map((function(e){return t.parseSsrcMedia(e)})).filter((function(e){return "cname"===e.attribute})),c=a.length>0&&a[0].ssrc,d=t.matchPrefix(e,"a=ssrc-group:FID").map((function(e){return e.substr(17).split(" ").map((function(e){return parseInt(e,10)}))}));d.length>0&&d[0].length>1&&d[0][0]===c&&(n=d[0][1]),r.codecs.forEach((function(e){if("RTX"===e.name.toUpperCase()&&e.parameters.apt){var t={ssrc:c,codecPayloadType:parseInt(e.parameters.apt,10)};c&&n&&(t.rtx={ssrc:n}),o.push(t),i&&((t=JSON.parse(JSON.stringify(t))).fec={ssrc:c,mechanism:s?"red+ulpfec":"red"},o.push(t));}})),0===o.length&&c&&o.push({ssrc:c});var l=t.matchPrefix(e,"b=");return l.length&&(l=0===l[0].indexOf("b=TIAS:")?parseInt(l[0].substr(7),10):0===l[0].indexOf("b=AS:")?1e3*parseInt(l[0].substr(5),10)*.95-16e3:void 0,o.forEach((function(e){e.maxBitrate=l;}))),o},t.parseRtcpParameters=function(e){var n={},o=t.matchPrefix(e,"a=ssrc:").map((function(e){return t.parseSsrcMedia(e)})).filter((function(e){return "cname"===e.attribute}))[0];o&&(n.cname=o.value,n.ssrc=o.ssrc);var r=t.matchPrefix(e,"a=rtcp-rsize");n.reducedSize=r.length>0,n.compound=0===r.length;var i=t.matchPrefix(e,"a=rtcp-mux");return n.mux=i.length>0,n},t.parseMsid=function(e){var n,o=t.matchPrefix(e,"a=msid:");if(1===o.length)return {stream:(n=o[0].substr(7).split(" "))[0],track:n[1]};var r=t.matchPrefix(e,"a=ssrc:").map((function(e){return t.parseSsrcMedia(e)})).filter((function(e){return "msid"===e.attribute}));return r.length>0?{stream:(n=r[0].value.split(" "))[0],track:n[1]}:void 0},t.parseSctpDescription=function(e){var n,o=t.parseMLine(e),r=t.matchPrefix(e,"a=max-message-size:");r.length>0&&(n=parseInt(r[0].substr(19),10)),isNaN(n)&&(n=65536);var i=t.matchPrefix(e,"a=sctp-port:");if(i.length>0)return {port:parseInt(i[0].substr(12),10),protocol:o.fmt,maxMessageSize:n};if(t.matchPrefix(e,"a=sctpmap:").length>0){var s=t.matchPrefix(e,"a=sctpmap:")[0].substr(10).split(" ");return {port:parseInt(s[0],10),protocol:s[1],maxMessageSize:n}}},t.writeSctpDescription=function(e,t){var n=[];return n="DTLS/SCTP"!==e.protocol?["m="+e.kind+" 9 "+e.protocol+" "+t.protocol+"\r\n","c=IN IP4 0.0.0.0\r\n","a=sctp-port:"+t.port+"\r\n"]:["m="+e.kind+" 9 "+e.protocol+" "+t.port+"\r\n","c=IN IP4 0.0.0.0\r\n","a=sctpmap:"+t.port+" "+t.protocol+" 65535\r\n"],void 0!==t.maxMessageSize&&n.push("a=max-message-size:"+t.maxMessageSize+"\r\n"),n.join("")},t.generateSessionId=function(){return Math.random().toString().substr(2,21)},t.writeSessionBoilerplate=function(e,n,o){var r=void 0!==n?n:2;return "v=0\r\no="+(o||"thisisadapterortc")+" "+(e||t.generateSessionId())+" "+r+" IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n"},t.writeMediaSection=function(e,n,o,r){var i=t.writeRtpDescription(e.kind,n);if(i+=t.writeIceParameters(e.iceGatherer.getLocalParameters()),i+=t.writeDtlsParameters(e.dtlsTransport.getLocalParameters(),"offer"===o?"actpass":"active"),i+="a=mid:"+e.mid+"\r\n",e.direction?i+="a="+e.direction+"\r\n":e.rtpSender&&e.rtpReceiver?i+="a=sendrecv\r\n":e.rtpSender?i+="a=sendonly\r\n":e.rtpReceiver?i+="a=recvonly\r\n":i+="a=inactive\r\n",e.rtpSender){var s="msid:"+r.id+" "+e.rtpSender.track.id+"\r\n";i+="a="+s,i+="a=ssrc:"+e.sendEncodingParameters[0].ssrc+" "+s,e.sendEncodingParameters[0].rtx&&(i+="a=ssrc:"+e.sendEncodingParameters[0].rtx.ssrc+" "+s,i+="a=ssrc-group:FID "+e.sendEncodingParameters[0].ssrc+" "+e.sendEncodingParameters[0].rtx.ssrc+"\r\n");}return i+="a=ssrc:"+e.sendEncodingParameters[0].ssrc+" cname:"+t.localCName+"\r\n",e.rtpSender&&e.sendEncodingParameters[0].rtx&&(i+="a=ssrc:"+e.sendEncodingParameters[0].rtx.ssrc+" cname:"+t.localCName+"\r\n"),i},t.getDirection=function(e,n){for(var o=t.splitLines(e),r=0;r<o.length;r++)switch(o[r]){case "a=sendrecv":case "a=sendonly":case "a=recvonly":case "a=inactive":return o[r].substr(2)}return n?t.getDirection(n):"sendrecv"},t.getKind=function(e){return t.splitLines(e)[0].split(" ")[0].substr(2)},t.isRejected=function(e){return "0"===e.split(" ",2)[1]},t.parseMLine=function(e){var n=t.splitLines(e)[0].substr(2).split(" ");return {kind:n[0],port:parseInt(n[1],10),protocol:n[2],fmt:n.slice(3).join(" ")}},t.parseOLine=function(e){var n=t.matchPrefix(e,"o=")[0].substr(2).split(" ");return {username:n[0],sessionId:n[1],sessionVersion:parseInt(n[2],10),netType:n[3],addressType:n[4],address:n[5]}},t.isValidSDP=function(e){if("string"!=typeof e||0===e.length)return  false;for(var n=t.splitLines(e),o=0;o<n.length;o++)if(n[o].length<2||"="!==n[o].charAt(1))return  false;return  true},e.exports=t;},429:()=>{}},t={};function n(o){var r=t[o];if(void 0!==r)return r.exports;var i=t[o]={id:o,loaded:false,exports:{}};return e[o].call(i.exports,i,i.exports,n),i.loaded=true,i.exports}n.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return n.d(t,{a:t}),t},n.d=(e,t)=>{for(var o in t)n.o(t,o)&&!n.o(e,o)&&Object.defineProperty(e,o,{enumerable:true,get:t[o]});},n.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),n.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),n.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:true});},n.nmd=e=>(e.paths=[],e.children||(e.children=[]),e);var o={};(()=>{n.d(o,{p:()=>Nr,Z:()=>Ur});var e={};n.r(e),n.d(e,{fixNegotiationNeeded:()=>I,shimAddTrackRemoveTrack:()=>M,shimAddTrackRemoveTrackWithNative:()=>R,shimGetDisplayMedia:()=>S,shimGetSendersWithDtmf:()=>T,shimGetStats:()=>E,shimGetUserMedia:()=>k,shimMediaStream:()=>C,shimOnTrack:()=>w,shimPeerConnection:()=>D,shimSenderReceiverGetStats:()=>_});var t={};n.r(t),n.d(t,{shimGetDisplayMedia:()=>A,shimGetUserMedia:()=>O,shimPeerConnection:()=>L,shimReplaceTrack:()=>G});var r={};n.r(r),n.d(r,{shimAddTransceiver:()=>H,shimCreateAnswer:()=>$,shimCreateOffer:()=>z,shimGetDisplayMedia:()=>j,shimGetParameters:()=>K,shimGetUserMedia:()=>B,shimOnTrack:()=>F,shimPeerConnection:()=>N,shimRTCDataChannel:()=>V,shimReceiverGetStats:()=>U,shimRemoveStream:()=>q,shimSenderGetStats:()=>W});var i={};n.r(i),n.d(i,{shimAudioContext:()=>oe,shimCallbacksAPI:()=>J,shimConstraints:()=>Z,shimCreateOfferLegacy:()=>ne,shimGetUserMedia:()=>Q,shimLocalStreamsAPI:()=>Y,shimRTCIceServerUrls:()=>ee,shimRemoteStreamsAPI:()=>X,shimTrackEventTransceiver:()=>te});var s={};n.r(s),n.d(s,{removeExtmapAllowMixed:()=>le,shimAddIceCandidateNullOrEmpty:()=>ue,shimConnectionState:()=>de,shimMaxMessageSize:()=>ae,shimRTCIceCandidate:()=>se,shimSendThrowTypeError:()=>ce});let a=true,c=true;function d(e,t,n){const o=e.match(t);return o&&o.length>=n&&parseInt(o[n],10)}function l(e,t,n){if(!e.RTCPeerConnection)return;const o=e.RTCPeerConnection.prototype,r=o.addEventListener;o.addEventListener=function(e,o){if(e!==t)return r.apply(this,arguments);const i=e=>{const t=n(e);t&&(o.handleEvent?o.handleEvent(t):o(t));};return this._eventMap=this._eventMap||{},this._eventMap[t]||(this._eventMap[t]=new Map),this._eventMap[t].set(o,i),r.apply(this,[e,i])};const i=o.removeEventListener;o.removeEventListener=function(e,n){if(e!==t||!this._eventMap||!this._eventMap[t])return i.apply(this,arguments);if(!this._eventMap[t].has(n))return i.apply(this,arguments);const o=this._eventMap[t].get(n);return this._eventMap[t].delete(n),0===this._eventMap[t].size&&delete this._eventMap[t],0===Object.keys(this._eventMap).length&&delete this._eventMap,i.apply(this,[e,o])},Object.defineProperty(o,"on"+t,{get(){return this["_on"+t]},set(e){this["_on"+t]&&(this.removeEventListener(t,this["_on"+t]),delete this["_on"+t]),e&&this.addEventListener(t,this["_on"+t]=e);},enumerable:true,configurable:true});}function u(e){return "boolean"!=typeof e?new Error("Argument type: "+typeof e+". Please use a boolean."):(a=e,e?"adapter.js logging disabled":"adapter.js logging enabled")}function h(e){return "boolean"!=typeof e?new Error("Argument type: "+typeof e+". Please use a boolean."):(c=!e,"adapter.js deprecation warnings "+(e?"disabled":"enabled"))}function p(){if("object"==typeof window){if(a)return;"undefined"!=typeof console&&"function"==typeof console.log&&console.log.apply(console,arguments);}}function f(e,t){c&&console.warn(e+" is deprecated, please use "+t+" instead.");}function m(e){return "[object Object]"===Object.prototype.toString.call(e)}function v(e){return m(e)?Object.keys(e).reduce((function(t,n){const o=m(e[n]),r=o?v(e[n]):e[n],i=o&&!Object.keys(r).length;return void 0===r||i?t:Object.assign(t,{[n]:r})}),{}):e}function g(e,t,n){t&&!n.has(t.id)&&(n.set(t.id,t),Object.keys(t).forEach((o=>{o.endsWith("Id")?g(e,e.get(t[o]),n):o.endsWith("Ids")&&t[o].forEach((t=>{g(e,e.get(t),n);}));})));}function y(e,t,n){const o=n?"outbound-rtp":"inbound-rtp",r=new Map;if(null===t)return r;const i=[];return e.forEach((e=>{"track"===e.type&&e.trackIdentifier===t.id&&i.push(e);})),i.forEach((t=>{e.forEach((n=>{n.type===o&&n.trackId===t.id&&g(e,n,r);}));})),r}const b=p;function k(e,t){const n=e&&e.navigator;if(!n.mediaDevices)return;const o=function(e){if("object"!=typeof e||e.mandatory||e.optional)return e;const t={};return Object.keys(e).forEach((n=>{if("require"===n||"advanced"===n||"mediaSource"===n)return;const o="object"==typeof e[n]?e[n]:{ideal:e[n]};void 0!==o.exact&&"number"==typeof o.exact&&(o.min=o.max=o.exact);const r=function(e,t){return e?e+t.charAt(0).toUpperCase()+t.slice(1):"deviceId"===t?"sourceId":t};if(void 0!==o.ideal){t.optional=t.optional||[];let e={};"number"==typeof o.ideal?(e[r("min",n)]=o.ideal,t.optional.push(e),e={},e[r("max",n)]=o.ideal,t.optional.push(e)):(e[r("",n)]=o.ideal,t.optional.push(e));} void 0!==o.exact&&"number"!=typeof o.exact?(t.mandatory=t.mandatory||{},t.mandatory[r("",n)]=o.exact):["min","max"].forEach((e=>{ void 0!==o[e]&&(t.mandatory=t.mandatory||{},t.mandatory[r(e,n)]=o[e]);}));})),e.advanced&&(t.optional=(t.optional||[]).concat(e.advanced)),t},r=function(e,r){if(t.version>=61)return r(e);if((e=JSON.parse(JSON.stringify(e)))&&"object"==typeof e.audio){const t=function(e,t,n){t in e&&!(n in e)&&(e[n]=e[t],delete e[t]);};t((e=JSON.parse(JSON.stringify(e))).audio,"autoGainControl","googAutoGainControl"),t(e.audio,"noiseSuppression","googNoiseSuppression"),e.audio=o(e.audio);}if(e&&"object"==typeof e.video){let i=e.video.facingMode;i=i&&("object"==typeof i?i:{ideal:i});const s=t.version<66;if(i&&("user"===i.exact||"environment"===i.exact||"user"===i.ideal||"environment"===i.ideal)&&(!n.mediaDevices.getSupportedConstraints||!n.mediaDevices.getSupportedConstraints().facingMode||s)){let t;if(delete e.video.facingMode,"environment"===i.exact||"environment"===i.ideal?t=["back","rear"]:"user"!==i.exact&&"user"!==i.ideal||(t=["front"]),t)return n.mediaDevices.enumerateDevices().then((n=>{let s=(n=n.filter((e=>"videoinput"===e.kind))).find((e=>t.some((t=>e.label.toLowerCase().includes(t)))));return !s&&n.length&&t.includes("back")&&(s=n[n.length-1]),s&&(e.video.deviceId=i.exact?{exact:s.deviceId}:{ideal:s.deviceId}),e.video=o(e.video),b("chrome: "+JSON.stringify(e)),r(e)}))}e.video=o(e.video);}return b("chrome: "+JSON.stringify(e)),r(e)},i=function(e){return t.version>=64?e:{name:{PermissionDeniedError:"NotAllowedError",PermissionDismissedError:"NotAllowedError",InvalidStateError:"NotAllowedError",DevicesNotFoundError:"NotFoundError",ConstraintNotSatisfiedError:"OverconstrainedError",TrackStartError:"NotReadableError",MediaDeviceFailedDueToShutdown:"NotAllowedError",MediaDeviceKillSwitchOn:"NotAllowedError",TabCaptureError:"AbortError",ScreenCaptureError:"AbortError",DeviceCaptureError:"AbortError"}[e.name]||e.name,message:e.message,constraint:e.constraint||e.constraintName,toString(){return this.name+(this.message&&": ")+this.message}}};if(n.getUserMedia=function(e,t,o){r(e,(e=>{n.webkitGetUserMedia(e,t,(e=>{o&&o(i(e));}));}));}.bind(n),n.mediaDevices.getUserMedia){const e=n.mediaDevices.getUserMedia.bind(n.mediaDevices);n.mediaDevices.getUserMedia=function(t){return r(t,(t=>e(t).then((e=>{if(t.audio&&!e.getAudioTracks().length||t.video&&!e.getVideoTracks().length)throw e.getTracks().forEach((e=>{e.stop();})),new DOMException("","NotFoundError");return e}),(e=>Promise.reject(i(e))))))};}}function S(e,t){e.navigator.mediaDevices&&"getDisplayMedia"in e.navigator.mediaDevices||e.navigator.mediaDevices&&("function"==typeof t?e.navigator.mediaDevices.getDisplayMedia=function(n){return t(n).then((t=>{const o=n.video&&n.video.width,r=n.video&&n.video.height,i=n.video&&n.video.frameRate;return n.video={mandatory:{chromeMediaSource:"desktop",chromeMediaSourceId:t,maxFrameRate:i||3}},o&&(n.video.mandatory.maxWidth=o),r&&(n.video.mandatory.maxHeight=r),e.navigator.mediaDevices.getUserMedia(n)}))}:console.error("shimGetDisplayMedia: getSourceId argument is not a function"));}function C(e){e.MediaStream=e.MediaStream||e.webkitMediaStream;}function w(e){if("object"==typeof e&&e.RTCPeerConnection&&!("ontrack"in e.RTCPeerConnection.prototype)){Object.defineProperty(e.RTCPeerConnection.prototype,"ontrack",{get(){return this._ontrack},set(e){this._ontrack&&this.removeEventListener("track",this._ontrack),this.addEventListener("track",this._ontrack=e);},enumerable:true,configurable:true});const t=e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription=function(){return this._ontrackpoly||(this._ontrackpoly=t=>{t.stream.addEventListener("addtrack",(n=>{let o;o=e.RTCPeerConnection.prototype.getReceivers?this.getReceivers().find((e=>e.track&&e.track.id===n.track.id)):{track:n.track};const r=new Event("track");r.track=n.track,r.receiver=o,r.transceiver={receiver:o},r.streams=[t.stream],this.dispatchEvent(r);})),t.stream.getTracks().forEach((n=>{let o;o=e.RTCPeerConnection.prototype.getReceivers?this.getReceivers().find((e=>e.track&&e.track.id===n.id)):{track:n};const r=new Event("track");r.track=n,r.receiver=o,r.transceiver={receiver:o},r.streams=[t.stream],this.dispatchEvent(r);}));},this.addEventListener("addstream",this._ontrackpoly)),t.apply(this,arguments)};}else l(e,"track",(e=>(e.transceiver||Object.defineProperty(e,"transceiver",{value:{receiver:e.receiver}}),e)));}function T(e){if("object"==typeof e&&e.RTCPeerConnection&&!("getSenders"in e.RTCPeerConnection.prototype)&&"createDTMFSender"in e.RTCPeerConnection.prototype){const t=function(e,t){return {track:t,get dtmf(){return void 0===this._dtmf&&("audio"===t.kind?this._dtmf=e.createDTMFSender(t):this._dtmf=null),this._dtmf},_pc:e}};if(!e.RTCPeerConnection.prototype.getSenders){e.RTCPeerConnection.prototype.getSenders=function(){return this._senders=this._senders||[],this._senders.slice()};const n=e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addTrack=function(e,o){let r=n.apply(this,arguments);return r||(r=t(this,e),this._senders.push(r)),r};const o=e.RTCPeerConnection.prototype.removeTrack;e.RTCPeerConnection.prototype.removeTrack=function(e){o.apply(this,arguments);const t=this._senders.indexOf(e);-1!==t&&this._senders.splice(t,1);};}const n=e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream=function(e){this._senders=this._senders||[],n.apply(this,[e]),e.getTracks().forEach((e=>{this._senders.push(t(this,e));}));};const o=e.RTCPeerConnection.prototype.removeStream;e.RTCPeerConnection.prototype.removeStream=function(e){this._senders=this._senders||[],o.apply(this,[e]),e.getTracks().forEach((e=>{const t=this._senders.find((t=>t.track===e));t&&this._senders.splice(this._senders.indexOf(t),1);}));};}else if("object"==typeof e&&e.RTCPeerConnection&&"getSenders"in e.RTCPeerConnection.prototype&&"createDTMFSender"in e.RTCPeerConnection.prototype&&e.RTCRtpSender&&!("dtmf"in e.RTCRtpSender.prototype)){const t=e.RTCPeerConnection.prototype.getSenders;e.RTCPeerConnection.prototype.getSenders=function(){const e=t.apply(this,[]);return e.forEach((e=>e._pc=this)),e},Object.defineProperty(e.RTCRtpSender.prototype,"dtmf",{get(){return void 0===this._dtmf&&("audio"===this.track.kind?this._dtmf=this._pc.createDTMFSender(this.track):this._dtmf=null),this._dtmf}});}}function E(e){if(!e.RTCPeerConnection)return;const t=e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats=function(){const[e,n,o]=arguments;if(arguments.length>0&&"function"==typeof e)return t.apply(this,arguments);if(0===t.length&&(0===arguments.length||"function"!=typeof e))return t.apply(this,[]);const r=function(e){const t={};return e.result().forEach((e=>{const n={id:e.id,timestamp:e.timestamp,type:{localcandidate:"local-candidate",remotecandidate:"remote-candidate"}[e.type]||e.type};e.names().forEach((t=>{n[t]=e.stat(t);})),t[n.id]=n;})),t},i=function(e){return new Map(Object.keys(e).map((t=>[t,e[t]])))};if(arguments.length>=2){const o=function(e){n(i(r(e)));};return t.apply(this,[o,e])}return new Promise(((e,n)=>{t.apply(this,[function(t){e(i(r(t)));},n]);})).then(n,o)};}function _(e){if(!("object"==typeof e&&e.RTCPeerConnection&&e.RTCRtpSender&&e.RTCRtpReceiver))return;if(!("getStats"in e.RTCRtpSender.prototype)){const t=e.RTCPeerConnection.prototype.getSenders;t&&(e.RTCPeerConnection.prototype.getSenders=function(){const e=t.apply(this,[]);return e.forEach((e=>e._pc=this)),e});const n=e.RTCPeerConnection.prototype.addTrack;n&&(e.RTCPeerConnection.prototype.addTrack=function(){const e=n.apply(this,arguments);return e._pc=this,e}),e.RTCRtpSender.prototype.getStats=function(){const e=this;return this._pc.getStats().then((t=>y(t,e.track,true)))};}if(!("getStats"in e.RTCRtpReceiver.prototype)){const t=e.RTCPeerConnection.prototype.getReceivers;t&&(e.RTCPeerConnection.prototype.getReceivers=function(){const e=t.apply(this,[]);return e.forEach((e=>e._pc=this)),e}),l(e,"track",(e=>(e.receiver._pc=e.srcElement,e))),e.RTCRtpReceiver.prototype.getStats=function(){const e=this;return this._pc.getStats().then((t=>y(t,e.track,false)))};}if(!("getStats"in e.RTCRtpSender.prototype)||!("getStats"in e.RTCRtpReceiver.prototype))return;const t=e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats=function(){if(arguments.length>0&&arguments[0]instanceof e.MediaStreamTrack){const e=arguments[0];let t,n,o;return this.getSenders().forEach((n=>{n.track===e&&(t?o=true:t=n);})),this.getReceivers().forEach((t=>(t.track===e&&(n?o=true:n=t),t.track===e))),o||t&&n?Promise.reject(new DOMException("There are more than one sender or receiver for the track.","InvalidAccessError")):t?t.getStats():n?n.getStats():Promise.reject(new DOMException("There is no sender or receiver for the track.","InvalidAccessError"))}return t.apply(this,arguments)};}function R(e){e.RTCPeerConnection.prototype.getLocalStreams=function(){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},Object.keys(this._shimmedLocalStreams).map((e=>this._shimmedLocalStreams[e][0]))};const t=e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addTrack=function(e,n){if(!n)return t.apply(this,arguments);this._shimmedLocalStreams=this._shimmedLocalStreams||{};const o=t.apply(this,arguments);return this._shimmedLocalStreams[n.id]?-1===this._shimmedLocalStreams[n.id].indexOf(o)&&this._shimmedLocalStreams[n.id].push(o):this._shimmedLocalStreams[n.id]=[n,o],o};const n=e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream=function(e){this._shimmedLocalStreams=this._shimmedLocalStreams||{},e.getTracks().forEach((e=>{if(this.getSenders().find((t=>t.track===e)))throw new DOMException("Track already exists.","InvalidAccessError")}));const t=this.getSenders();n.apply(this,arguments);const o=this.getSenders().filter((e=>-1===t.indexOf(e)));this._shimmedLocalStreams[e.id]=[e].concat(o);};const o=e.RTCPeerConnection.prototype.removeStream;e.RTCPeerConnection.prototype.removeStream=function(e){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},delete this._shimmedLocalStreams[e.id],o.apply(this,arguments)};const r=e.RTCPeerConnection.prototype.removeTrack;e.RTCPeerConnection.prototype.removeTrack=function(e){return this._shimmedLocalStreams=this._shimmedLocalStreams||{},e&&Object.keys(this._shimmedLocalStreams).forEach((t=>{const n=this._shimmedLocalStreams[t].indexOf(e);-1!==n&&this._shimmedLocalStreams[t].splice(n,1),1===this._shimmedLocalStreams[t].length&&delete this._shimmedLocalStreams[t];})),r.apply(this,arguments)};}function M(e,t){if(!e.RTCPeerConnection)return;if(e.RTCPeerConnection.prototype.addTrack&&t.version>=65)return R(e);const n=e.RTCPeerConnection.prototype.getLocalStreams;e.RTCPeerConnection.prototype.getLocalStreams=function(){const e=n.apply(this);return this._reverseStreams=this._reverseStreams||{},e.map((e=>this._reverseStreams[e.id]))};const o=e.RTCPeerConnection.prototype.addStream;e.RTCPeerConnection.prototype.addStream=function(t){if(this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},t.getTracks().forEach((e=>{if(this.getSenders().find((t=>t.track===e)))throw new DOMException("Track already exists.","InvalidAccessError")})),!this._reverseStreams[t.id]){const n=new e.MediaStream(t.getTracks());this._streams[t.id]=n,this._reverseStreams[n.id]=t,t=n;}o.apply(this,[t]);};const r=e.RTCPeerConnection.prototype.removeStream;function i(e,t){let n=t.sdp;return Object.keys(e._reverseStreams||[]).forEach((t=>{const o=e._reverseStreams[t],r=e._streams[o.id];n=n.replace(new RegExp(r.id,"g"),o.id);})),new RTCSessionDescription({type:t.type,sdp:n})}function s(e,t){let n=t.sdp;return Object.keys(e._reverseStreams||[]).forEach((t=>{const o=e._reverseStreams[t],r=e._streams[o.id];n=n.replace(new RegExp(o.id,"g"),r.id);})),new RTCSessionDescription({type:t.type,sdp:n})}e.RTCPeerConnection.prototype.removeStream=function(e){this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{},r.apply(this,[this._streams[e.id]||e]),delete this._reverseStreams[this._streams[e.id]?this._streams[e.id].id:e.id],delete this._streams[e.id];},e.RTCPeerConnection.prototype.addTrack=function(t,n){if("closed"===this.signalingState)throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");const o=[].slice.call(arguments,1);if(1!==o.length||!o[0].getTracks().find((e=>e===t)))throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.","NotSupportedError");const r=this.getSenders().find((e=>e.track===t));if(r)throw new DOMException("Track already exists.","InvalidAccessError");this._streams=this._streams||{},this._reverseStreams=this._reverseStreams||{};const i=this._streams[n.id];if(i)i.addTrack(t),Promise.resolve().then((()=>{this.dispatchEvent(new Event("negotiationneeded"));}));else {const o=new e.MediaStream([t]);this._streams[n.id]=o,this._reverseStreams[o.id]=n,this.addStream(o);}return this.getSenders().find((e=>e.track===t))},["createOffer","createAnswer"].forEach((function(t){const n=e.RTCPeerConnection.prototype[t],o={[t](){const e=arguments;return arguments.length&&"function"==typeof arguments[0]?n.apply(this,[t=>{const n=i(this,t);e[0].apply(null,[n]);},t=>{e[1]&&e[1].apply(null,t);},arguments[2]]):n.apply(this,arguments).then((e=>i(this,e)))}};e.RTCPeerConnection.prototype[t]=o[t];}));const a=e.RTCPeerConnection.prototype.setLocalDescription;e.RTCPeerConnection.prototype.setLocalDescription=function(){return arguments.length&&arguments[0].type?(arguments[0]=s(this,arguments[0]),a.apply(this,arguments)):a.apply(this,arguments)};const c=Object.getOwnPropertyDescriptor(e.RTCPeerConnection.prototype,"localDescription");Object.defineProperty(e.RTCPeerConnection.prototype,"localDescription",{get(){const e=c.get.apply(this);return ""===e.type?e:i(this,e)}}),e.RTCPeerConnection.prototype.removeTrack=function(e){if("closed"===this.signalingState)throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.","InvalidStateError");if(!e._pc)throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.","TypeError");if(e._pc!==this)throw new DOMException("Sender was not created by this connection.","InvalidAccessError");let t;this._streams=this._streams||{},Object.keys(this._streams).forEach((n=>{this._streams[n].getTracks().find((t=>e.track===t))&&(t=this._streams[n]);})),t&&(1===t.getTracks().length?this.removeStream(this._reverseStreams[t.id]):t.removeTrack(e.track),this.dispatchEvent(new Event("negotiationneeded")));};}function D(e,t){!e.RTCPeerConnection&&e.webkitRTCPeerConnection&&(e.RTCPeerConnection=e.webkitRTCPeerConnection),e.RTCPeerConnection&&t.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach((function(t){const n=e.RTCPeerConnection.prototype[t],o={[t](){return arguments[0]=new("addIceCandidate"===t?e.RTCIceCandidate:e.RTCSessionDescription)(arguments[0]),n.apply(this,arguments)}};e.RTCPeerConnection.prototype[t]=o[t];}));}function I(e,t){l(e,"negotiationneeded",(e=>{const n=e.target;if(!(t.version<72||n.getConfiguration&&"plan-b"===n.getConfiguration().sdpSemantics)||"stable"===n.signalingState)return e}));}var P=n(226),x=n.n(P);function O(e){const t=e&&e.navigator,n=t.mediaDevices.getUserMedia.bind(t.mediaDevices);t.mediaDevices.getUserMedia=function(e){return n(e).catch((e=>Promise.reject(function(e){return {name:{PermissionDeniedError:"NotAllowedError"}[e.name]||e.name,message:e.message,constraint:e.constraint,toString(){return this.name}}}(e))))};}function A(e){"getDisplayMedia"in e.navigator&&e.navigator.mediaDevices&&(e.navigator.mediaDevices&&"getDisplayMedia"in e.navigator.mediaDevices||(e.navigator.mediaDevices.getDisplayMedia=e.navigator.getDisplayMedia.bind(e.navigator)));}function L(e,t){if(e.RTCIceGatherer&&(e.RTCIceCandidate||(e.RTCIceCandidate=function(e){return e}),e.RTCSessionDescription||(e.RTCSessionDescription=function(e){return e}),t.version<15025)){const t=Object.getOwnPropertyDescriptor(e.MediaStreamTrack.prototype,"enabled");Object.defineProperty(e.MediaStreamTrack.prototype,"enabled",{set(e){t.set.call(this,e);const n=new Event("enabled");n.enabled=e,this.dispatchEvent(n);}});}e.RTCRtpSender&&!("dtmf"in e.RTCRtpSender.prototype)&&Object.defineProperty(e.RTCRtpSender.prototype,"dtmf",{get(){return void 0===this._dtmf&&("audio"===this.track.kind?this._dtmf=new e.RTCDtmfSender(this):"video"===this.track.kind&&(this._dtmf=null)),this._dtmf}}),e.RTCDtmfSender&&!e.RTCDTMFSender&&(e.RTCDTMFSender=e.RTCDtmfSender);const n=x()(e,t.version);e.RTCPeerConnection=function(e){return e&&e.iceServers&&(e.iceServers=function(e,t){let n=false;return (e=JSON.parse(JSON.stringify(e))).filter((e=>{if(e&&(e.urls||e.url)){let t=e.urls||e.url;e.url&&!e.urls&&f("RTCIceServer.url","RTCIceServer.urls");const o="string"==typeof t;return o&&(t=[t]),t=t.filter((e=>{if(0===e.indexOf("stun:"))return  false;const t=e.startsWith("turn")&&!e.startsWith("turn:[")&&e.includes("transport=udp");return t&&!n?(n=true,true):t&&!n})),delete e.url,e.urls=o?t[0]:t,!!t.length}}))}(e.iceServers,t.version),p("ICE servers after filtering:",e.iceServers)),new n(e)},e.RTCPeerConnection.prototype=n.prototype;}function G(e){e.RTCRtpSender&&!("replaceTrack"in e.RTCRtpSender.prototype)&&(e.RTCRtpSender.prototype.replaceTrack=e.RTCRtpSender.prototype.setTrack);}function B(e,t){const n=e&&e.navigator,o=e&&e.MediaStreamTrack;if(n.getUserMedia=function(e,t,o){f("navigator.getUserMedia","navigator.mediaDevices.getUserMedia"),n.mediaDevices.getUserMedia(e).then(t,o);},!(t.version>55&&"autoGainControl"in n.mediaDevices.getSupportedConstraints())){const e=function(e,t,n){t in e&&!(n in e)&&(e[n]=e[t],delete e[t]);},t=n.mediaDevices.getUserMedia.bind(n.mediaDevices);if(n.mediaDevices.getUserMedia=function(n){return "object"==typeof n&&"object"==typeof n.audio&&(n=JSON.parse(JSON.stringify(n)),e(n.audio,"autoGainControl","mozAutoGainControl"),e(n.audio,"noiseSuppression","mozNoiseSuppression")),t(n)},o&&o.prototype.getSettings){const t=o.prototype.getSettings;o.prototype.getSettings=function(){const n=t.apply(this,arguments);return e(n,"mozAutoGainControl","autoGainControl"),e(n,"mozNoiseSuppression","noiseSuppression"),n};}if(o&&o.prototype.applyConstraints){const t=o.prototype.applyConstraints;o.prototype.applyConstraints=function(n){return "audio"===this.kind&&"object"==typeof n&&(n=JSON.parse(JSON.stringify(n)),e(n,"autoGainControl","mozAutoGainControl"),e(n,"noiseSuppression","mozNoiseSuppression")),t.apply(this,[n])};}}}function j(e,t){e.navigator.mediaDevices&&"getDisplayMedia"in e.navigator.mediaDevices||e.navigator.mediaDevices&&(e.navigator.mediaDevices.getDisplayMedia=function(n){if(!n||!n.video){const e=new DOMException("getDisplayMedia without video constraints is undefined");return e.name="NotFoundError",e.code=8,Promise.reject(e)}return  true===n.video?n.video={mediaSource:t}:n.video.mediaSource=t,e.navigator.mediaDevices.getUserMedia(n)});}function F(e){"object"==typeof e&&e.RTCTrackEvent&&"receiver"in e.RTCTrackEvent.prototype&&!("transceiver"in e.RTCTrackEvent.prototype)&&Object.defineProperty(e.RTCTrackEvent.prototype,"transceiver",{get(){return {receiver:this.receiver}}});}function N(e,t){if("object"!=typeof e||!e.RTCPeerConnection&&!e.mozRTCPeerConnection)return;!e.RTCPeerConnection&&e.mozRTCPeerConnection&&(e.RTCPeerConnection=e.mozRTCPeerConnection),t.version<53&&["setLocalDescription","setRemoteDescription","addIceCandidate"].forEach((function(t){const n=e.RTCPeerConnection.prototype[t],o={[t](){return arguments[0]=new("addIceCandidate"===t?e.RTCIceCandidate:e.RTCSessionDescription)(arguments[0]),n.apply(this,arguments)}};e.RTCPeerConnection.prototype[t]=o[t];}));const n={inboundrtp:"inbound-rtp",outboundrtp:"outbound-rtp",candidatepair:"candidate-pair",localcandidate:"local-candidate",remotecandidate:"remote-candidate"},o=e.RTCPeerConnection.prototype.getStats;e.RTCPeerConnection.prototype.getStats=function(){const[e,r,i]=arguments;return o.apply(this,[e||null]).then((e=>{if(t.version<53&&!r)try{e.forEach((e=>{e.type=n[e.type]||e.type;}));}catch(t){if("TypeError"!==t.name)throw t;e.forEach(((t,o)=>{e.set(o,Object.assign({},t,{type:n[t.type]||t.type}));}));}return e})).then(r,i)};}function W(e){if("object"!=typeof e||!e.RTCPeerConnection||!e.RTCRtpSender)return;if(e.RTCRtpSender&&"getStats"in e.RTCRtpSender.prototype)return;const t=e.RTCPeerConnection.prototype.getSenders;t&&(e.RTCPeerConnection.prototype.getSenders=function(){const e=t.apply(this,[]);return e.forEach((e=>e._pc=this)),e});const n=e.RTCPeerConnection.prototype.addTrack;n&&(e.RTCPeerConnection.prototype.addTrack=function(){const e=n.apply(this,arguments);return e._pc=this,e}),e.RTCRtpSender.prototype.getStats=function(){return this.track?this._pc.getStats(this.track):Promise.resolve(new Map)};}function U(e){if("object"!=typeof e||!e.RTCPeerConnection||!e.RTCRtpSender)return;if(e.RTCRtpSender&&"getStats"in e.RTCRtpReceiver.prototype)return;const t=e.RTCPeerConnection.prototype.getReceivers;t&&(e.RTCPeerConnection.prototype.getReceivers=function(){const e=t.apply(this,[]);return e.forEach((e=>e._pc=this)),e}),l(e,"track",(e=>(e.receiver._pc=e.srcElement,e))),e.RTCRtpReceiver.prototype.getStats=function(){return this._pc.getStats(this.track)};}function q(e){e.RTCPeerConnection&&!("removeStream"in e.RTCPeerConnection.prototype)&&(e.RTCPeerConnection.prototype.removeStream=function(e){f("removeStream","removeTrack"),this.getSenders().forEach((t=>{t.track&&e.getTracks().includes(t.track)&&this.removeTrack(t);}));});}function V(e){e.DataChannel&&!e.RTCDataChannel&&(e.RTCDataChannel=e.DataChannel);}function H(e){if("object"!=typeof e||!e.RTCPeerConnection)return;const t=e.RTCPeerConnection.prototype.addTransceiver;t&&(e.RTCPeerConnection.prototype.addTransceiver=function(){this.setParametersPromises=[];const e=arguments[1],n=e&&"sendEncodings"in e;n&&e.sendEncodings.forEach((e=>{if("rid"in e&&!/^[a-z0-9]{0,16}$/i.test(e.rid))throw new TypeError("Invalid RID value provided.");if("scaleResolutionDownBy"in e&&!(parseFloat(e.scaleResolutionDownBy)>=1))throw new RangeError("scale_resolution_down_by must be >= 1.0");if("maxFramerate"in e&&!(parseFloat(e.maxFramerate)>=0))throw new RangeError("max_framerate must be >= 0.0")}));const o=t.apply(this,arguments);if(n){const{sender:t}=o,n=t.getParameters();(!("encodings"in n)||1===n.encodings.length&&0===Object.keys(n.encodings[0]).length)&&(n.encodings=e.sendEncodings,t.sendEncodings=e.sendEncodings,this.setParametersPromises.push(t.setParameters(n).then((()=>{delete t.sendEncodings;})).catch((()=>{delete t.sendEncodings;}))));}return o});}function K(e){if("object"!=typeof e||!e.RTCRtpSender)return;const t=e.RTCRtpSender.prototype.getParameters;t&&(e.RTCRtpSender.prototype.getParameters=function(){const e=t.apply(this,arguments);return "encodings"in e||(e.encodings=[].concat(this.sendEncodings||[{}])),e});}function z(e){if("object"!=typeof e||!e.RTCPeerConnection)return;const t=e.RTCPeerConnection.prototype.createOffer;e.RTCPeerConnection.prototype.createOffer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then((()=>t.apply(this,arguments))).finally((()=>{this.setParametersPromises=[];})):t.apply(this,arguments)};}function $(e){if("object"!=typeof e||!e.RTCPeerConnection)return;const t=e.RTCPeerConnection.prototype.createAnswer;e.RTCPeerConnection.prototype.createAnswer=function(){return this.setParametersPromises&&this.setParametersPromises.length?Promise.all(this.setParametersPromises).then((()=>t.apply(this,arguments))).finally((()=>{this.setParametersPromises=[];})):t.apply(this,arguments)};}function Y(e){if("object"==typeof e&&e.RTCPeerConnection){if("getLocalStreams"in e.RTCPeerConnection.prototype||(e.RTCPeerConnection.prototype.getLocalStreams=function(){return this._localStreams||(this._localStreams=[]),this._localStreams}),!("addStream"in e.RTCPeerConnection.prototype)){const t=e.RTCPeerConnection.prototype.addTrack;e.RTCPeerConnection.prototype.addStream=function(e){this._localStreams||(this._localStreams=[]),this._localStreams.includes(e)||this._localStreams.push(e),e.getAudioTracks().forEach((n=>t.call(this,n,e))),e.getVideoTracks().forEach((n=>t.call(this,n,e)));},e.RTCPeerConnection.prototype.addTrack=function(e,...n){return n&&n.forEach((e=>{this._localStreams?this._localStreams.includes(e)||this._localStreams.push(e):this._localStreams=[e];})),t.apply(this,arguments)};}"removeStream"in e.RTCPeerConnection.prototype||(e.RTCPeerConnection.prototype.removeStream=function(e){this._localStreams||(this._localStreams=[]);const t=this._localStreams.indexOf(e);if(-1===t)return;this._localStreams.splice(t,1);const n=e.getTracks();this.getSenders().forEach((e=>{n.includes(e.track)&&this.removeTrack(e);}));});}}function X(e){if("object"==typeof e&&e.RTCPeerConnection&&("getRemoteStreams"in e.RTCPeerConnection.prototype||(e.RTCPeerConnection.prototype.getRemoteStreams=function(){return this._remoteStreams?this._remoteStreams:[]}),!("onaddstream"in e.RTCPeerConnection.prototype))){Object.defineProperty(e.RTCPeerConnection.prototype,"onaddstream",{get(){return this._onaddstream},set(e){this._onaddstream&&(this.removeEventListener("addstream",this._onaddstream),this.removeEventListener("track",this._onaddstreampoly)),this.addEventListener("addstream",this._onaddstream=e),this.addEventListener("track",this._onaddstreampoly=e=>{e.streams.forEach((e=>{if(this._remoteStreams||(this._remoteStreams=[]),this._remoteStreams.includes(e))return;this._remoteStreams.push(e);const t=new Event("addstream");t.stream=e,this.dispatchEvent(t);}));});}});const t=e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription=function(){const e=this;return this._onaddstreampoly||this.addEventListener("track",this._onaddstreampoly=function(t){t.streams.forEach((t=>{if(e._remoteStreams||(e._remoteStreams=[]),e._remoteStreams.indexOf(t)>=0)return;e._remoteStreams.push(t);const n=new Event("addstream");n.stream=t,e.dispatchEvent(n);}));}),t.apply(e,arguments)};}}function J(e){if("object"!=typeof e||!e.RTCPeerConnection)return;const t=e.RTCPeerConnection.prototype,n=t.createOffer,o=t.createAnswer,r=t.setLocalDescription,i=t.setRemoteDescription,s=t.addIceCandidate;t.createOffer=function(e,t){const o=arguments.length>=2?arguments[2]:arguments[0],r=n.apply(this,[o]);return t?(r.then(e,t),Promise.resolve()):r},t.createAnswer=function(e,t){const n=arguments.length>=2?arguments[2]:arguments[0],r=o.apply(this,[n]);return t?(r.then(e,t),Promise.resolve()):r};let a=function(e,t,n){const o=r.apply(this,[e]);return n?(o.then(t,n),Promise.resolve()):o};t.setLocalDescription=a,a=function(e,t,n){const o=i.apply(this,[e]);return n?(o.then(t,n),Promise.resolve()):o},t.setRemoteDescription=a,a=function(e,t,n){const o=s.apply(this,[e]);return n?(o.then(t,n),Promise.resolve()):o},t.addIceCandidate=a;}function Q(e){const t=e&&e.navigator;if(t.mediaDevices&&t.mediaDevices.getUserMedia){const e=t.mediaDevices,n=e.getUserMedia.bind(e);t.mediaDevices.getUserMedia=e=>n(Z(e));}!t.getUserMedia&&t.mediaDevices&&t.mediaDevices.getUserMedia&&(t.getUserMedia=function(e,n,o){t.mediaDevices.getUserMedia(e).then(n,o);}.bind(t));}function Z(e){return e&&void 0!==e.video?Object.assign({},e,{video:v(e.video)}):e}function ee(e){if(!e.RTCPeerConnection)return;const t=e.RTCPeerConnection;e.RTCPeerConnection=function(e,n){if(e&&e.iceServers){const t=[];for(let n=0;n<e.iceServers.length;n++){let o=e.iceServers[n];!o.hasOwnProperty("urls")&&o.hasOwnProperty("url")?(f("RTCIceServer.url","RTCIceServer.urls"),o=JSON.parse(JSON.stringify(o)),o.urls=o.url,delete o.url,t.push(o)):t.push(e.iceServers[n]);}e.iceServers=t;}return new t(e,n)},e.RTCPeerConnection.prototype=t.prototype,"generateCertificate"in t&&Object.defineProperty(e.RTCPeerConnection,"generateCertificate",{get:()=>t.generateCertificate});}function te(e){"object"==typeof e&&e.RTCTrackEvent&&"receiver"in e.RTCTrackEvent.prototype&&!("transceiver"in e.RTCTrackEvent.prototype)&&Object.defineProperty(e.RTCTrackEvent.prototype,"transceiver",{get(){return {receiver:this.receiver}}});}function ne(e){const t=e.RTCPeerConnection.prototype.createOffer;e.RTCPeerConnection.prototype.createOffer=function(e){if(e){ void 0!==e.offerToReceiveAudio&&(e.offerToReceiveAudio=!!e.offerToReceiveAudio);const t=this.getTransceivers().find((e=>"audio"===e.receiver.track.kind));false===e.offerToReceiveAudio&&t?"sendrecv"===t.direction?t.setDirection?t.setDirection("sendonly"):t.direction="sendonly":"recvonly"===t.direction&&(t.setDirection?t.setDirection("inactive"):t.direction="inactive"):true!==e.offerToReceiveAudio||t||this.addTransceiver("audio"),void 0!==e.offerToReceiveVideo&&(e.offerToReceiveVideo=!!e.offerToReceiveVideo);const n=this.getTransceivers().find((e=>"video"===e.receiver.track.kind));false===e.offerToReceiveVideo&&n?"sendrecv"===n.direction?n.setDirection?n.setDirection("sendonly"):n.direction="sendonly":"recvonly"===n.direction&&(n.setDirection?n.setDirection("inactive"):n.direction="inactive"):true!==e.offerToReceiveVideo||n||this.addTransceiver("video");}return t.apply(this,arguments)};}function oe(e){"object"!=typeof e||e.AudioContext||(e.AudioContext=e.webkitAudioContext);}var re=n(347),ie=n.n(re);function se(e){if(!e.RTCIceCandidate||e.RTCIceCandidate&&"foundation"in e.RTCIceCandidate.prototype)return;const t=e.RTCIceCandidate;e.RTCIceCandidate=function(e){if("object"==typeof e&&e.candidate&&0===e.candidate.indexOf("a=")&&((e=JSON.parse(JSON.stringify(e))).candidate=e.candidate.substr(2)),e.candidate&&e.candidate.length){const n=new t(e),o=ie().parseCandidate(e.candidate),r=Object.assign(n,o);return r.toJSON=function(){return {candidate:r.candidate,sdpMid:r.sdpMid,sdpMLineIndex:r.sdpMLineIndex,usernameFragment:r.usernameFragment}},r}return new t(e)},e.RTCIceCandidate.prototype=t.prototype,l(e,"icecandidate",(t=>(t.candidate&&Object.defineProperty(t,"candidate",{value:new e.RTCIceCandidate(t.candidate),writable:"false"}),t)));}function ae(e,t){if(!e.RTCPeerConnection)return;"sctp"in e.RTCPeerConnection.prototype||Object.defineProperty(e.RTCPeerConnection.prototype,"sctp",{get(){return void 0===this._sctp?null:this._sctp}});const n=function(e){if(!e||!e.sdp)return  false;const t=ie().splitSections(e.sdp);return t.shift(),t.some((e=>{const t=ie().parseMLine(e);return t&&"application"===t.kind&&-1!==t.protocol.indexOf("SCTP")}))},o=function(e){const t=e.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);if(null===t||t.length<2)return  -1;const n=parseInt(t[1],10);return n!=n?-1:n},r=function(e){let n=65536;return "firefox"===t.browser&&(n=t.version<57?-1===e?16384:2147483637:t.version<60?57===t.version?65535:65536:2147483637),n},i=function(e,n){let o=65536;"firefox"===t.browser&&57===t.version&&(o=65535);const r=ie().matchPrefix(e.sdp,"a=max-message-size:");return r.length>0?o=parseInt(r[0].substr(19),10):"firefox"===t.browser&&-1!==n&&(o=2147483637),o},s=e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription=function(){if(this._sctp=null,"chrome"===t.browser&&t.version>=76){const{sdpSemantics:e}=this.getConfiguration();"plan-b"===e&&Object.defineProperty(this,"sctp",{get(){return void 0===this._sctp?null:this._sctp},enumerable:true,configurable:true});}if(n(arguments[0])){const e=o(arguments[0]),t=r(e),n=i(arguments[0],e);let s;s=0===t&&0===n?Number.POSITIVE_INFINITY:0===t||0===n?Math.max(t,n):Math.min(t,n);const a={};Object.defineProperty(a,"maxMessageSize",{get:()=>s}),this._sctp=a;}return s.apply(this,arguments)};}function ce(e){if(!e.RTCPeerConnection||!("createDataChannel"in e.RTCPeerConnection.prototype))return;function t(e,t){const n=e.send;e.send=function(){const o=arguments[0],r=o.length||o.size||o.byteLength;if("open"===e.readyState&&t.sctp&&r>t.sctp.maxMessageSize)throw new TypeError("Message too large (can send a maximum of "+t.sctp.maxMessageSize+" bytes)");return n.apply(e,arguments)};}const n=e.RTCPeerConnection.prototype.createDataChannel;e.RTCPeerConnection.prototype.createDataChannel=function(){const e=n.apply(this,arguments);return t(e,this),e},l(e,"datachannel",(e=>(t(e.channel,e.target),e)));}function de(e){if(!e.RTCPeerConnection||"connectionState"in e.RTCPeerConnection.prototype)return;const t=e.RTCPeerConnection.prototype;Object.defineProperty(t,"connectionState",{get(){return {completed:"connected",checking:"connecting"}[this.iceConnectionState]||this.iceConnectionState},enumerable:true,configurable:true}),Object.defineProperty(t,"onconnectionstatechange",{get(){return this._onconnectionstatechange||null},set(e){this._onconnectionstatechange&&(this.removeEventListener("connectionstatechange",this._onconnectionstatechange),delete this._onconnectionstatechange),e&&this.addEventListener("connectionstatechange",this._onconnectionstatechange=e);},enumerable:true,configurable:true}),["setLocalDescription","setRemoteDescription"].forEach((e=>{const n=t[e];t[e]=function(){return this._connectionstatechangepoly||(this._connectionstatechangepoly=e=>{const t=e.target;if(t._lastConnectionState!==t.connectionState){t._lastConnectionState=t.connectionState;const n=new Event("connectionstatechange",e);t.dispatchEvent(n);}return e},this.addEventListener("iceconnectionstatechange",this._connectionstatechangepoly)),n.apply(this,arguments)};}));}function le(e,t){if(!e.RTCPeerConnection)return;if("chrome"===t.browser&&t.version>=71)return;if("safari"===t.browser&&t.version>=605)return;const n=e.RTCPeerConnection.prototype.setRemoteDescription;e.RTCPeerConnection.prototype.setRemoteDescription=function(t){if(t&&t.sdp&&-1!==t.sdp.indexOf("\na=extmap-allow-mixed")){const n=t.sdp.split("\n").filter((e=>"a=extmap-allow-mixed"!==e.trim())).join("\n");e.RTCSessionDescription&&t instanceof e.RTCSessionDescription?arguments[0]=new e.RTCSessionDescription({type:t.type,sdp:n}):t.sdp=n;}return n.apply(this,arguments)};}function ue(e,t){if(!e.RTCPeerConnection||!e.RTCPeerConnection.prototype)return;const n=e.RTCPeerConnection.prototype.addIceCandidate;n&&0!==n.length&&(e.RTCPeerConnection.prototype.addIceCandidate=function(){return arguments[0]?("chrome"===t.browser&&t.version<78||"firefox"===t.browser&&t.version<68||"safari"===t.browser)&&arguments[0]&&""===arguments[0].candidate?Promise.resolve():n.apply(this,arguments):(arguments[1]&&arguments[1].apply(null),Promise.resolve())});}const he=function({window:n}={},o={shimChrome:true,shimFirefox:true,shimEdge:true,shimSafari:true}){const a=p,c=function(e){const t={browser:null,version:null};if(void 0===e||!e.navigator)return t.browser="Not a browser.",t;const{navigator:n}=e;if(n.mozGetUserMedia)t.browser="firefox",t.version=d(n.userAgent,/Firefox\/(\d+)\./,1);else if(n.webkitGetUserMedia||false===e.isSecureContext&&e.webkitRTCPeerConnection&&!e.RTCIceGatherer)t.browser="chrome",t.version=d(n.userAgent,/Chrom(e|ium)\/(\d+)\./,2);else if(n.mediaDevices&&n.userAgent.match(/Edge\/(\d+).(\d+)$/))t.browser="edge",t.version=d(n.userAgent,/Edge\/(\d+).(\d+)$/,2);else {if(!e.RTCPeerConnection||!n.userAgent.match(/AppleWebKit\/(\d+)\./))return t.browser="Not a supported browser.",t;t.browser="safari",t.version=d(n.userAgent,/AppleWebKit\/(\d+)\./,1),t.supportsUnifiedPlan=e.RTCRtpTransceiver&&"currentDirection"in e.RTCRtpTransceiver.prototype;}return t}(n),l={browserDetails:c,commonShim:s,extractVersion:d,disableLog:u,disableWarnings:h};switch(c.browser){case "chrome":if(!e||!D||!o.shimChrome)return a("Chrome shim is not included in this adapter release."),l;if(null===c.version)return a("Chrome shim can not determine version, not shimming."),l;a("adapter.js shimming chrome."),l.browserShim=e,ue(n,c),k(n,c),C(n),D(n,c),w(n),M(n,c),T(n),E(n),_(n),I(n,c),se(n),de(n),ae(n,c),ce(n),le(n,c);break;case "firefox":if(!r||!N||!o.shimFirefox)return a("Firefox shim is not included in this adapter release."),l;a("adapter.js shimming firefox."),l.browserShim=r,ue(n,c),B(n,c),N(n,c),F(n),q(n),W(n),U(n),V(n),H(n),K(n),z(n),$(n),se(n),de(n),ae(n,c),ce(n);break;case "edge":if(!t||!L||!o.shimEdge)return a("MS edge shim is not included in this adapter release."),l;a("adapter.js shimming edge."),l.browserShim=t,O(n),A(n),L(n,c),G(n),ae(n,c),ce(n);break;case "safari":if(!i||!o.shimSafari)return a("Safari shim is not included in this adapter release."),l;a("adapter.js shimming safari."),l.browserShim=i,ue(n,c),ee(n),ne(n),J(n),Y(n),X(n),te(n),Q(n),oe(n),se(n),ae(n,c),ce(n),le(n,c);break;default:a("Unsupported browser!");}return l}({window:"undefined"==typeof window?void 0:window}),pe=he;var fe,me,ve,ge,ye,be,ke,Se,Ce,we,Te,Ee,_e,Re="2.1.7",De="wss://acceleratorserver.cai.crtrcloud.com:30443/";!function(e){e.LOADING="loading",e.PLAYING="playing",e.ENDED="ended";}(fe||(fe={})),function(e){e.LOADING="loading",e.PLAYING="playing",e.ENDED="ended";}(me||(me={})),function(e){e[e.DISCONNECTED=0]="DISCONNECTED",e[e.CONNECTING=1]="CONNECTING",e[e.ESTABLISHED=2]="ESTABLISHED";}(ve||(ve={})),function(e){e[e.LOCAL=0]="LOCAL",e[e.REMOTE_SRC=1]="REMOTE_SRC",e[e.REMOTE_DRAW=2]="REMOTE_DRAW",e[e.REMOTE_CUSTOM=3]="REMOTE_CUSTOM",e[e.REMOTE_SRC_POS=4]="REMOTE_SRC_POS",e[e.FRONT_DRAW_DELTA_POS=5]="FRONT_DRAW_DELTA_POS";}(ge||(ge={})),function(e){e[e.CREATE_OFFER_FAILED=-2]="CREATE_OFFER_FAILED",e[e.NEED_RECONNECT=-1]="NEED_RECONNECT",e[e.MANUAL_CLOSE=0]="MANUAL_CLOSE",e[e.OTHER_KICK=1]="OTHER_KICK",e[e.HEARTBEAT_TIMEOUT=2]="HEARTBEAT_TIMEOUT",e[e.CONNECT_FAILED=3]="CONNECT_FAILED",e[e.TOKEN_ERROR=4]="TOKEN_ERROR";}(ye||(ye={})),function(e){e[e.TOO_FREQUENTLY=-1]="TOO_FREQUENTLY",e[e.AUTO_RECONNECTING=-2]="AUTO_RECONNECTING",e[e.EXCEEDED_LIMIT_RERTY_TIMES=-3]="EXCEEDED_LIMIT_RERTY_TIMES",e[e.FETCH_ERROR=-4]="FETCH_ERROR",e[e.INVALID_SERVER_SESSION=-5]="INVALID_SERVER_SESSION",e[e.MODE_FORBIDDEN=-6]="MODE_FORBIDDEN";}(be||(be={})),function(e){e.ACK="ack",e.HB="hb",e.CD="cd",e.KM="km",e.SVR="svr",e.SV="sv",e.CLOUD_DEVICE="cloud_device";}(ke||(ke={})),function(e){e[e.CLOSE_HIGH_FREQUENCY=0]="CLOSE_HIGH_FREQUENCY",e[e.UNPACKAGE_SEND=1]="UNPACKAGE_SEND",e[e.PACKAGE_SEND=2]="PACKAGE_SEND",e[e.LIMIT_LENGTH=3]="LIMIT_LENGTH";}(Se||(Se={})),function(e){e[e.touchstart=0]="touchstart",e[e.touchmove=1]="touchmove",e[e.touchend=2]="touchend",e[e.touchcancel=2]="touchcancel";}(Ce||(Ce={})),function(e){e[e.mousedown=0]="mousedown",e[e.mousemove=1]="mousemove",e[e.mouseup=2]="mouseup";}(we||(we={})),function(e){e[e.SUCCESS=0]="SUCCESS",e[e.STREAM_NOT_FOUND=4e3]="STREAM_NOT_FOUND",e[e.STREAM_EXIST=4001]="STREAM_EXIST",e[e.PARAM_ERROR=4002]="PARAM_ERROR",e[e.SERVER_ERROR=5e3]="SERVER_ERROR",e[e.BACK_TO_SOURCE_ERROR=5001]="BACK_TO_SOURCE_ERROR",e[e.BACK_TO_SOURCE_REQ_PARAM_ERROR=5002]="BACK_TO_SOURCE_REQ_PARAM_ERROR",e[e.BACK_TO_SOURCE_RES_PARAM_ERROR=5003]="BACK_TO_SOURCE_RES_PARAM_ERROR";}(Te||(Te={})),function(e){e[e.SUCCESS=0]="SUCCESS",e[e.BUSY=1]="BUSY",e[e.TOKEN_ERROR=2]="TOKEN_ERROR",e[e.SDP_ERROR=6]="SDP_ERROR",e[e.WAIT_HOST=8]="WAIT_HOST",e[e.PLAYERS_NUMBER_OR_ROLE_LIMIT=9]="PLAYERS_NUMBER_OR_ROLE_LIMIT",e[e.PROXY_ERROR=100]="PROXY_ERROR";}(Ee||(Ee={})),function(e){e.Connected="Connected",e.Disconnected="Disconnected",e.Connecting="Connecting",e.Kicked="Kicked";}(_e||(_e={}));const Ie="function"==typeof atob,Pe="function"==typeof btoa,xe="function"==typeof Buffer,Oe="function"==typeof TextDecoder?new TextDecoder:void 0,Ae="function"==typeof TextEncoder?new TextEncoder:void 0,Le=Array.prototype.slice.call("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="),Ge=(e=>{let t={};return e.forEach(((e,n)=>t[e]=n)),t})(Le),Be=/^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/,je=String.fromCharCode.bind(String),Fe="function"==typeof Uint8Array.from?Uint8Array.from.bind(Uint8Array):(e,t=(e=>e))=>new Uint8Array(Array.prototype.slice.call(e,0).map(t)),Ne=e=>e.replace(/[^A-Za-z0-9\+\/]/g,""),We=Pe?e=>btoa(e):xe?e=>Buffer.from(e,"binary").toString("base64"):e=>{let t,n,o,r,i="";const s=e.length%3;for(let s=0;s<e.length;){if((n=e.charCodeAt(s++))>255||(o=e.charCodeAt(s++))>255||(r=e.charCodeAt(s++))>255)throw new TypeError("invalid character found");t=n<<16|o<<8|r,i+=Le[t>>18&63]+Le[t>>12&63]+Le[t>>6&63]+Le[63&t];}return s?i.slice(0,s-3)+"===".substring(s):i},Ue=xe?e=>Buffer.from(e).toString("base64"):e=>{let t=[];for(let n=0,o=e.length;n<o;n+=4096)t.push(je.apply(null,e.subarray(n,n+4096)));return We(t.join(""))},qe=e=>{if(e.length<2)return (t=e.charCodeAt(0))<128?e:t<2048?je(192|t>>>6)+je(128|63&t):je(224|t>>>12&15)+je(128|t>>>6&63)+je(128|63&t);var t=65536+1024*(e.charCodeAt(0)-55296)+(e.charCodeAt(1)-56320);return je(240|t>>>18&7)+je(128|t>>>12&63)+je(128|t>>>6&63)+je(128|63&t)},Ve=/[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g,He=xe?e=>Buffer.from(e,"utf8").toString("base64"):Ae?e=>Ue(Ae.encode(e)):e=>We(e.replace(Ve,qe)),Ke=/[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g,ze=e=>{switch(e.length){case 4:var t=((7&e.charCodeAt(0))<<18|(63&e.charCodeAt(1))<<12|(63&e.charCodeAt(2))<<6|63&e.charCodeAt(3))-65536;return je(55296+(t>>>10))+je(56320+(1023&t));case 3:return je((15&e.charCodeAt(0))<<12|(63&e.charCodeAt(1))<<6|63&e.charCodeAt(2));default:return je((31&e.charCodeAt(0))<<6|63&e.charCodeAt(1))}},$e=Ie?e=>atob(Ne(e)):xe?e=>Buffer.from(e,"base64").toString("binary"):e=>{if(e=e.replace(/\s+/g,""),!Be.test(e))throw new TypeError("malformed base64.");e+="==".slice(2-(3&e.length));let t,n,o,r="";for(let i=0;i<e.length;)t=Ge[e.charAt(i++)]<<18|Ge[e.charAt(i++)]<<12|(n=Ge[e.charAt(i++)])<<6|(o=Ge[e.charAt(i++)]),r+=64===n?je(t>>16&255):64===o?je(t>>16&255,t>>8&255):je(t>>16&255,t>>8&255,255&t);return r},Ye=xe?e=>Fe(Buffer.from(e,"base64")):e=>Fe($e(e),(e=>e.charCodeAt(0))),Xe=xe?e=>Buffer.from(e,"base64").toString("utf8"):Oe?e=>Oe.decode(Ye(e)):e=>$e(e).replace(Ke,ze),Je=(e,t=false)=>t?(e=>e.replace(/=/g,"").replace(/[+\/]/g,(e=>"+"==e?"-":"_")))(He(e)):He(e),Qe=e=>Xe(Ne(e.replace(/[-_]/g,(e=>"-"==e?"+":"/"))));var Ze=n(23),et=n.n(Ze),tt=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},nt=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},ot=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},rt=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},it=function(){return !(!document.fullscreenElement&&!document.webkitIsFullScreen)},st=function(){return !!(/Android|iPhone|iPad|iOS|Phone/i.test(navigator.userAgent)||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>0)},at=function(e){return new Promise((function(t){setTimeout(t,e);}))},ct=function(e,t){for(var n=0,o=t-"".concat(e).length;n<o;n++)e="0".concat(e);return "".concat(e)},dt=function(e,t){return t.replace(/yyyy|YYYY/,e.getFullYear()).replace(/yy|YY/,ct(e.getFullYear()%100,2)).replace(/mm|MM/,ct(e.getMonth()+1,2)).replace(/m|M/g,e.getMonth()+1).replace(/dd|DD/,ct(e.getDate(),2)).replace(/d|D/g,e.getDate()).replace(/hh|HH/,ct(e.getHours(),2)).replace(/h|H/g,e.getHours()).replace(/ii|II/,ct(e.getMinutes(),2)).replace(/i|I/g,e.getMinutes()).replace(/ss|SS/,ct(e.getSeconds(),2)).replace(/s|S/g,e.getSeconds()).replace(/w/g,e.getDay()).replace(/W/g,["日","一","二","三","四","五","六"][e.getDay()])},lt=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];},ut=function(){var e=false,t=navigator.userAgent,n=function(e,t){var n,o,r=navigator.mimeTypes;try{for(var i=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}(r),s=i.next();!s.done;s=i.next())if(s.value[e]===t)return !0}catch(e){n={error:e};}finally{try{s&&!s.done&&(o=i.return)&&o.call(i);}finally{if(n)throw n.error}}return  false};({360:t.indexOf("QihooBrowser")>-1||t.indexOf("QHBrowser")>-1,"360EE":t.indexOf("360EE")>-1,"360SE":t.indexOf("360SE")>-1,"2345Explorer":t.indexOf("2345Explorer")>-1||t.indexOf("Mb2345Browser")>-1||t.indexOf("2345chrome")>-1,Mobile:t.indexOf("Mobi")>-1||t.indexOf("iPh")>-1||t.indexOf("480")>-1});if(window.chrome){var r=t.replace(/^.*Chrome\/([\d]+).*$/,"$1");window.chrome.adblock2345||window.chrome.common2345?true:n("type","application/360softmgrplugin")||n("type","application/mozilla-npqihooquicklogin")||r>36&&window.showModalDialog?e=true:r>45&&!(e=n("type","application/vnd.chromium.remoting-viewer"))&&r>=69&&(e=n("type","application/hwepass2001.installepass2001")||n("type","application/asx"));}return e},ht=function(e,t){return void 0===t&&(t=2),Math.floor(10*e*t)/(10*t)},pt=function(){return +(+new Date+Math.round(1e4*Math.random()))},ft={},mt=function(){var e,t,n=ot(null===(t=null===(e=null===et()||void 0===et()?void 0:et().os)||void 0===e?void 0:e.version)||void 0===t?void 0:t.split("."),2),o=n[0],r=n[1];return o&&r?+"".concat(o,".").concat(r):0},vt=function(){return !(function(){var e,t,n;return (null===(e=null===navigator||void 0===navigator?void 0:navigator.userAgent)||void 0===e?void 0:e.includes("iOS"))||(null===(t=null===navigator||void 0===navigator?void 0:navigator.userAgent)||void 0===t?void 0:t.includes("iPhone"))||(null===(n=null===navigator||void 0===navigator?void 0:navigator.userAgent)||void 0===n?void 0:n.includes("iPad"))}()&&mt()<15.4)},gt=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];return tt(void 0,void 0,void 0,(function(){return nt(this,(function(t){switch(t.label){case 0:return [4,new Blob(rt([],ot(e),false)).arrayBuffer()];case 1:return [2,t.sent()]}}))}))},yt=n(586),bt=n.n(yt),kt={"120p":{width:160,height:120,frameRate:30,bitrate:200,type:"120p"},"180p":{width:320,height:180,frameRate:30,bitrate:350,type:"180p"},"240p":{width:320,height:240,frameRate:30,bitrate:400,type:"240p"},"360p":{width:640,height:360,frameRate:30,bitrate:800,type:"360p"},"480p":{width:640,height:480,frameRate:30,bitrate:900,type:"480p"},"720p":{width:1280,height:720,frameRate:30,bitrate:1500,type:"720p"},"1080p":{width:1920,height:1080,frameRate:30,bitrate:2e3,type:"1080p"}},St=function(){function e(){this.requestQueue=[];}return e.prototype.startBlocking=function(){var e,t=new Promise((function(t){return e=t}));return this.requestQueue.push(e),t},e.prototype.nextTask=function(){this.requestQueue.length<=0||this.requestQueue.shift()();},e.prototype.clearQueue=function(){this.requestQueue=[];},e}(),Ct=n(423),wt=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Tt=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Et=function(){function e(){this.config={checkInterval:500,detectionWindow:5e3,severeDecodingFailureThreshold:9,highDropRateThreshold:9,dropRateThreshold:.9,packetLossThreshold:.1,jitterThreshold:100,enableLog:false},this.currentCodec=null,this.isMonitoring=false,this.checkTimer=null,this.peerConnection=null,this.videoTrack=null,this.severeDecodingState={windowStartTime:0,failureCount:0,lastStats:null},this.highDropRateState={windowStartTime:0,failureCount:0,lastStats:null},this.onAdaptationCallback=null;}return e.prototype.startMonitoring=function(e,t){this.isMonitoring?this.log("Already monitoring, stop first before starting again"):(this.peerConnection=e,this.videoTrack=t,this.isMonitoring=true,this.log("Start monitoring"),this.resetDetectionStates(),this.startCheckLoop());},e.prototype.stopMonitoring=function(e){this.isMonitoring&&(this.log("Stop monitoring from ".concat(e)),this.isMonitoring=false,this.checkTimer&&(clearTimeout(this.checkTimer),this.checkTimer=null),this.peerConnection=null,this.videoTrack=null,this.resetDetectionStates());},e.prototype.onAdaptation=function(e){this.onAdaptationCallback=e;},e.prototype.getCurrentCodec=function(){return this.currentCodec},e.prototype.triggerAdaptation=function(e,t){var n,o={reason:e,currentCodec:this.currentCodec,stats:t,message:this.getReasonMessage(e,t)};this.log("Trigger adaptation: ".concat(o.message)),null===(n=this.onAdaptationCallback)||void 0===n||n.call(this,o),this.stopMonitoring("triggerAdaptation");},e.prototype.startCheckLoop=function(){var e=this;this.isMonitoring&&(this.checkTimer=setTimeout((function(){return wt(e,void 0,void 0,(function(){return Tt(this,(function(e){switch(e.label){case 0:return [4,this.checkCodecPerformance()];case 1:return e.sent(),this.startCheckLoop(),[2]}}))}))}),this.config.checkInterval));},e.prototype.checkCodecPerformance=function(){return wt(this,void 0,Promise,(function(){var e,t,n,o,r;return Tt(this,(function(i){switch(i.label){case 0:if(!this.peerConnection||!this.videoTrack)return [2];i.label=1;case 1:return i.trys.push([1,3,,4]),[4,this.getCodecStats()];case 2:return (e=i.sent())?(this.log("Stats: framesReceived=".concat(e.framesReceived,", framesDecoded=").concat(e.framesDecoded,", framesDropped=").concat(e.framesDropped,", fps=").concat(e.framesPerSecond,", packetsLost=").concat(e.packetsLost,", packetsReceived=").concat(e.packetsReceived,", jitter=").concat(e.jitter.toFixed(2),"ms")),t=this.isNetworkHealthy(e),n=this.detectSevereDecodingFailure(e),o=this.detectHighDropRate(e),t&&n&&o?(this.triggerAdaptation("combined_failure",e),[2]):[3,4]):[2];case 3:return r=i.sent(),this.log("Error checking codec performance: ".concat(r)),[3,4];case 4:return [2]}}))}))},e.prototype.getCodecStats=function(){var e;return wt(this,void 0,Promise,(function(){var t,n,o,r;return Tt(this,(function(i){switch(i.label){case 0:return this.peerConnection&&this.videoTrack?[4,this.peerConnection.getStats(this.videoTrack)]:[2,null];case 1:return t=i.sent(),n=null,o=null,t.forEach((function(e){"inbound-rtp"===e.type&&"video"===e.kind&&(n=e),"codec"===e.type&&(o=e);})),n?((null==o?void 0:o.mimeType)&&(r=(null===(e=o.mimeType.split("/")[1])||void 0===e?void 0:e.toUpperCase())||"UNKNOWN",this.currentCodec!==r&&(this.currentCodec=r,this.log("Detected codec: ".concat(this.currentCodec)))),[2,{framesReceived:n.framesReceived||0,framesDecoded:n.framesDecoded||0,framesDropped:n.framesDropped||0,framesPerSecond:n.framesPerSecond||0,packetsLost:n.packetsLost||0,packetsReceived:n.packetsReceived||0,jitter:1e3*(n.jitter||0),timestamp:n.timestamp||Date.now()}]):[2,null]}}))}))},e.prototype.detectSevereDecodingFailure=function(e){var t=e.framesReceived,n=e.framesDecoded,o=Date.now();0===this.severeDecodingState.windowStartTime&&(this.severeDecodingState.windowStartTime=o);var r=o-this.severeDecodingState.windowStartTime;if(r>this.config.detectionWindow)return this.log("Severe decoding detection window ended: ".concat(this.severeDecodingState.failureCount," failures in ").concat(r,"ms (threshold: ").concat(this.config.severeDecodingFailureThreshold,")")),this.severeDecodingState.windowStartTime=0,this.severeDecodingState.failureCount=0,false;var i=t>0?n/t:1;return !!((t>10&&0===n||t>30&&i<.1)&&(this.severeDecodingState.failureCount=this.severeDecodingState.failureCount+1,this.severeDecodingState.lastStats=e,this.log("Severe decoding failure detected (".concat(this.severeDecodingState.failureCount,"/").concat(this.config.severeDecodingFailureThreshold,"): framesReceived=").concat(t,", framesDecoded=").concat(n,", decodeRate=").concat((100*i).toFixed(2),"%")),this.severeDecodingState.failureCount>=this.config.severeDecodingFailureThreshold))&&(this.log("Severe decoding failure threshold reached: ".concat(this.severeDecodingState.failureCount," failures in ").concat(r,"ms")),true)},e.prototype.detectHighDropRate=function(e){var t=e.framesReceived,n=e.framesDropped,o=Date.now();if(0===t)return  false;0===this.highDropRateState.windowStartTime&&(this.highDropRateState.windowStartTime=o);var r=o-this.highDropRateState.windowStartTime;if(r>this.config.detectionWindow)return this.log("High drop rate detection window ended: ".concat(this.highDropRateState.failureCount," failures in ").concat(r,"ms (threshold: ").concat(this.config.highDropRateThreshold,")")),this.highDropRateState.windowStartTime=0,this.highDropRateState.failureCount=0,false;var i=n/t;return i>this.config.dropRateThreshold&&(this.highDropRateState.failureCount=this.highDropRateState.failureCount+1,this.highDropRateState.lastStats=e,this.log("High drop rate detected (".concat(this.highDropRateState.failureCount,"/").concat(this.config.highDropRateThreshold,"): dropRate=").concat((100*i).toFixed(2),"% (").concat(n,"/").concat(t,")")),this.highDropRateState.failureCount>=this.config.highDropRateThreshold)&&(this.log("High drop rate threshold reached: ".concat(this.highDropRateState.failureCount," failures in ").concat(r,"ms")),true)},e.prototype.isNetworkHealthy=function(e){var t=e.packetsLost,n=e.packetsReceived,o=e.jitter,r=t+n,i=(r>0?t/r:0)<this.config.packetLossThreshold,s=o<this.config.jitterThreshold;return i&&s},e.prototype.resetDetectionStates=function(){this.severeDecodingState={windowStartTime:0,failureCount:0,lastStats:null},this.highDropRateState={windowStartTime:0,failureCount:0,lastStats:null};},e.prototype.getReasonMessage=function(e,t){var n=t.framesReceived>0?(t.framesDecoded/t.framesReceived*100).toFixed(2):"0",o=t.framesReceived>0?(t.framesDropped/t.framesReceived*100).toFixed(2):"0";switch(e){case "severe_decoding_failure":return "Severe decoding failure: received ".concat(t.framesReceived," frames but only decoded ").concat(t.framesDecoded," frames");case "high_drop_rate":return "High frame drop rate: ".concat(o,"% (").concat(t.framesDropped,"/").concat(t.framesReceived,")");case "combined_failure":return "Combined failure: Network is good but DecodeRate=".concat(n,"% (").concat(t.framesDecoded,"/").concat(t.framesReceived,"), DropRate=").concat(o,"% (").concat(t.framesDropped,"/").concat(t.framesReceived,")");default:return "Unknown reason"}},e.prototype.log=function(e){this.config.enableLog&&console.log("[CodecAdaptationManager] ".concat(e));},e}();const _t=Et;var Rt=function(){return Rt=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Rt.apply(this,arguments)},Mt=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Dt=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},It={},Pt=function(){function e(e){var t=e.sdk;this.forceShowCursor=false,this.forceLockCursor=false,this.showCursor=true,this.remoteCursorMode=ge.LOCAL,this.mobileCursorScale=1,this.mobileShowCursor=true,this.originCursorStyle="",this.hotSpot={x:0,y:0},this.remoteCursorImage="",this.token="",this.keepLastFrame=false,this.serverSideDescription="",this.serverSideDescriptionFormatted=null,this.latestActionTime=+new Date,this.receivedOnloadedmetadataCallback=false,this.connectBeginTime=0,this.connectTimeoutCount=0,this.connectStatus=ve.DISCONNECTED,this.heartbeatTimer=null,this.newConnectTimeout=60,this.noflowTimeout=10,this.peerConnection=null,this.kmDataChannel=null,this.ackDataChannel=null,this.hbDataChannel=null,this.cdDataChannel=null,this.svrDataChannel=null,this.cloudDeviceDataChannel=null,this.customDataChannel=new Map,this.ackDataChannelTimer=null,this.connectionType="single",this.mediaStream=null,this.audioMediaStream=null,this.camera=null,this.mic=null,this.cameraMediaStream=null,this.micMediaStream=null,this.audioTransceiver=null,this.videoTransceiver=null,this.cameraProfile=kt["720p"],this.micProfile={sampleRate:44100,echoCancellation:true,autoGainControl:true,noiseSuppression:true,deviceId:null},this.multiTrackMediaStreams=new Map,this.multiTrackInstanceLimit=10,this.switchCameraRequestQueue=new St,this.switchCameraRequesting=false,this.switchMicRequestQueue=new St,this.switchMicRequesting=false,this.codecManager=new _t,this.codecMonitoringTimer=null,this.clientSideDescription=null,this.requestId="",this.firstHitInput=true,this.dataChannelCallbacks={},this.dataChannelRetryTimers={},this.checkMouseShowInterval=null,this.idleThreshold=3e5,this.idleTimes=0,this.lastInputStatus=false,this.noFlowCount=0,this.statsThreshold=0,this.gameStatus="playing",this.streamPushStat=null,this._webrtcStartTime=null,this.sdk=null,this.mount=null,this._setRemoteDescriptionTime=null,this.firstFlags={ice:true,peerConnection:true,firstFrameRender:true,firstFrameReceived:true},this.sdk=t;}return Object.defineProperty(e.prototype,"webrtcStartTime",{get:function(){return this._webrtcStartTime},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"setRemoteDescriptionTime",{get:function(){return this._setRemoteDescriptionTime},set:function(e){this._setRemoteDescriptionTime=e;},enumerable:false,configurable:true}),e.prototype.init=function(e){var t,n;return Mt(this,void 0,void 0,(function(){var o,r,i,s,a;return Dt(this,(function(c){switch(c.label){case 0:if(this.sdk.log("CloudGamingWebRTC init"),this.forceShowCursor=null!==(t=e.forceShowCursor)&&void 0!==t&&t,this.idleThreshold=e.idleThreshold?1e3*e.idleThreshold:3e5,this.keepLastFrame=null!==(n=e.keepLastFrame)&&void 0!==n&&n,this.mount=e.mount,this.peerConnection)return this.sdk.log("please disconnect(this.sdk.destroy()) before init"),[2,this.sdk.onInitSuccess({code:-2,msg:"please disconnect(this.sdk.destroy()) before init"})];o=function(){var e=false;if(window.RTCRtpReceiver&&(null===RTCRtpReceiver||void 0===RTCRtpReceiver?void 0:RTCRtpReceiver.getCapabilities)){var t=RTCRtpReceiver.getCapabilities("video");return t.codecs.forEach((function(t){"video/H264"!==t.mimeType||(e=true);})),{canReceive:e,capabilities:t}}return console.log("RTCRtpReceiver.getCapabilities is not a function"),{canReceive:e,capabilities:{}}}(),r=o.canReceive,i=o.capabilities,this.sdk.log("canReceiveH264",r),this.sdk.log("capabilities.codecs",null==i?void 0:i.codecs),this.sdk.log("capabilities.headerExtensions",null==i?void 0:i.headerExtensions),c.label=1;case 1:return c.trys.push([1,3,,4]),s=this,[4,this.newWebRtcConnection()];case 2:return s.clientSideDescription=c.sent(),this.sdk.onInitSuccess({code:0,msg:"ok",description:this.clientSideDescription}),[3,4];case 3:return a=c.sent(),this.sdk.log("webrtc init error",a.message),this.sdk.onInitSuccess({code:-1,msg:"your browser without webrtc support",description:this.clientSideDescription}),[3,4];case 4:return [2]}}))}))},Object.defineProperty(e.prototype,"debugSetting",{get:function(){return this.sdk.getInitOptions().debugSetting||{}},enumerable:false,configurable:true}),e.prototype.sendKmData=function(e){this.idleTimes=0,this.latestActionTime=+new Date,this.debugSetting.showSendKmData&&console.log("sendKmData",e),this.dataChannelSend(this.kmDataChannel,e);},e.prototype.sendAckData=function(e){var t=e.data,n=void 0===t?It:t,o=e.retry,r=void 0===o?0:o,i=e.callback,s=void 0===i?lt:i,a=e.interval,c=void 0===a?1e3:a,d=n.type;"cursor_state"!==d&&"keys_clean"!==d&&(this.latestActionTime=+new Date,this.idleTimes=0);var l=pt();this.dataChannelSendWithCallback({dataChannel:this.ackDataChannel,ackMsg:{seq:l,data:n},retry:r,callback:s,interval:c}),this.debugSetting.showSendAckData&&("cursor_state"===d||console.log("sendAckData:",n,l));},e.prototype.sendCloudDeviceData=function(e){this.debugSetting.showSendCloudDeviceData&&console.log("sendCloudDeviceData",e),this.dataChannelSend(this.cloudDeviceDataChannel,e);},e.prototype.connect=function(e){var t,n,o;void 0===e&&(e=""),this.sdk.log("connect-> type: ",this.connectionType),this.sdk.showStats.setServerSessionTime(+new Date);var r=+new Date;if("connected"===(null===(t=this.peerConnection)||void 0===t?void 0:t.connectionState)||"connecting"===(null===(n=this.peerConnection)||void 0===n?void 0:n.connectionState))return this.sdk.log("peerConnection status is ".concat(null===(o=this.peerConnection)||void 0===o?void 0:o.connectionState,", please clear current connection before call start()")),void this.sdk.onConnectFailed({code:be.TOO_FREQUENTLY,msg:"connect too frequently"});this.connectBeginTime=r,this.connectTimeoutCount=0,this.connectStatus=ve.CONNECTING;try{this.serverSideDescription=Qe(e);}catch(e){throw "serverSession is not base64 string format"}this.serverSideDescription?this.onAnswer(this.serverSideDescription):this.sdk.onWebrtcStatusChange({code:-1,msg:"set server description failed, please try again later."});},e.prototype.getClientSideDescription=function(e){ void 0===e&&(e=true),this.clientSideDescription||console.error("webrtc is not initialized");try{return e?Je(JSON.stringify(this.clientSideDescription)):this.clientSideDescription}catch(e){console.error("clientSideDescription is not jsonString or encoding failure");}},e.prototype.newWebRtcConnection=function(e){var t,n=void 0===e?{}:e,o=n.instanceIds,r=void 0===o?[]:o,i=n.type,s=void 0===i?"single":i,a=n.preferredCodecList,c=void 0===a?null===(t=this.sdk.getInitOptions().streaming)||void 0===t?void 0:t.videoCodecList:a;return Mt(this,void 0,void 0,(function(){var e,t,n,o=this;return Dt(this,(function(i){switch(i.label){case 0:return i.trys.push([0,3,,4]),[4,this.clearPeerConnection()];case 1:i.sent(),this.connectionType=s,this._webrtcStartTime=+new Date,this.sdk.initShowStats();try{this.peerConnection=new RTCPeerConnection({sdpSemantics:"unified-plan"});}catch(e){if(this.sdk.log("new RTCPeerConnection error",e),"ReferenceError"===e.name&&e.message.includes("RTCPeerConnection"))throw this.sdk.onWebrtcStatusChange({code:255,msg:"your browser without webrtc support"}),console.log("your browser without webrtc support"),"your browser without webrtc support";return [2]}return this.connectStatus=ve.CONNECTING,this.peerConnection.ontrack=function(e){return o.onTrack(e)},this.peerConnection.onconnectionstatechange=function(){return o.onConnectionStateChange()},this.peerConnection.oniceconnectionstatechange=function(){return o.onIceConnectionStateChange()},this.peerConnection.onicecandidate=function(){},this.peerConnection.onnegotiationneeded=function(){o.sdk.log("onnegotiationneeded");},(null===navigator||void 0===navigator?void 0:navigator.mediaDevices)&&(navigator.mediaDevices.ondevicechange=function(e){o.sdk.onDeviceChange(e);}),this.createKmDataChannel(),this.createHbDataChannel(),this.createAckDataChannel(),this.createSvrDataChannel(),this.createCloudDeviceDataChannel(),e=this.sdk.getInitOptions(),t=e.mic,n=e.camera,null===this.mic&&(this.mic=t),null===this.camera&&(this.camera=n),[4,this.createOffer({mic:this.mic,camera:this.camera,instanceIds:r,preferredCodecList:c})];case 2:return [2,i.sent()];case 3:throw i.sent();case 4:return [2]}}))}))},e.prototype.getCursorShowStatus=function(){return !(!this.sdk.isMobileGame&&"touch"!==this.sdk.getClientInteractMode())||this.showCursor},e.prototype.mouseDeltaMove=function(){return this.remoteCursorMode===ge.REMOTE_SRC_POS||this.remoteCursorMode===ge.FRONT_DRAW_DELTA_POS},e.prototype.lockMouse=function(e){var t,n,o;return Mt(this,void 0,void 0,(function(){var r;return Dt(this,(function(i){switch(i.label){case 0:if("touch"===this.sdk.getClientInteractMode())return [2];if(!e)return [3,5];i.label=1;case 1:return i.trys.push([1,3,,4]),[4,null===(n=(t=this.sdk.getVideoElement()).requestPointerLock)||void 0===n?void 0:n.call(t)];case 2:return i.sent(),[3,4];case 3:return r=i.sent(),this.sdk.log("requestPointerLock error",r),this.sdk.onEvent({type:"pointerlockerror"}),[3,4];case 4:return [3,6];case 5:try{null===(o=document.exitPointerLock)||void 0===o||o.call(document);}catch(e){this.sdk.log("exitPointerLock error",e);}i.label=6;case 6:return this.remoteCursorMode===ge.REMOTE_SRC_POS&&(e?this.sdk.pageEvent.setDropMouseEvent(false):this.sdk.pageEvent.setDropMouseEvent(true)),[2]}}))}))},e.prototype.isMouseLocked=function(){return document.pointerLockElement===this.sdk.getVideoElement()},e.prototype.setForceShowCursor=function(e){this.forceShowCursor=e;},e.prototype.setForceLockCursor=function(e){this.forceLockCursor=e;},e.prototype.getForceShowCursor=function(){return this.forceShowCursor},e.prototype.clearPeerConnection=function(){return Mt(this,void 0,void 0,(function(){var e,t;return Dt(this,(function(n){switch(n.label){case 0:return this.mediaStream&&(this.mediaStream.getTracks().forEach((function(e){e.stop();})),this.mediaStream=null),this.audioMediaStream&&(this.audioMediaStream.getTracks().forEach((function(e){e.stop();})),this.audioMediaStream=null),this.multiTrackMediaStreams.size&&(this.multiTrackMediaStreams.forEach((function(e){e.mediaStream.getTracks().forEach((function(e){e.stop();}));})),this.multiTrackMediaStreams.clear()),this.dataChannelCallbacks={},this.peerConnection?(this.kmDataChannel&&(this.kmDataChannel.close(),this.kmDataChannel=null),this.hbDataChannel&&(this.hbDataChannel.close(),this.hbDataChannel=null),this.ackDataChannel&&(this.ackDataChannel.close(),this.ackDataChannel=null),this.cdDataChannel&&(this.cdDataChannel.close(),this.cdDataChannel=null),this.svrDataChannel&&(this.svrDataChannel.close(),this.svrDataChannel=null),this.customDataChannel.size&&(this.customDataChannel.forEach((function(e){return e.close()})),this.customDataChannel.clear()),this.videoTransceiver?[4,this.switchTrack({type:"video",status:"remove",userMedia:this.cameraMediaStream})]:[3,2]):[3,5];case 1:n.sent(),this.videoTransceiver=null,n.label=2;case 2:return this.audioTransceiver?[4,this.switchTrack({type:"audio",status:"remove",userMedia:this.micMediaStream})]:[3,4];case 3:n.sent(),this.audioTransceiver=null,n.label=4;case 4:this.peerConnection&&(this.peerConnection.close(),this.peerConnection.ontrack=null,this.peerConnection.oniceconnectionstatechange=null,this.peerConnection.onicecandidate=null,this.peerConnection=null,this.sdk.showStats.toggleMetricReportBulk(false)),(null==(e=this.sdk.getVideoElement())?void 0:e.srcObject)&&(e.srcObject=null),(null==(t=this.sdk.getAudioElement())?void 0:t.srcObject)&&(t.srcObject=null),n.label=5;case 5:return this.clientSideDescription=null,this.serverSideDescription=null,this.serverSideDescriptionFormatted=null,clearInterval(this.heartbeatTimer),this.checkMouseShowInterval&&(clearInterval(this.checkMouseShowInterval),this.checkMouseShowInterval=null),this.sdk.pageEvent.clearEvent(),this.receivedOnloadedmetadataCallback=null,this.codecManager&&this.codecManager.stopMonitoring("clearPeerConnection"),this.sdk.log("peerConnection",this.peerConnection),[2]}}))}))},e.prototype.disconnected=function(e){var t,n=e.message,o=void 0===n?"":n,r=e.code,i=void 0===r?null:r;this.sdk.log("disconnected",i,o),this.connectStatus=ve.DISCONNECTED,this.keepLastFrame&&(null===(t=this.sdk.getVideoElement())||void 0===t||t.pause()),i===ye.OTHER_KICK&&this.sdk.getRestartElement()&&(this.sdk.getRestartElement().style.display="block"),this.clearPeerConnection(),this.sdk.getInitOptions().reconnect&&i===ye.NEED_RECONNECT?this.reconnect({message:o}):(this.sdk.log("destroy code: ".concat(i," and clear reconnect token")),this.sdk.watchdog.setReconnectInfo({serverIp:"",token:""})),this.sdk.onDisconnect({code:i,msg:o}),this.sdk.log("call onDisconnect, code",i);},e.prototype.reconnect=function(e){var t=e.message,n=void 0===t?"":t;this.sdk.log("reconnect, setup reconnect server_ip=".concat(this.gameConfig.server_ip," and token=").concat(this.token)),this.sdk.watchdog.setReconnectInfo({serverIp:this.gameConfig.server_ip,token:this.token}),this.sdk.watchdog.autoReconnect({message:n});},e.prototype.getRemoteCursorState=function(e){this.sendAckData({data:{type:e}});},e.prototype.getIdleTime=function(){return +new Date-this.latestActionTime},e.prototype.checkUserIdle=function(){var e=this.getIdleTime();if(e>this.idleThreshold){var t=Math.floor(e/this.idleThreshold);t>this.idleTimes&&(this.sdk.onNetworkChange({status:"idle",times:t}),this.sdk.onEvent({type:"idle",data:{times:t}}),this.idleTimes=t);}},e.prototype.setCursorMode=function(e){var t=this,n=e;e===ge.REMOTE_SRC_POS&&(n=ge.REMOTE_SRC);var o=n===ge.REMOTE_DRAW;if(this.sendAckData({data:{type:"set_cursor",show:n},callback:function(){t.setCursorShowStatus(!o);}}),this.remoteCursorMode=e,e===ge.REMOTE_SRC||e===ge.FRONT_DRAW_DELTA_POS?this.createCdDataChannel():this.cdDataChannel&&(this.cdDataChannel.close(),this.cdDataChannel=null),e===ge.LOCAL){var r=this.sdk.getVideoElement();r&&(this.sdk.log("videoElement.style.cursor will set to origin style",this.originCursorStyle),r.style.cursor="url(".concat(this.originCursorStyle,") ").concat(this.hotSpot.x," ").concat(this.hotSpot.y,", auto"));}e===ge.FRONT_DRAW_DELTA_POS&&this.lockMouse(true);},e.prototype.getCursorMode=function(){return this.remoteCursorMode},e.prototype.getCursorHotSpot=function(){return this.hotSpot},e.prototype.setMobileCursorScale=function(e){this.mobileCursorScale=e;},e.prototype.getDisplayRect=function(){var e,t=(null===(e=this.sdk.getVideoElement())||void 0===e?void 0:e.getBoundingClientRect())||It,n=t.width,o=void 0===n?0:n,r=t.height,i=void 0===r?0:r,s=t.left,a=void 0===s?0:s,c=t.top;return {left:a,top:void 0===c?0:c,width:o,height:i,pixelRatio:window.devicePixelRatio||1}},e.prototype.setDefaultCursorImage=function(e){if(st()){var t=this.sdk.getCursorElement();"dot"===e?(t.style.width="3px",t.style.height="3px",t.style.borderRadius="50%",t.style.backgroundColor="#2dc7ef"):(t.style.width="26px",t.style.height="26px",t.style.backgroundImage="url(".concat(e,")"));}else {var n=this.sdk.getVideoElement();this.originCursorStyle=null!=e?e:"",n.style.cursor="url(".concat(e,") ").concat(this.hotSpot.x," ").concat(this.hotSpot.y,", auto");}},e.prototype.setNewConnectTimeout=function(e){ void 0===e&&(e=60),this.newConnectTimeout=e;},e.prototype.setNoflowTimeout=function(e){ void 0===e&&(e=10),this.noflowTimeout=e;},e.prototype.setKeepLastFrame=function(e){ void 0===e&&(e=false),this.keepLastFrame=e;},e.prototype.setMobileShowCursor=function(e){ void 0===e&&(e=true),this.mobileShowCursor=e;},e.prototype.setGameStatus=function(e){this.gameStatus=e;},e.prototype.createCustomDataChannel=function(e){var t,n,o,r=e.destPort,i=void 0===r?1:r,s=e.maxRetransmits,a=e.maxPacketLifeTime,c=e.onMessage,d=void 0===c?lt:c,l=e.onClose,u=void 0===l?lt:l,h=e.onError,p=void 0===h?lt:h,f=e.label,m=void 0===f?"":f,v=e.protocol,g=void 0===v?"text":v,y=e.type,b=void 0===y?"":y;return Mt(this,void 0,Promise,(function(){var e,r=this;return Dt(this,(function(c){switch(c.label){case 0:return "open"!==(null===(t=this.ackDataChannel)||void 0===t?void 0:t.readyState)?[2,{code:1,msg:"ack dataChannel does not open, please try again later."}]:(m||(m="cs".concat(b?"_".concat(b):"","_").concat(i)),this.sdk.log("start createCustomDataChannel, destPort: ".concat(i,", ackDataChannel state: ").concat(null===(n=this.ackDataChannel)||void 0===n?void 0:n.readyState,", label: ").concat(m,", protocol: ").concat(g,", maxRetransmits: ").concat(s,", maxRetransmits: ").concat(a)),(e=null===(o=this.peerConnection)||void 0===o?void 0:o.createDataChannel(m,{ordered:true,maxRetransmits:s,maxPacketLifeTime:a}))?(e.onmessage=function(e){var t,n;r.sdk.log("dataChannel:".concat(m," onmessage"),"string"==typeof e.data?null===(t=e.data)||void 0===t?void 0:t.length:null===(n=e.data)||void 0===n?void 0:n.byteLength),d(e.data);},e.onclose=function(e){return u(e)},e.onerror=function(e){return p(e)},this.customDataChannel.set(i,e),[4,new Promise((function(e){r.sendAckData({data:{type:"udp_trans",dest_port:i,protocol:g,label:m},callback:function(t){var n=t.data;r.sdk.log("createCustomDataChannel label:".concat(m," destPort:").concat(i," success"),n),e({code:n.code,msg:n.msg});}}),r.sdk.log("customDataChannels",r.customDataChannel),setTimeout((function(){e({code:3,msg:"request timeout, please try again later."});}),5e3);}))]):[3,2]);case 1:return [2,c.sent()];case 2:return this.sdk.log("createCustomDataChannel fail"),[2,{code:1}]}}))}))},e.prototype.sendCustomDataChannelMessage=function(e){var t=e.destPort,n=void 0===t?0:t,o=e.msg,r=void 0===o?"":o,i=this.customDataChannel.get(n);"open"===(null==i?void 0:i.readyState)&&(this.sdk.log("sendCustomDataChannelMessage",r.length,n,null==i?void 0:i.readyState),i.send(r));},e.prototype.setTrackEnable=function(e){var t=e.type,n=void 0===t?"audio":t,o=e.enable,r=void 0===o||o;if(this.sdk.log("setTrackEnable type",n,"enable",r),"audio"===n)return this.audioTransceiver.sender?(this.audioTransceiver.sender.track.enabled=r,this.sdk.log("audioTransceiver.sender",this.audioTransceiver.sender,r),{code:0}):{code:1,message:"audioTransceiver.sender is null"}},e.prototype.switchTrack=function(e){var t,n,o,r,i=e.type,s=e.status,a=e.userMedia;return Mt(this,void 0,Promise,(function(){var e;return Dt(this,(function(c){switch(c.label){case 0:return this.sdk.log("switchTrack type",i,"status",s),"audio"!==i?[3,6]:this.audioTransceiver.sender?"add"!==s?[3,2]:(e=null===(t=null==a?void 0:a.getAudioTracks())||void 0===t?void 0:t[0],[4,this.audioTransceiver.sender.replaceTrack(e)]):[3,5];case 1:c.sent(),c.label=2;case 2:return "remove"!==s?[3,4]:[4,this.audioTransceiver.sender.replaceTrack(null)];case 3:c.sent(),null===(n=null==a?void 0:a.getAudioTracks()[0])||void 0===n||n.stop(),c.label=4;case 4:return [2,{code:0,message:"success"}];case 5:return [2,{code:1,message:"audioTransceiver.sender is null"}];case 6:return "video"!==i?[3,12]:this.videoTransceiver.sender?"add"!==s?[3,8]:(e=null===(o=null==a?void 0:a.getVideoTracks())||void 0===o?void 0:o[0],[4,this.videoTransceiver.sender.replaceTrack(e)]):[3,11];case 7:c.sent(),c.label=8;case 8:return "remove"!==s?[3,10]:[4,this.videoTransceiver.sender.replaceTrack(null)];case 9:c.sent(),null===(r=null==a?void 0:a.getVideoTracks()[0])||void 0===r||r.stop(),c.label=10;case 10:return [2,{code:0,message:"success"}];case 11:return [2,{code:2,message:"videoTransceiver.sender is null"}];case 12:return [2]}}))}))},e.prototype.getMediaStream=function(){return this.mediaStream},e.prototype.getUserMedia=function(){var e,t,n=new MediaStream;return null===(e=this.cameraMediaStream)||void 0===e||e.getTracks().forEach((function(e){n.addTrack(e);})),null===(t=this.micMediaStream)||void 0===t||t.getTracks().forEach((function(e){n.addTrack(e);})),n},e.prototype.switchMic=function(e){var t,n=e.status,o=e.profile;return Mt(this,void 0,Promise,(function(){var e,r,i,s,a,c;return Dt(this,(function(d){switch(d.label){case 0:if(this.sdk.log("switchMic status",n,o),"open"!==n)return [3,5];if(null===(t=this.audioTransceiver.sender)||void 0===t?void 0:t.track)return this.sdk.log("mic opened, audioTransceiver sender",this.audioTransceiver.sender),[2,{code:1,msg:"mic opened",userMedia:null}];d.label=1;case 1:return d.trys.push([1,4,,5]),e=this,[4,this.createUserMedia({mic:null==o||o})];case 2:return e.micMediaStream=d.sent(),[4,this.switchTrack({type:"audio",status:"add",userMedia:this.micMediaStream})];case 3:return r=d.sent(),a=r.code,c=r.message,this.mic=o,this.sdk.onGetUserMediaStatusChange({msg:"mic open",type:"mic",userMedia:this.micMediaStream}),this.sendAckData({data:{type:"switch_mic",status:"open"}}),[2,{code:a,msg:c,userMedia:this.micMediaStream}];case 4:return i=d.sent(),this.sdk.onGetUserMediaStatusChange({msg:i,type:"mic"}),[2,{code:1,msg:i,userMedia:null}];case 5:return "close"!==n?[3,7]:[4,this.switchTrack({type:"audio",status:"remove",userMedia:this.micMediaStream})];case 6:return s=d.sent(),a=s.code,c=s.message,this.mic=false,this.sdk.onGetUserMediaStatusChange({msg:"mic close",type:"mic"}),this.sendAckData({data:{type:"switch_mic",status:"close"}}),[2,{code:a,msg:c,userMedia:null}];case 7:return [2]}}))}))},e.prototype.switchCamera=function(e){var t,n=e.status,o=e.profile;return Mt(this,void 0,Promise,(function(){var e,r,i,s,a,c;return Dt(this,(function(d){switch(d.label){case 0:if(this.sdk.log("switchCamera status",n),"open"!==n)return [3,5];if(null===(t=this.videoTransceiver.sender)||void 0===t?void 0:t.track)return this.sdk.log("camera opened, videoTransceiver sender",this.videoTransceiver.sender),[2,{code:1,msg:"camera opened",userMedia:null}];d.label=1;case 1:return d.trys.push([1,4,,5]),e=this,[4,this.createUserMedia({camera:null==o||o})];case 2:return e.cameraMediaStream=d.sent(),[4,this.switchTrack({type:"video",status:"add",userMedia:this.cameraMediaStream})];case 3:return r=d.sent(),a=r.code,c=r.message,this.camera=o,this.sdk.onGetUserMediaStatusChange({msg:"camera open",type:"camera",userMedia:this.cameraMediaStream}),this.sendAckData({data:{type:"switch_camera",status:"open"}}),[2,{code:a,msg:c,userMedia:this.cameraMediaStream}];case 4:return i=d.sent(),this.sdk.onGetUserMediaStatusChange({msg:i,type:"camera"}),[2,{code:1,msg:i,userMedia:null}];case 5:return "close"!==n?[3,7]:[4,this.switchTrack({type:"video",status:"remove",userMedia:this.cameraMediaStream})];case 6:return s=d.sent(),a=s.code,c=s.message,this.camera=false,this.sendAckData({data:{type:"switch_camera",status:"close"}}),this.sdk.onGetUserMediaStatusChange({msg:"camera close",type:"camera"}),[2,{code:a,msg:c,userMedia:this.cameraMediaStream}];case 7:return [2]}}))}))},e.prototype.setMicProfile=function(e){var t,n;return Mt(this,void 0,Promise,(function(){var o,r;return Dt(this,(function(i){switch(i.label){case 0:if(this.sdk.log("setMicProfile",e),!this.mic)return this.sdk.log("please open mic"),[2];i.label=1;case 1:return i.trys.push([1,3,,4]),o=this,[4,this.createUserMedia({mic:e})];case 2:return o.micMediaStream=i.sent(),this.micMediaStream?(null===(t=this.audioTransceiver.sender)||void 0===t||t.replaceTrack(null===(n=this.micMediaStream.getAudioTracks())||void 0===n?void 0:n[0]),this.sdk.onGetUserMediaStatusChange({msg:"setMicProfile success",type:"mic",userMedia:this.micMediaStream}),[2,{code:0,msg:"success",userMedia:this.micMediaStream}]):[3,4];case 3:return r=i.sent(),this.sdk.onGetUserMediaStatusChange({msg:r,type:"mic"}),[2,{code:1,msg:r,userMedia:null}];case 4:return [2]}}))}))},e.prototype.setCameraProfile=function(e){var t,n;return Mt(this,void 0,Promise,(function(){var o,r;return Dt(this,(function(i){switch(i.label){case 0:if(this.sdk.log("setCameraProfile",e),!this.camera)return this.sdk.log("please open camera"),[2];if("string"==typeof e&&e===this.cameraProfile.type)return this.sdk.log("profile is same as last value"),[2];i.label=1;case 1:return i.trys.push([1,3,,4]),o=this,[4,this.createUserMedia({camera:e})];case 2:return o.cameraMediaStream=i.sent(),this.cameraMediaStream?(null===(t=this.videoTransceiver.sender)||void 0===t||t.replaceTrack(null===(n=this.cameraMediaStream.getVideoTracks())||void 0===n?void 0:n[0]),this.sdk.onGetUserMediaStatusChange({msg:"setCameraProfile success",type:"camera",userMedia:this.cameraMediaStream}),[2,{code:0,msg:"success",userMedia:this.cameraMediaStream}]):[3,4];case 3:return r=i.sent(),this.sdk.onGetUserMediaStatusChange({msg:r,type:"camera"}),[2,{code:1,msg:r,userMedia:null}];case 4:return [2]}}))}))},e.prototype.setCameraBitrate=function(e){return Mt(this,void 0,void 0,(function(){var t,n;return Dt(this,(function(o){switch(o.label){case 0:if(!("RTCRtpSender"in window)||!("setParameters"in window.RTCRtpSender.prototype))return [3,7];if(!this.videoTransceiver.sender)return [3,5];(t=this.videoTransceiver.sender.getParameters()).encodings||(t.encodings=[{}]),"unlimited"===e?delete t.encodings[0].maxBitrate:t.encodings[0].maxBitrate=1e3*e,o.label=1;case 1:return o.trys.push([1,3,,4]),[4,this.videoTransceiver.sender.setParameters(t)];case 2:return o.sent(),this.sdk.log("setCameraBitrate success ".concat("number"==typeof e?e:"unlimited"," kbps")),[3,4];case 3:return n=o.sent(),this.sdk.log("setCameraBitrate error",n),[3,4];case 4:return [3,6];case 5:this.sdk.log("camera sender is not found"),o.label=6;case 6:return [3,8];case 7:this.sdk.log("can not find RTCRtpSender in window"),o.label=8;case 8:return [2]}}))}))},e.prototype.getDevices=function(){return Mt(this,void 0,void 0,(function(){var e,t,n;return Dt(this,(function(o){switch(o.label){case 0:return o.trys.push([0,2,,3]),[4,navigator.mediaDevices.enumerateDevices()];case 1:return e=o.sent(),this.sdk.log("getDevices",e),t=null==e?void 0:e.filter((function(e){return e.kind.includes("input")&&"default"!==e.deviceId})),this.sdk.log("inputDevices",t),[2,t];case 2:throw n=o.sent(),this.sdk.log("getDevices error",n),n;case 3:return [2]}}))}))},e.prototype.getRequestId=function(){return this.requestId},e.prototype.getWebrtcConnectStatus=function(){return this.connectStatus},e.prototype.getMultiTrackMediaStreams=function(){return this.multiTrackMediaStreams},e.prototype.setMultiTrackMediaStream=function(e){var t=e.ssrc,n=e.instanceId,o=this.multiTrackMediaStreams.get(t);o.instanceId=n,this.multiTrackMediaStreams.set(t,o);},Object.defineProperty(e.prototype,"gameConfig",{get:function(){return this.sdk.gameConfig.getConfig({clientId:this.mount})},enumerable:false,configurable:true}),e.prototype.renegotiation=function(e){return Mt(this,void 0,void 0,(function(){var t,n,o;return Dt(this,(function(r){switch(r.label){case 0:if(this.sdk.log("renegotiation"),!vt())return this.sdk.log("renegotiation not support"),this.sdk.log("ios version is",mt()),[2];r.label=1;case 1:return r.trys.push([1,3,,4]),this.sdk.log("renegotiation setRemoteDescription"),this.setRemoteDescriptionTime=+new Date,[4,this.peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:e,type:"offer"}))];case 2:return r.sent(),[3,4];case 3:return t=r.sent(),this.sdk.log("renegotiation setRemoteDescription exception->",t,t.message),this.sdk.onWebrtcStatusChange({code:-1,msg:"setRemoteDescription failed."}),[3,4];case 4:return r.trys.push([4,7,,8]),[4,this.peerConnection.createAnswer()];case 5:return n=r.sent(),this.sdk.log("renegotiation setLocalDescription"),[4,this.peerConnection.setLocalDescription(n)];case 6:return r.sent(),this.sendAckData({data:{type:"user_update",sdp:n.sdp}}),[3,8];case 7:return o=r.sent(),this.sdk.log("renegotiation setLocalDescription exception->",o,o.message),[3,8];case 8:return [2]}}))}))},e.prototype.onAnswer=function(e){var t,n;return void 0===e&&(e=""),Mt(this,void 0,void 0,(function(){var o,r,i,s,a,c,d,l,u,h,p,f,m,v,g,y,b,k,S,C,w;return Dt(this,(function(T){switch(T.label){case 0:if(T.trys.push([0,5,,6]),o=JSON.parse(e),this.sdk.log("onAnswer-> serverSideDescriptionObject",o),!o)return [2,this.sdk.onConnectFailed({code:be.INVALID_SERVER_SESSION,msg:"Server session not available "})];r=o.game_config,i=o.code,s=o.message,a=o.screen_config,c=o.plat,d=o.request_id,l=o.server_ip,u=o.region,h=o.instance_id,p=o.instance_type,f=o.host_name,m=o.video_mime_type,v=o.audio_mime_type,g=o.sdp,y=o.metric_key,this.serverSideDescriptionFormatted=Ct.Qc(g),this.sdk.log("onAnswer-> serverSideDescriptionFormatted",this.serverSideDescriptionFormatted),this.requestId=d,b=a.orientation,k=a.width,S=a.height,T.label=1;case 1:return T.trys.push([1,3,,4]),this.setRemoteDescriptionTime=+new Date,[4,this.peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:g,type:"answer"}))];case 2:return T.sent(),this.sdk.gameConfig.setConfig({clientId:this.mount,config:o}),this.sdk.showStats.setStaticStat({serverIp:l,region:u,instanceId:h,instanceType:p,hostName:f,requestId:d,videoMimeType:m,audioMimeType:v}),this.setGameConfig(r),[3,4];case 3:return C=T.sent(),this.sdk.log("setRemoteDescription exception->",C),this.sdk.onWebrtcStatusChange({code:-1,msg:"setRemoteDescription failed."}),this.sdk.onConnectFailed({code:-7,msg:"setRemoteDescription failed."}),[3,4];case 4:return "android"===(null==c?void 0:c.toLocaleLowerCase())&&(this.sdk.mobileGame=true,this.sdk.pageEvent.remoteScreenResolutionChange({width:null!==(t="portrait"===b?k:S)&&void 0!==t?t:0,height:null!==(n="portrait"===b?S:k)&&void 0!==n?n:0,left:0,top:0})),this.sdk.onWebrtcStatusChange({code:i>1e3?Ee.PROXY_ERROR:i,msg:s}),this.sdk.pageEvent.setRemoteScreenConfig(a),this.sdk.pageEvent.initOrientationDetector(),y&&this.sdk.createMetricSocket({token:y}),[3,6];case 5:return w=T.sent(),this.sdk.log("parse serverSideDescription error",w),this.sdk.onWebrtcStatusChange({code:-1,msg:"parse serverSideDescription error"}),[3,6];case 6:return [2]}}))}))},e.prototype.startHeartbeatReport=function(){var e=this;clearInterval(this.heartbeatTimer),this.sdk.log("startHeartbeatReport ->"),this.heartbeatTimer=setInterval((function(){return Mt(e,void 0,void 0,(function(){var e,t,n;return Dt(this,(function(o){switch(o.label){case 0:return [4,null===(n=this.peerConnection)||void 0===n?void 0:n.getStats(null)];case 1:return e=o.sent(),t=[],null==e||e.forEach((function(e){ void 0===e&&(e={}),"inbound-rtp"!==e.type&&"track"!==e.type&&"codec"!==e.type&&"candidate-pair"!==e.type||t.push(e);})),0===t.length&&(t=[{type:"inbound-rtp",mediaType:"video"},{type:"track",jitterBufferDelay:100*Math.random()%30+10}]),this.sdk.showStats.setStat(t,e),this.reportStat(),[2]}}))}))}),1e3);},e.prototype.startCodecMonitoring=function(){var e=this;this.codecManager&&(clearTimeout(this.codecMonitoringTimer),this.codecManager.onAdaptation((function(t){e.handleCodecAdaptation(t);})),this.codecManager.startMonitoring(this.peerConnection,this.mediaStream.getVideoTracks()[0]),this.codecMonitoringTimer=setTimeout((function(){e.codecManager.stopMonitoring("startCodecMonitoring timeout");}),6e3));},e.prototype.handleCodecAdaptation=function(e){var t=e.reason,n=e.message,o=e.stats,r=e.currentCodec;this.sdk.log("Codec adaptation triggered:",{reason:t,message:n,stats:o,currentCodec:r}),"combined_failure"===t&&"H264"===r&&this.switchDecoder("VP8");},e.prototype.switchDecoder=function(e){return Mt(this,void 0,void 0,(function(){var t,n,o,r,i,s;return Dt(this,(function(a){switch(a.label){case 0:return this.sdk.androidInstance.groupControl.groupControlId?(this.sdk.log("switchDecoder in group control mode is not supported"),[2]):(this.codecManager.stopMonitoring("switchDecoder"),[4,this.newWebRtcConnection({type:this.connectionType,preferredCodecList:["VP8"]})]);case 1:if(a.sent(),this.sdk.showStats.addEventReport({event_code:"switch_decoder",s1:e}),!(t=this.sdk.gameConfig.getConfig({clientId:this.mount}).instance_id))return [3,6];a.label=2;case 2:return a.trys.push([2,4,,5]),[4,this.sdk.accessInfo.createWebRTCSession({instanceId:t,clientSession:this.sdk.getClientSession()})];case 3:return n=a.sent(),o=n.ServerSession,r=n.Code,i=n.Message,this.sdk.log("switch ".concat(e,", response code: ").concat(r,", message: ").concat(i)),0===r&&this.sdk.cloudGamingWebRTC.connect(o),[3,5];case 4:return s=a.sent(),this.sdk.log("switchDecoder connect cache error",s.name,s.message),[3,5];case 5:return [3,7];case 6:this.sdk.log("switchDecoder connect error, instance id is not set"),a.label=7;case 7:return [2]}}))}))},e.prototype.setGameConfig=function(e){ void 0===e&&(e=It);var t=e.sdk_conf;if(t){var n=this.sdk.getInitOptions().keepLastFrame;t.connect_timeout&&this.setNewConnectTimeout(t.connect_timeout),t.noflow_timeout&&this.setNoflowTimeout(t.noflow_timeout),t.cursor_scale&&this.setMobileCursorScale(t.cursor_scale),t.cursor_style&&this.sdk.setRemoteCursorStyle(t.cursor_style),"boolean"==typeof t.keep_lastframe&&void 0===n&&this.setKeepLastFrame(t.keep_lastframe),"boolean"==typeof t.mobile_show_cursor&&this.setMobileShowCursor(t.mobile_show_cursor);}},e.prototype.createUserMedia=function(e){var t=e.mic,n=void 0!==t&&t,o=e.camera,r=void 0!==o&&o;return Mt(this,void 0,void 0,(function(){var e,t,o,i,s,a,c,d,l,u,h;return Dt(this,(function(p){switch(p.label){case 0:return n?(this.sdk.log("createUserMedia mic",n),e=null,"object"!=typeof n?[3,2]:(this.micProfile=Rt(Rt({},this.micProfile),n),d=this.micProfile.deviceId,[4,this.getDevices()])):[3,6];case 1:l=p.sent().map((function(e){return e.deviceId})),this.sdk.log("deviceId",d),this.sdk.log("deviceIds",l),e=Rt(Rt({},this.micProfile),{deviceId:l.includes(d)?{exact:d}:void 0}),p.label=2;case 2:"boolean"==typeof n&&(e=n),this.sdk.log("micProfile",this.micProfile),this.sdk.log("micConstraints",e),p.label=3;case 3:return p.trys.push([3,5,,6]),[4,navigator.mediaDevices.getUserMedia({audio:e})];case 4:return [2,p.sent()];case 5:throw t=p.sent(),this.sdk.log("getUserMedia mic error",t,null==t?void 0:t.name),t.name;case 6:return r?(this.sdk.log("createUserMedia camera",r),o=null,"string"==typeof r&&(Object.keys(kt).includes(r)?this.cameraProfile=kt[r]:this.sdk.log("".concat(r," is not included in camera profile types, use default settings"))),"object"==typeof r&&(this.cameraProfile=Rt(Rt({},this.cameraProfile),r)),i=this.cameraProfile,s=i.width,a=i.height,c=i.frameRate,d=i.deviceId,!st()||"user"!==d&&"environment"!==d?[3,7]:(o={facingMode:{exact:d}},[3,10])):[3,14];case 7:return p.trys.push([7,9,,10]),[4,this.getDevices()];case 8:return l=p.sent().map((function(e){return e.deviceId})),this.sdk.log("deviceId",d),this.sdk.log("deviceIds",l),o={width:{ideal:s},height:{ideal:a},frameRate:c,deviceId:l.includes(d)?{exact:d}:void 0},[3,10];case 9:return u=p.sent(),this.sdk.log("getDevices error, use default cameraConstraints",u.message),o={width:{ideal:s},height:{ideal:a},frameRate:c},[3,10];case 10:"boolean"==typeof r&&(o=r),this.sdk.log("cameraConstraints",o),p.label=11;case 11:return p.trys.push([11,13,,14]),[4,navigator.mediaDevices.getUserMedia({video:o})];case 12:return [2,p.sent()];case 13:throw h=p.sent(),this.sdk.log("getUserMedia camera error",h,null==h?void 0:h.name),h.name;case 14:return [2]}}))}))},e.prototype.createOffer=function(e){var t=e.mic,n=void 0!==t&&t,o=e.camera,r=void 0!==o&&o,i=e.instanceIds,s=void 0===i?[]:i,a=e.preferredCodecList;return Mt(this,void 0,void 0,(function(){var e,t,o,i=this;return Dt(this,(function(c){switch(c.label){case 0:return this.sdk.log("create offer","mic",n,"camera",r,"connectionType",this.connectionType),"single"!==this.connectionType?[3,4]:(this.videoTransceiver=this.peerConnection.addTransceiver("video",{direction:"sendrecv"}),this.audioTransceiver=this.peerConnection.addTransceiver("audio",{direction:"sendrecv"}),n?[4,this.switchMic({status:"open",profile:n})]:[3,2]);case 1:c.sent(),c.label=2;case 2:return r?[4,this.switchCamera({status:"open",profile:r})]:[3,4];case 3:c.sent(),c.label=4;case 4:"multi"===this.connectionType&&s.length&&(s.length>this.multiTrackInstanceLimit&&(s=s.slice(0,this.multiTrackInstanceLimit)),s.forEach((function(){i.peerConnection.addTransceiver("video",{direction:"sendrecv"});}))),c.label=5;case 5:return c.trys.push([5,8,,9]),e=this.onOffer,o={},[4,this.peerConnection.createOffer()];case 6:return [4,e.apply(this,[(o.description=c.sent(),o.instanceIds=s,o.preferredCodecList=a,o)])];case 7:return [2,c.sent()];case 8:return t=c.sent(),this.sdk.log("create offer error",t),this.disconnected({message:"create offer is failed",code:ye.CREATE_OFFER_FAILED}),[3,9];case 9:return [2]}}))}))},e.prototype.onOffer=function(e){var t=e.description,n=e.instanceIds,o=e.preferredCodecList;return Mt(this,void 0,void 0,(function(){var e,r,i,s,a,c,d,l,u,h,p;return Dt(this,(function(f){switch(f.label){case 0:this.sdk.log("onOffer->",t),e=t.sdp,r=t.type,f.label=1;case 1:return f.trys.push([1,3,,4]),[4,this.peerConnection.setLocalDescription({type:r,sdp:e})];case 2:return f.sent(),i=this.peerConnection.localDescription,s=function(e){ void 0===e&&(e="");var t=[];return e.split("\r\n").forEach((function(e){e.includes("profile-level-id")&&(e=e.split("profile-level-id").pop().slice(1),t.push(e));})),t}(i.sdp),this.sdk.isStreamingMultiTrack||this.sdk.log("available profile-level-ids: ",s.join(",")),a=this.sdk.getInitOptions(),c=a.remoteDesktopResolution,d=a.streaming,l=(void 0===d?{}:d).streamName,u=a.streamProfile,h=a.userId,this.clientSideDescription={sdp:e,type:r,deviceInfo:{platform:st()?"mobile":"pc",user_agent:ut()?"".concat(null===navigator||void 0===navigator?void 0:navigator.userAgent," 360 browser"):null===navigator||void 0===navigator?void 0:navigator.userAgent},sdkType:"JS",desktopResolution:(null==c?void 0:c.width)&&(null==c?void 0:c.height)?"".concat(c.width,"x").concat(null==c?void 0:c.height):null,preferredCodecList:null==o?void 0:o.map((function(e){return e.toUpperCase()})),streamName:l,streamProfile:u,userId:h,defaultStreamingUserList:(null==n?void 0:n.length)?n:void 0},this.sdk.log("clientSideDescription",this.clientSideDescription),[2,this.clientSideDescription];case 3:throw p=f.sent(),this.sdk.log("onOffer exception->",null==p?void 0:p.message,null==p?void 0:p.name),null==p?void 0:p.message;case 4:return [2]}}))}))},e.prototype.checkAckDataChannelStatus=function(){var e,t,n=this;this.sdk.log("checkAckDataChannelStatus",null===(e=this.ackDataChannel)||void 0===e?void 0:e.readyState),"open"===(null===(t=this.ackDataChannel)||void 0===t?void 0:t.readyState)?(clearInterval(this.ackDataChannelTimer),this.ackDataChannelTimer=null,this.onLoadedMetaData()):this.ackDataChannelTimer||(this.ackDataChannelTimer=setInterval((function(){n.checkAckDataChannelStatus();}),500));},e.prototype.onTrack=function(e){var t=this,n=e.track,o=e.transceiver,r=e.streams;if(this.sdk.log("onTrack",e.track.kind,e.track),"audio"===n.kind&&n.label.includes("|")){var i=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s}(n.label.split("|"),2),s=i[0],a=i[1];return this.sdk.log("on audio Track",n.label,s,a,r[0].id),this.sdk.createAudioAndAddTrack({id:a,source:r[0]})}if("single"===this.connectionType){if(this.mediaStream||(this.mediaStream=new MediaStream),this.audioMediaStream||(this.audioMediaStream=new MediaStream),"video"===n.kind&&0===this.mediaStream.getVideoTracks().length&&(this.sdk.log("add video stream"),this.mediaStream.addTrack(n)),"audio"===n.kind&&0===this.audioMediaStream.getAudioTracks().length&&(this.sdk.log("add audio stream"),this.audioMediaStream.addTrack(n)),"video"===n.kind){var c=this.sdk.getVideoElement();c&&(c.srcObject||(c.srcObject=this.mediaStream),this.sdk.log("on video Track"),"onloadedmetadata"in HTMLVideoElement.prototype?(this.sdk.log("onloadedmetadata in HTMLVideoElement.prototype"),c.onloadedmetadata=function(){t.receivedOnloadedmetadataCallback||(t.sdk.log("onloadedmetadata callback"),t.receivedOnloadedmetadataCallback=true,t.checkAckDataChannelStatus());},setTimeout((function(){t.receivedOnloadedmetadataCallback||(t.sdk.log("onloadedmetadata timeout, check status"),t.receivedOnloadedmetadataCallback=true,t.checkAckDataChannelStatus());}),1e3)):this.checkAckDataChannelStatus());}if("audio"===n.kind){var d=this.sdk.getAudioElement();d&&(d.srcObject?this.sdk.log("audio srcObject is not null"):d.srcObject=this.audioMediaStream,this.sdk.log("on audio Track"));}}if("multi"===this.connectionType){var l=o.mid,u=this.getSsrc(l),h=u.id,p=u.value;if(h){var f=new MediaStream;f.addTrack(n),this.multiTrackMediaStreams.set(h,{mediaStream:f,instanceId:p});}else this.sdk.log("Can not find ssrc from the mid",l);}},e.prototype.onLoadedMetaData=function(){var e,t,n,o,r,i,s=this;if(this.sdk.log("onLoadedMetaData->"),this.connectStatus===ve.DISCONNECTED)return this.sdk.log("connectStatus is disconnected, onLoadedMetaData return");this.sdk.getCloudGamingContainerElement()&&(this.sdk.getCloudGamingContainerElement().style.display="flex"),this.sdk.getProgressBarElement()&&(this.sdk.getProgressBarElement().style.display="none"),this.sdk.getRestartElement()&&(this.sdk.getRestartElement().style.display="none"),this.sdk.getInitOptions().autoFocusVideo&&this.sdk.getVideoElement().focus(),this.sdk.onEvent({type:"first_frame_received",data:{}}),this.sdk.showStats.addEventReport({event_code:"first_frame_received",consume_time:+new Date-this.sdk.accessTime,i1:this.firstFlags.firstFrameReceived?1:0}),this.firstFlags.firstFrameReceived=false,null===(n=null===(t=null===(e=this.sdk.getVideoElement())||void 0===e?void 0:e.play())||void 0===t?void 0:t.then((function(){return Mt(s,void 0,void 0,(function(){var e=this;return Dt(this,(function(t){switch(t.label){case 0:return this.sdk.log("video play success"),[4,new Promise((function(t){var n=null,o=function(){clearTimeout(n);var r=e.sdk.getVideoElement(),i=r.videoWidth,s=r.videoHeight;if(e.sdk.log("videoWidth",i,"videoHeight",s),i&&s){var a=+new Date-e.sdk.accessTime;e.sdk.log("First frame rendered",i,s,"duration",a),e.sdk.onEvent({type:"first_frame",data:{duration:a,width:i,height:s}}),e.sdk.showStats.setFirstFrameCost(a),e.sdk.showStats.addEventReport({event_code:"first_frame_render",consume_time:a,i1:e.firstFlags.firstFrameRender?1:0}),e.firstFlags.firstFrameRender=false,t(null);}else n=setTimeout((function(){o();}),50);};o();}))];case 1:return t.sent(),this.sdk.onEvent({type:"autoplay",data:{code:0,mediaType:"video",message:"video play success"}}),this.sdk.reshapeWindow("videoPlay"),[2]}}))}))})))||void 0===n||n.catch((function(e){s.sdk.log("video play error, ",e,e.name,null==e?void 0:e.message),s.sdk.onEvent({type:"autoplay",data:{mediaType:"video",code:-1,message:e}});})),null===(i=null===(r=null===(o=this.sdk.getAudioElement())||void 0===o?void 0:o.play())||void 0===r?void 0:r.then((function(){s.sdk.log("audio play success"),s.sdk.onEvent({type:"autoplay",data:{code:0,message:"audio play success",mediaType:"audio"}});})))||void 0===i||i.catch((function(e){s.sdk.log("audio play error, ",e,e.name),s.sdk.onEvent({type:"autoplay",data:{code:-1,message:e,mediaType:"audio"}});})),this.sdk.showStats.setConnectSuccessTime(+new Date),this.connectStatus=ve.ESTABLISHED,this.checkMouseShowInterval||(this.checkMouseShowInterval=setInterval((function(){s.checkUserIdle();}),100)),this.startCodecMonitoring(),this.startHeartbeatReport(),this.sdk.onWebrtcStatsChange(me.PLAYING,this.mount),this.sdk.onConfigurationChange({screen_config:this.sdk.getRemoteScreenConfig()}),this.sdk.onConnectSuccess({code:0,seat_index:this.gameConfig.input_seat,role:this.gameConfig.role}),this.sdk.showStats.toggleMetricReportBulk(true);},e.prototype.getSsrc=function(e){var t,n,o=null===(n=null===(t=this.serverSideDescriptionFormatted)||void 0===t?void 0:t.media)||void 0===n?void 0:n[+e];if(o){var r=o.ssrcs;return (null==r?void 0:r.find((function(e){return "label"===e.attribute})))||{}}return {}},e.prototype.onConnectionStateChange=function(){var e;this.sdk.log("onconnectionstatechange",null===(e=this.peerConnection)||void 0===e?void 0:e.connectionState),this.peerConnection&&("connected"===this.peerConnection.connectionState&&(this.sdk.showStats.addEventReport({event_code:"peer_connection_change",event_result_msg:"connected",consume_time:+new Date-this.setRemoteDescriptionTime,i1:this.firstFlags.peerConnection?1:0}),this.firstFlags.peerConnection=false,"multi"===this.connectionType&&this.checkAckDataChannelStatus()),"disconnected"===this.peerConnection.connectionState&&this.sdk.showStats.addEventReport({event_code:"peer_connection_change",event_result_msg:"disconnected"}),"failed"===this.peerConnection.connectionState&&this.sdk.showStats.addEventReport({event_code:"peer_connection_change",event_result_msg:"failed"}));},e.prototype.onIceConnectionStateChange=function(){this.sdk.log("onIceConnectionStateChange",this.peerConnection.iceConnectionState),this.peerConnection?("connected"===this.peerConnection.iceConnectionState&&(this.sdk.showStats.setIceConnectedTime(+new Date),this.sdk.onEvent({type:"ice_state",data:{value:"connected"}}),this.sdk.showStats.addEventReport({event_code:"ice_connection_change",event_result_msg:"connected",consume_time:+new Date-this.setRemoteDescriptionTime,i1:this.firstFlags.ice?1:0}),this.firstFlags.ice=false),"disconnected"===this.peerConnection.iceConnectionState&&(this.sdk.onEvent({type:"ice_state",data:{value:"disconnected"}}),this.sdk.log("The ICE disconnected, please check the network."),this.sdk.log("Follow the link, https://cloud.tencent.com/document/product/1547/75988, and check your network."),this.disconnected({message:"The ICE disconnected, please check the network.",code:ye.NEED_RECONNECT}),this.sdk.onEvent({type:"ice_state",data:{value:"disconnected"}}),this.sdk.showStats.addEventReport({event_code:"ice_connection_change",event_result_msg:"disconnected"})),"failed"===this.peerConnection.iceConnectionState&&this.sdk.showStats.addEventReport({event_code:"ice_connection_change",event_result_msg:"failed"})):this.sdk.log("The peerConnection disconnected");},e.prototype.createKmDataChannel=function(){var e=this;this.sdk.log("start createKmDataChannel"),this.kmDataChannel=this.peerConnection.createDataChannel(ke.KM,{ordered:true,maxRetransmits:10}),this.kmDataChannel.onmessage=function(t){return e.onKmMessage(t)},this.kmDataChannel.onopen=function(t){return e.onDataChannelOpen(t)},this.kmDataChannel.onclose=function(t){return e.onDataChannelClose(t)},this.kmDataChannel.onerror=function(t){return e.onDataChannelError(t)};},e.prototype.createHbDataChannel=function(){var e=this;this.sdk.log("start createHbDataChannel"),this.hbDataChannel=this.peerConnection.createDataChannel(ke.HB,{ordered:true,maxRetransmits:0}),this.hbDataChannel.onmessage=function(t){return e.onHbMessage(t)},this.hbDataChannel.onopen=function(t){return e.onDataChannelOpen(t)},this.hbDataChannel.onclose=function(t){return e.onDataChannelClose(t)},this.hbDataChannel.onerror=function(t){return e.onDataChannelError(t)};},e.prototype.createAckDataChannel=function(){var e=this;this.sdk.log("start createAckDataChannel"),this.ackDataChannel=this.peerConnection.createDataChannel(ke.ACK,{ordered:true,maxRetransmits:10}),this.ackDataChannel.onmessage=function(t){return e.onAckMessage(t)},this.ackDataChannel.onopen=function(t){return e.onDataChannelOpen(t)},this.ackDataChannel.onclose=function(t){return e.onDataChannelClose(t)},this.ackDataChannel.onerror=function(t){return e.onDataChannelError(t)};},e.prototype.createCdDataChannel=function(){var e,t=this;this.sdk.log("start createCdDataChannel"),this.cdDataChannel=null===(e=this.peerConnection)||void 0===e?void 0:e.createDataChannel(ke.CD,{ordered:true,maxRetransmits:0}),this.cdDataChannel&&(this.cdDataChannel.onmessage=function(e){return t.onCdMessage(e)},this.cdDataChannel.onopen=function(e){return t.onDataChannelOpen(e)},this.cdDataChannel.onclose=function(e){return t.onDataChannelClose(e)},this.cdDataChannel.onerror=function(e){return t.onDataChannelError(e)});},e.prototype.createSvrDataChannel=function(){var e,t=this;this.sdk.log("start createSvrDataChannel"),this.svrDataChannel=null===(e=this.peerConnection)||void 0===e?void 0:e.createDataChannel(ke.SVR,{ordered:true,maxRetransmits:0}),this.svrDataChannel&&(this.svrDataChannel.onmessage=function(e){return t.onSvrMessage(e)},this.svrDataChannel.onopen=function(e){return t.onDataChannelOpen(e)},this.svrDataChannel.onclose=function(e){return t.onDataChannelClose(e)},this.svrDataChannel.onerror=function(e){return t.onDataChannelError(e)});},e.prototype.createCloudDeviceDataChannel=function(){var e,t=this;this.sdk.log("start createCloudDeviceDataChannel"),this.cloudDeviceDataChannel=null===(e=this.peerConnection)||void 0===e?void 0:e.createDataChannel(ke.CLOUD_DEVICE,{ordered:true,maxRetransmits:0}),this.cloudDeviceDataChannel&&(this.cloudDeviceDataChannel.onmessage=function(e){return t.onCloudDeviceMessage(e)},this.cloudDeviceDataChannel.onopen=function(e){return t.onDataChannelOpen(e)},this.cloudDeviceDataChannel.onclose=function(e){return t.onDataChannelClose(e)},this.cloudDeviceDataChannel.onerror=function(e){return t.onDataChannelError(e)});},e.prototype.onDataChannelError=function(e){var t=e||{},n=t.target,o=t.error;this.sdk.log("".concat(n.label," datachannel error->"),null==o?void 0:o.message);},e.prototype.onDataChannelOpen=function(e){var t=(e||{}).target;this.sdk.log("".concat(t.label," datachannel open->"),t.readyState,t.label),"hb"===t.label&&this.startHeartbeatReport();},e.prototype.onDataChannelClose=function(e){var t=(e||{}).target;this.sdk.log("".concat(t.label," datachannel close->"),t.readyState);},e.prototype.onKmMessage=function(e){var t=JSON.parse(e.data);this.debugSetting.showOnKmMessage&&console.log("onKmMessage",t);var n=t.screen_width,o=t.screen_height,r=t.screen_left,i=t.screen_top,s=t.cursor_showing;this.sdk.isStreamingMultiTrack||(this.sdk.pageEvent.remoteScreenResolutionChange({width:n,height:o,left:r,top:i}),this.sdk.showStats.setCpuAndGpuUsage({cpu:t.cpu_usage,gpu:t.gpu_usage}),this.setCursorShowStatus(null==s||s));},e.prototype.onHbMessage=function(e){var t=JSON.parse(e.data),n=t.token,o=t.code,r=t.user_id,i=t.timestamp,s=t.message,a=t.stream_push_state;if(n&&(this.token=n),this.debugSetting.showOnHbMessage&&console.log("onHbMessage",t),o>=0&&(this.sdk.log("onHbMessage",s),this.disconnected({message:s,code:o})),r&&this.sdk.onNetworkChange({status:"stats",stats:t}),i){var c=+new Date-+i;this.sdk.showStats.setRTT(c)&&(r?this.gameConfig.user_id===r&&this.sdk.onNetworkChange({status:"jitter",data:{value:c,message:"NETWORK_JITTER"}}):this.sdk.onNetworkChange({status:"jitter",data:{value:c,message:"NETWORK_JITTER"}}));}this.streamPushStat!==a&&(this.streamPushStat=a,this.sdk.onStreamPushStateChange({stream_push_state:this.streamPushStat}));},e.prototype.onAckMessage=function(e){try{var t=JSON.parse(e.data),n=t.data,o=void 0===n?It:n,r=t.seq;if(this.debugSetting.showOnAckMessage&&("cursor_state"===o.type||"keys_clean"===o.type||console.log("onAckMessage",o,r)),"seats_info_sync"===o.type)return;var i=this.dataChannelCallbacks[r];if(r&&(this.sdk.showStats.setInputEnd(r),i)){var s=i.callback;delete this.dataChannelCallbacks[r],this.dataChannelRetryTimers[r]&&(clearTimeout(this.dataChannelRetryTimers[r]),delete this.dataChannelRetryTimers[r]),null==s||s({code:0,msg:"on ack message",data:o});}switch(o.type){case "cursor_state":if(!o.state)return;this.setCursorShowStatus("showing"===o.state);break;case "game_launched":this.sdk.log("game_launched",o),this.sdk.onNetworkChange({status:"gamelaunched",data:{begin:o.launch_begin,finish:o.launch_complete}});break;case "input_seat":this.sdk.log("got new input_seat",o),this.sdk.gameConfig.setConfig({clientId:this.mount,config:{input_seat:o.input_seat}});break;case "user_state":this.sdk.log("user state update",o),this.sdk.onMultiPlayerChange({user_state:{user_id:o.user_id,state:o.state}});break;case "open_url":this.sdk.log("got open_url",o),this.sdk.onNetworkChange({status:"openurl",data:{value:o.url}}),this.sdk.onEvent({type:"openurl",data:{value:o.url}});break;case "vmaf_test":default:break;case "user_sdk_update":this.sdk.log("user_sdk_update",o),this.setRemoteDescriptionTime=+new Date,this.peerConnection.setRemoteDescription(new RTCSessionDescription({sdp:o.sdp,type:"answer"}));break;case "user_update":this.sdk.log("user_update"),this.renegotiation(o.sdp);break;case "sync_seats":this.sdk.log("sync_seats",o),i||this.sdk.onMultiPlayerChange({seats_info:{players:o.players,viewers:o.viewers}});var a=this.gameConfig.user_id,c=o.players.find((function(e){return e.name===a}));c&&(0!==c.mic_status&&1!==c.mic_status||this.setTrackEnable({type:"audio",enable:!1}),2===c.mic_status&&this.setTrackEnable({type:"audio",enable:!0}));break;case "submit_seat_change":this.sdk.log("submit_seat_change",o),i||this.sdk.onMultiPlayerChange({submit_seat_change:{user_id:o.user_id,to_role:o.to_role,seat_index:o.seat_index}});break;case "cursor_pos":if(this.remoteCursorMode===ge.REMOTE_SRC_POS){var d=o.x,l=o.y,u=this.sdk.pageEvent.transferLocalScale({width:d-this.hotSpot.x,height:l-this.hotSpot.y}),h=u.width,p=u.height;this.sdk.pageEvent.updateCursorPosition({displayX:h,displayY:p});}}}catch(e){this.sdk.log("onAckMessage exception->",null==e?void 0:e.message);}},e.prototype.onCdMessage=function(e){var t=this,n=e.data;if(n)try{var o=JSON.parse(n),r=o.data,i=o.hotspotx,s=void 0===i?0:i,a=o.hotspoty,c=void 0===a?0:a;this.debugSetting.showOnCdMessage&&this.sdk.log("onCdMessage image data->".concat(r.length," ").concat(bt()(r)),"hotspotx",s,"hotspoty",c),this.hotSpot.x=s,this.hotSpot.y=c;var d="data:image/png;base64,".concat(r);this.remoteCursorImage=d;var l=new Image;l.onload=function(){if(t.remoteCursorMode===ge.FRONT_DRAW_DELTA_POS)(e=t.sdk.getCursorElement()).style.backgroundImage="url(".concat(d,")"),e.style.top="auto",e.style.left="auto",t.resizeMobileCursor({width:l.width,height:l.height});else if(st()||t.remoteCursorMode===ge.REMOTE_SRC_POS){var e;(e=t.sdk.getCursorElement()).style.backgroundImage="url(".concat(d,")"),t.resizeMobileCursor({width:16,height:16});}else {var n=t.sdk.getVideoElement();n&&(n.style.cursor="url(".concat(d,") ").concat(t.hotSpot.x," ").concat(t.hotSpot.y,", auto"));}},l.onerror=function(e){this.sdk.log("onCdMessage image data load failed",e);},l.src=d;}catch(e){this.sdk.log("onCdMessage data parse failed",e);}else this.sdk.log("onCdMessage no data");},e.prototype.onSvrMessage=function(e){var t=e.data;return Mt(this,void 0,void 0,(function(){var e,n,o,r,i,s,a,c,d,l,u,h,p,f,m,v,g,y,b;return Dt(this,(function(k){switch(k.label){case 0:if(!t)return [3,48];k.label=1;case 1:switch(k.trys.push([1,46,,47]),e=JSON.parse(t),n=e.type,o=e.data,this.debugSetting.showOnSvMessage&&this.sdk.log("onSvMessage","type: ",n,"data",t),n){case "game_start_complete":return [3,2];case "game_stopped":return [3,3];case "archive_load_status":return [3,4];case "archive_save_status":return [3,5];case "metric_sig_key":return [3,6];case "screen_config_change":return [3,7];case "hit_input":return [3,8];case "ime":return [3,13];case "camera_status":return [3,14];case "mic_status":return [3,31]}return [3,44];case 2:return this.sdk.onGameStartComplete(o),[3,45];case 3:return this.sdk.onGameStop(o),[3,45];case 4:return this.sdk.onLoadGameArchive(o),[3,45];case 5:return this.sdk.onSaveGameArchive(o),[3,45];case 6:return this.sdk.gameConfig.setConfig({clientId:this.mount,config:{metric_key:o.sig_key}}),[3,45];case 7:return r=o,this.sdk.pageEvent.setRemoteScreenConfig(r),[3,45];case 8:return s=(i=o).field_type,a=i.status,c=i.text,d=i.start_index,this.sdk.onInputStatusChange({field_type:s,status:a}),this.sdk.log("ime type",this.sdk.pageEvent.IMEType,this.sdk.isMobileGame),this.sdk.isMobileGame&&(l=this.sdk.getFakeInputElement())?"normal_input"!==s?[3,11]:this.firstHitInput?[4,at(200)]:[3,10]:[3,12];case 9:k.sent(),k.label=10;case 10:return this.firstHitInput=false,l.value=c,l.focus(),l.setRangeText("",d,d,"end"),[3,12];case 11:l.blur(),l.value="",k.label=12;case 12:return [3,45];case 13:return u=o.ime_type,this.sdk.pageEvent.IMEType=u,[3,45];case 14:return p=(h=o).status,f=h.height,m=h.width,this.sdk.log("onSvMessage camera_status",p,f,m,this.camera),this.sdk.getInitOptions().autoSwitchCamera?this.switchCameraRequesting?[4,this.switchCameraRequestQueue.startBlocking()]:[3,16]:[3,30];case 15:k.sent(),k.label=16;case 16:this.switchCameraRequesting=true,k.label=17;case 17:return k.trys.push([17,28,29,30]),"open_front"!==p?[3,21]:this.camera?[4,this.switchCamera({status:"close"})]:[3,19];case 18:k.sent(),k.label=19;case 19:return [4,this.switchCamera({status:"open",profile:st()?{deviceId:"user"}:this.sdk.isMobileGame?{width:720,height:1280}:null})];case 20:k.sent(),k.label=21;case 21:return "open_back"!==p?[3,25]:this.camera?[4,this.switchCamera({status:"close"})]:[3,23];case 22:k.sent(),k.label=23;case 23:return [4,this.switchCamera({status:"open",profile:st()?{deviceId:"environment"}:this.sdk.isMobileGame?{width:720,height:1280}:null})];case 24:k.sent(),k.label=25;case 25:return "close"!==p?[3,27]:[4,this.switchCamera({status:"close"})];case 26:k.sent(),k.label=27;case 27:return this.switchCameraRequesting=false,[3,30];case 28:return v=k.sent(),this.sdk.log("camera_status switch camera error,",v.message),this.switchCameraRequesting=false,[3,30];case 29:return this.switchCameraRequesting=false,this.switchCameraRequestQueue.nextTask(),[7];case 30:return this.sdk.onEvent({type:"camera_status",data:{status:p,width:m,height:f}}),[3,45];case 31:return g=o.status,this.sdk.log("onSvMessage mic_status",g,this.mic),this.sdk.getInitOptions().autoSwitchMic?this.switchMicRequesting?[4,this.switchMicRequestQueue.startBlocking()]:[3,33]:[3,43];case 32:k.sent(),k.label=33;case 33:this.switchMicRequesting=true,k.label=34;case 34:return k.trys.push([34,41,42,43]),"open"!==g?[3,38]:this.mic?[4,this.switchMic({status:"close"})]:[3,36];case 35:k.sent(),k.label=36;case 36:return [4,this.switchMic({status:"open",profile:this.mic})];case 37:k.sent(),k.label=38;case 38:return "close"!==g?[3,40]:[4,this.switchMic({status:"close"})];case 39:k.sent(),k.label=40;case 40:return [3,43];case 41:return y=k.sent(),this.sdk.log("mic_status switch mic error,",y.message),this.switchMicRequesting=false,[3,43];case 42:return this.switchMicRequesting=false,this.switchMicRequestQueue.nextTask(),[7];case 43:return this.sdk.onEvent({type:"mic_status",data:{status:g}}),[3,45];case 44:return [3,45];case 45:return [3,47];case 46:return b=k.sent(),this.sdk.log("onSvMessage data parse failed",b),[3,47];case 47:return [3,49];case 48:this.sdk.log("onSvMessage no data"),k.label=49;case 49:return [2]}}))}))},e.prototype.onCloudDeviceMessage=function(e){var t=e.data;return Mt(this,void 0,void 0,(function(){var e,n,o,r,i,s,a;return Dt(this,(function(c){switch(c.label){case 0:if(!t)return [3,18];c.label=1;case 1:switch(c.trys.push([1,16,,17]),e=JSON.parse(t),n=e.type,o=e.data,this.debugSetting.showOnCloudDeviceMessage&&this.sdk.log("onCloudDeviceData","type: ",n,"data",t,"cloudDeviceData",o),n){case "trans_message":return [3,2];case "system_usage":return [3,3];case "clipboard_event":return [3,4];case "notification_event":return [3,9];case "system_status":return [3,10];case "distribute_progress_event":return [3,11];case "join":return [3,12];case "set_sync_list":return [3,13]}return [3,14];case 2:return this.sdk.onAndroidInstanceEvent({type:"trans_message",data:o}),[3,15];case 3:return this.sdk.onAndroidInstanceEvent({type:"system_usage",data:o}),[3,15];case 4:r=true,i=o.text,c.label=5;case 5:return c.trys.push([5,7,,8]),[4,navigator.clipboard.writeText(i)];case 6:return c.sent(),[3,8];case 7:return s=c.sent(),console.log("navigator.clipboard.writeText failed",s),r=false,[3,8];case 8:return this.sdk.onAndroidInstanceEvent({type:"clipboard_event",data:{text:i,writeText:r}}),[3,15];case 9:return this.sdk.onAndroidInstanceEvent({type:"notification_event",data:o}),[3,15];case 10:return this.sdk.onAndroidInstanceEvent({type:"system_status",data:o}),[3,15];case 11:return this.sdk.onAndroidInstanceEvent({type:"distribute_progress_event",data:o}),[3,15];case 12:return this.sdk.onAndroidInstanceEvent({type:"join",data:o}),[3,15];case 13:return this.sdk.onAndroidInstanceEvent({type:"set_sync_list",data:o}),[3,15];case 14:return [3,15];case 15:return [3,17];case 16:return a=c.sent(),this.sdk.log("onCloudDeviceData data parse failed",a),[3,17];case 17:return [3,19];case 18:this.sdk.log("onCloudDeviceData no data"),c.label=19;case 19:return [2]}}))}))},e.prototype.resizeMobileCursor=function(e){var t=e.width,n=void 0===t?16:t,o=e.height,r=void 0===o?16:o,i=this.sdk.getCursorElement();i.style.width="".concat(Math.round(n*this.mobileCursorScale),"px"),i.style.height="".concat(Math.round(r*this.mobileCursorScale),"px"),i.style.borderRadius=null,i.style.backgroundColor=null;},e.prototype.reportStat=function(){var e=this.sdk.showStats.getStats(),t=e.fps;if(this.connectStatus===ve.CONNECTING&&(this.connectTimeoutCount+=1,this.connectTimeoutCount>=this.newConnectTimeout&&(this.sdk.log("connect timeout, no-flow notify"),this.sdk.onNetworkChange({status:"noflow"}),this.sdk.onEvent({type:"noflow"}),this.disconnected({message:"connect timeout, please reconnect",code:ye.NEED_RECONNECT}),this.connectTimeoutCount=0)),this.connectStatus===ve.ESTABLISHED&&(0===t&&"playing"===this.gameStatus?(this.noFlowCount+=1,this.noFlowCount>=this.noflowTimeout&&(this.sdk.log("noFlowCount reach, no-flow notify"),this.sdk.onNetworkChange({status:"noflowcenter"}),this.sdk.onEvent({type:"noflowcenter"}),this.noFlowCount=0)):this.noFlowCount=0),!this.hbDataChannel)return this.sdk.log("hbDataChannel has been closed");if(e.timestamp=+new Date,this.connectStatus!==ve.DISCONNECTED){var n=e.fps,o=e.delay,r=e.bit_rate,i=e.packet_lost,s=e.nack,a=e.packet_received,c=Rt(Rt({},e),{fps:"".concat(n),delay:"".concat(o),bit_rate:"".concat(8*r),packet_lost:"".concat(i),nack:"".concat(s),packet_received:"".concat(a)});this.dataChannelSend(this.hbDataChannel,c),this.debugSetting.showSendHbData&&console.log("sendHbData",c);var d=this.sdk.getInitOptions().statsInterval;if(this.statsThreshold=this.statsThreshold+1,this.statsThreshold%d==0){this.sdk.onNetworkChange({status:"stats",stats:e}),this.sdk.onEvent({type:"webrtc_stats",data:e});var l=this.sdk.showStats.getMediaStats();this.sdk.onEvent({type:"media_stats",data:l}),this.statsThreshold=0;}}this.sdk.showStats.addPerformanceReportStat();},e.prototype.dataChannelSend=function(e,t){"open"===(null==e?void 0:e.readyState)&&e.send(JSON.stringify(t));},e.prototype.dataChannelSendWithCallback=function(e){var t=this,n=e.dataChannel,o=void 0===n?null:n,r=e.ackMsg,i=void 0===r?It:r,s=e.retry,a=void 0===s?0:s,c=e.callback,d=void 0===c?lt:c,l=e.interval,u=void 0===l?1e3:l;if("open"===(null==o?void 0:o.readyState))try{var h=i.seq;if(h||(h=pt(),this.sdk.showStats.setInputStart(h)),o.send(JSON.stringify(i)),this.dataChannelCallbacks[h]={ackMsg:i,retry:a,callback:d,interval:u,retryAction:function(){if(!t.dataChannelCallbacks[h])return t.sdk.log(o.label,h,"ackItem not exist");var e=t.dataChannelCallbacks[h];if(e.retry>=1||-1===e.retry)t.sdk.log(o.label,h,"ackItem retry, remain ".concat(e.retry," times")),e.retry=e.retry>=1?e.retry-1:e.retry,t.dataChannelSendWithCallback({dataChannel:o,ackMsg:e.ackMsg,retry:e.retry,callback:e.callback,interval:e.interval});else {var n=e.callback;delete t.dataChannelCallbacks[h],t.dataChannelRetryTimers[h]&&(t.sdk.showStats.setInputEnd(h),clearTimeout(t.dataChannelRetryTimers[h]),delete t.dataChannelRetryTimers[h],t.sdk.log("ack msg timer timeout clear:",h)),n({code:1,msg:"send ack message timeout"}),t.sdk.log("send ack message timeout:",h);}}},a>0){var p=setTimeout((function(){var e;null===(e=t.dataChannelCallbacks[h])||void 0===e||e.retryAction();}),u);this.dataChannelRetryTimers[h]=p;}}catch(e){this.sdk.log("ack msg exception:",e);}},e.prototype.setCursorShowStatus=function(e){var t,n;if(this.connectStatus===ve.ESTABLISHED){this.forceShowCursor?this.lockMouse(false):this.forceLockCursor?this.lockMouse(true):e?this.remoteCursorMode===ge.FRONT_DRAW_DELTA_POS?this.sdk.getCursorElement().style.display="block":this.lockMouse(false):this.remoteCursorMode===ge.FRONT_DRAW_DELTA_POS?this.sdk.getCursorElement().style.display="none":this.lockMouse(true),this.forceLockCursor?this.showCursor=false:(e!==this.showCursor&&(this.sdk.log("cursor show stat will set to",e),this.sdk.onCursorShowStatChange({oldStatus:this.showCursor,newStatus:e})),this.showCursor=e);var o=null===(t=this.sdk)||void 0===t?void 0:t.getVideoElement(),r=null===(n=this.sdk)||void 0===n?void 0:n.getCursorElement();if(this.remoteCursorMode!==ge.REMOTE_SRC_POS){if(this.remoteCursorMode===ge.REMOTE_DRAW)return o.style.cursor="none";o&&(this.remoteCursorMode===ge.FRONT_DRAW_DELTA_POS?o.style.cursor="auto":e||this.forceShowCursor||"touch"===this.sdk.getClientInteractMode()?o.style.cursor="url(".concat(this.remoteCursorImage?this.remoteCursorImage:this.originCursorStyle,") ").concat(this.hotSpot.x," ").concat(this.hotSpot.y,", auto"):o.style.cursor="none"),st()&&((e||this.forceShowCursor||"touch"===this.sdk.getClientInteractMode())&&this.mobileShowCursor?r.style.display="block":r.style.display="none");}else (e||this.forceShowCursor)&&this.mobileShowCursor?r.style.display="block":r.style.display="none";}},e}();const xt=Pt;var Ot,At=function(e){return function(t,n,o){var r=o.value;return o.value=function(){for(var t,n,o,i,s,a,c,d=[],l=0;l<arguments.length;l++)d[l]=arguments[l];var u=["video-stream","cursor"];"keyEvent"===e&&u.push("cloud-gaming-container");var h=d[0].target.className,p=(null===(t=this.sdk)||void 0===t?void 0:t.getInitOptions()).mount,f=(null===(n=d[0].target.parentNode)||void 0===n?void 0:n.id)===p||(null===(i=null===(o=d[0].target.parentNode)||void 0===o?void 0:o.parentNode)||void 0===i?void 0:i.id)===p||(null===(c=null===(a=null===(s=d[0].target.parentNode)||void 0===s?void 0:s.parentNode)||void 0===a?void 0:a.parentNode)||void 0===c?void 0:c.id)===p;f&&(this.enableEventIntercept&&!u.includes(h)||r.apply(this,d));},o}};!function(e){e[e.Backspace=8]="Backspace",e[e.Tab=9]="Tab",e[e.Enter=13]="Enter",e[e.Shift=16]="Shift",e[e.Ctrl=17]="Ctrl",e[e.Alt=18]="Alt",e[e.PauseBreak=19]="PauseBreak",e[e.CapsLock=20]="CapsLock",e[e.Escape=27]="Escape",e[e.Space=32]="Space",e[e.PageUp=33]="PageUp",e[e.PageDown=34]="PageDown",e[e.End=35]="End",e[e.Home=36]="Home",e[e.LeftArrow=37]="LeftArrow",e[e.UpArrow=38]="UpArrow",e[e.RightArrow=39]="RightArrow",e[e.DownArrow=40]="DownArrow",e[e.Insert=45]="Insert",e[e.Delete=46]="Delete",e[e.Zero=48]="Zero",e[e.ClosedParen=48]="ClosedParen",e[e.One=49]="One",e[e.ExclamationMark=49]="ExclamationMark",e[e.Two=50]="Two",e[e.AtSign=50]="AtSign",e[e.Three=51]="Three",e[e.PoundSign=51]="PoundSign",e[e.Hash=51]="Hash",e[e.Four=52]="Four",e[e.DollarSign=52]="DollarSign",e[e.Five=53]="Five",e[e.PercentSign=53]="PercentSign",e[e.Six=54]="Six",e[e.Caret=54]="Caret",e[e.Hat=54]="Hat",e[e.Seven=55]="Seven",e[e.Ampersand=55]="Ampersand",e[e.Eight=56]="Eight",e[e.Star=56]="Star",e[e.Asterik=56]="Asterik",e[e.Nine=57]="Nine",e[e.OpenParen=57]="OpenParen",e[e.A=65]="A",e[e.B=66]="B",e[e.C=67]="C",e[e.D=68]="D",e[e.E=69]="E",e[e.F=70]="F",e[e.G=71]="G",e[e.H=72]="H",e[e.I=73]="I",e[e.J=74]="J",e[e.K=75]="K",e[e.L=76]="L",e[e.M=77]="M",e[e.N=78]="N",e[e.O=79]="O",e[e.P=80]="P",e[e.Q=81]="Q",e[e.R=82]="R",e[e.S=83]="S",e[e.T=84]="T",e[e.U=85]="U",e[e.V=86]="V",e[e.W=87]="W",e[e.X=88]="X",e[e.Y=89]="Y",e[e.Z=90]="Z",e[e.LeftWindowKey=91]="LeftWindowKey",e[e.RightWindowKey=92]="RightWindowKey",e[e.SelectKey=93]="SelectKey",e[e.Numpad0=96]="Numpad0",e[e.Numpad1=97]="Numpad1",e[e.Numpad2=98]="Numpad2",e[e.Numpad3=99]="Numpad3",e[e.Numpad4=100]="Numpad4",e[e.Numpad5=101]="Numpad5",e[e.Numpad6=102]="Numpad6",e[e.Numpad7=103]="Numpad7",e[e.Numpad8=104]="Numpad8",e[e.Numpad9=105]="Numpad9",e[e.Multiply=106]="Multiply",e[e.Add=107]="Add",e[e.Subtract=109]="Subtract",e[e.DecimalPoint=110]="DecimalPoint",e[e.Divide=111]="Divide",e[e.F1=112]="F1",e[e.F2=113]="F2",e[e.F3=114]="F3",e[e.F4=115]="F4",e[e.F5=116]="F5",e[e.F6=117]="F6",e[e.F7=118]="F7",e[e.F8=119]="F8",e[e.F9=120]="F9",e[e.F10=121]="F10",e[e.F11=122]="F11",e[e.F12=123]="F12",e[e.NumLock=144]="NumLock",e[e.ScrollLock=145]="ScrollLock",e[e.SemiColon=186]="SemiColon",e[e.Equals=187]="Equals",e[e.Comma=188]="Comma",e[e.Dash=189]="Dash",e[e.Period=190]="Period",e[e.UnderScore=189]="UnderScore",e[e.PlusSign=187]="PlusSign",e[e.ForwardSlash=191]="ForwardSlash",e[e.Tilde=192]="Tilde",e[e.GraveAccent=192]="GraveAccent",e[e.Backquote=192]="Backquote",e[e.OpenBracket=219]="OpenBracket",e[e.ClosedBracket=221]="ClosedBracket",e[e.Quote=222]="Quote";}(Ot||(Ot={}));var Lt,Gt,Bt,jt={},Ft=[["requestFullscreen","exitFullscreen","fullscreenElement","fullscreenEnabled","fullscreenchange","fullscreenerror"],["webkitRequestFullscreen","webkitExitFullscreen","webkitFullscreenElement","webkitFullscreenEnabled","webkitfullscreenchange","webkitfullscreenerror"],["webkitRequestFullScreen","webkitCancelFullScreen","webkitCurrentFullScreenElement","webkitCancelFullScreen","webkitfullscreenchange","webkitfullscreenerror"],["mozRequestFullScreen","mozCancelFullScreen","mozFullScreenElement","mozFullScreenEnabled","mozfullscreenchange","mozfullscreenerror"],["msRequestFullscreen","msExitFullscreen","msFullscreenElement","msFullscreenEnabled","MSFullscreenChange","MSFullscreenError"]],Nt=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s}(Ft,1)[0];try{for(var Wt=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}(Ft),Ut=Wt.next();!Ut.done;Ut=Wt.next()){var qt=Ut.value;if(qt[1]in document){Bt=qt;break}}}catch(e){Lt={error:e};}finally{try{Ut&&!Ut.done&&(Gt=Wt.return)&&Gt.call(Wt);}finally{if(Lt)throw Lt.error}}if(Bt)for(var Vt=0;Vt<Bt.length;Vt++)jt[Nt[Vt]]=Bt[Vt];const Ht=jt;var Kt=function(){return Kt=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Kt.apply(this,arguments)},zt=function(e,t,n,o){var r,i=arguments.length,s=i<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,n):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,n,o);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(s=(i<3?r(s):i>3?r(t,n,s):r(t,n))||s);return i>3&&s&&Object.defineProperty(t,n,s),s},$t=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Yt=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Xt=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},Jt=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},Qt=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},Zt=function(){function e(e){var t=e.sdk,n=this;this.moveSensitivity=1,this.touchesForDelta=null,this.touchesIdentifierMap=new Map,this.touchesMap=new Map,this.touchState=null,this.mousePosition={x:0,y:0,movementX:0,movementY:0,remoteX:0,remoteY:0},this.remoteMousePosition={x:0,y:0,sent:false},this.mouseClickPosition={x:0,y:0},this.mouseState=null,this.enableMouseEventOnMobile=false,this.enableMousemoveV2=true,this.tabletModeLastPosition=null,this.kmStatus={keyboard:true,mouse:true},this.keyboardBanList=[],this.enablePaste=true,this.keyboardPressedKeys=new Map,this.wheeling=false,this.deltaMoveToCalcX=0,this.deltaMoveToCalcY=0,this.escPressTime=null,this.clickToFullscreen=false,this.clickBodyToPlay=true,this.mutedVideo=false,this.webDraftLevel=Se.CLOSE_HIGH_FREQUENCY,this.enableEventIntercept=true,this.videoWidth=0,this.videoHeight=0,this.videoLeft=0,this.videoTop=0,this.videoStatus="pause",this.audioStatus="pause",this.remoteScreenWidth=0,this.remoteScreenHeight=0,this.remoteScreenLeft=0,this.remoteScreenTop=0,this.remoteScreenConfig=null,this.dropMouseEvent=false,this.videoOrientation=0,this.pageOrientation=null,this.resizeObserver=null,this.mountResizeObserver=null,this.doubleTap=false,this.doubleTapResponse=[],this.addKMHandlerFlag=false,this.clientInteractMode="cursor",this.visibilityState="visible",this.sdk=null,this.transformMouseOffset={x:0,y:0},this.mount=null,this.ime=null,this._inputConfig={isComposing:false,selectionStart:null},window.addEventListener("online",(function(e){n.onNetwork(e);}),false),window.addEventListener("offline",(function(e){n.onNetwork(e);}),false),this.onTouch=this.onTouch.bind(this),this.onResize=this.onResize.bind(this),this.onBodyClick=this.onBodyClick.bind(this),this.onVideoPlaying=this.onVideoPlaying.bind(this),this.onVideoPause=this.onVideoPause.bind(this),this.onVideoEnd=this.onVideoEnd.bind(this),this.onAudioPlaying=this.onAudioPlaying.bind(this),this.onAudioPause=this.onAudioPause.bind(this),this.onAudioEnd=this.onAudioEnd.bind(this),this.onVideoElementClick=this.onVideoElementClick.bind(this),this.onOrientationChange=this.onOrientationChange.bind(this),this.onFakeInputChange=this.onFakeInputChange.bind(this),this.onFakeInputFocus=this.onFakeInputFocus.bind(this),this.onVisibilityChange=this.onVisibilityChange.bind(this),this.onFocusChange=this.onFocusChange.bind(this),this.sdk=t;}return e.prototype.init=function(e){var t,n,o,r,i,s;this.clickToFullscreen=e.clickToFullscreen,this.clickBodyToPlay=null===(t=e.clickBodyToPlay)||void 0===t||t,this.webDraftLevel=null!==(n=e.webDraftLevel)&&void 0!==n?n:Se.CLOSE_HIGH_FREQUENCY,this.enableEventIntercept=null===(o=e.enableEventIntercept)||void 0===o||o,this.clientInteractMode=e.clientInteractMode||"cursor",this.enablePaste=null!==(r=e.enablePaste)&&void 0!==r?r:this.enablePaste,this.enableMousemoveV2=null===(i=e.enableMousemoveV2)||void 0===i||i,this.enableMouseEventOnMobile=null!==(s=e.enableMouseEventOnMobile)&&void 0!==s&&s,this.mount=e.mount;},e.prototype.clearEvent=function(){this.resizeObserver&&(this.resizeObserver.disconnect(),this.resizeObserver=null),this.mountResizeObserver&&(this.mountResizeObserver.disconnect(),this.mountResizeObserver=null),window.removeEventListener("resize",this.onResize,false),window.removeEventListener("visibilitychange",this.onVisibilityChange,false),window.removeEventListener("orientationchange",this.onOrientationChange,false),window.removeEventListener("focus",this.onFocusChange,false),window.removeEventListener("blur",this.onFocusChange,false),document.body.removeEventListener("click",this.onBodyClick,false),this.sdk.getVideoElement()&&(this.sdk.getVideoElement().removeEventListener("playing",this.onVideoPlaying,false),this.sdk.getVideoElement().removeEventListener("pause",this.onVideoPause,false),this.sdk.getVideoElement().removeEventListener("ended",this.onVideoEnd,false),this.sdk.getVideoElement().removeEventListener("click",this.onVideoElementClick,false)),this.sdk.getAudioElement()&&(this.sdk.getAudioElement().removeEventListener("playing",this.onAudioPlaying,false),this.sdk.getAudioElement().removeEventListener("pause",this.onAudioPause,false),this.sdk.getAudioElement().removeEventListener("ended",this.onAudioEnd,false));},e.prototype.addEventHandler=function(){var e=this;this.addKMHandler(),this.addTouchHandler(),st()||this.sdk.gamepad.addGamepadHandler(),document.body.removeEventListener("click",this.onBodyClick,false),document.body.addEventListener("click",this.onBodyClick,false);var t=this.sdk.getVideoElement();t&&(t.removeEventListener("playing",this.onVideoPlaying,false),t.addEventListener("playing",this.onVideoPlaying,false),t.removeEventListener("pause",this.onVideoPause,false),t.addEventListener("pause",this.onVideoPause,false),t.removeEventListener("ended",this.onVideoEnd,false),t.addEventListener("ended",this.onVideoEnd,false),t.removeEventListener("click",this.onVideoElementClick,false),t.addEventListener("click",this.onVideoElementClick,false));var n=this.sdk.getAudioElement();n&&(n.removeEventListener("playing",this.onAudioPlaying,false),n.addEventListener("playing",this.onAudioPlaying,false),n.removeEventListener("pause",this.onAudioPause,false),n.addEventListener("pause",this.onAudioPause,false),n.removeEventListener("ended",this.onAudioEnd,false),n.addEventListener("ended",this.onAudioEnd,false)),window.removeEventListener("orientationchange",this.onOrientationChange,false),window.addEventListener("orientationchange",this.onOrientationChange,false),window.addEventListener("resize",this.onResize,false),document.addEventListener("pointerlockerror",(function(){e.sdk.onEvent({type:"pointerlockerror"});}),false);},Object.defineProperty(e.prototype,"IMEType",{get:function(){return this.ime},set:function(e){this.ime=e;},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"inputConfig",{get:function(){return this._inputConfig},set:function(e){this._inputConfig=Kt(Kt({},this._inputConfig),e);},enumerable:false,configurable:true}),e.prototype.initOrientationDetector=function(){this.sdk.isMobileGame?this.addCloudGamingMountOrientationDetector():st()&&this.addOrientationDetector();},e.prototype.setMoveSensitivity=function(e){this.moveSensitivity=1/e;},e.prototype.getMoveSensitivity=function(){return this.moveSensitivity},e.prototype.remoteScreenResolutionChange=function(e){var t=e.width,n=e.height,o=e.left,r=e.top;this.remoteScreenWidth===t&&this.remoteScreenHeight===n&&this.remoteScreenLeft===o&&this.remoteScreenTop===r||(this.remoteScreenWidth=t,this.remoteScreenHeight=n,this.remoteScreenLeft=o,this.remoteScreenTop=r,this.sdk.onRemoteScreenResolutionChange({width:t,height:n,top:r,left:o}),this.sdk.log("remoteScreenResolutionChange->".concat(t," ").concat(n," ").concat(o," ").concat(r," ")),this.reshapeWindow("remoteScreenResolutionChange"));},e.prototype.getRemoteScreenConfig=function(){return this.remoteScreenConfig},e.prototype.setRemoteScreenConfig=function(e){var t=e.degree,n=e.orientation,o=0;"landscape"===n&&(o=270),"portrait"===n&&(o=0),"0_degree"===t&&(o=0),"90_degree"===t&&(o=270),"180_degree"===t&&(o=180),"270_degree"===t&&(o=90),this.remoteScreenConfig=Kt(Kt({},e),{deg:o}),this.sdk.cloudGamingWebRTC.getWebrtcConnectStatus()===ve.ESTABLISHED&&this.sdk.onConfigurationChange({screen_config:this.remoteScreenConfig}),this.cloudGamingMountResizeHandler();},e.prototype.clearRemoteKeys=function(){this.sdk.cloudGamingWebRTC.sendAckData({data:{type:"keys_clean"}});},e.prototype.transferLocalScale=function(e){var t=e.width,n=void 0===t?1:t,o=e.height,r=void 0===o?1:o,i=this.videoWidth/this.remoteScreenWidth*n,s=this.videoHeight/this.remoteScreenHeight*r;return 90===this.videoOrientation&&(i=this.videoHeight/this.remoteScreenWidth*r,s=this.videoWidth/this.remoteScreenHeight*n),{width:i,height:s}},e.prototype.mouseMove=function(e,t,n,o){var r,i,s=this.sdk.cloudGamingWebRTC.getDisplayRect(),a=s.left,c=s.top;if(this.mousePosition={x:n,y:o,movementX:n-this.mousePosition.x,movementY:o-this.mousePosition.y},90===this.videoOrientation?(r=this.mousePosition.y-c,i=this.videoWidth-this.mousePosition.x+a):(r=this.mousePosition.x-a,i=this.mousePosition.y-c),this.updateCursorPosition({displayX:r,displayY:i}),"touchstart"===t)if(this.sdk.cloudGamingWebRTC.getCursorShowStatus()){var d=this.moveTo(r,i),l=d.remoteX,u=d.remoteY;this.enableMousemoveV2?this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove_v2",x:l,y:u}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove",x:l,y:u});}else this.sdk.log("cursor is not showing, cursor will not move");if("touchmove"===t)if(this.sdk.cloudGamingWebRTC.getCursorShowStatus()){var h=this.moveTo(r,i);l=h.remoteX,u=h.remoteY,this.enableMousemoveV2?this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove_v2",x:l,y:u}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove",x:l,y:u});}else {var p=this.deltaMoveTo(this.mousePosition.movementX,this.mousePosition.movementY),f=p.remoteDeltaX,m=p.remoteDeltaY;90===this.videoOrientation?this.sdk.cloudGamingWebRTC.sendKmData({type:"mousedeltamove",x:m,y:-f}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousedeltamove",x:f,y:m});}"touchend"!==t&&"touchcancel"!==t||(this.tabletModeLastPosition=null);},e.prototype.mobileTouchMove=function(e){var t=e.finger_id,n=e.event_type,o=e.x,r=e.y,i=e.width,s=e.height,a=e.timestamp;this.sdk.cloudGamingWebRTC.sendKmData({type:"event_touch",finger_id:t,event_type:n,x:o,y:r,width:i,height:s,timestamp:a}),this.sdk.onAndroidInstanceEvent({type:"touch_event",data:{finger_id:t,event_type:n,x:o,y:r,width:i,height:s,timestamp:a}});},e.prototype.mobileTouchMoveWebsocket=function(e){var t=e.finger_id,n=e.event_type,o=e.x,r=e.y,i=e.width,s=e.height,a=e.timestamp;this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.KM,data:{type:"event_touch",finger_id:t,event_type:n,x:o,y:r,width:i,height:s,timestamp:a}});},e.prototype.fullscreen=function(e){var t;return void 0===e&&(e=document.documentElement),$t(this,void 0,void 0,(function(){return Yt(this,(function(n){switch(n.label){case 0:this.sdk.log("enter fullscreen"),n.label=1;case 1:return n.trys.push([1,6,,7]),Ht.requestFullscreen?[4,e[Ht.requestFullscreen]()]:[3,3];case 2:return n.sent(),[3,5];case 3:return [4,e.webkitEnterFullScreen()];case 4:n.sent(),n.label=5;case 5:return [3,7];case 6:throw n.sent();case 7:if(window.self===window.top)try{null===(t=null===navigator||void 0===navigator?void 0:navigator.keyboard)||void 0===t||t.lock(["Escape","F11"]);}catch(e){this.sdk.log("lockKeyboard",e);}return [2]}}))}))},e.prototype.exitFullscreen=function(e){var t,n;return void 0===e&&(e=document.documentElement),$t(this,void 0,void 0,(function(){return Yt(this,(function(o){return this.sdk.log("exit fullscreen"),Ht.exitFullscreen?null===(n=null===(t=document[Ht.exitFullscreen]())||void 0===t?void 0:t.catch)||void 0===n||n.call(t,(function(e){return console.log("exit full screen failed, ",null==e?void 0:e.message)})):e.webkitExitFullScreen(),[2]}))}))},e.prototype.resetLastPosition=function(e){var t=e.x,n=void 0===t?0:t,o=e.y,r=void 0===o?0:o;this.mousePosition.x=n,this.mousePosition.y=r;},e.prototype.updateCursorPosition=function(e){var t=e.displayX,n=e.displayY,o=this.sdk.getCursorElement();90===this.videoOrientation?(t>this.videoHeight&&(t=this.videoHeight),n>this.videoWidth&&(n=this.videoWidth)):(t>this.videoWidth&&(t=this.videoWidth),n>this.videoHeight&&(n=this.videoHeight)),t<0&&(t=0),n<0&&(n=0),o&&(o.style.top="".concat(n+(90===this.videoOrientation?this.videoLeft:this.videoTop),"px"),o.style.left="".concat(t+(90===this.videoOrientation?this.videoTop:this.videoLeft),"px"),o.style.zIndex="100");},e.prototype.setDropMouseEvent=function(e){this.dropMouseEvent=e;},e.prototype.setWebDraftLevel=function(e){ void 0===e&&(e=0),this.webDraftLevel=e;},e.prototype.setEnableEventIntercept=function(e){ void 0===e&&(e=true),this.enableEventIntercept=e;},e.prototype.setVideoOrientation=function(e){var t,n=e.deg,o=void 0===n?0:n,r=e.rotateContainer,i=void 0===r||r,s=e.rotateMountPoint,a=void 0!==s&&s;if(this.sdk.log("setVideoOrientation",o,i,a),function(e){var t=new CustomEvent(e.name,{bubbles:true,detail:e.data});window.dispatchEvent(t);}({name:"this.sdk:VideoOrientation",data:{deg:o,rotateContainer:i,rotateMountPoint:a}}),i||a){var c=document.querySelector("html");if(a&&(c=this.sdk.isMobileGame?this.sdk.getCloudGamingStreamContainerElement():document.getElementById(null===(t=this.sdk.getInitOptions())||void 0===t?void 0:t.mount)),c)if(c.className=c.className.split(" rotate-html-".concat(this.videoOrientation)).join(""),90===o&&(c.className="".concat(c.className," rotate-html-90")),180===o&&(c.className="".concat(c.className," rotate-html-180")),270===o&&(c.className="".concat(c.className," rotate-html-270")),0===o||180===o)a?(c.style.width=null,c.style.height=null):i&&(c.className="",c.style.width=null,c.style.height=null);else if(st())(this.sdk.isMobileGame||a)&&(window.innerHeight>window.innerWidth?(c.style.width="".concat(window.innerHeight,"px"),c.style.height="".concat(window.innerWidth,"px")):setTimeout((function(){c.style.width="".concat(window.innerHeight,"px"),c.style.height="".concat(window.innerWidth,"px");}),100));else if(a){var d=null===document||void 0===document?void 0:document.querySelector("#".concat(this.mount)),l=d.clientWidth,u=d.clientHeight;c.style.width="".concat(u,"px"),c.style.height="".concat(l,"px");}else i&&(c.style.width="".concat(window.innerHeight,"px"),c.style.height="".concat(window.innerWidth,"px"));else this.sdk.log("setVideoOrientation -> can not find mount point");}this.videoOrientation=o,this.reshapeWindow("setVideoOrientation");},e.prototype.getPageOrientation=function(){return this.pageOrientation},e.prototype.reshapeWindow=function(e){var t=this;void 0===e&&(e=""),this.sdk.log("reshapeWindow",e);var n=this.sdk.getVideoElement();if(n){var o=this.sdk.getCloudGamingContainerElement(),r=this.sdk.getInitOptions().fullVideoToScreen,i=void 0===r||r;if(n.videoWidth&&n.videoHeight&&o.clientWidth>n.videoWidth&&o.clientHeight>n.videoHeight&&i&&(o.clientWidth/o.clientHeight>n.videoWidth/n.videoHeight?(n.style.height="100%",n.style.width=null):(n.style.width="100%",n.style.height=null)),(o.clientWidth<n.videoWidth||o.clientHeight<n.videoHeight)&&(n.style.width=null,n.style.height=null),this.sdk.isMobileGame){var s=this.sdk.getCloudGamingStreamContainerElement(),a=s.clientWidth,c=s.clientHeight,d=n.videoWidth;c/a>n.videoHeight/d?(n.style.width="100%",n.style.height=null):(n.style.height="100%",n.style.width=null);}var l=function(){var e=n.getBoundingClientRect(),o=e.width,r=e.height,i=e.top,s=e.left;t.videoWidth=o,t.videoHeight=r,t.videoLeft=s,t.videoTop=i,t.sdk.log("videoResolutionChange-> width: ".concat(t.videoWidth,", height: ").concat(t.videoHeight,", left: ").concat(t.videoLeft,", top: ").concat(t.videoTop));};l(),this.resizeObserver||(this.resizeObserver=new ResizeObserver((function(){l();})),this.resizeObserver.observe(n));}},e.prototype.setKMStatus=function(e){var t=e.keyboard,n=void 0===t||t,o=e.mouse,r=void 0===o||o;this.kmStatus={keyboard:n,mouse:r};},e.prototype.setKeyboardBanList=function(e){var t=e.keyList;this.keyboardBanList=t;},e.prototype.setPaste=function(e){this.enablePaste=e;},e.prototype.setVideoMuted=function(e){this.mutedVideo=e;},e.prototype.setClientInteractMode=function(e){ void 0===e&&(e="cursor"),this.clientInteractMode=e;},e.prototype.getClientInteractMode=function(){return this.clientInteractMode},e.prototype.getVisibilityState=function(){return this.visibilityState},Object.defineProperty(e.prototype,"remoteScreenSize",{get:function(){return {width:this.remoteScreenWidth,height:this.remoteScreenHeight,top:this.remoteScreenTop,left:this.remoteScreenLeft}},enumerable:false,configurable:true}),e.prototype.addKMHandler=function(){var e=this;if(!this.addKMHandlerFlag){this.addKMHandlerFlag=true,st()&&!this.enableMouseEventOnMobile||(this.webDraftLevel===Se.CLOSE_HIGH_FREQUENCY?document.addEventListener("mousemove",(function(t){"webrtc"===e.sdk.streamingMode?e.onMouseMove(t):e.onMouseMove2(t);}),false):document.addEventListener("pointermove",(function(t){"webrtc"===e.sdk.streamingMode?e.onMouseMove(t):e.onMouseMove2(t);}),false),document.addEventListener("mousedown",(function(t){"webrtc"===e.sdk.streamingMode?e.onMouseDown(t):e.onMouseDown2(t);}),false),document.addEventListener("mouseup",(function(t){"webrtc"===e.sdk.streamingMode?e.onMouseUp(t):e.onMouseUp2(t);}),false)),document.addEventListener("wheel",(function(t){e.onWheel(t);}),false),document.addEventListener("keydown",(function(t){e.onKeyEvent(t);}),false),document.addEventListener("keyup",(function(t){e.onKeyEvent(t);}),false),document.addEventListener("keypress",(function(){e.onKeyPress();}),false),document.addEventListener("contextmenu",(function(t){e.onContextMenu(t);}),false),document.addEventListener("fullscreenchange",(function(){if(it()){e.sdk.log("enter fullscreenChange");try{e.sdk.getVideoElement().focus();}catch(t){e.sdk.log("fullscreenChange error,",t);}}e.reshapeWindow("fullscreenchange");}),false),window.addEventListener("visibilitychange",(function(){e.onVisibilityChange();}),false),window.addEventListener("focus",(function(){e.onFocusChange();}),false),window.addEventListener("blur",(function(){e.onFocusChange();}),false),document.addEventListener("pointerlockchange",(function(){e.pointerlockchange();})),document.addEventListener("paste",(function(t){e.onPaste(t);}));var t=this.sdk.getFakeInputElement();t&&(t.removeEventListener("input",this.onFakeInputChange,false),t.addEventListener("input",this.onFakeInputChange,false),t.addEventListener("focus",this.onFakeInputFocus,false),t.addEventListener("compositionstart",(function(){e._inputConfig.isComposing=true;})),t.addEventListener("compositionend",(function(){e._inputConfig.isComposing=false,e.sdk.androidInstance.inputText({content:t.value,mode:"override",index_after_override:e.inputConfig.selectionStart});})));}},e.prototype.addTouchHandler=function(){var e=this.sdk.getCloudGamingContainerElement();e&&(e.removeEventListener("touchmove",this.onTouch,false),e.removeEventListener("touchstart",this.onTouch,false),e.removeEventListener("touchend",this.onTouch,false),e.removeEventListener("touchcancel",this.onTouch,false),e.addEventListener("touchmove",this.onTouch,false),e.addEventListener("touchstart",this.onTouch,false),e.addEventListener("touchend",this.onTouch,false),e.addEventListener("touchcancel",this.onTouch,false)),document.addEventListener("gesturestart",(function(e){e.preventDefault();}));},e.prototype.onResize=function(){var e=this;this.sdk.log("onresize","window.innerWidth",window.innerWidth,"window.innerHeight",window.innerHeight),setTimeout((function(){e.reshapeWindow("onresize");}),0);},e.prototype.addOrientationDetector=function(){var e=this,t=this.sdk.getInitOptions(),n=t.autoRotateContainer,o=t.autoRotateMountPoint,r=window.matchMedia("(orientation: portrait)"),i=function(t){if(t.matches){e.pageOrientation="portrait",(n||o)&&e.setVideoOrientation({deg:e.sdk.isMobileGame&&e.isPortraitStream?0:90,rotateContainer:n,rotateMountPoint:o});try{e.sdk.onOrientationChange({type:"portrait"});}catch(t){e.sdk.log("onOrientationChange callback error",t);}}else {e.pageOrientation="landscape",(n||o)&&e.setVideoOrientation({deg:e.sdk.isMobileGame&&e.isPortraitStream?270:0,rotateContainer:n,rotateMountPoint:o});try{e.sdk.onOrientationChange({type:"landscape"});}catch(t){e.sdk.log("onOrientationChange callback error",t);}}};i(r),r.addListener(i);},e.prototype.cloudGamingMountResizeHandler=function(){var e,t;if(this.sdk.isMobileGame&&this.sdk.getGameMountPoint()){var n=this.getRemoteScreenConfig(),o=n.orientation,r=n.degree,i=0;"landscape"===o&&(i=270),"portrait"===o&&(i=0),"0_degree"===r&&(i=0),"90_degree"===r&&(i=270),"180_degree"===r&&(i=180),"270_degree"===r&&(i=90),st()||(null===(t=null===(e=this.sdk.getInitOptions())||void 0===e?void 0:e.androidInstance)||void 0===t?void 0:t.autoRotateOnPC)&&this.setVideoOrientation({rotateMountPoint:true,deg:i}),this.reshapeWindow("cloudGamingMountResizeHandler");}},e.prototype.addCloudGamingMountOrientationDetector=function(){var e=this,t=this.sdk.getGameMountPoint();this.mountResizeObserver||(this.mountResizeObserver=new ResizeObserver((function(){e.cloudGamingMountResizeHandler();})),t&&this.mountResizeObserver.observe(t));},Object.defineProperty(e.prototype,"isPortraitStream",{get:function(){var e=this.sdk.getRemoteStreamResolution(),t=e.width;return e.height>t},enumerable:false,configurable:true}),e.prototype.onVisibilityChange=function(){var e=this;this.clearRemoteKeys(),this.sdk.log("visibilitychange",document.hidden?"hidden":"visible"),document.hidden?(this.visibilityState="hidden",st()&&(this.touchesIdentifierMap.clear(),this.sdk.clearRemoteKeys(),setTimeout((function(){e.sdk.isMobileGame||e.sdk.sendMouseEvent({type:"mouseleft",down:false}),e.touchesMap.clear();}),100))):(this.visibilityState="visible","websocket"===this.sdk.streamingMode&&this.sdk.getVideoElement().play()),this.sdk.onVisibilityChange({status:this.visibilityState});},e.prototype.onNetwork=function(e){this.sdk.log("onNetwork",e.type),this.sdk.onNetworkChange({status:e.type});},e.prototype.onFocusChange=function(){this.clearRemoteKeys();},e.prototype.pointerlockchange=function(){},e.prototype.onPaste=function(e){console.log("onPaste",e,e.clipboardData.getData("text/plain"));},e.prototype.onContextMenu=function(e){e.preventDefault();},e.prototype.transferRemotePosition=function(e){var t=e.displayX,n=void 0===t?1:t,o=e.displayY,r=void 0===o?1:o,i=e.moveSensitivity,s=void 0===i?1:i,a=Math.round(n*this.remoteScreenWidth/this.videoWidth/s)+this.remoteScreenLeft,c=Math.round(r*this.remoteScreenHeight/this.videoHeight/s)+this.remoteScreenTop;return 90!==this.videoOrientation&&270!==this.videoOrientation||(a=Math.round(n*this.remoteScreenWidth/this.videoHeight/s)+this.remoteScreenLeft,c=Math.round(r*this.remoteScreenHeight/this.videoWidth/s)+this.remoteScreenTop),{x:a,y:c}},e.prototype.transferRemotePositionV2=function(e){var t=e.displayX,n=void 0===t?1:t,o=e.displayY,r=void 0===o?1:o,i=e.moveSensitivity,s=void 0===i?1:i,a=n/this.videoWidth/s,c=r/this.videoHeight/s;return 90!==this.videoOrientation&&270!==this.videoOrientation||(a=n/this.videoHeight/s,c=r/this.videoWidth/s),{x:Math.round(8192*a),y:Math.round(8192*c)}},e.prototype.transferRemotePositionDeltaMove=function(e){var t=e.displayX,n=void 0===t?1:t,o=e.displayY,r=void 0===o?1:o,i=e.moveSensitivity,s=void 0===i?1:i,a=n*this.remoteScreenWidth/this.videoWidth/s,c=r*this.remoteScreenHeight/this.videoHeight/s,d=a+this.transformMouseOffset.x,l=c+this.transformMouseOffset.y,u=Math.round(d)+this.remoteScreenLeft,h=Math.round(l)+this.remoteScreenTop;if(this.transformMouseOffset.x=d-Math.round(d),this.transformMouseOffset.y=l-Math.round(l),90===this.videoOrientation||270===this.videoOrientation){var p=n*this.remoteScreenWidth/this.videoHeight/s,f=r*this.remoteScreenHeight/this.videoWidth/s;u=Math.round(p)+this.remoteScreenLeft,h=Math.round(f)+this.remoteScreenTop,this.transformMouseOffset.x=Math.round(p)-p,this.transformMouseOffset.y=Math.round(f)-f;}return {x:u,y:h}},Object.defineProperty(e.prototype,"touchesList",{get:function(){var e,t,n=[];if(this.touchesMap.size)try{for(var o=Xt(this.touchesMap.values()),r=o.next();!r.done;r=o.next()){var i=r.value;n.push(i);}}catch(t){e={error:t};}finally{try{r&&!r.done&&(t=o.return)&&t.call(o);}finally{if(e)throw e.error}}return n},enumerable:false,configurable:true}),e.prototype.onTouch=function(e){var t,n,o=this,r=e.type,i=e.timeStamp,s=e.targetTouches,a=e.changedTouches,c=function(e){var t=e.pageX,n=e.pageY,s=e.identifier,a=d.transferRemotePosition({displayX:t-d.videoLeft,displayY:n-d.videoTop}),c=a.x,l=a.y;c-=d.remoteScreenLeft,l-=d.remoteScreenTop;var u=d.touchesForDelta||{lastX:c,lastY:l},h=(c-u.lastX)/d.moveSensitivity,p=(l-u.lastY)/d.moveSensitivity;if(d.touchesForDelta={lastX:c,lastY:l},"touchstart"===r&&(Qt([],Jt(d.touchesIdentifierMap.values()),false).includes(d.touchesIdentifierMap.size)?d.touchesIdentifierMap.set(s,d.touchesIdentifierMap.size+1):d.touchesIdentifierMap.set(s,d.touchesIdentifierMap.size)),d.sdk.isMobileGame||"touch"===d.clientInteractMode){var f=r;if(270===d.videoOrientation){var m=d.transferRemotePosition({displayX:d.videoHeight-n+d.videoTop,displayY:t-d.videoLeft}),v=m.x,g=m.y;c=v-d.remoteScreenLeft,l=g-d.remoteScreenTop;}if(90===d.videoOrientation){var y=d.transferRemotePosition({displayX:n-d.videoTop,displayY:d.videoWidth-t+d.videoLeft});v=y.x,g=y.y,c=v-d.remoteScreenLeft,l=g-d.remoteScreenTop;}if("touch"===d.clientInteractMode&&(c>d.remoteScreenWidth&&(c=d.remoteScreenWidth),l>d.remoteScreenHeight&&(l=d.remoteScreenHeight),c<0&&(c=0),l<0&&(l=0)),d.mobileTouchMove({finger_id:d.touchesIdentifierMap.get(s),event_type:Ce[f],x:c,y:l,width:d.remoteScreenWidth,height:d.remoteScreenHeight,timestamp:i}),"touch"===d.clientInteractMode){var b=void 0,k=void 0;90===d.videoOrientation?(b=n-d.videoTop,k=d.videoWidth-t+d.videoLeft):(b=t-d.videoLeft,k=n-d.videoTop),d.updateCursorPosition({displayX:b,displayY:k});}}var S={id:s,type:r,x:c,y:l,pageX:t,pageY:n,movementX:h,movementY:p};d.touchesMap.set(s,S),"touchend"!==r&&"touchcancel"!==r||(d.touchesIdentifierMap.delete(s),setTimeout((function(){o.touchesMap.delete(s);}),100)),"touchstart"!==r||d.sdk.isMobileGame||(d.doubleTapResponse.push(S),d.doubleTap?d.sdk.onDoubleTap(d.doubleTapResponse):(d.doubleTap=true,setTimeout((function(){o.doubleTap=false,o.doubleTapResponse=[];}),300)));},d=this;try{for(var l=Xt("touchend"===r||"touchcancel"===r||this.sdk.isMobileGame||"touch"===this.clientInteractMode?a:s),u=l.next();!u.done;u=l.next())c(u.value);}catch(e){t={error:e};}finally{try{u&&!u.done&&(n=l.return)&&n.call(l);}finally{if(t)throw t.error}}this.sdk.isMobileGame||"touch"===this.clientInteractMode||this.sdk.onTouchEvent(this.touchesList);},e.prototype.onMouseMove=function(e){var t,n;if(false!==this.kmStatus.mouse&&!this.dropMouseEvent){var o="getCoalescedEvents"in e?e.getCoalescedEvents():[e],r=null;this.webDraftLevel===Se.UNPACKAGE_SEND&&o.length>3?(this.sdk.log("webDraftLevel 1, event length is ".concat(o.length,", only pick 3 events")),o.splice(0,o.length-3)):this.webDraftLevel===Se.PACKAGE_SEND&&(this.sdk.log("webDraftLevel 2, event length is ".concat(o.length,", will send seq events")),r=[]);try{for(var i=Xt(o),s=i.next();!s.done;s=i.next()){var a=s.value,c=a.offsetX,d=a.offsetY,l=a.movementX,u=a.movementY,h=c,p=d;if(h<0&&(h=0),p<0&&(p=0),this.sdk.cloudGamingWebRTC.getCursorMode()===ge.FRONT_DRAW_DELTA_POS)if(this.sdk.cloudGamingWebRTC.isMouseLocked()){if(!this.remoteMousePosition.sent){var f=this.remoteMousePosition,m=f.x,v=f.y;this.enableMousemoveV2?this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove_v2",x:m,y:v}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove",x:m,y:v}),this.remoteMousePosition.sent=!0;}var g=this.deltaMoveTo(l,u),y=g.remoteDeltaX,b=g.remoteDeltaY;this.sdk.cloudGamingWebRTC.sendKmData({type:"mousedeltamove",x:y,y:b}),this.drawMouseDeltaPosition(l,u);}else {var k=this.moveTo(h,p),S=k.remoteX,C=k.remoteY;this.remoteMousePosition.x=S,this.remoteMousePosition.y=C,this.remoteMousePosition.sent=!1,this.mousePosition.deltaX=h,this.mousePosition.deltaY=p;}else if(this.sdk.cloudGamingWebRTC.mouseDeltaMove()||!this.sdk.cloudGamingWebRTC.getCursorShowStatus()){var w=this.deltaMoveTo(l,u);y=w.remoteDeltaX,b=w.remoteDeltaY,r?r.push({type:"mousedeltamove",x:y,y:b}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousedeltamove",x:y,y:b});}else {var T=this.moveTo(h,p);if(S=T.remoteX,C=T.remoteY,r)this.enableMousemoveV2?r.push({type:"mousemove_v2",x:S,y:C}):r.push({type:"mousemove",x:S,y:C});else if(this.sdk.isMobileGame||"touch"===this.clientInteractMode){if(this.mousePosition.remoteX=S,this.mousePosition.remoteY=C,this.touchState!==Ce.touchstart)return;this.mobileTouchMove({finger_id:0,event_type:Ce.touchmove,x:S,y:C,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date});}else this.enableMousemoveV2?this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove_v2",x:S,y:C}):this.sdk.cloudGamingWebRTC.sendKmData({type:"mousemove",x:S,y:C});}this.mousePosition.x=h,this.mousePosition.y=p;}}catch(e){t={error:e};}finally{try{s&&!s.done&&(n=i.return)&&n.call(i);}finally{if(t)throw t.error}}this.webDraftLevel===Se.PACKAGE_SEND&&this.sdk.cloudGamingWebRTC.sendKmData({type:"key_seq",keys:r.map((function(e){return JSON.stringify(e)}))});}},e.prototype.onMouseMove2=function(e){var t,n;if(false!==this.kmStatus.mouse&&!this.dropMouseEvent){var o="getCoalescedEvents"in e?e.getCoalescedEvents():[e];try{for(var r=Xt(o),i=r.next();!i.done;i=r.next()){var s=i.value,a=s.offsetX,c=s.offsetY,d=a,l=c;d<0&&(d=0),l<0&&(l=0);var u=this.moveTo(d,l),h=u.remoteX,p=u.remoteY;if(this.mousePosition.remoteX=h,this.mousePosition.remoteY=p,this.sdk.isMobileGame&&this.touchState!==Ce.touchstart)return;this.mobileTouchMoveWebsocket({finger_id:0,event_type:Ce.touchmove,x:h,y:p,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date});}}catch(e){t={error:e};}finally{try{i&&!i.done&&(n=r.return)&&n.call(r);}finally{if(t)throw t.error}}}},e.prototype.drawMouseDeltaPosition=function(e,t){var n=this.sdk.cloudGamingWebRTC.getCursorShowStatus();this.sdk.getCursorElement().style.display=n?"block":"none";var o=this.sdk.cloudGamingWebRTC.getDisplayRect(),r=o.width,i=o.height;this.mousePosition.deltaX=this.mousePosition.deltaX+e,this.mousePosition.deltaY=this.mousePosition.deltaY+t,this.mousePosition.deltaX<=0&&(this.mousePosition.deltaX=0),this.mousePosition.deltaX>=r&&(this.mousePosition.deltaX=r),this.mousePosition.deltaY<=0&&(this.mousePosition.deltaY=0),this.mousePosition.deltaY>=i&&(this.mousePosition.deltaY=i);var s=this.sdk.cloudGamingWebRTC.getCursorHotSpot();this.updateCursorPosition({displayX:this.mousePosition.deltaX-s.x,displayY:this.mousePosition.deltaY-s.y});},e.prototype.moveTo=function(e,t){if(this.enableMousemoveV2&&!this.sdk.isMobileGame&&"touch"!==this.clientInteractMode){var n=this.transferRemotePositionV2({displayX:e,displayY:t});return {remoteX:n.x,remoteY:n.y}}var o=this.transferRemotePosition({displayX:e,displayY:t}),r=o.x,i=o.y;return r>=this.remoteScreenWidth+this.remoteScreenLeft&&(r=this.remoteScreenWidth+this.remoteScreenLeft-1),r<0&&(r=0),i>=this.remoteScreenHeight+this.remoteScreenTop&&(i=this.remoteScreenHeight+this.remoteScreenTop-1),i<0&&(i=0),{remoteX:r,remoteY:i}},e.prototype.deltaMoveTo=function(e,t){var n=this.transferRemotePositionDeltaMove({displayX:e,displayY:t,moveSensitivity:this.moveSensitivity}),o=n.x,r=n.y,i=o-this.remoteScreenLeft,s=r-this.remoteScreenTop;return this.deltaMoveToCalcX+=i,this.deltaMoveToCalcY+=s,this.deltaMoveToCalcX<0&&(this.deltaMoveToCalcX=0),this.deltaMoveToCalcY<0&&(this.deltaMoveToCalcY=0),this.deltaMoveToCalcX>this.remoteScreenWidth&&(this.deltaMoveToCalcX=this.remoteScreenWidth),this.deltaMoveToCalcY>this.remoteScreenHeight&&(this.deltaMoveToCalcX=this.remoteScreenHeight),{remoteDeltaX:i,remoteDeltaY:s}},e.prototype.isRightClick=function(e){return "which"in e?3===e.which:"button"in e?2===e.button:void 0},e.prototype.determineButtonType=function(e){var t;return null!==(t=["mouseleft","mousemiddle","mouseright","mousebackward","mouseforward","unused","unused"][e.button])&&void 0!==t?t:""},e.prototype.onMouseDown=function(e){if(false!==this.kmStatus.mouse){var t=e.offsetX,n=e.offsetY;if(this.mouseClickPosition={x:t,y:n},this.sdk.isMobileGame||"touch"===this.clientInteractMode){var o=this.determineButtonType(e);if(this.sdk.isMobileGame&&"mouseleft"!==o)return;var r=this.mousePosition,i=r.remoteX,s=r.remoteY;this.mobileTouchMove({finger_id:0,event_type:Ce.touchstart,x:i,y:s,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date}),this.touchState=Ce.touchstart;}else this.sdk.cloudGamingWebRTC.sendKmData({type:this.determineButtonType(e),down:true}),this.mouseState=we.mousedown,this.isRightClick(e)&&this.tryToCursorLock();3!==e.button&&4!==e.button||e.preventDefault();}},e.prototype.onMouseDown2=function(e){if(false!==this.kmStatus.mouse){var t=this.mousePosition,n=t.remoteX,o=t.remoteY;this.mobileTouchMoveWebsocket({finger_id:0,event_type:Ce.touchstart,x:n,y:o,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date}),this.touchState=Ce.touchstart,3!==e.button&&4!==e.button||e.preventDefault();}},e.prototype.onMouseUp=function(e){if(false!==this.kmStatus.mouse)if(this.sdk.isMobileGame||"touch"===this.clientInteractMode){var t=this.determineButtonType(e);if(this.sdk.isMobileGame&&"mouseleft"!==t)return;if(this.touchState===Ce.touchstart){var n=this.mousePosition,o=n.remoteX,r=n.remoteY;this.mobileTouchMove({finger_id:0,event_type:Ce.touchend,x:o,y:r,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date});}this.touchState=Ce.touchend;}else this.mouseState===we.mousedown&&this.sdk.cloudGamingWebRTC.sendKmData({type:this.determineButtonType(e),down:false}),this.mouseState=we.mouseup;},e.prototype.onMouseUp2=function(e){if(false!==this.kmStatus.mouse){var t=this.mousePosition,n=t.remoteX,o=t.remoteY;this.mobileTouchMoveWebsocket({finger_id:0,event_type:Ce.touchend,x:n,y:o,width:this.remoteScreenWidth,height:this.remoteScreenHeight,timestamp:+new Date}),this.touchState=Ce.touchend,3!==e.button&&4!==e.button||e.preventDefault();}},e.prototype.onWheel=function(e){var t,n=this,o=e.deltaX,r=e.deltaY,i=Math.abs(r)>=Math.abs(o)?"vertical":"horizontal",s=this.mousePosition,a=s.remoteX,c=s.remoteY,d=function(e){var t=e.delta,o=e.type;n.sdk.cloudGamingWebRTC.sendKmData({type:o,delta:t,x:a,y:c,width:n.remoteScreenWidth,height:n.remoteScreenHeight});};if(null===(t=et().ua)||void 0===t?void 0:t.includes("Mac")){if(true===this.wheeling)return;this.wheeling=true,"vertical"===i&&d({delta:r,type:"mousescroll"}),"horizontal"===i&&d({delta:o,type:"mousehorizontalscroll"}),setTimeout((function(){n.wheeling=false;}),100);}else "vertical"===i&&d({delta:r,type:"mousescroll"}),"horizontal"===i&&d({delta:o,type:"mousehorizontalscroll"});},e.prototype.onKeyEvent=function(e){var t,n,o,r=this;if(e.preventDefault(),false!==this.kmStatus.keyboard){var i=e.which||e.keyCode,s=e.ctrlKey,a=e.altKey,c=e.type,d=e.metaKey,l=e.location,u=e.key;if(!this.keyboardBanList.includes(i)){if("keyup"===c){if(s){if(i===Ot.Space)return this.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:i,down:true}),void setTimeout((function(){r.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:i,down:false});}),10);i===Ot.Backquote&&this.sdk.showStats.toggleStatisticsView();}i===Ot.Escape&&(+new Date-this.escPressTime>300&&this.sdk.cloudGamingWebRTC.lockMouse(false),this.escPressTime=null),(null===(t=et().ua)||void 0===t?void 0:t.includes("Mac"))&&"Meta"===u&&Qt([],Jt(this.keyboardPressedKeys.keys()),false).forEach((function(e){e!==Ot.LeftWindowKey&&e!==Ot.SelectKey&&r.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:e,down:false}),r.keyboardPressedKeys.delete(e);}));}if("keydown"===c){if((null===(n=et().ua)||void 0===n?void 0:n.includes("Mac"))&&this.keyboardPressedKeys.set(i,e),i===Ot.X&&a||i===Ot.Escape?(i===Ot.X&&a&&this.sdk.cloudGamingWebRTC.lockMouse(false),i===Ot.Escape&&(this.escPressTime||(this.escPressTime=+new Date))):this.tryToCursorLock(),this.enablePaste&&(d||s)&&i===Ot.V)return void(navigator.clipboard?navigator.clipboard.readText().then((function(e){r.sdk.sendText(e);})).catch((function(e){r.sdk.log("Failed to read clipboard contents: ",e),r.sdk.onEvent({type:"readclipboarderror",data:{message:e.message}});})):this.sdk.onEvent({type:"readclipboarderror"}));if(a&&i===Ot.F4)return void this.sdk.log("alt + f4 is forbidden")}if((null===(o=et().ua)||void 0===o?void 0:o.includes("Mac"))&&i===Ot.CapsLock)return this.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:i,down:true}),void setTimeout((function(){r.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:i,down:false});}),10);"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendKmData({type:"keyboard",key:i,down:"keydown"===c,location:l}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.KM,data:{type:"keyboard",key:i,down:"keydown"===c,location:l}});}}},e.prototype.onKeyPress=function(){},e.prototype.onBodyClick=function(){var e,t=this;if(this.clickBodyToPlay){var n=this.sdk.getVideoElement(),o=this.sdk.getAudioElement();if(n&&this.sdk.cloudGamingWebRTC.getWebrtcConnectStatus()===ve.ESTABLISHED){this.mutedVideo||(o.muted=false);try{"pause"===this.videoStatus&&n.pause(),n.play().then((function(){})).catch((function(e){t.sdk.log("onbody click play error",e);})),o.play().catch((function(e){t.sdk.log("onbody click play audio error",e);}));}catch(e){this.sdk.log("play video error",e);}}if("websocket"===this.sdk.streamingMode){var r=document.querySelector(".".concat(this.mount," .cloud-gaming-audio-stream-socket"));n&&n.play().catch((function(e){t.sdk.log("onbody click play error",e);})),r&&(null===(e=this.sdk.cloudGamingWebsocket.getMuxer("video"))||void 0===e||e.playCurrent(),this.mutedVideo||(r.muted=false),r.play().catch((function(e){t.sdk.log("onbody click play audio error",e);})));}var i=this.sdk.getHuaweiAudioElement();i&&(this.mutedVideo||(i.muted=false),i.play()),st()||it()||!this.clickToFullscreen||(this.sdk.log("click to fullscreen->",this.clickToFullscreen),this.fullscreen());}},e.prototype.onVideoPlaying=function(e){this.videoStatus="playing","webrtc"===this.sdk.streamingMode&&(this.sdk.log("video state",e.type),this.reshapeWindow("onVideoPlaying"),this.sdk.onEvent({type:"video_state",data:{code:0,message:"playing"}}));},e.prototype.onVideoPause=function(e){this.sdk.log("video state",e.type),this.videoStatus="pause",this.sdk.onEvent({type:"video_state",data:{code:1,message:"pause"}});},e.prototype.onVideoEnd=function(e){this.sdk.log("video state",e.type),this.videoStatus="pause",this.sdk.onEvent({type:"video_state",data:{code:2,message:"ended"}});},e.prototype.onAudioPlaying=function(e){this.sdk.log("audio state",e.type),this.audioStatus="playing",this.sdk.onEvent({type:"audio_state",data:{code:0,message:"playing"}});},e.prototype.onAudioPause=function(e){this.sdk.log("audio state",e.type),this.audioStatus="pause",this.sdk.onEvent({type:"audio_state",data:{code:1,message:"pause"}});},e.prototype.onAudioEnd=function(e){this.sdk.log("audio state",e.type),this.audioStatus="pause",this.sdk.onEvent({type:"audio_state",data:{code:2,message:"ended"}});},e.prototype.onVideoElementClick=function(){this.sdk.getVideoElement().focus(),this.sdk.cloudGamingWebRTC.getCursorMode()===ge.FRONT_DRAW_DELTA_POS&&this.sdk.cloudGamingWebRTC.lockMouse(true);},e.prototype.onFakeInputFocus=function(){if("local"===this.IMEType){var e=this.sdk.getFakeInputElement(),t=this.sdk.getCloudGamingContainerElement();e&&t&&(e.style.top="".concat(this.mouseClickPosition.y+(t.clientHeight-this.videoHeight)/2-5,"px"),e.style.left="".concat(this.mouseClickPosition.x+(t.clientWidth-this.videoWidth)/2,"px"));}},e.prototype.onFakeInputChange=function(e){var t=e.target,n=t.value,o=t.selectionStart;this.inputConfig.selectionStart=o,this.inputConfig.isComposing||this.sdk.androidInstance.inputText({content:n,mode:"override",index_after_override:o});},e.prototype.onOrientationChange=function(){var e=this;this.sdk.log("orientationchange"),setTimeout((function(){e.reshapeWindow("onOrientationChange");}),0);},e.prototype.tryToCursorLock=function(){if(!this.sdk.cloudGamingWebRTC.getForceShowCursor()){var e=document.pointerLockElement;e||this.sdk.cloudGamingWebRTC.getCursorShowStatus()&&!this.sdk.cloudGamingWebRTC.mouseDeltaMove()||(this.sdk.cloudGamingWebRTC.lockMouse(true),this.sdk.log("tryToCursorLock",e,"forceShowCursor",this.sdk.cloudGamingWebRTC.getForceShowCursor()),this.sdk.log("toggleMouseLock true, auto run requestPointerLock"));}},zt([At()],e.prototype,"onContextMenu",null),zt([At()],e.prototype,"onTouch",null),zt([At()],e.prototype,"onMouseMove",null),zt([At()],e.prototype,"onMouseMove2",null),zt([At()],e.prototype,"onMouseDown",null),zt([At()],e.prototype,"onMouseDown2",null),zt([At()],e.prototype,"onMouseUp2",null),zt([At()],e.prototype,"onWheel",null),zt([At("keyEvent")],e.prototype,"onKeyEvent",null),e}();const en=Zt;var tn,nn='\n<div class="cloud-gaming-container" tabindex="-1">\n\n  <div class="cloud-gaming-stream-container">\n    <video class="video-stream" tabindex="-1" playsinline webkit-playsinline x5-playsinline autoplay muted preload="auto"></video>\n    <audio class="audio-stream" tabindex="-1" playsinline webkit-playsinline x5-playsinline autoplay preload="auto"></audio>\n    <audio class="cloud-gaming-audio-stream-socket" tabindex="-1" playsinline webkit-playsinline x5-playsinline autoplay preload="auto"></audio>\n    <div class="cursor" id="cursor"></div>\n    <input class="tcg-fake-input"></input>\n  </div>\n\n  '.concat('\n<div class="qcloud-stat">\n  \n  <div class="qcloud-video">\n    <div class="qcloud-stat-video">\n      <div class="qcloud-stat-left">Video</div>\n    </div>\n  </div>\n\n  <div class="qcloud-audio">\n    <div class="qcloud-stat-audio">\n      <div class="qcloud-stat-left">Audio</div>\n    </div>\n  </div>\n\n  <div class="qcloud-info">\n    <div class="qcloud-stat-info">\n      <div class="qcloud-stat-left">Info</div>\n    </div>\n  </div>\n\n</div>','\n\n  <div class="progress-bar-container">\n    <div class="spinner"> </div>\n    <p class="starting">正在启动云渲染服务</p>\n    <p id="speed" class="starting"></p>\n  </div>\n\n  <a class="restart" href="javascript:window.location.reload();">重新连接</a>\n</div>'),on=n(652),rn=n.n(on),sn={packetsReceived:0,packetsLost:0,nack:0,rttAverage:0,rttVariance:0,nackRate:0,packetsLostRate:0};!function(e){e[e.NETWORK_NORMAL=0]="NETWORK_NORMAL",e[e.NETWORK_CONGESTION=1]="NETWORK_CONGESTION",e[e.NACK_RISING=2]="NACK_RISING",e[e.HIGH_DELAY=3]="HIGH_DELAY",e[e.NETWORK_JITTER=4]="NETWORK_JITTER";}(tn||(tn={}));var an=function(e){var t=e.packetsReceived,n=void 0===t?0:t,o=e.packetsLost,r=void 0===o?0:o,i=e.nack,s=void 0===i?0:i,a=e.rtt,c=void 0===a?[]:a,d=e.featureSwitch,l=void 0===d?{}:d,u=n-sn.packetsReceived;sn.packetsReceived=n;var h=r-sn.packetsLost;sn.packetsLost=r,sn.packetsLostRate=h/u;var p=r-sn.nack;sn.nack=s,sn.nackRate=p/u,sn.rttAverage=c.reduce((function(e,t){return e+t}),0)/c.length,sn.rttVariance=function(e){if(void 0===e&&(e=[]),!e.length)return 0;var t=e.reduce((function(e,t){return e+t}),0),n=e.length,o=t/n,r=0;return e.forEach((function(e){r+=(e-o)*(e-o);})),r/=n,Math.floor(r)}(c);var f=l.network_event_script,m=void 0===f?{}:f,v=m.loss_rate_threshold,g=m.nack_rate_threshold,y=m.rtt_avg_threshold,b=m.rtt_dev_threshold;return sn.packetsLostRate>v?tn.NETWORK_CONGESTION:sn.nackRate>g?tn.NACK_RISING:sn.rttAverage>y?tn.HIGH_DELAY:sn.rttVariance>b?tn.NETWORK_JITTER:tn.NETWORK_NORMAL},cn=function(){return cn=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},cn.apply(this,arguments)},dn=function(e){var t,n,o,r,i=e.url,s=e.data,a=e.timeout,c=e.headers;return t=void 0,n=void 0,r=function(){var e,t,n;return function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}}(this,(function(o){switch(o.label){case 0:return e=new AbortController,t=setTimeout((function(){return e.abort()}),null!=a?a:1e4),[4,fetch(i,{body:JSON.stringify(s),cache:"no-cache",credentials:"same-origin",headers:cn({"content-type":"application/json"},c),method:"POST",mode:"cors",signal:e.signal}).then((function(e){if(200!==e.status)throw new Error("status Code:".concat(e.status));return e.text()})).then((function(e){try{return JSON.parse(e)}catch(t){return e}})).catch((function(e){throw "AbortError"===e.name?new Error("request timeout"):new Error("".concat(e.name,": ").concat(e.message))}))];case 1:return n=o.sent(),clearTimeout(t),[2,n]}}))},new((o=void 0)||(o=Promise))((function(e,i){function s(e){try{c(r.next(e));}catch(e){i(e);}}function a(e){try{c(r.throw(e));}catch(e){i(e);}}function c(t){var n;t.done?e(t.value):(n=t.value,n instanceof o?n:new o((function(e){e(n);}))).then(s,a);}c((r=r.apply(t,n||[])).next());}))},ln=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},un=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},hn=function(){function e(e){if(void 0===e&&(e=5),this.buffer=[],e%2!=1||e<3)throw new Error("windowSize must be an odd number greater than or equal to 3.");this.windowSize=e;}return e.prototype.next=function(e){return null===e||"number"!=typeof e||e<0?0:this.buffer.length<this.windowSize?(this.buffer.push(e),e):(this.buffer.push(e),this.buffer.shift(),un([],ln(this.buffer),false).sort((function(e,t){return e-t}))[Math.floor(this.windowSize/2)])},e.prototype.getBuffer=function(){return un([],ln(this.buffer),false)},e.prototype.reset=function(){this.buffer=[];},e}(),pn=function(){return pn=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},pn.apply(this,arguments)},fn=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},mn=function(){function e(e){var t=e.sdk;this.inputDelay=0,this.inputSeqMap={},this.rttSum=0,this.rttCount=0,this.rttArray=[],this.rtt=0,this.rawRTT=0,this.edgeRTT=0,this.latency={times:0,status:null},this.fps=null,this.delay=null,this.cpu="0",this.bitrate=null,this.lastBytesRevc=0,this.packetLost=null,this.nack=null,this.packetsReceived=null,this.framesDecoded=null,this.framesDropped=null,this.framesReceived=null,this.firCount=null,this.pliCount=null,this.decodems=null,this.interfameDelayMaxMs=null,this.frameWidth=null,this.frameHeight=null,this.packetsLossRate=0,this.codec="",this.jitterBuffer=0,this.lastFramesReceived=0,this.gpu="",this.audioFps=null,this.audioLevel=0,this.audioBitrate=null,this.audioLastBytesRevc=0,this.audioPacketsLost=null,this.audioPacketsReceived=null,this.audioNack=null,this.audioConcealedSamples=0,this.audioConcealmentEvents=0,this.audioJitterBuffer=0,this.audioTotalSamplesReceived=0,this.audioTotalSamplesDuration=0,this.audioSampleRate=0,this.audioChannels=0,this.audioPacketsLossRate=0,this.audioCodec="",this.performanceMetricBulk=[],this.eventMetricBulk=[],this.reportTimer=null,this.serverSessionCost=0,this.connectSuccessTimeCost=0,this.iceConnectedCost=0,this.firstFrameCost=0,this.apiCost=0,this.sdk=null,this.mount=null,this.rttFilter=new hn,this.time=0,this.sdk=t;}return Object.defineProperty(e.prototype,"isShowing",{get:function(){return !!this.getQcloudStatElement()&&"none"!==this.getQcloudStatElement().style.display},enumerable:false,configurable:true}),e.prototype.init=function(e){var t=e.mount;this.mount=t;},e.prototype.show=function(e){this.getQcloudStatElement()&&(this.getQcloudStatElement().style.display=e?"block":"none");},e.prototype.toggleStatisticsView=function(){var e=document.querySelector("#__vconsole");this.show(!this.isShowing),e&&(e.style.display=this.isShowing?"":"none");},e.prototype.getStats=function(){var e=this.sdk.gameConfig.getConfig({clientId:this.mount}).user_id;return {fps:this.fps,delay:this.delay,rtt:this.rtt,raw_rtt:this.rawRTT,edge_rtt:this.edgeRTT,cpu:this.cpu,load_cost_time:this.connectSuccessTimeCost-this.serverSessionCost,bit_rate:this.bitrate,packet_lost:this.packetLost,nack:this.nack,packet_received:this.packetsReceived,gpu:this.gpu,input_delay:this.inputDelay,user_id:e,timestamp:+new Date,first_frame_cost_time:this.firstFrameCost,api_cost_time:this.apiCost}},e.prototype.getMediaStats=function(){return {videoStats:{fps:this.fps,rtt:this.rtt,raw_rtt:this.rawRTT,edge_rtt:this.edgeRTT,bit_rate:ht(+this.bitrate/1024/1024*8),packet_lost:this.packetLost,packet_received:this.packetsReceived,packet_loss_rate:this.packetsLossRate,nack:this.nack,jitter_buffer:this.jitterBuffer,width:this.frameWidth,height:this.frameHeight,codec:this.codec,timestamp:+new Date},audioStats:{sample_rate:this.audioSampleRate,channels:this.audioChannels,bit_rate:ht(+this.audioBitrate/1024/1024*8),packet_lost:this.audioPacketsLost,packet_received:this.audioPacketsReceived,packet_loss_rate:this.audioPacketsLossRate,nack:this.audioNack,jitter_buffer:this.audioJitterBuffer,concealed_samples:this.audioConcealedSamples,concealment_events:this.audioConcealmentEvents,codec:this.audioCodec}}},e.prototype.setStat=function(e,t){var n,o,r,i,s,a=[],c=[];e.forEach((function(e){"inbound-rtp"===e.type&&("video"!==e.mediaType&&"video"!==e.kind||c.push(e),"audio"!==e.mediaType&&"audio"!==e.kind||a.push(e)),"candidate-pair"===e.type&&"succeeded"===e.state&&c.push(e),"track"===e.type&&(e.frameHeight||e.frameWidth||"video"===e.kind)&&c.push(e),"track"!==e.type||e.frameHeight&&e.frameWidth||a.push(e);}));try{for(var d=fn(c),l=d.next();!l.done;l=d.next()){var u=l.value,h=u.type,p=u.frameWidth,f=void 0===p?0:p,m=u.frameHeight,v=void 0===m?0:m,g=u.framesPerSecond,y=u.framerateMean,b=u.totalDecodeTime,k=void 0===b?0:b,S=u.framesDropped,C=void 0===S?0:S,w=u.firCount,T=void 0===w?0:w,E=u.pliCount,_=void 0===E?0:E,R=u.jitterBufferDelay,M=void 0===R?0:R,D=u.bytesReceived,I=void 0===D?0:D,P=u.nackCount,x=void 0===P?0:P,O=u.packetsLost,A=void 0===O?0:O,L=u.packetsReceived,G=void 0===L?0:L,B=u.framesReceived,j=void 0===B?0:B,F=u.jitter,N=u.totalInterFrameDelay,W=void 0===N?0:N,U=u.codecId,q=void 0===U?"":U,V=u.remoteSource,H=u.currentRoundTripTime,K=u.framesDecoded,z=void 0===K?0:K,$=u.jitterBufferEmittedCount;if((ae=void 0===$?0:$)||(ae=1),z||(z=1),"track"===h&&(V&&this.modifyStatElement({name:"Resolution",tag:"video-resolution",stat:"".concat(f,"x").concat(v),point:"qcloud-video"}),!(null===(s=et().name)||void 0===s?void 0:s.toLowerCase().includes("safari"))&&g||!V||(this.fps=j-this.lastFramesReceived,this.modifyStatElement({name:"FPS",tag:"video-fps",stat:"".concat(this.fps),point:"qcloud-video"}),this.lastFramesReceived=j),this.jitterBuffer=ht(M/ae*1e3),this.modifyStatElement({name:"JitterBuffer",tag:"video-jitter-buffer",stat:"".concat(this.jitterBuffer,"ms"),point:"qcloud-video"})),"inbound-rtp"===h){this.modifyStatElement({name:"Resolution",tag:"video-resolution",stat:"".concat(f,"x").concat(v),point:"qcloud-video"}),this.frameWidth===f&&this.frameHeight===v||(this.frameWidth=f,this.frameHeight=v,this.sdk.onVideoStreamConfigChange({width:f,height:v}),this.sdk.log("video stream resolution changed ->".concat(f," ").concat(v)));var Y=((null==t?void 0:t.get(q))||{}).mimeType,X=void 0===Y?"":Y;this.modifyStatElement({name:"Codec",tag:"video-codec",stat:X,point:"qcloud-video"}),this.codec=X,g&&(this.fps=g,this.modifyStatElement({name:"FPS",tag:"video-fps",stat:"".concat(this.fps),point:"qcloud-video"})),y&&(this.fps=Math.floor(y),this.modifyStatElement({name:"FPS",tag:"video-fps",stat:"".concat(this.fps),point:"qcloud-video"}),this.jitterBuffer=Math.floor(1e3*F),this.modifyStatElement({name:"JitterBuffer",tag:"video-jitter-buffer",stat:"".concat(this.jitterBuffer,"ms"),point:"qcloud-video"})),this.bitrate=I-this.lastBytesRevc;var J=ht(+this.bitrate/1024/1024*8);this.modifyStatElement({name:"VideoBitrate",tag:"video-bitrates",stat:"".concat(J,"Mbit/s"),point:"qcloud-video"}),this.lastBytesRevc=I;var Q=ht((A-this.packetLost)/(G-this.packetsReceived));this.packetsLossRate=Q,this.packetLost=A,this.packetsReceived=G,this.packetLost=A<0?0:A,this.modifyStatElement({name:"PacketLost",tag:"video-packet-lost",stat:"".concat(this.packetLost),point:"qcloud-video"}),this.nack=x,this.modifyStatElement({name:"NACK",tag:"video-nack",stat:"".concat(this.nack),point:"qcloud-video"}),this.jitterBuffer=ht(M/ae*1e3),this.modifyStatElement({name:"JitterBuffer",tag:"video-jitter-buffer",stat:"".concat(this.jitterBuffer,"ms"),point:"qcloud-video"}),this.delay=ht(+(k/z*1e3+this.jitterBuffer)),this.modifyStatElement({name:"Delay",tag:"video-delay",stat:"".concat(this.delay,"ms"),point:"qcloud-video"}),this.packetsReceived=G,this.framesDecoded=z,this.framesDropped=C,this.framesReceived=j,this.decodems=Math.floor(k/z*1e3),this.interfameDelayMaxMs=Math.floor(W/z*1e3),this.firCount=T,this.pliCount=_;var Z=(this.sdk.gameConfig.getConfig({clientId:this.mount}).feature_switch||{}).network_event_script;if(Z){var ee=Z.notify_threshold,te=void 0===ee?5:ee,ne=an({packetsReceived:G,packetsLost:A,nack:x,rtt:this.rttArray,featureSwitch:this.sdk.gameConfig.getConfig({clientId:this.mount}).feature_switch});this.latency.status===ne?(this.latency.times=this.latency.times+1,this.latency.times===te&&this.latency.status!==tn.NETWORK_NORMAL&&(this.sdk.onNetworkChange({status:"latency",data:{value:ne,message:tn[ne]}}),this.sdk.onEvent({type:"latency",data:{value:ne,message:tn[ne]}}),this.latency.times=0)):(this.latency.status=ne,this.latency.times=0);}}if("candidate-pair"===h){this.rawRTT=1e3*H;var oe=this.sdk.gameConfig.getConfig({clientId:this.mount}).proxy;(null==oe?void 0:oe.proxy_delay)?(this.edgeRTT=Math.max(5,this.rawRTT-oe.proxy_delay),this.edgeRTT=Math.min(this.edgeRTT,this.rawRTT)):this.edgeRTT=this.rawRTT;var re=this.rttFilter.next(this.edgeRTT);this.edgeRTT=Math.min(re,this.rawRTT);}}}catch(e){n={error:e};}finally{try{l&&!l.done&&(o=d.return)&&o.call(d);}finally{if(n)throw n.error}}try{for(var ie=fn(a),se=ie.next();!se.done;se=ie.next()){var ae,ce=se.value,de=(h=ce.type,ce.packetsLost),le=(A=void 0===de?0:de,ce.packetsReceived),ue=(G=void 0===le?0:le,ce.bytesReceived),he=(I=void 0===ue?0:ue,ce.audioLevel),pe=void 0===he?0:he,fe=ce.nackCount,me=(x=void 0===fe?0:fe,ce.codecId),ve=(q=void 0===me?"":me,ce.jitterBufferDelay),ge=(M=void 0===ve?0:ve,ce.concealedSamples),ye=void 0===ge?0:ge,be=ce.concealmentEvents,ke=void 0===be?0:be,Se=ce.totalSamplesReceived,Ce=ce.totalSamplesDuration,we=ce.jitterBufferEmittedCount;if((ae=void 0===we?0:we)||(ae=1),"inbound-rtp"===h){var Te=(null==t?void 0:t.get(q))||{},Ee=Te.mimeType,_e=(X=void 0===Ee?"":Ee,Te.channels);if(X){this.audioConcealedSamples=ye,this.audioConcealmentEvents=ke,this.audioChannels=_e,this.modifyStatElement({name:"Codec",tag:"audio-codec",stat:X,point:"qcloud-audio"}),this.audioCodec=X;var Re=Math.round((Se-this.audioTotalSamplesReceived)/(Ce-this.audioTotalSamplesDuration));this.audioSampleRate=Re,this.audioTotalSamplesDuration=Ce,this.audioTotalSamplesReceived=Se,this.audioBitrate=I-this.audioLastBytesRevc,J=ht(+this.audioBitrate/1024/1024*8),this.modifyStatElement({name:"AudioBitrate",tag:"audio-bitrates",stat:"".concat(J,"Mbit/s"),point:"qcloud-audio"}),this.audioLastBytesRevc=I,this.modifyStatElement({name:"PacketLost",tag:"audio-packet-lost",stat:"".concat(this.audioPacketsLost),point:"qcloud-audio"}),Q=ht((A-this.audioPacketsLost)/(G-this.audioPacketsReceived)),this.audioPacketsLossRate=Q,this.audioPacketsLost=A,this.audioPacketsReceived=G,this.audioNack=x,this.modifyStatElement({name:"NACK",tag:"audio-nack",stat:"".concat(this.audioNack),point:"qcloud-audio"}),this.audioJitterBuffer=ht(M/ae*1e3),this.jitterBuffer&&this.modifyStatElement({name:"JitterBuffer",tag:"audio-jitter-buffer",stat:"".concat(this.audioJitterBuffer,"ms"),point:"qcloud-audio"});}"track"===h&&this.modifyStatElement({name:"AudioLevel",tag:"audio-level",stat:"".concat(ht(pe)),point:"qcloud-audio"});}}}catch(e){r={error:e};}finally{try{se&&!se.done&&(i=ie.return)&&i.call(ie);}finally{if(r)throw r.error}}},e.prototype.setInputStart=function(e){this.inputSeqMap[e]=(new Date).getTime();},e.prototype.setInputEnd=function(e){ void 0===e&&(e=0),this.inputSeqMap[e]&&(this.inputDelay=Math.round((+new Date-this.inputSeqMap[e])/2),delete this.inputSeqMap[e]);},e.prototype.setRTT=function(e){this.rtt=e,this.modifyStatElement({name:"RTT",tag:"video-rtt",stat:"".concat(e.toString(),"ms"),point:"qcloud-video"}),5===this.rttArray.length&&this.rttArray.shift(),this.rttArray.push(e),this.rttSum+=e,this.rttCount+=1;var t=e/(this.rttSum/this.rttCount)>2;return this.rttCount>60&&(this.rttSum=0,this.rttCount=0),t},e.prototype.setCpuAndGpuUsage=function(e){var t=e.cpu,n=void 0===t?"":t,o=e.gpu,r=void 0===o?"":o;this.cpu=n,+n&&this.modifyStatElement({name:"CpuUsage",tag:"cpu-usage",stat:n,point:"qcloud-info"}),this.gpu=r,+r&&this.modifyStatElement({name:"GpuUsage",tag:"gpu-usage",stat:r,point:"qcloud-info"});},e.prototype.setStaticStat=function(e){var t,n=e.serverIp,o=void 0===n?"":n,r=e.region,i=void 0===r?"":r,s=e.instanceId,a=void 0===s?"":s,c=e.instanceType,d=void 0===c?"":c,l=e.hostName,u=void 0===l?"":l,h=e.requestId,p=void 0===h?"":h,f=e.videoMimeType,m=void 0===f?"":f,v=e.audioMimeType,g=void 0===v?"":v,y=e.resolution,b=void 0===y?"":y;if(this.modifyStatElement({name:"Version",tag:"sdk-version",stat:Re,point:"qcloud-info"}),o&&this.modifyStatElement({name:"ServerIp",tag:"server-ip",stat:o,point:"qcloud-info"}),i&&this.modifyStatElement({name:"Region",tag:"region",stat:i,point:"qcloud-info"}),a&&this.modifyStatElement({name:"InstanceId",tag:"instance-id",stat:a,point:"qcloud-info"}),d&&this.modifyStatElement({name:"InstanceType",tag:"instance-type",stat:d,point:"qcloud-info"}),p&&this.modifyStatElement({name:"RequestId",tag:"request-id",stat:p,point:"qcloud-info"}),m&&this.modifyStatElement({name:"Codec",tag:"video-codec",stat:m,point:"qcloud-video"}),g&&this.modifyStatElement({name:"Codec",tag:"audio-codec",stat:g,point:"qcloud-audio"}),b&&this.modifyStatElement({name:"Resolution",tag:"video-resolution",stat:b,point:"qcloud-video"}),!document.querySelector(".qcloud-host")&&this.sdk.isMobileGame){var k=document.createElement("div");k.className="qcloud-stat-row qcloud-host",k.innerHTML="<div class='qcloud-stat-left'>HostName</div><div class='qcloud-stat-right'>".concat(u,"</div>"),u&&(null===(t=this.getQcloudStatElement())||void 0===t||t.appendChild(k));}},e.prototype.setServerSessionTime=function(e){this.serverSessionCost=e;},e.prototype.setIceConnectedTime=function(e){this.iceConnectedCost=e;},e.prototype.setConnectSuccessTime=function(e){this.connectSuccessTimeCost=e,this.modifyStatElement({name:"ConnectCost",tag:"connect-success",stat:"".concat(e-this.sdk.accessTime,"ms"),point:"qcloud-info"});},e.prototype.setAPICost=function(e){this.apiCost=e,this.modifyStatElement({name:"APICost",tag:"api-cost",stat:"".concat(e,"ms"),point:"qcloud-info"});},e.prototype.setFirstFrameCost=function(e){this.firstFrameCost=e,this.modifyStatElement({name:"FirstFrameCost",tag:"first-frame",stat:"".concat(e,"ms"),point:"qcloud-info"});},e.prototype.toggleMetricReportBulk=function(e){var t=this;"websocket"!==this.sdk.streamingMode&&(e?(clearInterval(this.reportTimer),this.reportTimer=setInterval((function(){t.metricReportBulk({type:"performance"}),t.metricReportBulk({type:"event"}),t.sdk.reportLogInner();}),1e4)):(clearInterval(this.reportTimer),this.sdk.reportLogInner()));},e.prototype.addPerformanceReportStat=function(){var e,t,n=this.sdk.gameConfig.getConfig({clientId:this.mount}),o=n.server_ip,r=n.request_id,i=n.server_version,s=n.user_id,a=n.app_id,c=n.game_id,d=n.host_name;this.performanceMetricBulk.push({user_id:s,request_id:r,server_ip:o,server_version:i,timestamp:+new Date,bit_rate:8*this.bitrate,packet_lost:this.packetLost,packet_received:this.packetsReceived,bytes_received:this.lastBytesRevc,audio_packet_lost:this.audioPacketsLost,audio_packet_received:this.audioPacketsReceived,fps:this.fps,delay:this.delay,nack:this.nack,cpu:+this.cpu,gpu:this.gpu,load_cost_time:this.iceConnectedCost-this.serverSessionCost,first_frame:this.connectSuccessTimeCost-this.serverSessionCost,jitter_buffer:this.jitterBuffer,input_delay:this.inputDelay,frame_decoded:this.framesDecoded,frame_dropped:this.framesDropped,frame_received:this.framesReceived,render_frame_rate:this.framesDecoded,receive_frame_rate:this.framesReceived,decoded_frame_rate:this.framesDecoded,decode_ms:this.decodems,version:"".concat(Re),platform:"0",pli_count:this.pliCount,fir_count:this.firCount,browser:"".concat(null===(e=et().os)||void 0===e?void 0:e.family,"/").concat(null===(t=et().os)||void 0===t?void 0:t.version,"/").concat(et().name),app_id:"".concat(null!=a?a:0),game_id:c,rtt:this.rtt,raw_rtt:this.rawRTT,edge_rtt:this.edgeRTT,host_name:null!=d?d:"",device_id:null!=r?r:"",first_frame_cost_time:this.firstFrameCost,api_cost_time:this.apiCost,video_codec_name:this.codec,audio_codec_name:this.audioCodec});},e.prototype.addEventReport=function(e){var t=e.event_code,n=void 0===t?"":t,o=e.event_result_code,r=void 0===o?"":o,i=e.event_result_msg,s=void 0===i?"":i,a=e.event_time,c=void 0===a?+new Date:a,d=e.consume_time,l=function(e,t){var n={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&t.indexOf(o)<0&&(n[o]=e[o]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var r=0;for(o=Object.getOwnPropertySymbols(e);r<o.length;r++)t.indexOf(o[r])<0&&Object.prototype.propertyIsEnumerable.call(e,o[r])&&(n[o[r]]=e[o[r]]);}return n}(e,["event_code","event_result_code","event_result_msg","event_time","consume_time"]);this.eventMetricBulk.push(pn(pn(pn({},this.getEventCommonProperties()),{event_code:n,event_result_code:r,event_result_msg:s,event_time:c,consume_time:d}),l));},e.prototype.getEventCommonProperties=function(){var e=this.sdk.gameConfig.getConfig({clientId:this.mount}),t=e.app_id,n=e.user_id,o=void 0===n?"":n,r=e.server_ip,i=void 0===r?"":r,s=e.server_version,a=void 0===s?"":s,c=e.host_name,d=void 0===c?"":c,l=e.request_id,u=void 0===l?"":l,h=e.proxy,p=void 0===h?{}:h,f=p.edge,m=void 0===f?"":f,v=p.uploader,g=void 0===v?"":v;return {platform:"0",sdk_version:"".concat(Re),hardware_os:"",os_version:null===navigator||void 0===navigator?void 0:navigator.userAgent,brand:"",model:"",IMEI:"",device_id:"",app_id:"".concat(null!=t?t:0),user_id:o,server_ip:i,server_version:a,host_name:d,request_id:u,timestamp:+new Date,edge:m,uploader:g}},e.prototype.metricReportBulk=function(e){var t,n,o,r,i=e.type;return t=this,n=void 0,r=function(){var e,t,n,o,r,s,a=this;return function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}}(this,(function(c){switch(c.label){case 0:if(e={},"event"===i){if(0===this.eventMetricBulk.length)return [2];e={metric:"cg_client_event",bulk:this.eventMetricBulk};}if("performance"===i&&(e={metric:"cg_client_stat",bulk:this.performanceMetricBulk}),this.sdk.isTCGMetricSocketConnected)try{return this.sdk.metricSocket.sendMetricRequest({Type:"report_metric_bulk",Payload:e,Callback:function(e){var t=void 0===e?{}:e,n=t.Code,o=t.Message;0===n?("performance"===i&&(a.performanceMetricBulk=[]),"event"===i&&(a.eventMetricBulk=[])):a.sdk.log("metricSocket report failed",i,o);}}),[2]}catch(e){this.sdk.log("metricSocket report failed, fallback to API",e.message);}t=this.sdk.gameConfig.getConfig({clientId:this.mount}).metric_key,n=null;try{n=t&&rn()(JSON.stringify(e).slice(0,128),t).toString();}catch(e){this.sdk.log("encode sig_key error",e);}o=n?" https://metrics-cloud-gaming.crtrcloud.com/report_metric_bulk?sig=".concat(n):" https://metrics-cloud-gaming.crtrcloud.com/report_metric_bulk",c.label=1;case 1:return c.trys.push([1,3,,4]),[4,dn({url:o,data:e})];case 2:return 0!==(r=c.sent().code)&&this.sdk.log("metricReportBulk failed",i,r),"performance"===i&&(this.performanceMetricBulk=[]),"event"===i&&(this.eventMetricBulk=[]),[3,4];case 3:return s=c.sent(),this.sdk.log("catch metricReportBulk failed",i,s.message,s.name),[3,4];case 4:return [2]}}))},new((o=void 0)||(o=Promise))((function(e,i){function s(e){try{c(r.next(e));}catch(e){i(e);}}function a(e){try{c(r.throw(e));}catch(e){i(e);}}function c(t){var n;t.done?e(t.value):(n=t.value,n instanceof o?n:new o((function(e){e(n);}))).then(s,a);}c((r=r.apply(t,n||[])).next());}))},e.prototype.modifyStatElement=function(e){var t,n,o,r=e.name,i=void 0===r?"":r,s=e.tag,a=void 0===s?"":s,c=e.stat,d=void 0===c?"":c,l=e.point,u=void 0===l?null:l;if(null===(t=this.getQcloudStatElement())||void 0===t?void 0:t.querySelector(".qcloud-".concat(a)))this.getQcloudStatElement()&&(this.getQcloudStatElement().querySelector(".qcloud-".concat(a," .qcloud-stat-right")).innerHTML=d);else {var h=document.createElement("div");h.className="qcloud-stat-row qcloud-".concat(a),h.innerHTML="<div class='qcloud-stat-left'>".concat(i,"</div><div class='qcloud-stat-right'>").concat(d,"</div>"),null===(o=null===(n=this.getQcloudStatElement())||void 0===n?void 0:n.querySelector(".".concat(u)))||void 0===o||o.appendChild(h);}},e.prototype.getQcloudStatElement=function(){var e;return null===(e=null===document||void 0===document?void 0:document.querySelector("#".concat(this.mount)))||void 0===e?void 0:e.querySelector(".qcloud-stat")},e}();const vn=mn;var gn=function(){function e(){this._events={};}return e.prototype.clear=function(){this._events={};},e.prototype.on=function(e,t){return this._events[e]||(this._events[e]=[]),this._events[e].push(t)-1},e.prototype.trigger=function(e,t){var n=this;if("error"!==e){var o=this._events[e];(null==o?void 0:o.length)&&o.forEach((function(e){e(t);}));}else setTimeout((function(){var o=n._events[e];(null==o?void 0:o.length)&&o.forEach((function(e){e(t);}));}),100);},e.prototype.off=function(e,t,n){var o=this._events[e];if(null==o?void 0:o.length)if(void 0!==n)o.splice(n,1);else {var r=o.findIndex((function(e){return e===t}));r>-1&&o.splice(r,1);}},e.prototype.offAll=function(){this._events={};},e.prototype.once=function(e,t){var n=this;this._events[e]||(this._events[e]=[]);var o=null,r=function(i){t(i),n.off(e,r,o);};o=this.on(e,r);},e}(),yn=n(995);yn.configure;const bn=yn;var kn,Sn=(kn=function(e,t){return kn=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},kn(e,t)},function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Class extends value "+String(t)+" is not a constructor or null");function n(){this.constructor=e;}kn(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n);}),Cn=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},wn=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Tn=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},En=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},_n=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},Rn=function(e){function t(){var t=null!==e&&e.apply(this,arguments)||this;return t.logStr=[],t.allLogs=[],t.externalLogHandler=lt,t}return Sn(t,e),t.prototype.log=function(){for(var e,t,n,o,r=[],i=0;i<arguments.length;i++)r[i]=arguments[i];var s=this.getInitOptions()||{},a=s.debugSetting,c=void 0===a?{}:a,d=s.mount;(null==c?void 0:c.showLog)&&console.log.apply(console,En([],Tn(r),false));var l="";try{for(var u=_n(r),h=u.next();!h.done;h=u.next()){var p=h.value;try{l+="".concat("object"==typeof p?bn(p):p," ");}catch(e){console.log("Error stringify object:",e.message);}}}catch(t){e={error:t};}finally{try{h&&!h.done&&(t=u.return)&&t.call(u);}finally{if(e)throw e.error}}var f=this.getServerSession({clientId:d}),m=f.request_id,v=void 0===m?"":m,g=f.server_ip,y=void 0===g?"":g,b=f.user_id,k=void 0===b?"":b,S=null!==(n=y||v)&&void 0!==n?n:"";l="[TCG/".concat(S,"][").concat(k,"]:").concat(l),null===(o=this.externalLogHandler)||void 0===o||o.call(this,l);var C=new Date,w={timestamp:+C,server_ip:y,request_id:v,user_id:k,content:"".concat(dt(C,"yyyy-mm-dd hh:ii:ss")," ").concat(l,"\n")};this.logStr.push(w),this.allLogs.push({request_id:w.request_id,user_id:w.user_id,content:w.content});},t.prototype.getLog=function(){var e,t=this.getServerSession({clientId:null===(e=this.getInitOptions())||void 0===e?void 0:e.mount}),n=t.request_id,o=void 0===n?"":n,r=t.server_ip,i=void 0===r?"":r;return this.logStr.forEach((function(e){e.server_ip||(e.server_ip=i),e.request_id||(e.request_id=o);})),this.logStr},t.prototype.getAllLogs=function(){var e,t=this.getServerSession({clientId:null===(e=this.getInitOptions())||void 0===e?void 0:e.mount}).request_id,n=void 0===t?"":t;return this.allLogs.forEach((function(e){e.request_id||(e.request_id=n);})),this.allLogs},t.prototype.reportLogInner=function(){return Cn(this,void 0,void 0,(function(){return wn(this,(function(e){return [2,this.metricLogReport(this.getLog())]}))}))},t.prototype.setExternalLog=function(e){ void 0===e&&(e=lt),this.externalLogHandler=e;},t.prototype.metricLogReport=function(e){var t;return Cn(this,void 0,void 0,(function(){var n,o,r,i,s,a,c,d,l,u=this;return wn(this,(function(h){switch(h.label){case 0:if(0===this.logStr.length)return [2];if(n={metric:"cg_client_log",bulk:e},this.isTCGMetricSocketConnected)try{return this.getTCGMetricSocket.sendMetricRequest({Type:"report_log_bulk",Payload:n,Callback:function(e){var t=void 0===e?{}:e,n=t.Code,o=t.Message;0===n?u.logStr=[]:u.log("metricSocket report failed",o);}}),[2]}catch(e){this.log("metricSocket report failed, fallback to API",e.message);}o=this.getServerSession({clientId:null===(t=this.getInitOptions())||void 0===t?void 0:t.mount}).metric_key,r=null;try{r=o&&rn()(JSON.stringify(n).slice(0,128),o).toString();}catch(e){this.log("encode sig_key error",e);}i=r?"https://metrics-cloud-gaming.crtrcloud.com/report_log_bulk?sig=".concat(r):"https://metrics-cloud-gaming.crtrcloud.com/report_log_bulk",h.label=1;case 1:return h.trys.push([1,3,,4]),[4,dn({url:i,data:n})];case 2:return s=h.sent(),a=s.code,c=s.message,d=void 0===c?"":c,0===a?(this.log("metricReportLog",a,d),this.logStr=[],[2,{code:a,message:d}]):(this.log("metricReportLog failed",d),[2,{code:-1,message:"failed"}]);case 3:return l=h.sent(),this.log("catch metricReportLog failed",l.message,l.name),[2,{code:-1,message:"failed"}];case 4:return [2]}}))}))},t}(gn);const Mn=Rn;var Dn=n(408),In=function(){function e(e){var t=e.sdk;this.gamepad="function"==typeof navigator.getGamepads?new Dn.GamepadListener:null,this.sdk=null,this.sdk=t;}return e.prototype.addGamepadHandler=function(){var e=this,t=new Map;t.set(12,1),t.set(13,2),t.set(14,4),t.set(15,8),t.set(2,16384),t.set(3,32768),t.set(0,4096),t.set(1,8192),t.set(8,32),t.set(9,16),t.set(10,64),t.set(11,128),t.set(4,256),t.set(5,512),this.gamepad&&(this.gamepad.on("gamepad:connected",(function(t){var n=t.detail;e.sdk.log("gamepad:connected detail",n);var o=n.index,r=n.gamepad;e.sdk.log("gamepad connect, gamepad index is",o),e.sdk.sendGamepadEvent({type:"gamepadconnect"}),e.sdk.onGamepadConnectChange({status:"gamepadconnect",index:o,gamepad:r});})),this.gamepad.on("gamepad:disconnected",(function(t){var n=t.detail;e.sdk.log("gamepad:disconnected detail",n);var o=n.index;e.sdk.log("gamepad disconnected, gamepad index is",o),e.sdk.sendGamepadEvent({type:"gamepaddisconnect"}),e.sdk.onGamepadConnectChange({status:"gamepaddisconnect",index:o});})),this.gamepad.on("gamepad:button",(function(n){var o=n.detail,r=o.button,i=o.pressed,s=o.value,a=t.get(r);6===r||7===r?(6===r&&e.sdk.sendGamepadEvent({type:"lt",x:parseInt("".concat(255*s),10),down:i}),7===r&&e.sdk.sendGamepadEvent({type:"rt",x:parseInt("".concat(255*s),10),down:i})):e.sdk.sendGamepadEvent({type:"gamepadkey",key:a,down:i});})),this.gamepad.on("gamepad:axis",(function(t){var n=t.detail,o=n.stick,r=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s}(n.gamepad.axes,4),i=r[0],s=r[1],a=r[2],c=r[3];0===o&&e.sdk.sendGamepadEvent({type:"axisleft",x:parseInt("".concat(32767*i),10),y:-parseInt("".concat(32767*s),10)}),1===o&&e.sdk.sendGamepadEvent({type:"axisright",x:parseInt("".concat(32767*a),10),y:-parseInt("".concat(32767*c),10)});})),this.gamepad.start());},e}();const Pn=In;var xn=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},On=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},An=function(){function e(e){var t=e.sdk,n=this;this.token="",this.serverIp="",this.retryTimes=0,this.maxRetryTimes=10,this.retryInterval=6e3,this.sdk=null,this.mount=null,this.startRetry=function(e){var t=e.message;n.sdk.log("Watchdog, reconnect proxy failed, try again, startRetry, times",n.retryTimes),setTimeout((function(){if(n.retryTimes>=n.maxRetryTimes)return n.sdk.cloudGamingWebRTC.clearPeerConnection(),n.sdk.onConnectFailed({code:be.EXCEEDED_LIMIT_RERTY_TIMES,msg:"Retries exceeded"});n.autoReconnect({message:t}),n.retryTimes=n.retryTimes+1,n.sdk.onConnectFailed({code:be.AUTO_RECONNECTING,msg:"auto connecting"});}),n.retryInterval);},this.sdk=t;}return e.prototype.init=function(e){var t=e.mount;this.mount=t;},e.prototype.autoReconnect=function(e){var t=e.message;return xn(this,void 0,void 0,(function(){var e,n,o,r,i,s,a,c,d,l,u,h,p,f,m,v;return On(this,(function(g){switch(g.label){case 0:return [4,this.sdk.cloudGamingWebRTC.newWebRtcConnection()];case 1:if(g.sent(),this.sdk.showStats.addEventReport({event_code:"auto_reconnect",event_result_msg:t}),this.sdk.accessTime=+new Date,this.sdk.isMobileGame)return [2,this.androidInstanceReconnect({message:t})];if(!this.serverIp||!this.token)return this.sdk.log("Watchdog, autoReconnect, serverIp:".concat(this.serverIp," or token:").concat(this.token," is not set, abort")),[2,this.sdk.onConnectFailed({code:ye.CONNECT_FAILED,msg:"reconnect failed"})];e=this.sdk.cloudGamingWebRTC.getClientSideDescription(false),n=this.sdk.gameConfig.getConfig({clientId:this.mount}),o=n.user_id,r=n.server_port,i=n.instance_id,s=r||7392,g.label=2;case 2:return g.trys.push([2,4,,5]),this.sdk.log("Watchdog, reconnect, serverIp:".concat(this.serverIp,", token:").concat(this.token)),a="host=".concat(this.serverIp,"&port=").concat(s,"&token=").concat(this.token,"&uid=").concat(o),c=this.sdk.accessInfo.getInstanceAccessInfo({instanceId:i}).WebRTCAddress,d="".concat("https://cgproxy.cloud-gaming.myqcloud.com","/reconnect?").concat(a),c&&(d="".concat(c,"/reconnect?").concat(a)),[4,dn({url:d,data:e})];case 3:return l=g.sent(),u=l.Code,h=l.ServerSession,this.sdk.log("Watchdog, reconnect response code: ".concat(u)),0===u?(p=this.checkServerSession(h),f=p.code,m=p.message,0===f?(this.sdk.log("Watchdog, reconnect proxy success"),this.sdk.cloudGamingWebRTC.connect(Je(h)),this.retryTimes=0):(this.sdk.cloudGamingWebRTC.clearPeerConnection(),this.sdk.onConnectFailed({code:f,msg:m}),this.sdk.log("Watchdog, reconnect proxy failed"))):this.startRetry({message:t}),[3,5];case 4:return v=g.sent(),this.sdk.log("Watchdog post error",v),this.startRetry({message:null==v?void 0:v.message}),[3,5];case 5:return [2]}}))}))},e.prototype.setReconnectInfo=function(e){var t=e.serverIp,n=void 0===t?"":t,o=e.token,r=void 0===o?"":o;this.serverIp=n,this.token=r;},e.prototype.checkServerSession=function(e){try{var t=JSON.parse(e),n=t.code,o=t.WebrtcResponse,r=t.Code,i=t.Msg,s=t.message,a=null!=n?n:r,c=s||i||(null==o?void 0:o.Msg);return this.sdk.log("Watchdog, server session code: ".concat(a,", message: ").concat(c)),{code:a,message:c}}catch(e){this.sdk.log("Watchdog, parse ServerSession error");}},e.prototype.androidInstanceReconnect=function(e){var t=e.message;return xn(this,void 0,void 0,(function(){var e,n,o,r,i,s;return On(this,(function(a){switch(a.label){case 0:return e=this.sdk.gameConfig.getConfig({clientId:this.mount}).instance_id,this.sdk.log("Watchdog reconnect android instance, instance id is ".concat(e,", message: ").concat(t)),this.sdk.androidInstance.groupControl.groupControlId?(this.sdk.destroy({code:be.MODE_FORBIDDEN,message:"Could not reconnect in group control mode"}),this.sdk.onConnectFailed({code:be.MODE_FORBIDDEN,msg:"Could not reconnect in group control mode"}),[3,7]):[3,1];case 1:if(!e)return [3,6];a.label=2;case 2:return a.trys.push([2,4,,5]),[4,this.sdk.accessInfo.createWebRTCSession({instanceId:e,clientSession:this.sdk.getClientSession()})];case 3:return n=a.sent(),o=n.ServerSession,r=n.Code,i=n.Message,this.sdk.log("Watchdog, reconnect response code: ".concat(r,", message: ").concat(i)),0===r?(this.sdk.log("Watchdog, reconnect proxy success"),this.sdk.cloudGamingWebRTC.connect(o),this.retryTimes=0):(this.sdk.log("Watchdog reconnect error",i),this.startRetry({message:i})),[3,5];case 4:return s=a.sent(),this.sdk.log("Watchdog reconnect cache error",s.name,s.message),this.startRetry({message:s.message}),[3,5];case 5:return [3,7];case 6:this.sdk.log("Watchdog reconnect error, instance id is not set"),a.label=7;case 7:return [2]}}))}))},e}();const Ln=An;var Gn=function(){return Gn=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Gn.apply(this,arguments)},Bn=function(){function e(e){var t=e.sdk;this.sdk=null,this.configBatch=new Map,this.sdk=t;}return e.prototype.setConfig=function(e){var t=e.clientId,n=e.config,o=n.game_config,r=n.feature_switch,i=void 0===r?ft:r;this.setSDKConfig(null==o?void 0:o.sdk_conf),this.configBatch.set(t,Gn(Gn({},this.configBatch.get(t)),n)),this.setFeatureSwitch(i,t);},e.prototype.setAppId=function(e){var t=e.clientId,n=e.appId,o=this.configBatch.get(t);(null==o?void 0:o.app_id)||this.configBatch.set(t,Gn(Gn({},this.configBatch.get(t)),{app_id:n}));},e.prototype.setSDKConfig=function(e){if(e){var t=this.sdk.getInitOptions().webDraftLevel;"number"==typeof e.webdraft_level&&void 0!==t&&this.sdk.pageEvent.setWebDraftLevel(e.webdraft_level);}},e.prototype.getConfig=function(e){var t=e.clientId;return this.configBatch.get(t)||ft},e.prototype.setFeatureSwitch=function(e,t){if(e){var n=e.network_event_script;n&&(n=JSON.parse(n)),this.configBatch.set(t,Gn(Gn({},this.configBatch.get(t)),{feature_switch:{network_event_script:n}}));}},e}();const jn=Bn,Fn={randomUUID:"undefined"!=typeof crypto&&crypto.randomUUID&&crypto.randomUUID.bind(crypto)};let Nn;const Wn=new Uint8Array(16),Un=[];for(let e=0;e<256;++e)Un.push((e+256).toString(16).slice(1));const qn=function(e,t,n){if(Fn.randomUUID&&!t&&!e)return Fn.randomUUID();const o=(e=e||{}).random??e.rng?.()??function(){if(!Nn){if("undefined"==typeof crypto||!crypto.getRandomValues)throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");Nn=crypto.getRandomValues.bind(crypto);}return Nn(Wn)}();if(o.length<16)throw new Error("Random bytes length must be >= 16");if(o[6]=15&o[6]|64,o[8]=63&o[8]|128,t);return function(e,t=0){return (Un[e[t+0]]+Un[e[t+1]]+Un[e[t+2]]+Un[e[t+3]]+"-"+Un[e[t+4]]+Un[e[t+5]]+"-"+Un[e[t+6]]+Un[e[t+7]]+"-"+Un[e[t+8]]+Un[e[t+9]]+"-"+Un[e[t+10]]+Un[e[t+11]]+Un[e[t+12]]+Un[e[t+13]]+Un[e[t+14]]+Un[e[t+15]]).toLowerCase()}(o)};var Vn,Hn;!function(e){e[e.opus=101]="opus",e[e.aac=102]="aac",e[e.h264=103]="h264",e[e.h265=104]="h265",e[e.vp8=105]="vp8",e[e.vp9=106]="vp9";}(Vn||(Vn={})),function(e){e[e.open=10]="open",e[e.message=11]="message";}(Hn||(Hn={}));var Kn,zn,$n=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},Yn=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))};function Xn(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];Kn&&Kn.apply(void 0,Yn([e],$n(t),false));}function Jn(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];zn&&zn.apply(void 0,Yn([e],$n(t),false));}var Qn=function(){function e(t){this.stype=null,this.isfmb=false,this.isvcl=null,this.payload=null,this.ntype=null,this.payload=t,this.ntype=31&this.payload[0],this.isvcl=this.ntype===e.NDR||this.ntype===e.IDR;}return Object.defineProperty(e,"NDR",{get:function(){return 1},enumerable:false,configurable:true}),Object.defineProperty(e,"IDR",{get:function(){return 5},enumerable:false,configurable:true}),Object.defineProperty(e,"SEI",{get:function(){return 6},enumerable:false,configurable:true}),Object.defineProperty(e,"SPS",{get:function(){return 7},enumerable:false,configurable:true}),Object.defineProperty(e,"PPS",{get:function(){return 8},enumerable:false,configurable:true}),Object.defineProperty(e,"AUD",{get:function(){return 9},enumerable:false,configurable:true}),e.prototype.type=function(){return this.ntype},e.prototype.isKeyframe=function(){return this.ntype===e.IDR},e.prototype.getPayload=function(){return this.payload},e.prototype.getPayloadSize=function(){return this.payload.byteLength},e.prototype.getSize=function(){return 4+this.getPayloadSize()},e.prototype.getData=function(){var e=new Uint8Array(this.getSize());return new DataView(e.buffer).setUint32(0,this.getSize()-4),e.set(this.getPayload(),4),e},e}();function Zn(e,t){var n=new Uint8Array((0|e.byteLength)+(0|t.byteLength));return n.set(e,0),n.set(t,0|e.byteLength),n}var eo=function(e){for(var t=0,n=e.byteLength,o=[],r=-1;t<n;)t+2<n&&0===e[t]&&0===e[t+1]&&1===e[t+2]?(-1!==r&&o.push(e.slice(r,t)),r=t+3,t+=3):t+3<n&&0===e[t]&&0===e[t+1]&&0===e[t+2]&&1===e[t+3]?(-1!==r&&o.push(e.slice(r,t)),r=t+4,t+=4):t+=1;return  -1!==r&&o.push(e.slice(r)),o};const to=function(){function e(e){this.data=e,this.bytesAvailable=e.byteLength,this.word=0,this.bitsAvailable=0;}return e.prototype.loadWord=function(){var e=this.data,t=this.bytesAvailable,n=e.byteLength-t,o=new Uint8Array(4),r=Math.min(4,t);if(0===r)throw new Error("no bytes available");o.set(e.subarray(n,n+r)),this.word=new DataView(o.buffer).getUint32(0),this.bitsAvailable=8*r,this.bytesAvailable-=r;},e.prototype.skipBits=function(e){var t;e=Math.min(e,8*this.bytesAvailable+this.bitsAvailable),this.bitsAvailable>e?(this.word<<=e,this.bitsAvailable-=e):(e-=this.bitsAvailable,e-=(t=e>>3)<<3,this.bytesAvailable-=t,this.loadWord(),this.word<<=e,this.bitsAvailable-=e);},e.prototype.readBits=function(e){var t=Math.min(this.bitsAvailable,e),n=this.word>>>32-t;if(e>32&&console.log("Cannot read more than 32 bits at a time"),this.bitsAvailable-=t,this.bitsAvailable>0)this.word<<=t;else {if(!(this.bytesAvailable>0))throw new Error("no bits available");this.loadWord();}return (t=e-t)>0&&this.bitsAvailable?n<<t|this.readBits(t):n},e.prototype.skipLZ=function(){var e;for(e=0;e<this.bitsAvailable;++e)if(0!=(this.word&2147483648>>>e))return this.word<<=e,this.bitsAvailable-=e,e;return this.loadWord(),e+this.skipLZ()},e.prototype.skipUEG=function(){this.skipBits(1+this.skipLZ());},e.prototype.skipEG=function(){this.skipBits(1+this.skipLZ());},e.prototype.readUEG=function(){var e=this.skipLZ();return this.readBits(e+1)-1},e.prototype.readEG=function(){var e=this.readUEG();return 1&e?1+e>>>1:-1*(e>>>1)},e.prototype.readBoolean=function(){return 1===this.readBits(1)},e.prototype.readUByte=function(){return this.readBits(8)},e.prototype.readUShort=function(){return this.readBits(16)},e.prototype.readUInt=function(){return this.readBits(32)},e}();var no=function(){function e(e){this.remuxer=null,this.track=null,this.remuxer=e,this.track=e.mp4track;}return e.parseHeader=function(e){var t=new to(e.getPayload());t.readUByte(),e.isfmb=0===t.readUEG(),e.stype=t.readUEG();},e.prototype.parseNAL=function(e){if(!e)return  false;var t=false;switch(e.type()){case Qn.IDR:case Qn.NDR:t=true;break;case Qn.PPS:this.track.pps||(this.parsePPS(e.getPayload()),!this.remuxer.readyToDecode&&this.track.pps&&this.track.sps&&(this.remuxer.readyToDecode=true)),t=true;break;case Qn.SPS:this.track.sps||(this.parseSPS(e.getPayload()),!this.remuxer.readyToDecode&&this.track.pps&&this.track.sps&&(this.remuxer.readyToDecode=true)),t=true;case Qn.AUD:case Qn.SEI:}return t},e.prototype.skipScalingList=function(e,t){for(var n=8,o=8,r=0;r<t;r++)0!==o&&(o=(n+e.readEG()+256)%256),n=0===o?n:o;},e.prototype.readSPS=function(e){var t,n,o,r=new to(e),i=0,s=0,a=0,c=0,d=r.readUByte.bind(r),l=r.readBits.bind(r),u=r.readUEG.bind(r),h=r.readBoolean.bind(r),p=r.skipBits.bind(r),f=r.skipEG.bind(r),m=r.skipUEG.bind(r),v=this.skipScalingList.bind(this);d();var g=d();if(l(5),p(3),d(),m(),100===g||110===g||122===g||244===g||44===g||83===g||86===g||118===g||128===g){var y=u();if(3===y&&p(1),m(),m(),p(1),h())for(n=3!==y?8:12,o=0;o<n;o++)h()&&v(o<6?16:64,r);}m();var b=u();if(0===b)u();else if(1===b)for(p(1),f(),f(),t=u(),o=0;o<t;o++)f();m(),p(1);var k=u(),S=u(),C=l(1);0===C&&p(1),p(1),h()&&(i=u(),s=u(),a=u(),c=u());var w=[1,1];if(h()&&h())switch(d()){case 1:w=[1,1];break;case 2:w=[12,11];break;case 3:w=[10,11];break;case 4:w=[16,11];break;case 5:w=[40,33];break;case 6:w=[24,11];break;case 7:w=[20,11];break;case 8:w=[32,11];break;case 9:w=[80,33];break;case 10:w=[18,11];break;case 11:w=[15,11];break;case 12:w=[64,33];break;case 13:w=[160,99];break;case 14:w=[4,3];break;case 15:w=[3,2];break;case 16:w=[2,1];break;case 255:w=[d()<<8|d(),d()<<8|d()];}return {width:Math.ceil(16*(k+1)-2*i-2*s),height:(2-C)*(S+1)*16-(C?2:4)*(a+c),pixelRatio:w}},e.prototype.parseSPS=function(e){var t=this.readSPS(new Uint8Array(e));this.track.width=t.width,this.track.height=t.height,this.track.sps=[new Uint8Array(e)],this.track.codec="avc1.";for(var n=new DataView(e.buffer,e.byteOffset+1,4),o=0;o<3;++o){var r=n.getUint8(o).toString(16);r.length<2&&(r="0".concat(r)),this.track.codec+=r;}},e.prototype.parsePPS=function(e){this.track.pps=[new Uint8Array(e)];},e}(),oo=function(){function e(e){this.remuxer=null,this.track=null,this.remuxer=e,this.track=e.mp4track;}return Object.defineProperty(e,"samplingRateMap",{get:function(){return [96e3,88200,64e3,48e3,44100,32e3,24e3,22050,16e3,12e3,11025,8e3,7350]},enumerable:false,configurable:true}),e.getHeaderLength=function(e){return 1&e[1]?7:9},e.getFrameLength=function(e){return (3&e[3])<<11|e[4]<<3|(224&e[5])>>>5},e.isAACPattern=function(e){return 255===e[0]&&240==(240&e[1])&&0==(6&e[1])},e.extractAAC=function(t){var n,o=0,r=t.byteLength,i=[];if(!e.isAACPattern(t))return console.error("Invalid ADTS audio format"),i;var s=e.getHeaderLength(t);for(e.aacHeader||(e.aacHeader=t.subarray(0,s));o<r;)n=e.getFrameLength(t),i.push(t.subarray(s,n)),t=t.slice(n),o+=n;return i},e.prototype.setAACConfig=function(){var t,n=new Uint8Array(2),o=e.aacHeader;if(o){var r=1+((192&o[2])>>>6),i=(60&o[2])>>>2;t=(1&o[2])<<2,t|=(192&o[3])>>>6,n[0]=r<<3,n[0]|=(14&i)>>1,n[1]|=(1&i)<<7,n[1]|=t<<3,this.track.codec="mp4a.40.".concat(r),this.track.channelCount=t,this.track.config=n,this.remuxer.readyToDecode=true;}},e}();const ro=function(){function e(e){this.type="",this.listener={},this.type=e;}return e.prototype.on=function(e,t){return this.listener[e]||(this.listener[e]=[]),this.listener[e].push(t),true},e.prototype.off=function(e,t){if(this.listener[e]){var n=this.listener[e].indexOf(t);return n>-1&&this.listener[e].splice(n,1),true}return  false},e.prototype.offAll=function(){this.listener={};},e.prototype.dispatch=function(e,t){return !!this.listener[e]&&(this.listener[e].forEach((function(e){e.apply(null,[t]);})),true)},e}();var io=function(){function e(){}return e.prototype.init=function(){var e;for(e in this.types={avc1:[],avcC:[],hev1:[],hvcC:[],hvc1:[],btrt:[],dinf:[],dref:[],esds:[],ftyp:[],hdlr:[],mdat:[],mdhd:[],mdia:[],mfhd:[],minf:[],moof:[],moov:[],mp4a:[],mvex:[],mvhd:[],sdtp:[],stbl:[],stco:[],stsc:[],stsd:[],stsz:[],stts:[],tfdt:[],tfhd:[],traf:[],trak:[],trun:[],trex:[],tkhd:[],vmhd:[],smhd:[],Opus:[],dOps:[]},this.types)this.types.hasOwnProperty(e)&&(this.types[e]=[e.charCodeAt(0),e.charCodeAt(1),e.charCodeAt(2),e.charCodeAt(3)]);var t=new Uint8Array([0,0,0,0,0,0,0,0,118,105,100,101,0,0,0,0,0,0,0,0,0,0,0,0,86,105,100,101,111,72,97,110,100,108,101,114,0]),n=new Uint8Array([0,0,0,0,0,0,0,0,115,111,117,110,0,0,0,0,0,0,0,0,0,0,0,0,83,111,117,110,100,72,97,110,100,108,101,114,0]);this.HDLR_TYPES={video:t,audio:n};var o=new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,12,117,114,108,32,0,0,0,1]),r=new Uint8Array([0,0,0,0,0,0,0,0]);this.STTS=this.STSC=this.STCO=r,this.STSZ=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0]),this.VMHD=new Uint8Array([0,0,0,1,0,0,0,0,0,0,0,0]),this.SMHD=new Uint8Array([0,0,0,0,0,0,0,0]),this.STSD=new Uint8Array([0,0,0,0,0,0,0,1]);var i=new Uint8Array([105,115,111,109]),s=new Uint8Array([97,118,99,49]),a=new Uint8Array([0,0,0,1]);this.FTYP=this.box(this.types.ftyp,i,a,i,s),this.DINF=this.box(this.types.dinf,this.box(this.types.dref,o));},e.prototype.box=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];for(var o,r=8,i=t.length,s=i;i--;)r+=t[i].byteLength;for((o=new Uint8Array(r))[0]=r>>24&255,o[1]=r>>16&255,o[2]=r>>8&255,o[3]=255&r,o.set(e,4),i=0,r=8;i<s;++i)o.set(t[i],r),r+=t[i].byteLength;return o},e.prototype.hdlr=function(e){return this.box(this.types.hdlr,this.HDLR_TYPES[e])},e.prototype.mdat=function(e){return this.box(this.types.mdat,e)},e.prototype.mdhd=function(e,t){return this.box(this.types.mdhd,new Uint8Array([0,0,0,0,0,0,0,2,0,0,0,3,e>>24&255,e>>16&255,e>>8&255,255&e,t>>>24&255,t>>>16&255,t>>>8&255,255&t,85,196,0,0]))},e.prototype.mdia=function(e){return this.box(this.types.mdia,this.mdhd(e.timescale,e.duration),this.hdlr(e.type),this.minf(e))},e.prototype.mfhd=function(e){return this.box(this.types.mfhd,new Uint8Array([0,0,0,0,e>>24,e>>16&255,e>>8&255,255&e]))},e.prototype.minf=function(e){return "audio"===e.type?this.box(this.types.minf,this.box(this.types.smhd,this.SMHD),this.DINF,this.stbl(e)):this.box(this.types.minf,this.box(this.types.vmhd,this.VMHD),this.DINF,this.stbl(e))},e.prototype.moof=function(e,t,n){return this.box(this.types.moof,this.mfhd(e),this.traf(n,t))},e.prototype.moov=function(e,t,n){for(var o=e.length,r=[];o--;)r[o]=this.trak(e[o]);return this.box.apply(null,[this.types.moov,this.mvhd(n,t)].concat(r).concat(this.mvex(e)))},e.prototype.mvex=function(e){for(var t=e.length,n=[];t--;)n[t]=this.trex(e[t]);return this.box.apply(null,[this.types.mvex].concat(n))},e.prototype.mvhd=function(e,t){var n=new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,2,e>>24&255,e>>16&255,e>>8&255,255&e,t>>>24&255,t>>>16&255,t>>>8&255,255&t,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,255,255,255]);return this.box(this.types.mvhd,n)},e.prototype.sdtp=function(e){var t,n,o=e.samples||[],r=new Uint8Array(4+o.length);for(n=0;n<o.length;n++)t=o[n].flags,r[n+4]=t.dependsOn<<4|t.isDependedOn<<2|t.hasRedundancy;return this.box(this.types.sdtp,r)},e.prototype.stbl=function(e){return this.box(this.types.stbl,this.stsd(e),this.box(this.types.stts,this.STTS),this.box(this.types.stsc,this.STSC),this.box(this.types.stsz,this.STSZ),this.box(this.types.stco,this.STCO))},e.prototype.avc1=function(e){var t,n,o,r=[],i=[];for(t=0;t<e.sps.length;t++)o=(n=e.sps[t]).byteLength,r.push(o>>>8&255),r.push(255&o),r=r.concat(Array.prototype.slice.call(n));for(t=0;t<e.pps.length;t++)o=(n=e.pps[t]).byteLength,i.push(o>>>8&255),i.push(255&o),i=i.concat(Array.prototype.slice.call(n));var s=this.box(this.types.avcC,new Uint8Array([1,r[3],r[4],r[5],255,224|e.sps.length].concat(r).concat([e.pps.length]).concat(i))),a=e.width,c=e.height;return this.box(this.types.avc1,new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,a>>8&255,255&a,c>>8&255,255&c,0,72,0,0,0,72,0,0,0,0,0,0,0,1,18,98,105,110,101,108,112,114,111,46,114,117,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,17,17]),s)},e.prototype.hvc1=function(e){for(var t=e.params,n=[e.vps,e.sps,e.pps],o=new Uint8Array([1,t.general_profile_space<<6|(t.general_tier_flag?32:0)|t.general_profile_idc,t.general_profile_compatibility_flags[0],t.general_profile_compatibility_flags[1],t.general_profile_compatibility_flags[2],t.general_profile_compatibility_flags[3],t.general_constraint_indicator_flags[0],t.general_constraint_indicator_flags[1],t.general_constraint_indicator_flags[2],t.general_constraint_indicator_flags[3],t.general_constraint_indicator_flags[4],t.general_constraint_indicator_flags[5],t.general_level_idc,240|t.min_spatial_segmentation_idc>>8,255&t.min_spatial_segmentation_idc,252|t.parallelismType,252|t.chroma_format_idc,248|t.bit_depth_luma_minus8,248|t.bit_depth_chroma_minus8,0,+t.frame_rate.fps,3|t.temporal_id_nested<<2|t.num_temporal_layers<<3|(t.frame_rate.fixed?64:0),n.length]),r=o.length,i=0;i<n.length;i+=1){r+=3;for(var s=0;s<n[i].length;s+=1)r+=2+n[i][s].length;}var a=new Uint8Array(r);a.set(o,0),r=o.length;var c=n.length-1;for(i=0;i<n.length;i+=1)for(a.set(new Uint8Array([32+i|(i===c?128:0),0,n[i].length]),r),r+=3,s=0;s<n[i].length;s+=1)a.set(new Uint8Array([n[i][s].length>>8,255&n[i][s].length]),r),r+=2,a.set(n[i][s],r),r+=n[i][s].length;var d=this.box(this.types.hvcC,a),l=e.width,u=e.height;return this.box(this.types.hvc1,new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,l>>8&255,255&l,u>>8&255,255&u,0,72,0,0,0,72,0,0,0,0,0,0,0,1,18,100,97,105,108,121,109,111,116,105,111,110,47,104,108,115,46,106,115,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,17,17]),d,this.box(this.types.btrt,new Uint8Array([0,28,156,128,0,45,198,192,0,45,198,192])))},e.prototype.esds=function(e){var t=e.config.byteLength,n=new Uint8Array(26+t+3);return n.set([0,0,0,0,3,23+t,0,1,0,4,15+t,64,21,0,0,0,0,0,0,0,0,0,0,0,5,t]),n.set(e.config,26),n.set([6,1,2],26+t),n},e.prototype.mp4a=function(e){var t=e.audiosamplerate;return this.box(this.types.mp4a,new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,e.channelCount,0,16,0,0,0,0,t>>8&255,255&t,0,0]),this.box(this.types.esds,this.esds(e)))},e.prototype.dOps=function(e){var t=e.outputChannelCount,n=void 0===t?2:t,o=e.preSkip,r=void 0===o?0:o,i=e.inputSampleRate,s=void 0===i?48e3:i,a=e.outputGain,c=void 0===a?0:a,d=e.channelMappingFamily,l=void 0===d?0:d,u=new Uint8Array(19),h=new DataView(u.buffer);return h.setUint8(0,0),h.setUint8(1,n),h.setUint16(2,r,false),h.setUint32(4,s,false),h.setInt16(8,c,false),h.setUint8(10,l),this.box(this.types.dOps,u)},e.prototype.getUint16=function(e){var t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e),t},e.prototype.Opus=function(e){var t=e.channelCount,n=e.config;return this.box(this.types.Opus,new Uint8Array([0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,t,0,16,0,0,0,0,this.getUint16(48e3),0,0]),this.dOps(n))},e.prototype.stsd=function(e){return "opus"===e.codec?this.box(this.types.stsd,this.STSD,this.Opus(e)):"audio"===e.type?this.box(this.types.stsd,this.STSD,this.mp4a(e)):e.codec.includes("hvc1")?this.box(this.types.stsd,this.STSD,this.hvc1(e)):this.box(this.types.stsd,this.STSD,this.avc1(e))},e.prototype.tkhd=function(e){var t=e.id,n=e.duration,o=e.width,r=e.height,i=e.volume;return this.box(this.types.tkhd,new Uint8Array([0,0,0,7,0,0,0,0,0,0,0,0,t>>24&255,t>>16&255,t>>8&255,255&t,0,0,0,0,n>>>24&255,n>>>16&255,n>>>8&255,255&n,0,0,0,0,0,0,0,0,0,0,0,0,i>>0&255,i%1*10>>0&255,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,o>>8&255,255&o,0,0,r>>8&255,255&r,0,0]))},e.prototype.traf=function(e,t){var n=this.sdtp(e),o=e.id;return this.box(this.types.traf,this.box(this.types.tfhd,new Uint8Array([0,0,0,0,o>>24,o>>16&255,o>>8&255,255&o])),this.box(this.types.tfdt,new Uint8Array([0,0,0,0,t>>24,t>>16&255,t>>8&255,255&t])),this.trun(e,n.length+16+16+8+16+8+8),n)},e.prototype.trak=function(e){return "video"===e.type&&(e.duration=e.duration||4294967295),this.box(this.types.trak,this.tkhd(e),this.mdia(e))},e.prototype.trex=function(e){var t=e.id;return this.box(this.types.trex,new Uint8Array([0,0,0,0,t>>24,t>>16&255,t>>8&255,255&t,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1]))},e.prototype.trun=function(e,t){var n,o,r,i,s,a,c=e.samples||[],d=c.length,l=12+16*d,u=new Uint8Array(l);for(t+=8+l,u.set([0,0,15,1,d>>>24&255,d>>>16&255,d>>>8&255,255&d,t>>>24&255,t>>>16&255,t>>>8&255,255&t],0),n=0;n<d;n++)r=(o=c[n]).duration,i=o.size,s=o.flags,a=o.cts,u.set([r>>>24&255,r>>>16&255,r>>>8&255,255&r,i>>>24&255,i>>>16&255,i>>>8&255,255&i,s.isLeading<<2|s.dependsOn,s.isDependedOn<<6|s.hasRedundancy<<4|s.paddingValue<<1|s.isNonSync,61440&s.degradPrio,15&s.degradPrio,a>>>24&255,a>>>16&255,a>>>8&255,255&a],12+16*n);return this.box(this.types.trun,u)},e.prototype.initSegment=function(e,t,n){this.types||this.init();var o=this.moov(e,t,n),r=new Uint8Array(this.FTYP.byteLength+o.byteLength);return r.set(this.FTYP),r.set(o,this.FTYP.byteLength),r},e.prototype.initTypes=function(){this.types||this.init();},e}();const so=new io;var ao=1,co=function(){function e(){this.mp4track={len:0,samples:[]},this.readyToDecode=false,this.samples=[];}return e.getTrackID=function(){return ao++},e.prototype.flush=function(){this.mp4track.len=0,this.mp4track.samples=[];},e.prototype.isReady=function(){return !(!this.readyToDecode||!this.samples.length)||null},e}(),lo=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),uo=function(e){function t(t,n){var o=e.call(this)||this;return o.mp4track={id:co.getTrackID(),type:"audio",channelCount:0,len:0,fragmented:true,timescale:1e3,duration:0,samples:[],config:"",codec:""},o.dts=0,o.readyToDecode=false,o.samples=[],o.nextDts=0,o.aac=new oo(o),o.mp4track.timescale=t,o.mp4track.duration=n,o}return lo(t,e),t.prototype.resetTrack=function(){this.readyToDecode=false,this.mp4track.codec="",this.mp4track.channelCount=0,this.mp4track.config="",this.mp4track.timescale=1e3,this.nextDts=0,this.dts=0;},t.prototype.remux=function(e){if(e.length>0)for(var t=0;t<e.length;t++){var n=e[t],o=n.units,r=o.byteLength;this.samples.push({units:o,size:r,duration:n.duration}),this.mp4track.len+=r,this.readyToDecode||this.aac.setAACConfig();}},t.prototype.getPayload=function(){if(!this.isReady())return null;var e,t,n=new Uint8Array(this.mp4track.len),o=0,r=this.mp4track.samples;for(this.dts=this.nextDts;this.samples.length;){var i=this.samples.shift();i.units,(t=i.duration)<=0?(Xn("remuxer: invalid sample duration at DTS: ".concat(this.nextDts," :").concat(t)),this.mp4track.len-=i.size):(this.nextDts+=t,e={size:i.size,duration:t,cts:0,flags:{isLeading:0,isDependedOn:0,hasRedundancy:0,degradPrio:0,dependsOn:1}},n.set(i.units,o),o+=i.size,r.push(e));}return r.length?new Uint8Array(n.buffer,0,this.mp4track.len):null},t.prototype.getAacParser=function(){return this.aac},t}(co),ho=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),po=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},fo=function(e){function t(t,n){var o=e.call(this)||this;return o.mp4track={id:co.getTrackID(),type:"video",len:0,fragmented:true,sps:null,pps:null,codec:"",fps:30,width:0,height:0,timescale:1e3,duration:0,samples:[]},o.readyToDecode=false,o.dts=0,o.samples=[],o.nextDts=0,o.h264Parser=new no(o),o.mp4track.timescale=t,o.mp4track.duration=n,o}return ho(t,e),t.prototype.resetTrack=function(){this.readyToDecode=false,this.mp4track.sps=null,this.mp4track.pps=null,this.nextDts=0,this.dts=0;},t.prototype.remux=function(e){var t,n,o,r;try{for(var i=po(e),s=i.next();!s.done;s=i.next()){var a=s.value,c=0,d=a.units,l=a.keyFrame,u=a.duration,h=a.compositionTimeOffset;try{for(var p=(o=void 0,po(a.units)),f=p.next();!f.done;f=p.next()){var m=f.value;this.h264Parser.parseNAL(m)&&(c+=m.getSize());}}catch(e){o={error:e};}finally{try{f&&!f.done&&(r=p.return)&&r.call(p);}finally{if(o)throw o.error}}d.length>0&&this.readyToDecode&&(this.mp4track.len+=c,this.samples.push({units:d,size:c,keyFrame:l,duration:u,compositionTimeOffset:h}));}}catch(e){t={error:e};}finally{try{s&&!s.done&&(n=i.return)&&n.call(i);}finally{if(t)throw t.error}}},t.prototype.getPayload=function(){var e,t;if(!this.isReady())return null;var n=new Uint8Array(this.mp4track.len),o=0;for(this.dts=this.nextDts;this.samples.length;){var r=this.samples.shift(),i=r.units,s=r.size,a=r.duration,c=r.compositionTimeOffset,d=r.keyFrame;if(a<=0)Xn("remuxer: invalid sample duration at DTS: ".concat(this.nextDts," :").concat(a)),this.mp4track.len-=s;else {this.nextDts+=a;var l={size:s,duration:a,cts:c||0,flags:{isLeading:0,isDependedOn:0,hasRedundancy:0,degradPrio:0,isNonSync:d?0:1,dependsOn:d?2:1}};try{for(var u=(e=void 0,po(i)),h=u.next();!h.done;h=u.next()){var p=h.value;n.set(p.getData(),o),o+=p.getSize();}}catch(t){e={error:t};}finally{try{h&&!h.done&&(t=u.return)&&t.call(u);}finally{if(e)throw e.error}}this.mp4track.samples.push(l);}}return this.mp4track.samples.length?new Uint8Array(n.buffer,0,this.mp4track.len):null},t}(co),mo=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),vo=function(e){function t(){var t=null!==e&&e.apply(this,arguments)||this;return t.mp4track={id:co.getTrackID(),type:"audio",channelCount:2,len:0,timescale:48e3,duration:960,sampleRate:48e3,samples:[],config:{},codec:"opus"},t.dts=0,t.readyToDecode=false,t.samples=[],t.nextDts=0,t}return mo(t,e),t.prototype.resetTrack=function(){this.readyToDecode=false,this.nextDts=0,this.dts=0;},t.prototype.remux=function(e){var t,n;try{for(var o=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}(e),r=o.next();!r.done;r=o.next()){var i=r.value,s=i.unit,a=i.duration,c=s.byteLength;this.samples.push({units:s,size:c,duration:a}),this.mp4track.len+=c,this.readyToDecode||(this.readyToDecode=!0);}}catch(e){t={error:e};}finally{try{r&&!r.done&&(n=o.return)&&n.call(o);}finally{if(t)throw t.error}}},t.prototype.getPayload=function(){if(!this.isReady())return null;var e=new Uint8Array(this.mp4track.len),t=0,n=this.mp4track.samples;for(this.dts=this.nextDts;this.samples.length;){var o=this.samples.shift(),r=o.duration,i=o.units,s=o.size;this.nextDts+=r;var a={size:s,duration:r,cts:0,flags:{isLeading:0,isDependedOn:0,hasRedundancy:0,degradPrio:0,dependsOn:1}};e.set(i,t),t+=s,n.push(a);}return n.length?new Uint8Array(e.buffer,0,this.mp4track.len):null},t}(co),go="mp4a.40.2",yo="opus",bo=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},ko=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},So=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},Co=function(){function e(e){var t=e.name,n=e.contents,o=void 0===n?[]:n,r=e.children,i=void 0===r?[]:r;this._name=null,this._contents=null,this._children=null,this._name=t,this._contents=o,this._children=i;}return e.stringToByteArray=function(e){return ko([],bo(e),false).map((function(e){return e.charCodeAt(0)}))},e.getFloat64=function(e){var t=new Uint8Array(8);return new DataView(t.buffer).setFloat64(0,e),t},e.getUint64=function(e){var t=new Uint8Array(8);return new DataView(t.buffer).setBigUint64(0,BigInt(e)),t},e.getUint32=function(e){var t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e),t},e.getUint16=function(e){var t=new Uint8Array(2);return new DataView(t.buffer).setUint16(0,e),t},e.getInt16=function(e){var t=new Uint8Array(2);return new DataView(t.buffer).setInt16(0,e),t},e.flatten=function(t){var n,o,r,i,s,a;return function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}}(this,(function(c){switch(c.label){case 0:c.trys.push([0,7,8,9]),n=So(t),o=n.next(),c.label=1;case 1:return o.done?[3,6]:(r=o.value,Array.isArray(r)?[5,So(e.flatten(r))]:[3,3]);case 2:return c.sent(),[3,5];case 3:return [4,r];case 4:c.sent(),c.label=5;case 5:return o=n.next(),[3,1];case 6:return [3,9];case 7:return i=c.sent(),s={error:i},[3,9];case 8:try{o&&!o.done&&(a=n.return)&&a.call(n);}finally{if(s)throw s.error}return [7];case 9:return [2]}}))},Object.defineProperty(e.prototype,"contents",{get:function(){var t,n,o=new Uint8Array(this.length),r=this.buildContents(),i=0;try{for(var s=So(e.flatten(r)),a=s.next();!a.done;a=s.next()){var c=a.value;"object"!=typeof c?(o[i]=c,i++):(o.set(c,i),i+=c.length);}}catch(e){t={error:e};}finally{try{a&&!a.done&&(n=s.return)&&n.call(s);}finally{if(t)throw t.error}}return o},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"length",{get:function(){return this.buildLength()},enumerable:false,configurable:true}),e.prototype.buildContents=function(){return ko([this._contents],bo(this._children.map((function(e){return e.buildContents()}))),false)},e.prototype.buildLength=function(){return (Array.isArray(this._contents)?this._contents.reduce((function(e,t){return e+(void 0===t.length?1:t.length)}),0):void 0===this._contents.length?1:this._contents.length)+this._children.reduce((function(e,t){return e+t.length}),0)},e.prototype.addChild=function(e){this._children.push(e);},e}();const wo=Co;var To=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Eo=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},_o=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},Ro=function(e){function t(t,n){var o=void 0===n?{}:n,r=o.contents,i=o.children;return e.call(this,{name:t,contents:r,children:i})||this}return To(t,e),t.prototype.buildContents=function(){return _o(_o(_o([],Eo(this._lengthBytes),false),Eo(wo.stringToByteArray(this._name)),false),Eo(e.prototype.buildContents.call(this)),false)},t.prototype.buildLength=function(){return this._length||(this._length=4+this._name.length+e.prototype.buildLength.call(this),this._lengthBytes=wo.getUint32(this._length)),this._length},t}(wo);const Mo=Ro;var Do=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Io=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},Po=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},xo=function(e){function t(t,n){var o=void 0===n?{}:n,r=o.contents,i=o.tags;return e.call(this,{name:t,contents:r,children:i})||this}return Do(t,e),t.getLength=function(e){var t=wo.getUint32(e);return t.every((function(e,t,n){return 0===e&&(n[t]=128,true)})),t},t.prototype.buildContents=function(){return Po(Po([this._name],Io(this._lengthBytes),false),Io(e.prototype.buildContents.call(this)),false)},t.prototype.buildLength=function(){if(!this._length){var n=e.prototype.buildLength.call(this);this._lengthBytes=t.getLength(n),this._length=1+n+this._lengthBytes.length;}return this._length},t.prototype.addTag=function(e){this.addChild(e);},t}(wo);const Oo=xo;var Ao=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},Lo=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},Go=function(){function e(e){this.codec="opus",this.codec=e;}return e.prototype.getInitializationSegment=function(e){var t=e.header;return new wo({children:[new Mo("ftyp",{contents:[Mo.stringToByteArray("iso5"),0,0,2,0,Mo.stringToByteArray("iso6mp41")]}),new Mo("moov",{children:[new Mo("mvhd",{contents:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,232,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2]}),new Mo("trak",{children:[new Mo("tkhd",{contents:[0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,0,0,0,0,0,0,0,0,0,0,0]}),new Mo("mdia",{children:[new Mo("mdhd",{contents:[0,0,0,0,0,0,0,0,0,0,0,0,Mo.getUint32(t.sampleRate),0,0,0,0,85,196,0,0]}),new Mo("hdlr",{contents:[0,0,0,0,Mo.stringToByteArray("mhlr"),Mo.stringToByteArray("soun"),0,0,0,0,0,0,0,0,0,0,0,0,0]}),new Mo("minf",{children:[new Mo("stbl",{children:[new Mo("stsd",{contents:[0,0,0,0,0,0,0,1],children:[this.getCodecBox(t)]}),new Mo("stts",{contents:[0,0,0,0,0,0,0,0]}),new Mo("stsc",{contents:[0,0,0,0,0,0,0,0]}),new Mo("stsz",{contents:[0,0,0,0,0,0,0,0,0,0,0,0]}),new Mo("stco",{contents:[0,0,0,0,0,0,0,0]})]})]})]})]}),new Mo("mvex",{children:[new Mo("trex",{contents:[0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0]})]})]})]}).contents},e.prototype.getMediaSegment=function(e){var t=e.frames,n=e.sequenceNumber,o=e.baseMediaDecodeTime,r=e.track.samples,i=Ao(r,1)[0],s=i.flags,a=i.duration,c=i.size,d=i.cts,l=function(){var e,t,n=new Uint8Array(4+r.length);for(t=0;t<r.length;t++)e=r[t].flags,n[t+4]=e.dependsOn<<4|e.isDependedOn<<2|e.hasRedundancy;return new Mo("sdtp",{contents:n})}();return new wo({children:[new Mo("moof",{children:[new Mo("mfhd",{contents:[0,0,0,0,n>>24,n>>16&255,n>>8&255,255&n]}),new Mo("traf",{children:[new Mo("tfhd",{contents:[0,2,0,0,0,0,0,1]}),new Mo("tfdt",{contents:[0,0,0,0,Mo.getUint32(o)]}),new Mo("trun",{contents:[0,0,15,1,Mo.getUint32(t.length),Mo.getUint32(92+l.length+16*t.length),Mo.getUint32(a),Mo.getUint32(c),s.isLeading<<2|s.dependsOn,s.isDependedOn<<6|s.hasRedundancy<<4|s.paddingValue<<1|s.isNonSync,61440&s.degradPrio,15&s.degradPrio,Mo.getUint32(d)]}),l]})]}),new Mo("mdat",{contents:this.getFrameData(t)})]}).contents},e.prototype.getCodecBox=function(e){switch(this.codec){case "mp3":return this.getMp4a(e,107);case go:return this.getMp4a(e,64);case yo:return this.getOpus(e);case "flac":return this.getFlaC(e)}},e.prototype.getOpus=function(e){var t=e.sampleRate,n=void 0===t?48e3:t,o=e.channels,r=void 0===o?2:o,i=e.bitDepth,s=void 0===i?16:i,a=e.preSkip,c=void 0===a?0:a,d=e.inputSampleRate,l=void 0===d?48e3:d,u=e.outputGain,h=void 0===u?0:u,p=e.channelMappingFamily,f=void 0===p?0:p,m=e.streamCount,v=void 0===m?0:m,g=e.coupledStreamCount,y=void 0===g?0:g,b=e.channelMappingTable,k=void 0===b?0:b;return new Mo("Opus",{contents:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,r,0,s,0,0,0,0,Mo.getUint16(n),0,0],children:[new Mo("dOps",{contents:[0,r,Mo.getUint16(c),Mo.getUint32(l),Mo.getInt16(h),f,0!==f?[v,y,k]:[]]})]})},e.prototype.getFlaC=function(e){return new Mo("fLaC",{contents:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,e.channels,0,e.bitDepth,0,0,0,0,Mo.getUint16(e.sampleRate),0,0],children:[new Mo("dfLa",{contents:Lo([0,0,0,0],Ao(e.streamInfo||[128,0,0,34,Mo.getUint16(e.blockSize),Mo.getUint16(e.blockSize),0,0,0,0,0,0,Mo.getUint32(e.sampleRate<<12|e.channels<<8|e.bitDepth-1<<4),0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),false)})]})},e.prototype.getMp4a=function(e,t){var n=new Oo(4,{contents:[t,21,0,0,0,0,0,0,0,0,0,0,0]});return 64===t&&n.addTag(new Oo(5,{contents:e.audioSpecificConfig})),new Mo("mp4a",{contents:[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,e.channels,0,16,0,0,0,0,Mo.getUint16(e.sampleRate),0,0],children:[new Mo("esds",{contents:[0,0,0,0],children:[new Oo(3,{contents:[0,1,0],tags:[n,new Oo(6,{contents:2})]})]})]})},e.prototype.getSamplesPerFrame=function(e){return this.codec===go?e.map((function(e){var t=e.data,n=e.header;return Mo.getUint32(t.length-n.length)})):e.map((function(e){var t=e.data;return Mo.getUint32(t.length)}))},e.prototype.getFrameData=function(e){return this.codec===go?e.map((function(e){var t=e.data,n=e.header;return t.subarray(n.length)})):e.map((function(e){return e.data}))},e}(),Bo=new Go(yo),jo=function(){function e(t){this.stype=null,this.isfmb=false,this.isvcl=null,this.payload=null,this.ntype=null,this.payload=t,this.ntype=this.payload[0]>>1&63,this.isvcl=this.ntype===e.NDR||this.ntype===e.IDR;}return Object.defineProperty(e,"NDR",{get:function(){return 1},enumerable:false,configurable:true}),Object.defineProperty(e,"IDR",{get:function(){return 19},enumerable:false,configurable:true}),Object.defineProperty(e,"VPS",{get:function(){return 32},enumerable:false,configurable:true}),Object.defineProperty(e,"SPS",{get:function(){return 33},enumerable:false,configurable:true}),Object.defineProperty(e,"PPS",{get:function(){return 34},enumerable:false,configurable:true}),e.prototype.type=function(){return this.ntype},e.prototype.isKeyframe=function(){return this.ntype===e.IDR},e.prototype.getPayload=function(){return this.payload},e.prototype.getPayloadSize=function(){return this.payload.byteLength},e.prototype.getSize=function(){return 4+this.getPayloadSize()},e.prototype.getData=function(){var e=new Uint8Array(this.getSize());return new DataView(e.buffer).setUint32(0,this.getSize()-4),e.set(this.getPayload(),4),e},e}(),Fo=function(){return Fo=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Fo.apply(this,arguments)},No=function(){function e(e){this.remuxer=null,this.track=null,this.remuxer=e,this.track=e.mp4track;}return e.parseHeader=function(e){var t=new to(e.getPayload());t.readUByte(),e.isfmb=0===t.readUEG(),e.stype=t.readUEG();},e.prototype.parseNAL=function(e){if(!e)return  false;var t=false;switch(e.type()){case jo.IDR:case jo.NDR:t=true;break;case jo.PPS:this.track.pps||(this.parsePPS(e.getPayload()),!this.remuxer.readyToDecode&&this.track.pps&&this.track.sps&&this.track.vps&&(this.remuxer.readyToDecode=true)),t=true;break;case jo.SPS:this.track.sps||(this.parseSPS(e.getPayload()),!this.remuxer.readyToDecode&&this.track.pps&&this.track.sps&&this.track.vps&&(this.remuxer.readyToDecode=true)),t=true;break;case jo.VPS:this.track.sps||(this.parseVPS(e.getPayload()),!this.remuxer.readyToDecode&&this.track.pps&&this.track.sps&&this.track.vps&&(this.remuxer.readyToDecode=true)),t=true;}return t},e.prototype.ebsp2rbsp=function(e){for(var t=new Uint8Array(e.byteLength),n=0,o=0;o<e.byteLength;o++)o>=2&&3===e[o]&&0===e[o-1]&&0===e[o-2]||(t[n]=e[o],n++);return new Uint8Array(t.buffer,0,n)},e.prototype.skipScalingList=function(e,t){for(var n=8,o=8,r=0;r<t;r++)0!==o&&(o=(n+e.readEG()+256)%256),n=0===o?n:o;},e.prototype.readVPS=function(e){var t=new to(e);return t.readUByte(),t.readUByte(),t.readBits(4),t.skipBits(2),t.readBits(6),{numTemporalLayers:t.readBits(3)+1,temporalIdNested:t.readBoolean()}},e.prototype.readSPS=function(e){var t=new to(this.ebsp2rbsp(e));t.readUByte(),t.readUByte(),t.readBits(4);var n=t.readBits(3);t.readBoolean();for(var o=t.readBits(2),r=t.readBoolean(),i=t.readBits(5),s=t.readUByte(),a=t.readUByte(),c=t.readUByte(),d=t.readUByte(),l=t.readUByte(),u=t.readUByte(),h=t.readUByte(),p=t.readUByte(),f=t.readUByte(),m=t.readUByte(),v=t.readUByte(),g=[],y=[],b=0;b<n;b++)g.push(t.readBoolean()),y.push(t.readBoolean());if(n>0)for(b=n;b<8;b++)t.readBits(2);for(b=0;b<n;b++)g[b]&&(t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte(),t.readUByte()),y[b]&&t.readUByte();t.readUEG();var k=t.readUEG();3===k&&t.skipBits(1);var S=t.readUEG(),C=t.readUEG(),w=t.readBoolean(),T=0,E=0,_=0,R=0;w&&(T+=t.readUEG(),E+=t.readUEG(),_+=t.readUEG(),R+=t.readUEG());var M=t.readUEG(),D=t.readUEG(),I=t.readUEG();for(b=t.readBoolean()?0:n;b<=n;b++)t.skipUEG(),t.skipUEG(),t.skipUEG();if(t.skipUEG(),t.skipUEG(),t.skipUEG(),t.skipUEG(),t.skipUEG(),t.skipUEG(),t.readBoolean()&&t.readBoolean())for(var P=0;P<4;P++)for(var x=0;x<(3===P?2:6);x++)if(t.readBoolean()){var O=Math.min(64,1<<4+(P<<1));for(P>1&&t.readEG(),b=0;b<O;b++)t.readEG();}else t.readUEG();t.readBoolean(),t.readBoolean(),t.readBoolean()&&(t.readUByte(),t.skipUEG(),t.skipUEG(),t.readBoolean());var A=t.readUEG(),L=0;for(b=0;b<A;b++){var G=false;if(0!==b&&(G=t.readBoolean()),G){b===A&&t.readUEG(),t.readBoolean(),t.readUEG();for(var B=0,j=0;j<=L;j++){var F=t.readBoolean(),N=false;F||(N=t.readBoolean()),(F||N)&&B++;}L=B;}else {var W=t.readUEG(),U=t.readUEG();for(L=W+U,j=0;j<W;j++)t.readUEG(),t.readBoolean();for(j=0;j<U;j++)t.readUEG(),t.readBoolean();}}if(t.readBoolean()){var q=t.readUEG();for(b=0;b<q;b++){for(j=0;j<I+4;j++)t.readBits(1);t.readBits(1);}}var V=0,H=1,K=1,z=true,$=1,Y=0;t.readBoolean(),t.readBoolean();var X=false;if(t.readBoolean()){if(t.readBoolean()){var J=t.readUByte();J>0&&J<16?(H=[1,12,10,16,40,24,20,32,80,18,15,64,160,4,3,2][J-1],K=[1,11,11,11,33,11,11,11,33,11,11,33,99,3,2,1][J-1]):255===J&&(H=t.readBits(16),K=t.readBits(16));}if(t.readBoolean()&&t.readBoolean(),t.readBoolean()&&(t.readBits(3),t.readBoolean(),t.readBoolean()&&(t.readUByte(),t.readUByte(),t.readUByte())),t.readBoolean()&&(t.readUEG(),t.readUEG()),t.readBoolean(),t.readBoolean(),t.readBoolean(),(X=t.readBoolean())&&(T+=t.readUEG(),E+=t.readUEG(),_+=t.readUEG(),R+=t.readUEG()),t.readBoolean()&&($=t.readBits(32),Y=t.readBits(32),t.readBoolean()&&t.readUEG(),t.readBoolean())){var Q=t.readBoolean(),Z=t.readBoolean(),ee=false;for((Q||Z)&&((ee=t.readBoolean())&&(t.readUByte(),t.readBits(5),t.readBoolean(),t.readBits(5)),t.readBits(4),t.readBits(4),ee&&t.readBits(4),t.readBits(5),t.readBits(5),t.readBits(5)),b=0;b<=n;b++){var te=false;(z=t.readBoolean())||t.readBoolean()?t.readEG():te=t.readBoolean();var ne=te?1:t.readUEG()+1;if(Q)for(j=0;j<ne;j++)t.readUEG(),t.readUEG(),ee&&(t.readUEG(),t.readUEG()),t.skipBits(1);if(Z)for(j=0;j<ne;j++)t.readUEG(),t.readUEG(),ee&&(t.readUEG(),t.readUEG()),t.skipBits(1);}}t.readBoolean()&&(t.readBoolean(),t.readBoolean(),t.readBoolean(),V=t.readUEG());}var oe=S,re=C;if(w||X){var ie=1,se=1;1===k?ie=se=2:2===k&&(ie=2),oe=S-ie*E-ie*T,re=C-se*R-se*_;}var ae=o?["A","B","C"][o]:"",ce=s<<24|a<<16|c<<8|d,de=0;for(b=0;b<32;b++)de=(de|(ce>>b&1)<<31-b)>>>0;var le=de.toString(16);1===i&&"2"===le&&(le="6");var ue=r?"H":"L";return {codecString:"hvc1.".concat(ae).concat(i,".").concat(le,".").concat(ue).concat(v,".B0"),params:{general_tier_flag:r,general_profile_idc:i,general_profile_space:o,general_profile_compatibility_flags:[s,a,c,d],general_constraint_indicator_flags:[l,u,h,p,f,m],general_level_idc:v,bit_depth:M+8,bit_depth_luma_minus8:M,bit_depth_chroma_minus8:D,min_spatial_segmentation_idc:V,chroma_format_idc:k,frame_rate:{fixed:z,fps:Y/$}},width:oe,height:re,pixelRatio:[H,K]}},e.prototype.readPPS=function(e){var t=new to(this.ebsp2rbsp(e));t.readUByte(),t.readUByte(),t.skipUEG(),t.skipUEG(),t.skipBits(2),t.skipBits(3),t.skipBits(2),t.skipUEG(),t.skipUEG(),t.skipEG(),t.skipBits(2),t.readBoolean()&&t.skipUEG(),t.skipEG(),t.skipEG(),t.skipBits(4);var n=t.readBoolean(),o=t.readBoolean(),r=1;return o&&n?r=0:o?r=3:n&&(r=2),{parallelismType:r}},e.prototype.parseSPS=function(e){var t=this.readSPS(e);this.track.width=t.width,this.track.height=t.height,this.track.pixelRatio=t.pixelRatio,this.track.codec=t.codecString,this.track.params=Fo(Fo({},this.track.params),t.params),this.track.sps=[new Uint8Array(e)],console.log("resolution",this.track.width,this.track.height);},e.prototype.parsePPS=function(e){var t=this.readPPS(e);this.track.params=Fo(Fo({},this.track.params),t),this.track.pps=[new Uint8Array(e)];},e.prototype.parseVPS=function(e){this.track.params=Fo(Fo({},this.track.params),this.readVPS(e)),this.track.vps=[new Uint8Array(e)];},e}(),Wo=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Uo=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},qo=function(e){function t(t,n){var o=e.call(this)||this;return o.mp4track={id:co.getTrackID(),type:"video",len:0,fragmented:true,vps:null,sps:null,pps:null,codec:"hvc1.1.6.L150.B0",fps:30,pixelRatio:[0,0],params:{},width:0,height:0,timescale:1e3,duration:0,samples:[]},o.readyToDecode=false,o.dts=0,o.samples=[],o.nextDts=0,o.h265=new No(o),o.mp4track.timescale=t,o.mp4track.duration=n,o}return Wo(t,e),t.prototype.resetTrack=function(){this.readyToDecode=false,this.mp4track.sps=null,this.mp4track.pps=null,this.mp4track.vps=null,this.mp4track.params={},this.nextDts=0,this.dts=0;},t.prototype.remux=function(e){var t,n,o,r;try{for(var i=Uo(e),s=i.next();!s.done;s=i.next()){var a=s.value,c=0,d=a.units,l=a.keyFrame,u=a.duration,h=a.compositionTimeOffset;try{for(var p=(o=void 0,Uo(a.units)),f=p.next();!f.done;f=p.next()){var m=f.value;this.h265.parseNAL(m)&&(c+=m.getSize());}}catch(e){o={error:e};}finally{try{f&&!f.done&&(r=p.return)&&r.call(p);}finally{if(o)throw o.error}}d.length>0&&this.readyToDecode&&(this.mp4track.len+=c,this.samples.push({units:d,size:c,keyFrame:l,duration:u,compositionTimeOffset:h}));}}catch(e){t={error:e};}finally{try{s&&!s.done&&(n=i.return)&&n.call(i);}finally{if(t)throw t.error}}},t.prototype.getPayload=function(){var e,t;if(!this.isReady())return null;var n=new Uint8Array(this.mp4track.len),o=0;for(this.dts=this.nextDts;this.samples.length;){var r=this.samples.shift(),i=r.units,s=r.size,a=r.duration,c=r.compositionTimeOffset,d=r.keyFrame;if(a<=0)Xn("remuxer: invalid sample duration at DTS: ".concat(this.nextDts," :").concat(a)),this.mp4track.len-=s;else {this.nextDts+=a;var l={size:s,duration:a,cts:c||0,flags:{isLeading:0,isDependedOn:0,hasRedundancy:0,degradPrio:0,isNonSync:d?0:1,dependsOn:d?2:1}};try{for(var u=(e=void 0,Uo(i)),h=u.next();!h.done;h=u.next()){var p=h.value;n.set(p.getData(),o),o+=p.getSize();}}catch(t){e={error:t};}finally{try{h&&!h.done&&(t=u.return)&&t.call(u);}finally{if(e)throw e.error}}this.mp4track.samples.push(l);}}return this.mp4track.samples.length?new Uint8Array(n.buffer,0,this.mp4track.len):null},t}(co),Vo=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Ho=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},Ko=function(e){function t(){var t=e.call(this,"remuxer")||this;return t.tracks={},t.initialized=false,t.trackTypes=[],t.videoSeq=1,t.audioSeq=1,t.timescale=1e3,t.mediaDuration=0,t.opusConfig={sampleRate:48e3,channels:2,bitDepth:16,duration:960},t}return Vo(t,e),t.prototype.addTrack=function(e,t){var n=(void 0===t?{}:t).config;if("avc"===e&&(this.tracks.avc=new fo(this.timescale,this.mediaDuration),this.trackTypes.push("avc")),"hevc"===e&&(this.tracks.hevc=new qo(this.timescale,this.mediaDuration),this.trackTypes.push("hevc")),"aac"===e){var o=new uo(this.timescale,this.mediaDuration);this.tracks.aac=o,this.trackTypes.push("aac");}"opus"===e&&(this.tracks.opus=new vo,this.trackTypes.push("opus"),this.opusConfig=n);},t.prototype.reset=function(){var e,t;try{for(var n=Ho(this.trackTypes),o=n.next();!o.done;o=n.next()){var r=o.value;this.tracks[r].resetTrack();}}catch(t){e={error:t};}finally{try{o&&!o.done&&(t=n.return)&&t.call(n);}finally{if(e)throw e.error}}this.initialized=false;},t.prototype.destroy=function(){this.tracks={},this.offAll();},t.prototype.isReady=function(){var e,t;try{for(var n=Ho(this.trackTypes),o=n.next();!o.done;o=n.next()){var r=o.value;if(!this.tracks[r].readyToDecode||!this.tracks[r].samples.length)return !1}}catch(t){e={error:t};}finally{try{o&&!o.done&&(t=n.return)&&t.call(n);}finally{if(e)throw e.error}}return  true},t.prototype.remux=function(e){var t=e.avc,n=e.hevc,o=e.aac,r=e.opus;(null==t?void 0:t.length)>0&&this.tracks.avc.remux(t),(null==n?void 0:n.length)>0&&this.tracks.hevc.remux(n),(null==o?void 0:o.length)>0&&this.tracks.aac.remux(o),(null==r?void 0:r.length)>0&&this.tracks.opus.remux(r),this.flush(Object.keys(e));},t.prototype.flush=function(e){if(this.initialized){var t,n;if(e.includes("opus")&&(null==(n=(t=this.tracks.opus).getPayload())?void 0:n.byteLength)){var o={type:"opus",payload:Bo.getMediaSegment({frames:[{data:n}],sequenceNumber:this.audioSeq,baseMediaDecodeTime:t.dts,track:t.mp4track}),dts:t.dts};this.dispatch("buffer",o),t.flush(),this.audioSeq=this.audioSeq+1;}e.includes("avc")&&(null==(n=(t=this.tracks.avc).getPayload())?void 0:n.byteLength)&&(o={type:"avc",payload:Zn(so.moof(this.videoSeq,t.dts,t.mp4track),so.mdat(n)),dts:t.dts,fps:t.mp4track.fps},this.dispatch("buffer",o),t.flush(),this.videoSeq=this.videoSeq+1),e.includes("hevc")&&(null==(n=(t=this.tracks.hevc).getPayload())?void 0:n.byteLength)&&(o={type:"hevc",payload:Zn(so.moof(this.videoSeq,t.dts,t.mp4track),so.mdat(n)),dts:t.dts,fps:t.mp4track.fps},this.dispatch("buffer",o),t.flush(),this.videoSeq=this.videoSeq+1);}else this.isReady()&&(this.dispatch("ready"),this.initSegment(),this.initialized=true,this.flush(e));},t.prototype.initSegment=function(){var e,t;try{for(var n=Ho(this.trackTypes),o=n.next();!o.done;o=n.next()){var r=o.value,i=null;if("avc"===r&&(so.initTypes(),i=so.initSegment([this.tracks.avc.mp4track],this.mediaDuration,this.timescale)),"hevc"===r&&(so.initTypes(),i=so.initSegment([this.tracks.hevc.mp4track],this.mediaDuration,this.timescale)),"opus"===r){var s=this.opusConfig,a=s.sampleRate,c=s.channels,d=s.bitDepth;s.duration,i=Bo.getInitializationSegment({header:{sampleRate:a,channels:c,bitDepth:d,preSkip:3840,inputSampleRate:a,outputGain:0,channelMappingFamily:0}});}var l={type:r,payload:i,eventType:"init"};this.dispatch("buffer",l);}}catch(t){e={error:t};}finally{try{o&&!o.done&&(t=n.return)&&t.call(n);}finally{if(e)throw e.error}}},t}(ro);const zo=Ko;var $o=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Yo=function(e){function t(t,n){var o=e.call(this,"buffer")||this;return o.bufferType=null,o.queue=new Uint8Array,o.cleaning=false,o.pendingCleaning=0,o.cleanOffset=10,o.cleanRanges=[],o.sourceBuffer=null,o.needDestroyBuffer=false,o.bufferType=n,o.sourceBuffer=t,o.sourceBuffer.addEventListener("updateend",(function(){o.pendingCleaning>0&&(o.initCleanup(o.pendingCleaning),o.pendingCleaning=0),o.cleaning=false,o.cleanRanges.length?o.doCleanup():o.needDestroyBuffer&&(o.destroyBuffer(),o.needDestroyBuffer=false);})),o.sourceBuffer.addEventListener("error",(function(e){Xn("sourceBuffer on error",e),o.dispatch("error",{type:o.bufferType,name:"buffer",error:"buffer error"});})),o}return $o(t,e),t.prototype.destroy=function(){this.sourceBuffer.updating?this.needDestroyBuffer=true:this.destroyBuffer(),this.queue=null,this.sourceBuffer=null,this.offAll();},t.prototype.destroyBuffer=function(){var e;if((null===(e=this.sourceBuffer.buffered)||void 0===e?void 0:e.length)&&!this.cleaning)for(var t=0;t<this.sourceBuffer.buffered.length;++t){var n=this.sourceBuffer.buffered.start(t),o=this.sourceBuffer.buffered.end(t);this.sourceBuffer.remove(n,o);}},t.prototype.doCleanup=function(){if(this.cleanRanges.length){var e=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s}(this.cleanRanges.shift(),2),t=e[0],n=e[1];Xn("".concat(this.bufferType," remove range [").concat(t," - ").concat(n,")")),this.cleaning=true,this.sourceBuffer.remove(t,n);}else this.cleaning=false;},t.prototype.initCleanup=function(e){var t;try{if(this.sourceBuffer.updating)return void(this.pendingCleaning=e);if((null===(t=this.sourceBuffer.buffered)||void 0===t?void 0:t.length)&&!this.cleaning){for(var n=0;n<this.sourceBuffer.buffered.length;++n){var o=this.sourceBuffer.buffered.start(n),r=this.sourceBuffer.buffered.end(n);e-o>this.cleanOffset&&o<(r=e-this.cleanOffset)&&this.cleanRanges.push([o,r]);}this.doCleanup();}}catch(e){Jn("Error occured while cleaning ".concat(this.bufferType," buffer - ").concat(e.name,": ").concat(e.message));}},t.prototype.doAppend=function(){if(this.queue.length&&this.sourceBuffer&&!this.sourceBuffer.updating)try{this.sourceBuffer.appendBuffer(this.queue),this.queue=new Uint8Array;}catch(t){var e="unexpectedError";Xn("doAppend error, ",t,t.name),"QuotaExceededError"===t.name?(Xn("".concat(this.bufferType," buffer quota full")),e="QuotaExceeded"):(Jn("Error occured while appending ".concat(this.bufferType," buffer - ").concat(t.name,": ").concat(t.message)),e="InvalidStateError"),this.dispatch("error",{type:this.bufferType,name:e,error:"buffer error"});}},t.prototype.feed=function(e){this.queue=Zn(this.queue,e),this.doAppend();},t}(ro);const Xo=Yo;var Jo=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Qo=function(){return Qo=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Qo.apply(this,arguments)},Zo=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},er=function(e){function t(t){var n,o,r,i=this;return (i=e.call(this,"muxer")||this).isMSESupported=null,i.node=null,i.mseReady=null,i.mseEnded=null,i.videoStarted=null,i.interval=null,i.mediaSource=null,i.url=null,i.options={node:"",mode:null,flushingTime:0,maxDelay:100,clearBuffer:true,fps:30,readFpsFromTrack:false,debug:false,opusConfig:{SampleRate:48e3,SampleFormat:16,Channels:2,PcmFrameSize:960},onReady:lt,onData:lt,onError:lt,onMissingVideoFrames:lt,onMissingAudioFrames:lt,onEvent:lt},i.isReset=false,i.frameDuration=1e3/i.options.fps|0,i.remuxController=null,i.bufferControllers=null,i.lastCleaningTime=null,i.kfPosition=null,i.kfCounter=null,i.options=Qo(Qo({},i.options),t),i.options.debug&&(Kn=console.log,zn=console.error),i.frameDuration=1e3/i.options.fps|0,i.remuxController=new zo,(null===(n=i.options.mode)||void 0===n?void 0:n.avc)&&i.remuxController.addTrack("avc"),(null===(o=i.options.mode)||void 0===o?void 0:o.hevc)&&i.remuxController.addTrack("hevc"),(null===(r=i.options.mode)||void 0===r?void 0:r.opus)&&i.remuxController.addTrack("opus",{config:{sampleRate:i.options.opusConfig.SampleRate,channels:i.options.opusConfig.Channels,bitDepth:i.options.opusConfig.SampleFormat,duration:i.options.opusConfig.PcmFrameSize}}),i.initData(),i.remuxController.on("buffer",i.onBuffer.bind(i)),i.remuxController.on("ready",i.createBuffer.bind(i)),i.initBrowser(),i}return Jo(t,e),t.isSupported=function(e){var t;return null===(t=window.MediaSource)||void 0===t?void 0:t.isTypeSupported(e)},t.prototype.feed=function(e){var t={};if(e&&this.remuxController){var n,o=e.avc,r=e.hevc,i=e.aac,s=e.opus,a=e.duration,c=void 0===a?0:a,d=e.compositionTimeOffset;if(o&&this.options.mode.avc&&((n=eo(o)).length>0?t.avc=this.getVideoFrames(n,c,d):"function"==typeof this.options.onMissingVideoFrames&&this.options.onMissingVideoFrames.call(null,e)),r&&this.options.mode.hevc&&((n=eo(r)).length>0?t.hevc=this.getHevcVideoFrames(n,c,d):"function"==typeof this.options.onMissingVideoFrames&&this.options.onMissingVideoFrames.call(null,e)),i&&this.options.mode.aac){var l=oo.extractAAC(i);l.length>0?t.aac=this.getAudioFrames(l,c):(Xn("Failed to extract audio data from:",i),"function"==typeof this.options.onMissingAudioFrames&&this.options.onMissingAudioFrames.call(null,e));}if(s&&this.options.mode.opus){if(!this.options.mode.opus)return;t.opus=this.getOpusFrames([s],this.options.opusConfig.PcmFrameSize);}this.remuxController.remux(t);}},t.prototype.destroy=function(){var e,t,n,o;this.stopInterval(),this.remuxController&&(this.remuxController.destroy(),this.remuxController=null),this.bufferControllers&&(null===(e=this.bufferControllers.avc)||void 0===e||e.destroy(),null===(t=this.bufferControllers.hevc)||void 0===t||t.destroy(),null===(n=this.bufferControllers.aac)||void 0===n||n.destroy(),null===(o=this.bufferControllers.opus)||void 0===o||o.destroy(),this.bufferControllers=null,this.endMSE()),this.node=null,this.mseReady=false,this.videoStarted=false,this.mediaSource=null;},t.prototype.reset=function(){var e,t,n,o;this.stopInterval(),this.isReset=true,this.node.pause(),this.remuxController&&this.remuxController.reset(),this.bufferControllers&&(null===(e=this.bufferControllers.avc)||void 0===e||e.destroy(),null===(t=this.bufferControllers.hevc)||void 0===t||t.destroy(),null===(n=this.bufferControllers.aac)||void 0===n||n.destroy(),null===(o=this.bufferControllers.opus)||void 0===o||o.destroy(),this.bufferControllers=null,this.endMSE()),this.initData(),this.initBrowser(),Xn("Muxer was reset");},t.prototype.playCurrent=function(){var e,t;if((null===(t=null===(e=this.node)||void 0===e?void 0:e.buffered)||void 0===t?void 0:t.length)>0&&!this.node.seeking){var n=this.node.buffered.end(0);this.node.currentTime=n-.001;}},t.prototype.getVideoResolution=function(e){var t,n=e.type,o=null===(t=this.remuxController.tracks[n])||void 0===t?void 0:t.mp4track;return {width:o.width,height:o.height}},t.prototype.initData=function(){this.lastCleaningTime=Date.now(),this.kfPosition=[],this.kfCounter=0,this.startInterval();},t.prototype.initBrowser=function(){"string"==typeof this.options.node&&""===this.options.node&&Jn("no video element were found to render, provide a valid video element"),this.node="string"==typeof this.options.node?document.querySelector(this.options.node):this.options.node,this.mseReady=false,this.setupMSE();},t.prototype.setupMSE=function(){if(window.MediaSource=window.MediaSource||window.WebKitMediaSource||window.ManagedMediaSource,!window.MediaSource)throw "Oops! Browser does not support Media Source Extension or Managed Media Source (IOS 17+).";if(this.isMSESupported=!!window.MediaSource,this.mediaSource=new window.MediaSource,this.url=URL.createObjectURL(this.mediaSource),window.MediaSource===window.ManagedMediaSource)try{this.node.removeAttribute("src"),this.node.disableRemotePlayback=!0;var e=document.createElement("source");e.type="video/mp4",e.src=this.url,this.node.appendChild(e),this.node.load();}catch(e){console.log("ManagedMediaSource error",e),this.node.src=this.url;}else this.node.src=this.url;this.mseEnded=false,this.mediaSource.addEventListener("sourceopen",this.onMSEOpen.bind(this)),this.mediaSource.addEventListener("sourceclose",this.onMSEClose.bind(this)),this.mediaSource.addEventListener("webkitsourceopen",this.onMSEOpen.bind(this)),this.mediaSource.addEventListener("webkitsourceclose",this.onMSEClose.bind(this));},t.prototype.endMSE=function(){if(!this.mseEnded)try{this.mseEnded=!0,this.mediaSource.endOfStream();}catch(e){Xn("mediaSource is not available to end",e);}},t.prototype.getVideoFrames=function(e,t,n){var o,r,i=[],s=[],a=false;try{for(var c=Zo(e),d=c.next();!d.done;d=c.next()){var l=d.value,u=new Qn(l);u.type()!==Qn.IDR&&u.type()!==Qn.NDR||no.parseHeader(u),s.push(u),a=u.isKeyframe(),u.isvcl&&u.isfmb&&(i.push({units:s,keyFrame:a,duration:t||this.frameDuration,compositionTimeOffset:n}),this.kfCounter=this.kfCounter+1,a&&this.options.clearBuffer&&this.kfPosition.push(this.kfCounter*(t||this.frameDuration)/1e3));}}catch(e){o={error:e};}finally{try{d&&!d.done&&(r=c.return)&&r.call(c);}finally{if(o)throw o.error}}return i},t.prototype.getHevcVideoFrames=function(e,t,n){var o,r,i=[],s=[],a=false;try{for(var c=Zo(e),d=c.next();!d.done;d=c.next()){var l=d.value,u=new jo(l);u.type()!==jo.IDR&&u.type()!==jo.NDR||No.parseHeader(u),s.push(u),a=u.isKeyframe(),u.isvcl&&(i.push({units:s,keyFrame:a,duration:t||this.frameDuration,compositionTimeOffset:n}),this.kfCounter=this.kfCounter+1,a&&this.options.clearBuffer&&this.kfPosition.push(this.kfCounter*(t||this.frameDuration)/1e3));}}catch(e){o={error:e};}finally{try{d&&!d.done&&(r=c.return)&&r.call(c);}finally{if(o)throw o.error}}return i},t.prototype.getAudioFrames=function(e,t){var n,o,r,i=[],s=0;try{for(var a=Zo(e),c=a.next();!c.done;c=a.next()){var d=c.value;i.push({units:d});}}catch(e){n={error:e};}finally{try{c&&!c.done&&(o=a.return)&&o.call(a);}finally{if(n)throw n.error}}return r=t?t/i.length|0:this.frameDuration,s=t?t-r*i.length:0,i.forEach((function(e){e.duration=r,s>0&&(e.duration=e.duration+1,s-=1);})),i},t.prototype.getOpusFrames=function(e,t){var n,o,r=[];try{for(var i=Zo(e),s=i.next();!s.done;s=i.next()){var a=s.value;r.push({unit:a,duration:t});}}catch(e){n={error:e};}finally{try{s&&!s.done&&(o=i.return)&&o.call(i);}finally{if(n)throw n.error}}return r},t.prototype.createBuffer=function(){var e;if(this.mseReady&&(null===(e=this.remuxController)||void 0===e?void 0:e.isReady())&&!this.bufferControllers)for(var n in this.bufferControllers={},this.remuxController.tracks){var o=n,r=this.remuxController.tracks[o],i="opus"===n||"aac"===n?"audio":"video";if(!t.isSupported("".concat(i,'/mp4; codecs="').concat(r.mp4track.codec,'"')))return Jn("Browser does not support codec"),false;var s=this.mediaSource.addSourceBuffer("".concat(i,'/mp4; codecs="').concat(r.mp4track.codec,'"'));this.bufferControllers[o]=new Xo(s,o),this.bufferControllers[o].on("error",this.onBufferError.bind(this));}},t.prototype.startInterval=function(){var e=this;this.interval=setInterval((function(){e.cancelDelay();}),1e3);},t.prototype.stopInterval=function(){this.interval&&clearInterval(this.interval);},t.prototype.cancelDelay=function(){var e;if((null===(e=this.node.buffered)||void 0===e?void 0:e.length)>0&&!this.node.seeking){var t=this.node.buffered.end(0);t-this.node.currentTime>this.options.maxDelay/1e3&&(this.node.currentTime=t-.001);}},t.prototype.applyAndClearBuffer=function(){this.bufferControllers&&this.clearBuffer();},t.prototype.getSafeClearOffsetOfBuffer=function(e){for(var t,n=(this.options.mode.aac||this.options.mode.opus)&&e||0,o=0;o<this.kfPosition.length&&!(this.kfPosition[o]>=e);o++)t=this.kfPosition[o];return t&&(this.kfPosition=this.kfPosition.filter((function(e){return e<t&&(n=e),e>=t}))),n},t.prototype.clearBuffer=function(){var e,t;if(this.options.clearBuffer&&Date.now()-this.lastCleaningTime>1e4){if(this.bufferControllers.avc||this.bufferControllers.hevc){var n=this.getSafeClearOffsetOfBuffer(this.node.currentTime);null===(e=this.bufferControllers.avc)||void 0===e||e.initCleanup(n),null===(t=this.bufferControllers.hevc)||void 0===t||t.initCleanup(n);}this.bufferControllers.opus&&this.bufferControllers.opus.initCleanup(this.node.currentTime),this.lastCleaningTime=Date.now();}},t.prototype.onBuffer=function(e){var t,n,o,r,i,s,a,c,d,l,u=e.payload,h=e.type,p=e.fps,f=e.eventType;this.options.readFpsFromTrack&&void 0!==p&&this.options.fps!==p&&(this.options.fps=p,this.frameDuration=Math.ceil(1e3/p),Xn("Muxer changed FPS to ".concat(p," from track data"))),this.bufferControllers&&("avc"===h&&(null===(n=null===(t=this.bufferControllers)||void 0===t?void 0:t.avc)||void 0===n||n.feed(u)),"hevc"===h&&(null===(r=null===(o=this.bufferControllers)||void 0===o?void 0:o.hevc)||void 0===r||r.feed(u)),"aac"===h&&(null===(s=null===(i=this.bufferControllers)||void 0===i?void 0:i.aac)||void 0===s||s.feed(u)),"opus"===h&&(null===(c=null===(a=this.bufferControllers)||void 0===a?void 0:a.opus)||void 0===c||c.feed(u))),this.options.onData&&this.options.onData({data:e}),0===this.options.flushingTime&&this.applyAndClearBuffer(),"init"===f&&(null===(l=(d=this.options).onReady)||void 0===l||l.call(d));},t.prototype.onMSEOpen=function(){this.mseReady=true,URL.revokeObjectURL(this.url);},t.prototype.onMSEClose=function(){this.mseReady=false,this.videoStarted=false;},t.prototype.onBufferError=function(e){if(Xn("onBufferError",e),"QuotaExceeded"===e.name)return Xn("Muxer cleaning ".concat(e.type," buffer due to QuotaExceeded error")),void this.bufferControllers[e.type].initCleanup(this.node.currentTime);"InvalidStateError"===e.name?this.reset():this.endMSE(),"function"==typeof this.options.onError&&this.options.onError.call(null,e);},t}(ro);const tr=er;var nr=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},or=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},rr=function(){function e(e){var t=e.sdk;this.sdk=null,this.token=null,this.instanceId=null,this.url="",this.socket=null,this.textEncoder=new TextEncoder,this.textDecoder=new TextDecoder,this.heartbeatTimer=null,this.streamPushStat=null,this.videoState="play",this.videoMuxer=null,this.audioMuxer=null,this.sessionInfo=null,this.lastVideoFrameTimeStamp=0,this.dataChannelCallbacks={},this.dataChannelRetryTimers={},this.mount=null,this.sdk=t;}return e.prototype.init=function(e){var t=e.mount;this.mount=t;},e.prototype.connect=function(e){var t=e.url,n=e.protocols,o=void 0===n?["media-v1"]:n,r=e.token,i=e.instanceId,s=e.videoCodecList,a=void 0===s?["h264","h265"]:s;return nr(this,void 0,void 0,(function(){return or(this,(function(e){switch(e.label){case 0:return this.token=r,this.instanceId=i,this.url=t,t?[4,this.createSocket({url:"".concat(t,"/play?token=").concat(r,"&instance_id=").concat(i,"&video_codec_list=").concat(a.join(",")),protocols:o})]:[3,2];case 1:return e.sent(),[3,3];case 2:this.sdk.log("websocket connect url is empty",t),e.label=3;case 3:return [2]}}))}))},e.prototype.connectGroupControl=function(e){var t=e.url,n=e.protocols,o=void 0===n?["media-v1"]:n,r=e.tokenInfos,i=e.videoCodecList,s=void 0===i?["h264","h265"]:i;return nr(this,void 0,void 0,(function(){return or(this,(function(e){switch(e.label){case 0:return this.url=t,[4,this.createSocket({url:"".concat(t,"/group/play?video_codec_list=").concat(s.join(",")),protocols:o})];case 1:return 0===e.sent().code&&this.createGroupSession({tokenInfos:r}),[2]}}))}))},e.prototype.joinGroupControl=function(e){var t=e.tokenInfos,n=e.groupControlId;return nr(this,void 0,void 0,(function(){return or(this,(function(e){return this.sdk.log("websocket join group session"),this.sendText({Type:"JoinGroupSession",RequestId:qn(),Data:{TokenInfos:t,GroupControlId:n}}),[2]}))}))},e.prototype.dataChannelSend=function(e){var t=e.label,n=e.binary,o=void 0===n?0:n,r=e.data;return nr(this,void 0,void 0,(function(){var e,n,i,s,a,c;return or(this,(function(d){switch(d.label){case 0:return e=new Uint8Array([Hn.message,o]).buffer,n=this.textEncoder.encode(t).buffer,i=new ArrayBuffer(4),new DataView(i).setUint32(0,n.byteLength),s=this.textEncoder.encode(JSON.stringify(r)).buffer,a=new ArrayBuffer(4),new DataView(a).setUint32(0,s.byteLength),[4,gt(e,i,n,a,s)];case 1:return c=d.sent(),this.socket.send(c),[2]}}))}))},e.prototype.destroy=function(e){var t,n,o=e.code,r=e.message;this.socket.close(),this.clearIntervals(),this.sdk.onDisconnect({code:o,msg:r}),null===(t=this.videoMuxer)||void 0===t||t.destroy(),null===(n=this.audioMuxer)||void 0===n||n.destroy();},e.prototype.reconnect=function(e){var t=e.message;this.sdk.log("websocket reconnect, message",t),this.connect({token:this.token,url:this.url,instanceId:this.instanceId});},e.prototype.getMuxer=function(e){return "video"===e?this.videoMuxer:"audio"===e?this.audioMuxer:void 0},e.prototype.setMediaState=function(e){var t=e.type,n=e.state;"video"===t&&(this.videoState=n);},e.prototype.createSocket=function(e){var t=e.url,n=e.protocols;return nr(this,void 0,void 0,(function(){var e=this;return or(this,(function(o){return [2,new Promise((function(o){e.socket=new WebSocket(t,n),e.socket.binaryType="arraybuffer",e.socket.onopen=function(){e.sdk.log("socket onopen, socket binaryType",e.socket.binaryType),o({code:0,message:"onopen"});},e.socket.onmessage=function(t){var n,o=t.data;(n=o)&&n instanceof ArrayBuffer&&void 0!==n.byteLength?e.onArrayBufferMessage(o):e.onTextMessage(o);},e.socket.onclose=function(t){e.sdk.log("socket onclose",t),e.clearIntervals(),o({code:1,message:"onclose"});},e.socket.onerror=function(t){e.sdk.log("socket onerror",t),e.clearIntervals(),o({code:2,message:"onerror"});};}))]}))}))},e.prototype.onTextMessage=function(e){try{var t=JSON.parse(e),n=t.Type,o=t.Data,r=o.Code;switch(n){case "CreateSession":case "CreateGroupSession":0===r&&this.onCreateSessionSuccess(o);}}catch(e){this.sdk.log("Parse text message error",e);}},e.prototype.onArrayBufferMessage=function(e){var t=new DataView(e),n=t.getUint8(0);if(n===Vn.h264||n===Vn.h265){var o=t.getUint32(1),r=e.slice(5,e.byteLength);this.processVideoFrameBuffer({frame:r,duration:(o-this.lastVideoFrameTimeStamp)/90}),this.lastVideoFrameTimeStamp=o;}if(n===Vn.opus&&(r=e.slice(5,e.byteLength),this.processOpusFrameBuffer(r)),n===Hn.message){var i=t.getUint32(2),s=e.slice(6,6+i),a=e.slice(2+i+4+4,e.byteLength),c=this.textDecoder.decode(s);r=this.textDecoder.decode(a),c===ke.KM&&this.onKmMessage(r),c===ke.SV&&this.onSvrMessage(r),c===ke.HB&&this.onHbMessage(r),c===ke.CLOUD_DEVICE&&this.onCloudDeviceMessage(r),c===ke.ACK&&this.onAckMessage(r);}},e.prototype.processVideoFrameBuffer=function(e){var t,n,o,r=e.frame,i=e.duration;"play"===this.videoState&&(null===(t=this.videoMuxer)||void 0===t||t.feed({avc:"h264"===(null===(n=this.sessionInfo)||void 0===n?void 0:n.Video)?new Uint8Array(r):void 0,hevc:"h265"===(null===(o=this.sessionInfo)||void 0===o?void 0:o.Video)?new Uint8Array(r):void 0,duration:i}));},e.prototype.processOpusFrameBuffer=function(e){var t;null===(t=this.audioMuxer)||void 0===t||t.feed({opus:new Uint8Array(e)});},e.prototype.createSession=function(e){var t=e.Token,n=e.InstanceId;this.sdk.log("websocket createSession, instanceId",n),this.sendText({Type:"CreateSession",Data:{Token:t,AndroidInstanceId:n,VideoCodecList:["h264"]}});},e.prototype.createGroupSession=function(e){var t=e.tokenInfos;this.sdk.log("websocket create group session"),this.sendText({Type:"CreateGroupSession",RequestId:qn(),Data:{TokenInfos:t}});},e.prototype.sendText=function(e){this.sdk.log("websocket sendText",e),this.socket.send(JSON.stringify(e));},e.prototype.onCreateSessionSuccess=function(e){var t=this;this.sessionInfo=e;var n=e.Video,o=e.Audio,r=e.GroupControlId;this.sdk.log("Video",n,"Audio",o,"GroupControlId",r),this.sdk.androidInstance.groupControl.groupControlId=r,this.sdk.androidInstance.groupControl.onConnectSuccess(),this.sdk.gameConfig.setConfig({clientId:this.mount,config:{video_mime_type:"video/".concat(n.toLowerCase()),audio_mime_type:"audio/".concat(null==o?void 0:o.Codec.toLowerCase())}});var i="h265"===n?"hevc":"avc";this.videoMuxer=new tr({node:".".concat(this.mount," .video-stream"),mode:{avc:"h264"===n||void 0,hevc:"h265"===n||void 0},debug:this.debugSetting.showMuxer,onReady:function(){var e,n,o;t.sdk.getCloudGamingContainerElement()&&(t.sdk.getCloudGamingContainerElement().style.display="flex"),t.sdk.getProgressBarElement()&&(t.sdk.getProgressBarElement().style.display="none"),t.sdk.getRestartElement()&&(t.sdk.getRestartElement().style.display="none"),t.startHeartbeatReport(),t.sdk.pageEvent.addEventHandler(),t.sdk.onConnectSuccess({code:0});var r=t.videoMuxer.getVideoResolution({type:i}),s=r.width,a=r.height;t.sdk.showStats.setStaticStat({resolution:"".concat(s,"x").concat(a)}),null===(o=null===(n=null===(e=t.sdk.getVideoElement())||void 0===e?void 0:e.play())||void 0===n?void 0:n.then((function(){t.sdk.log("video play success"),t.sdk.onEvent({type:"autoplay",data:{code:0,message:"video play success"}}),t.sdk.reshapeWindow();})))||void 0===o||o.catch((function(e){t.sdk.log("video play error, ",e,e.name),t.sdk.onEvent({type:"autoplay",data:{code:-1,message:e}});}));}});var s=o.Channels,a=o.SampleRate,c=o.PcmFrameSize;this.audioMuxer=new tr({node:".".concat(this.mount," .cloud-gaming-audio-stream-socket"),mode:{opus:true},maxDelay:1e3,opusConfig:{SampleRate:a,SampleFormat:16,Channels:s,PcmFrameSize:c},debug:this.debugSetting.showMuxer});},e.prototype.createDataChannel=function(e){var t=e.label;return nr(this,void 0,void 0,(function(){var e,n;return or(this,(function(o){switch(o.label){case 0:return this.sdk.log("create ".concat(t," data channel")),e=this.textEncoder.encode(t),[4,gt(new Uint8Array([Hn.open]).buffer,e.buffer)];case 1:return n=o.sent(),this.socket.send(n),[2]}}))}))},e.prototype.startHeartbeatReport=function(){var e=this;clearInterval(this.heartbeatTimer),this.sdk.log("startHeartbeatReport ->"),this.heartbeatTimer=setInterval((function(){return nr(e,void 0,void 0,(function(){return or(this,(function(e){return this.dataChannelSend({label:ke.HB,data:{user_id:this.instanceId,timestamp:+new Date}}),[2]}))}))}),5e3);},Object.defineProperty(e.prototype,"debugSetting",{get:function(){return this.sdk.getInitOptions().debugSetting||{}},enumerable:false,configurable:true}),e.prototype.onKmMessage=function(e){try{var t=JSON.parse(e);this.debugSetting.showOnKmMessage&&console.log("onKmMessage",t);var n=t.screen_width,o=t.screen_height,r=t.screen_left,i=t.screen_top;this.sdk.pageEvent.remoteScreenResolutionChange({width:n,height:o,left:r,top:i});}catch(e){this.sdk.log("parse km message error",e);}},e.prototype.onSvrMessage=function(e){if(e)try{var t=JSON.parse(e),n=t.type,o=t.data;switch(this.debugSetting.showOnSvMessage&&this.sdk.log("onSvMessage","type: ",n,"data",e),n){case "metric_sig_key":this.sdk.gameConfig.setConfig({clientId:this.mount,config:{metric_key:o.sig_key}});break;case "screen_config_change":this.sdk.onConfigurationChange({screen_config:o});break;case "hit_input":var r=o,i=r.field_type,s=r.status;this.sdk.onInputStatusChange({field_type:i,status:s});break;case "camera_status":o.status;}}catch(e){this.sdk.log("onSvMessage data parse failed",e);}else this.sdk.log("onSvMessage no data");},e.prototype.onHbMessage=function(e){try{var t=JSON.parse(e),n=t.timestamp,o=t.token,r=t.stream_push_state;if(this.debugSetting.showOnHbMessage&&console.log("onHbMessage",t),this.token=o,n){var i=+new Date-+n;this.sdk.showStats.setRTT(i)&&this.sdk.onNetworkChange({status:"jitter",data:{value:i,message:"NETWORK_JITTER"}});}r&&this.streamPushStat!==r&&(this.streamPushStat=r,this.sdk.onStreamPushStateChange({stream_push_state:this.streamPushStat}));}catch(e){this.sdk.log("parse hb message error",e);}},e.prototype.onCloudDeviceMessage=function(e){return nr(this,void 0,void 0,(function(){var t,n,o,r,i,s,a,c,d,l;return or(this,(function(u){switch(u.label){case 0:if(!e)return [3,14];u.label=1;case 1:switch(u.trys.push([1,12,,13]),t=JSON.parse(e),n=t.type,o=t.data,this.debugSetting.showOnCloudDeviceMessage&&this.sdk.log("onCloudDeviceData","type: ",n,"data",e,"cloudDeviceData",o),n){case "trans_message":return [3,2];case "system_usage":return [3,3];case "clipboard_event":return [3,4];case "notification_event":return [3,9]}return [3,10];case 2:return this.sdk.onAndroidInstanceEvent({type:"trans_message",data:o}),[3,11];case 3:return this.sdk.onAndroidInstanceEvent({type:"system_usage",data:o}),i=(r=o).cpu_usage,s=r.gpu_usage,this.sdk.showStats.setCpuAndGpuUsage({cpu:"".concat(ht(i)),gpu:"".concat(ht(s))}),[3,11];case 4:a=true,c=o.text,u.label=5;case 5:return u.trys.push([5,7,,8]),[4,navigator.clipboard.writeText(c)];case 6:return u.sent(),[3,8];case 7:return d=u.sent(),this.sdk.log("navigator.clipboard.writeText failed",d),a=false,[3,8];case 8:return this.sdk.onAndroidInstanceEvent({type:"clipboard_event",data:{text:c,writeText:a}}),[3,11];case 9:return this.sdk.onAndroidInstanceEvent({type:"notification_event",data:o}),[3,11];case 10:return [3,11];case 11:return [3,13];case 12:return l=u.sent(),this.sdk.log("onCloudDeviceData data parse failed",l),[3,13];case 13:return [3,15];case 14:this.sdk.log("onCloudDeviceData no data"),u.label=15;case 15:return [2]}}))}))},e.prototype.onAckMessage=function(e){if(e)try{var t=JSON.parse(e),n=t.data,o=void 0===n?ft:n,r=t.seq;this.debugSetting.showOnAckMessage&&("cursor_state"===o.type||"keys_clean"===o.type||console.log("onAckMessage",o,r));var i=this.dataChannelCallbacks[r];if(r&&(this.sdk.showStats.setInputEnd(r),i)){var s=i.callback;delete this.dataChannelCallbacks[r],this.dataChannelRetryTimers[r]&&(clearTimeout(this.dataChannelRetryTimers[r]),delete this.dataChannelRetryTimers[r]),null==s||s({code:0,msg:"on ack message",data:o});}"open_url"===o.type&&(this.sdk.log("got open_url",o),this.sdk.onNetworkChange({status:"openurl",data:{value:o.url}}),this.sdk.onEvent({type:"openurl",data:{value:o.url}}));}catch(e){this.sdk.log("onAckMessage exception->",null==e?void 0:e.message);}else this.sdk.log("onAckMessage no data");},e.prototype.clearIntervals=function(){clearInterval(this.heartbeatTimer);},e}();const ir=rr;var sr=function(){return sr=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},sr.apply(this,arguments)},ar=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},cr=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},dr=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},lr=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},ur={Token:"",Zone:"",OperatorAddress:"",WebSocketAddress:"",WebSocketSecureAddress:"",WebRTCAddress:"",EdgeProxyAddress:"",InstanceInfo:null},hr=function(){function e(e){var t=e.sdk;this.sdk=null,this.instanceAccessInfo=new Map,this.accessInfo=[],this._accessToken="",this.playAPIFetchStart=0,this.sdk=t;}return Object.defineProperty(e.prototype,"accessToken",{get:function(){return this._accessToken},set:function(e){this._accessToken=e;},enumerable:false,configurable:true}),e.prototype.setInstanceAccessInfo=function(e){var t=this,n=e.AccessInfo,o=e.Token,r=dr(o.split("_"),1)[0];this.sdk.gameConfig.setAppId({clientId:this.sdk.getInitOptions().mount,appId:+r});try{n=Qe(n);}catch(e){this.sdk.log("Decode AccessInfo error",e.message);}try{var i=JSON.parse(n).AccessInfo;this.accessInfo=lr(lr([],dr(this.accessInfo),!1),dr(i),!1),this.accessToken=o,null==i||i.forEach((function(e){var n=e.Zone,r=e.InstanceIds,i=e.OperatorAddress,s=e.WebSocketAddress,a=e.WebSocketSecureAddress,c=e.WebRTCAddress,d=e.EdgeProxyAddress,l=e.InstancesInfo,u=void 0===l?[]:l;r.forEach((function(e){var r=(null==u?void 0:u.find((function(t){return t.InstanceId===e})))||{},l=r.Data,h=r.InstanceId,p=null;h&&l&&(p={InstanceId:h,Data:l}),t.instanceAccessInfo.set(e,{Token:o,Zone:n,OperatorAddress:i,WebSocketAddress:s,WebSocketSecureAddress:a,WebRTCAddress:c,EdgeProxyAddress:d,InstanceInfo:p});}));}));}catch(e){this.sdk.log("Parse AccessInfo error",e.message);}},e.prototype.getInstanceAccessInfo=function(e){var t=e.instanceId;return this.instanceAccessInfo.get(t)||ur},e.prototype.getTokenInfos=function(e){var t=this,n=e.instanceIds,o=[],r=[];return n.forEach((function(e){var n=t.getInstanceAccessInfo({instanceId:e}).Token;n?o.push({Token:n,AndroidInstanceId:e}):(t.sdk.log("Token is not set",e),r.push(e));})),r.length&&this.sdk.onEvent({type:"token_not_found",data:{instance_ids:r}}),o},e.prototype.createWebRTCSession=function(e){var t=e.instanceId,n=e.clientSession;return ar(this,void 0,void 0,(function(){var e,o,r,i,s,a,c,d,l,u,h,p,f,m,v;return cr(this,(function(g){switch(g.label){case 0:if(!t||!n)return [3,8];if(e=this.getInstanceAccessInfo({instanceId:t}),o=e.Token,r=e.WebRTCAddress,i=e.EdgeProxyAddress,!(s=i||r))return [3,7];a="".concat(s,"/play"),c={Authorization:"Bearer ".concat(o)},(d=this.getInstanceInfoHeader({instanceId:t,encode:"url_encode"}).instanceInfo)&&(c["Crtr-Proxy-Instance-Info"]=d),g.label=1;case 1:return g.trys.push([1,6,,7]),this.playAPIFetchStart=+new Date,l=void 0,u={RequestId:this.sdk.getRequestId()||qn(),Token:o,AndroidInstanceId:t,ClientSession:n},this.sdk.isTCGShadowSocketConnected?(this.sdk.log("fetch server_api_play from shadow socket"),[4,this.sendRequest({Action:"Play",Data:sr(sr({},u),{InstanceInfo:d})})]):[3,3];case 2:return l=g.sent(),[3,5];case 3:return this.sdk.log("fetch server_api_play from api"),[4,dn({url:a,data:u,headers:c})];case 4:l=g.sent(),g.label=5;case 5:return h=l.ServerSession,p=l.Code,f=l.Message,m=+new Date-this.playAPIFetchStart,this.sdk.showStats.setAPICost(m),this.sdk.showStats.addEventReport({event_code:"server_api_play",event_result_code:"".concat(p),event_result_msg:f,consume_time:m}),this.sdk.log("fetch server_api_play cost",m),[2,{ServerSession:h,Code:p,Message:f}];case 6:throw v=g.sent(),this.sdk.log("fetch server session error, /play",v.message),v;case 7:this.sdk.log("play requestAddress is not found"),g.label=8;case 8:return this.sdk.log("Create session error, instanceId or clientSession is empty"),[2]}}))}))},e.prototype.createWebRTCGroupSession=function(e){var t=e.instanceIds,n=e.clientSessions;return ar(this,void 0,void 0,(function(){var e,o,r,i,s,a,c,d,l,u,h,p,f,m,v,g,y;return cr(this,(function(b){switch(b.label){case 0:if(e=this.getTokenInfos({instanceIds:t}),o=this.getInstanceAccessInfo({instanceId:t[0]}),r=o.Token,i=o.EdgeProxyAddress,s=o.WebRTCAddress,a=this.getInstancesInfo({instanceIds:t}).InstancesInfo,!(c=i||s))return [3,7];d="".concat(c,"/group/play"),l={Authorization:"Bearer ".concat(r)},b.label=1;case 1:return b.trys.push([1,6,,7]),this.playAPIFetchStart=+new Date,u=void 0,h={RequestId:qn(),TokenInfos:e,ClientSessions:n,InstancesInfo:a},this.sdk.isTCGShadowSocketConnected?(this.sdk.log("fetch server_api_group_play from shadow socket"),[4,this.sendRequest({Action:"GroupPlay",Data:h})]):[3,3];case 2:return u=b.sent(),[3,5];case 3:return this.sdk.log("fetch server_api_group_play from api"),[4,dn({url:d,data:h,headers:l})];case 4:u=b.sent(),b.label=5;case 5:return p=u.GroupControlId,f=u.ServerSessions,m=u.Code,v=u.Message,this.sdk.log("Create WebRTC GroupSession",p,f),g=+new Date-this.playAPIFetchStart,this.sdk.showStats.setAPICost(g),this.sdk.showStats.addEventReport({event_code:"server_api_group_play",event_result_code:"".concat(m),event_result_msg:v,consume_time:g}),this.sdk.log("fetch server_api_group_play cost",g),[2,{Code:m,Message:v,GroupControlId:p,ServerSessions:f}];case 6:throw y=b.sent(),this.sdk.log("fetch server session error, /group/play",y.message),y;case 7:return this.sdk.log("requestAddress is not found"),[2]}}))}))},e.prototype.joinWebRTCGroupSession=function(e){var t=e.instanceIds,n=e.clientSessions,o=e.groupControlId;return ar(this,void 0,void 0,(function(){var e,r,i,s,a,c,d,l,u,h,p,f,m;return cr(this,(function(v){switch(v.label){case 0:if(e=this.getTokenInfos({instanceIds:t}),r=this.getInstanceAccessInfo({instanceId:t[0]}),i=r.Token,s=r.WebRTCAddress,a=r.EdgeProxyAddress,c=this.getInstancesInfo({instanceIds:t}).InstancesInfo,!(d=a||s))return [3,7];l="".concat(d,"/group/join"),u={Authorization:"Bearer ".concat(i)},v.label=1;case 1:return v.trys.push([1,6,,7]),h=void 0,p={RequestId:qn(),GroupControlId:o,TokenInfos:e,ClientSessions:n,InstancesInfo:c},this.sdk.isTCGShadowSocketConnected?[4,this.sendRequest({Action:"GroupJoin",Data:p})]:[3,3];case 2:return h=v.sent(),[3,5];case 3:return [4,dn({url:l,data:p,headers:u})];case 4:h=v.sent(),v.label=5;case 5:return f=h.ServerSessions,m=void 0===f?[]:f,this.sdk.log("Join WebRTC GroupSession",m),[2,{ServerSessions:(null==m?void 0:m.length)?m:[]}];case 6:throw v.sent();case 7:return this.sdk.log("group play requestAddress is not found"),[2]}}))}))},e.prototype.createWebRTCMultiTrackSession=function(e){var t=e.instanceIds,n=e.clientSessions;return ar(this,void 0,void 0,(function(){var e,o,r,i,s,a,c,d,l,u,h,p,f,m,v,g;return cr(this,(function(y){switch(y.label){case 0:if(e=this.getTokenInfos({instanceIds:t}),o=this.getInstanceAccessInfo({instanceId:t[0]}),r=o.Token,i=o.EdgeProxyAddress,s=o.WebRTCAddress,a=this.getInstancesInfo({instanceIds:t}).InstancesInfo,!(c=i||s))return [3,7];d="".concat(c,"/streams/play"),l={Authorization:"Bearer ".concat(r)},y.label=1;case 1:return y.trys.push([1,6,,7]),this.playAPIFetchStart=+new Date,u=void 0,h={RequestId:qn(),TokenInfos:e,ClientSessions:n,InstancesInfo:a},this.sdk.isTCGShadowSocketConnected?[4,this.sendRequest({Action:"StreamsPlay",Data:h})]:[3,3];case 2:return u=y.sent(),[3,5];case 3:return [4,dn({url:d,data:h,headers:l})];case 4:u=y.sent(),y.label=5;case 5:return p=u.ServerSessions,f=u.Code,m=u.Message,this.sdk.log("Create WebRTC MultiTrackSession",p),v=+new Date-this.playAPIFetchStart,this.sdk.showStats.setAPICost(v),this.sdk.showStats.addEventReport({event_code:"server_api_streams_play",event_result_code:"".concat(f),event_result_msg:m,consume_time:v}),[2,{Code:f,Message:m,ServerSessions:p}];case 6:throw g=y.sent(),this.sdk.log("fetch server session error, /stream/play",g.message),g;case 7:return this.sdk.log("requestAddress is not found"),[2]}}))}))},e.prototype.getInstancesInfo=function(e){var t=this,n=e.instanceIds,o=[];return n.forEach((function(e){var n=t.getInstanceAccessInfo({instanceId:e}).InstanceInfo;n&&o.push(n);})),{InstancesInfo:o}},e.prototype.getInstanceInfoHeader=function(e){var t=e.instanceId,n=e.method,o=void 0===n?"POST":n,r=e.encode,i=void 0===r?"base64":r,s=this.getInstanceAccessInfo({instanceId:t}).InstanceInfo;if(s){var a=s.InstanceId,c=s.Data,d="";if(a&&c)try{d="url_encode"===i?encodeURIComponent(JSON.stringify({InstanceId:a,Data:c})):Je(JSON.stringify({InstanceId:a,Data:c}));}catch(e){this.sdk.log("stringify instanceInfo string error",e.name,e.message);}else this.sdk.log("InstanceId, Data is not found",a,c);return "GET"===o&&(d="&instance_info=".concat(d)),{instanceInfo:d}}return {instanceInfo:""}},e.prototype.sendRequest=function(e){var t=this,n=e.Action,o=e.Data;return new Promise((function(e,r){t.sdk.isTCGShadowSocketConnected?t.sdk.shadowSocket.sendRequest({Action:n,Data:o,Callback:function(t){e(t);}}):r(new Error("shadowSocket is not connected"));}))},e}();const pr=hr;var fr=function(){return fr=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},fr.apply(this,arguments)},mr=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},vr=function(e,t,n){if(2===arguments.length)for(var o,r=0,i=t.length;r<i;r++)!o&&r in t||(o||(o=Array.prototype.slice.call(t,0,r)),o[r]=t[r]);return e.concat(o||Array.prototype.slice.call(t))},gr=function(){function e(e){var t=e.sdk;this.masterInstanceId="",this._instanceIds=[],this._groupControlId="",this.imageEventTimer=null,this.options={image:{interval:1,quality:20}},this.sdk=null,this.sdk=t;}return Object.defineProperty(e.prototype,"groupControlId",{get:function(){return this._groupControlId},set:function(e){this._groupControlId=e;},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"instanceIds",{get:function(){return vr([],mr(new Set(this._instanceIds)),false)},set:function(e){this._instanceIds=vr([],mr(new Set(e)),false);},enumerable:false,configurable:true}),e.prototype.init=function(e){this.options=fr(fr({},this.options),e);},e.prototype.start=function(e){var t=e.instanceIds,n=e.serverSessions,o=e.groupControlId;try{this.instanceIds=t;var r=mr(t,1)[0];this.masterInstanceId=r,this._groupControlId=o;var i=n[0];this.sdk.cloudGamingWebRTC.connect(i);}catch(e){this.sdk.log("serverSession 解析失败",e);}},e.prototype.startWebSocket=function(e){var t=e.url,n=e.tokenInfos,o=e.instanceIds;this.instanceIds=o;var r=mr(o,1)[0];this.masterInstanceId=r,this.sdk.cloudGamingWebsocket.connectGroupControl({url:t,tokenInfos:n});},e.prototype.requestStream=function(e){var t=e.instanceId,n=e.status,o=e.level,r=e.streamName;"websocket"===this.sdk.streamingMode?this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"streaming_request",user:t,data:{stream_name:r,status:n,level:o}}}):this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"streaming_request",user:t,data:{status:n,level:o,stream_name:r}});},e.prototype.setSyncList=function(e){var t=e.list,n=void 0===t?[]:t;"websocket"===this.sdk.streamingMode?this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"set_sync_list",data:{user_list:n}}}):this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"set_sync_list",data:{user_list:n}});},e.prototype.startSync=function(e){var t=e.instanceIds,n=void 0===t?[]:t;this.setSyncList({list:n.length?n:this.instanceIds});},e.prototype.stopSync=function(){this.setSyncList({list:[]});},e.prototype.setMaster=function(e){var t=e.instanceId;this.masterInstanceId=t,this.sdk.log("setMaster",t),"websocket"===this.sdk.streamingMode?this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"set_master",user:t,data:{status:"on"}}}):this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"set_master",user:t,data:{status:"on"}}),this.sdk.playVideo("play");},e.prototype.setImageEvent=function(e){var t=e.interval,n=e.quality;this.sdk.log("setImageEvent","interval",t,"quality",n),this.options.image=fr(fr({},this.options.image),{interval:t,quality:n}),this._groupControlId&&this.startImageEventInterval();},e.prototype.onConnectSuccess=function(){this.setMaster({instanceId:this.masterInstanceId}),this.setSyncList({list:this.instanceIds}),this.startImageEventInterval();},e.prototype.join=function(e){var t,n,o,r,i=e.instanceIds,s=e.clientSessions,a=void 0===s?[]:s;return t=this,n=void 0,r=function(){var e,t,n;return function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}}(this,(function(o){switch(o.label){case 0:return o.trys.push([0,4,,5]),"websocket"!==this.sdk.streamingMode?[3,2]:(e=this.sdk.accessInfo.getTokenInfos({instanceIds:i}),[4,this.sdk.cloudGamingWebsocket.joinGroupControl({tokenInfos:e,groupControlId:this.groupControlId})]);case 1:return o.sent(),[3,3];case 2:try{t=this.sdk.accessInfo.getInstancesInfo({instanceIds:i}).InstancesInfo,this.sdk.log("group join, instance ids",i),this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"join",data:{group_control_id:this.groupControlId,instances_info:t.map((function(e){return {instance_id:e.InstanceId,data:e.Data}})),client_sessions:a}});}catch(e){this.sdk.log("join group error",e.message);}o.label=3;case 3:return this.instanceIds=vr(vr([],mr(this.instanceIds),false),mr(i),false),this.setSyncList({list:this.instanceIds}),this.startImageEventInterval(),[3,5];case 4:return n=o.sent(),this.sdk.log("join serverSession parse error",n),[3,5];case 5:return [2]}}))},new((o=void 0)||(o=Promise))((function(e,i){function s(e){try{c(r.next(e));}catch(e){i(e);}}function a(e){try{c(r.throw(e));}catch(e){i(e);}}function c(t){var n;t.done?e(t.value):(n=t.value,n instanceof o?n:new o((function(e){e(n);}))).then(s,a);}c((r=r.apply(t,n||[])).next());}))},e.prototype.leave=function(e){var t=e.instanceIds;this.instanceIds=this.instanceIds.filter((function(e){return !t.includes(e)})),this.setSyncList({list:this.instanceIds}),this.startImageEventInterval();},e.prototype.destroy=function(){clearTimeout(this.imageEventTimer);},e.prototype.startImageEventInterval=function(){var e=this;clearTimeout(this.imageEventTimer);var t=function(){var n=[];e.instanceIds.forEach((function(t){var o;if(e.sdk.androidInstance.operator.getInstanceOperator({instanceId:t}).OperatorAddress){var r=e.sdk.androidInstance.getInstanceImage({instanceId:t,quality:null===(o=e.options.image)||void 0===o?void 0:o.quality}).url;n.push({instanceId:t,url:r});}})),e.sdk.onImageEvent({type:"screenshot",data:n}),e.imageEventTimer=setTimeout((function(){t();}),1e3*e.options.image.interval);};t();},e}(),yr=function(){return yr=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},yr.apply(this,arguments)},br=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},kr=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Sr=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")},Cr=function(){function e(e){var t=e.sdk;this.sdk=null,this.sdk=t;}return e.prototype.getInstanceOperator=function(e){var t=e.instanceId,n=this.sdk.accessInfo.getInstanceAccessInfo({instanceId:t}),o=n.Token,r=void 0===o?"":o,i=n.Zone,s=void 0===i?"":i,a=n.OperatorAddress;return {Token:r,Zone:s,OperatorAddress:void 0===a?"":a,EdgeProxyAddress:n.EdgeProxyAddress}},e.prototype.getInstanceImage=function(e){var t=e.instanceId,n=e.quality,o=void 0===n?20:n,r=e.screenshot_width,i=void 0===r?720:r,s=e.screenshot_height,a=void 0===s?1280:s,c=this.getInstanceOperator({instanceId:t}),d=c.Token,l=c.OperatorAddress,u=c.EdgeProxyAddress;if(d&&l){var h=u||l,p=this.sdk.accessInfo.getInstanceInfoHeader({instanceId:t,method:"GET"}).instanceInfo;return {url:"".concat(h,"/CAIScreenshot?instance_id=").concat(t,"&screenshot_quality=").concat(o,"&token=").concat(d,"&timestamp=").concat(+new Date)+"".concat(i?"&screenshot_width=".concat(i):"")+"".concat(a?"&screenshot_height=".concat(a):"")+"".concat(p||"")}}return {url:null}},e.prototype.upload=function(e){var t=e.instanceId,n=e.files;return br(this,void 0,void 0,(function(){var e,o,r,i,s,a,c,d,l,u,h,p,f,m,v=this;return kr(this,(function(g){switch(g.label){case 0:if(e=this.getInstanceOperator({instanceId:t}),o=e.Token,r=e.OperatorAddress,i=e.EdgeProxyAddress,!o||!r)return [3,5];s="".concat(i||r,"/CAIUpload?instance_id=").concat(t,"&token=").concat(o),a={},(c=this.sdk.accessInfo.getInstanceInfoHeader({instanceId:t}).instanceInfo)&&(a["Crtr-Proxy-Instance-Info"]=c),d=new FormData,n.forEach((function(e,t){var n=e.file,o=e.path;return br(v,void 0,void 0,(function(){return kr(this,(function(e){return d.append("file_".concat(t+1,"_path"),o),d.append("file_".concat(t+1),n),[2]}))}))})),l={Code:1,Message:"Upload failed",FileStatus:null},g.label=1;case 1:return g.trys.push([1,3,,4]),[4,fetch(s,{body:d,cache:"no-cache",method:"POST",mode:"cors",headers:a}).then((function(e){if(200!==e.status)throw new Error("status Code:".concat(e.status));return e.json()})).catch((function(e){throw new Error("".concat(e.name,": ").concat(e.message))}))];case 2:return u=g.sent(),h=u.Code,p=u.FileStatus,f=u.Msg,l.Code=h,l.Message=f,l.FileStatus=p,[3,4];case 3:return m=g.sent(),l.Code=1,l.Message="".concat(m.name,": ").concat(m.message),[3,4];case 4:return [2,l];case 5:return [2,{Code:2,Message:"Token or OperatorAddress is empty"}]}}))}))},e.prototype.uploadMedia=function(e){var t=e.instanceId,n=e.files;return br(this,void 0,void 0,(function(){var e,o,r,i,s,a,c,d,l,u,h,p,f,m=this;return kr(this,(function(v){switch(v.label){case 0:if(e=this.getInstanceOperator({instanceId:t}),o=e.Token,r=e.OperatorAddress,i=e.EdgeProxyAddress,!o||!r)return [3,5];s="".concat(i||r,"/CAIUploadMedia?instance_id=").concat(t,"&token=").concat(o),a={},(c=this.sdk.accessInfo.getInstanceInfoHeader({instanceId:t}).instanceInfo)&&(a["Crtr-Proxy-Instance-Info"]=c),d=new FormData,n.forEach((function(e,t){var n=e.file;return br(m,void 0,void 0,(function(){return kr(this,(function(e){return d.append("file_".concat(t+1),n),[2]}))}))})),l={Code:1,Message:"Upload media failed",FileStatus:null},v.label=1;case 1:return v.trys.push([1,3,,4]),[4,fetch(s,{body:d,cache:"no-cache",method:"POST",mode:"cors",headers:a}).then((function(e){if(200!==e.status)throw new Error("status Code:".concat(e.status));return e.json()})).catch((function(e){throw new Error("".concat(e.name,": ").concat(e.message))}))];case 2:return u=v.sent(),h=u.Code,p=u.Msg,l.Code=h,l.Message=p,[3,4];case 3:return f=v.sent(),l.Code=1,l.Message="".concat(f.name,": ").concat(f.message),[3,4];case 4:return [2,l];case 5:return [2,{Code:2,Message:"Token or OperatorAddress is empty"}]}}))}))},e.prototype.getInstanceDownloadAddress=function(e){var t=e.instanceId,n=e.path,o=this.getInstanceOperator({instanceId:t}),r=o.Token,i=o.OperatorAddress,s=o.EdgeProxyAddress;if(r&&i){var a=s||i,c=this.sdk.accessInfo.getInstanceInfoHeader({instanceId:t,method:"GET"}).instanceInfo;return {address:"".concat(a,"/CAIDownload?instance_id=").concat(t,"&path=").concat(n,"&token=").concat(r)+"".concat(c||"")}}return {address:null}},e.prototype.getInstanceDownloadLogcatAddress=function(e){var t=e.instanceId,n=e.recentDays,o=this.getInstanceOperator({instanceId:t}),r=o.Token,i=o.OperatorAddress,s=o.EdgeProxyAddress;if(r&&i){var a=s||i,c=this.sdk.accessInfo.getInstanceInfoHeader({instanceId:t,method:"GET"}).instanceInfo;return {address:"".concat(a,"/CAIDownloadLogcat?instance_id=").concat(t,"&recent_day=").concat(n,"&token=").concat(r)+"".concat(c||"")}}return {address:null}},e.prototype.batchTask=function(e){var t,n,o,r,i=e.taskType,s=e.params;return br(this,void 0,void 0,(function(){var e,a,c,d,l,u,h,p;return kr(this,(function(f){switch(f.label){case 0:e={},this.sdk.log("batchTask taskType",i,"batchTask params",s),a=this.getOperatorAddresses({instanceIds:Object.keys(s)}),f.label=1;case 1:f.trys.push([1,7,8,13]),c=function(){var t,n,o,a,c,u,p,f,m,v,g,y,b,k,S,C,w,T,E,_,R,M,D,I;return kr(this,(function(P){switch(P.label){case 0:r=h.value,l=false,t=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s}(r,2),n=t[0],o=t[1],a="".concat(n,"/CAIOperator/BatchTask"),c={},(u=d.sdk.accessInfo.getInstanceInfoHeader({instanceId:o[0]}).instanceInfo)&&(c.InstanceInfo=u),p=d.sdk.accessInfo.getInstancesInfo({instanceIds:o}).InstancesInfo,f={},m=d.sdk.accessInfo.getTokenInfos({instanceIds:o}),o.forEach((function(e){f[e]="ModifySensor"===i?yr(yr({},s[e]),{Accuracy:3}):s[e];})),P.label=1;case 1:return P.trys.push([1,3,,4]),[4,dn({url:a,data:{RequestID:qn(),TaskType:i,TokenInfos:m,InstancesInfo:p,Params:f},headers:c})];case 2:if(v=P.sent(),g=v.Code,y=v.Message,b=v.SuccResult,k=v.FailResult,0===g)e=yr(yr(yr({},e),b),k);else try{for(R=void 0,S=Sr(o),C=S.next();!C.done;C=S.next())_=C.value,e[_]={Code:g,Msg:y};}catch(e){R={error:e};}finally{try{C&&!C.done&&(M=S.return)&&M.call(S);}finally{if(R)throw R.error}}return [3,4];case 3:w=P.sent();try{for(D=void 0,T=Sr(o),E=T.next();!E.done;E=T.next())_=E.value,e[_]={Code:-1,Msg:w.message};}catch(e){D={error:e};}finally{try{E&&!E.done&&(I=T.return)&&I.call(T);}finally{if(D)throw D.error}}return [3,4];case 4:return [2]}}))},d=this,l=true,u=function(e){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var t,n=e[Symbol.asyncIterator];return n?n.call(e):(e="function"==typeof Sr?Sr(e):e[Symbol.iterator](),t={},o("next"),o("throw"),o("return"),t[Symbol.asyncIterator]=function(){return this},t);function o(n){t[n]=e[n]&&function(t){return new Promise((function(o,r){!function(e,t,n,o){Promise.resolve(o).then((function(t){e({value:t,done:n});}),t);}(o,r,(t=e[n](t)).done,t.value);}))};}}(Object.entries(a)),f.label=2;case 2:return [4,u.next()];case 3:return h=f.sent(),(t=h.done)?[3,6]:[5,c()];case 4:f.sent(),f.label=5;case 5:return l=true,[3,2];case 6:return [3,13];case 7:return p=f.sent(),n={error:p},[3,13];case 8:return f.trys.push([8,,11,12]),l||t||!(o=u.return)?[3,10]:[4,o.call(u)];case 9:f.sent(),f.label=10;case 10:return [3,12];case 11:if(n)throw n.error;return [7];case 12:return [7];case 13:return [2,e]}}))}))},e.prototype.getOperatorAddresses=function(e){var t=this,n=e.instanceIds,o={};return n.forEach((function(e){var n=t.getInstanceOperator({instanceId:e})||{},r=n.OperatorAddress,i=n.EdgeProxyAddress||r;i?o[i]?o[i].push(e):o[i]=[e]:t.sdk.log("getOperatorAddresses instanceId",e,"not found");})),o},e}();const wr=Cr;var Tr=function(){return Tr=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Tr.apply(this,arguments)},Er=function(e,t){var n="function"==typeof Symbol&&e[Symbol.iterator];if(!n)return e;var o,r,i=n.call(e),s=[];try{for(;(void 0===t||t-- >0)&&!(o=i.next()).done;)s.push(o.value);}catch(e){r={error:e};}finally{try{o&&!o.done&&(n=i.return)&&n.call(i);}finally{if(r)throw r.error}}return s},_r=function(){function e(e){var t=e.sdk;this.groupControl=null,this.operator=null,this.initOptions=null,this.sdk=null,this.sdk=t,this.groupControl=new gr({sdk:t}),this.operator=new wr({sdk:t});}return e.prototype.init=function(e){this.initOptions=Tr(Tr({},this.initOptions),e),this.groupControl.init(e.groupControl);},e.prototype.access=function(){},e.prototype.destroy=function(){this.groupControl.destroy();},e.prototype.requestStream=function(e){var t=e.instanceId,n=e.status,o=e.level,r=e.streamName,i=void 0===r?"high":r;this.groupControl.requestStream({instanceId:t,status:n,level:o,streamName:i});},e.prototype.setSyncList=function(e){var t=e.list,n=void 0===t?[]:t;this.groupControl.setSyncList({list:n});},e.prototype.startSync=function(e){var t=e.instanceIds,n=void 0===t?[]:t;this.groupControl.startSync({instanceIds:n});},e.prototype.stopSync=function(){this.groupControl.stopSync();},e.prototype.setMaster=function(e){var t=e.instanceId;this.groupControl.setMaster({instanceId:t});},e.prototype.setImageEvent=function(e){var t=e.interval,n=e.quality;this.groupControl.setImageEvent({interval:t,quality:n});},e.prototype.joinGroupControl=function(e){var t=e.instanceIds,n=e.clientSessions,o=void 0===n?[]:n;this.groupControl.join({instanceIds:t,clientSessions:o});},e.prototype.leaveGroupControl=function(e){var t=e.instanceIds;this.groupControl.leave({instanceIds:t});},e.prototype.getMultiTrackMediaStreams=function(){var e,t,n,o=[];if(this.sdk.cloudGamingWebRTC.getMultiTrackMediaStreams().size)try{for(var r=function(e){var t="function"==typeof Symbol&&Symbol.iterator,n=t&&e[t],o=0;if(n)return n.call(e);if(e&&"number"==typeof e.length)return {next:function(){return e&&o>=e.length&&(e=void 0),{value:e&&e[o++],done:!e}}};throw new TypeError(t?"Object is not iterable.":"Symbol.iterator is not defined.")}(null===(n=this.sdk.cloudGamingWebRTC.getMultiTrackMediaStreams())||void 0===n?void 0:n.entries()),i=r.next();!i.done;i=r.next()){var s=i.value,a=Er(s,2),c=a[0],d=a[1];o.push({trackId:c,mediaStream:d.mediaStream,instanceId:d.instanceId});}}catch(t){e={error:t};}finally{try{i&&!i.done&&(t=r.return)&&t.call(r);}finally{if(e)throw e.error}}else this.sdk.log("getMultiTrackMediaStreams is empty");return o},e.prototype.requestMultiStreaming=function(e){var t=this,n=[];e.forEach((function(e){var o=e.trackId,r=e.instanceId;t.sdk.cloudGamingWebRTC.setMultiTrackMediaStream({ssrc:o,instanceId:r}),n.push({ssrc:o,user:r});})),this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"multi_streaming_request",data:n});},e.prototype.transMessage=function(e){var t=e.packageName,n=e.message;this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"trans_message",data:{package_name:t,msg:n}});},e.prototype.inputText=function(e){var t=e.content,n=void 0===t?"":t,o=e.mode,r=void 0===o?"append":o,i=e.index_after_override;"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendAckData({data:{type:"input_text",content:n,mode:r,index_after_override:i}}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.ACK,data:{type:"input_text",content:n,mode:r}});},e.prototype.switchIME=function(e){var t=e.ime;"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendAckData({data:{type:"switch_ime",ime:t}}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.ACK,data:{type:"switch_ime",ime:t}}),this.sdk.pageEvent.IMEType=t;},e.prototype.distributeApp=function(e){var t=e.packageName;"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"distribute_app",data:{package_name:t}}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"distribute_app",data:{package_name:t}}});},e.prototype.preserveCleanApp=function(e){var t=e.preservePackageNames;"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"preserve_clean_app",data:{preserve_package_names:t}}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"preserve_clean_app",data:{preserve_package_names:t}}});},e.prototype.keepFrontApp=function(e){var t=e.packageName,n=e.enable;"webrtc"===this.sdk.streamingMode?this.sdk.cloudGamingWebRTC.sendCloudDeviceData({type:"keep_front_app",data:{package_name:t,enable:n}}):this.sdk.cloudGamingWebsocket.dataChannelSend({label:ke.CLOUD_DEVICE,data:{type:"keep_front_app",data:{package_name:t,enable:n}}});},e.prototype.getInstanceImage=function(e){var t=e.instanceId,n=e.quality,o=void 0===n?20:n,r=e.screenshot_width,i=e.screenshot_height;return this.operator.getInstanceImage({instanceId:t,quality:o,screenshot_width:r,screenshot_height:i})},e.prototype.upload=function(e){var t=e.instanceId,n=e.files;return this.operator.upload({instanceId:t,files:n})},e.prototype.uploadMedia=function(e){var t=e.instanceId,n=e.files;return this.operator.uploadMedia({instanceId:t,files:n})},e.prototype.getInstanceDownloadAddress=function(e){var t=e.instanceId,n=e.path;return this.operator.getInstanceDownloadAddress({instanceId:t,path:n})},e.prototype.getInstanceDownloadLogcatAddress=function(e){var t=e.instanceId,n=e.recentDays;return this.operator.getInstanceDownloadLogcatAddress({instanceId:t,recentDays:n})},e.prototype.setLocation=function(e){var t,n,o,r,i;return n=this,o=void 0,i=function(){return function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}}(this,(function(n){return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?[2,this.operator.batchTask({taskType:"ModifyGPS",params:e})]:[2,{Code:1,Message:"params object is empty"}]}))},new((r=void 0)||(r=Promise))((function(e,t){function s(e){try{c(i.next(e));}catch(e){t(e);}}function a(e){try{c(i.throw(e));}catch(e){t(e);}}function c(t){var n;t.done?e(t.value):(n=t.value,n instanceof r?n:new r((function(e){e(n);}))).then(s,a);}c((i=i.apply(n,o||[])).next());}))},e.prototype.setResolution=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ModifyResolution",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.paste=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"Paste",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.setSensor=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ModifySensor",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.sendClipboard=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"SendClipboard",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.shake=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"Shake",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.sendTransMessage=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"SendTransMessage",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.describeInstanceProperties=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DescribeInstanceProperties",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.modifyInstanceProperties=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ModifyInstanceProperties",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.listUserApps=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ListUserApps",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.modifyKeepFrontAppStatus=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ModifyKeepFrontAppStatus",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.describeKeepFrontAppStatus=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DescribeKeepFrontAppStatus",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.unInstallByPackageName=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"UnInstallByPackageName",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.startApp=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"StartApp",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.stopApp=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"StopApp",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.clearAppData=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ClearAppData",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.enableApp=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"EnableApp",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.disableApp=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DisableApp",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.startCameraMediaPlay=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"StartCameraMediaPlay",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.stopCameraMediaPlay=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"StopCameraMediaPlay",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.describeCameraMediaPlayStatus=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DescribeCameraMediaPlayStatus",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.displayCameraImage=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DisplayCameraImage",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.addKeepAliveList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"AddKeepAliveList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.removeKeepAliveList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"RemoveKeepAliveList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.setKeepAliveList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"SetKeepAliveList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.describeKeepAliveList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DescribeKeepAliveList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.clearKeepAliveList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ClearKeepAliveList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.mute=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"Mute",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.mediaSearch=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"MediaSearch",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.reboot=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"Reboot",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.listAllApps=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ListAllApps",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.moveAppBackground=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"MoveAppBackground",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.addAppInstallBlackList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"AddAppInstallBlackList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.removeAppInstallBlackList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"RemoveAppInstallBlackList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.setAppInstallBlackList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"SetAppInstallBlackList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.describeAppInstallBlackList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"DescribeAppInstallBlackList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.clearAppInstallBlackList=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"ClearAppInstallBlackList",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.getNavVisibleStatus=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"GetNavVisibleStatus",params:e}):{Code:1,Message:"params object is empty"}},e.prototype.getSystemMusicVolume=function(e){var t;return (null===(t=Object.keys(e))||void 0===t?void 0:t.length)?this.operator.batchTask({taskType:"GetSystemMusicVolume",params:e}):{Code:1,Message:"params object is empty"}},e}(),Rr=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Mr=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Dr=function(){function e(){this.socket=null,this.requestMap=new Map,this.heartbeatTimer=null,this.connectionStatus=null,this.serverAddress={url:De,token:""},this.reconnectTimes=0,this.lastReconnectTime=+new Date,this.logger=function(){};}return Object.defineProperty(e.prototype,"ConnectionStatus",{get:function(){return this.connectionStatus},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"IsConnected",{get:function(){return this.connectionStatus===_e.Connected},enumerable:false,configurable:true}),e.prototype.createSocket=function(e){var t=void 0===e?{}:e,n=t.url,o=void 0===n?"":n,r=t.protocols,i=void 0===r?["accelerator-v1"]:r,s=t.token,a=void 0===s?this.serverAddress.token:s;return Rr(this,void 0,void 0,(function(){var e=this;return Mr(this,(function(t){return a?this.connectionStatus===_e.Connecting?(this.logger("Shadow socket is connecting"),[2]):(this.logger("createSocket",{url:o,token:a}),o&&(this.serverAddress.url=o),a&&(this.serverAddress.token=a),this.connectionStatus=_e.Connecting,[2,new Promise((function(t){var n="".concat(e.serverAddress.url,"?token=").concat(e.serverAddress.token);e.logger("createSocket url",n),e.socket=new WebSocket(n,i),e.socket.onopen=function(){e.logger("socket onopen"),e.connectionStatus=_e.Connected,e.reconnectTimes=0,t({code:0,message:"onopen"});},e.socket.onmessage=function(t){var n=t.data;try{var o=JSON.parse(n),r=o.Action,i=o.Data,s=o.RequestId;e.handleMessage({Action:r,Data:i,RequestId:s});}catch(t){e.logger("Parse message error",t.message);}},e.socket.onclose=function(n){var o=void 0===n?{}:n,r=o.code,i=o.reason;e.logger("socket onclose",r,i),e.close(),e.connectionStatus=_e.Disconnected,r===Pr.ConnectTimeout||r===Pr.AuthenticationFailed?e.logger("Server closed connection with code ".concat(r,", no auto-reconnect")):e.autoReconnect(),t({code:1,message:"onclose"});},e.socket.onerror=function(){e.connectionStatus=_e.Disconnected,t({code:2,message:"onerror"});};}))]):[2]}))}))},e.prototype.sendRequest=function(e){var t=e.Action,n=e.Data,o=e.Callback,r=n.RequestId||qn();this.sendMessage({Action:t,Data:n,RequestId:r}),o&&this.requestMap.set(r,o);},e.prototype.close=function(e){var t,n,o=(void 0===e?{}:e).code;o?null===(t=this.socket)||void 0===t||t.close(o):null===(n=this.socket)||void 0===n||n.close(),this.clearIntervals(),this.requestMap.clear();},e.prototype.autoReconnect=function(){return Rr(this,void 0,void 0,(function(){var e;return Mr(this,(function(t){switch(t.label){case 0:return this.logger("Shadow socket autoReconnect ->",this.connectionStatus),this.connectionStatus===_e.Connecting?[2]:(e=+new Date-this.lastReconnectTime)<5e3?[4,at(5e3-e)]:[3,2];case 1:t.sent(),t.label=2;case 2:return this.reconnectTimes>=6?(this.logger("Shadow socket autoReconnect -> Exceeded max reconnect times 6, no more reconnect, manual reconnect required"),[2]):(this.createSocket({url:this.serverAddress.url,token:this.serverAddress.token}),this.connectionStatus=_e.Connecting,this.lastReconnectTime=+new Date,this.reconnectTimes=this.reconnectTimes+1,[2])}}))}))},e.prototype.setLogger=function(e){ void 0===e&&(e=console.log),this.logger=e;},e.prototype.handleMessage=function(e){var t=e.Action,n=e.Data,o=e.RequestId;"Kick"===t&&this.close({code:4001});var r=this.requestMap.get(o);r&&(r(n),this.requestMap.delete(o));},e.prototype.sendMessage=function(e){var t,n=e.Action,o=e.Data,r=e.RequestId;if((null===(t=this.socket)||void 0===t?void 0:t.readyState)===WebSocket.OPEN){var i={Action:n,Data:o,RequestId:r};this.socket.send(JSON.stringify(i));}},e.prototype.startHeartbeatReport=function(){var e=this;clearInterval(this.heartbeatTimer),this.heartbeatTimer=setInterval((function(){return Rr(e,void 0,void 0,(function(){return Mr(this,(function(e){return this.sendMessage({Action:"Heartbeat",Data:{}}),[2]}))}))}),5e3);},e.prototype.clearIntervals=function(){clearInterval(this.heartbeatTimer);},e}();window.TCGShadowSocket||(window.TCGShadowSocket=new Dr);const Ir=window.TCGShadowSocket;var Pr;!function(e){e[e.ConnectTimeout=4001]="ConnectTimeout",e[e.AuthenticationFailed=4002]="AuthenticationFailed";}(Pr||(Pr={}));var xr=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Or=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Ar=function(){function e(){this.socket=null,this.requestMap=new Map,this.heartbeatTimer=null,this.connectionStatus=null,this.serverAddress={url:"wss://metrics-cloud-gaming.crtrcloud.com/ws/report",token:""},this.reconnectTimes=0,this.lastReconnectTime=+new Date,this.reportTimer=null,this.logger=function(){};}return Object.defineProperty(e.prototype,"ConnectionStatus",{get:function(){return this.connectionStatus},enumerable:false,configurable:true}),Object.defineProperty(e.prototype,"IsConnected",{get:function(){return this.connectionStatus===_e.Connected},enumerable:false,configurable:true}),e.prototype.createSocket=function(e){var t=void 0===e?{}:e,n=t.url,o=void 0===n?"":n,r=t.token,i=void 0===r?this.serverAddress.token:r;return xr(this,void 0,void 0,(function(){var e=this;return Or(this,(function(t){return i?this.connectionStatus===_e.Connecting||this.connectionStatus===_e.Connected?(this.logger("Metric socket is connecting"),[2]):(this.logger("createMetricSocket",{url:o,token:i}),o&&(this.serverAddress.url=o),i&&(this.serverAddress.token=i),this.connectionStatus=_e.Connecting,[2,new Promise((function(t){var n="".concat(e.serverAddress.url,"?token=").concat(e.serverAddress.token);e.logger("createMetricSocket url",n),e.socket=new WebSocket(n),e.socket.onopen=function(){e.logger("metric socket onopen"),e.connectionStatus=_e.Connected,e.reconnectTimes=0,t({code:0,message:"onopen"});},e.socket.onmessage=function(t){var n=t.data;try{var o=JSON.parse(n),r=o.Action,i=o.Data,s=o.RequestId;e.handleMessage({Action:r,Data:i,RequestId:s});}catch(t){e.logger("Parse metric message error",t.message);}},e.socket.onclose=function(n){e.logger("metric socket onclose",n.code),e.close(),e.connectionStatus=_e.Disconnected,4001===n.code?e.logger("Server closed connection with code ".concat(n.code,", no auto-reconnect")):e.autoReconnect(),t({code:1,message:"onclose"});},e.socket.onerror=function(){e.connectionStatus=_e.Disconnected,t({code:2,message:"onerror"});};}))]):[2]}))}))},e.prototype.sendMetricRequest=function(e){var t=e.Type,n=e.Payload,o=e.Callback,r=n.RequestId||qn();this.sendMessage({Type:t,Payload:n,RequestId:r}),o&&this.requestMap.set(r,o);},e.prototype.close=function(e){var t,n,o=(void 0===e?{}:e).code;o?null===(t=this.socket)||void 0===t||t.close(o):null===(n=this.socket)||void 0===n||n.close(),this.clearIntervals(),this.requestMap.clear();},e.prototype.autoReconnect=function(){return xr(this,void 0,void 0,(function(){var e;return Or(this,(function(t){switch(t.label){case 0:return this.logger("Metric socket autoReconnect ->",this.connectionStatus),this.connectionStatus===_e.Connecting?[2]:(e=+new Date-this.lastReconnectTime)<5e3?[4,at(5e3-e)]:[3,2];case 1:t.sent(),t.label=2;case 2:return this.reconnectTimes>=6?(this.logger("Metric socket autoReconnect -> Exceeded max reconnect times 6, no more reconnect, manual reconnect required"),[2]):(this.createSocket({url:this.serverAddress.url,token:this.serverAddress.token}),this.connectionStatus=_e.Connecting,this.lastReconnectTime=+new Date,this.reconnectTimes=this.reconnectTimes+1,[2])}}))}))},e.prototype.setLogger=function(e){ void 0===e&&(e=console.log),this.logger=e;},e.prototype.handleMessage=function(e){e.Action;var t=e.Data,n=e.RequestId,o=this.requestMap.get(n);o&&(o(t),this.requestMap.delete(n));},e.prototype.sendMessage=function(e){var t,n=e.Type,o=e.Payload,r=e.RequestId;if((null===(t=this.socket)||void 0===t?void 0:t.readyState)===WebSocket.OPEN){var i={Type:n,Payload:o,RequestId:r};this.socket.send(JSON.stringify(i));}},e.prototype.clearIntervals=function(){clearInterval(this.heartbeatTimer),clearInterval(this.reportTimer);},e}();window.TCGMetricSocket||(window.TCGMetricSocket=new Ar);const Lr=window.TCGMetricSocket;var Gr=function(){var e=function(t,n){return e=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);},e(t,n)};return function(t,n){if("function"!=typeof n&&null!==n)throw new TypeError("Class extends value "+String(n)+" is not a constructor or null");function o(){this.constructor=t;}e(t,n),t.prototype=null===n?Object.create(n):(o.prototype=n.prototype,new o);}}(),Br=function(){return Br=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},Br.apply(this,arguments)},jr=function(e,t,n,o){return new(n||(n=Promise))((function(r,i){function s(e){try{c(o.next(e));}catch(e){i(e);}}function a(e){try{c(o.throw(e));}catch(e){i(e);}}function c(e){var t;e.done?r(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t);}))).then(s,a);}c((o=o.apply(e,[])).next());}))},Fr=function(e,t){var n,o,r,i,s={label:0,sent:function(){if(1&r[0])throw r[1];return r[1]},trys:[],ops:[]};return i={next:a(0),throw:a(1),return:a(2)},"function"==typeof Symbol&&(i[Symbol.iterator]=function(){return this}),i;function a(a){return function(c){return function(a){if(n)throw new TypeError("Generator is already executing.");for(;i&&(i=0,a[0]&&(s=0)),s;)try{if(n=1,o&&(r=2&a[0]?o.return:a[0]?o.throw||((r=o.return)&&r.call(o),0):o.next)&&!(r=r.call(o,a[1])).done)return r;switch(o=0,r&&(a=[2&a[0],r.value]),a[0]){case 0:case 1:r=a;break;case 4:return s.label++,{value:a[1],done:!1};case 5:s.label++,o=a[1],a=[0];continue;case 7:a=s.ops.pop(),s.trys.pop();continue;default:if(!((r=(r=s.trys).length>0&&r[r.length-1])||6!==a[0]&&2!==a[0])){s=0;continue}if(3===a[0]&&(!r||a[1]>r[0]&&a[1]<r[3])){s.label=a[1];break}if(6===a[0]&&s.label<r[1]){s.label=r[1],r=a;break}if(r&&s.label<r[2]){s.label=r[2],s.ops.push(a);break}r[2]&&s.ops.pop(),s.trys.pop();continue}a=t.call(e,s);}catch(e){a=[6,e],o=0;}finally{n=r=0;}if(5&a[0])throw a[1];return {value:a[0]?a[1]:void 0,done:true}}([a,c])}}},Nr=function(e){function t(){var t=e.call(this)||this;return t.version=Re,t.cloudGamingWebRTC=null,t.pageEvent=null,t.cloudGamingWebsocket=null,t.androidInstance=null,t.accessInfo=null,t.shadowSocket=Ir,t.metricSocket=Lr,t.gamepad=null,t.watchdog=null,t.gameConfig=null,t.showStats=null,t.initOptions={mount:null,reconnect:true,autoSwitchCamera:true,autoSwitchMic:true,streaming:{mode:"webrtc",streamName:"high",multiTrack:false,shadowSocket:false},androidInstance:{autoRotateOnPC:true},autoFocusVideo:false,statsInterval:1},t.uuid=null,t.sdkInitStartTime=null,t._mobileGame=false,t._accessTime=0,t.cloudGamingWebRTC=new xt({sdk:t}),t.pageEvent=new en({sdk:t}),t.androidInstance=new _r({sdk:t}),t.accessInfo=new pr({sdk:t}),t.gamepad=new Pn({sdk:t}),t.watchdog=new Ln({sdk:t}),t.gameConfig=new jn({sdk:t}),t.showStats=new vn({sdk:t}),t.cloudGamingWebsocket=new ir({sdk:t}),t.uuid=+new Date,t}return Gr(t,e),Object.defineProperty(t.prototype,"mountPoint",{get:function(){return null===document||void 0===document?void 0:document.querySelector("#".concat(this.initOptions.mount))},enumerable:false,configurable:true}),t.prototype.init=function(e){return jr(this,void 0,void 0,(function(){var t,n,o,r,i,s;return Fr(this,(function(a){switch(a.label){case 0:return this.sdkInitStartTime=+new Date,this.initOptions=Br(Br({},this.initOptions),e),t=e.mount,n=e.loadingText,o=e.showLoading,r=e.restartText,i=e.accessToken,s=e.mobileGame,this._mobileGame=s,this.log("init tcgsdk version->",Re,"options->",this.initOptions),this.log("webrtc-adapter",pe.browserDetails.browser,pe.browserDetails.version),this.log("userAgent",null===navigator||void 0===navigator?void 0:navigator.userAgent),e.onLog&&this.setExternalLog(e.onLog),this.isStreamingMultiTrack||this.mountGamePoint({mount:t,loadingText:n,showLoading:o,restartText:r}),(null==i?void 0:i.accessInfo)?(this.accessInfo.setInstanceAccessInfo({AccessInfo:i.accessInfo,Token:i.token}),this.initOptions.streaming.shadowSocket?[4,this.createShadowSocket({token:i.token})]:[3,2]):[3,2];case 1:a.sent(),a.label=2;case 2:return this.pageEvent.init(e),this.showStats.init({mount:this.initOptions.mount}),this.watchdog.init({mount:this.initOptions.mount}),this.androidInstance.init(e),"webrtc"!==this.streamingMode||this.isStreamingMultiTrack?[3,4]:[4,this.cloudGamingWebRTC.init(e)];case 3:return a.sent(),[3,5];case 4:this.cloudGamingWebsocket.init({mount:this.initOptions.mount}),this.onInitSuccess({code:0,msg:"ok"}),a.label=5;case 5:return this.setDebugMode(e.debugSetting),[2]}}))}))},t.prototype.initShowStats=function(){this.showStats=new vn({sdk:this}),this.showStats.init({mount:this.initOptions.mount});},Object.defineProperty(t.prototype,"streamingMode",{get:function(){var e;return (null===(e=this.initOptions.streaming)||void 0===e?void 0:e.mode)||"webrtc"},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"initStartTime",{get:function(){return this.cloudGamingWebRTC.webrtcStartTime},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"accessTime",{get:function(){return this._accessTime},set:function(e){this._accessTime=e;},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"isMobileGame",{get:function(){return this._mobileGame},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"isStreamingMultiTrack",{get:function(){var e;return null===(e=this.initOptions.streaming)||void 0===e?void 0:e.multiTrack},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"mobileGame",{set:function(e){this._mobileGame=e;},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"getTCGShadowSocket",{get:function(){return this.shadowSocket},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"isTCGShadowSocketConnected",{get:function(){var e,t;return !!(null===(e=this.getTCGShadowSocket)||void 0===e?void 0:e.IsConnected)||(null===(t=this.getTCGShadowSocket)||void 0===t||t.createSocket({token:this.accessInfo.accessToken}),false)},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"getTCGMetricSocket",{get:function(){return this.metricSocket},enumerable:false,configurable:true}),Object.defineProperty(t.prototype,"isTCGMetricSocketConnected",{get:function(){var e,t;if(null===(e=this.getTCGMetricSocket)||void 0===e?void 0:e.IsConnected)return  true;var n=this.getServerSession().metric_key;return null===(t=this.getTCGMetricSocket)||void 0===t||t.createSocket({token:n}),false},enumerable:false,configurable:true}),t.prototype.getIsMobileGame=function(){return this._mobileGame},t.prototype.getAndroidInstance=function(){return this.androidInstance},t.prototype.getInitOptions=function(){return this.initOptions},t.prototype.getClientSession=function(){return this.cloudGamingWebRTC.getClientSideDescription(true)},t.prototype.getServerSession=function(e){var t=(void 0===e?ft:e).clientId,n=void 0===t?this.initOptions.mount:t;return this.gameConfig.getConfig({clientId:n})},t.prototype.start=function(e){ void 0===e&&(e=""),this.accessTime=+new Date,this.showStats.addEventReport({event_code:"start"}),this.cloudGamingWebRTC.connect(e);},t.prototype.setAccessToken=function(e){var t=e.accessInfo,n=e.token;this.accessInfo.setInstanceAccessInfo({AccessInfo:t,Token:n});},t.prototype.access=function(e){var t=e.instanceId,n=void 0===t?"":t,o=e.instanceIds,r=void 0===o?[]:o,i=e.groupControl,s=void 0!==i&&i,a=e.multiTrack,c=void 0!==a&&a;return jr(this,void 0,void 0,(function(){var e,t,o,i,a,d,l,u,h,p,f,m,v,g,y,b,k;return Fr(this,(function(S){switch(S.label){case 0:if(this.accessTime=+new Date,this.showStats.addEventReport({event_code:"access",i1:s?1:0}),"websocket"===this.streamingMode)return e=this.accessInfo.getInstanceAccessInfo({instanceId:s?r[0]:n}),t=e.Token,o=e.WebSocketAddress,i=e.WebSocketSecureAddress,a=i,"http:"===window.location.protocol&&(a=o),s?(d=this.accessInfo.getTokenInfos({instanceIds:r}),[2,this.androidInstance.groupControl.startWebSocket({tokenInfos:d,url:a,instanceIds:r})]):[2,this.cloudGamingWebsocket.connect({url:a,protocols:["media-v1"],token:t,instanceId:n,videoCodecList:this.initOptions.streaming.videoCodecList})];if(!s)return [3,5];S.label=1;case 1:return S.trys.push([1,3,,4]),[4,this.accessInfo.createWebRTCGroupSession({instanceIds:r,clientSessions:[this.getClientSession()]})];case 2:return l=S.sent(),u=l.GroupControlId,f=l.ServerSessions,y=l.Code,b=l.Message,0===y?this.androidInstance.groupControl.start({instanceIds:r,groupControlId:u,serverSessions:f}):this.onConnectFailed({code:y,msg:b}),[3,4];case 3:return h=S.sent(),this.onConnectFailed({code:be.FETCH_ERROR,msg:"fetch group server session error, ".concat(h.message)}),[3,4];case 4:return [2];case 5:if(!c)return [3,11];S.label=6;case 6:return S.trys.push([6,9,,10]),[4,this.cloudGamingWebRTC.newWebRtcConnection({instanceIds:r,type:"multi"})];case 7:return S.sent(),[4,this.accessInfo.createWebRTCMultiTrackSession({instanceIds:r,clientSessions:[this.getClientSession()]})];case 8:return p=S.sent(),f=p.ServerSessions,y=p.Code,b=p.Message,0===y?this.cloudGamingWebRTC.connect(f[0]):this.onConnectFailed({code:y,msg:b}),[3,10];case 9:return m=S.sent(),this.onConnectFailed({code:be.FETCH_ERROR,msg:"fetch group server session error, ".concat(m.message)}),[3,10];case 10:return [2];case 11:return S.trys.push([11,13,,14]),[4,this.accessInfo.createWebRTCSession({instanceId:n,clientSession:this.getClientSession()})];case 12:return v=S.sent(),g=v.ServerSession,y=v.Code,b=v.Message,0===y?this.cloudGamingWebRTC.connect(g):this.onConnectFailed({code:y,msg:b}),[3,14];case 13:return k=S.sent(),this.onConnectFailed({code:be.FETCH_ERROR,msg:"fetch server session error, ".concat(k.message)}),[3,14];case 14:return [2]}}))}))},t.prototype.createShadowSocket=function(e){var t=e.token,n=void 0===t?"":t,o=e.url,r=void 0===o?De:o;return jr(this,void 0,void 0,(function(){return Fr(this,(function(e){switch(e.label){case 0:return this.isTCGShadowSocketConnected?[3,2]:[4,this.shadowSocket.createSocket({token:n,url:r})];case 1:return [2,e.sent()];case 2:return [2,{code:0,message:"ok"}]}}))}))},t.prototype.createMetricSocket=function(e){var t=(void 0===e?{}:e).token,n=void 0===t?"":t;return jr(this,void 0,void 0,(function(){return Fr(this,(function(e){switch(e.label){case 0:return this.isTCGMetricSocketConnected?[3,2]:[4,this.metricSocket.createSocket({token:n})];case 1:return [2,e.sent()];case 2:return [2,{code:0,message:"ok"}]}}))}))},t.prototype.destroy=function(e){var t=void 0===e?ft:e,n=t.message,o=void 0===n?"主动关闭":n,r=t.code,i=void 0===r?ye.MANUAL_CLOSE:r;this.log("destroy->","message: ",o,"code: ",i),"webrtc"===this.streamingMode?this.cloudGamingWebRTC.disconnected({message:o,code:i}):this.cloudGamingWebsocket.destroy({message:o,code:i}),this.androidInstance.groupControl.destroy();},t.prototype.reconnect=function(){"webrtc"===this.streamingMode?this.cloudGamingWebRTC.reconnect({message:"manual reconnect"}):this.cloudGamingWebsocket.reconnect({message:"manual reconnect"});},t.prototype.gameRestart=function(){this.log("gameRestart->"),this.cloudGamingWebRTC.sendAckData({data:{type:"game_op",op:"restart"}}),this.clearRemoteKeys();},t.prototype.gamePause=function(e){var t=(void 0===e?ft:e).media;this.log("gamePause->"),this.cloudGamingWebRTC.sendAckData({data:{type:"game_op",op:"pause",media:t}}),this.cloudGamingWebRTC.setGameStatus("pause"),this.clearRemoteKeys();},t.prototype.gameResume=function(e){var t=(void 0===e?ft:e).media;this.log("gameResume->"),this.cloudGamingWebRTC.sendAckData({data:{type:"game_op",op:"resume",media:t}}),this.cloudGamingWebRTC.setGameStatus("playing"),this.clearRemoteKeys();},t.prototype.sendKeyboardEvent=function(e){var t=e.key,n=e.down,o=e.location,r=void 0===o?0:o;"websocket"===this.streamingMode?this.cloudGamingWebsocket.dataChannelSend({label:ke.KM,data:{type:"keyboard",key:t,down:n,location:r}}):this.cloudGamingWebRTC.sendKmData({type:"keyboard",key:t,down:n,location:r});},t.prototype.sendMouseEvent=function(e){var t=e.type,n=e.down,o=e.delta;this.cloudGamingWebRTC.sendKmData({type:t,down:n,delta:o});},t.prototype.sendGamepadEvent=function(e){var t=e.type,n=e.down,o=e.key,r=e.x,i=e.y;this.cloudGamingWebRTC.sendKmData({type:t,down:n,key:o,x:r,y:i});},t.prototype.sendRawEvent=function(e){switch(this.log("sendRawEvent->",e),"object"!=typeof e&&console.error("data is not an object"),true){case "keyboard"===e.type:this.sendKeyboardEvent(e);break;case e.type.includes("mouse"):this.sendMouseEvent(e);break;case e.type.includes("gamepad")||e.type.includes("axis")||e.type.includes("lt")||e.type.includes("rt"):this.sendGamepadEvent(e);break;default:this.cloudGamingWebRTC.sendAckData({data:e});}},t.prototype.sendKmData=function(e){this.cloudGamingWebRTC.sendKmData(e);},t.prototype.setMoveSensitivity=function(e){this.log("setMoveSensitivity->",e),"number"!=typeof e&&console.error("input value must be number"),(e-.01<Number.EPSILON||e-100>Number.EPSILON)&&console.error("sensitivity is out of range"),this.pageEvent.setMoveSensitivity(e);},t.prototype.sendSeqRawEvents=function(e){this.log("sendSeqRawEvents->",e),this.cloudGamingWebRTC.sendKmData({type:"key_seq",keys:e.map((function(e){return JSON.stringify(e)}))});},t.prototype.getMoveSensitivity=function(){return this.pageEvent?1/this.pageEvent.getMoveSensitivity():1},t.prototype.setMouseCanLock=function(e){this.log("setMouseCanLock->",e),this.cloudGamingWebRTC.lockMouse(e),this.cloudGamingWebRTC.setForceShowCursor(!e);},t.prototype.lockMouse=function(e){this.log("lockMouse->",e),this.cloudGamingWebRTC.setForceLockCursor(e),this.cloudGamingWebRTC.lockMouse(e);},t.prototype.mouseMove=function(e,t,n,o){this.pageEvent.mouseMove(e,t,n,o);},t.prototype.setRemoteCursor=function(e){ void 0===e&&(e=0),this.log("setRemoteCursor->",e),this.cloudGamingWebRTC.setCursorMode(e);},t.prototype.setCursorShowStat=function(e){this.log("setCursorShowStat->",e),this.cloudGamingWebRTC.setForceShowCursor(e);},t.prototype.setCursorShowStatus=function(e){this.log("setCursorShowStat->",e),this.cloudGamingWebRTC.setForceShowCursor(e);},t.prototype.setCursorState=function(e){"forceShow"===e&&(this.cloudGamingWebRTC.setForceShowCursor(true),this.lockMouse(false)),"forceLock"===e&&(this.cloudGamingWebRTC.setForceShowCursor(false),this.lockMouse(true)),"auto"===e&&(this.cloudGamingWebRTC.setForceShowCursor(false),this.cloudGamingWebRTC.setForceLockCursor(false));},t.prototype.getCursorShowStat=function(){return this.log("getCursorShowStat->",this.cloudGamingWebRTC.getCursorShowStatus()),this.cloudGamingWebRTC.getCursorShowStatus()},t.prototype.setMobileCursorScale=function(e){this.log("setMobileCursorScale->",e),this.cloudGamingWebRTC.setMobileCursorScale(e);},t.prototype.setRemoteCursorStyle=function(e){this.log("setRemoteCursorStyle->",e),this.cloudGamingWebRTC.sendAckData({data:{type:"set_pointer_style",style:e}});},t.prototype.clearRemoteKeys=function(){this.log("clearRemoteKeys->"),this.pageEvent.clearRemoteKeys();},t.prototype.resetRemoteCapsLock=function(){this.log("resetRemoteCapsLock->"),this.cloudGamingWebRTC.sendAckData({data:{type:"reset_capslock"}});},t.prototype.setDefaultCursorImage=function(e){this.log("setDefaultCursorImage->",e),e&&this.cloudGamingWebRTC.setDefaultCursorImage(e);},t.prototype.setKMStatus=function(e){var t=e.keyboard,n=void 0===t||t,o=e.mouse,r=void 0===o||o;this.pageEvent.setKMStatus({keyboard:n,mouse:r});},t.prototype.setKeyboardBanList=function(e){var t=e.keyList;this.pageEvent.setKeyboardBanList({keyList:t});},t.prototype.setPaste=function(e){this.pageEvent.setPaste(e);},t.prototype.mobileTouchMove=function(e){var t=e.finger_id,n=e.event_type,o=e.x,r=e.y,i=this.pageEvent.remoteScreenSize,s=i.width,a=i.height;this.pageEvent.mobileTouchMove({finger_id:t,event_type:n,x:o,y:r,width:s,height:a,timestamp:+new Date});},t.prototype.setDebugMode=function(e){var t=void 0===e?{}:e,n=t.showStats,o=void 0!==n&&n,r=t.showLog,i=void 0!==r&&r,s=t.showOnAckMessage,a=void 0!==s&&s,c=t.showOnCdMessage,d=void 0!==c&&c,l=t.showOnHbMessage,u=void 0!==l&&l,h=t.showOnKmMessage,p=void 0!==h&&h,f=t.showOnSvMessage,m=void 0!==f&&f,v=t.showOnCloudDeviceMessage,g=void 0!==v&&v,y=t.showSendAckData,b=void 0!==y&&y,k=t.showSendHbData,S=void 0!==k&&k,C=t.showSendKmData,w=void 0!==C&&C,T=t.showSendCloudDeviceData,E=void 0!==T&&T,_=t.showMuxer,R=void 0!==_&&_;this.showStats.show(o),this.initOptions.debugSetting||(this.initOptions.debugSetting={}),this.initOptions.debugSetting=Br(Br({},this.initOptions.debugSetting),{showLog:i,showOnAckMessage:a,showOnCdMessage:d,showOnHbMessage:u,showOnKmMessage:p,showOnSvMessage:m,showOnCloudDeviceMessage:g,showSendAckData:b,showSendHbData:S,showSendKmData:w,showSendCloudDeviceData:E,showMuxer:R});},t.prototype.reportLog=function(){return this.log("reportLog, user manual upload"),this.reportLogInner()},t.prototype.setLogHandler=function(e){ void 0===e&&(e=lt),this.log("setLogHandler"),this.setExternalLog(e);},t.prototype.toggleMetricReportBulk=function(e){ void 0===e&&(e=false),this.showStats.toggleMetricReportBulk(e);},t.prototype.playVideo=function(e){var t=this.getVideoElement();return "play"===e?null==t?void 0:t.play():"pause"===e?null==t?void 0:t.pause():void 0},t.prototype.playAudio=function(e){var t=this.getAudioElement();"play"===e&&(null==t||t.play()),"pause"===e&&(null==t||t.pause());var n=this.getHuaweiAudioElement();n&&("play"===e&&n.play(),"pause"===e&&n.pause());},t.prototype.setVideoOrientation=function(e){var t=void 0===e?{}:e,n=t.deg,o=void 0===n?0:n,r=t.rotateContainer,i=void 0===r||r,s=t.rotateMountPoint,a=void 0!==s&&s;this.log("setVideoOrientation",o,i),this.pageEvent.setVideoOrientation({deg:o,rotateContainer:i,rotateMountPoint:a});},t.prototype.getPageSize=function(){return {width:window.innerWidth,height:window.innerHeight}},t.prototype.setStreamProfile=function(e,t){var n,o;void 0===t&&(t=lt),this.log("setStreamProfile->",e);var r=this.pageEvent.getRemoteScreenConfig().deg,i=e.video_width,s=e.video_height;90===r||270===r?null===(n=this.cloudGamingWebRTC)||void 0===n||n.sendAckData({data:Br(Br({},e),{video_width:s,video_height:i,type:"res_mode"}),callback:t}):null===(o=this.cloudGamingWebRTC)||void 0===o||o.sendAckData({data:Br(Br({},e),{type:"res_mode"}),callback:t});},t.prototype.getDisplayRect=function(){return this.cloudGamingWebRTC.getDisplayRect()},t.prototype.setVideoVolume=function(e){this.log("setVideoVolume->",e),this.getVideoElement().volume=e,0===e?(this.getVideoElement().muted=true,"websocket"===this.streamingMode&&(this.getAudioElementWebsocket().muted=true,this.getAudioElementWebsocket().volume=e),this.pageEvent.setVideoMuted(true)):(this.getVideoElement().muted=false,"websocket"===this.streamingMode&&(this.getAudioElementWebsocket().volume=e),this.pageEvent.setVideoMuted(false),this.playVideo("play"));},t.prototype.setAudioVolume=function(e){this.log("setAudioVolume->",e);var t=this.getHuaweiAudioElement();t&&(this.log("huawei setVideoVolume->",e),t.volume=e);var n=this.getAudioElement();n.volume=e,0===e?(n.muted=true,"websocket"===this.streamingMode&&(this.getAudioElementWebsocket().muted=true,this.getAudioElementWebsocket().volume=e),this.pageEvent.setVideoMuted(true)):(n.muted=false,"websocket"===this.streamingMode&&(this.getAudioElementWebsocket().volume=e),this.pageEvent.setVideoMuted(false),this.playAudio("play"));},t.prototype.getAudioVolume=function(){var e;return null!==(e=this.getAudioElement().volume)&&void 0!==e?e:0},t.prototype.getVideoVolume=function(){var e;return null!==(e=this.getVideoElement().volume)&&void 0!==e?e:0},t.prototype.switchMic=function(e){var t=e.status,n=e.profile;return this.cloudGamingWebRTC.switchMic({status:t,profile:n})},t.prototype.switchCamera=function(e){var t=e.status,n=e.profile;return this.cloudGamingWebRTC.switchCamera({status:t,profile:n})},t.prototype.setMicProfile=function(e){return this.cloudGamingWebRTC.setMicProfile(e)},t.prototype.setCameraProfile=function(e){return this.cloudGamingWebRTC.setCameraProfile(e)},t.prototype.getDevices=function(){return this.cloudGamingWebRTC.getDevices()},t.prototype.setPageBackground=function(e){ void 0===e&&(e=""),this.log("setPageBackground->",e);var t=this.getCloudGamingStreamContainerElement();t&&(t.style.background="url(".concat(e,")"));},t.prototype.sendText=function(e,t){ void 0===e&&(e=""),void 0===t&&(t=lt),this.log("sendText",e),"webrtc"===this.streamingMode?this.cloudGamingWebRTC.sendAckData({data:{type:"paste",content:e},callback:t}):this.cloudGamingWebsocket.dataChannelSend({label:ke.ACK,data:{type:"paste",content:e}});},t.prototype.setClientInteractMode=function(e){ void 0===e&&(e="cursor"),this.log("setClientInteractMode->",e),this.pageEvent.setClientInteractMode(e);},t.prototype.setRemoteDesktopResolution=function(e){var t=this,n=e.width,o=e.height;return this.log("setRemoteDesktopResolution, width",n,"height",o),new Promise((function(e){t.cloudGamingWebRTC.sendAckData({data:{type:"desktop_res",width:Math.floor(n),height:Math.floor(o)},callback:function(t){var n=t.data;e(void 0===n?{code:-1}:n);}});}))},t.prototype.getRemoteStreamResolution=function(){if(this.getVideoElement().videoWidth&&this.getVideoElement().videoHeight)return {width:this.getVideoElement().videoWidth,height:this.getVideoElement().videoHeight};var e=this.gameConfig.getConfig({clientId:this.initOptions.mount}).video,t=void 0===e?{}:e,n=t.width,o=void 0===n?0:n,r=t.height;return {width:o,height:void 0===r?0:r}},t.prototype.reshapeWindow=function(e){ void 0===e&&(e="user"),this.pageEvent.reshapeWindow(e);},t.prototype.getUserMedia=function(){return this.cloudGamingWebRTC.getUserMedia()},t.prototype.screenShot=function(e){var t=e.name,n=void 0===t?"tcgsdk-".concat(+new Date):t,o=e.width,r=void 0===o?this.getVideoElement().videoWidth:o,i=e.height,s=void 0===i?this.getVideoElement().videoHeight:i,a=function(e,t){var n=document.createElement("canvas");return n.width=e,n.height=t,n}(r,s);a.getContext("2d").drawImage(this.getVideoElement(),0,0,r,s);var c=document.createElement("a");c.setAttribute("download","".concat(n,".png")),a.toBlob((function(e){var t=URL.createObjectURL(e);c.setAttribute("href",t),c.click();}));},t.prototype.createCustomDataChannel=function(e){var t=e.destPort,n=e.maxRetransmits,o=e.maxPacketLifeTime,r=e.onMessage,i=e.protocol,s=void 0===i?"text":i,a=e.type,c=void 0===a?"":a;return jr(this,void 0,void 0,(function(){var e,i,a,d=this;return Fr(this,(function(l){switch(l.label){case 0:return [4,this.cloudGamingWebRTC.createCustomDataChannel({destPort:t,maxRetransmits:n,maxPacketLifeTime:o,protocol:s,type:c,onMessage:r,onError:function(e){d.log("createCustomDataChannel onerror",e);},onClose:function(e){d.log("createCustomDataChannel onclose",e);}})];case 1:return e=l.sent(),i=e.code,a=e.msg,[2,{sendMessage:function(e){d.cloudGamingWebRTC.sendCustomDataChannelMessage({destPort:t,msg:e});},code:i,msg:a}]}}))}))},t.prototype.getPlayerVolume=function(e){return document.getElementById("".concat(e,"A")).volume},t.prototype.setPlayerVolume=function(e,t){this.log("setPlayerVolume->",t);var n=document.getElementById("".concat(e,"A"));0===t?n.muted=true:(n.muted=false,n.volume=t,n.play());},t.prototype.getSeats=function(){var e=this;return new Promise((function(t){e.cloudGamingWebRTC.sendAckData({data:{type:"sync_seats"},callback:function(e){var n=e.code,o=e.data,r=o.players,i=o.viewers;0===n&&t({players:r,viewers:i});}});}))},t.prototype.submitSeatChange=function(e){var t=this,n=e.user_id,o=e.to_role,r=e.seat_index,i=void 0===r?0:r;return new Promise((function(e){t.cloudGamingWebRTC.sendAckData({data:{type:"submit_seat_change",user_id:n,to_role:o,seat_index:i},callback:function(n){var o=n.data,r=void 0===o?{code:-1}:o;t.log("submit_seat_change res",r),e(r);}});}))},t.prototype.seatChange=function(e){var t=this,n=e.user_id,o=e.to_role,r=e.seat_index,i=void 0===r?0:r;return new Promise((function(e){t.cloudGamingWebRTC.sendAckData({data:{type:"seat_change",user_id:n,to_role:o,seat_index:i},callback:function(n){var o=n.data,r=void 0===o?{code:-1}:o;t.log("seat_change res",r),e(r);}});}))},t.prototype.changeMicStatus=function(e){var t=this,n=e.status,o=e.user_id;return new Promise((function(e){t.cloudGamingWebRTC.sendAckData({data:{type:"mic_status",user_id:o,status:n},callback:function(n){var o=n.data,r=void 0===o?{code:-1}:o,i=r.code,s=r.status,a=r.user_id,c=t.gameConfig.getConfig({clientId:t.initOptions.mount}).user_id;0===i&&a===c&&(t.log("changeMicStatus",r),0!==s&&1!==s||a&&t.cloudGamingWebRTC.setTrackEnable({type:"audio",enable:false}),2===s&&a&&t.cloudGamingWebRTC.setTrackEnable({type:"audio",enable:true})),e(r);}});}))},t.prototype.onInitSuccess=function(e){var t,n;null===(n=(t=this.initOptions).onInitSuccess)||void 0===n||n.call(t,e),this.trigger("InitSuccess",e);},t.prototype.onConnectSuccess=function(e){var t,n;this.log("onConnectSuccess ->"),null===(n=(t=this.initOptions).onConnectSuccess)||void 0===n||n.call(t,e),this.trigger("ConnectSuccess",e),this.androidInstance.groupControl.groupControlId&&"webrtc"===this.streamingMode&&this.androidInstance.groupControl.onConnectSuccess();},t.prototype.onDisconnect=function(e){var t,n;null===(n=(t=this.initOptions).onDisconnect)||void 0===n||n.call(t,e),this.trigger("Disconnected",e);},t.prototype.onConnectFailed=function(e){var t,n;null===(n=(t=this.initOptions).onConnectFail)||void 0===n||n.call(t,e),this.trigger("ConnectFailed",e),this.showStats.addEventReport({event_code:"session_close",event_result_msg:e.msg,event_result_code:"".concat(e.code)});},t.prototype.onEvent=function(e){var t,n;null===(n=(t=this.initOptions).onEvent)||void 0===n||n.call(t,e),this.trigger("Event",e);},t.prototype.onOrientationChange=function(e){var t,n;null===(n=(t=this.initOptions).onOrientationChange)||void 0===n||n.call(t,e),this.trigger("OrientationChange",e);},t.prototype.onVisibilityChange=function(e){var t,n;null===(n=(t=this.initOptions).onVisibilityChange)||void 0===n||n.call(t,e),this.trigger("VisibilityChange",e);},t.prototype.onNetworkChange=function(e){var t,n;null===(n=(t=this.initOptions).onNetworkChange)||void 0===n||n.call(t,e),this.trigger("NetworkChange",e);},t.prototype.onWebrtcStatusChange=function(e){var t,n,o,r;null===(n=(t=this.initOptions).onWebrtcStat)||void 0===n||n.call(t,e),null===(r=(o=this.initOptions).onWebrtcStatusChange)||void 0===r||r.call(o,e),this.trigger("WebrtcStatusChange",e);},t.prototype.onGameStartComplete=function(e){var t,n;null===(n=(t=this.initOptions).onGameStartComplete)||void 0===n||n.call(t,e),this.trigger("GameStartComplete",e);},t.prototype.onGameStop=function(e){var t,n;null===(n=(t=this.initOptions).onGameStop)||void 0===n||n.call(t,e),this.trigger("GameStop",e);},t.prototype.onLoadGameArchive=function(e){var t,n;null===(n=(t=this.initOptions).onLoadGameArchive)||void 0===n||n.call(t,e),this.trigger("LoadGameArchive",e);},t.prototype.onSaveGameArchive=function(e){var t,n;null===(n=(t=this.initOptions).onSaveGameArchive)||void 0===n||n.call(t,e),this.trigger("SaveGameArchive",e);},t.prototype.onInputStatusChange=function(e){var t,n;null===(n=(t=this.initOptions).onInputStatusChange)||void 0===n||n.call(t,e),this.trigger("InputStatusChange",e);},t.prototype.onTouchEvent=function(e){var t,n;null===(n=(t=this.initOptions).onTouchEvent)||void 0===n||n.call(t,e),this.trigger("TouchEvent",e);},t.prototype.onCursorShowStatChange=function(e){var t,n;null===(n=(t=this.initOptions).onCursorShowStatChange)||void 0===n||n.call(t,e),this.trigger("CursorShowStatChange",e);},t.prototype.onGamepadConnectChange=function(e){var t,n;null===(n=(t=this.initOptions).onGamepadConnectChange)||void 0===n||n.call(t,e),this.trigger("GamepadConnectChange",e);},t.prototype.onConfigurationChange=function(e){var t,n;null===(n=(t=this.initOptions).onConfigurationChange)||void 0===n||n.call(t,e),this.trigger("ConfigurationChange",e);},t.prototype.onRemoteScreenResolutionChange=function(e){var t,n;null===(n=(t=this.initOptions).onRemoteScreenResolutionChange)||void 0===n||n.call(t,e),this.trigger("RemoteScreenResolutionChange",e);},t.prototype.onVideoStreamConfigChange=function(e){var t,n;null===(n=(t=this.initOptions).onVideoStreamConfigChange)||void 0===n||n.call(t,e),this.trigger("VideoStreamConfigChange",e);},t.prototype.onDoubleTap=function(e){var t,n;null===(n=(t=this.initOptions).onDoubleTap)||void 0===n||n.call(t,e),this.trigger("DoubleTap",e);},t.prototype.onStreamPushStateChange=function(e){var t,n;null===(n=(t=this.initOptions).onStreamPushStateChange)||void 0===n||n.call(t,e),this.trigger("StreamPushStateChange",e);},t.prototype.onDeviceChange=function(e){var t,n;this.log("onDeviceChange",Event),null===(n=(t=this.initOptions).onDeviceChange)||void 0===n||n.call(t,e),this.trigger("DeviceChange",e);},t.prototype.onGetUserMediaStatusChange=function(e){var t,n,o=e.msg,r=e.type,i=e.userMedia,s="",a=0;switch(o){case "NotFoundError":case "DevicesNotFoundError":s="NotFoundError",a=1;break;case "NotAllowedError":case "PermissionDeniedError":s="NotAllowedError",a=2;break;case "OverconstrainedError":s="OverconstrainedError",a=3;break;default:s=o;}null===(n=(t=this.initOptions).onGetUserMediaStatusChange)||void 0===n||n.call(t,{code:a,msg:s,type:r,userMedia:i}),this.trigger("GetUserMediaStatusChange",{code:a,msg:s,type:r,userMedia:i});},t.prototype.onMultiPlayerChange=function(e){var t,n;null===(n=(t=this.initOptions).onMultiPlayerChange)||void 0===n||n.call(t,e),this.trigger("MultiPlayerChange",e);},t.prototype.onAndroidInstanceEvent=function(e){var t,n;null===(n=(t=this.initOptions).onAndroidInstanceEvent)||void 0===n||n.call(t,e),this.trigger("AndroidInstanceEvent",e);},t.prototype.onImageEvent=function(e){var t,n;null===(n=(t=this.initOptions).onImageEvent)||void 0===n||n.call(t,e),this.trigger("ImageEvent",e);},t.prototype.onWebrtcStatsChange=function(e,t){var n,o,r;if(e===me.PLAYING){this.pageEvent.addEventHandler();var i=this.gameConfig.getConfig({clientId:t}).game_config,s=(void 0===i?ft:i).sdk_conf,a=void 0===s?ft:s;a||(a=ft),this.setDefaultCursorImage(null!==(n=this.initOptions.defaultCursorImgUrl)&&void 0!==n?n:a.default_cursor_url),this.setRemoteCursor(null!==(o=this.initOptions.cursorMode)&&void 0!==o?o:a.cursor_mode),this.setPageBackground(null!==(r=this.initOptions.bgImgUrl)&&void 0!==r?r:a.bgimg_url);}},t.prototype.setFullscreen=function(e,t){return void 0===t&&(t=document.documentElement),jr(this,void 0,void 0,(function(){return Fr(this,(function(n){switch(n.label){case 0:this.log("setFullscreen->",e),n.label=1;case 1:return n.trys.push([1,6,,7]),e?[4,this.pageEvent.fullscreen(t)]:[3,3];case 2:return n.sent(),[3,5];case 3:return [4,this.pageEvent.exitFullscreen(t)];case 4:n.sent(),n.label=5;case 5:return [3,7];case 6:throw n.sent();case 7:return [2]}}))}))},t.prototype.getFullscreen=function(){return it()},t.prototype.getPageOrientation=function(){return this.pageEvent.getPageOrientation()},t.prototype.isMobile=function(){return st()},t.prototype.getGameConfig=function(e){var t=(void 0===e?ft:e).clientId,n=void 0===t?this.initOptions.mount:t;return this.gameConfig.getConfig({clientId:n}).game_config},t.prototype.supportRenegotiation=function(){return vt()},t.prototype.getRequestId=function(){return this.cloudGamingWebRTC.getRequestId()},t.prototype.getGameMountPoint=function(){return document.getElementById(this.initOptions.mount)},t.prototype.getVideoElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".video-stream")},t.prototype.getAudioElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".audio-stream")},t.prototype.getAudioElementWebsocket=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".cloud-gaming-audio-stream-socket")},t.prototype.getHuaweiAudioElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector("#tcg-audio-huawei")},t.prototype.getProgressBarElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".progress-bar-container")},t.prototype.getCursorElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector("#cursor")},t.prototype.getCloudGamingContainerElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".cloud-gaming-container")},t.prototype.getCloudGamingStreamContainerElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".cloud-gaming-stream-container")},t.prototype.getRestartElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".restart")},t.prototype.createAudioAndAddTrack=function(e){var t=e.id,n=e.source,o=document.getElementById(t);o||((o=document.createElement("audio")).id=t,o.autoplay=true,o.className="audio-stream",o.setAttribute("playsinline","true"),o.setAttribute("webkit-playsinline","true"),o.setAttribute("x5-playsinline","true")),o.srcObject=n,this.getCloudGamingStreamContainerElement().appendChild(o);},t.prototype.getFakeInputElement=function(){var e;return null===(e=this.mountPoint)||void 0===e?void 0:e.querySelector(".tcg-fake-input")},t.prototype.getClientInteractMode=function(){return this.pageEvent.getClientInteractMode()},t.prototype.getRemoteScreenConfig=function(){return this.pageEvent.getRemoteScreenConfig()},t.prototype.showTouchPosition=function(e){this.cloudGamingWebRTC.sendAckData({data:{type:"show_touch_pos",show:e}});},t.prototype.mountGamePoint=function(e){var t=e.mount,n=void 0===t?"":t,o=e.loadingText,r=void 0===o?"正在启动云渲染":o,i=e.showLoading,s=void 0===i||i,a=e.restartText,c=void 0===a?"重新连接":a,d=document.createElement("style");document.querySelector("head").append(d),d.appendChild(document.createTextNode("\n.cloud-gaming-container {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  // justify-content: center;\n  // align-items: center;\n  display: none;\n}\n.cloud-gaming-stream-container {\n  position: relative;\n  width: 100%;\n  height: 100%;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  background-size: cover !important;\n}\n.cloud-gaming-audio-stream-socket {\n  display: none;\n}\n.tcg-fake-input {\n  position: absolute;\n  z-index: -5;\n  opacity: 0;\n}\n.qcloud-stat {\n  position: absolute;\n  right: 10px;\n  top: 0px;\n  line-height: 18px;\n  padding: 5px 10px;\n  z-index: 5;\n  color: #eee;\n  background: rgba(0, 0, 0, .5);\n  border-radius: 5px;\n  text-align: left;\n  font-size: 12px;\n  pointer-events: none;\n  display: none;\n  flex-direction: column;\n  width: 220px;\n  -webkit-transform: translateZ(0);\n  transform: translateZ(0);\n}\n.qcloud-request-id, .qcloud-instance-id {\n  pointer-events: all;\n}\n.qcloud-stat-left {\n  width: 120px;\n}\n.qcloud-stat-right {\n  flex: 1;\n}\n.qcloud-stat-row {\n  text-align: left;\n  display: flex;\n}\n\n@keyframes spinner {\n  to {transform: rotate(360deg);}\n}\n.progress-bar-container {\n  text-align: center;\n  position: absolute;\n  width: 40%;\n  height: 15%;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n}\n.starting {\n  color:white;\n  font-weight:bold;\n  margin-top:30px;\n}\n.spinner:before {\n  content: '';\n  box-sizing: border-box;\n  position: absolute;\n  top: 60px;\n  width: 20px;\n  height: 20px;\n  margin-top: -5px;\n  margin-left: -10px;\n  border-radius: 50%;\n  border: 4px solid #ccc;\n  border-top-color: #000;\n  animation: spinner .6s linear infinite;\n}\n.restart {\n  position: absolute;\n  width: 350px;\n  text-align: center;\n  height: 30px;\n  line-height: 30px;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  align-items: center;\n  font-size: 24px;\n  color: #fff;\n  display: none;\n}\n.cursor {\n  position: absolute;\n  width: 0px;\n  height: 0px;\n  top: 0px;\n  left: 0px;\n  z-index: 1;\n  background-size: cover;\n  display: none;\n}\n.audio-stream {\n  width: 0px;\n}\n.video-stream {\n  max-width: 100%;\n  max-height: 100%;\n  outline: none;\n  border: 0;\n}\n.video-stream:focus {\n  outline :none;\n}\n.rotate-html-90 {\n  transform: rotate(90deg);\n  transform-origin: left top;\n  width: 100vh;\n  width: 100svh;\n  height: 100vw;\n  overflow-x: hidden;\n  position: absolute;\n  top: 0;\n  left: 100%;\n}\n\n.rotate-html-180 {\n  transform: rotate(180deg);\n  transform-origin: center;\n}\n\n.rotate-html-270 {\n  transform: rotate(270deg);\n  transform-origin: left top;\n  overflow-x: hidden;\n  position: absolute;\n  top: 100%;\n  left: 0;\n}"));var l=document.getElementById(n);l||console.error("mount point is not found"),l.innerHTML=nn,s||(this.log("mountPoint",this.mountPoint),this.getProgressBarElement().style.display="none"),l.querySelector(".starting").innerHTML=r,l.querySelector(".restart").innerHTML=c;},t}(Mn),Wr=new Nr;window.TCGSDK=Wr;const Ur=Wr;})();var r=o.p;o.Z;

class CreateDataChannel {
    TCGSDK;
    destPort;
    // 发送消息
    sendMessage = null;
    // 通道代码
    code = null;
    // 事件监听
    events = new Map();
    constructor(TCGSDK, destPort) {
        this.TCGSDK = TCGSDK;
        this.destPort = destPort;
        this.TCGSDK = TCGSDK;
    }
    async init(type) {
        const { sendMessage: send, code } = await this.TCGSDK.createCustomDataChannel({
            destPort: this.destPort || 10005,
            type: type,
            onMessage: (res) => {
                try {
                    const message = JSON.parse(res);
                    const { key, data } = message;
                    Logger.info("onMessage", message);
                    switch (key) {
                        case "callBack" /* EventType.CALLBACK */:
                            this.emit("callBack" /* EventType.CALLBACK */, JSON.parse(data));
                            break;
                        case "initialized" /* EventType.INITIALIZED */:
                            this.emit("initialized" /* EventType.INITIALIZED */);
                            break;
                        default:
                            this.emit("message" /* EventType.MESSAGE */, message);
                            break;
                    }
                }
                catch (error) {
                    // 解析失败
                    Logger.error("CustomDataChannel onMessage error", error);
                }
            },
        });
        this.sendMessage = send;
        this.code = code;
        // 如果创建成功，则发送初始化事件
        if (code == 0) {
            const initMessage = JSON.stringify({
                touchType: exports.TouchType.EVENT_SDK,
                content: JSON.stringify({ type: "PullStreamConnected" }),
            });
            send(initMessage);
        }
    }
    // 发送消息
    send(message) {
        this.sendMessage?.(message);
    }
    // 订阅事件
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)?.push(listener);
        return this;
    }
    // 只监听一次
    once(event, listener) {
        const onceWrapper = (payload) => {
            this.off(event, onceWrapper);
            listener(payload);
        };
        this.on(event, onceWrapper);
        return this;
    }
    // 取消订阅
    off(event, listener) {
        if (!this.events.has(event))
            return this;
        this.events.set(event, this.events.get(event)?.filter((l) => l !== listener) || []);
        return this;
    }
    // 内部触发事件
    emit(event, payload) {
        this.events.get(event)?.forEach((listener) => listener(payload));
    }
    // 获取 code
    getCode() {
        return this.code;
    }
}

class MetricsReporter {
    options;
    keyParamsMap = new Map();
    onceOnlyKeys = new Set();
    reportedKeys = new Set();
    keyQueueMap = new Map(); // 🚀 每个 key 的顺序队列
    constructor(options) {
        this.options = options;
        if (options.onceOnlyKeys) {
            this.onceOnlyKeys = new Set(options.onceOnlyKeys);
        }
    }
    /** 设置或更新某个 key 的参数 */
    addParam(key, params) {
        // 如果是一次性事件, 并且上报过 就跳过
        if (this.onceOnlyKeys.has(key) && this.reportedKeys.has(key)) {
            this.log(`[skip] ${key} addParam is once-only and already reported`);
            return;
        }
        const existing = this.keyParamsMap.get(key) || {};
        const merged = { ...existing, ...params };
        this.keyParamsMap.set(key, merged);
        this.log(`[addParam] ${key}: ${JSON.stringify(merged)}`);
    }
    /** 上报某个 key（顺序保证） */
    instant(key, extraParams) {
        const isOnceOnly = this.onceOnlyKeys.has(key);
        // 一次性 key 限制
        if (isOnceOnly && this.reportedKeys.has(key)) {
            this.log(`[skip] ${key} instant is once-only and already reported`);
            return;
        }
        isOnceOnly && this.reportedKeys.add(key);
        const { commonParams } = this.options;
        // 生成当前 payload
        const storedParams = this.keyParamsMap.get(key) || {};
        const payload = {
            eventKey: key,
            ...commonParams,
            ...storedParams,
            ...extraParams,
        };
        // 🚀 关键逻辑：串行队列执行
        const lastPromise = this.keyQueueMap.get(key) || Promise.resolve();
        const nextPromise = lastPromise.then(() => this.report(payload, key)).finally(() => {
            // 如果这是最后一个 Promise，清理它
            if (this.keyQueueMap.get(key) === nextPromise) {
                this.keyQueueMap.delete(key);
                this.log(`[finally] ${key} queue cleared ${this.keyQueueMap.size}`);
            }
        });
        this.keyQueueMap.set(key, nextPromise);
    }
    /** 实际上报逻辑 */
    async report(data, key) {
        const { endpoint, useBeacon } = this.options;
        const body = JSON.stringify(data);
        this.log(`[report] ${key} payload: ${body}`);
        try {
            if (useBeacon && navigator.sendBeacon) {
                navigator.sendBeacon(endpoint, body);
            }
            else {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                });
            }
            this.log(`[done] ${key} report success`);
        }
        catch (err) {
            this.log(`[error] ${key} report failed: ${err}`);
        }
    }
    log(msg) {
        if (this.options.enableLog)
            console.log(`[MetricsReporter] ${msg}`);
    }
}

/**
 * ARMCLOUD H5 SDK - 分辨率/帧率/码率 映射
 * 参考文档: https://docs.armcloud.net/cn/client/h5/h5-sdk.html#设置分辨率码率帧率
 */
/** 分辨率ID -> 宽高 */
const RESOLUTION_BY_ID = {
    7: { width: 144, height: 256 },
    8: { width: 216, height: 384 },
    9: { width: 288, height: 512 },
    10: { width: 360, height: 640 },
    11: { width: 480, height: 848 },
    12: { width: 540, height: 960 },
    13: { width: 600, height: 1024 },
    14: { width: 480, height: 1280 },
    15: { width: 720, height: 1280 },
    16: { width: 720, height: 1920 },
    17: { width: 1080, height: 1920 },
    18: { width: 1440, height: 1920 },
    19: { width: 1600, height: 2560 },
    20: { width: 2880, height: 1080 },
};
/** 帧率ID -> fps */
const FRAMERATE_BY_ID = {
    1: { fps: 20 },
    2: { fps: 25 },
    3: { fps: 30 },
    4: { fps: 60 },
    5: { fps: 1 },
    6: { fps: 5 },
    7: { fps: 10 },
    8: { fps: 15 },
    9: { fps: 2 },
};
/** 码率ID -> kbps */
const BITRATE_BY_ID = {
    1: { kbps: 1000 },
    2: { kbps: 1500 },
    3: { kbps: 2000 },
    4: { kbps: 2500 },
    5: { kbps: 3000 },
    6: { kbps: 3500 },
    7: { kbps: 4000 },
    8: { kbps: 5000 },
    9: { kbps: 6000 },
    10: { kbps: 8000 },
    11: { kbps: 10000 },
    12: { kbps: 12000 },
    13: { kbps: 200 },
    14: { kbps: 400 },
    15: { kbps: 600 },
};
/** 辅助函数 */
function getResolution(definitionId) {
    return RESOLUTION_BY_ID[definitionId];
}
function getFps(framerateId) {
    return FRAMERATE_BY_ID[framerateId].fps;
}
function getKbps(bitrateId) {
    return BITRATE_BY_ID[bitrateId].kbps;
}

class TcgRtc extends BaseRtc {
    // 引擎实例
    TCGSDK;
    // 云机实例
    androidInstance;
    metricsReporter = null;
    // 取消请求
    abortController = null;
    // 数据通道
    dataChannel = null;
    // 群控数据通道
    groupDataChannel = null;
    // 注入推流状态
    groupPads = [];
    // 埋点定时器
    metricsTimer = null;
    poorNetworkCount = 0;
    goodNetworkCount = 0;
    // 旋转方向
    rotateType = undefined;
    // 上一次推流分辨率大小
    lastStreamResolution = {
        width: 0,
        height: 0,
    };
    // 云机真实分辨率
    remoteDesktopResolution = {
        width: 0,
        height: 0,
        orientation: "portrait",
        degree: 0,
    };
    constructor(initDomId, options, callbacks) {
        super(initDomId, options, callbacks);
        this.TCGSDK = new r();
        this.androidInstance = this.TCGSDK.getAndroidInstance();
        this.enableMicrophone = this.options.enableMicrophone;
        this.enableCamera = this.options.enableCamera;
        this.videoDeviceId = this.options.videoDeviceId || "";
        this.audioDeviceId = this.options.audioDeviceId || "";
        this.remoteUserId = this.options.clientId;
        // 禁用输入法 和 鼠标
        this.TCGSDK.setKMStatus({ keyboard: false, mouse: true });
        // 禁用粘贴
        this.TCGSDK.setPaste(false);
        // 设置视频dom
        this.createVideoContainer(this.options.padCode, this.options.masterIdPrefix);
    }
    /** 设置摄像头设备 */
    async setVideoDeviceId(val) {
        this.videoDeviceId = val;
        if (this.isCameraInject) {
            return this.cameraInject();
        }
    }
    /** 设置麦克风设备 */
    async setAudioDeviceId(val) {
        this.audioDeviceId = val;
        if (this.isMicrophoneInject) {
            return this.microphoneInject();
        }
    }
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor, forwardOff = true) {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "operateSwitch",
            isOpen: isMonitor,
        }), forwardOff);
    }
    setVideoEncoder(width, height) {
        this.TCGSDK.setRemoteDesktopResolution({ width, height });
    }
    /**
     * 静音
     */
    muted() {
        this.unsubscribeStream(exports.MediaType.AUDIO);
    }
    getRequestId() {
        return this.TCGSDK.getRequestId();
    }
    /**
     * 取消静音
     */
    unmuted() {
        this.subscribeStream(exports.MediaType.AUDIO);
    }
    /** 手动开启音视频流播放 */
    startPlay() {
        const promise = this.TCGSDK?.playVideo("play");
        if (promise && promise instanceof Promise) {
            promise.then(() => {
                this.onRemoteVideoFirstFrame?.();
            });
        }
        return promise;
    }
    /** 群控房间信息 */
    sendGroupMessage(message) {
        if (this.isGroupControl) {
            this.groupDataChannel?.send(message);
        }
    }
    /** 获取应用信息 */
    getEquipmentInfo(type) {
        const message = this.getMsgTemplate(exports.TouchType.EQUIPMENT_INFO, {
            type,
        });
        this.sendUserMessage(message, true);
    }
    /** 获取注入推流状态 */
    getInjectStreamStatus(type, timeout = 0) {
        return new Promise((resolve) => {
            // 创建超时处理器
            let timeoutHandler = null;
            if (timeout !== 0) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        status: "unknown",
                        type,
                    });
                }, timeout);
            }
            // 根据类型处理不同的流状态
            const handleStreamStatus = () => {
                switch (type) {
                    case "video" /* InjectStreamStatusType.VIDEO */:
                        try {
                            // 保存resolve函数以便在收到响应时调用
                            Object.assign(this.promiseMap.streamStatus, {
                                resolve: (result) => {
                                    if (timeoutHandler)
                                        clearTimeout(timeoutHandler);
                                    resolve(result);
                                },
                            });
                            this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
                                type: "injectionVideoStats" /* MessageKey.INJECTION_VIDEO_STATS */,
                            }), true);
                        }
                        catch (error) {
                            if (timeoutHandler)
                                clearTimeout(timeoutHandler);
                            resolve({
                                status: "unknown",
                                type,
                            });
                        }
                        break;
                    case "camera" /* InjectStreamStatusType.CAMERA */:
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isCameraInject ? "live" : "offline",
                            type,
                        });
                        break;
                    case "audio" /* InjectStreamStatusType.AUDIO */:
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isMicrophoneInject ? "live" : "offline",
                            type,
                        });
                        break;
                }
            };
            handleStreamStatus();
        });
    }
    /** 应用卸载 */
    appUnInstall(pkgNames) {
        const message = this.getMsgTemplate(exports.TouchType.APP_UNINSTALL, pkgNames);
        this.sendUserMessage(message);
    }
    /** 通知手机需要注入 */
    async notifyInject(type, isOpen) {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type,
            isOpen,
        }));
    }
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    async startMediaStream(mediaType, msgData) {
        try {
            // 处理视频设备
            if ([exports.MediaType.VIDEO, exports.MediaType.AUDIO_AND_VIDEO].includes(mediaType)) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, true);
                const videoDeviceId = this.videoDeviceId ||
                    (msgData?.isFront
                        ? "user"
                        : msgData?.isFront === false
                            ? "environment"
                            : undefined);
                const profile = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
                const res = await this.TCGSDK.switchCamera({
                    status: "open",
                    profile,
                });
                this.isCameraInject = true;
            }
            // 处理音频设备
            if ([exports.MediaType.AUDIO, exports.MediaType.AUDIO_AND_VIDEO].includes(mediaType)) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, true);
                const profile = this.audioDeviceId
                    ? { deviceId: this.audioDeviceId }
                    : undefined;
                const res = await this.TCGSDK.switchMic({
                    status: "open",
                    profile,
                });
                this.isMicrophoneInject = true;
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    async stopMediaStream(mediaType) {
        try {
            const stopOperations = [];
            // 根据媒体类型添加对应操作
            if (mediaType === exports.MediaType.VIDEO ||
                mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, false);
                stopOperations.push(this.TCGSDK.switchCamera({ status: "close" }));
            }
            if (mediaType === exports.MediaType.AUDIO ||
                mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, false);
                stopOperations.push(this.TCGSDK.switchMic({ status: "close" }));
            }
            // 并行执行所有停止操作
            await Promise.allSettled(stopOperations);
            switch (mediaType) {
                case exports.MediaType.VIDEO:
                    this.isCameraInject = false;
                    break;
                case exports.MediaType.AUDIO:
                    this.isMicrophoneInject = false;
                    break;
                case exports.MediaType.AUDIO_AND_VIDEO:
                    this.isCameraInject = false;
                    this.isMicrophoneInject = false;
                    break;
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    /** 摄像头注入 */
    async cameraInject(msgData) {
        try {
            await this.stopMediaStream(exports.MediaType.VIDEO);
            await this.startMediaStream(exports.MediaType.VIDEO, msgData);
            this.callbacks?.onVideoInit?.();
        }
        catch (error) {
            this.callbacks?.onVideoError?.(error);
            return Promise.reject(error);
        }
    }
    /** 麦克风注入 */
    async microphoneInject() {
        try {
            await this.stopMediaStream(exports.MediaType.AUDIO);
            await this.startMediaStream(exports.MediaType.AUDIO);
            this.callbacks?.onAudioInit?.();
        }
        catch (error) {
            this.callbacks?.onAudioError?.(error);
            return Promise.reject(error);
        }
    }
    /** 群控退出房间 */
    kickItOutRoom(pads) {
        if (!this.isGroupControl)
            return;
        // 排除主控
        pads = pads.filter((pad) => pad !== this.options.clientId);
        if (!pads.length)
            return;
        this.groupPads = this.groupPads.filter((pad) => !pads.includes(pad));
        this.androidInstance.leaveGroupControl({
            instanceIds: pads,
        });
    }
    // 获取云机令牌
    async getAndroidInstanceToken(pads) {
        return new Promise((resolve, reject) => {
            const { baseUrl } = this.options;
            const base = baseUrl
                ? `${baseUrl}/rtc/open/room/sdk/share/applyToken`
                : `https://openapi.armcloud.net/rtc/open/room/sdk/share/applyToken`;
            const { userId, uuid, token, manageToken } = this.options;
            const url = manageToken ? "/manage/rtc/room/share/applyToken" : base;
            const tok = manageToken || token;
            // 取消请求
            this.abortController = new AbortController();
            axios
                .post(url, {
                userId,
                uuid,
                terminal: "h5",
                expire: 360000,
                pushPublicStream: false,
                pads: pads?.map((v) => {
                    return {
                        padCode: v,
                        userId,
                    };
                }),
            }, {
                headers: manageToken ? { Authorization: tok } : { token: tok },
                signal: this.abortController.signal,
            })
                .then((res) => {
                resolve(res?.data?.data || {});
            })
                .catch((error) => {
                if (axios.isCancel(error)) {
                    return;
                }
                reject(error);
            });
        });
    }
    /** 群控加入房间 */
    joinGroupRoom(pads) {
        if (!this.isGroupControl)
            return;
        // 排除主控
        pads = pads.filter((pad) => pad !== this.options.clientId);
        if (!pads.length)
            return;
        this.groupPads = Array.from(new Set([...this.groupPads, ...pads]));
        this.getAndroidInstanceToken(pads).then((res) => {
            const { accessInfo, roomToken } = res || {};
            this.TCGSDK.setAccessToken({ accessInfo: accessInfo, token: roomToken });
            // 加入群控
            this.androidInstance.joinGroupControl({
                instanceIds: pads,
            });
        });
    }
    /** 浏览器是否支持 */
    isSupported() {
        const support = {
            RTCPeerConnection: typeof RTCPeerConnection !== "undefined",
            RTCDataChannel: typeof RTCDataChannel !== "undefined"};
        return support.RTCPeerConnection && support.RTCDataChannel;
    }
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag = true) {
        if (!this.isGroupControl)
            return;
        flag ? this.androidInstance.startSync({}) : this.androidInstance.stopSync();
    }
    /** 远端视频首帧渲染 */
    onRemoteVideoFirstFrame() {
        let { width, height } = this.TCGSDK.getRemoteStreamResolution();
        this.callbacks?.onRenderedFirstFrame?.({
            userId: this.options.clientId,
            width,
            height,
            isScreen: false,
        });
    }
    /** 初始化输入框 */
    setupInputElement() {
        const { disable, disableLocalIME } = this.options;
        this.inputService.initIme(this.initDomId, { disableLocalIME });
    }
    /** 获取远端输入框状态 */
    getRemoteInputState() {
        this.sendUserMessage(JSON.stringify({
            touchType: exports.TouchType.INPUT_STATE,
        }));
    }
    /** 同步远端输入状态到本地输入框 */
    syncInputFocusState(data) {
        if (!this.inputService.getInputElement())
            return;
        const { allowLocalIMEInCloud, keyboard } = this.options;
        const { isOpen, imeOptions } = data;
        // 更新 enterkeyhint
        const hint = this.enterkeyhintObj[imeOptions];
        if (hint) {
            this.inputService.getInputElement().enterKeyHint = hint;
        }
        // 是否需要本地焦点控制
        const allowLocalFocus = (allowLocalIMEInCloud && keyboard === "pad") || keyboard === "local";
        if (allowLocalFocus && typeof isOpen === "boolean") {
            setTimeout(() => {
                isOpen ? this.inputService.focus() : this.inputService.blur();
            }, 150);
        }
        // 记录输入框状态
        this.remoteInputState = {
            isOpen: isOpen ?? false,
            imeOptions: imeOptions ?? "",
        };
    }
    /** 根据云端分辨率比例修正目标分辨率 */
    matchResolution(width, height) {
        let { width: remoteWidth, height: remoteHeight } = this.remoteDesktopResolution;
        // 没有云端信息就直接返回目标分辨率
        if (!remoteWidth || !remoteHeight) {
            return { width, height };
        }
        // 云端比例
        const remoteRatio = remoteWidth / remoteHeight;
        // 目标比例
        const targetRatio = width / height;
        let finalWidth = width;
        let finalHeight = height;
        // 如果目标比例和云端比例差异较大，做比例修正
        if (Math.abs(targetRatio - remoteRatio) > 0.01) {
            if (targetRatio > remoteRatio) {
                // 目标比云端更宽 -> 按高度修正宽度
                finalWidth = Math.round(height * remoteRatio);
            }
            else {
                // 目标比云端更窄 -> 按宽度修正高度
                finalHeight = Math.round(width / remoteRatio);
            }
        }
        // 确保宽高为偶数（部分视频流要求）
        finalWidth = finalWidth % 2 === 0 ? finalWidth : finalWidth + 1;
        finalHeight = finalHeight % 2 === 0 ? finalHeight : finalHeight + 1;
        return { width: finalWidth, height: finalHeight };
    }
    // 根据分辨率设置DOM宽高
    setDomResolution(newWidth, newHeight) {
        const container = document.getElementById(this.initDomId);
        if (!container)
            return;
        // 清空样式，强制浏览器回到原始宽高
        container.style.width = "";
        container.style.height = "";
        const rect = container.getBoundingClientRect();
        const domWidth = rect.width;
        const domHeight = rect.height;
        // 计算目标比例
        const targetRatio = newWidth / newHeight;
        const domRatio = domWidth / domHeight;
        let finalWidth = domWidth;
        let finalHeight = domHeight;
        if (domRatio > targetRatio) {
            // DOM 太宽，以高度为基准
            finalHeight = domHeight;
            finalWidth = domHeight * targetRatio;
        }
        else {
            // DOM 太高，以宽度为基准
            finalWidth = domWidth;
            finalHeight = domWidth / targetRatio;
        }
        container.style.width = `${finalWidth}px`;
        container.style.height = `${finalHeight}px`;
    }
    /** 初始化推流分辨率 */
    setupStreamResolution(width, height, orientation) {
        // 如果云端是横屏，且本地配置是竖屏（宽 < 高），则对调宽高
        if (orientation === "landscape" && width < height) {
            [width, height] = [height, width];
        }
        // 如果云端是竖屏，且本地配置是横屏（宽 > 高），则对调宽高
        else if (orientation === "portrait" && width > height) {
            [width, height] = [height, width];
        }
        // 根据云端分辨率比例修正目标分辨率
        let { width: newWidth, height: newHeight } = this.matchResolution(width, height);
        Logger.info(`sdk setupStreamResolution: newWidth=${newWidth} newHeight=${newHeight}`);
        // 设置推流分辨率
        this.TCGSDK.setStreamProfile({
            video_width: newWidth,
            video_height: newHeight,
        });
    }
    /** 控制音视频流渲染模式 */
    setMediaStreamRender(mediaType) {
        if (mediaType === exports.MediaType.VIDEO) {
            this.unsubscribeStream(exports.MediaType.AUDIO);
        }
        else if (mediaType === exports.MediaType.AUDIO) {
            this.unsubscribeStream(exports.MediaType.VIDEO);
        }
    }
    /** 隐藏a标签 */
    hideATags() {
        let sheet = document.styleSheets[0];
        sheet.insertRule(`.cloud-gaming-container .restart { display: none !important; }`, sheet.cssRules.length);
    }
    async setupSDK(isGroupControl = false, pads = []) {
        const { roomToken, padCode, accessInfo, videoStream, mediaType, autoRecoveryTime, } = this.options;
        const { resolution, frameRate, bitrate } = videoStream;
        const fps = getFps(frameRate);
        const kbps = getKbps(bitrate);
        this.isGroupControl = isGroupControl;
        this.groupPads = pads;
        const that = this;
        try {
            await this.TCGSDK.createShadowSocket({ token: roomToken });
        }
        catch (error) {
            Logger.error("createShadowSocket error:", error);
        }
        this.TCGSDK.init({
            mount: this.videoDomId,
            mobileGame: true,
            showLoading: false,
            restartText: "",
            idleThreshold: autoRecoveryTime || 300,
            clickBodyToPlay: false,
            debugSetting: {
            //showStats: true,
            // showLog: true,
            },
            streaming: {
                mode: "webrtc",
            },
            accessToken: {
                token: roomToken,
                accessInfo: accessInfo || "",
            },
            androidInstance: {
                autoRotateOnPC: false,
            },
            autoRotateMountPoint: false,
            streamProfile: {
                fps: fps,
                max_bitrate: kbps,
                min_bitrate: kbps,
                unit: "Kbps",
            },
            onConnectFail: (response) => {
                this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                    judgeTime: Date.now(),
                    result: 0,
                });
                this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
                const code = response.code;
                // * | ------ | ----------------------------------------- |
                // * | -3     | 超出重连次数                                |
                // * | -2     | 自动重连中                                  |
                // * | -1     | 连接失败，触发了限频操作 5s，可稍后再连接        |
                // * | 大于0(code > 0) | Proxy 返回的重连错误，通常连不上，需重新init + createSession     |
                // code 映射到 ConnectionStateCode
                // 判断code 是否大于0
                const isGreaterThan0 = code > 0;
                if (isGreaterThan0) {
                    this.callbacks?.onConnectionStateChanged?.({
                        state: 1,
                        code: code,
                        msg: response.msg,
                    });
                    return;
                }
                const codeMap = {
                    "-3": 1,
                    "-2": 4,
                    "-1": 6,
                };
                const state = codeMap[code];
                this.callbacks?.onConnectionStateChanged?.({
                    state,
                    code: code,
                    msg: response.msg,
                });
            },
            // 首帧回调
            onConnectSuccess: () => {
                // 初始化输入法
                this.setupInputElement();
                // 初始化消息通道
                this.setupDataChannel();
                // 控制音视频流渲染模式
                this.setMediaStreamRender(mediaType);
                // 隐藏a标签
                this.hideATags();
                this.joinGroupRoom(pads);
            },
            onConfigurationChange: (response) => {
                let { orientation, deg, width: remoteWidth, height: remoteHeight, } = response.screen_config;
                Logger.info(`sdk onConfigurationChange: screen_config=${JSON.stringify(response.screen_config)}`);
                this.remoteDesktopResolution = {
                    width: remoteWidth,
                    height: remoteHeight,
                    orientation: orientation,
                    degree: deg,
                };
                // 获取期望拉流分辨率
                const { resolution } = this.options.videoStream;
                const { width, height } = getResolution(resolution);
                // 初始化拉流分辨率
                const type = this.remoteDesktopResolution.width > this.remoteDesktopResolution.height ? exports.RotateDirection.LANDSCAPE : exports.RotateDirection.PORTRAIT;
                this.setupStreamResolution(width, height, type == exports.RotateDirection.LANDSCAPE ? "landscape" : "portrait");
                // const type =
                //   !orientation || orientation === "portrait"
                //     ? RotateDirection.PORTRAIT
                //     : RotateDirection.LANDSCAPE;
                this.screenRotation(type, deg ?? 0);
            },
            // 初始化成功回调
            onInitSuccess: () => {
                this.callbacks?.onConnectSuccess?.();
                this.metricsReporter = new MetricsReporter({
                    endpoint: `${this.options.baseUrl}/traffic-info/open/traffic/rtcMonitor`,
                    commonParams: {
                        padCode: this.remoteUserId,
                        streamType: this.options.streamType,
                        sdkTerminal: "h5",
                    },
                    onceOnlyKeys: ["FirstFrame" /* ReportEventType.FIRST_FRAME */],
                    useBeacon: false,
                    enableLog: true,
                });
                this.metricsReporter.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                    joinRoomTime: Date.now(),
                });
                this.metricsTimer = setTimeout(() => {
                    this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                        judgeTime: Date.now(),
                        result: 0,
                    });
                    this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
                }, 5000);
                isGroupControl
                    ? this.TCGSDK.access({
                        groupControl: isGroupControl,
                        instanceIds: [padCode],
                    })
                    : this.TCGSDK.access({
                        instanceId: padCode,
                    });
            },
            // 推流分辨率发生变化
            onVideoStreamConfigChange: (response) => {
                let { width, height } = this.lastStreamResolution;
                this.callbacks?.onChangeResolution?.({
                    from: {
                        width,
                        height,
                    },
                    to: response,
                });
                // 记录上一次推流分辨率大小
                Object.assign(this.lastStreamResolution, response);
            },
            onAndroidInstanceEvent(response) {
                const { type, data } = response;
                if (!data?.event_type) {
                    that.syncInputFocusState(that.remoteInputState);
                }
            },
            onEvent: (response) => {
                const { type, data } = response;
                switch (type) {
                    case "video_state":
                        data?.code === -1 &&
                            this.callbacks?.onAutoplayFailed?.({
                                kind: "video",
                                userId: padCode,
                            });
                        break;
                    case "audio_state":
                        data?.code === -1 &&
                            this.callbacks?.onAutoplayFailed?.({
                                kind: "audio",
                                userId: padCode,
                            });
                        break;
                    case "media_stats":
                        const videoStats = {
                            width: data.videoStats.width,
                            height: data.videoStats.height,
                            videoLossRate: data.videoStats.packet_lost / data.videoStats.packet_received,
                            receivedKBitrate: data.videoStats.bit_rate,
                            decoderOutputFrameRate: data.videoStats.fps,
                            rtt: data.videoStats.edge_rtt,
                            codecType: data.videoStats.codec,
                            totalRtt: data.videoStats.raw_rtt,
                        };
                        const networkQuality = calculateNetworkQuality(videoStats.rtt, videoStats.videoLossRate);
                        this.handleAdaptiveOptimization(videoStats);
                        const runInfo = {
                            userId: this.options.clientId,
                            audioStats: {
                                audioLossRate: data.audioStats.packet_lost / data.audioStats.packet_received,
                                receivedKBitrate: data.audioStats.bit_rate,
                                rtt: data.videoStats.rtt,
                                jitterBufferDelay: data.audioStats.jitter_buffer,
                                numChannels: data.audioStats.channels,
                                receivedSampleRate: data.audioStats.sample_rate,
                                concealedSamples: data.audioStats.concealed_samples,
                                concealmentEvent: data.audioStats.concealment_events,
                                codecType: data.audioStats.codec,
                            },
                            videoStats,
                        };
                        this.callbacks?.onRunInformation?.(runInfo);
                        this.callbacks?.onNetworkQuality?.(networkQuality, networkQuality);
                        break;
                    case "autoplay":
                        // 首帧渲染
                        data?.code === 0 &&
                            data?.mediaType === "video" &&
                            this.onRemoteVideoFirstFrame?.();
                        data?.code === -1 &&
                            this.callbacks?.onAutoplayFailed?.({
                                kind: data?.mediaType,
                                userId: padCode,
                            });
                        break;
                    case "first_frame_received":
                        this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                            judgeTime: Date.now(),
                            result: 1,
                        });
                        this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
                        break;
                    case "idle":
                        // 触发自动回收回调
                        if (autoRecoveryTime) {
                            this.stop();
                            this.callbacks?.onAutoRecoveryTime?.();
                        }
                        break;
                }
            },
        });
    }
    /**
     * 设置手机旋转
     * @param type 1: 横屏，0: 竖屏
     */
    setPhoneRotation(type) {
        // 远端流方向
        const remoteIsLandscape = this.remoteDesktopResolution.width > this.remoteDesktopResolution.height;
        let degree = type == exports.RotateDirection.LANDSCAPE ? 270 : 0;
        if (remoteIsLandscape) {
            const orientationIsLandscape = this.remoteDesktopResolution.orientation === "landscape";
            if (type == exports.RotateDirection.LANDSCAPE) {
                degree = orientationIsLandscape ? 270 : 0;
            }
            else {
                degree = orientationIsLandscape ? 0 : 270;
            }
        }
        Logger.info(`setPhoneRotation:  sdk type=${type} remoteIsLandscape=${remoteIsLandscape} degree=${degree} remoteDesktopResolution=${JSON.stringify(this.remoteDesktopResolution)}`);
        this.screenRotation(type, degree);
    }
    /** 触发 change rotate 事件 */
    async triggerChangeRotateEvent(type) {
        const observeElementSizeOnce = (el, callback) => {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.target.getBoundingClientRect();
                    if (width && height) {
                        callback(width, height);
                        observer.unobserve(el);
                        observer.disconnect();
                    }
                }
            });
            observer.observe(el);
        };
        // 获取video元素大小
        const videoElement = document.querySelector(`#${this.initDomId} video`);
        observeElementSizeOnce(videoElement, (width, height) => {
            this.callbacks?.onChangeRotate?.(type, {
                width,
                height,
            });
        });
    }
    /**
     * 屏幕旋转
     * @param type @param type 1: 横屏，0: 竖屏
     * @param degree
     * @returns
     */
    async screenRotation(type, degree) {
        const optionsRotateType = this.options.rotateType;
        // Logger.info(`sdk screenRotation: optionsRotateType=${optionsRotateType} type=${type} degree=${degree}`);
        if (optionsRotateType !== undefined) {
            type = optionsRotateType;
            degree = optionsRotateType === exports.RotateDirection.LANDSCAPE ? 270 : 0;
            // Logger.info(`sdk screenRotation: new-> type=${type} degree=${degree}`);
        }
        const remoteIsLandscape = this.remoteDesktopResolution.width > this.remoteDesktopResolution.height;
        if (isTouchDevice() || isMobile()) {
            type = exports.RotateDirection.PORTRAIT;
            degree = 0;
            if (remoteIsLandscape && this.remoteDesktopResolution.degree == 0) {
                degree = 90;
            }
            else if (this.remoteDesktopResolution.degree == 90 && this.remoteDesktopResolution.orientation == "landscape") {
                degree = 90;
            }
            // Logger.info(`sdk screenRotation: mobile-> type=${type} degree=${degree}`);
        }
        if (!remoteIsLandscape && this.remoteDesktopResolution.degree == 90 && this.remoteDesktopResolution.orientation == "landscape") {
            degree = type == exports.RotateDirection.LANDSCAPE ? 0 : 90;
        }
        Logger.info(`sdk screenRotation: type=${type} degree=${degree}`);
        try {
            await this.callbacks?.onBeforeRotate?.(type);
        }
        catch (error) {
            //
        }
        // 获取父元素（调用方）的原始宽度和高度，这里要重新获取，因为外层的div可能宽高发生变化
        const h5Dom = document.getElementById(this.initDomId);
        if (!h5Dom)
            return;
        let parentWidth = h5Dom.clientWidth > window.innerWidth
            ? window.innerWidth
            : h5Dom.clientWidth;
        let parentHeight = h5Dom.clientHeight > window.innerHeight
            ? window.innerHeight
            : h5Dom.clientHeight;
        let bigSide = parentHeight;
        let smallSide = parentWidth;
        if (parentWidth > parentHeight) {
            bigSide = parentWidth;
            smallSide = parentHeight;
        }
        const wrapperBox = h5Dom.parentElement;
        const wrapperBoxWidth = wrapperBox.clientWidth;
        const toolsWidth = this.options.toolsWidth ?? 0;
        if (type == exports.RotateDirection.LANDSCAPE) {
            // 因为右侧可能有操作栏，所以预留
            if (toolsWidth) {
                parentWidth =
                    bigSide > wrapperBoxWidth ? wrapperBoxWidth - toolsWidth : bigSide;
            }
            else {
                parentWidth = bigSide;
            }
            parentHeight = smallSide;
        }
        else {
            parentWidth = smallSide;
            parentHeight = bigSide;
        }
        h5Dom.style.width = parentWidth + "px";
        h5Dom.style.height = parentHeight + "px";
        const { width: remoteWidth, height: remoteHeight } = this.remoteDesktopResolution;
        const videoIsLandscape = remoteWidth > remoteHeight;
        // 外层 div
        let armcloudVideoWidth = 0;
        let armcloudVideoHeight = 0;
        const videoDom = document.getElementById(this.videoDomId);
        if (type == exports.RotateDirection.LANDSCAPE) {
            const w = videoIsLandscape ? remoteWidth : remoteHeight;
            const h = videoIsLandscape ? remoteHeight : remoteWidth;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
        }
        else {
            // 竖屏处理
            const w = videoIsLandscape ? remoteHeight : remoteWidth;
            const h = videoIsLandscape ? remoteWidth : remoteHeight;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
        }
        videoDom.style.width = `${armcloudVideoWidth}px`;
        videoDom.style.height = `${armcloudVideoHeight}px`;
        await waitStyleApplied(videoDom);
        this.TCGSDK.setVideoOrientation({
            deg: degree ?? 0,
            rotateMountPoint: true,
        });
        this.triggerChangeRotateEvent(type);
        this.rotateType = type;
    }
    // 初始化数据通道
    async setupDataChannel() {
        // 单控模式
        this.dataChannel = new CreateDataChannel(this.TCGSDK, 23332);
        await this.dataChannel.init("android");
        if (this.isGroupControl) {
            const dispatchGroupInitialized = () => {
                /** 远端可见用户加入房间 */
                this.callbacks?.onUserJoined?.({
                    userInfo: {
                        userId: this.options.clientId,
                    },
                });
            };
            // 群控模式
            this.groupDataChannel = new CreateDataChannel(this.TCGSDK, 23331);
            await this.groupDataChannel.init("android_broadcast");
            this.groupDataChannel.on("initialized" /* EventType.INITIALIZED */, dispatchGroupInitialized);
        }
        const parseResolution = (resolution) => {
            const [width, height] = resolution?.split("*").map(Number);
            return { width, height };
        };
        const safeParse = (raw, fallback) => {
            try {
                return JSON.parse(raw);
            }
            catch {
                return fallback;
            }
        };
        // 创建尾触发节流函数，确保窗口期内仅处理最后一次调用
        const createTrailingThrottle = (handler, delay) => {
            let timer = null;
            let latestArgs = null;
            return (...args) => {
                latestArgs = args;
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(() => {
                    if (latestArgs) {
                        handler(...latestArgs);
                        latestArgs = null;
                    }
                    timer = null;
                }, delay);
            };
        };
        // 消息和回调 handlers
        const handlers = {
            ["clipboard" /* MessageKey.CLIPBOARD */]: (raw) => {
                const data = safeParse(raw, {
                    content: "",
                });
                this.callbacks?.onOutputClipper?.(data);
            },
            ["inputState" /* MessageKey.INPUT_STATE */]: (raw) => {
                const data = safeParse(raw, {
                    isOpen: false,
                    imeOptions: "",
                });
                this.syncInputFocusState(data);
            },
            ["equipmentInfo" /* MessageKey.EQUIPMENT_INFO */]: (raw) => {
                const info = safeParse(raw, { info: "" });
                this.callbacks?.onEquipmentInfo?.(info);
            },
            ["inputAdb" /* MessageKey.INPUT_ADB */]: (raw) => {
                const adb = safeParse(raw, {
                    isSuccess: false,
                    content: "",
                });
                this.callbacks?.onAdbOutput?.(adb);
            },
            ["videoAndAudioControl" /* MessageKey.VIDEO_AND_AUDIO_CONTROL */]: (raw) => {
                const mediaData = safeParse(raw, {});
                const isOpen = !!mediaData.isOpen;
                this.callbacks?.onMediaDevicesToggle?.({
                    type: "media" /* MediaDeviceType.MEDIA */,
                    enabled: isOpen,
                    isFront: mediaData.isFront,
                });
                if (!this.enableMicrophone && !this.enableCamera)
                    return;
                const pushType = this.enableMicrophone && this.enableCamera
                    ? exports.MediaType.AUDIO_AND_VIDEO
                    : this.enableCamera
                        ? exports.MediaType.VIDEO
                        : exports.MediaType.AUDIO;
                if (isOpen) {
                    if (this.enableCamera)
                        this.cameraInject(mediaData);
                    if (this.enableMicrophone)
                        this.microphoneInject();
                }
                else {
                    this.stopMediaStream(pushType);
                }
            },
            ["audioControl" /* MessageKey.AUDIO_CONTROL */]: (raw) => {
                const { isOpen: isOpenAudio = false } = safeParse(raw, {});
                this.callbacks?.onMediaDevicesToggle?.({
                    type: "microphone" /* MediaDeviceType.MICROPHONE */,
                    enabled: isOpenAudio,
                });
                if (!this.enableMicrophone)
                    return;
                if (isOpenAudio) {
                    this.microphoneInject();
                }
                else {
                    this.stopMediaStream(exports.MediaType.AUDIO);
                }
            },
            ["definition" /* MessageKey.DEFINITION */]: (raw) => {
                const result = safeParse(raw, {});
                this.callbacks?.onChangeResolution?.({
                    from: parseResolution(result.from),
                    to: parseResolution(result.to),
                });
            },
            ["startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */]: (raw) => {
                const result = safeParse(raw, {});
                const resolve = this?.promiseMap?.injectStatus?.resolve;
                if (typeof resolve === "function") {
                    resolve({
                        type: "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */,
                        status: result?.isSuccess ? "success" : "error",
                        result,
                    });
                    if (this.promiseMap?.injectStatus) {
                        this.promiseMap.injectStatus.resolve = null;
                    }
                }
                this.callbacks?.onInjectVideoResult?.("startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */, result);
            },
            ["stopVideoInjection" /* MessageKey.STOP_INJECTION_VIDEO */]: (raw) => {
                const result = safeParse(raw, {});
                const resolve = this?.promiseMap?.injectStatus?.resolve;
                if (typeof resolve === "function") {
                    resolve({
                        type: "stopVideoInjection" /* MessageKey.STOP_INJECTION_VIDEO */,
                        status: result?.isSuccess ? "success" : "error",
                        result,
                    });
                    this.promiseMap.injectStatus.resolve = null;
                }
                this.callbacks?.onInjectVideoResult?.("stopVideoInjection" /* MessageKey.STOP_INJECTION_VIDEO */, result);
            },
            ["injectionVideoStats" /* MessageKey.INJECTION_VIDEO_STATS */]: (raw) => {
                const result = safeParse(raw, {});
                const resolve = this?.promiseMap?.streamStatus?.resolve;
                if (typeof resolve === "function") {
                    resolve({
                        path: result.path,
                        status: result.status || (result.path ? "live" : "offline"),
                        type: "video",
                    });
                }
            },
        };
        const throttleConfig = {
            ["videoAndAudioControl" /* MessageKey.VIDEO_AND_AUDIO_CONTROL */]: 500,
            ["audioControl" /* MessageKey.AUDIO_CONTROL */]: 500,
        };
        Object.entries(throttleConfig).forEach(([key, delay]) => {
            const originHandler = handlers[key];
            if (!originHandler || !delay)
                return;
            handlers[key] = createTrailingThrottle(originHandler, delay);
        });
        const dispatchInitialized = () => {
            /** 远端可见用户加入房间 */
            this.callbacks?.onUserJoined?.({
                userInfo: {
                    userId: this.options.clientId,
                },
            });
            // 获取远端输入框状态
            this.getRemoteInputState();
            // 获取相机状态
            this.getCameraState();
        };
        const dispatch = (res) => {
            const { key, data } = res;
            const handler = handlers[key];
            if (handler) {
                handler(data);
            }
            else {
                Logger.info(`[dataChannel] Unknown key: ${this.options.clientId}`, key, "raw:", data);
            }
        };
        const callbackDispatch = (res) => {
            const { type, data } = res;
            const handler = handlers[type];
            if (handler) {
                handler(data);
            }
            else {
                Logger.info(`[dataChannel] Unknown type: ${this.options.clientId}`, type, "raw:", data);
            }
        };
        this.dataChannel
            .on("initialized" /* EventType.INITIALIZED */, dispatchInitialized)
            .on("message" /* EventType.MESSAGE */, dispatch)
            .on("callBack" /* EventType.CALLBACK */, callbackDispatch);
    }
    // 发送数据通道消息
    sendUserMessage(message, forwardOff = false, directForward = false) {
        if (this.isGroupControl && !forwardOff) {
            this.groupDataChannel?.send(message);
        }
        if (!directForward) {
            this.dataChannel?.send(message);
        }
    }
    /** 按顺序发送文本框 */
    sendGroupInputString(pads, strs) {
        if (this.isGroupControl) {
            strs?.map((v, index) => {
                if (pads[index]) {
                    const message = JSON.stringify({
                        text: v,
                        pads: [pads[index]],
                        touchType: exports.TouchType.INPUT_BOX,
                    });
                    this.sendUserMessage(message, false, true);
                }
            });
        }
    }
    /**  群控剪切板  */
    sendGroupInputClipper(pads, strs) {
        if (this.isGroupControl) {
            strs?.map((v, index) => {
                if (pads[index]) {
                    const message = JSON.stringify({
                        text: v,
                        pads: [pads[index]],
                        touchType: exports.TouchType.CLIPBOARD,
                    });
                    this.sendUserMessage(message, false, true);
                }
            });
        }
    }
    /** 执行adb命令 */
    executeAdbCommand(command, forwardOff = true) {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "inputAdb" /* MessageKey.INPUT_ADB */,
            content: command,
        }), forwardOff);
    }
    /** 进入 RTC 房间 */
    start(isGroupControl = false, pads = []) {
        // 初始化连接
        this.setupSDK(isGroupControl, pads);
    }
    /** 远端用户离开房间 */
    onUserLeave() { }
    /**
     * 根据网络统计自动调整流性能
     */
    handleAdaptiveOptimization(stats) {
        const { videoLossRate, rtt } = stats;
        // 网络较差 (丢包 > 5% 或 RTT > 300ms)
        if (videoLossRate > 0.05 || rtt > 300) {
            this.poorNetworkCount++;
            this.goodNetworkCount = 0;
            if (this.poorNetworkCount >= 3) {
                const { resolution, frameRate, bitrate } = this.options.videoStream;
                if (bitrate && bitrate > 1) {
                    Logger.info("TcgRtc: Network poor, reducing bitrate", { videoLossRate, rtt });
                    this.setStreamConfig({
                        definitionId: resolution || 12,
                        framerateId: frameRate || 2,
                        bitrateId: Math.max(1, (bitrate || 3) - 1),
                    });
                }
                this.poorNetworkCount = 0;
            }
        }
        else if (videoLossRate < 0.01 && rtt < 150) {
            this.goodNetworkCount++;
            this.poorNetworkCount = 0;
            if (this.goodNetworkCount >= 10) {
                // 良好网络下可尝试恢复，此处暂不自动上调以防抖动
                this.goodNetworkCount = 0;
            }
        }
    }
    setViewSize(width, height, rotateType = 0) { }
    getCameraState() {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "cameraState" /* SdkEventType.GET_CAMERA_STATE */,
        }), true);
    }
    // 模拟点击事件
    triggerClickEvent(options, forwardOff = false) { }
    // 模拟触摸事件 0 按下 1 抬起 2 触摸中
    triggerPointerEvent(action, options, forwardOff = false) { }
    /** 离开 RTC 房间 */
    async stop() {
        clearTimeout(this.metricsTimer);
        this.metricsTimer = null;
        this.TCGSDK.destroy();
        this.abortController?.abort();
        this.abortController = null;
        const videoDomElement = document.getElementById(this.initDomId);
        if (videoDomElement) {
            videoDomElement.innerHTML = "";
        }
        // inputService handled in BaseRtc/destroy
    }
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time) { }
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 需要发送的字符串
     */
    async sendInputClipper(inputStr, forwardOff = false) {
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.CLIPBOARD,
        });
        this.sendUserMessage(message, forwardOff);
    }
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 需要发送的字符串
     */
    async sendInputString(inputStr, forwardOff = false) {
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.INPUT_BOX,
        });
        this.sendUserMessage(message, forwardOff);
    }
    /** 清晰度切换 */
    setStreamConfig(config) {
        const { definitionId, framerateId, bitrateId } = config;
        let { width, height } = getResolution(definitionId);
        const fps = getFps(framerateId);
        const kbps = getKbps(bitrateId);
        const { width: remoteWidth, height: remoteHeight } = this.remoteDesktopResolution;
        // 如果云端是横屏，且本地配置是竖屏（宽 < 高），则对调宽高
        if (remoteWidth > remoteHeight && width < height) {
            [width, height] = [height, width];
        }
        // 如果云端是竖屏，且本地配置是横屏（宽 > 高），则对调宽高
        else if (remoteWidth < remoteHeight && width > height) {
            [width, height] = [height, width];
        }
        const { width: newWidth, height: newHeight } = this.matchResolution(width, height);
        this.TCGSDK.setStreamProfile({
            video_width: newWidth,
            video_height: newHeight,
            fps: fps,
            max_bitrate: kbps,
            unit: "Kbps",
        });
        const { resolution, frameRate, bitrate } = this.options.videoStream;
        // 覆盖 videoStream 配置
        Object.assign(this.options.videoStream, {
            resolution: definitionId ?? resolution,
            frameRate: framerateId ?? frameRate,
            bitrate: bitrateId ?? bitrate,
        });
    }
    // 修改屏幕分辨率和dpi
    async setScreenResolution(options, forwardOff = true) {
        const content = options.type === "updateDensity" /* MessageKey.UPDATE_DENSITY */
            ? {
                type: options.type,
                width: options.width,
                height: options.height,
                density: options.dpi,
            }
            : {
                type: options.type,
            };
        const message = this.getMsgTemplate(exports.TouchType.EVENT_SDK, content);
        this.sendUserMessage(message, forwardOff);
    }
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    async subscribeStream(mediaType) {
        const mediaConfig = {
            1: { media: "audio" },
            2: { media: "video" },
            3: undefined,
        };
        const config = mediaConfig[mediaType];
        await this.TCGSDK.gameResume(config);
    }
    /** 旋转截图 */
    setScreenshotRotation(rotation = 0) {
        // this.screenShotInstance?.setScreenshotRotation(rotation);
    }
    /** 生成封面图 */
    takeScreenshot(rotation = 0) { }
    /** 重新设置大小 */
    resizeScreenshot(width, height) { }
    /** 显示封面图 */
    showScreenShot() { }
    /** 显示封面图 */
    hideScreenShot() { }
    /** 清空封面图 */
    clearScreenShot() { }
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    async unsubscribeStream(mediaType) {
        const mediaConfig = {
            1: { media: "audio" },
            2: { media: "video" },
            3: undefined,
        };
        const config = mediaConfig[mediaType];
        await this.TCGSDK.gamePause(config);
    }
    /** 截图-保存到本地 */
    async saveScreenShotToLocal() {
        return this.TCGSDK.screenShot({
            name: this.options.clientId,
        });
    }
    /** 截图-保存到云机 */
    saveScreenShotToRemote() {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "localScreenshot" /* SdkEventType.LOCAL_SCREENSHOT */,
        }), true);
    }
    getRotateType() {
        return this.rotateType;
    }
    /** 手动定位 */
    setGPS(longitude, latitude) {
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "sdkLocation" /* SdkEventType.SDK_LOCATION */,
            content: JSON.stringify({
                latitude,
                longitude,
                time: new Date().getTime(),
            }),
        }), true);
    }
    /** 调整坐标 */
    reshapeWindow() {
        this.TCGSDK.reshapeWindow();
    }
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType) {
        this.options.keyboard = keyBoardType;
        this.sendUserMessage(this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "keyBoardType" /* SdkEventType.KEYBOARD_TYPE */,
            isLocalKeyBoard: keyBoardType === exports.KeyboardMode.LOCAL,
        }));
    }
    /** 底部栏操作按键 */
    sendCommand(command) {
        // const keyCodeMap: Record<string, number> = {
        //   back: AndroidKeyCode.KEYCODE_BACK,
        //   home: AndroidKeyCode.KEYCODE_HOME,
        //   menu: AndroidKeyCode.KEYCODE_MENU,
        // };
        // const keyCode = keyCodeMap[command] ?? Number(command);
        // this.TCGSDK.sendKeyboardEvent({ key: keyCode, down: true });
        // this.TCGSDK.sendKeyboardEvent({ key: keyCode, down: false });
        // 定义按键映射表 兼容老版本
        const keyCodeMap = {
            back: 4,
            home: 3,
            menu: 187,
        };
        // 获取keyCode,如果command不在映射表中则使用command本身
        const keyCode = keyCodeMap[command] ?? command;
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode,
            text: "",
        };
        this.sendUserMessage(JSON.stringify(messageObj));
    }
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState, keyCode, forwardOff = true) {
        const content = JSON.stringify({
            touchType: "shortcutKey" /* MessageKey.SHORTCUT_KEY */,
            metaState: metaState + "",
            keyCode: keyCode + "",
        });
        this.options.clientId;
        this.sendUserMessage(content, forwardOff);
    }
    /** 注入视频到相机 */
    injectVideoStream(type, options, timeout = 0) {
        return new Promise(async (resolve) => {
            let timeoutHandler = null;
            if (timeout) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        type,
                        status: "timeout",
                        result: null,
                    });
                }, timeout);
            }
            try {
                // 保存resolve函数以便在收到响应时调用
                Object.assign(this.promiseMap.injectStatus, {
                    resolve: (result) => {
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve(result);
                    },
                });
                const message = this.getMsgTemplate(exports.TouchType.EVENT_SDK, type === "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */
                    ? {
                        type,
                        fileUrl: options?.fileUrl,
                        isLoop: options?.isLoop ?? true,
                        fileName: options?.fileName,
                    }
                    : {
                        type,
                    });
                this.sendUserMessage(message, true);
            }
            catch {
                resolve({
                    type,
                    status: "unknown",
                    result: null,
                });
            }
        });
    }
    /** 音量增加按键事件 */
    increaseVolume() {
        this.TCGSDK.sendKeyboardEvent({
            key: 58 /* AndroidKeyCode.KEYCODE_VOLUME_UP */,
            down: true,
        });
        this.TCGSDK.sendKeyboardEvent({
            key: 58 /* AndroidKeyCode.KEYCODE_VOLUME_UP */,
            down: false,
        });
    }
    /** 音量减少按键事件 */
    decreaseVolume() {
        this.TCGSDK.sendKeyboardEvent({
            key: 59 /* AndroidKeyCode.KEYCODE_VOLUME_DOWN */,
            down: true,
        });
        this.TCGSDK.sendKeyboardEvent({
            key: 59 /* AndroidKeyCode.KEYCODE_VOLUME_DOWN */,
            down: false,
        });
    }
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag) {
        this.options.saveCloudClipboard = flag;
    }
}

class CustomGroupRtc {
    engine = null;
    params = null;
    pads = [];
    callbacks = null;
    sourceArr = [];
    constructor(params, pads, callbacks) {
        this.params = params;
        this.pads = pads;
        this.callbacks = callbacks;
    }
    // 关闭 WebSocket 连接
    close() {
        this.sourceArr?.forEach((v) => {
            v.cancel();
        });
        this.sourceArr = [];
    }
    kickItOutRoom(pads) {
        this.pads = this.pads?.filter((v) => !pads?.includes(v)) || [];
        this.sendMessage(JSON.stringify({
            touchType: "kickOutUser",
            content: JSON.stringify(pads),
        }));
    }
    joinRoom(pads) {
        this.pads = [...new Set([...(this.pads || []), ...(pads || [])])];
        const source = axios.CancelToken.source(); // 创建一个取消令牌
        this.sourceArr.push(source);
        return new Promise((resolve, reject) => {
            const { baseUrl } = this.params;
            const base = baseUrl
                ? `${baseUrl}/rtc/open/room/sdk/share/applyToken`
                : `https://openapi.armcloud.net/rtc/open/room/sdk/share/applyToken`;
            const { userId, uuid, token, manageToken } = this.params;
            const url = manageToken ? "/manage/rtc/room/share/applyToken" : base;
            const tok = manageToken || token;
            axios
                .post(url, {
                userId,
                uuid,
                terminal: "h5",
                expire: 360000,
                pushPublicStream: false,
                pads: pads?.map((v) => {
                    return {
                        padCode: v,
                        // videoStream: {
                        //   resolution: 7, // 分辨率
                        //   frameRate: 5, // 帧率
                        //   bitrate: 13, // 码率
                        // },
                        userId,
                    };
                }),
            }, {
                headers: manageToken ? { Authorization: tok } : { token: tok },
                cancelToken: source.token,
            })
                .then((res) => {
                resolve(res);
            })
                .catch((error) => {
                if (axios.isCancel(error)) {
                    return;
                }
                reject(error);
            });
        });
    }
    async getEngine() {
        return new Promise((resolve, reject) => {
            this.joinRoom(this.pads)
                .then((res) => {
                const { userId } = this.params;
                const { appId, roomCode, roomToken } = res?.data?.data || {};
                this.engine = VERTC.createEngine(appId);
                this.createEngine({
                    roomCode,
                    roomToken,
                    userId,
                    resolve,
                    reject,
                });
            })
                .catch((err) => {
                const error = new Error("Get Token Error");
                error.code = "TOKEN_ERR";
                reject(error);
            });
        });
    }
    async sendUserMessage(userId, message) {
        return await this?.engine?.sendUserMessage(userId, message);
    }
    async sendMessage(message) {
        return await this?.engine?.sendRoomMessage(message);
    }
    getMsgTemplate(touchType, content) {
        return JSON.stringify({
            touchType,
            content: JSON.stringify(content),
        });
    }
    /** 远端可见用户加入房间 */
    onUserJoined() {
        this?.engine?.on(VERTC.events.onUserJoined, (user) => {
            this.callbacks.onUserLeaveOrJoin?.({
                type: "join",
                userInfo: user?.userInfo,
            });
        });
    }
    /** 监听 onUserMessageReceived 事件 */
    onUserMessageReceived() {
        const onUserMessageReceived = (e) => {
            if (e.message) {
                const msg = JSON.parse(e.message);
                if (msg.key === "userjoin") {
                    this.sendMessage(this.getMsgTemplate("openGroupControl", {
                        pads: this.pads,
                    }));
                    this.sendUserMessage(e.userId, this.getMsgTemplate("openGroupControl", { isOpen: true }));
                }
            }
        };
        this.engine.on(VERTC.events.onUserMessageReceived, onUserMessageReceived);
    }
    /** 远端可见用户加离开房间 */
    onUserLeave() {
        this?.engine?.on(VERTC.events.onUserLeave, (user) => {
            this.callbacks.onUserLeaveOrJoin?.({
                type: "leave",
                userInfo: user?.userInfo,
            });
        });
    }
    async createEngine(options) {
        const { roomToken, roomCode, userId, resolve, reject } = options;
        try {
            const res = await this.engine.joinRoom(roomToken, roomCode, {
                userId,
            }, {
                isAutoPublish: false,
                isAutoSubscribeAudio: false,
                isAutoSubscribeVideo: false,
            });
            this.onUserJoined();
            this.onUserLeave();
            this.onUserMessageReceived();
            this.sendMessage(this.getMsgTemplate("openGroupControl", {
                pads: this.pads,
            }));
            resolve({
                engine: this.engine,
                result: res,
            });
        }
        catch (error) {
            reject(error);
        }
    }
}

class ScreenshotOverlay {
    videoContainer;
    video;
    rotateType;
    canvas;
    context;
    constructor(videoContainer, rotateType = 0) {
        this.videoContainer = videoContainer;
        this.video = this.videoContainer?.querySelector("video");
        this.rotateType = rotateType;
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d", {
            willReadFrequently: true,
        });
        this.initCanvas();
    }
    // 初始化 Canvas 并插入到 video 上
    initCanvas() {
        if (this.videoContainer && this.canvas) {
            // 设置 canvas 尺寸与 video 元素的显示尺寸一致
            this.videoContainer.style.position = "relative";
            Object.assign(this.canvas.style, {
                top: 0,
                left: 0,
                position: "absolute",
                display: "none",
                pointerEvents: "none",
                zIndex: "10",
                // border: '5px solid red'
            });
            // 将 canvas 插入到 video 的父元素中，覆盖在 video 上
            this.videoContainer?.appendChild(this.canvas);
        }
    }
    configureCanvas(rotateType, width, height) {
        // 交换宽高并清空画布
        if (rotateType === 1) {
            this.canvas.width = height;
            this.canvas.height = width;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.translate(0, this.canvas.height);
            this.context.rotate(-Math.PI / 2); // 270度旋转
        }
        else {
            // 恢复到正常状态
            this.canvas.width = width;
            this.canvas.height = height;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 如果旋转类型已设置，交换宽高
            if (this.rotateType) {
                [this.canvas.width, this.canvas.height] = [height, width];
            }
            this.context.setTransform(1, 0, 0, 1, 0, 0); // 恢复坐标系
        }
        this.rotateType = rotateType;
    }
    /**
     * 旋转截图
     * @param rotateType 0:竖屏 1:横屏
     */
    setScreenshotrotateType(rotateType = 0) {
        // 创建一个临时画布
        const tempCanvas = document.createElement("canvas");
        const tempContext = tempCanvas.getContext("2d");
        // 设置临时画布的尺寸为当前画布尺寸
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        // 将当前画布内容绘制到临时画布
        tempContext.drawImage(this.canvas, 0, 0);
        // 配置画布的旋转和尺寸
        this.configureCanvas(rotateType, tempCanvas.width, tempCanvas.height);
        // 将临时画布的内容绘制到旋转后的画布
        this.context.drawImage(tempCanvas, 0, 0);
        // 释放临时画布
        tempCanvas.width = 0;
        tempCanvas.height = 0;
    }
    /**
     * 截图并绘制在 canvas 上
     * @param rotateType 0:竖屏 1:横屏
     */
    takeScreenshot(rotateType = 0) {
        this.rotateType = rotateType;
        this.video = this.videoContainer?.querySelector("video");
        if (this.context && this.video) {
            const { offsetTop, offsetLeft, offsetWidth, offsetHeight } = this.video;
            Object.assign(this.canvas, {
                top: `${offsetTop}px`,
                left: `${offsetLeft}px`,
                width: offsetWidth,
                height: offsetHeight,
            });
            // 清空 canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            // 保存当前状态
            this.context.save();
            // 配置画布的旋转和尺寸
            this.configureCanvas(rotateType, offsetWidth, offsetHeight);
            // 使用 video 的显示尺寸绘制截图
            this.context.drawImage(this.video, 0, 0, offsetWidth, offsetHeight);
            // 恢复画布状态
            this.context.restore();
        }
        else {
            console.log("视频未准备好或加载失败");
        }
    }
    resizeScreenshot(width, height) {
        if (this.canvas && this.context) {
            // 保存旧的截图
            const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            // 创建一个临时 canvas
            const tempCanvas = document.createElement("canvas");
            const tempContext = tempCanvas.getContext("2d");
            // 计算保持宽高比
            const aspectRatio = imageData.width / imageData.height;
            let newWidth, newHeight;
            if (width / height > aspectRatio) {
                newWidth = height * aspectRatio;
                newHeight = height;
            }
            else {
                newWidth = width;
                newHeight = width / aspectRatio;
            }
            // 设置临时 canvas 尺寸
            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;
            // 将旧截图绘制到临时 canvas
            tempContext?.drawImage(this.canvas, 0, 0, imageData.width, imageData.height, 0, 0, newWidth, newHeight);
            // 清空当前 canvas 并调整尺寸
            this.canvas.width = width;
            this.canvas.height = height;
            this.context.clearRect(0, 0, width, height);
            // 将调整后的图像绘制到当前 canvas 中
            this.context.drawImage(tempCanvas, 0, 0, newWidth, newHeight, 0, 0, width, height);
        }
        else {
            console.log("Canvas or context is not initialized.");
        }
    }
    // 清除 canvas 覆盖
    clearScreenShot() {
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    showScreenShot() {
        if (this.canvas) {
            this.canvas.style.display = "block";
        }
    }
    hideScreenShot() {
        if (this.canvas) {
            this.canvas.style.display = "none";
        }
    }
    // 销毁类的实例
    destroy() {
        // 清除 canvas
        this.clearScreenShot();
        // 从 videoContainer 中移除 canvas
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        this.videoContainer.style.position = "";
        // 释放引用
        this.videoContainer = null;
        this.video = null;
        this.canvas = null;
        this.context = null;
    }
}

class CustomRtc extends BaseRtc {
    screenShotInstance = null;
    isFirstRotate = false;
    metricsReporter = null;
    remoteResolution = {
        width: 0,
        height: 0,
    };
    // 键盘快捷键监听函数
    _listenKeyboardShortcut = () => { };
    // 云手机容器是否处于活跃交互状态
    isContainerActive = false;
    // 触摸坐标信息
    touchInfo = generateTouchCoord();
    // 模拟触摸
    simulateTouchInfo = generateTouchCoord();
    // 群控同步
    groupControlSync = true;
    engine = null;
    groupEngine = null;
    roomMessage = {};
    isFirstFrame = false;
    firstFrameCount = 0;
    rotation = 0;
    // 埋点定时器
    metricsTimer = null;
    poorNetworkCount = 0;
    goodNetworkCount = 0;
    rotateType = 0;
    // 摄像头分辨率信息
    cameraResolution = {
        width: 0,
        height: 0,
    };
    constructor(viewId, params, callbacks) {
        super(viewId, params, callbacks);
        const { masterIdPrefix, padCode } = params;
        this.remoteUserId = params.padCode;
        this.enableMicrophone = params.enableMicrophone;
        this.enableCamera = params.enableCamera;
        this.videoDeviceId = params.videoDeviceId;
        this.audioDeviceId = params.audioDeviceId;
        // 获取外部容器div元素
        document.getElementById(this.initDomId);
        // 创建并添加 video 容器
        this.createVideoContainer(padCode, masterIdPrefix);
        // 创建引擎对象
        this.createEngine();
    }
    /** 浏览器是否支持 */
    // eslint-disable-next-line class-methods-use-this
    isSupported() {
        return VERTC.isSupported();
    }
    /** 设置摄像头设备 */
    async setVideoDeviceId(val) {
        this.videoDeviceId = val;
        if (this.isCameraInject) {
            return this.cameraInject();
        }
    }
    /** 设置麦克风设备 */
    async setAudioDeviceId(val) {
        this.audioDeviceId = val;
        if (this.isMicrophoneInject) {
            return this.microphoneInject();
        }
        return;
    }
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor, forwardOff = true) {
        this.sendUserMessage(this.options.clientId, this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type: "operateSwitch" /* MessageKey.OPERATE_SWITCH */,
            isOpen: isMonitor,
        }), forwardOff);
    }
    setVideoEncoder(width, height) {
        if (!width || !height) {
            return;
        }
        this.cameraResolution = {
            width,
            height,
        };
        const frameRate = 15;
        const maxKbps = 4000;
        Logger.info("设置编码器参数", width, height, frameRate, maxKbps);
        this.engine?.setVideoEncoderConfig({
            width,
            height,
            frameRate,
            maxKbps,
        });
    }
    /** 调用 createEngine 创建一个本地 Engine 引擎对象 */
    async createEngine() {
        if (this.options.disable)
            return;
        this.inputService.initIme(this.initDomId, { disableLocalIME: this.options.disableLocalIME });
        this.engine = VERTC.createEngine(this.options.appId);
        VERTC.setParameter("ICE_CONFIG_REQUEST_URLS", this.options.iceServersUrls && this.options.iceServersUrls.length > 0
            ? this.options.iceServersUrls
            : [
                "rtcg-access.volcvideos.com",
                "rtcg-access-va.volcvideos.com",
                "rtcg-access-fr.volcvideos.com",
                "rtcg-access-sg.volcvideos.com",
                "rtc-access-ag.bytedance.com",
                "rtc-access.bytedance.com",
                "rtc-access2-hl.bytedance.com",
                "rtcg-access.bytevcloud.com",
            ]);
        this.engine?.on(VERTC.events.onLocalVideoSizeChanged, (resolution) => {
            const { width, height } = resolution?.info || {};
            this.setVideoEncoder(width, height);
        });
        /** 监听失败回调 */
        this.engine.on(VERTC.events.onError, (error) => {
            this.callbacks.onErrorMessage?.(error);
        });
        /** 监听播放失败回调 */
        this.engine.on(VERTC.events.onAutoplayFailed, (e) => {
            this.callbacks.onAutoplayFailed?.(e);
        });
        /** 用户订阅的远端音/视频流统计信息以及网络状况，统计周期为 2s */
        this.engine.on(VERTC.events.onRemoteStreamStats, (e) => {
            const stats = {
                userId: e.uid || e.userId,
                audioStats: e.audioStats
                    ? {
                        audioLossRate: e.audioStats.audioLossRate,
                        receivedKBitrate: e.audioStats.receivedKBitrate,
                        rtt: e.audioStats.rtt,
                        jitterBufferDelay: e.audioStats.jitterBufferDelay,
                        numChannels: e.audioStats.numChannels,
                        receivedSampleRate: e.audioStats.receivedSampleRate,
                        concealedSamples: e.audioStats.concealedSamples,
                        concealmentEvent: e.audioStats.concealmentEvent,
                        codecType: e.audioStats.codecType,
                    }
                    : null,
                videoStats: {
                    width: e.videoStats.width,
                    height: e.videoStats.height,
                    videoLossRate: e.videoStats.videoLossRate,
                    receivedKBitrate: e.videoStats.receivedKBitrate,
                    decoderOutputFrameRate: e.videoStats.decoderOutputFrameRate,
                    rtt: e.videoStats.rtt,
                    codecType: e.videoStats.codecType,
                    totalRtt: e.videoStats.totalRtt,
                },
            };
            this.callbacks.onRunInformation?.(stats);
        });
        /** 加入房间后，会以每2秒一次的频率，收到本端上行及下行的网络质量信息。 */
        this.engine.on(VERTC.events.onNetworkQuality, (uplinkNetworkQuality, downlinkNetworkQuality) => {
            this.handleAdaptiveOptimization(downlinkNetworkQuality);
            this.callbacks.onNetworkQuality?.(uplinkNetworkQuality, downlinkNetworkQuality);
        });
    }
    /**
     * 根据网络质量自动调整流性能
     * @param quality 网络质量等级 (1-6, 1最好, 6最差)
     */
    handleAdaptiveOptimization(quality) {
        if (this.options.disable)
            return;
        // 网络较差 (4: 差, 5: 极差, 6: 失去连接)
        if (quality >= 4) {
            this.poorNetworkCount++;
            this.goodNetworkCount = 0;
            if (this.poorNetworkCount >= 3 && this.rotateType !== -1) { // 借用 rotateType 做标记或增加新状态
                // 降低码率
                const { resolution, frameRate, bitrate } = this.options.videoStream;
                if (bitrate && bitrate > 1) {
                    Logger.info("Network poor, reducing bitrate");
                    this.setStreamConfig({
                        definitionId: resolution || 12,
                        framerateId: frameRate || 2,
                        bitrateId: Math.max(1, (bitrate || 3) - 1),
                    }, true);
                }
                this.poorNetworkCount = 0;
            }
        }
        else if (quality <= 2) {
            // 网络良好
            this.goodNetworkCount++;
            this.poorNetworkCount = 0;
            if (this.goodNetworkCount >= 10) {
                // 尝试恢复码率 (TODO: 记录原始码率)
                this.goodNetworkCount = 0;
            }
        }
    }
    // 创建群控实例
    async createGroupEngine(pads = [], config) {
        this.groupRtc = new CustomGroupRtc({ ...this.options, ...config }, pads, this.callbacks);
        try {
            const example = await this.groupRtc?.getEngine?.();
            if (example) {
                this.groupEngine = example.engine;
            }
        }
        catch (error) {
            this.callbacks.onGroupControlError?.({
                code: error.code,
                msg: error.message,
            });
        }
    }
    /** 手动销毁通过 createEngine 所创建的引擎对象 */
    destroyEngine() {
        if (this.engine)
            VERTC.destroyEngine(this.engine);
        if (this.groupEngine)
            VERTC.destroyEngine(this.groupEngine);
    }
    /**
     * 静音
     */
    muted() {
        this.engine?.unsubscribeStream(this.options.clientId, exports.MediaType.AUDIO);
    }
    /**
     * 取消静音
     */
    unmuted() {
        this.engine?.subscribeStream(this.options.clientId, exports.MediaType.AUDIO);
    }
    /** 按顺序发送文本框 */
    sendGroupInputString(pads, strs) {
        strs?.map((v, index) => {
            const message = JSON.stringify({
                text: v,
                pads: [pads[index]],
                touchType: exports.TouchType.INPUT_BOX,
            });
            this.groupRtc?.sendMessage?.(message);
        });
    }
    /**  群控剪切板  */
    sendGroupInputClipper(pads, strs) {
        strs?.map((v, index) => {
            const message = JSON.stringify({
                text: v,
                pads: [pads[index]],
                touchType: exports.TouchType.CLIPBOARD,
            });
            this.groupRtc?.sendMessage?.(message);
        });
    }
    /** 手动开启音视频流播放 */
    startPlay() {
        if (this.engine)
            this.engine.play(this.options.clientId);
    }
    /** 群控房间信息 */
    async sendGroupMessage(message) {
        return await this?.groupRtc?.sendMessage?.(message);
    }
    /** 获取应用信息 */
    getEquipmentInfo(type) {
        this.sendUserMessage(this.options.clientId, this.getMsgTemplate(exports.TouchType.EQUIPMENT_INFO, {
            type,
        }), true);
    }
    /** 获取注入推流状态 */
    getInjectStreamStatus(type, timeout = 0) {
        return new Promise((resolve) => {
            // 创建超时处理器
            let timeoutHandler = null;
            if (timeout !== 0) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        status: "unknown",
                        type,
                    });
                }, timeout);
            }
            // 根据类型处理不同的流状态
            const handleStreamStatus = () => {
                switch (type) {
                    case "video":
                        try {
                            // 保存resolve函数以便在收到响应时调用
                            Object.assign(this.promiseMap.streamStatus, {
                                resolve: (result) => {
                                    if (timeoutHandler)
                                        clearTimeout(timeoutHandler);
                                    resolve(result);
                                },
                            });
                            this.sendUserMessage(this.options.clientId, this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
                                type: "injectionVideoStats",
                            }), true);
                        }
                        catch (error) {
                            if (timeoutHandler)
                                clearTimeout(timeoutHandler);
                            resolve({
                                status: "unknown",
                                type,
                            });
                        }
                        break;
                    case "camera":
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isCameraInject ? "live" : "offline",
                            type,
                        });
                        break;
                    case "audio":
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve({
                            status: this.isMicrophoneInject ? "live" : "offline",
                            type,
                        });
                        break;
                }
            };
            handleStreamStatus();
        });
    }
    /** 应用卸载 */
    appUnInstall(pkgNames) {
        this.sendUserMessage(this.options.clientId, this.getMsgTemplate(exports.TouchType.APP_UNINSTALL, pkgNames), true);
    }
    /** 通知手机需要注入 */
    async notifyInject(type, isOpen) {
        await this.sendUserMessage(this.options.clientId, this.getMsgTemplate(exports.TouchType.EVENT_SDK, {
            type,
            isOpen,
        }), true);
    }
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    async startMediaStream(mediaType, msgData) {
        try {
            const res = {
                audio: null,
                video: null,
            };
            // 处理视频设备
            if ([exports.MediaType.VIDEO, exports.MediaType.AUDIO_AND_VIDEO].includes(mediaType)) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, true);
                const videoDeviceId = this.videoDeviceId || (msgData?.isFront ? "user" : "environment");
                await this.engine?.setVideoCaptureDevice(videoDeviceId);
                res.video = await this.engine?.startVideoCapture();
                //  this.setVideoEncoder(res?.video?.width, res?.video?.height);
                await this.engine?.publishStream(exports.MediaType.VIDEO);
                this.isCameraInject = true;
            }
            // 处理音频设备
            if ([exports.MediaType.AUDIO, exports.MediaType.AUDIO_AND_VIDEO].includes(mediaType)) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, true);
                if (this.audioDeviceId) {
                    await this.engine?.setAudioCaptureDevice(this.audioDeviceId);
                }
                res.audio = await this.engine?.startAudioCapture();
                await this.engine?.publishStream(exports.MediaType.AUDIO);
                this.isMicrophoneInject = true;
            }
            return res;
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    async stopMediaStream(mediaType) {
        try {
            const stopOperations = [];
            // 根据媒体类型添加对应操作
            if (mediaType === exports.MediaType.VIDEO ||
                mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionCamera" /* SdkEventType.INJECTION_CAMERA */, false);
                stopOperations.push(this.engine?.stopVideoCapture(), this.engine?.unpublishStream(exports.MediaType.VIDEO));
            }
            if (mediaType === exports.MediaType.AUDIO ||
                mediaType === exports.MediaType.AUDIO_AND_VIDEO) {
                await this.notifyInject("injectionAudio" /* SdkEventType.INJECTION_AUDIO */, false);
                stopOperations.push(this.engine?.stopAudioCapture(), this.engine?.unpublishStream(exports.MediaType.AUDIO));
            }
            // 并行执行所有停止操作
            await Promise.all(stopOperations);
            switch (mediaType) {
                case exports.MediaType.VIDEO:
                    this.isCameraInject = false;
                    break;
                case exports.MediaType.AUDIO:
                    this.isMicrophoneInject = false;
                    break;
                case exports.MediaType.AUDIO_AND_VIDEO:
                    this.isCameraInject = false;
                    this.isMicrophoneInject = false;
                    break;
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    /** 摄像头注入 */
    async cameraInject(msgData) {
        try {
            await this.stopMediaStream(exports.MediaType.VIDEO);
            const res = await this.startMediaStream(exports.MediaType.VIDEO, msgData);
            this.callbacks.onVideoInit?.(res.video);
        }
        catch (error) {
            this.callbacks.onVideoError?.(error);
            return Promise.reject(error);
        }
    }
    /** 麦克风注入 */
    async microphoneInject() {
        try {
            await this.stopMediaStream(exports.MediaType.AUDIO);
            const res = await this.startMediaStream(exports.MediaType.AUDIO);
            this.callbacks.onAudioInit?.(res.audio);
            this.isMicrophoneInject = true;
            return res.audio;
        }
        catch (error) {
            this.callbacks.onAudioError?.(error);
            this.isMicrophoneInject = false;
            return Promise.reject(error);
        }
    }
    /** 发送消息 */
    async sendUserMessage(userId, message, notSendInGroups) {
        try {
            // 重置无操作回收定时器
            this.triggerRecoveryTimeCallback();
            !notSendInGroups &&
                this.groupControlSync &&
                this.sendGroupMessage(message);
            return await this.engine?.sendUserMessage(userId, message);
        }
        catch (error) {
            this.callbacks.onSendUserError?.(error);
            return Promise.reject(error);
        }
    }
    /** 群控退出房间 */
    kickItOutRoom(pads) {
        if (Array.isArray(pads)) {
            this.groupRtc?.kickItOutRoom(pads);
        }
    }
    /** 群控加入房间 */
    joinGroupRoom(pads) {
        const arr = pads?.filter((v) => v !== this.remoteUserId);
        if (!arr.length || !this.isGroupControl)
            return;
        if (!this.groupRtc && this.isGroupControl) {
            this.createGroupEngine(arr);
            return;
        }
        this.groupRtc?.joinRoom(arr);
    }
    /** 进入 RTC 房间 */
    start(isGroupControl = false, pads = []) {
        this.isGroupControl = isGroupControl;
        this.metricsReporter = new MetricsReporter({
            endpoint: `${this.options.baseUrl}/traffic-info/open/traffic/rtcMonitor`,
            commonParams: {
                padCode: this.remoteUserId,
                streamType: this.options.streamType,
                sdkTerminal: "h5",
            },
            onceOnlyKeys: ["FirstFrame" /* ReportEventType.FIRST_FRAME */],
            useBeacon: false,
            enableLog: true,
        });
        this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
            joinRoomTime: Date.now(),
        });
        this.metricsTimer = setTimeout(() => {
            this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                judgeTime: Date.now(),
                result: 0,
            });
            this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
        }, 5000);
        const config = {
            appId: this.options.appId,
            roomId: this.options.roomCode,
            uid: this.options.userId,
            token: this.options.roomToken,
        };
        this.options.mediaType === 1 || this.options.mediaType === 3;
        this.options.mediaType === 2 || this.options.mediaType === 3;
        this.engine
            ?.joinRoom(config.token, config.roomId, {
            userId: config.uid,
        }, {
            isAutoPublish: false, // 是否自动发布音视频流，默认为自动发布。
            isAutoSubscribeAudio: false, // 是否自动订阅音频流，默认为自动订阅。
            isAutoSubscribeVideo: false, // 是否自动订阅视频流，默认为自动订阅。
        })
            .then(async (res) => {
            const arr = pads?.filter((v) => v !== this.remoteUserId);
            isGroupControl && arr.length && this.createGroupEngine(arr);
            // 加入房间成功
            const that = this;
            const { disableContextMenu, clientId: userId } = this.options;
            const videoDom = document.getElementById(that.videoDomId);
            if (videoDom) {
                videoDom.style.width = "0px";
                videoDom.style.height = "0px";
                const isMobileFlag = isTouchDevice() || isMobile();
                let eventTypeStart = "touchstart";
                let eventTypeMove = "touchmove";
                let eventTypeEnd = "touchend";
                if (!isMobileFlag) {
                    eventTypeStart = "mousedown";
                    eventTypeMove = "mousemove";
                    eventTypeEnd = "mouseup";
                }
                if (disableContextMenu) {
                    videoDom.addEventListener("contextmenu", (e) => {
                        e.preventDefault();
                    });
                }
                // 监听鼠标滚轮事件
                videoDom.addEventListener("wheel", (e) => {
                    // e.preventDefault()
                    if (this.options.disable)
                        return;
                    const { offsetX, offsetY, deltaY } = e;
                    const touchConfigMousedown = {
                        coords: [{ pressure: 1.0, size: 1.0, x: offsetX, y: offsetY }],
                        widthPixels: videoDom.clientWidth,
                        heightPixels: videoDom.clientHeight,
                        pointCount: 1,
                        properties: [{ id: 0, toolType: 1 }],
                        touchType: "gestureSwipe",
                        swipe: deltaY > 0 ? -1 : 1,
                    };
                    const messageMousedown = JSON.stringify(touchConfigMousedown);
                    this.sendUserMessage(userId, messageMousedown);
                });
                /** 鼠标移出 */
                videoDom.addEventListener("mouseleave", (e) => {
                    e.preventDefault();
                    if (this.options.disable)
                        return;
                    // 若未按下时，不发送鼠标移动事件
                    if (!this.hasPushDown) {
                        return;
                    }
                    this.touchConfig.action = 1; // 抬起
                    const message = JSON.stringify(this.touchConfig);
                    this.sendUserMessage(userId, message);
                });
                // 添加触摸事件监听器到新节点
                // 触摸开始
                videoDom.addEventListener(eventTypeStart, (e) => {
                    e.preventDefault();
                    if (this.options.disable)
                        return;
                    that.hasPushDown = true;
                    const { allowLocalIMEInCloud, keyboard } = that.options;
                    const { inputStateIsOpen } = that.roomMessage;
                    // 处理输入框焦点逻辑
                    const shouldHandleFocus = (allowLocalIMEInCloud && keyboard === "pad") ||
                        keyboard === "local";
                    if (that.inputService.getInputElement() &&
                        shouldHandleFocus &&
                        typeof inputStateIsOpen === "boolean") {
                        inputStateIsOpen
                            ? that.inputService.focus()
                            : that.inputService.blur();
                    }
                    this.touchInfo = generateTouchCoord();
                    // 获取节点相对于视口的位置信息
                    const videoDomIdRect = videoDom.getBoundingClientRect();
                    const distanceToTop = videoDomIdRect.top;
                    const distanceToLeft = videoDomIdRect.left;
                    // 初始化
                    that.touchConfig.properties = [];
                    that.touchConfig.coords = [];
                    // 计算触摸手指数量
                    const touchCount = isMobileFlag ? e?.touches?.length : 1;
                    that.touchConfig.action = 0; // 按下操作
                    that.touchConfig.pointCount = touchCount;
                    // 手指触控节点宽高
                    const bigSide = videoDom.clientWidth > videoDom.clientHeight
                        ? videoDom.clientWidth
                        : videoDom.clientHeight;
                    const smallSide = videoDom.clientWidth > videoDom.clientHeight
                        ? videoDom.clientHeight
                        : videoDom.clientWidth;
                    this.touchConfig.widthPixels =
                        this.rotateType == 1 ? bigSide : smallSide;
                    this.touchConfig.heightPixels =
                        this.rotateType == 1 ? smallSide : bigSide;
                    if (this.rotateType == 1 &&
                        this.remoteResolution.height > this.remoteResolution.width) {
                        this.touchConfig.widthPixels = smallSide;
                        this.touchConfig.heightPixels = bigSide;
                    }
                    else if (this.rotateType == 0 &&
                        this.remoteResolution.width > this.remoteResolution.height) {
                        // 竖屏但是远端流是横屏（用户手动旋转屏幕）
                        this.touchConfig.widthPixels = bigSide;
                        this.touchConfig.heightPixels = smallSide;
                    }
                    for (let i = 0; i < touchCount; i += 1) {
                        const touch = isMobileFlag ? e.touches[i] : e;
                        that.touchConfig.properties[i] = {
                            id: i,
                            toolType: 1,
                        };
                        let x = touch.offsetX;
                        let y = touch.offsetY;
                        if (x == undefined) {
                            x = touch.clientX - distanceToLeft;
                            y = touch.clientY - distanceToTop;
                            if (this.rotateType == 1 &&
                                this.remoteResolution.height > this.remoteResolution.width) {
                                x = videoDomIdRect.bottom - touch.clientY;
                                y = touch.clientX - distanceToLeft;
                            }
                            else if (this.rotateType == 0 &&
                                this.remoteResolution.width > this.remoteResolution.height) {
                                x = touch.clientY - distanceToTop;
                                y = videoDomIdRect.right - touch.clientX;
                            }
                        }
                        that.touchConfig.coords.push({
                            ...this.touchInfo,
                            orientation: 0.01 * Math.random(),
                            x: x,
                            y: y,
                        });
                    }
                    const touchConfig = {
                        action: touchCount > 1 ? 261 : 0,
                        widthPixels: that.touchConfig.widthPixels,
                        heightPixels: that.touchConfig.heightPixels,
                        pointCount: touchCount,
                        touchType: "gesture",
                        properties: that.touchConfig.properties,
                        coords: that.touchConfig.coords,
                    };
                    const message = JSON.stringify(touchConfig);
                    that.sendUserMessage(userId, message);
                });
                // 触摸中
                videoDom.addEventListener(eventTypeMove, (e) => {
                    e.preventDefault();
                    if (this.options.disable)
                        return;
                    // 若未按下时，不发送鼠标移动事件
                    if (!that.hasPushDown) {
                        return;
                    }
                    // 获取节点相对于视口的位置信息
                    const videoDomIdRect = videoDom.getBoundingClientRect();
                    const distanceToTop = videoDomIdRect.top;
                    const distanceToLeft = videoDomIdRect.left;
                    // 计算触摸手指数量
                    const touchCount = isMobileFlag ? e?.touches?.length : 1;
                    that.touchConfig.action = 2; // 触摸中
                    that.touchConfig.pointCount = touchCount;
                    that.touchConfig.coords = [];
                    const coords = [];
                    for (let i = 0; i < touchCount; i += 1) {
                        const touch = isMobileFlag ? e.touches[i] : e;
                        that.touchConfig.properties[i] = {
                            id: i,
                            toolType: 1,
                        };
                        let x = touch.offsetX;
                        let y = touch.offsetY;
                        if (x == undefined) {
                            x = touch.clientX - distanceToLeft;
                            y = touch.clientY - distanceToTop;
                            if (this.rotateType == 1 &&
                                this.remoteResolution.height > this.remoteResolution.width) {
                                x = videoDomIdRect.bottom - touch.clientY;
                                y = touch.clientX - distanceToLeft;
                            }
                            else if (this.rotateType == 0 &&
                                this.remoteResolution.width > this.remoteResolution.height) {
                                x = touch.clientY - distanceToTop;
                                y = videoDomIdRect.right - touch.clientX;
                            }
                        }
                        coords.push({
                            ...this.touchInfo,
                            orientation: 0.01 * Math.random(),
                            x: x,
                            y: y,
                        });
                    }
                    that.touchConfig.coords = coords;
                    const touchConfig = {
                        action: 2,
                        widthPixels: that.touchConfig.widthPixels,
                        heightPixels: that.touchConfig.heightPixels,
                        pointCount: touchCount,
                        touchType: "gesture",
                        properties: that.touchConfig.properties,
                        coords: that.touchConfig.coords,
                    };
                    const message = JSON.stringify(touchConfig);
                    // Logger.info('2222触摸中', message)
                    that.sendUserMessage(userId, message);
                });
                // 触摸结束
                videoDom.addEventListener(eventTypeEnd, (e) => {
                    e.preventDefault();
                    if (this.options.disable)
                        return;
                    that.hasPushDown = false; // 按下状态重置
                    if (isMobileFlag) {
                        if (e.touches.length === 0) {
                            that.touchConfig.action = 1; // 抬起
                            const message = JSON.stringify(that.touchConfig);
                            that.sendUserMessage(userId, message);
                        }
                    }
                    else {
                        that.touchConfig.action = 1; // 抬起
                        const message = JSON.stringify(that.touchConfig);
                        // Logger.info("触摸结束", message);
                        that.sendUserMessage(userId, message);
                    }
                });
                // 监听广播消息
                that.onRoomMessageReceived();
                that.onUserMessageReceived();
                that.onUserJoined();
                that.onUserLeave();
                that.onRemoteVideoFirstFrame();
                // 远端摄像头/麦克风采集音视频流的回调
                that.onUserPublishStream();
                this.startCV();
                this.callbacks.onConnectSuccess?.();
            }
            /**
             * 监听连接状态的变化
             * @return
             * 0 进行连接前准备，锁定相关资源,
             * 1 连接断开,
             * 2 首次连接，正在连接中,
             * 3 首次连接成功,
             * 4 连接断开后重新连接中,
             * 5 连接断开后重连成功,
             * 6 处于 CONNECTION_STATE_DISCONNECTED 状态超过 10 秒，且期间重连未成功。SDK将继续尝试重连
             */
            that.engine?.on(VERTC.events.onConnectionStateChanged, (e) => {
                that.callbacks.onConnectionStateChanged?.(e);
            });
            // that.engine?.on(
            //   VERTC.events.onAudioDeviceStateChanged,
            //   debounce((e) => {
            //     Logger.info("音频设备状态变化", e);
            //     if (e.deviceState == "active" && this.enableMicrophone) {
            //       this.microphoneInject();
            //     }
            //     that.callbacks?.onAudioDeviceStateChanged?.(e);
            //   }, 500)
            // );
        })
            .catch((error) => {
            this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                judgeTime: Date.now(),
                result: 0,
            });
            this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
            Logger.info("进房错误", error);
            this.callbacks.onConnectFail?.({ code: error.code, msg: error.message });
        });
    }
    startCV() {
        Logger.info("startCV", this.videoDomId);
        this._listenKeyboardShortcut = this.listenKeyboardShortcut.bind(this);
        this.disableKeyboardShortcut();
        this.enableKeyboardShortcut();
        this.bindContainerActiveState();
    }
    bindContainerActiveState() {
        const container = document.getElementById(this.initDomId);
        if (!container)
            return;
        container.addEventListener("mousedown", () => { this.isContainerActive = true; });
        container.addEventListener("touchstart", () => { this.isContainerActive = true; });
        document.addEventListener("mousedown", (e) => {
            if (!container.contains(e.target))
                this.isContainerActive = false;
        });
        document.addEventListener("touchstart", (e) => {
            if (!container.contains(e.target))
                this.isContainerActive = false;
        });
    }
    enableKeyboardShortcut() {
        document.addEventListener("keydown", this._listenKeyboardShortcut);
    }
    disableKeyboardShortcut() {
        Logger.info("disableKeyboardShortcut");
        document.removeEventListener("keydown", this._listenKeyboardShortcut);
    }
    /**
   * 监听键盘快捷键
   */
    listenKeyboardShortcut(e) {
        if (e.isComposing)
            return; // 忽略输入法组合键
        // 只在云手机视频容器处于活跃交互状态时才拦截快捷键，避免影响页面其他区域的复制/全选操作
        if (!this.isContainerActive)
            return;
        const key = e.key.toLowerCase(); // 统一小写
        const ctrlOrCmd = e.ctrlKey || e.metaKey; // Win/Linux = Ctrl, macOS = Cmd
        if (ctrlOrCmd && key === "a") {
            e.preventDefault();
            this?.triggerKeyboardShortcut(8192, 29);
        }
        else if (ctrlOrCmd && key === "c") {
            e.preventDefault();
            this?.triggerKeyboardShortcut(8192, 31);
        }
    }
    /** 远端用户离开房间 */
    onUserLeave() {
        this.engine?.on(VERTC.events.onConnectionStateChanged, (e) => {
            Logger.info("onConnectionStateChanged ", e);
            // this.disableKeyboardShortcut()
        });
        this.engine?.on(VERTC.events.onUserLeave, (res) => {
            Logger.info("onUserLeave ", res);
            this.disableKeyboardShortcut();
            this.callbacks.onUserLeave?.(res);
        });
    }
    setViewSize(width, height, rotateType = 0) {
        const h5Dom = document.getElementById(this.initDomId);
        const videoDom = document.getElementById(this.videoDomId);
        if (h5Dom && videoDom) {
            const setDimensions = (element, width, height) => {
                element.style.width = width + "px";
                element.style.height = height + "px";
            };
            // 设置宽高
            setDimensions(h5Dom, width, height);
            if (rotateType == 1) {
                setDimensions(videoDom, height, width);
                return;
            }
            setDimensions(videoDom, width, height);
        }
    }
    async getCameraState(isRetry = false) {
        try {
            const userId = this.options.clientId;
            const contentObj = {
                type: "cameraState",
            };
            const messageObj = {
                touchType: "eventSdk",
                content: JSON.stringify(contentObj),
            };
            const message = JSON.stringify(messageObj);
            const res = await this.sendUserMessage(userId, message);
        }
        catch (error) {
            if (!isRetry) {
                return;
            }
            setTimeout(() => {
                this.getCameraState(false);
            }, 1000);
        }
    }
    async updateUiH5(isRetry = false) {
        try {
            const userId = this.options.clientId;
            const contentObj = {
                type: "updateUiH5",
            };
            const messageObj = {
                touchType: "eventSdk",
                content: JSON.stringify(contentObj),
            };
            const message = JSON.stringify(messageObj);
            const res = await this.sendUserMessage(userId, message);
        }
        catch (error) {
            if (!isRetry) {
                return;
            }
            setTimeout(() => {
                this.updateUiH5(false);
            }, 1000);
        }
    }
    // 模拟点击事件
    triggerClickEvent(options, forwardOff = false) {
        this.triggerPointerEvent(0, options, forwardOff);
        setTimeout(() => {
            this.triggerPointerEvent(1, options, forwardOff);
        }, 15 + Math.floor(Math.random() * 11));
    }
    // 模拟触摸事件 0 按下 1 抬起 2 触摸中
    triggerPointerEvent(action, options, forwardOff = false) {
        const { x, y, width, height } = options;
        if (action == 0) {
            this.simulateTouchInfo = generateTouchCoord();
        }
        const touchInfo = {
            action,
            pointCount: 1,
            touchType: "gesture",
            widthPixels: width,
            heightPixels: height,
            coords: [
                {
                    ...this.simulateTouchInfo,
                    orientation: 0.01 * Math.random(),
                    x,
                    y,
                },
            ],
            properties: [
                {
                    id: 0,
                    toolType: 1,
                },
            ],
        };
        const userId = this.options.clientId;
        this.sendUserMessage(userId, JSON.stringify(touchInfo), forwardOff);
    }
    /** 远端可见用户加入房间 */
    onUserJoined() {
        const that = this;
        this.engine?.on(VERTC.events.onUserJoined, (user) => {
            if (user.userInfo?.userId === this.options.clientId) {
                setTimeout(() => {
                    that.updateUiH5(true);
                    that.getCameraState(true);
                    // 查询输入状态
                    that.onCheckInputState();
                    that.setKeyboardStyle(that.options.keyboard);
                    that.triggerRecoveryTimeCallback();
                    that.callbacks.onUserJoined?.(user);
                }, 300);
            }
        });
    }
    /** 视频首帧渲染 */
    onRemoteVideoFirstFrame() {
        this.engine?.on(VERTC.events.onRemoteVideoFirstFrame, async (event) => {
            try {
                if (!this.isFirstRotate) {
                    await this.initRotateScreen(event.width, event.height);
                }
                this.metricsReporter?.addParam("FirstFrame" /* ReportEventType.FIRST_FRAME */, {
                    judgeTime: Date.now(),
                    result: 1,
                });
                this.metricsReporter?.instant("FirstFrame" /* ReportEventType.FIRST_FRAME */);
            }
            finally {
                this.callbacks.onRenderedFirstFrame?.(event);
            }
        });
    }
    /** 离开 RTC 房间 */
    async stop() {
        try {
            this.disableKeyboardShortcut();
            clearTimeout(this.metricsTimer);
            this.metricsTimer = null;
            clearTimeout(this.autoRecoveryTimer);
            const { clientId, mediaType } = this.options;
            const promises = [
                this.engine?.unsubscribeStream(this.options.clientId, mediaType),
                this.engine?.stopAudioCapture(),
                this.engine?.stopVideoCapture(),
                this.engine?.leaveRoom(),
                this.groupEngine?.leaveRoom(),
            ];
            await Promise.allSettled(promises);
            this.destroyEngine();
            this.groupRtc?.close();
            this.screenShotInstance?.destroy();
            const videoDomElement = document.getElementById(this.videoDomId);
            if (videoDomElement && videoDomElement.parentNode) {
                videoDomElement.parentNode.removeChild(videoDomElement);
            }
            // inputService handled in BaseRtc/destroy
            this.groupEngine = null;
            this.groupRtc = null;
            this.screenShotInstance = null;
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    /** 房间内新增远端摄像头/麦克风采集音视频流的回调 */
    onUserPublishStream() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;
        const handleUserPublishStream = async (e) => {
            if (e.userId === this.options.clientId) {
                const player = document.querySelector(`#${that.videoDomId}`);
                await this.setRemoteVideoRotation(this.rotation);
                await this.engine?.subscribeStream(this.options.clientId, this.options.mediaType);
                if (!this.screenShotInstance) {
                    this.screenShotInstance = new ScreenshotOverlay(player, this.rotation);
                }
            }
        };
        this.engine?.on(VERTC.events.onUserPublishStream, handleUserPublishStream);
    }
    /**
     * 发送摇一摇信息
     */
    sendShakeInfo(time) {
        const userId = this.options.clientId;
        const shake = new ShakeSimulator();
        shake.startShakeSimulation(time, (content) => {
            const getOptions = (sensorType) => {
                return JSON.stringify({
                    coords: [],
                    heightPixels: 0,
                    isOpenScreenFollowRotation: false,
                    keyCode: 0,
                    pointCount: 0,
                    properties: [],
                    text: "",
                    touchType: exports.TouchType.EVENT_SDK,
                    widthPixels: 0,
                    action: 0,
                    content: JSON.stringify({
                        ...content,
                        type: "sdkSensor" /* SdkEventType.SDK_SENSOR */,
                        sensorType,
                    }),
                });
            };
            this.sendUserMessage(userId, getOptions("gyroscope"));
            this.sendUserMessage(userId, getOptions("gravity"));
            this.sendUserMessage(userId, getOptions("acceleration"));
        });
    }
    checkInputState(msg) {
        const { allowLocalIMEInCloud, keyboard } = this.options;
        const msgData = JSON.parse(msg.data);
        this.roomMessage.inputStateIsOpen = msgData.isOpen;
        // 仅在 enterkeyhint 存在时设置属性
        const enterkeyhintText = this.enterkeyhintObj[msgData.imeOptions];
        if (enterkeyhintText) {
            this.inputService.getInputElement()?.setAttribute("enterkeyhint", enterkeyhintText);
        }
        // 处理输入框焦点逻辑
        const shouldHandleFocus = (allowLocalIMEInCloud && keyboard === "pad") || keyboard === "local";
        if (shouldHandleFocus && typeof msgData.isOpen === "boolean") {
            msgData.isOpen ? this.inputService.focus() : this.inputService.blur();
        }
    }
    /** 监听 onRoomMessageReceived 事件 */
    onRoomMessageReceived() {
        const onRoomMessageReceived = async (e) => {
            if (e.message) {
                const msg = JSON.parse(e.message);
                // 消息透传
                if (msg.key === "message") {
                    this.callbacks.onTransparentMsg?.(0, msg.data);
                }
                // ui消息
                if (msg.key === "refreshUiType") {
                    const msgData = JSON.parse(msg.data);
                    this.roomMessage.isVertical = msgData.isVertical;
                    // 若宽高没变，则不重新绘制页面
                    if (msgData.width == this.remoteResolution.width &&
                        msgData.height == this.remoteResolution.height) {
                        Logger.info("宽高没变，不重新绘制页面", this.remoteUserId);
                        return false;
                    }
                    this.initRotateScreen(msgData.width, msgData.height);
                }
                // 云机、本机键盘使用消息
                if (msg.key === "inputState" && this.inputService.getInputElement()) {
                    this.checkInputState(msg);
                }
                // 将云机内容复制到本机剪切板
                if (msg.key === "clipboard") {
                    if (this.options.saveCloudClipboard) {
                        const msgData = JSON.parse(msg.data);
                        copyText(msgData?.content || "");
                        this.callbacks.onOutputClipper?.(msgData);
                    }
                }
            }
        };
        this.engine?.on(VERTC.events.onRoomMessageReceived, onRoomMessageReceived);
    }
    /** 监听 onUserMessageReceived 事件 */
    onUserMessageReceived() {
        const that = this;
        const parseResolution = (resolution) => {
            const [width, height] = resolution?.split("*").map(Number);
            return { width, height };
        };
        const onUserMessageReceived = async (e) => {
            if (e.message) {
                const msg = JSON.parse(e.message);
                if (msg.key === "callBack" /* MessageKey.CALL_BACK_EVENT */) {
                    const callData = JSON.parse(msg.data);
                    const result = JSON.parse(callData.data);
                    switch (callData.type) {
                        case "definition" /* MessageKey.DEFINITION */:
                            this.callbacks.onChangeResolution?.({
                                from: parseResolution(result.from),
                                to: parseResolution(result.to),
                            });
                            break;
                        case "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */:
                        case "stopVideoInjection" /* MessageKey.STOP_INJECTION_VIDEO */:
                            const { resolve: injectResolve } = this.promiseMap.injectStatus;
                            if (injectResolve) {
                                injectResolve({
                                    type: callData.type,
                                    status: result?.isSuccess ? "success" : "error",
                                    result,
                                });
                                this.promiseMap.injectStatus.resolve = null;
                            }
                            this.callbacks.onInjectVideoResult?.(callData.type, result);
                            break;
                        case "injectionVideoStats" /* MessageKey.INJECTION_VIDEO_STATS */:
                            const { resolve } = this.promiseMap.streamStatus;
                            resolve({
                                path: result.path,
                                status: result.status || (result.path ? "live" : "offline"),
                                type: "video",
                            });
                            break;
                        case "operateSwitch" /* MessageKey.OPERATE_SWITCH */:
                            this.callbacks.onMonitorOperation?.(result);
                            break;
                    }
                }
                if (msg.key === "equipmentInfo" /* MessageKey.EQUIPMENT_INFO */) {
                    this.callbacks.onEquipmentInfo?.(JSON.parse(msg.data || []));
                }
                if (msg.key === "inputAdb" /* MessageKey.INPUT_ADB */) {
                    this.callbacks.onAdbOutput?.(JSON.parse(msg.data || {}));
                }
                // 音视频采集
                if (msg.key === "videoAndAudioControl" /* MessageKey.VIDEO_AND_AUDIO_CONTROL */) {
                    const msgData = JSON.parse(msg.data);
                    this.callbacks.onMediaDevicesToggle?.({
                        type: "media",
                        enabled: msgData.isOpen,
                        isFront: msgData.isFront,
                    });
                    if (!this.enableMicrophone && !this.enableCamera) {
                        return;
                    }
                    const pushType = this.enableMicrophone && this.enableCamera
                        ? exports.MediaType.AUDIO_AND_VIDEO
                        : this.enableCamera
                            ? exports.MediaType.VIDEO
                            : exports.MediaType.AUDIO;
                    if (msgData.isOpen) {
                        if (this.enableCamera) {
                            await this.cameraInject(msgData);
                        }
                        if (this.enableMicrophone) {
                            await this.microphoneInject();
                        }
                    }
                    else {
                        await this.stopMediaStream(pushType);
                    }
                }
                // 云机、本机键盘使用消息
                if (msg.key === "inputState" /* MessageKey.INPUT_STATE */ && this.inputService.getInputElement()) {
                    this.checkInputState(msg);
                }
                // 视频采集
                if (msg.key === "videoControl" /* MessageKey.VIDEO_CONTROL */) {
                    const msgData = JSON.parse(msg.data);
                    this.callbacks.onMediaDevicesToggle?.({
                        type: "camera",
                        enabled: msgData.isOpen,
                        isFront: msgData.isFront,
                    });
                    if (!this.enableCamera) {
                        return;
                    }
                    if (msgData.isOpen) {
                        await this.cameraInject(msgData);
                    }
                    else {
                        await this.stopMediaStream(exports.MediaType.VIDEO);
                    }
                }
                // 音频采集
                if (msg.key === "audioControl" /* MessageKey.AUDIO_CONTROL */) {
                    const msgData = JSON.parse(msg.data);
                    this.callbacks.onMediaDevicesToggle?.({
                        type: "microphone",
                        enabled: msgData.isOpen,
                    });
                    if (!this.enableMicrophone) {
                        return;
                    }
                    if (msgData.isOpen) {
                        await this.microphoneInject();
                    }
                    else {
                        await this.stopMediaStream(exports.MediaType.AUDIO);
                    }
                }
            }
        };
        that.engine?.on(VERTC.events.onUserMessageReceived, onUserMessageReceived);
    }
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 需要发送的字符串
     */
    async sendInputClipper(inputStr, forwardOff = false) {
        const userId = this.options.clientId;
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.CLIPBOARD,
        });
        await this.sendUserMessage(userId, message, forwardOff);
    }
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 需要发送的字符串
     */
    async sendInputString(inputStr, forwardOff = false) {
        const userId = this.options.clientId;
        const message = JSON.stringify({
            text: inputStr,
            touchType: exports.TouchType.INPUT_BOX,
        });
        await this.sendUserMessage(userId, message, forwardOff);
    }
    /** 清晰度切换 */
    setStreamConfig(config, forwardOff = true) {
        const regExp = /^[1-9]\d*$/;
        // 判断字段是否缺失
        if (config.definitionId && config.framerateId && config.bitrateId) {
            const values = Object.values(config);
            // 判断输入值是否为正整数
            if (values.every((value) => regExp.test(value))) {
                const contentObj = {
                    type: "definitionUpdata" /* SdkEventType.DEFINITION_UPDATE */,
                    definitionId: config.definitionId,
                    framerateId: config.framerateId,
                    bitrateId: config.bitrateId,
                };
                const messageObj = {
                    touchType: exports.TouchType.EVENT_SDK,
                    content: JSON.stringify(contentObj),
                };
                const userId = this.options.clientId;
                const message = JSON.stringify(messageObj);
                this.sendUserMessage(userId, message, forwardOff);
            }
        }
    }
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType = 3) {
        // 重置无操作回收定时器
        this.triggerRecoveryTimeCallback();
        const contentObj = {
            type: "openAudioAndVideo" /* MediaOperationType.OPEN_AUDIO_AND_VIDEO */,
            isOpen: false,
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj),
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.engine?.sendUserMessage(userId, message);
        return this.engine?.pauseAllSubscribedStream(mediaType);
    }
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType = 3) {
        // 重置无操作回收定时器
        this.triggerRecoveryTimeCallback();
        // 防止用户在自动拉取音视频流失败时，没手动开启
        this.startPlay();
        if (mediaType !== 3) {
            return this.engine?.resumeAllSubscribedStream(mediaType);
        }
        const contentObj = {
            type: "openAudioAndVideo" /* MediaOperationType.OPEN_AUDIO_AND_VIDEO */,
            isOpen: true,
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj),
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.sendUserMessage(userId, message);
        return this.engine?.resumeAllSubscribedStream(mediaType);
    }
    async setRemoteVideoRotation(rotation) {
        const player = document.querySelector(`#${this.videoDomId}`);
        await this.engine?.setRemoteVideoPlayer(VERTC.StreamIndex.STREAM_INDEX_MAIN, {
            userId: this.options.clientId,
            renderDom: player,
            renderMode: 2,
            rotation,
        });
    }
    // 修改屏幕分辨率和dpi
    setScreenResolution(options, forwardOff = true) {
        const contentObj = options.type === "updateDensity" /* MessageKey.UPDATE_DENSITY */
            ? {
                type: options.type,
                width: options.width,
                height: options.height,
                density: options.dpi,
            }
            : {
                type: options.type,
            };
        const userId = this.options.clientId;
        const message = this.getMsgTemplate(exports.TouchType.EVENT_SDK, contentObj);
        this.sendUserMessage(userId, message, forwardOff);
    }
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    async subscribeStream(mediaType) {
        return await this.engine?.subscribeStream(this.options.clientId, mediaType);
    }
    /** 旋转截图 */
    setScreenshotRotation(rotation = 0) {
        // this.screenShotInstance?.setScreenshotRotation(rotation);
    }
    /** 生成封面图 */
    takeScreenshot(rotation = 0) {
        this.screenShotInstance?.takeScreenshot(rotation);
    }
    /** 重新设置大小 */
    resizeScreenshot(width, height) {
        this.screenShotInstance?.resizeScreenshot(width, height);
    }
    /** 显示封面图 */
    showScreenShot() {
        this.screenShotInstance?.showScreenShot();
    }
    /** 显示封面图 */
    hideScreenShot() {
        this.screenShotInstance?.hideScreenShot();
    }
    /** 清空封面图 */
    clearScreenShot() {
        this.screenShotInstance?.clearScreenShot();
    }
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    unsubscribeStream(mediaType) {
        return this.engine?.unsubscribeStream(this.options.clientId, mediaType);
    }
    /** 截图-保存到本地 */
    saveScreenShotToLocal() {
        const userId = this.options.clientId;
        return this.engine?.takeRemoteSnapshot(userId, 0) || Promise.reject("Engine not initialized");
    }
    /** 截图-保存到云机 */
    saveScreenShotToRemote() {
        const contentObj = {
            type: "localScreenshot" /* SdkEventType.LOCAL_SCREENSHOT */,
        };
        const messageObj = {
            touchType: exports.TouchType.EVENT_SDK,
            content: JSON.stringify(contentObj),
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.sendUserMessage(userId, message);
    }
    /**
     * 手动横竖屏：0竖屏，1横屏
     * 对标百度API
     */
    setPhoneRotation(type) {
        this.triggerRecoveryTimeCallback();
        this.rotateScreen(type);
    }
    getRotateType() {
        return this.rotateType;
    }
    async initRotateScreen(width, height) {
        // 移动端需要强制竖屏
        if (isTouchDevice() || isMobile()) {
            this.options.rotateType = 0;
        }
        const { rotateType } = this.options;
        if (rotateType && this.isFirstRotate) {
            return;
        }
        /** 是否首次旋转 */
        if (!this.isFirstRotate) {
            this.isFirstRotate = true;
        }
        // 存储云机分辨率
        Object.assign(this.remoteResolution, {
            width,
            height,
        });
        // 0 为竖屏，1 为横屏
        let targetRotateType;
        // 判断是否为 0 或 1
        if (rotateType == 0 || rotateType == 1) {
            targetRotateType = rotateType;
        }
        else {
            // 根据宽高自动设置旋转类型，
            targetRotateType = width > height ? 1 : 0;
        }
        await this.rotateScreen(targetRotateType);
    }
    /**
     * 旋转屏幕
     * @param type 横竖屏：0竖屏，1横屏
     */
    async rotateScreen(type) {
        this.rotateType = type;
        try {
            await this.callbacks.onBeforeRotate?.(type);
        }
        catch (error) { }
        // 获取父元素（调用方）的原始宽度和高度，这里要重新获取，因为外层的div可能宽高发生变化
        const h5Dom = document.getElementById(this.initDomId);
        if (!h5Dom)
            return;
        let parentWidth = h5Dom.clientWidth > window.innerWidth
            ? window.innerWidth
            : h5Dom.clientWidth;
        let parentHeight = h5Dom.clientHeight > window.innerHeight
            ? window.innerHeight
            : h5Dom.clientHeight;
        let bigSide = parentHeight;
        let smallSide = parentWidth;
        if (parentWidth > parentHeight) {
            bigSide = parentWidth;
            smallSide = parentHeight;
        }
        const wrapperBox = h5Dom.parentElement;
        const wrapperBoxWidth = wrapperBox.clientWidth;
        const toolsWidth = this.options.toolsWidth ?? 0;
        if (type == exports.RotateDirection.LANDSCAPE) {
            if (toolsWidth) {
                parentWidth =
                    bigSide > wrapperBoxWidth ? wrapperBoxWidth - toolsWidth : bigSide;
            }
            else {
                parentWidth = bigSide;
            }
            parentHeight = smallSide;
        }
        else {
            parentWidth = smallSide;
            parentHeight = bigSide;
        }
        h5Dom.style.width = parentWidth + "px";
        h5Dom.style.height = parentHeight + "px";
        const videoIsLandscape = this.remoteResolution.width > this.remoteResolution.height;
        // 外层 div
        let armcloudVideoWidth = 0;
        let armcloudVideoHeight = 0;
        // 旋转角度
        let videoWrapperRotate = 0;
        const videoDom = document.getElementById(this.videoDomId);
        if (type == 1) {
            const w = videoIsLandscape
                ? this.remoteResolution.width
                : this.remoteResolution.height;
            const h = videoIsLandscape
                ? this.remoteResolution.height
                : this.remoteResolution.width;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
            videoWrapperRotate = videoIsLandscape ? 0 : 270;
        }
        else {
            // 竖屏处理
            const w = videoIsLandscape
                ? this.remoteResolution.height
                : this.remoteResolution.width;
            const h = videoIsLandscape
                ? this.remoteResolution.width
                : this.remoteResolution.height;
            const scale = Math.min(parentWidth / w, parentHeight / h);
            armcloudVideoWidth = w * scale;
            armcloudVideoHeight = h * scale;
            videoWrapperRotate = videoIsLandscape ? 90 : 0;
        }
        this.rotation = videoWrapperRotate;
        // armcloudVideo
        videoDom.style.width = `${armcloudVideoWidth}px`;
        videoDom.style.height = `${armcloudVideoHeight}px`;
        await this.setRemoteVideoRotation(videoWrapperRotate);
        this.callbacks.onChangeRotate?.(type, {
            width: armcloudVideoWidth,
            height: armcloudVideoHeight,
        });
    }
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState, keyCode, forwardOff = true) {
        const content = JSON.stringify({
            touchType: "shortcutKey" /* MessageKey.SHORTCUT_KEY */,
            metaState: metaState + "",
            keyCode: keyCode + "",
        });
        const userId = this.options.clientId;
        this.sendUserMessage(userId, content, forwardOff);
    }
    /** 手动定位 */
    setGPS(longitude, latitude) {
        const contentObj1 = {
            latitude,
            longitude,
            time: new Date().getTime(),
        };
        const contentObj2 = {
            type: "sdkLocation",
            content: JSON.stringify(contentObj1),
        };
        const messageObj = {
            touchType: "eventSdk",
            content: JSON.stringify(contentObj2),
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        Logger.info("手动传入经纬度", message);
        this.sendUserMessage(userId, message);
    }
    /** 停止或开启群控同步 */
    toggleGroupControlSync(flag = true) {
        if (!this.isGroupControl)
            return;
        this.groupControlSync = flag;
    }
    executeAdbCommand(command, forwardOff = true) {
        const userId = this.options.clientId;
        const message = JSON.stringify({
            touchType: "eventSdk",
            content: JSON.stringify({
                type: "inputAdb",
                content: command,
            }),
        });
        this.sendUserMessage(userId, message, forwardOff);
    }
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType) {
        const contentObj = {
            type: "keyBoardType",
            isLocalKeyBoard: keyBoardType === "local",
        };
        const messageObj = {
            touchType: "eventSdk",
            content: JSON.stringify(contentObj),
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        this.options.keyboard = keyBoardType;
        this.sendUserMessage(userId, message);
    }
    /** 查询输入状态 */
    async onCheckInputState() {
        const userId = this.options.clientId;
        const message = JSON.stringify({
            touchType: "inputState",
        });
        await this.sendUserMessage(userId, message);
    }
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second) {
        // 设置过期时间，单位为毫秒
        this.options.autoRecoveryTime = second;
        // 定时器，当指定时间内无操作时执行离开房间操作
        this.triggerRecoveryTimeCallback();
    }
    /** 获取无操作回收时间 */
    getAutoRecycleTime() {
        return this.options.autoRecoveryTime;
    }
    /** 调整坐标 */
    reshapeWindow() { }
    /** 底部栏操作按键 */
    sendCommand(command, forwardOff = false) {
        // 定义按键映射表 兼容老版本
        const keyCodeMap = {
            back: 4,
            home: 3,
            menu: 187,
        };
        // 获取keyCode,如果command不在映射表中则使用command本身
        const keyCode = keyCodeMap[command] ?? command;
        const messageObj = {
            action: 1,
            touchType: "keystroke",
            keyCode,
            text: "",
        };
        const userId = this.options.clientId;
        if (!userId)
            return;
        const message = JSON.stringify(messageObj);
        this.sendUserMessage(userId, message, forwardOff);
    }
    /**  注入视频到相机 */
    injectVideoStream(type, options, timeout = 0, forwardOff = true) {
        return new Promise(async (resolve) => {
            const userId = this.options.clientId;
            if (!userId)
                return;
            let timeoutHandler = null;
            if (timeout) {
                timeoutHandler = setTimeout(() => {
                    resolve({
                        type,
                        status: "timeout",
                        result: null,
                    });
                }, timeout);
            }
            try {
                // 保存resolve函数以便在收到响应时调用
                Object.assign(this.promiseMap.injectStatus, {
                    resolve: (result) => {
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve(result);
                    },
                });
                const message = JSON.stringify({
                    touchType: exports.TouchType.EVENT_SDK,
                    content: JSON.stringify(type === "startVideoInjection" /* MessageKey.START_INJECTION_VIDEO */
                        ? {
                            type,
                            fileUrl: options?.fileUrl,
                            isLoop: options?.isLoop ?? true,
                            fileName: options?.fileName,
                        }
                        : {
                            type,
                        }),
                });
                await this.sendUserMessage(userId, message, forwardOff);
            }
            catch {
                resolve({
                    type,
                    status: "unknown",
                    result: null,
                });
            }
        });
    }
    /** 音量增加按键事件 */
    increaseVolume(forwardOff = true) {
        // 防止用户在自动拉取音视频流失败时，没手动开启
        this.startPlay();
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 24,
            text: "",
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        if (userId) {
            // 按下
            this.sendUserMessage(userId, message, forwardOff);
        }
    }
    /** 音量减少按键事件 */
    decreaseVolume(forwardOff = true) {
        // 防止用户在自动拉取音视频流失败时，没手动开启
        this.startPlay();
        const messageObj = {
            action: 1,
            touchType: exports.TouchType.KEYSTROKE,
            keyCode: 25,
            text: "",
        };
        const userId = this.options.clientId;
        const message = JSON.stringify(messageObj);
        if (userId) {
            // 按下
            this.sendUserMessage(userId, message, forwardOff);
        }
    }
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag) {
        this.options.saveCloudClipboard = flag;
    }
}

class RtcFactory {
    /**
     * Tạo instance RTC dựa trên streamType
     * @param streamType 1: CustomRtc (Volcengine), 2: WebRtc (P2P), 3: TcgRtc (Tencent)
     * @param viewId View container ID
     * @param options Cấu hình RTC
     * @param callbacks Callbacks của SDK
     */
    static create(streamType, viewId, options, callbacks) {
        switch (streamType) {
            case exports.StreamType.CUSTOM:
                return new CustomRtc(viewId, options, callbacks);
            case exports.StreamType.WEBRTC:
                return new WebRtc(viewId, options, callbacks);
            case exports.StreamType.TCGRTC:
                return new TcgRtc(viewId, options, callbacks);
            default:
                throw new Error(`Unsupported streamType: ${streamType}`);
        }
    }
}

class ArmcloudEngine {
    // SDK版本号
    version = "1.5.5";
    rtcInstance = null;
    rtcOptions = null;
    callbacks = null;
    streamType = null;
    axiosSource = null;
    constructor(params) {
        this.axiosSource = axios.CancelToken.source(); // 创建一个取消令牌
        this.setupInitConfig(params);
        this.setupCallbacks(params);
        // 初始化参数校验
        const missingParams = [];
        if (!params.token)
            missingParams.push("token");
        if (!params.deviceInfo)
            missingParams.push("deviceInfo");
        if (params.deviceInfo) {
            if (!params.deviceInfo.padCode)
                missingParams.push("deviceInfo.padCode");
            if (!params.deviceInfo.userId)
                missingParams.push("deviceInfo.userId");
        }
        if (!params.viewId)
            missingParams.push("viewId");
        if (!params.callbacks)
            missingParams.push("callbacks");
        if (missingParams.length > 0) {
            const errorMsg = `初始化参数缺失，请检查参数: ${missingParams.join(", ")}`;
            throw new Error(errorMsg);
        }
        // 允许数字、字母、"_"、"-" 、"@"，长度为1~128个字符
        if (!/^[a-zA-Z0-9_\-@]{1,128}$/.test(this.rtcOptions?.userId || "")) {
            throw new Error(`deviceInfo.userId 格式不正确，允许数字、字母、"_"、"-" 、"@"，长度为1~128个字符`);
        }
        // baseUrl不能为空
        if (!this.rtcOptions?.baseUrl) {
            throw new Error("baseUrl 不能为空");
        }
        // 初始化逻辑
        this.applyToken(params);
    }
    applyToken(params) {
        let uuid = this.rtcOptions?.uuid || "";
        if (!uuid) {
            uuid = localStorage.getItem("armcloud_uuid") || this.generateUUID();
            localStorage.setItem("armcloud_uuid", uuid || "");
        }
        const url = `${params.baseUrl}/rtc/open/room/applyToken`;
        const tokenParams = {
            sdkTerminal: "h5",
            userId: this.rtcOptions.userId,
            padCode: this.rtcOptions.padCode,
            uuid,
            expire: 86400,
            videoStream: this.rtcOptions.videoStream,
        };
        axios
            .post(url, tokenParams, {
            headers: {
                "Content-Type": "application/json",
                token: this.rtcOptions.token,
            },
            cancelToken: this.axiosSource.token, // 将取消令牌添加到请求配置中
        })
            .then((response) => {
            if (response.data.code === 200) {
                this.streamType = response.data.data.streamType;
                this.rtcOptions.streamType = this.streamType;
                this.rtcOptions.toolsWidth = params.toolsWidth ?? 0;
                this.rtcOptions.uuid = uuid;
                if (this.streamType == 1) {
                    this.rtcOptions.appId = response.data.data.appId;
                    this.rtcOptions.roomCode = response.data.data.roomCode;
                    this.rtcOptions.roomToken = response.data.data.roomToken;
                    // 创建引擎对象
                    this.rtcInstance = RtcFactory.create(this.streamType, params.viewId, this.rtcOptions, this.callbacks);
                    this.callbacks?.onInit?.({
                        code: COMMON_CODE.SUCCESS,
                        msg: "初始化成功",
                        streamType: this.streamType,
                        uuid,
                    });
                }
                else if (this.streamType == 2) {
                    this.rtcOptions.roomToken = response.data.data.roomToken;
                    this.rtcOptions.signalServer = response.data.data.signalServer;
                    this.rtcOptions.stuns = response.data.data.stuns;
                    this.rtcOptions.turns = response.data.data.turns;
                    // 创建引擎对象
                    this.rtcInstance = RtcFactory.create(this.streamType, params.viewId, this.rtcOptions, this.callbacks);
                    this.callbacks?.onInit?.({
                        code: COMMON_CODE.SUCCESS,
                        msg: "初始化成功",
                        streamType: this.streamType,
                        uuid,
                    });
                }
                else if (this.streamType == 3) {
                    this.rtcOptions.accessInfo = response.data.data.accessInfo;
                    this.rtcOptions.roomToken = response.data.data.roomToken;
                    this.rtcInstance = RtcFactory.create(this.streamType, params.viewId, this.rtcOptions, this.callbacks);
                    console.log(response.data.data);
                    this.callbacks?.onInit?.({
                        code: COMMON_CODE.SUCCESS,
                        msg: "初始化成功",
                        streamType: this.streamType,
                        uuid,
                    });
                }
            }
            else {
                this.callbacks?.onInit?.({
                    code: response?.data?.code || COMMON_CODE.FAIL,
                    msg: response?.data?.msg,
                    streamType: this.streamType || undefined,
                    uuid: uuid || "",
                });
            }
        })
            .catch((error) => {
            if (axios.isCancel(error)) {
                return;
            }
            console.error("获取初始化配置失败:", error);
            this.callbacks?.onInit?.({
                code: COMMON_CODE.FAIL,
                msg: error.message || error.name,
                uuid: uuid || "",
            });
        });
    }
    /** 静态方法 浏览器是否支持webrTC */
    static isSupported() {
        // 检查是否支持 WebRTC
        if (!window.RTCPeerConnection) {
            return false;
        }
        // 检查是否支持 DataChannel
        try {
            const pc = new RTCPeerConnection();
            pc.createDataChannel("test");
            pc.close();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    reshapeWindow() {
        this.rtcInstance?.reshapeWindow?.();
    }
    /** 触发快捷键 */
    triggerKeyboardShortcut(metaState, actionKey, forwardOff) {
        this.rtcInstance?.triggerKeyboardShortcut?.(metaState, actionKey, forwardOff);
    }
    /** 获取初始化配置 */
    setupInitConfig(params) {
        // 初始化入参
        this.rtcOptions = {
            appId: "", // 火山rtc参数
            roomCode: "", // 火山rtc参数
            roomToken: "", // 火山rtc参数
            signalServer: "", // ws地址
            stuns: "", // 信令服务
            turns: "", // 信令服务
            token: params.token, // 服务端所给token，用来换取火山rtc信息
            uuid: params.uuid || "", // 火山rtc参数
            clientId: params.deviceInfo.padCode, // 房间号
            padCode: params.deviceInfo.padCode, // 房间号
            userId: params.deviceInfo.userId, // 用户id
            retryCount: params.retryCount ?? 2, // ws重连次数
            retryTime: params.retryTime ?? 2000, // ws每次重连间隔
            isLog: params.isLog ?? true,
            disable: params.disable ?? false,
            enableMicrophone: params.enableMicrophone ?? true,
            enableCamera: params.enableCamera ?? true,
            baseUrl: params.baseUrl,
            isWsProxy: params.isWsProxy ? JSON.parse(params.isWsProxy) : false,
            manageToken: params.manageToken ?? "",
            masterIdPrefix: params.masterIdPrefix ?? "",
            // 视频流信息
            videoStream: {
                resolution: params?.deviceInfo?.videoStream?.resolution ?? 12, // 分辨率
                frameRate: params?.deviceInfo?.videoStream?.frameRate ?? 2, // 帧率
                bitrate: params?.deviceInfo?.videoStream?.bitrate ?? 3, // 码率
            },
            // 禁用本地键盘
            disableLocalIME: params.deviceInfo.disableLocalIME ?? false, // 禁用本地键盘
            allowLocalIMEInCloud: params.deviceInfo.allowLocalIMEInCloud ?? false, // 云机键盘时能否使用本地输入法
            autoRecoveryTime: params.deviceInfo.autoRecoveryTime ?? 300, // 自动回收时间
            mediaType: params.deviceInfo.mediaType ?? 2, // 拉流媒体类型
            rotateType: params.deviceInfo.rotateType, // 是否旋转横屏
            keyboard: params.deviceInfo.keyboard ?? exports.KeyboardMode.PAD, // 键盘模式
            disableContextMenu: params.deviceInfo.disableContextMenu ?? false, // 是否禁用右键菜单
            saveCloudClipboard: params.deviceInfo.saveCloudClipboard ?? true, // 云机剪切板回调开关
            videoDeviceId: params.deviceInfo.videoDeviceId, // 摄像头ID
            audioDeviceId: params.deviceInfo.audioDeviceId, // 麦克风ID
        };
    }
    /** 设置回调 */
    setupCallbacks(params) {
        this.callbacks = {
            // 初始化回调
            onInit: params.callbacks?.onInit || (() => { }),
            // 连接成功回调
            onConnectSuccess: params.callbacks?.onConnectSuccess || (() => { }),
            // 连接失败回调
            onConnectFail: params.callbacks?.onConnectFail || (() => { }),
            // 触发自动回收回调
            onAutoRecoveryTime: params.callbacks?.onAutoRecoveryTime || (() => { }),
            // 自动播放失败回调
            onAutoplayFailed: params.callbacks?.onAutoplayFailed || (() => { }),
            // 运行信息回调
            onRunInformation: params.callbacks?.onRunInformation || (() => { }),
            // 分辨率切换回调
            onChangeResolution: params.callbacks?.onChangeResolution || (() => { }),
            // 横竖屏切换回调：0 竖屏 1 横屏
            onChangeRotate: params.callbacks?.onChangeRotate || (() => { }),
            // 消息透传回调
            onTransparentMsg: params.callbacks?.onTransparentMsg || (() => { }),
            // 连接状态回调
            onConnectionStateChanged: params.callbacks?.onConnectionStateChanged || (() => { }),
            // 错误回调
            onErrorMessage: params.callbacks?.onErrorMessage || (() => { }),
            // 剪切板回调
            onOutputClipper: params.callbacks?.onOutputClipper || (() => { }),
            // 横竖屏切换回调
            onBeforeRotate: params.callbacks?.onBeforeRotate || (() => { }),
            // 首帧画面已加载
            onRenderedFirstFrame: params.callbacks?.onRenderedFirstFrame || (() => { }),
            // 视频采集成功
            onVideoInit: params.callbacks?.onVideoInit || (() => { }),
            // 视频采集失败
            onVideoError: params.callbacks?.onVideoError || (() => { }),
            // 音频采集成功
            onAudioInit: params.callbacks?.onAudioInit || (() => { }),
            // 音频采集失败
            onAudioError: params.callbacks?.onAudioError || (() => { }),
            // 加载进度相关回调
            onProgress: params.callbacks?.onProgress || (() => { }),
            // onSocketCallback websocket相关回调
            onSocketCallback: params.callbacks?.onSocketCallback || (() => { }),
            // 远端用户加入房间
            onUserJoined: params.callbacks?.onUserJoined || (() => { }),
            // 用户离开
            onUserLeave: params.callbacks?.onUserLeave || (() => { }),
            // 用户进退出
            onUserLeaveOrJoin: params.callbacks?.onUserLeaveOrJoin || (() => { }),
            // 群控错误相关回调
            onGroupControlError: params.callbacks?.onGroupControlError || (() => { }),
            // 云机信息回调
            onEquipmentInfo: params.callbacks?.onEquipmentInfo || (() => { }),
            // 发送用户错误
            onSendUserError: params.callbacks?.onSendUserError || (() => { }),
            // 执行adb命令后结果回调
            onAdbOutput: params.callbacks?.onAdbOutput || (() => { }),
            // 收到本端上行及下行的网络质量信息。
            onNetworkQuality: params.callbacks?.onNetworkQuality || (() => { }),
            // 视频注入结果
            onInjectVideoResult: params.callbacks?.onInjectVideoResult || (() => { }),
            // 打开或关闭(摄像头/麦克风)回调
            onMediaDevicesToggle: params.callbacks?.onMediaDevicesToggle || (() => { }),
            // 监控操作信息
            onMonitorOperation: params.callbacks?.onMonitorOperation || (() => { }),
        };
    }
    /** 打开或关闭监控操作 */
    setMonitorOperation(isMonitor, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.setMonitorOperation(isMonitor, forwardOff);
    }
    /** 获取注入推流状态 */
    getInjectStreamStatus(type, timeout) {
        if (this.rtcInstance)
            return this.rtcInstance.getInjectStreamStatus(type, timeout);
    }
    /** 生成uuid */
    generateUUID() {
        return generateUUID();
    }
    getRequestId() {
        // @ts-ignore
        return this.rtcInstance?.getRequestId();
    }
    // 模拟点击事件
    triggerClickEvent(options, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.triggerClickEvent(options, forwardOff);
    }
    // 模拟触摸事件 0 按下 1 抬起 2 触摸中
    triggerPointerEvent(action, options, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.triggerPointerEvent(action, options, forwardOff);
    }
    /** 是否开启麦克风 */
    setMicrophone(val) {
        if (this.rtcInstance)
            this.rtcInstance.setMicrophone(val);
    }
    /** 是否开启摄像头 */
    setCamera(val) {
        if (this.rtcInstance)
            this.rtcInstance.setCamera(val);
    }
    /** 手动开启音视频流播放 */
    startPlay() {
        if (this.rtcInstance)
            this.rtcInstance.startPlay();
    }
    setViewSize(width, height, rotateType = 0) {
        if (this.rtcInstance)
            this.rtcInstance.setViewSize(width, height, rotateType);
    }
    /** 加入房间 */
    start(isGroupControl = false, pads = []) {
        if (this.rtcInstance)
            this.rtcInstance.start(isGroupControl, pads);
    }
    /** 群控加入房间 */
    joinGroupRoom(pads = []) {
        if (this.rtcInstance)
            this.rtcInstance.joinGroupRoom(pads);
    }
    /** 踢出群控房间 */
    kickItOutRoom(pads = []) {
        if (this.rtcInstance)
            this.rtcInstance.kickItOutRoom(pads);
    }
    /** 群控同步开关 */
    toggleGroupControlSync(flag = true) {
        this.rtcInstance?.toggleGroupControlSync?.(flag);
    }
    /** 发送群控消息 */
    sendGroupMessage(message) {
        if (this.rtcInstance)
            this.rtcInstance.sendGroupMessage(message);
    }
    /** 离开房间 */
    async stop() {
        this.axiosSource?.cancel();
        this.axiosSource = null;
        return this?.rtcInstance?.stop();
    }
    /**
     * 静音
     */
    muted() {
        if (this.rtcInstance)
            this.rtcInstance.muted();
    }
    /**
     * 取消静音
     */
    unmuted() {
        if (this.rtcInstance)
            this.rtcInstance.unmuted();
    }
    /** app卸载 */
    appUnInstall(pkgNames) {
        if (this.rtcInstance)
            this.rtcInstance.appUnInstall(pkgNames);
    }
    /** 获取云机信息 */
    getEquipmentInfo(type) {
        if (this.rtcInstance)
            this.rtcInstance.getEquipmentInfo(type);
    }
    /** 指定摄像头 */
    setVideoDeviceId(val) {
        if (this.rtcInstance)
            this.rtcInstance.setVideoDeviceId(val);
    }
    /** 指定麦克风 */
    setAudioDeviceId(val) {
        if (this.rtcInstance)
            this.rtcInstance.setAudioDeviceId(val);
    }
    /**
     * 将字符串发送到云手机的粘贴板中
     * @param inputStr 剪切板内容
     */
    sendInputClipper(inputStr, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.sendInputClipper(inputStr, forwardOff);
    }
    /**
     * 将字符串 分别发到云机的剪切板中
     * @param inputStr 剪切板内容
     */
    sendGroupInputClipper(pads, strs) {
        if (this.rtcInstance)
            this.rtcInstance.sendGroupInputClipper(pads, strs);
    }
    /**
     * 将字符串 分别发到云机的输入框中
     * @param inputStr 剪切板内容
     */
    sendGroupInputString(pads, strs) {
        if (this.rtcInstance)
            this.rtcInstance.sendGroupInputString(pads, strs);
    }
    /**
     * 当云手机处于输入状态时，将字符串直接发送到云手机，完成输入
     * @param inputStr 剪切板内容
     */
    sendInputString(inputStr, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.sendInputString(inputStr, forwardOff);
    }
    /** 清晰度切换 */
    setStreamConfig(config, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.setStreamConfig(config, forwardOff);
    }
    /**
     * 暂停接收来自远端的媒体流
     * 该方法仅暂停远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    pauseAllSubscribedStream(mediaType = 3) {
        if (this.rtcInstance)
            return this.rtcInstance.unsubscribeStream(mediaType);
    }
    /**
     * 恢复接收来自远端的媒体流
     * 该方法仅恢复远端流的接收，并不影响远端流的采集和发送。
     * @param mediaType 1 只控制音频; 2 只控制视频; 3 同时控制音频和视频
     */
    resumeAllSubscribedStream(mediaType = 3) {
        if (this.rtcInstance)
            return this.rtcInstance.subscribeStream(mediaType);
    }
    /**
     * 订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     */
    subscribeStream(mediaType = 2) {
        if (!this.rtcInstance) {
            return Promise.reject(new Error("RTC instance does not exist and cannot subscribe to the media stream"));
        }
        return this.rtcInstance.subscribeStream(mediaType);
    }
    /**
     * 取消订阅房间内指定的通过摄像头/麦克风采集的媒体流。
     * 该方法对自动订阅和手动订阅模式均适用。
     */
    unsubscribeStream(mediaType = 2) {
        if (!this.rtcInstance) {
            return Promise.reject(new Error("RTC instance does not exist and cannot unsubscribe from media stream"));
        }
        return this.rtcInstance?.unsubscribeStream(mediaType);
    }
    /** 截图-保存到本地 */
    saveScreenShotToLocal() {
        return new Promise((resolve, reject) => {
            if (this.rtcInstance) {
                try {
                    this.rtcInstance?.saveScreenShotToLocal()?.then((res) => {
                        resolve(res);
                    });
                }
                catch (error) {
                    reject(error);
                }
            }
        });
    }
    /** 修改屏幕分辨率和dpi */
    setScreenResolution(options, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.setScreenResolution(options, forwardOff);
    }
    /** 截图-保存到云机 */
    saveScreenShotToRemote() {
        if (this.rtcInstance)
            this.rtcInstance.saveScreenShotToRemote();
    }
    /** 重新设置大小 */
    resizeScreenshot(width, height) {
        this.rtcInstance?.resizeScreenshot(width, height);
    }
    /** 显示封面图 */
    showScreenShot() {
        this.rtcInstance?.showScreenShot();
    }
    /** 隐藏封面图 */
    hideScreenShot() {
        this.rtcInstance?.hideScreenShot();
    }
    /** 旋转截图 */
    setScreenshotRotation(rotation = 0) {
        this.rtcInstance?.setScreenshotRotation(rotation);
    }
    /** 生成封面图 */
    takeScreenshot(rotation = 0) {
        this.rtcInstance?.takeScreenshot(rotation);
    }
    /** 清空封面图 */
    clearScreenShot() {
        this.rtcInstance?.clearScreenShot();
    }
    /**
     * 手动横竖屏
     */
    setPhoneRotation(type) {
        if (this.rtcInstance)
            this.rtcInstance.setPhoneRotation(type);
    }
    setVideoEncoder(width, height) {
        if (this.rtcInstance)
            this.rtcInstance?.setVideoEncoder(width, height);
    }
    /** 手动定位 */
    setGPS(longitude, latitude) {
        if (this.rtcInstance)
            this.rtcInstance.setGPS(longitude, latitude);
    }
    /** 执行adb命令 */
    executeAdbCommand(command, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance?.executeAdbCommand(command, forwardOff);
    }
    /** 云机/本地键盘切换(false-云机键盘，true-本地键盘) */
    setKeyboardStyle(keyBoardType) {
        if (this.rtcInstance)
            this.rtcInstance.setKeyboardStyle(keyBoardType);
    }
    /**
     * 设置无操作回收时间
     * @param second 秒 默认300s,最大7200s
     */
    setAutoRecycleTime(second) {
        if (this.rtcInstance)
            this.rtcInstance.setAutoRecycleTime(second);
    }
    /** 获取无操作回收时间 */
    getAutoRecycleTime() {
        if (this.rtcInstance)
            return this.rtcInstance.getAutoRecycleTime();
    }
    /** 底部栏操作按键 */
    sendCommand(command, forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.sendCommand(command, forwardOff);
    }
    /** 音量增加按键事件 */
    increaseVolume(forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.increaseVolume(forwardOff);
    }
    /** 音量减少按键事件 */
    decreaseVolume(forwardOff) {
        if (this.rtcInstance)
            this.rtcInstance.decreaseVolume(forwardOff);
    }
    /**
     * 是否接收粘贴板内容回调
     * @param flag true:接收 false:不接收
     */
    saveCloudClipboard(flag) {
        if (this.rtcInstance)
            this.rtcInstance.saveCloudClipboard(flag);
    }
    /** 开启摄像头 或 麦克风注入 返回一个promise */
    startMediaStream(mediaType) {
        if (this.rtcInstance)
            return this.rtcInstance.startMediaStream(mediaType);
    }
    /** 关闭摄像头 或 麦克风注入 返回一个promise */
    stopMediaStream(mediaType) {
        if (this.rtcInstance)
            return this.rtcInstance.stopMediaStream(mediaType);
    }
    /**  注入视频到相机 */
    injectVideoStream(type, options, timeout, forwardOff) {
        if (this.rtcInstance)
            return this.rtcInstance.injectVideoStream(type, options, timeout, forwardOff);
    }
    /**
     * 摇一摇
     * @param time
     */
    sendShake(time) {
        if (this.rtcInstance)
            this.rtcInstance.sendShakeInfo(time ?? 1500);
    }
    /**
     * 获取当前旋转类型
     * @returns 0 竖屏 1 横屏
     */
    getRotateType() {
        if (this.rtcInstance)
            return this.rtcInstance.getRotateType();
    }
}

exports.ArmcloudEngine = ArmcloudEngine;
exports.COMMON_CODE = COMMON_CODE;
exports.ERROR_CODE = ERROR_CODE;
exports.LOG_TYPE = LOG_TYPE;
exports.MEDIA_VOICE_TYPE = MEDIA_VOICE_TYPE;
exports.PROGRESS_INFO = PROGRESS_INFO;
//# sourceMappingURL=index.cjs.js.map
