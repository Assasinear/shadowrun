import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BindDeviceDto, UnbindDeviceDto, BrickDeviceDto } from './dto/devices.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async getDevices(personaId: string) {
    return this.prisma.device.findMany({
      where: { ownerPersonaId: personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bindDevice(personaId: string, dto: BindDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { code: dto.code },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.ownerPersonaId) {
      throw new BadRequestException('Device already bound');
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { ownerPersonaId: personaId },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'device_bound',
        actorPersonaId: personaId,
        metaJson: { deviceId: device.id, code: dto.code },
      },
    });

    return updated;
  }

  async unbindDevice(personaId: string, dto: UnbindDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
    });

    if (!device || device.ownerPersonaId !== personaId) {
      throw new ForbiddenException('Device not found or access denied');
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { ownerPersonaId: null },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'device_unbound',
        actorPersonaId: personaId,
        metaJson: { deviceId: device.id },
      },
    });

    return updated;
  }

  async brickDevice(personaId: string, deviceId: string, dto: BrickDeviceDto) {
    // Проверка что есть успешная сессия взлома LLS владельца устройства
    const hackSession = await this.prisma.hackSession.findUnique({
      where: { id: dto.hackSessionId },
      include: { targetPersona: { include: { devices: true } } },
    });

    if (!hackSession || hackSession.attackerPersonaId !== personaId) {
      throw new ForbiddenException('Invalid hack session');
    }

    if (hackSession.status !== 'SUCCESS') {
      throw new BadRequestException('Hack session not successful');
    }

    if (hackSession.consumedOperationAt) {
      throw new BadRequestException('Hack session operation already consumed');
    }

    const targetPersona = hackSession.targetPersona;
    if (!targetPersona) {
      throw new NotFoundException('Target persona not found');
    }

    const device = targetPersona.devices.find((d) => d.id === deviceId);
    if (!device) {
      throw new NotFoundException('Device not found in target persona');
    }

    const brickUntil = new Date();
    brickUntil.setMinutes(brickUntil.getMinutes() + 5);

    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status: 'BRICKED',
        brickUntil,
      },
    });

    await this.prisma.hackSession.update({
      where: { id: dto.hackSessionId },
      data: { consumedOperationAt: new Date() },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'device_bricked',
        actorPersonaId: personaId,
        targetPersonaId: targetPersona.id,
        metaJson: { deviceId, hackSessionId: dto.hackSessionId },
      },
    });

    return { success: true, brickUntil };
  }
}
