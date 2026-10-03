import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { io, Socket } from 'socket.io-client';
import { ChatGateway } from './chat.gateway';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

describe('ChatGateway (real sockets)', () => {
  let app: INestApplication;
  let gateway: ChatGateway;
  let jwt: JwtService;
  let url: string;
  const clients: Socket[] = [];

  const connect = (token?: unknown): Socket => {
    const socket = io(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    clients.push(socket);
    return socket;
  };
  const opened = (socket: Socket) => new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
  const collect = (socket: Socket, event: string) => {
    const received: unknown[] = [];
    socket.on(event, payload => received.push(payload));
    return received;
  };
  const sign = (sub: string, expiresIn: string | number = '1h') => jwt.signAsync({ sub }, { expiresIn });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [JwtModule.register({ secret: 'test-secret' })], providers: [ChatGateway] }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    gateway = moduleRef.get(ChatGateway);
    jwt = moduleRef.get(JwtService);
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    clients.forEach(socket => socket.close());
    await app.close();
  });

  it('delivers an event only to the addressed user', async () => {
    const a = connect(await sign('user-a'));
    const b = connect(await sign('user-b'));
    await Promise.all([opened(a), opened(b)]);
    const gotA = collect(a, 'chat:message');
    const gotB = collect(b, 'chat:message');
    const payload = { message: { id: 'm1', body: 'salom' } };
    gateway.emitToUser('user-a', 'chat:message', payload);
    await wait(300);
    expect(gotA).toEqual([payload]);
    expect(gotB).toEqual([]);
  });

  it.each([['an invalid token', 'not-a-jwt'], ['a missing token', undefined]])('rejects %s with connect_error unauthorized', async (_n, token) => {
    const socket = connect(token);
    const events: string[] = [];
    socket.on('connect', () => events.push('connect'));
    socket.on('chat:message', () => events.push('chat:message'));
    const error = await new Promise<Error>(resolve => socket.once('connect_error', resolve));
    expect(error.message).toBe('unauthorized');
    gateway.emitToUser('anyone', 'chat:message', {});
    await wait(200);
    expect(events).toEqual([]);
    expect(socket.connected).toBe(false);
  });

  it('disconnects a socket once its token expires', async () => {
    const socket = connect(await sign('user-exp', 2));
    await opened(socket);
    const reason = await new Promise<string>(resolve => socket.once('disconnect', resolve));
    expect(reason).toBe('io server disconnect');
  }, 8000);
});
