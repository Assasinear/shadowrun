import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private wsGateway: WebSocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireHackSessions() {
    const now = new Date();
    const expired = await this.prisma.hackSession.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (expired.count > 0) {
      console.log(`Expired ${expired.count} hack sessions`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async unbrickDevices() {
    const now = new Date();
    const unbricked = await this.prisma.device.updateMany({
      where: {
        status: 'BRICKED',
        brickUntil: { lt: now },
      },
      data: {
        status: 'ACTIVE',
        brickUntil: null,
      },
    });

    if (unbricked.count > 0) {
      console.log(`Unbricked ${unbricked.count} devices`);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processSubscriptions() {
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      include: {
        payerPersona: { include: { wallet: true } },
        payeePersona: { include: { wallet: true } },
      },
    });

    for (const sub of subscriptions) {
      const shouldCharge =
        !sub.lastChargedAt ||
        (now.getTime() - sub.lastChargedAt.getTime()) / 1000 >= sub.periodSeconds;

      if (!shouldCharge) {
        continue;
      }

      let payerWallet;
      let payeeWallet;

      if (sub.payerType === 'PERSONA' && sub.payerPersona?.wallet) {
        payerWallet = sub.payerPersona.wallet;
      } else {
        const host = await this.prisma.host.findUnique({
          where: { id: sub.payerId },
          include: { wallet: true },
        });
        payerWallet = host?.wallet;
      }

      if (sub.payeeType === 'PERSONA' && sub.payeePersona?.wallet) {
        payeeWallet = sub.payeePersona.wallet;
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
        // Уведомления обеим сторонам
        if (sub.payerType === 'PERSONA' && sub.payerId) {
          await this.notificationsService.createNotification(sub.payerId, 'subscription_negative_balance', {
            subscriptionId: sub.id,
            balance: updatedPayerWallet.balance,
          });
          this.wsGateway.sendNotification(sub.payerId, {
            type: 'subscription_negative_balance',
            payload: { subscriptionId: sub.id, balance: updatedPayerWallet.balance },
          });
        }

        if (sub.payeeType === 'PERSONA' && sub.payeeId) {
          await this.notificationsService.createNotification(sub.payeeId, 'subscription_payer_negative', {
            subscriptionId: sub.id,
            payerId: sub.payerId,
          });
          this.wsGateway.sendNotification(sub.payeeId, {
            type: 'subscription_payer_negative',
            payload: { subscriptionId: sub.id, payerId: sub.payerId },
          });
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
