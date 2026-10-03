import { ChatGateway, chatCorsOrigin } from './chat.gateway';

describe('ChatGateway', () => {
  let jwt: { verifyAsync: jest.Mock };
  let gw: ChatGateway;
  beforeEach(() => { jwt = { verifyAsync: jest.fn() }; gw = new ChatGateway(jwt as any); });
  afterEach(() => jest.useRealTimers());

  const middleware = () => {
    const use = jest.fn();
    gw.afterInit({ use } as any);
    return use.mock.calls[0][0] as (socket: any, next: jest.Mock) => Promise<void>;
  };
  const handshakeSocket = (token?: unknown) => ({ handshake: { auth: token === undefined ? {} : { token } }, data: {} as any });
  const makeClient = (data: any = {}) => {
    const handlers: Record<string, () => void> = {};
    return { data, join: jest.fn(), disconnect: jest.fn(), once: jest.fn((event: string, fn: () => void) => { handlers[event] = fn; }), handlers };
  };

  describe('authentication middleware', () => {
    it('accepts a valid token and stores userId and expiry on socket.data', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1', exp: 1900000000 });
      const socket = handshakeSocket('good'); const next = jest.fn();
      await middleware()(socket, next);
      expect(jwt.verifyAsync).toHaveBeenCalledWith('good');
      expect(socket.data).toEqual({ userId: 'u1', expiresAt: 1900000000 });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
    it('accepts a token without exp', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
      const socket = handshakeSocket('good'); const next = jest.fn();
      await middleware()(socket, next);
      expect(socket.data.userId).toBe('u1');
      expect(socket.data.expiresAt).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
    it.each([['missing', undefined], ['empty', ''], ['array', ['a']], ['object', { a: 1 }], ['number', 5]])('rejects a %s token without verifying', async (_n, token) => {
      const socket = handshakeSocket(token); const next = jest.fn();
      await middleware()(socket, next);
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'unauthorized' }));
      expect(socket.data.userId).toBeUndefined();
    });
    it('rejects when verification throws', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('expired'));
      const socket = handshakeSocket('bad'); const next = jest.fn();
      await middleware()(socket, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'unauthorized' }));
    });
    it('rejects when payload has no sub', async () => {
      jwt.verifyAsync.mockResolvedValue({});
      const socket = handshakeSocket('x'); const next = jest.fn();
      await middleware()(socket, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'unauthorized' }));
      expect(socket.data.userId).toBeUndefined();
    });
  });

  describe('handleConnection', () => {
    it('joins the room from socket.data only', () => {
      const c = makeClient({ userId: 'u1' });
      gw.handleConnection(c as any);
      expect(c.join).toHaveBeenCalledWith('user:u1');
      expect(c.disconnect).not.toHaveBeenCalled();
    });
    it('disconnects without joining when socket.data has no userId', () => {
      const c = makeClient({});
      gw.handleConnection(c as any);
      expect(c.disconnect).toHaveBeenCalledWith(true);
      expect(c.join).not.toHaveBeenCalled();
    });
    it('disconnects when the token expires, using fake timers', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-03T10:00:00Z'));
      const c = makeClient({ userId: 'u1', expiresAt: Date.now() / 1000 + 60 });
      gw.handleConnection(c as any);
      jest.advanceTimersByTime(59_000);
      expect(c.disconnect).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1_000);
      expect(c.disconnect).toHaveBeenCalledWith(true);
    });
    it('disconnects immediately when the token already expired', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-03T10:00:00Z'));
      const c = makeClient({ userId: 'u1', expiresAt: Date.now() / 1000 - 5 });
      gw.handleConnection(c as any);
      jest.advanceTimersByTime(0);
      expect(c.disconnect).toHaveBeenCalledWith(true);
    });
    it('clamps very distant expiry to the max timer delay', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-03T10:00:00Z'));
      const spy = jest.spyOn(global, 'setTimeout');
      const c = makeClient({ userId: 'u1', expiresAt: Date.now() / 1000 + 10 * 365 * 86400 });
      gw.handleConnection(c as any);
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 2147483647);
      spy.mockRestore();
    });
    it('does not schedule a timer when there is no exp', () => {
      jest.useFakeTimers();
      const c = makeClient({ userId: 'u1' });
      gw.handleConnection(c as any);
      expect(jest.getTimerCount()).toBe(0);
    });
    it('clears the timer when the socket disconnects', () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-03T10:00:00Z'));
      const c = makeClient({ userId: 'u1', expiresAt: Date.now() / 1000 + 60 });
      gw.handleConnection(c as any);
      expect(jest.getTimerCount()).toBe(1);
      c.handlers.disconnect();
      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(120_000);
      expect(c.disconnect).not.toHaveBeenCalled();
    });
  });

  it('emitToUser targets only the user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gw.server = { to } as any;
    const p = { a: 1 };
    gw.emitToUser('u1', 'chat:message', p);
    expect(to).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('chat:message', p);
  });

  describe('chatCorsOrigin', () => {
    const saved = process.env.FRONTEND_URL;
    afterEach(() => { if (saved === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = saved; });
    const check = (origin?: string) => { const cb = jest.fn(); chatCorsOrigin(origin, cb); return cb.mock.calls[0]; };
    it('allows the configured origin and rejects others', () => {
      process.env.FRONTEND_URL = 'https://app.example.uz';
      expect(check('https://app.example.uz')).toEqual([null, true]);
      expect(check('https://evil.example')).toEqual([null, false]);
    });
    it('allows requests without an origin (non-browser clients)', () => {
      expect(check(undefined)).toEqual([null, true]);
    });
    it('falls back to localhost:3000 and honours env changes at runtime', () => {
      delete process.env.FRONTEND_URL;
      expect(check('http://localhost:3000')).toEqual([null, true]);
      process.env.FRONTEND_URL = 'https://later.example';
      expect(check('http://localhost:3000')).toEqual([null, false]);
      expect(check('https://later.example')).toEqual([null, true]);
    });
  });
});
