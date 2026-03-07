import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateFileDto, UpdateFileDto } from '../dto/admin-files.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminFilesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, personaId?: string, hostId?: string) {
    const where: Prisma.FileWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (personaId) {
      where.personaId = personaId;
    }
    if (hostId) {
      where.hostId = hostId;
    }

    return this.prisma.file.findMany({
      where,
      include: {
        persona: { select: { id: true, name: true } },
        host: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: {
        persona: { select: { id: true, name: true, avatar: true } },
        host: { select: { id: true, name: true } },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async create(dto: CreateFileDto) {
    return this.prisma.file.create({
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
        isPublic: dto.isPublic ?? false,
        iceLevel: dto.iceLevel ?? 0,
        redeemCode: dto.redeemCode,
        personaId: dto.personaId,
        hostId: dto.hostId,
      },
    });
  }

  async update(fileId: string, dto: UpdateFileDto) {
    await this.findOne(fileId);

    return this.prisma.file.update({
      where: { id: fileId },
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
        isPublic: dto.isPublic,
        iceLevel: dto.iceLevel,
        redeemCode: dto.redeemCode,
        personaId: dto.personaId,
        hostId: dto.hostId,
      },
    });
  }

  async remove(fileId: string) {
    await this.findOne(fileId);
    return this.prisma.file.delete({ where: { id: fileId } });
  }
}
