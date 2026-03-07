import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminPaymentRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    status?: string;
    creatorPersonaId?: string;
    targetPersonaId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.creatorPersonaId) where.creatorPersonaId = filters.creatorPersonaId;
    if (filters.targetPersonaId) where.targetPersonaId = filters.targetPersonaId;

    const [items, total] = await Promise.all([
      this.prisma.paymentRequest.findMany({
        where,
        include: {
          creatorPersona: { select: { id: true, name: true } },
          creatorHost: { select: { id: true, name: true } },
          targetPersona: { select: { id: true, name: true } },
          targetHost: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.paymentRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
