import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminLicensesService {
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
      this.prisma.license.findMany({
        where,
        include: {
          persona: { select: { id: true, name: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.license.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async remove(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) {
      throw new NotFoundException('License not found');
    }

    await this.prisma.license.delete({ where: { id } });
    return { success: true };
  }
}
