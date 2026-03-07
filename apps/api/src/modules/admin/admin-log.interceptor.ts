import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

const ENTITY_MAP: Record<string, string> = {
  personas: 'persona',
  hosts: 'host',
  devices: 'device',
  'blog-posts': 'blogPost',
  'hack-sessions': 'hackSession',
  subscriptions: 'subscription',
  files: 'file',
  'access-tokens': 'accessToken',
  licenses: 'license',
  notifications: 'notification',
};

@Injectable()
export class AdminLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const routePath: string = request.routeOptions?.url ?? request.url;
    const params = request.params ?? {};
    const targetType = params.id ? this.extractTargetType(routePath) : undefined;
    const targetId = params.id ?? params.licenseId ?? undefined;

    const beforePromise = this.captureBeforeState(targetType, targetId);

    return next.handle().pipe(
      tap(async (responseData) => {
        const user = request.user;
        let beforeJson: Prisma.InputJsonValue | undefined;
        let afterJson: Prisma.InputJsonValue | undefined;

        try {
          beforeJson = await beforePromise;
        } catch {
          // no-op
        }

        if (targetId && targetType) {
          try {
            if (method === 'DELETE') {
              afterJson = undefined;
            } else {
              afterJson = await this.captureAfterState(targetType, targetId);
            }
          } catch {
            // no-op
          }
        } else if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          afterJson = this.safeSerialize(responseData);
        }

        this.prisma.adminLog
          .create({
            data: {
              action: `${method} ${routePath}`,
              adminUserId: user?.userId ?? 'unknown',
              targetType,
              targetId,
              details: request.body ?? undefined,
              beforeJson: beforeJson ?? undefined,
              afterJson: afterJson ?? undefined,
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

  private async captureBeforeState(
    targetType: string | undefined,
    targetId: string | undefined,
  ): Promise<Prisma.InputJsonValue | undefined> {
    if (!targetType || !targetId) return undefined;

    const modelName = ENTITY_MAP[targetType];
    if (!modelName) return undefined;

    const delegate = (this.prisma as any)[modelName];
    if (!delegate?.findUnique) return undefined;

    try {
      const record = await delegate.findUnique({ where: { id: targetId } });
      return record ? this.safeSerialize(record) : undefined;
    } catch {
      return undefined;
    }
  }

  private async captureAfterState(
    targetType: string,
    targetId: string,
  ): Promise<Prisma.InputJsonValue | undefined> {
    return this.captureBeforeState(targetType, targetId);
  }

  private safeSerialize(obj: unknown): Prisma.InputJsonValue | undefined {
    try {
      const json = JSON.parse(JSON.stringify(obj));
      return json;
    } catch {
      return undefined;
    }
  }
}
