import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        const errorResponse = {
          status: 'error',
          data: null,
          message: error.message || 'An unexpected error occurred',
          metadata: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            requestId:
              request?.headers['x-request-id'] || this.generateRequestId(),
            statusCode,
          },
        };

        return throwError(() => new HttpException(errorResponse, statusCode));
      }),
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).slice(2, 11);
  }
}
