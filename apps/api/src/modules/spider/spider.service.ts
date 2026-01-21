import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { StartCounterDto, CompleteCounterDto } from './dto/spider.dto';

@Injectable()
export class SpiderService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WebSocketGateway,
  ) {}

  async getHosts(personaId: string) {
    return this.prisma.host.findMany({
      where: { spiderPersonaId: personaId },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        wallet: true,
      },
    });
  }

  async startCounter(personaId: string, dto: StartCounterDto) {
    const host = await this.prisma.host.findUnique({
      where: { id: dto.hostId },
    });

    if (!host || host.spiderPersonaId !== personaId) {
      throw new ForbiddenException('Access denied');
    }

    const hackSession = await this.prisma.hackSession.findUnique({
      where: { id: dto.hackSessionId },
    });

    if (!hackSession || hackSession.targetType !== 'HOST' || hackSession.targetHostId !== dto.hostId) {
      throw new NotFoundException('Hack session not found');
    }

    // Создаём сессию контр-взлома (упрощённо, можно расширить)
    return { success: true, hackSessionId: dto.hackSessionId };
  }

  async completeCounter(personaId: string, counterSessionId: string, dto: CompleteCounterDto) {
    // Упрощённая логика: находим исходную сессию взлома
    const hackSession = await this.prisma.hackSession.findFirst({
      where: {
        id: counterSessionId,
        targetType: 'HOST',
      },
      include: {
        attacker: { include: { devices: true } },
        targetHost: true,
      },
    });

    if (!hackSession) {
      throw new NotFoundException('Hack session not found');
    }

    const host = hackSession.targetHost;
    if (!host || host.spiderPersonaId !== personaId) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.success) {
      // Находим устройство атакующего (COMMLINK или DECK) и блокируем
      const attackerDevice = hackSession.attacker.devices.find(
        (d) => d.type === 'COMMLINK' || d.type === 'DECK',
      );

      if (attackerDevice) {
        const brickUntil = new Date();
        brickUntil.setMinutes(brickUntil.getMinutes() + 5);

        await this.prisma.device.update({
          where: { id: attackerDevice.id },
          data: {
            status: 'BRICKED',
            brickUntil,
          },
        });

        await this.prisma.gridLog.create({
          data: {
            type: 'device_bricked_by_spider',
            actorPersonaId: personaId,
            targetPersonaId: hackSession.attackerPersonaId,
            targetHostId: host.id,
            metaJson: { hackSessionId: hackSession.id, deviceId: attackerDevice.id },
          },
        });
      }

      // Завершаем исходную сессию
      await this.prisma.hackSession.update({
        where: { id: hackSession.id },
        data: { status: 'FAILED' },
      });

      // Уведомление декеру
      this.wsGateway.sendNotification(hackSession.attackerPersonaId, {
        type: 'spider_alert',
        payload: {
          hostId: host.id,
          hackSessionId: hackSession.id,
          message: 'Паук в сети!',
        },
      });

      await this.prisma.gridLog.create({
        data: {
          type: 'counter_hack_success',
          actorPersonaId: personaId,
          targetPersonaId: hackSession.attackerPersonaId,
          targetHostId: host.id,
          metaJson: { hackSessionId: hackSession.id },
        },
      });
    }

    return { success: dto.success };
  }
}
