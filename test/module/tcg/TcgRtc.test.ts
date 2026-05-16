import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import TcgRtc from '../../../src/lib/module/tcg/TcgRtc';
import { StreamType } from '../../../src/lib/constant/index';
import { TouchType, MediaType } from '../../../src/lib/types/webrtcType';

// Mock CloudGamingWebSDK
jest.mock('../../../src/lib/module/tcg/core/index', () => ({
  CloudGamingWebSDK: jest.fn().mockImplementation(() => ({
    getAndroidInstance: jest.fn().mockReturnValue({
      joinGroupControl: jest.fn(),
      leaveGroupControl: jest.fn(),
      startSync: jest.fn(),
      stopSync: jest.fn(),
    }),
    setKMStatus: jest.fn(),
    setPaste: jest.fn(),
    getRequestId: jest.fn().mockReturnValue('test-request-id'),
    createShadowSocket: jest.fn().mockResolvedValue({}),
    init: jest.fn(),
    playVideo: jest.fn(),
    getRemoteStreamResolution: jest.fn().mockReturnValue({ width: 1280, height: 720 }),
    setAccessToken: jest.fn(),
    setStreamProfile: jest.fn(),
    setVideoOrientation: jest.fn(),
    destroy: jest.fn(),
    createCustomDataChannel: jest.fn().mockResolvedValue({
      sendMessage: jest.fn(),
      code: 0,
    }),
  })),
}));

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn().mockResolvedValue({ data: { data: { accessInfo: 'test-info', roomToken: 'test-token' } } }),
  isCancel: jest.fn().mockReturnValue(false),
}));

// Mock MetricsReporter
jest.mock('../../../src/lib/common/metrics-reporter', () => ({
  MetricsReporter: jest.fn().mockImplementation(() => ({
    addParam: jest.fn(),
    instant: jest.fn(),
  })),
  ReportEventType: {
    FIRST_FRAME: 'first_frame',
  },
}));

describe('TcgRtc', () => {
  let tcgRtc: TcgRtc;
  const mockOptions: any = {
    padCode: 'test-pad',
    clientId: 'test-client',
    masterIdPrefix: 'test-master',
    videoStream: {
      resolution: 1,
      frameRate: 1,
      bitrate: 1,
    },
    baseUrl: 'https://test.com',
  };
  const mockCallbacks: any = {
    onConnectSuccess: jest.fn(),
    onRenderedFirstFrame: jest.fn(),
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="test-view"></div>';
    tcgRtc = new TcgRtc('test-view', mockOptions, mockCallbacks);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be initialized correctly', () => {
    expect(tcgRtc).toBeDefined();
    expect(tcgRtc.getRequestId()).toBeDefined();
  });

  it('should handle sendGroupMessage', async () => {
    // Manually set isGroupControl and mock groupDataChannel
    (tcgRtc as any).isGroupControl = true;
    const mockSend = jest.fn();
    (tcgRtc as any).groupDataChannel = { send: mockSend };

    tcgRtc.sendGroupMessage('test message');
    expect(mockSend).toHaveBeenCalledWith('test message');
  });

  it('should join group room correctly', async () => {
    (tcgRtc as any).isGroupControl = true;
    const pads = ['pad1', 'pad2'];
    
    // Trigger joinGroupRoom
    await tcgRtc.joinGroupRoom(pads);
    
    // Check if it filters out the client itself (though it's not in the list)
    expect((tcgRtc as any).groupPads).toContain('pad1');
    expect((tcgRtc as any).groupPads).toContain('pad2');
  });

  it('should kick out from room correctly', () => {
    (tcgRtc as any).isGroupControl = true;
    (tcgRtc as any).groupPads = ['pad1', 'pad2'];
    
    tcgRtc.kickItOutRoom(['pad1']);
    
    expect((tcgRtc as any).groupPads).not.toContain('pad1');
    expect((tcgRtc as any).groupPads).toContain('pad2');
  });

  it('should toggle group control sync', () => {
    (tcgRtc as any).isGroupControl = true;
    const androidInstance = (tcgRtc as any).androidInstance;
    
    tcgRtc.toggleGroupControlSync(true);
    expect(androidInstance.startSync).toHaveBeenCalled();
    
    tcgRtc.toggleGroupControlSync(false);
    expect(androidInstance.stopSync).toHaveBeenCalled();
  });
});
