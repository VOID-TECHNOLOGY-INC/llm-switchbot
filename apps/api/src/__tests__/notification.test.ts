import { NotificationService } from '../services/notification';

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  it('should add and remove clients', () => {
    const mockReply: any = {
      raw: {
        on: jest.fn(),
      },
    };

    const clientId = notificationService.addClient(mockReply);
    expect(clientId).toBeDefined();
    expect(notificationService.getClientCount()).toBe(1);

    notificationService.removeClient(clientId);
    expect(notificationService.getClientCount()).toBe(0);
  });

  it('should broadcast messages to all clients', () => {
    const mockReply1: any = {
      raw: {
        write: jest.fn(),
        on: jest.fn(),
      },
    };
    const mockReply2: any = {
      raw: {
        write: jest.fn(),
        on: jest.fn(),
      },
    };

    notificationService.addClient(mockReply1);
    notificationService.addClient(mockReply2);

    const testEvent = { type: 'test', data: 'hello' };
    notificationService.broadcast(testEvent);

    expect(mockReply1.raw.write).toHaveBeenCalled();
    expect(mockReply2.raw.write).toHaveBeenCalled();

    const writeCall1 = mockReply1.raw.write.mock.calls[0][0];
    expect(writeCall1).toContain('data: {"type":"test","data":"hello"}');
  });

  it('should format SSE messages correctly', () => {
    const mockReply: any = {
      raw: {
        write: jest.fn(),
        on: jest.fn(),
      },
    };

    notificationService.addClient(mockReply);
    notificationService.broadcast({ type: 'status', value: 'ok' }, 'status-update');

    const writeCall = mockReply.raw.write.mock.calls[0][0];
    expect(writeCall).toContain('event: status-update\n');
    expect(writeCall).toContain('data: {"type":"status","value":"ok"}\n\n');
  });
});
