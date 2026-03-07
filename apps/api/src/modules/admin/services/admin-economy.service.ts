import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSubscriptionDto, GeneratePaymentQrDto } from '../dto/admin-economy.dto';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class AdminEconomyService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllWallets(search?: string) {
    const wallets = await this.prisma.wallet.findMany({
      include: {
        persona: { select: { id: true, name: true } },
        host: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (search) {
      const term = search.toLowerCase();
      return wallets.filter(
        (w) =>
          w.persona?.name?.toLowerCase().includes(term) ||
          w.host?.name?.toLowerCase().includes(term),
      );
    }

    return wallets;
  }

  async setBalance(walletId: string, balance: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.update({
      where: { id: walletId },
      data: { balance },
    });
  }

  async deposit(walletId: string, amount: number) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } },
    });
  }

  async getTransactions(filters: {
    walletId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.walletId) where.walletId = filters.walletId;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          wallet: {
            select: {
              persona: { select: { id: true, name: true } },
              host: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getTransactionsCsv(filters: {
    walletId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};
    if (filters.walletId) where.walletId = filters.walletId;
    if (filters.type) where.type = filters.type;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        wallet: {
          select: {
            persona: { select: { id: true, name: true } },
            host: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'id,walletId,type,status,amount,isTheft,owner,createdAt';
    const rows = transactions.map((tx) => {
      const owner = tx.wallet.persona?.name ?? tx.wallet.host?.name ?? '';
      return [
        tx.id,
        tx.walletId,
        tx.type,
        tx.status,
        tx.amount.toString(),
        tx.isTheft,
        `"${owner}"`,
        tx.createdAt.toISOString(),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async getAllSubscriptions(filters: {
    type?: string;
    payerType?: string;
    payerId?: string;
    payeeType?: string;
    payeeId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.type) where.type = filters.type;
    if (filters.payerType) where.payerType = filters.payerType;
    if (filters.payerId) where.payerId = filters.payerId;
    if (filters.payeeType) where.payeeType = filters.payeeType;
    if (filters.payeeId) where.payeeId = filters.payeeId;

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          payerPersona: { select: { id: true, name: true } },
          payeePersona: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createSubscription(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        payerType: dto.payerType,
        payerId: dto.payerId,
        payeeType: dto.payeeType,
        payeeId: dto.payeeId,
        amountPerTick: dto.amountPerTick,
        periodSeconds: dto.periodSeconds ?? 3600,
        type: dto.type,
      },
    });
  }

  async removeSubscription(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.subscription.delete({ where: { id } });
    return { success: true };
  }

  async generatePaymentQr(dto: GeneratePaymentQrDto) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: dto.targetPersonaId },
    });
    if (!persona) {
      throw new NotFoundException('Target persona not found');
    }

    const paymentRequest = await this.prisma.paymentRequest.create({
      data: {
        token: `PR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        creatorType: 'PERSONA',
        creatorPersonaId: dto.targetPersonaId,
        targetType: 'PERSONA',
        targetPersonaId: dto.targetPersonaId,
        amount: dto.amount,
        purpose: dto.purpose,
        status: 'PENDING',
      },
    });

    const qrTokenValue = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const qrToken = await this.prisma.qrToken.create({
      data: {
        token: qrTokenValue,
        type: 'PAYMENT',
        payload: {
          paymentRequestId: paymentRequest.id,
          amount: dto.amount,
          purpose: dto.purpose,
        },
        paymentRequestId: paymentRequest.id,
        expiresAt,
      },
    });

    const qrDataUrl = await QRCode.toDataURL(qrToken.token, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return { paymentRequest, qrToken: { token: qrToken.token, qrDataUrl } };
  }

  async createAdminTransaction(dto: {
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    purpose?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const fromWallet = await tx.wallet.findUnique({ where: { id: dto.fromWalletId } });
      const toWallet = await tx.wallet.findUnique({ where: { id: dto.toWalletId } });
      if (!fromWallet || !toWallet) {
        throw new NotFoundException('Wallet not found');
      }

      await tx.wallet.update({
        where: { id: dto.fromWalletId },
        data: { balance: { decrement: dto.amount } },
      });

      await tx.wallet.update({
        where: { id: dto.toWalletId },
        data: { balance: { increment: dto.amount } },
      });

      const debit = await tx.transaction.create({
        data: {
          walletId: dto.fromWalletId,
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: -dto.amount,
          metaJson: { adminTransfer: true, purpose: dto.purpose },
        },
      });

      const credit = await tx.transaction.create({
        data: {
          walletId: dto.toWalletId,
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: dto.amount,
          metaJson: { adminTransfer: true, purpose: dto.purpose },
        },
      });

      return { debit, credit };
    });
  }
}
