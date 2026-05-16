export default class ScreenshotOverlay {
    private videoContainer;
    private video;
    private rotateType;
    private canvas;
    private context;
    constructor(videoContainer: HTMLDivElement, rotateType?: number);
    private initCanvas;
    private configureCanvas;
    /**
     * 旋转截图
     * @param rotateType 0:竖屏 1:横屏
     */
    setScreenshotrotateType(rotateType?: 0 | 1): void;
    /**
     * 截图并绘制在 canvas 上
     * @param rotateType 0:竖屏 1:横屏
     */
    takeScreenshot(rotateType?: number): void;
    resizeScreenshot(width: number, height: number): void;
    clearScreenShot(): void;
    showScreenShot(): void;
    hideScreenShot(): void;
    destroy(): void;
}
