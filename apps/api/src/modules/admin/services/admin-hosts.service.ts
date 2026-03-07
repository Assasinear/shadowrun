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

  async findAll(filters: {
    search?: string;
    isPublic?: boolean;
    ownerPersonaId?: string;
    spiderPersonaId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }
    if (filters.ownerPersonaId) {
      where.ownerPersonaId = filters.ownerPersonaId;
    }
    if (filters.spiderPersonaId) {
      where.spiderPersonaId = filters.spiderPersonaId;
    }

    const [items, total] = await Promise.all([
      this.prisma.host.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
          spider: { select: { id: true, name: true } },
          wallet: true,
          _count: { select: { files: true, accessTokens: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.host.count({ where }),
    ]);

    return { items, total, page, limit };
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

  async clone(hostId: string) {
    const source = await this.prisma.host.findUnique({
      where: { id: hostId },
      include: { files: true },
    });
    if (!source) {
      throw new NotFoundException('Host not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const newHost = await tx.host.create({
        data: {
          name: `${source.name} (копия)`,
          description: source.description,
          isPublic: source.isPublic,
          ownerPersonaId: source.ownerPersonaId,
          spiderPersonaId: source.spiderPersonaId,
          iceLevel: source.iceLevel,
        },
      });

      await tx.wallet.create({
        data: { hostId: newHost.id, balance: 0 },
      });

      if (source.files.length > 0) {
        await tx.file.createMany({
          data: source.files.map((f) => ({
            hostId: newHost.id,
            name: f.name,
            type: f.type,
            content: f.content,
            isPublic: f.isPublic,
            iceLevel: f.iceLevel,
          })),
        });
      }

      return newHost;
    });
  }

  async massDelete(ids: string[]) {
    return this.prisma.host.deleteMany({
      where: { id: { in: ids } },
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
