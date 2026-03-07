import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    personaId?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.personaId) where.personaId = filters.personaId;
    if (filters.type) where.type = filters.type;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          persona: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async broadcast(dto: {
    type: string;
    payload?: any;
    personaIds?: string[];
  }) {
    let targetIds = dto.personaIds;

    if (!targetIds || targetIds.length === 0) {
      const allPersonas = await this.prisma.persona.findMany({
        select: { id: true },
      });
      targetIds = allPersonas.map((p) => p.id);
    }

    const data = targetIds.map((personaId) => ({
      personaId,
      type: dto.type,
      payload: dto.payload ?? undefined,
    }));

    const result = await this.prisma.notification.createMany({ data });
    return { created: result.count };
  }

  async markAllRead(personaId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { personaId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
