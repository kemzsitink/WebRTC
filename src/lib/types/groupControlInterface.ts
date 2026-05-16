export interface IGroupControl {
  joinRoom(pads: string[]): Promise<any>;
  kickItOutRoom(pads: string[]): void;
  close(): void;
  sendMessage(message: string): void | Promise<any>;
  sendUserMessage?(userId: string, message: string): Promise<any>;
  getEngine?(): Promise<any>;
}


