import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminHackSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    status?: string;
    attackerPersonaId?: string;
    targetType?: string;
    targetPersonaId?: string;
    targetHostId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.attackerPersonaId) where.attackerPersonaId = filters.attackerPersonaId;
    if (filters.targetType) where.targetType = filters.targetType;
    if (filters.targetPersonaId) where.targetPersonaId = filters.targetPersonaId;
    if (filters.targetHostId) where.targetHostId = filters.targetHostId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.hackSession.findMany({
        where,
        include: {
          attacker: { select: { id: true, name: true } },
          targetPersona: { select: { id: true, name: true } },
          targetHost: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.hackSession.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async cancel(id: string) {
    const session = await this.prisma.hackSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException('Hack session not found');
    }

    return this.prisma.hackSession.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async massCancelActive() {
    const result = await this.prisma.hackSession.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    return { cancelled: result.count };
  }
}
