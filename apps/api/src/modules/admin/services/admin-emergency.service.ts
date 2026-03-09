import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminEmergencyService {
  constructor(private readonly prisma: PrismaService) {}

  async terminateAllHacks() {
    const result = await this.prisma.hackSession.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    return { terminated: result.count };
  }

  async disableDecking() {
    await this.prisma.systemSettings.upsert({
      where: { key: 'decking_enabled' },
      update: { value: 'false' },
      create: { key: 'decking_enabled', value: 'false' },
    });

    return { deckingEnabled: false };
  }

  async enableDecking() {
    await this.prisma.systemSettings.upsert({
      where: { key: 'decking_enabled' },
      update: { value: 'true' },
      create: { key: 'decking_enabled', value: 'true' },
    });

    return { deckingEnabled: true };
  }

  async isDeckingEnabled() {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key: 'decking_enabled' },
    });

    return { deckingEnabled: setting?.value !== 'false' };
  }

  async resetAllBricks() {
    const result = await this.prisma.device.updateMany({
      where: { status: 'BRICKED' },
      data: { status: 'ACTIVE', brickUntil: null },
    });

    return { reset: result.count };
  }

  async exportDatabase() {
    const [
      users,
      personas,
      hosts,
      devices,
      wallets,
      transactions,
      subscriptions,
      hackSessions,
      gridLogs,
      adminLogs,
      files,
      licenses,
      accessTokens,
      paymentRequests,
      systemSettings,
    ] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, username: true, role: true, isBlocked: true, createdAt: true } }),
      this.prisma.persona.findMany({ include: { lls: true } }),
      this.prisma.host.findMany(),
      this.prisma.device.findMany(),
      this.prisma.wallet.findMany(),
      this.prisma.transaction.findMany(),
      this.prisma.subscription.findMany(),
      this.prisma.hackSession.findMany(),
      this.prisma.gridLog.findMany(),
      this.prisma.adminLog.findMany(),
      this.prisma.file.findMany(),
      this.prisma.license.findMany(),
      this.prisma.accessToken.findMany(),
      this.prisma.paymentRequest.findMany(),
      this.prisma.systemSettings.findMany(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        personas: personas.length,
        hosts: hosts.length,
        devices: devices.length,
        wallets: wallets.length,
        transactions: transactions.length,
        subscriptions: subscriptions.length,
        hackSessions: hackSessions.length,
        gridLogs: gridLogs.length,
        adminLogs: adminLogs.length,
        files: files.length,
        licenses: licenses.length,
        accessTokens: accessTokens.length,
        paymentRequests: paymentRequests.length,
        systemSettings: systemSettings.length,
      },
      data: {
        users,
        personas,
        hosts,
        devices,
        wallets,
        transactions,
        subscriptions,
        hackSessions,
        gridLogs,
        adminLogs,
        files,
        licenses,
        accessTokens,
        paymentRequests,
        systemSettings,
      },
    };
  }
}
