import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { WebSocketGateway } from '../../websocket/websocket.gateway';

const BROADCAST_CHUNK = 100;

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

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

    let created = 0;
    for (let i = 0; i < targetIds.length; i += BROADCAST_CHUNK) {
      const chunk = targetIds.slice(i, i + BROADCAST_CHUNK);
      const rows = await this.prisma.$transaction(
        chunk.map((personaId) =>
          this.prisma.notification.create({
            data: {
              personaId,
              type: dto.type,
              payload: dto.payload ?? undefined,
            },
          }),
        ),
      );
      created += rows.length;
      await this.wsGateway.emitNotificationRecords(rows);
    }

    return { created };
  }

  async markAllRead(personaId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { personaId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
