import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, concatMap, from, Observable, throwError } from 'rxjs';
import { VideoFilesService } from './video-files.service';

// Multer writes the file before the ValidationPipe runs; if anything fails afterwards, the file must not stay on disk.
@Injectable()
export class CleanupUploadOnErrorInterceptor implements NestInterceptor {
  constructor(private files: VideoFilesService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(catchError(error => {
      const fileName: string | undefined = context.switchToHttp().getRequest().file?.filename;
      const cleanup = fileName ? this.files.remove(fileName).catch(() => undefined) : Promise.resolve();
      return from(cleanup).pipe(concatMap(() => throwError(() => error)));
    }));
  }
}
