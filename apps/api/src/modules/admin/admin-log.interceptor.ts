import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const request = context.switchToHttp().getRequest();
        const method = request.method?.toUpperCase();

        if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
          return;
        }

        const routePath: string = request.routeOptions?.url ?? request.url;
        const user = request.user;
        const params = request.params ?? {};

        const targetType = params.id ? this.extractTargetType(routePath) : undefined;
        const targetId = params.id ?? params.licenseId ?? undefined;

        this.prisma.adminLog
          .create({
            data: {
              action: `${method} ${routePath}`,
              adminUserId: user?.userId ?? 'unknown',
              targetType,
              targetId,
              details: request.body ?? undefined,
            },
          })
          .catch((err) => {
            console.error('Failed to write admin log:', err);
          });
      }),
    );
  }

  private extractTargetType(routePath: string): string | undefined {
    const segments = routePath.replace(/^\/+/, '').split('/');
    const adminIdx = segments.indexOf('admin');
    if (adminIdx >= 0 && adminIdx + 1 < segments.length) {
      return segments[adminIdx + 1];
    }
    return segments[1] ?? segments[0];
  }
}
