import { InputService } from '../../src/lib/services/InputService';
import { IRtcInstance } from '../../src/lib/types/rtcInterface';

jest.mock('../../src/lib/utils/index', () => ({
  isMobile: jest.fn(() => true),
}));

describe('InputService', () => {
  let rtcMock: jest.Mocked<IRtcInstance>;
  let inputService: InputService;

  beforeEach(() => {
    rtcMock = {
      sendInputString: jest.fn(),
      triggerKeyboardShortcut: jest.fn(),
    } as any;
    inputService = new InputService(rtcMock);
    document.body.innerHTML = '<div id="test-container"></div>';
  });

  afterEach(() => {
    inputService.destroy();
    jest.clearAllMocks();
  });

  it('should initialize IME on mobile', () => {
    inputService.initIme('test-container');
    const el = inputService.getInputElement();
    expect(el).not.toBeNull();
    expect(el?.tagName).toBe('TEXTAREA');
  });

  it('should not initialize if disableLocalIME is true', () => {
    inputService.initIme('test-container', { disableLocalIME: true });
    expect(inputService.getInputElement()).toBeNull();
  });

  it('should not initialize if container is missing', () => {
    document.body.innerHTML = '';
    inputService.initIme('test-container');
    expect(inputService.getInputElement()).toBeNull();
  });
});
