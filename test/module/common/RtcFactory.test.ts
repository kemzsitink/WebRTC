import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });
import { StreamType } from '../../../src/lib/constant/index';
jest.mock('../../../src/lib/module/tcg/core/index', () => ({
  CloudGamingWebSDK: class {},
}));
jest.mock('../../../src/lib/module/volc/CustomRtc');
jest.mock('../../../src/lib/module/p2p/WebRtc');
jest.mock('../../../src/lib/module/tcg/TcgRtc');

import { RtcFactory } from '../../../src/lib/module/common/RtcFactory';
import CustomRtc from '../../../src/lib/module/volc/CustomRtc';
import WebRtc from '../../../src/lib/module/p2p/WebRtc';
import TcgRtc from '../../../src/lib/module/tcg/TcgRtc';

describe('RtcFactory', () => {
  const mockOptions: any = {};
  const mockCallbacks: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create CustomRtc for StreamType.CUSTOM', () => {
    RtcFactory.create(StreamType.CUSTOM, 'test-view', mockOptions, mockCallbacks);
    expect(CustomRtc).toHaveBeenCalledWith('test-view', mockOptions, mockCallbacks);
  });

  it('should create WebRtc for StreamType.WEBRTC', () => {
    RtcFactory.create(StreamType.WEBRTC, 'test-view', mockOptions, mockCallbacks);
    expect(WebRtc).toHaveBeenCalledWith('test-view', mockOptions, mockCallbacks);
  });

  it('should create TcgRtc for StreamType.TCGRTC', () => {
    RtcFactory.create(StreamType.TCGRTC, 'test-view', mockOptions, mockCallbacks);
    expect(TcgRtc).toHaveBeenCalledWith('test-view', mockOptions, mockCallbacks);
  });

  it('should throw error for unsupported stream type', () => {
    expect(() => RtcFactory.create(999, 'test-view', mockOptions, mockCallbacks)).toThrow('Unsupported streamType: 999');
  });
});
