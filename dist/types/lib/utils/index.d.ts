export declare const blobToText: (blob: Blob) => Promise<unknown>;
export declare const arrayBufferToText: (buffer: ArrayBuffer) => string;
export declare const checkType: (input: Blob | ArrayBuffer | String) => "ArrayBuffer" | "Blob" | "String";
/** 判断是否是手机 */
export declare const isMobile: () => boolean;
export declare const isTouchDevice: () => boolean;
export declare const waitStyleApplied: (el: HTMLElement) => Promise<void>;
export declare const nextFrame: () => Promise<void>;
export declare function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): (this: ThisParameterType<T>, ...args: Parameters<T>) => void;
export declare const copyText: (text: string) => Promise<void>;
