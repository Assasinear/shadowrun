import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateDeviceDto } from '../dto/admin-devices.dto';

@Injectable()
export class AdminDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(unownedOnly?: boolean) {
    const where: any = {};
    if (unownedOnly) {
      where.ownerPersonaId = null;
    }

    return this.prisma.device.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
}
