import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenArchiveDto } from './dto/hosts.dto';
import { QrService } from '../persona/qr.service';
import { Role } from '@prisma/client';

@Injectable()
export class HostsService {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
  ) {}

  async getPublicHost(hostId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId, isPublic: true },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        spider: { select: { id: true, name: true, avatar: true } },
        blogPosts: { orderBy: { createdAt: 'desc' }, take: 20 },
        files: { where: { isPublic: true } },
      },
    });

    if (!host) {
      throw new NotFoundException('Public host not found');
    }

    return host;
  }

  async getHost(hostId: string, personaId: string, role: Role) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      include: {
        owner: true,
        spider: true,
        wallet: true,
        blogPosts: true,
        files: true,
      },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    // Доступ: владелец, паук, или decker (если есть активная сессия взлома)
    const isOwner = host.ownerPersonaId === personaId;
    const isSpider = host.spiderPersonaId === personaId;
    const isDecker = role === 'DECKER';

    if (!isOwner && !isSpider && !isDecker) {
      // Проверка активной сессии взлома для декера
      if (isDecker) {
        const activeSession = await this.prisma.hackSession.findFirst({
          where: {
            targetType: 'HOST',
            targetHostId: hostId,
            attackerPersonaId: personaId,
            status: 'ACTIVE',
          },
        });

        if (!activeSession) {
          throw new ForbiddenException('Access denied');
        }
      } else {
        throw new ForbiddenException('Access denied');
      }
    }

    return host;
  }

  async toggleFilePublic(hostId: string, fileId: string, personaId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    if (host.ownerPersonaId !== personaId && host.spiderPersonaId !== personaId) {
      throw new ForbiddenException('Access denied');
    }

    const file = await this.prisma.file.findUnique({
      where: { id: fileId, hostId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: { isPublic: !file.isPublic },
    });
  }

  async openArchive(hostId: string, personaId: string, dto: OpenArchiveDto) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    // Упрощённая логика: создаём AccessToken
    const token = `AT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const accessToken = await this.prisma.accessToken.create({
      data: {
        token,
        personaId: dto.personaId || personaId,
        hostId,
        purpose: dto.purpose,
        expiresAt,
      },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'archive_opened',
        actorPersonaId: personaId,
        targetHostId: hostId,
        metaJson: { accessTokenId: accessToken.id, purpose: dto.purpose },
      },
    });

    return accessToken;
  }

  async getHostQr(hostId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      include: { wallet: true },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    // Создаём PaymentRequest и QR токен
    const paymentRequest = await this.prisma.paymentRequest.create({
      data: {
        token: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        creatorType: 'HOST',
        creatorHostId: hostId,
        targetType: 'PERSONA',
        // targetPersonaId будет заполнено при сканировании
        amount: 0, // опциональный донат
        purpose: 'Донат',
        status: 'PENDING',
      },
    });

    const qrToken = await this.qrService.createQrToken('PAYMENT', {
      paymentRequestId: paymentRequest.id,
      hostId,
      amount: paymentRequest.amount,
      purpose: paymentRequest.purpose,
    });

    await this.prisma.qrToken.update({
      where: { token: qrToken.token },
      data: { paymentRequestId: paymentRequest.id },
    });

    return {
      token: qrToken.token,
      qrDataUrl: qrToken.qrDataUrl, // base64 PNG изображение
      paymentRequest: {
        id: paymentRequest.id,
        amount: paymentRequest.amount,
        purpose: paymentRequest.purpose,
      },
    };
  }
}
