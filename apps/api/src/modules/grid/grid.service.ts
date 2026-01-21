import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class GridService {
  constructor(private prisma: PrismaService) {}

  async getPublicHosts() {
    return this.prisma.host.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        spider: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicPersonas() {
    return this.prisma.persona.findMany({
      where: {
        lls: { isPublic: true },
      },
      include: {
        lls: { select: { sin: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
