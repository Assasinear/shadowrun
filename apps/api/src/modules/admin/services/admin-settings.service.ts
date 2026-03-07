import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, string> = {
  subscription_period_seconds: '3600',
  brick_duration_seconds: '300',
  steal_percentage: '10',
  messenger_enabled: 'true',
  push_notifications_enabled: 'true',
  decking_enabled: 'true',
};

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const settings = await this.prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s]));

    const result = Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => {
      const existing = settingsMap.get(key);
      return existing ?? { key, value: defaultValue, isDefault: true };
    });

    for (const setting of settings) {
      if (!DEFAULT_SETTINGS[setting.key]) {
        result.push(setting);
      }
    }

    return result;
  }

  async get(key: string) {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });

    if (!setting) {
      if (DEFAULT_SETTINGS[key] !== undefined) {
        return { key, value: DEFAULT_SETTINGS[key], isDefault: true };
      }
      throw new NotFoundException(`Setting "${key}" not found`);
    }

    return setting;
  }

  async set(key: string, value: string) {
    return this.prisma.systemSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async bulkUpdate(settings: { key: string; value: string }[]) {
    const results = await this.prisma.$transaction(
      settings.map((s) =>
        this.prisma.systemSettings.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        }),
      ),
    );
    return results;
  }
}
