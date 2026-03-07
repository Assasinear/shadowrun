import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto } from '../dto/admin-devices.dto';

@Injectable()
export class AdminDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    type?: string;
    status?: string;
    unownedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.unownedOnly) {
      where.ownerPersonaId = null;
    }
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.type) {
      where.type = { contains: filters.type, mode: 'insensitive' };
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.device.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(dto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        code: dto.code,
        type: dto.type,
        name: dto.name,
      },
    });
  }

  async update(deviceId: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.device.update({
      where: { id: deviceId },
      data: {
        code: dto.code,
        type: dto.type,
        name: dto.name,
      },
    });
  }

  async remove(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.delete({ where: { id: deviceId } });
    return { success: true };
  }

  async bind(deviceId: string, personaId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const persona = await this.prisma.persona.findUnique({ where: { id: personaId } });
    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.device.update({
      where: { id: deviceId },
      data: { ownerPersonaId: personaId },
    });
  }

  async unbind(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.device.update({
      where: { id: deviceId },
      data: { ownerPersonaId: null },
    });
  }

  async resetBrick(deviceId: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.device.update({
      where: { id: deviceId },
      data: { status: 'ACTIVE', brickUntil: null },
    });
  }

  async massUnbind(ids: string[]) {
    return this.prisma.device.updateMany({
      where: { id: { in: ids } },
      data: { ownerPersonaId: null },
    });
  }

  async massResetBrick(ids: string[]) {
    return this.prisma.device.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ACTIVE', brickUntil: null },
    });
  }

  async massDelete(ids: string[]) {
    return this.prisma.device.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
