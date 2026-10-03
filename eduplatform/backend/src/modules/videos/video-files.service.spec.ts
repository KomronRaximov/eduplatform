import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { VideoFilesService } from './video-files.service';

describe('VideoFilesService.remove', () => {
  let root: string;
  const service = new VideoFilesService();
  beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'uploads-')); await fs.mkdir(path.join(root, 'videos')); process.env.UPLOAD_DIR = root; });
  afterEach(async () => { delete process.env.UPLOAD_DIR; await fs.rm(root, { recursive: true, force: true }); });
  const exists = (p: string) => fs.access(p).then(() => true, () => false);

  it('deletes an existing file', async () => {
    const file = path.join(root, 'videos', 'a.mp4'); await fs.writeFile(file, 'x');
    await service.remove('a.mp4');
    expect(await exists(file)).toBe(false);
  });
  it('ignores missing files and empty names', async () => {
    await expect(service.remove('missing.mp4')).resolves.toBeUndefined();
    await expect(service.remove(null)).resolves.toBeUndefined();
    await expect(service.remove('')).resolves.toBeUndefined();
  });
  it('never deletes outside the videos directory', async () => {
    const outside = path.join(root, 'outside.txt'); await fs.writeFile(outside, 'keep');
    await service.remove('../outside.txt'); await service.remove('a/b.mp4');
    expect(await exists(outside)).toBe(true);
  });
});
