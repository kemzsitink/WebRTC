export declare const enum ReportEventType {
    FIRST_FRAME = "FirstFrame"
}
interface ReporterOptions {
    endpoint: string;
    commonParams?: Record<string, any>;
    useBeacon?: boolean;
    enableLog?: boolean;
    onceOnlyKeys?: string[];
}
export declare class MetricsReporter {
    private options;
    private keyParamsMap;
    private onceOnlyKeys;
    private reportedKeys;
    private keyQueueMap;
    constructor(options: ReporterOptions);
    /** 设置或更新某个 key 的参数 */
    addParam(key: string, params: Record<string, any>): void;
    /** 上报某个 key（顺序保证） */
    instant(key: string, extraParams?: Record<string, any>): void;
    /** 实际上报逻辑 */
    private report;
    private log;
}
export {};
