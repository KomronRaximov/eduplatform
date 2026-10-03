import { GeminiClient } from './gemini.client';

const ok = (text: string) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

describe('GeminiClient', () => {
  const client = new GeminiClient();
  const realFetch = global.fetch;
  beforeEach(() => { process.env.GEMINI_API_KEY = 'secret-key-123'; process.env.GEMINI_MODEL = 'gemini-test'; delete process.env.GEMINI_TIMEOUT_MS; });
  afterEach(() => { global.fetch = realFetch; delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_MODEL; delete process.env.GEMINI_TIMEOUT_MS; });

  it('reports whether a key is configured', () => {
    expect(client.isConfigured()).toBe(true);
    process.env.GEMINI_API_KEY = '  ';
    expect(client.isConfigured()).toBe(false);
    delete process.env.GEMINI_API_KEY;
    expect(client.isConfigured()).toBe(false);
  });

  it('calls generateContent with the key header and a JSON schema, and parses the reply', async () => {
    const fetchMock = jest.fn().mockResolvedValue(ok('{"items":[{"videoId":"v1","reason":"yaxshi"}]}'));
    global.fetch = fetchMock as any;
    const schema = { type: 'OBJECT' };
    const result = await client.generateJson('salom', schema);
    expect(result).toEqual({ items: [{ videoId: 'v1', reason: 'yaxshi' }] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(init.method).toBe('POST');
    expect(init.headers['x-goog-api-key']).toBe('secret-key-123');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toBe('salom');
    expect(body.generationConfig).toEqual({ responseMimeType: 'application/json', responseSchema: schema });
  });

  it('throws on HTTP errors without leaking the key', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }) as any;
    const error = await client.generateJson('x', {}).catch(e => e as Error);
    expect(error.message).toContain('429');
    expect(error.message).not.toContain('secret-key-123');
  });

  it('times out slow requests', async () => {
    process.env.GEMINI_TIMEOUT_MS = '20';
    global.fetch = jest.fn((_url: string, init: any) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as any;
    await expect(client.generateJson('x', {})).rejects.toThrow(/taymaut/i);
  });

  it('throws on empty or invalid replies', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [] }) }) as any;
    await expect(client.generateJson('x', {})).rejects.toThrow();
    global.fetch = jest.fn().mockResolvedValue(ok('not json')) as any;
    await expect(client.generateJson('x', {})).rejects.toThrow();
  });
});
