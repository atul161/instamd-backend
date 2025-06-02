import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId =
      request?.headers['x-request-id'] || this.generateRequestId();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const responseTime = Date.now() - startTime;
        const formattedResponse = this.formatResponse(data);

        // Log request details only in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`[${request.method}] ${request.url} - ${responseTime}ms`);
        }

        return {
          status: 'success',
          ...formattedResponse,
          metadata: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            requestId,
            responseTime: `${responseTime}ms`,
          },
        };
      }),
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).slice(2, 11);
  }

  private formatResponse(data: any) {
    if (data && typeof data === 'object') {
      // Check for pagination metadata
      if ('items' in data && 'total' in data) {
        return {
          data: data.items,
          pagination: {
            total: data.total,
            page: data.page || 1,
            pageSize: data.pageSize || data.items.length,
          },
        };
      }
    }
    return { data };
  }
}
