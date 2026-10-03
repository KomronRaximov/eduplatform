import { isAllowedVideo } from './video-upload';

describe('isAllowedVideo', () => {
  it.each([['a.mp4', 'video/mp4'], ['A.WEBM', 'video/webm'], ['my lesson.Mp4', 'video/mp4']])('accepts %s (%s)', (name, mime) => expect(isAllowedVideo(name, mime)).toBe(true));
  it.each([['a.mp4', 'video/webm'], ['a.exe', 'video/mp4'], ['a.mp4', 'text/html'], ['a.mp4.exe', 'video/mp4'], ['video', 'video/mp4']])('rejects %s (%s)', (name, mime) => expect(isAllowedVideo(name, mime)).toBe(false));
});
