const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const ID = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(input: string): string | null {
  const text = (input ?? '').trim();
  if (!text) return null;
  let url: URL;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !HOSTS.has(url.hostname.toLowerCase())) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const candidate = url.hostname.toLowerCase() === 'youtu.be' ? segments[0] : ['embed', 'shorts'].includes(segments[0]) ? segments[1] : segments[0] === 'watch' ? url.searchParams.get('v') : null;
  return candidate && ID.test(candidate) ? candidate : null;
}
