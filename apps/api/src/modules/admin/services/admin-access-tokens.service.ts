import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminAccessTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    personaId?: string;
    hostId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.personaId) where.personaId = filters.personaId;
    if (filters.hostId) where.hostId = filters.hostId;

    const [items, total] = await Promise.all([
      this.prisma.accessToken.findMany({
        where,
        include: {
          persona: { select: { id: true, name: true } },
          host: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.accessToken.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async remove(id: string) {
    const token = await this.prisma.accessToken.findUnique({ where: { id } });
    if (!token) {
      throw new NotFoundException('AccessToken not found');
    }

    await this.prisma.accessToken.delete({ where: { id } });
    return { success: true };
  }
}
