import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import {
  AddTargetDto,
  StartHackDto,
  CompleteHackDto,
  StealSinDto,
  TransferFundsDto,
  BrickDeviceOpDto,
  DownloadFileDto,
} from './dto/decking.dto';
import { HackTargetType } from '@prisma/client';

@Injectable()
export class DeckingService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WebSocketGateway,
  ) {}

  async getKnownTargets(personaId: string) {
    return this.prisma.deckingKnownTarget.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTarget(personaId: string, dto: AddTargetDto) {
    const existing = await this.prisma.deckingKnownTarget.findUnique({
      where: {
        personaId_targetType_targetId: {
          personaId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.deckingKnownTarget.create({
      data: {
        personaId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
  }

  async getRandomTarget(personaId: string) {
    const known = await this.prisma.deckingKnownTarget.findMany({
      where: { personaId },
      select: { targetId: true, targetType: true },
    });

    const knownIds = new Set(known.map((k) => `${k.targetType}:${k.targetId}`));

    // Получаем случайную персону или хост
    const personas = await this.prisma.persona.findMany({
      select: { id: true },
    });

    const hosts = await this.prisma.host.findMany({
      select: { id: true },
    });

    const allTargets = [
      ...personas.map((p) => ({ type: 'PERSONA' as HackTargetType, id: p.id })),
      ...hosts.map((h) => ({ type: 'HOST' as HackTargetType, id: h.id })),
    ].filter((t) => !knownIds.has(`${t.type}:${t.id}`));

    if (allTargets.length === 0) {
      throw new NotFoundException('No unknown targets found');
    }

    const random = allTargets[Math.floor(Math.random() * allTargets.length)];
    return random;
  }

  async startHack(personaId: string, dto: StartHackDto) {
    // Проверка существования цели
    if (dto.targetType === 'PERSONA') {
      const target = await this.prisma.persona.findUnique({
        where: { id: dto.targetId },
        include: { lls: true },
      });
      if (!target || !target.lls) {
        throw new NotFoundException('Target persona not found');
      }
    } else {
      const target = await this.prisma.host.findUnique({
        where: { id: dto.targetId },
      });
      if (!target) {
        throw new NotFoundException('Target host not found');
      }
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    const session = await this.prisma.hackSession.create({
      data: {
        attackerPersonaId: personaId,
        targetType: dto.targetType,
        targetPersonaId: dto.targetType === 'PERSONA' ? dto.targetId : null,
        targetHostId: dto.targetType === 'HOST' ? dto.targetId : null,
        elementType: dto.elementType,
        elementId: dto.elementId,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    // Уведомление жертве (non-blocking)
    try {
      if (dto.targetType === 'PERSONA') {
        this.wsGateway.sendNotification(dto.targetId, {
          type: 'hack_started',
          payload: { hackSessionId: session.id, attackerPersonaId: personaId },
        });
      }

      // Уведомление пауку если это хост
      if (dto.targetType === 'HOST') {
        const host = await this.prisma.host.findUnique({
          where: { id: dto.targetId },
        });
        if (host?.spiderPersonaId) {
          this.wsGateway.sendSpiderAlert(host.spiderPersonaId, host.id, session.id);
        }
      }
    } catch (e) {
      console.warn('WebSocket notification failed:', e);
    }

    await this.prisma.gridLog.create({
      data: {
        type: 'hack_started',
        actorPersonaId: personaId,
        targetPersonaId: dto.targetType === 'PERSONA' ? dto.targetId : null,
        targetHostId: dto.targetType === 'HOST' ? dto.targetId : null,
        metaJson: { hackSessionId: session.id, elementType: dto.elementType },
      },
    });

    return session;
  }

  async completeHack(personaId: string, sessionId: string, dto: CompleteHackDto) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Hack session not active');
    }

    const updated = await this.prisma.hackSession.update({
      where: { id: sessionId },
      data: {
        status: dto.success ? 'SUCCESS' : 'FAILED',
      },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'hack_completed',
        actorPersonaId: personaId,
        targetPersonaId: session.targetPersonaId,
        targetHostId: session.targetHostId,
        metaJson: { hackSessionId: sessionId, success: dto.success },
      },
    });

    return updated;
  }

  async cancelHack(personaId: string, sessionId: string) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('Hack session not active');
    }

    return this.prisma.hackSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });
  }

  async stealSin(personaId: string, dto: StealSinDto) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: dto.sessionId },
      include: { targetPersona: { include: { lls: true } } },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'SUCCESS' || session.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed or not successful');
    }

    if (!session.targetPersona || !session.targetPersona.lls) {
      throw new NotFoundException('Target persona or LLS not found');
    }

    const sinData = {
      sin: session.targetPersona.lls.sin,
      personaId: session.targetPersona.id,
      name: session.targetPersona.name,
      stolenAt: new Date().toISOString(),
    };

    const file = await this.prisma.file.create({
      data: {
        name: `SIN_${session.targetPersona.lls.sin}.json`,
        type: 'application/json',
        content: JSON.stringify(sinData),
        personaId,
        isPublic: false,
      },
    });

    await this.prisma.hackSession.update({
      where: { id: dto.sessionId },
      data: { consumedOperationAt: new Date() },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'sin_stolen',
        actorPersonaId: personaId,
        targetPersonaId: session.targetPersona.id,
        metaJson: { hackSessionId: dto.sessionId, fileId: file.id },
      },
    });

    return file;
  }

  async transferFunds(personaId: string, dto: TransferFundsDto) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: dto.sessionId },
      include: { targetPersona: { include: { wallet: true } } },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'SUCCESS' || session.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed or not successful');
    }

    if (!session.targetPersona || !session.targetPersona.wallet) {
      throw new NotFoundException('Target persona or wallet not found');
    }

    const attackerWallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!attackerWallet) {
      throw new NotFoundException('Attacker wallet not found');
    }

    const stealAmount = Math.floor(Number(session.targetPersona.wallet.balance) * 0.1);

    if (stealAmount <= 0) {
      throw new BadRequestException('Target wallet has insufficient balance');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: session.targetPersona.wallet.id },
        data: { balance: { decrement: stealAmount } },
      });

      await tx.wallet.update({
        where: { id: attackerWallet.id },
        data: { balance: { increment: stealAmount } },
      });

      await tx.transaction.create({
        data: {
          walletId: attackerWallet.id,
          type: 'TRANSFER',
          amount: stealAmount,
          isTheft: true,
          metaJson: {
            fromPersonaId: session.targetPersona.id,
            hackSessionId: dto.sessionId,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: session.targetPersona.wallet.id,
          type: 'TRANSFER',
          amount: -stealAmount,
          isTheft: true,
          metaJson: {
            toPersonaId: personaId,
            hackSessionId: dto.sessionId,
          },
        },
      });
    });

    await this.prisma.hackSession.update({
      where: { id: dto.sessionId },
      data: { consumedOperationAt: new Date() },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'funds_stolen',
        actorPersonaId: personaId,
        targetPersonaId: session.targetPersona.id,
        metaJson: { hackSessionId: dto.sessionId, amount: stealAmount },
      },
    });

    this.wsGateway.notifyBalanceUpdate(personaId, Number(attackerWallet.balance) + stealAmount);
    this.wsGateway.notifyBalanceUpdate(
      session.targetPersona.id,
      Number(session.targetPersona.wallet.balance) - stealAmount,
    );

    return { success: true, amount: stealAmount };
  }

  async brickDeviceOp(personaId: string, dto: BrickDeviceOpDto) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: dto.sessionId },
      include: { targetPersona: { include: { devices: true } } },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'SUCCESS' || session.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed or not successful');
    }

    if (!session.targetPersona) {
      throw new NotFoundException('Target persona not found');
    }

    const device = session.targetPersona.devices.find((d) => d.id === dto.deviceId);
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const brickUntil = new Date();
    brickUntil.setMinutes(brickUntil.getMinutes() + 5);

    await this.prisma.device.update({
      where: { id: dto.deviceId },
      data: {
        status: 'BRICKED',
        brickUntil,
      },
    });

    await this.prisma.hackSession.update({
      where: { id: dto.sessionId },
      data: { consumedOperationAt: new Date() },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'device_bricked_via_hack',
        actorPersonaId: personaId,
        targetPersonaId: session.targetPersona.id,
        metaJson: { hackSessionId: dto.sessionId, deviceId: dto.deviceId },
      },
    });

    return { success: true, brickUntil };
  }

  async downloadFile(personaId: string, dto: DownloadFileDto) {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        targetPersona: { include: { files: true } },
        targetHost: { include: { files: true } },
      },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'SUCCESS' || session.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed or not successful');
    }

    let sourceFile;
    if (session.targetType === 'PERSONA' && session.targetPersona) {
      sourceFile = session.targetPersona.files.find((f) => f.id === dto.fileId);
    } else if (session.targetType === 'HOST' && session.targetHost) {
      sourceFile = session.targetHost.files.find((f) => f.id === dto.fileId);
    }

    if (!sourceFile) {
      throw new NotFoundException('File not found');
    }

    const newFile = await this.prisma.file.create({
      data: {
        name: sourceFile.name,
        type: sourceFile.type,
        size: sourceFile.size,
        content: sourceFile.content,
        personaId,
        isPublic: false,
      },
    });

    await this.prisma.hackSession.update({
      where: { id: dto.sessionId },
      data: { consumedOperationAt: new Date() },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'file_downloaded_via_hack',
        actorPersonaId: personaId,
        targetPersonaId: session.targetPersonaId,
        targetHostId: session.targetHostId,
        metaJson: { hackSessionId: dto.sessionId, fileId: dto.fileId, newFileId: newFile.id },
      },
    });

    return newFile;
  }
}
