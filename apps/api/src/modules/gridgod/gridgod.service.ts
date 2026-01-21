import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetLogsDto, IssueLicensesDto } from './dto/gridgod.dto';

@Injectable()
export class GridgodService {
  constructor(private prisma: PrismaService) {}

  async getLogs(dto: GetLogsDto) {
    const where: any = {};

    if (dto.type) {
      where.type = dto.type;
    }

    if (dto.personaId) {
      where.OR = [
        { actorPersonaId: dto.personaId },
        { targetPersonaId: dto.personaId },
      ];
    }

    if (dto.hostId) {
      where.targetHostId = dto.hostId;
    }

    if (dto.since) {
      where.createdAt = { gte: new Date(dto.since) };
    }

    return this.prisma.gridLog.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true } },
        targetPersona: { select: { id: true, name: true } },
        targetHost: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async cancelSubscription(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.delete({
      where: { id: subscriptionId },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'subscription_cancelled_by_gridgod',
        metaJson: { subscriptionId },
      },
    });

    return { success: true };
  }

  async issueLicenses(personaId: string, dto: IssueLicensesDto) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    const licenses = await Promise.all(
      dto.licenses.map((license) =>
        this.prisma.license.create({
          data: {
            personaId,
            type: license.type,
            name: license.name,
            description: license.description,
          },
        }),
      ),
    );

    await this.prisma.gridLog.create({
      data: {
        type: 'licenses_issued',
        targetPersonaId: personaId,
        metaJson: { licenses: dto.licenses } as any,
      },
    });

    return licenses;
  }
}
