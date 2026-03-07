import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGridLogs(filters: {
    type?: string;
    personaId?: string;
    hostId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.personaId) {
      where.OR = [
        { actorPersonaId: filters.personaId },
        { targetPersonaId: filters.personaId },
      ];
    }
    if (filters.hostId) where.targetHostId = filters.hostId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.gridLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true } },
          targetPersona: { select: { id: true, name: true } },
          targetHost: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.gridLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getAdminLogs(filters: {
    action?: string;
    adminUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.adminUserId) where.adminUserId = filters.adminUserId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getGridLogsCsv(filters: {
    type?: string;
    personaId?: string;
    hostId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.personaId) {
      where.OR = [
        { actorPersonaId: filters.personaId },
        { targetPersonaId: filters.personaId },
      ];
    }
    if (filters.hostId) where.targetHostId = filters.hostId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const logs = await this.prisma.gridLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true } },
        targetPersona: { select: { id: true, name: true } },
        targetHost: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'id,type,actorPersonaId,actorName,targetPersonaId,targetPersonaName,targetHostId,targetHostName,createdAt';
    const rows = logs.map((log) =>
      [
        log.id,
        log.type,
        log.actorPersonaId ?? '',
        `"${log.actor?.name ?? ''}"`,
        log.targetPersonaId ?? '',
        `"${log.targetPersona?.name ?? ''}"`,
        log.targetHostId ?? '',
        `"${log.targetHost?.name ?? ''}"`,
        log.createdAt.toISOString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async getAdminLogsCsv(filters: {
    action?: string;
    adminUserId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.adminUserId) where.adminUserId = filters.adminUserId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const logs = await this.prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const header = 'id,action,adminUserId,targetType,targetId,createdAt';
    const rows = logs.map((log) =>
      [
        log.id,
        `"${log.action}"`,
        log.adminUserId,
        log.targetType ?? '',
        log.targetId ?? '',
        log.createdAt.toISOString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
