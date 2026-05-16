import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import CustomRtc from '../../../src/lib/module/volc/CustomRtc';
import VERTC from '@volcengine/rtc';

// Mock @volcengine/rtc
jest.mock('@volcengine/rtc', () => ({
  createEngine: jest.fn().mockReturnValue({
    on: jest.fn(),
    joinRoom: jest.fn().mockResolvedValue({}),
    unsubscribeStream: jest.fn(),
    subscribeStream: jest.fn(),
    publishStream: jest.fn(),
    unpublishStream: jest.fn(),
    startVideoCapture: jest.fn().mockResolvedValue({ width: 1280, height: 720 }),
    stopVideoCapture: jest.fn(),
    startAudioCapture: jest.fn().mockResolvedValue({}),
    stopAudioCapture: jest.fn(),
    setVideoCaptureDevice: jest.fn(),
    setAudioCaptureDevice: jest.fn(),
    sendUserMessage: jest.fn().mockResolvedValue({}),
    leaveRoom: jest.fn().mockResolvedValue({}),
    setVideoEncoderConfig: jest.fn(),
  }),
  destroyEngine: jest.fn(),
  setParameter: jest.fn(),
  isSupported: jest.fn().mockReturnValue(true),
  events: {
    onLocalVideoSizeChanged: 'onLocalVideoSizeChanged',
    onError: 'onError',
    onAutoplayFailed: 'onAutoplayFailed',
    onRemoteStreamStats: 'onRemoteStreamStats',
    onNetworkQuality: 'onNetworkQuality',
    onConnectionStateChanged: 'onConnectionStateChanged',
    onUserJoined: 'onUserJoined',
    onUserLeave: 'onUserLeave',
    onRemoteVideoFirstFrame: 'onRemoteVideoFirstFrame',
    onUserPublishStream: 'onUserPublishStream',
    onRoomMessageReceived: 'onRoomMessageReceived',
    onUserMessageReceived: 'onUserMessageReceived',
  },
}));

// Mock CustomGroupRtc
jest.mock('../../../src/lib/module/volc/CustomGroupRtc', () => {
  return jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
    joinRoom: jest.fn(),
    kickItOutRoom: jest.fn(),
    close: jest.fn(),
    getEngine: jest.fn().mockResolvedValue({ engine: {} }),
  }));
});

describe('CustomRtc', () => {
  let customRtc: CustomRtc;
  const mockOptions: any = {
    appId: 'test-app',
    padCode: 'test-pad',
    clientId: 'test-client',
    roomCode: 'test-room',
    userId: 'test-user',
    roomToken: 'test-token',
    masterIdPrefix: 'test-master',
    videoStream: {
      resolution: 1,
      frameRate: 1,
      bitrate: 1,
    },
  };
  const mockCallbacks: any = {
    onConnectSuccess: jest.fn(),
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-view"></div>';
    customRtc = new CustomRtc('test-view', mockOptions, mockCallbacks);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be initialized correctly', () => {
    expect(customRtc).toBeDefined();
    expect(VERTC.createEngine).toHaveBeenCalledWith('test-app');
  });

  it('should handle sendGroupMessage', async () => {
    (customRtc as any).groupRtc = { sendMessage: jest.fn().mockResolvedValue({}) };
    const message = 'test message';
    
    await customRtc.sendGroupMessage(message);
    
    expect((customRtc as any).groupRtc.sendMessage).toHaveBeenCalledWith(message);
  });

  it('should join group room correctly', () => {
    (customRtc as any).isGroupControl = true;
    (customRtc as any).groupRtc = { joinRoom: jest.fn() };
    const pads = ['pad1', 'pad2'];
    
    customRtc.joinGroupRoom(pads);
    
    // It filters out the remoteUserId (test-pad)
    expect((customRtc as any).groupRtc.joinRoom).toHaveBeenCalledWith(['pad1', 'pad2']);
  });

  it('should kick out from room correctly', () => {
    (customRtc as any).groupRtc = { kickItOutRoom: jest.fn() };
    const pads = ['pad1'];
    
    customRtc.kickItOutRoom(pads);
    
    expect((customRtc as any).groupRtc.kickItOutRoom).toHaveBeenCalledWith(['pad1']);
  });

  it('should start and stop media stream', async () => {
    (customRtc as any).notifyInject = jest.fn().mockResolvedValue({});
    const engine = (customRtc as any).engine;
    
    await customRtc.startMediaStream(1); // MediaType.AUDIO
    expect(engine.publishStream).toHaveBeenCalledWith(1);
    expect((customRtc as any).isMicrophoneInject).toBe(true);
    
    await customRtc.stopMediaStream(1);
    expect(engine.unpublishStream).toHaveBeenCalledWith(1);
    expect((customRtc as any).isMicrophoneInject).toBe(false);
  });
});
