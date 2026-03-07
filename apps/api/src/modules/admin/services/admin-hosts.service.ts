import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateHostDto,
  UpdateHostDto,
  CreateHostFileDto,
  CreateAccessTokenDto,
} from '../dto/admin-hosts.dto';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class AdminHostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.host.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        spider: { select: { id: true, name: true } },
        wallet: true,
        _count: { select: { files: true, accessTokens: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(hostId: string) {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      include: {
        owner: { select: { id: true, name: true } },
        spider: { select: { id: true, name: true } },
        wallet: { include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } } },
        files: true,
        accessTokens: { include: { persona: { select: { id: true, name: true } } } },
        blogPosts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    return host;
  }

  async create(dto: CreateHostDto) {
    return this.prisma.$transaction(async (tx) => {
      const host = await tx.host.create({
        data: {
          name: dto.name,
          description: dto.description,
          isPublic: dto.isPublic ?? false,
          ownerPersonaId: dto.ownerPersonaId,
          spiderPersonaId: dto.spiderPersonaId,
          iceLevel: dto.iceLevel ?? 0,
        },
      });

      await tx.wallet.create({
        data: { hostId: host.id, balance: 0 },
      });

      return host;
    });
  }

  async update(hostId: string, dto: UpdateHostDto) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    return this.prisma.host.update({
      where: { id: hostId },
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic,
        ownerPersonaId: dto.ownerPersonaId,
        spiderPersonaId: dto.spiderPersonaId,
        iceLevel: dto.iceLevel,
      },
    });
  }

  async remove(hostId: string) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    await this.prisma.host.delete({ where: { id: hostId } });
    return { success: true };
  }

  async addFile(hostId: string, dto: CreateHostFileDto) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    return this.prisma.file.create({
      data: {
        hostId,
        name: dto.name,
        type: dto.type,
        content: dto.content,
        isPublic: dto.isPublic ?? false,
        iceLevel: dto.iceLevel ?? 0,
        redeemCode: dto.redeemCode,
      },
    });
  }

  async createAccessToken(hostId: string, dto: CreateAccessTokenDto) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    const persona = await this.prisma.persona.findUnique({ where: { id: dto.personaId } });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    const token = crypto.randomBytes(32).toString('hex');

    return this.prisma.accessToken.create({
      data: {
        token,
        personaId: dto.personaId,
        hostId,
        purpose: dto.purpose,
      },
    });
  }

  async generateHostQr(hostId: string) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException('Host not found');
    }

    const content = JSON.stringify({ type: 'HOST', hostId: host.id, name: host.name });
    const qrDataUrl = await QRCode.toDataURL(content, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return { hostId: host.id, name: host.name, qrDataUrl };
  }
}
