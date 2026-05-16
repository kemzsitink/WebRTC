import { IRtcInstance } from "../types/rtcInterface";
import { isMobile } from "../utils/index";
import { KEY_CODE_MAP } from "../constant/keyCodes";

export class InputService {
  private rtc: IRtcInstance;
  private inputElement: HTMLTextAreaElement | null = null;
  private isComposing: boolean = false;

  constructor(rtc: IRtcInstance) {
    this.rtc = rtc;
  }

  /**
   * Khởi tạo hidden input cho IME (mobile/local keyboard)
   * @param containerId DOM ID của container
   * @param options Cấu hình (disableLocalIME, etc.)
   */
  public initIme(containerId: string, options: { disableLocalIME?: boolean } = {}) {
    if (options.disableLocalIME) return;
    if (!isMobile()) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Tránh khởi tạo nhiều lần
    if (this.inputElement) return;

    const el = document.createElement("textarea") as HTMLTextAreaElement;
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

    el.addEventListener("compositionend", (e: Event) => {
      this.isComposing = false;
      const target = e.target as HTMLInputElement;
      this.rtc.sendInputString(target.value);
      el.value = "";
    });

    el.addEventListener("input", (e: Event) => {
      if (this.isComposing) return;
      const target = e.target as HTMLInputElement;
      this.rtc.sendInputString(target.value);
      el.value = "";
    });

    el.addEventListener("keydown", (e: KeyboardEvent) => {
      const code = KEY_CODE_MAP[e.key];
      if (code !== undefined) {
        if (e.key === "Enter") el.blur();
        this.rtc.triggerKeyboardShortcut?.(0, code);
      }
    });

    container.appendChild(el);
    container.style.position = "relative";
    this.inputElement = el;
  }

  public getInputElement(): HTMLTextAreaElement | null {
    return this.inputElement;
  }



  public focus() {
    this.inputElement?.focus();
  }

  public blur() {
    this.inputElement?.blur();
  }

  public destroy() {
    this.inputElement?.remove();
    this.inputElement = null;
  }
}
