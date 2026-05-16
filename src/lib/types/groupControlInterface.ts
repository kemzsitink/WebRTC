export interface IGroupControl {
  joinRoom(pads: string[]): Promise<any>;
  kickItOutRoom(pads: string[]): void;
  close(): void;
  sendUserMessage?(userId: string, message?: string): Promise<any>;
  sendRoomMessage?(message: string): Promise<any>;
  sendMessage?(message: string): void;
  getEngine?(): Promise<any>;
}


