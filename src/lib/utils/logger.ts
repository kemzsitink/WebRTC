export class Logger {
  private static isLogEnabled: boolean = true;

  public static setEnable(enable: boolean) {
    this.isLogEnabled = enable;
  }

  public static info(message?: any, ...optionalParams: any[]) {
    if (this.isLogEnabled) {
      console.log(`[ArmcloudRTC Info]:`, message, ...optionalParams);
    }
  }

  public static warn(message?: any, ...optionalParams: any[]) {
    if (this.isLogEnabled) {
      console.warn(`[ArmcloudRTC Warn]:`, message, ...optionalParams);
    }
  }

  public static error(message?: any, ...optionalParams: any[]) {
    if (this.isLogEnabled) {
      console.error(`[ArmcloudRTC Error]:`, message, ...optionalParams);
    }
  }
}
