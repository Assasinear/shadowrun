import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IpRestrictionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const url: string = request.url || request.raw?.url || '';

    if (!url.startsWith('/admin')) {
      return true;
    }

    const envIps = process.env.ADMIN_ALLOWED_IPS;
    let allowedIps: string[] = [];

    if (envIps) {
      allowedIps = envIps.split(',').map((ip) => ip.trim()).filter(Boolean);
    } else {
      try {
        const setting = await this.prisma.systemSettings.findUnique({
          where: { key: 'admin_allowed_ips' },
        });
        if (setting?.value) {
          allowedIps = setting.value.split(',').map((ip) => ip.trim()).filter(Boolean);
        }
      } catch {
        return true;
      }
    }

    if (allowedIps.length === 0) {
      return true;
    }

    const clientIp =
      request.ip ||
      request.raw?.ip ||
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim();

    if (!clientIp || !allowedIps.includes(clientIp)) {
      throw new ForbiddenException('Access denied: IP not allowed');
    }

    return true;
  }
}
