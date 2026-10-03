import { ChatGateway } from './chat.gateway';

describe('ChatGateway', () => {
  const makeClient = (token?: unknown) => ({ handshake: { auth: token === undefined ? {} : { token } }, join: jest.fn(), disconnect: jest.fn() });
  let jwt: { verifyAsync: jest.Mock };
  let gw: ChatGateway;
  beforeEach(() => { jwt = { verifyAsync: jest.fn() }; gw = new ChatGateway(jwt as any); });

  it('joins user room for a valid token', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'u1' });
    const c = makeClient('good');
    await gw.handleConnection(c as any);
    expect(jwt.verifyAsync).toHaveBeenCalledWith('good');
    expect(c.join).toHaveBeenCalledWith('user:u1');
    expect(c.disconnect).not.toHaveBeenCalled();
  });

  it('disconnects when token is missing', async () => {
    const c = makeClient();
    await gw.handleConnection(c as any);
    expect(c.disconnect).toHaveBeenCalledWith(true);
    expect(c.join).not.toHaveBeenCalled();
  });

  it('disconnects when verification throws', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    const c = makeClient('bad');
    await gw.handleConnection(c as any);
    expect(c.disconnect).toHaveBeenCalledWith(true);
    expect(c.join).not.toHaveBeenCalled();
  });

  it('disconnects when payload has no sub', async () => {
    jwt.verifyAsync.mockResolvedValue({});
    const c = makeClient('x');
    await gw.handleConnection(c as any);
    expect(c.disconnect).toHaveBeenCalledWith(true);
    expect(c.join).not.toHaveBeenCalled();
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
});
