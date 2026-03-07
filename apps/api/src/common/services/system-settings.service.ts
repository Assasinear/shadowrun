import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

  async get(key: string, defaultValue: string): Promise<string> {
    const setting = await this.prisma.systemSettings.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const val = await this.get(key, String(defaultValue));
    return Number(val) || defaultValue;
  }

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const val = await this.get(key, String(defaultValue));
    return val === 'true';
  }
}
