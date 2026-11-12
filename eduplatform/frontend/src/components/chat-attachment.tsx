'use client';

import { useEffect, useState } from 'react';
import { fetchBlob } from '../lib/api';
import { ChatAttachment } from '../types';
import { Icon } from './icons';

export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024;
// Backend bilan bir xil ro'yxat (chat-files.ts)
export const CHAT_FILE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp3,.mp4';
const ALLOWED = new Set(CHAT_FILE_ACCEPT.split(','));

export const fileExt = (name: string) => { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i).toLowerCase() : ''; };
export const isAllowedChatFile = (name: string) => ALLOWED.has(fileExt(name));
export const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const attachmentPath = (messageId: string) => `/chat/messages/${messageId}/attachment`;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AttachmentView({ messageId, attachment, mine, onImageLoad }: { messageId: string; attachment: ChatAttachment; mine: boolean; onImageLoad?: () => void }) {
  const isImage = attachment.mimeType.startsWith('image/');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isImage) return;
    let url: string | null = null;
    let cancelled = false;
    fetchBlob(attachmentPath(messageId))
      .then(blob => { if (cancelled) return; url = URL.createObjectURL(blob); setImageUrl(url); })
      .catch(e => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [isImage, messageId]);

  const download = async () => {
    setBusy(true); setError('');
    try { saveBlob(await fetchBlob(attachmentPath(messageId)), attachment.name); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  if (isImage && imageUrl) {
    return <button type="button" onClick={() => window.open(imageUrl, '_blank', 'noopener')} className="block overflow-hidden rounded-xl" title={attachment.name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={attachment.name} onLoad={onImageLoad} className="max-h-64 w-auto max-w-full object-contain" />
    </button>;
  }

  return <div>
    <button type="button" onClick={download} disabled={busy} className={`flex w-full min-w-[200px] items-center gap-3 rounded-xl px-3 py-2 text-left transition ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-white hover:bg-slate-50'} disabled:opacity-60`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${mine ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-600'}`}><Icon name={isImage && !error ? 'clock' : 'file'} className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{attachment.name}</span><span className={`block text-xs ${mine ? 'text-violet-200' : 'text-slate-400'}`}>{busy ? 'Yuklanmoqda…' : `${fileExt(attachment.name).slice(1).toUpperCase()} · ${formatSize(attachment.size)}`}</span></span>
      <Icon name="download" className="h-4 w-4 shrink-0 opacity-70" />
    </button>
    {error && <p className={`mt-1 text-xs ${mine ? 'text-rose-200' : 'text-rose-600'}`}>{error}</p>}
  </div>;
}
