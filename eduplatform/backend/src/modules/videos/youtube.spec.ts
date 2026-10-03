import { extractYoutubeId } from './youtube';

describe('extractYoutubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'youtube.com/watch?v=dQw4w9WgXcQ',
  ])('extracts the id from %s', url => expect(extractYoutubeId(url)).toBe('dQw4w9WgXcQ'));

  it.each([
    'https://evil.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'javascript:alert(1)',
    '',
    'salom',
  ])('rejects %p', url => expect(extractYoutubeId(url)).toBeNull());
});
