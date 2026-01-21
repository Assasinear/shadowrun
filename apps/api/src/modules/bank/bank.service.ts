import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QrService } from '../persona/qr.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';
import {
  TransferDto,
  PaymentRequestDto,
  ScanQrDto,
  ConfirmPaymentDto,
  NewSubscriptionDto,
} from './dto/bank.dto';
import { WalletOwnerType, Role } from '@prisma/client';

@Injectable()
export class BankService {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
    private wsGateway: WebSocketGateway,
  ) {}

  async getBalance(personaId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return { balance: wallet.balance };
  }

  async getTransactions(personaId: string, role: Role) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Скрываем кражи от обычных пользователей
    if (role !== 'GRIDGOD') {
      return transactions.filter((tx) => !tx.isTheft);
    }

    return transactions;
  }

  async transfer(personaId: string, dto: TransferDto) {
    const fromWallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!fromWallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Проверка на отрицательный баланс
    if (Number(fromWallet.balance) < 0) {
      throw new BadRequestException('Cannot transfer: balance is negative');
    }

    let toWallet;
    if (dto.to.type === 'PERSONA') {
      toWallet = await this.prisma.wallet.findUnique({
        where: { personaId: dto.to.id },
      });
    } else {
      toWallet = await this.prisma.wallet.findUnique({
        where: { hostId: dto.to.id },
      });
    }

    if (!toWallet) {
      throw new NotFoundException('Target wallet not found');
    }

    if (Number(fromWallet.balance) < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: dto.amount } },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: dto.amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: updatedTo.id,
          type: 'TRANSFER',
          amount: dto.amount,
          metaJson: {
            fromPersonaId: personaId,
            toType: dto.to.type,
            toId: dto.to.id,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: updatedFrom.id,
          type: 'TRANSFER',
          amount: -dto.amount,
          metaJson: {
            fromPersonaId: personaId,
            toType: dto.to.type,
            toId: dto.to.id,
          },
        },
      });

      await tx.gridLog.create({
        data: {
          type: 'transfer',
          actorPersonaId: personaId,
          targetPersonaId: dto.to.type === 'PERSONA' ? dto.to.id : null,
          metaJson: { amount: dto.amount, toType: dto.to.type },
        },
      });

      return { updatedFrom, updatedTo, transaction };
    });

    // WebSocket уведомления
    this.wsGateway.notifyBalanceUpdate(personaId, Number(result.updatedFrom.balance));
    if (dto.to.type === 'PERSONA') {
      this.wsGateway.notifyBalanceUpdate(dto.to.id, Number(result.updatedTo.balance));
    }

    return result.transaction;
  }

  async createPaymentRequest(personaId: string, dto: PaymentRequestDto) {
    const creatorWallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!creatorWallet) {
      throw new NotFoundException('Wallet not found');
    }

    const paymentRequest = await this.prisma.paymentRequest.create({
      data: {
        token: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        creatorType: 'PERSONA',
        creatorPersonaId: personaId,
        targetType: dto.to.type,
        targetPersonaId: dto.to.type === 'PERSONA' ? dto.to.id : null,
        targetHostId: dto.to.type === 'HOST' ? dto.to.id : null,
        amount: dto.amount,
        purpose: dto.purpose,
        status: 'PENDING',
      },
    });

    const qrToken = await this.qrService.createQrToken('PAYMENT', {
      paymentRequestId: paymentRequest.id,
      amount: paymentRequest.amount,
      purpose: paymentRequest.purpose,
    });

    await this.prisma.qrToken.update({
      where: { token: qrToken.token },
      data: { paymentRequestId: paymentRequest.id },
    });

    return {
      paymentRequest,
      qrToken: {
        token: qrToken.token,
        qrDataUrl: qrToken.qrDataUrl,
        payload: qrToken.payload,
      },
    };
  }

  async scanQr(personaId: string, dto: ScanQrDto) {
    const qrToken = await this.qrService.getQrToken(dto.token);

    if (!qrToken) {
      throw new NotFoundException('QR token not found or expired');
    }

    if (qrToken.type === 'PAYMENT' && qrToken.paymentRequest) {
      const pr = qrToken.paymentRequest;
      return {
        type: 'PAYMENT',
        paymentRequest: {
          id: pr.id,
          amount: pr.amount,
          purpose: pr.purpose,
          creatorType: pr.creatorType,
          creatorPersonaId: pr.creatorPersonaId,
          creatorHostId: pr.creatorHostId,
        },
      };
    }

    if (qrToken.type === 'SIN') {
      return {
        type: 'SIN',
        payload: qrToken.payload,
      };
    }

    if (qrToken.type === 'DEVICE_BIND') {
      return {
        type: 'DEVICE_BIND',
        payload: qrToken.payload,
      };
    }

    return { type: qrToken.type, payload: qrToken.payload };
  }

  async confirmPayment(personaId: string, dto: ConfirmPaymentDto) {
    const qrToken = await this.qrService.getQrToken(dto.token);

    if (!qrToken || qrToken.type !== 'PAYMENT' || !qrToken.paymentRequest) {
      throw new BadRequestException('Invalid payment QR token');
    }

    const pr = qrToken.paymentRequest;

    if (pr.status !== 'PENDING') {
      throw new BadRequestException('Payment request already processed');
    }

    const fromWallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!fromWallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (Number(fromWallet.balance) < 0) {
      throw new BadRequestException('Cannot pay: balance is negative');
    }

    let toWallet;
    if (pr.targetType === 'PERSONA' && pr.targetPersonaId) {
      toWallet = await this.prisma.wallet.findUnique({
        where: { personaId: pr.targetPersonaId },
      });
    } else if (pr.targetType === 'HOST' && pr.targetHostId) {
      toWallet = await this.prisma.wallet.findUnique({
        where: { hostId: pr.targetHostId },
      });
    }

    if (!toWallet) {
      throw new NotFoundException('Target wallet not found');
    }

    if (fromWallet.balance < pr.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: pr.amount } },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: pr.amount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: updatedTo.id,
          type: 'PAYMENT_REQUEST',
          amount: pr.amount,
          paymentRequestId: pr.id,
          metaJson: {
            fromPersonaId: personaId,
            purpose: pr.purpose,
          },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: updatedFrom.id,
          type: 'PAYMENT_REQUEST',
          amount: -pr.amount,
          paymentRequestId: pr.id,
          metaJson: {
            fromPersonaId: personaId,
            purpose: pr.purpose,
          },
        },
      });

      await tx.paymentRequest.update({
        where: { id: pr.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await tx.gridLog.create({
        data: {
          type: 'payment_request_completed',
          actorPersonaId: personaId,
          targetPersonaId: pr.targetPersonaId,
          targetHostId: pr.targetHostId,
          metaJson: { paymentRequestId: pr.id, amount: pr.amount },
        },
      });

      return { updatedFrom, updatedTo, transaction };
    });

    this.wsGateway.notifyBalanceUpdate(personaId, Number(result.updatedFrom.balance));
    if (pr.targetType === 'PERSONA' && pr.targetPersonaId) {
      this.wsGateway.notifyBalanceUpdate(pr.targetPersonaId, Number(result.updatedTo.balance));
    }

    return result.transaction;
  }

  async createSubscription(personaId: string, dto: NewSubscriptionDto) {
    const payerWallet = await this.prisma.wallet.findUnique({
      where: { personaId: dto.payer.id },
    });

    if (!payerWallet) {
      throw new NotFoundException('Payer wallet not found');
    }

    let payeeWallet;
    if (dto.payee.type === 'PERSONA') {
      payeeWallet = await this.prisma.wallet.findUnique({
        where: { personaId: dto.payee.id },
      });
    } else {
      payeeWallet = await this.prisma.wallet.findUnique({
        where: { hostId: dto.payee.id },
      });
    }

    if (!payeeWallet) {
      throw new NotFoundException('Payee wallet not found');
    }

    // amountPerTick = floor(itemAmount * 5 / 48)
    const amountPerTick = Math.floor((Number(dto.itemAmount) * 5) / 48);

    const subscription = await this.prisma.subscription.create({
      data: {
        payerType: dto.payer.type,
        payerId: dto.payer.id,
        payeeType: dto.payee.type,
        payeeId: dto.payee.id,
        amountPerTick,
        periodSeconds: 3600,
        type: dto.mode === 'subscription' ? 'SUBSCRIPTION' : 'SALARY',
      },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'subscription_created',
        actorPersonaId: personaId,
        targetPersonaId: dto.payee.type === 'PERSONA' ? dto.payee.id : null,
        metaJson: { subscriptionId: subscription.id, amountPerTick },
      },
    });

    return subscription;
  }

  async getSubscriptions(personaId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { personaId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const asPayer = await this.prisma.subscription.findMany({
      where: {
        payerType: 'PERSONA',
        payerId: personaId,
      },
    });

    const asPayee = await this.prisma.subscription.findMany({
      where: {
        payeeType: 'PERSONA',
        payeeId: personaId,
      },
    });

    return {
      asPayer,
      asPayee,
    };
  }
}
