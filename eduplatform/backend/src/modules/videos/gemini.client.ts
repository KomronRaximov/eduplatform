import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiClient {
  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY?.trim();
  }

  async generateJson(prompt: string, schema: object): Promise<unknown> {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) throw new Error('Gemini kaliti sozlanmagan');
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.GEMINI_TIMEOUT_MS) || 8000);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
      const text = (await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') throw new Error('Gemini bo‘sh javob qaytardi');
      try { return JSON.parse(text); } catch { throw new Error('Gemini javobi JSON emas'); }
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw new Error('Gemini taymaut (vaqt tugadi)');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
