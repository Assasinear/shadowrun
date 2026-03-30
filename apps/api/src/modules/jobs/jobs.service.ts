import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WebSocketGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireHackSessions() {
    const now = new Date();
    const toExpire = await this.prisma.hackSession.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        attackerPersonaId: true,
        targetPersonaId: true,
      },
    });

    if (toExpire.length === 0) {
      return;
    }

    await this.prisma.hackSession.updateMany({
      where: { id: { in: toExpire.map((s) => s.id) } },
      data: { status: 'EXPIRED' },
    });

    for (const s of toExpire) {
      try {
        await this.wsGateway.sendNotification(s.attackerPersonaId, {
          type: 'hack_session_expired',
          payload: { sessionId: s.id, role: 'attacker' },
        });
        if (s.targetPersonaId) {
          await this.wsGateway.sendNotification(s.targetPersonaId, {
            type: 'hack_session_expired',
            payload: { sessionId: s.id, role: 'target' },
          });
        }
      } catch (e) {
        console.warn('expireHackSessions notification failed:', e);
      }
    }

    console.log(`Expired ${toExpire.length} hack sessions`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async unbrickDevices() {
    const now = new Date();
    const devices = await this.prisma.device.findMany({
      where: {
        status: 'BRICKED',
        brickUntil: { lt: now },
      },
      select: { id: true, ownerPersonaId: true, name: true },
    });

    if (devices.length === 0) {
      return;
    }

    await this.prisma.device.updateMany({
      where: { id: { in: devices.map((d) => d.id) } },
      data: {
        status: 'ACTIVE',
        brickUntil: null,
      },
    });

    for (const d of devices) {
      if (!d.ownerPersonaId) continue;
      try {
        await this.wsGateway.sendNotification(d.ownerPersonaId, {
          type: 'device_unbricked',
          payload: { deviceId: d.id, deviceName: d.name },
        });
      } catch (e) {
        console.warn('unbrick notification failed:', e);
      }
    }

    console.log(`Unbricked ${devices.length} devices`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processSubscriptions() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany();

    for (const sub of subscriptions) {
      const shouldCharge =
        !sub.lastChargedAt ||
        (now.getTime() - sub.lastChargedAt.getTime()) / 1000 >= sub.periodSeconds;

      if (!shouldCharge) {
        continue;
      }

      let payerWallet;
      let payeeWallet;

      if (sub.payerType === 'PERSONA') {
        payerWallet = await this.prisma.wallet.findUnique({
          where: { personaId: sub.payerId },
        });
      } else {
        const host = await this.prisma.host.findUnique({
          where: { id: sub.payerId },
          include: { wallet: true },
        });
        payerWallet = host?.wallet;
      }

      if (sub.payeeType === 'PERSONA') {
        payeeWallet = await this.prisma.wallet.findUnique({
          where: { personaId: sub.payeeId },
        });
      } else {
        const host = await this.prisma.host.findUnique({
          where: { id: sub.payeeId },
          include: { wallet: true },
        });
        payeeWallet = host?.wallet;
      }

      if (!payerWallet || !payeeWallet) {
        continue;
      }

      // Выполняем перевод (может уйти в минус)
      await this.prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: payerWallet.id },
          data: { balance: { decrement: sub.amountPerTick } },
        });

        await tx.wallet.update({
          where: { id: payeeWallet.id },
          data: { balance: { increment: sub.amountPerTick } },
        });

        await tx.transaction.create({
          data: {
            walletId: payeeWallet.id,
            type: sub.type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'SALARY',
            amount: sub.amountPerTick,
            subscriptionId: sub.id,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: payerWallet.id,
            type: sub.type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'SALARY',
            amount: -sub.amountPerTick,
            subscriptionId: sub.id,
          },
        });

        await tx.subscription.update({
          where: { id: sub.id },
          data: { lastChargedAt: now },
        });
      });

      // Проверка на отрицательный баланс
      const updatedPayerWallet = await this.prisma.wallet.findUnique({
        where: { id: payerWallet.id },
      });

      if (updatedPayerWallet && Number(updatedPayerWallet.balance) < 0) {
        if (sub.payerType === 'PERSONA' && sub.payerId) {
          try {
            await this.wsGateway.sendNotification(sub.payerId, {
              type: 'subscription_negative_balance',
              payload: {
                subscriptionId: sub.id,
                balance: Number(updatedPayerWallet.balance),
              },
            });
          } catch (e) {
            console.warn('subscription payer notification failed:', e);
          }
        }

        if (sub.payeeType === 'PERSONA' && sub.payeeId) {
          try {
            await this.wsGateway.sendNotification(sub.payeeId, {
              type: 'subscription_payer_negative',
              payload: { subscriptionId: sub.id, payerId: sub.payerId },
            });
          } catch (e) {
            console.warn('subscription payee notification failed:', e);
          }
        }
      }

      // WebSocket уведомления о балансе
      if (sub.payerType === 'PERSONA' && sub.payerId) {
        const updated = await this.prisma.wallet.findUnique({
          where: { id: payerWallet.id },
        });
        if (updated) {
          this.wsGateway.notifyBalanceUpdate(sub.payerId, Number(updated.balance));
        }
      }

      if (sub.payeeType === 'PERSONA' && sub.payeeId) {
        const updated = await this.prisma.wallet.findUnique({
          where: { id: payeeWallet.id },
        });
        if (updated) {
          this.wsGateway.notifyBalanceUpdate(sub.payeeId, Number(updated.balance));
        }
      }
    }

    console.log(`Processed ${subscriptions.length} subscriptions`);
  }
}
