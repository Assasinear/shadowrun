import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminBlogPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    personaId?: string;
    hostId?: string;
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
    if (filters.personaId) where.personaId = filters.personaId;
    if (filters.hostId) where.hostId = filters.hostId;

    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          persona: { select: { id: true, name: true } },
          host: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(dto: { text: string; personaId?: string; hostId?: string }) {
    return this.prisma.blogPost.create({
      data: {
        text: dto.text,
        personaId: dto.personaId,
        hostId: dto.hostId,
      },
    });
  }

  async remove(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException('BlogPost not found');
    }

    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true };
  }

  async massDelete(ids: string[]) {
    return this.prisma.blogPost.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
