import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { CleanupUploadOnErrorInterceptor } from './cleanup-upload.interceptor';

const context = (file?: { filename: string }) => ({ switchToHttp: () => ({ getRequest: () => ({ file }) }) }) as any;

describe('CleanupUploadOnErrorInterceptor', () => {
  it('removes the uploaded file and rethrows when the handler or pipes fail', async () => {
    const files = { remove: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new CleanupUploadOnErrorInterceptor(files as any);
    const error = new BadRequestException('title bo‘sh');
    await expect(lastValueFrom(interceptor.intercept(context({ filename: 'x.mp4' }), { handle: () => throwError(() => error) }))).rejects.toBe(error);
    expect(files.remove).toHaveBeenCalledWith('x.mp4');
  });
  it('leaves the file alone on success', async () => {
    const files = { remove: jest.fn() };
    const interceptor = new CleanupUploadOnErrorInterceptor(files as any);
    await expect(lastValueFrom(interceptor.intercept(context({ filename: 'x.mp4' }), { handle: () => of('ok') }))).resolves.toBe('ok');
    expect(files.remove).not.toHaveBeenCalled();
  });
  it('rethrows the original error even when there is no file or cleanup fails', async () => {
    const files = { remove: jest.fn().mockRejectedValue(new Error('EPERM')) };
    const interceptor = new CleanupUploadOnErrorInterceptor(files as any);
    const error = new Error('boom');
    await expect(lastValueFrom(interceptor.intercept(context(), { handle: () => throwError(() => error) }))).rejects.toBe(error);
    await expect(lastValueFrom(interceptor.intercept(context({ filename: 'y.mp4' }), { handle: () => throwError(() => error) }))).rejects.toBe(error);
  });
});
