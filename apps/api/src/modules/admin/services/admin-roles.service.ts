import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AdminRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpecialRoles() {
    const users = await this.prisma.user.findMany({
      where: { role: { not: 'USER' } },
      include: {
        persona: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { role: 'asc' },
    });

    const result: Record<string, { id: string; name: string; username: string; userId: string }[]> = {
      DECKER: [],
      SPIDER: [],
      GRIDGOD: [],
    };

    for (const user of users) {
      const role = user.role;
      if (result[role]) {
        result[role].push({
          id: user.persona?.id ?? user.id,
          name: user.persona?.name ?? user.username,
          username: user.username,
          userId: user.id,
        });
      }
    }

    return result;
  }

  async changeRole(personaId: string, role: Role) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { user: true },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    if (role === 'GRIDGOD') {
      const existingGridgod = await this.prisma.user.findFirst({
        where: {
          role: 'GRIDGOD',
          isBlocked: false,
          id: { not: persona.userId },
        },
      });

      if (existingGridgod) {
        throw new BadRequestException(
          'Another active GRIDGOD already exists. Remove their role first.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { role },
      include: {
        persona: { select: { id: true, name: true } },
      },
    });
  }

  async removeRole(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { user: true },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.user.update({
      where: { id: persona.userId },
      data: { role: 'USER' },
      include: {
        persona: { select: { id: true, name: true } },
      },
    });
  }
}
