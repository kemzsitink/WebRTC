import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import WebRtc from '../../../src/lib/module/p2p/WebRtc';
import { StreamType } from '../../../src/lib/constant/index';
import { TouchType, MediaType, WebSocketEventType } from '../../../src/lib/types/webrtcType';

// Mock RTCPeerConnection
const mockRTCPeerConnection = {
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({ sdp: 'test-sdp' }),
  setLocalDescription: jest.fn().mockResolvedValue({}),
  setRemoteDescription: jest.fn().mockResolvedValue({}),
  createDataChannel: jest.fn().mockReturnValue({
    addEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  }),
  addEventListener: jest.fn(),
  getSenders: jest.fn().mockReturnValue([]),
  close: jest.fn(),
  signalingState: 'stable',
};

(global as any).RTCPeerConnection = jest.fn().mockImplementation(() => mockRTCPeerConnection);

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
};
(global as any).WebSocket = jest.fn().mockImplementation(() => mockWebSocket);

// Mock navigator.mediaDevices
const mockMediaStream = {
  getVideoTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
  getAudioTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
  getTracks: jest.fn().mockReturnValue([]),
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(mockMediaStream),
  },
  writable: true,
});

// Mock WebGroupRtc
jest.mock('../../../src/lib/module/p2p/WebGroupRtc', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    joinRoom: jest.fn(),
    close: jest.fn(),
  }));
});

// Mock decryptAES
jest.mock('../../../src/lib/utils/crypto', () => ({
  decryptAES: jest.fn().mockImplementation((val) => {
    if (val === 'test-stuns') return JSON.stringify([{ uri: 'stun:test-stun' }]);
    if (val === 'test-turns') return JSON.stringify([{ uri: 'turn:test-turn', username: 'user', pwd: 'pwd' }]);
    return 'test-server';
  }),
}));

describe('WebRtc', () => {
  let webRtc: WebRtc;
  const mockOptions: any = {
    padCode: 'test-pad',
    clientId: 'test-client',
    masterIdPrefix: 'test-master',
    roomToken: 'test-token',
    signalServer: 'test-server',
    stuns: 'test-stuns',
    turns: 'test-turns',
    videoStream: {
      resolution: 1,
      frameRate: 1,
      bitrate: 1,
    },
  };
  const mockCallbacks: any = {
    onConnectSuccess: jest.fn(),
    onProgress: jest.fn(),
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-view"></div>';
    webRtc = new WebRtc('test-view', mockOptions, mockCallbacks);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize and setup events on start', () => {
    webRtc.start();
    expect(global.WebSocket).toHaveBeenCalled();
    
    // Trigger onopen
    const wsMock = (global.WebSocket as any).mock.results[0].value;
    wsMock.onopen();
    
    expect(mockRTCPeerConnection.addEventListener).toHaveBeenCalledWith('icecandidate', expect.any(Function));
    expect(mockRTCPeerConnection.addEventListener).toHaveBeenCalledWith('track', expect.any(Function));
  });

  it('should handle sendGroupMessage', () => {
    (webRtc as any).groupRtc = { sendMessage: jest.fn() };
    const message = 'test message';
    
    webRtc.sendGroupMessage(message);
    
    expect((webRtc as any).groupRtc.sendMessage).toHaveBeenCalledWith(
      JSON.stringify({
        event: WebSocketEventType.BROADCAST_MSG,
        data: message,
      })
    );
  });

  it('should join group room correctly', () => {
    (webRtc as any).groupRtc = { joinRoom: jest.fn() };
    const pads = ['pad1', 'pad2'];
    
    webRtc.joinGroupRoom(pads);
    
    expect((webRtc as any).groupRtc.joinRoom).toHaveBeenCalledWith(['pad1', 'pad2']);
  });

  it('should kick it out room correctly', () => {
    (webRtc as any).groupRtc = { sendMessage: jest.fn() };
    const pads = ['pad1'];
    
    webRtc.kickItOutRoom(pads);
    
    expect((webRtc as any).groupRtc.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('kickOutUser')
    );
  });

  it('should handle startMediaStream for video', async () => {
    // Mock notifyInject to avoid actual sendUserMessage which depends on dataChannel
    (webRtc as any).notifyInject = jest.fn().mockResolvedValue({});
    
    await webRtc.startMediaStream(MediaType.VIDEO);
    
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: true }));
    expect((webRtc as any).isCameraInject).toBe(true);
  });

  it('should handle stopMediaStream for video', async () => {
    (webRtc as any).notifyInject = jest.fn().mockResolvedValue({});
    (webRtc as any).isCameraInject = true;
    
    await webRtc.stopMediaStream(MediaType.VIDEO);
    
    expect((webRtc as any).isCameraInject).toBe(false);
  });
});
