import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SystemSettingsService } from '../../common/services/system-settings.service';
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
import { HackSession, HackTargetType, Prisma } from '@prisma/client';

const hackFileListSelect = {
  id: true,
  name: true,
  type: true,
  size: true,
  isPublic: true,
  iceLevel: true,
  createdAt: true,
} satisfies Prisma.FileSelect;

const hackDeviceListSelect = {
  id: true,
  type: true,
  name: true,
  code: true,
  status: true,
  brickUntil: true,
} satisfies Prisma.DeviceSelect;

@Injectable()
export class DeckingService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WebSocketGateway,
    private settings: SystemSettingsService,
  ) {}

  async getKnownTargets(personaId: string) {
    const targets = await this.prisma.deckingKnownTarget.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });

    if (targets.length === 0) {
      return [];
    }

    const personaIds = targets
      .filter((t) => t.targetType === 'PERSONA')
      .map((t) => t.targetId);
    const hostIds = targets.filter((t) => t.targetType === 'HOST').map((t) => t.targetId);

    type KnownPersona = { id: string; name: string; lls: { iceLevel: number } | null };
    type KnownHost = { id: string; name: string; iceLevel: number };

    const [personas, hosts] = await Promise.all([
      personaIds.length > 0
        ? this.prisma.persona.findMany({
            where: { id: { in: personaIds } },
            select: { id: true, name: true, lls: { select: { iceLevel: true } } },
          })
        : Promise.resolve([] as KnownPersona[]),
      hostIds.length > 0
        ? this.prisma.host.findMany({
            where: { id: { in: hostIds } },
            select: { id: true, name: true, iceLevel: true },
          })
        : Promise.resolve([] as KnownHost[]),
    ]);

    const personaById = new Map<string, KnownPersona>(
      personas.map((p) => [p.id, p] as [string, KnownPersona]),
    );
    const hostById = new Map<string, KnownHost>(
      hosts.map((h) => [h.id, h] as [string, KnownHost]),
    );

    return targets.map((t) => {
      if (t.targetType === 'PERSONA') {
        const persona = personaById.get(t.targetId);
        return {
          ...t,
          name: persona?.name ?? null,
          iceLevel: persona?.lls?.iceLevel ?? 0,
        };
      }
      const host = hostById.get(t.targetId);
      return {
        ...t,
        name: host?.name ?? null,
        iceLevel: host?.iceLevel ?? 0,
      };
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
    if (!(await this.settings.getBoolean('decking_enabled', true))) {
      throw new ForbiddenException('Decking is currently disabled');
    }

    let targetHost: { id: string; name: string; spiderPersonaId: string | null } | null = null;

    if (dto.targetType === 'PERSONA') {
      const target = await this.prisma.persona.findUnique({
        where: { id: dto.targetId },
        include: { lls: true },
      });
      if (!target || !target.lls) {
        throw new NotFoundException('Target persona not found');
      }
    } else {
      targetHost = await this.prisma.host.findUnique({
        where: { id: dto.targetId },
        select: { id: true, name: true, spiderPersonaId: true },
      });
      if (!targetHost) {
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
        elementType: 'HACK',
        status: 'ACTIVE',
        expiresAt,
      },
    });

    try {
      if (dto.targetType === 'PERSONA') {
        await this.wsGateway.sendNotification(dto.targetId, {
          type: 'hack_started',
          payload: { hackSessionId: session.id, attackerPersonaId: personaId },
        });
      }

      if (dto.targetType === 'HOST' && targetHost?.spiderPersonaId) {
        const attacker = await this.prisma.persona.findUnique({
          where: { id: personaId },
          select: { name: true },
        });

        this.wsGateway.sendSpiderAlert(
          targetHost.spiderPersonaId,
          targetHost.id,
          session.id,
        );

        await this.wsGateway.sendNotification(targetHost.spiderPersonaId, {
          type: 'spider_hack_alert',
          payload: {
            hackSessionId: session.id,
            hostId: targetHost.id,
            hostName: targetHost.name,
            attackerPersonaId: personaId,
            attackerName: attacker?.name ?? null,
          },
        });
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
        metaJson: { hackSessionId: session.id },
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

    if (session.targetPersonaId) {
      try {
        await this.wsGateway.sendNotification(session.targetPersonaId, {
          type: 'hack_session_finished',
          payload: {
            hackSessionId: sessionId,
            success: dto.success,
            attackerPersonaId: personaId,
          },
        });
      } catch (e) {
        console.warn('hack_session_finished notification failed:', e);
      }
    }

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

    const updated = await this.prisma.hackSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });

    if (session.targetPersonaId) {
      try {
        await this.wsGateway.sendNotification(session.targetPersonaId, {
          type: 'hack_session_cancelled',
          payload: { hackSessionId: sessionId, attackerPersonaId: personaId },
        });
      } catch (e) {
        console.warn('hack_session_cancelled notification failed:', e);
      }
    }

    return updated;
  }

  async getHackSessionFiles(personaId: string, sessionId: string) {
    const session = await this.loadSessionForLoot(personaId, sessionId);

    let files;
    if (session.targetType === 'PERSONA' && session.targetPersonaId) {
      files = await this.prisma.file.findMany({
        where: { personaId: session.targetPersonaId },
        select: hackFileListSelect,
        orderBy: { createdAt: 'desc' },
      });
    } else if (session.targetType === 'HOST' && session.targetHostId) {
      files = await this.prisma.file.findMany({
        where: { hostId: session.targetHostId },
        select: hackFileListSelect,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      files = [];
    }

    return {
      sessionId: session.id,
      targetType: session.targetType,
      targetPersonaId: session.targetPersonaId,
      targetHostId: session.targetHostId,
      files,
      operationConsumed: !!session.consumedOperationAt,
    };
  }

  async getHackSessionDevices(personaId: string, sessionId: string) {
    const session = await this.loadSessionForLoot(personaId, sessionId);

    let ownerPersonaId: string | null = null;
    if (session.targetType === 'PERSONA') {
      ownerPersonaId = session.targetPersonaId;
    } else if (session.targetType === 'HOST' && session.targetHostId) {
      const host = await this.prisma.host.findUnique({
        where: { id: session.targetHostId },
        select: { ownerPersonaId: true },
      });
      ownerPersonaId = host?.ownerPersonaId ?? null;
    }

    const devices = ownerPersonaId
      ? await this.prisma.device.findMany({
          where: { ownerPersonaId },
          select: hackDeviceListSelect,
          orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
        })
      : [];

    return {
      sessionId: session.id,
      targetType: session.targetType,
      targetPersonaId: session.targetPersonaId,
      targetHostId: session.targetHostId,
      devices,
      operationConsumed: !!session.consumedOperationAt,
    };
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

    try {
      await this.wsGateway.sendNotification(session.targetPersona.id, {
        type: 'sin_stolen_alert',
        payload: { hackSessionId: dto.sessionId, attackerPersonaId: personaId, fileId: file.id },
      });
    } catch (e) {
      console.warn('sin_stolen_alert notification failed:', e);
    }

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

    const stealPercent = await this.settings.getNumber('steal_percentage', 10);
    const stealAmount = Math.floor(Number(session.targetPersona.wallet.balance) * (stealPercent / 100));

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

    try {
      await this.wsGateway.sendNotification(session.targetPersona.id, {
        type: 'funds_stolen_via_hack',
        payload: { hackSessionId: dto.sessionId, attackerPersonaId: personaId, amount: stealAmount },
      });
    } catch (e) {
      console.warn('funds_stolen_via_hack notification failed:', e);
    }

    this.wsGateway.notifyBalanceUpdate(personaId, Number(attackerWallet.balance) + stealAmount);
    this.wsGateway.notifyBalanceUpdate(
      session.targetPersona.id,
      Number(session.targetPersona.wallet.balance) - stealAmount,
    );

    return { success: true, amount: stealAmount };
  }

  async brickDeviceOp(personaId: string, dto: BrickDeviceOpDto) {
    const session = await this.loadSessionForLoot(personaId, dto.sessionId);

    let ownerPersonaId: string | null = null;
    if (session.targetType === 'PERSONA') {
      ownerPersonaId = session.targetPersonaId;
    } else if (session.targetType === 'HOST' && session.targetHostId) {
      const host = await this.prisma.host.findUnique({
        where: { id: session.targetHostId },
        select: { ownerPersonaId: true },
      });
      ownerPersonaId = host?.ownerPersonaId ?? null;
    }

    if (!ownerPersonaId) {
      throw new NotFoundException('Target persona not found');
    }

    const device = await this.prisma.device.findFirst({
      where: { id: dto.deviceId, ownerPersonaId },
    });
    if (!device) {
      throw new NotFoundException('Device not found on hack target');
    }

    const brickDuration = await this.settings.getNumber('brick_duration_seconds', 300);
    const brickUntil = new Date();
    brickUntil.setSeconds(brickUntil.getSeconds() + brickDuration);

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
        targetPersonaId: ownerPersonaId,
        targetHostId: session.targetHostId,
        metaJson: { hackSessionId: dto.sessionId, deviceId: dto.deviceId },
      },
    });

    try {
      await this.wsGateway.sendNotification(ownerPersonaId, {
        type: 'device_bricked_via_hack',
        payload: { hackSessionId: dto.sessionId, deviceId: dto.deviceId, attackerPersonaId: personaId, brickUntil },
      });
    } catch (e) {
      console.warn('device_bricked_via_hack notification failed:', e);
    }

    return { success: true, brickUntil };
  }

  async downloadFile(personaId: string, dto: DownloadFileDto) {
    const session = await this.loadSessionForLoot(personaId, dto.sessionId);

    const sourceFile = await this.findTargetFileForSession(session, dto.fileId);
    if (!sourceFile) {
      throw new NotFoundException('File not found on hack target');
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

    if (session.targetPersonaId) {
      try {
        await this.wsGateway.sendNotification(session.targetPersonaId, {
          type: 'file_copied_via_hack',
          payload: {
            hackSessionId: dto.sessionId,
            fileId: dto.fileId,
            attackerPersonaId: personaId,
          },
        });
      } catch (e) {
        console.warn('file_copied_via_hack notification failed:', e);
      }
    }

    return newFile;
  }

  private async loadSessionForLoot(personaId: string, sessionId: string): Promise<HackSession> {
    const session = await this.prisma.hackSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (session.status !== 'SUCCESS') {
      throw new BadRequestException('Hack session must be successful to access target files');
    }

    if (session.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed');
    }

    return session;
  }

  private async findTargetFileForSession(session: HackSession, fileId: string) {
    if (session.targetType === 'PERSONA' && session.targetPersonaId) {
      return this.prisma.file.findFirst({
        where: { id: fileId, personaId: session.targetPersonaId },
      });
    }
    if (session.targetType === 'HOST' && session.targetHostId) {
      return this.prisma.file.findFirst({
        where: { id: fileId, hostId: session.targetHostId },
      });
    }
    return null;
  }
}
