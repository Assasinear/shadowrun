import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    senderPersonaId?: string;
    receiverPersonaId?: string;
    senderType?: string;
    receiverType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      where.text = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.senderPersonaId) where.senderPersonaId = filters.senderPersonaId;
    if (filters.receiverPersonaId) where.receiverPersonaId = filters.receiverPersonaId;
    if (filters.senderType) where.senderType = filters.senderType;
    if (filters.receiverType) where.receiverType = filters.receiverType;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          senderPersona: { select: { id: true, name: true } },
          senderHost: { select: { id: true, name: true } },
          receiverPersona: { select: { id: true, name: true } },
          receiverHost: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getThreads(filters: {
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.messageThread.findMany({
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              senderPersona: { select: { id: true, name: true } },
              senderHost: { select: { id: true, name: true } },
              receiverPersona: { select: { id: true, name: true } },
              receiverHost: { select: { id: true, name: true } },
            },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.messageThread.count(),
    ]);

    return { items, total, page, limit };
  }

  async getThreadMessages(threadId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { threadId },
        include: {
          senderPersona: { select: { id: true, name: true } },
          senderHost: { select: { id: true, name: true } },
          receiverPersona: { select: { id: true, name: true } },
          receiverHost: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { threadId } }),
    ]);

    return { items, total, page, limit };
  }
}
