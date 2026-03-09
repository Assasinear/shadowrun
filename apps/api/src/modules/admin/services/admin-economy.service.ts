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
    let targetName: string;

    if (dto.targetType === 'PERSONA') {
      const persona = await this.prisma.persona.findUnique({
        where: { id: dto.targetId },
        select: { id: true, name: true },
      });
      if (!persona) throw new NotFoundException('Target persona not found');
      targetName = persona.name;
    } else {
      const host = await this.prisma.host.findUnique({
        where: { id: dto.targetId },
        select: { id: true, name: true },
      });
      if (!host) throw new NotFoundException('Target host not found');
      targetName = host.name;
    }

    const payload = {
      type: 'STATIC_PAYMENT',
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetName,
      amount: dto.amount,
      ...(dto.purpose ? { purpose: dto.purpose } : {}),
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 512,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return { qrDataUrl, payload };
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

      const sharedMeta = {
        adminTransfer: true,
        purpose: dto.purpose ?? null,
        fromWalletId: dto.fromWalletId,
        toWalletId: dto.toWalletId,
      };

      const debit = await tx.transaction.create({
        data: {
          walletId: dto.fromWalletId,
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: -dto.amount,
          metaJson: sharedMeta,
        },
      });

      const credit = await tx.transaction.create({
        data: {
          walletId: dto.toWalletId,
          type: 'TRANSFER',
          status: 'COMPLETED',
          amount: dto.amount,
          metaJson: sharedMeta,
        },
      });

      return { debit, credit };
    });
  }

  async getTransfers(filters: {
    search?: string;
    isTheft?: boolean;
    isAdmin?: boolean;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = {
      type: 'TRANSFER',
      amount: { gt: 0 },
    };
    if (filters.isTheft === true) where.isTheft = true;
    if (filters.isTheft === false) where.isTheft = false;
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
              id: true,
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

    // Resolve "from" entities in batch
    const meta = items.map((t) => t.metaJson as Record<string, any> | null ?? {});

    const fromPersonaIds = [...new Set(
      meta.map((m) => m?.fromPersonaId).filter((id): id is string => !!id),
    )];
    const fromWalletIds = [...new Set(
      meta.map((m) => m?.fromWalletId).filter((id): id is string => !!id),
    )];

    const [fromPersonas, fromWallets] = await Promise.all([
      fromPersonaIds.length
        ? this.prisma.persona.findMany({ where: { id: { in: fromPersonaIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      fromWalletIds.length
        ? this.prisma.wallet.findMany({
            where: { id: { in: fromWalletIds } },
            select: {
              id: true,
              persona: { select: { id: true, name: true } },
              host: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const personaMap = new Map(fromPersonas.map((p) => [p.id, p]));
    const walletMap = new Map(fromWallets.map((w) => [w.id, w]));

    const enriched = items.map((t) => {
      const m = t.metaJson as Record<string, any> | null ?? {};

      // Resolve "to" (receiver = this wallet)
      const toEntity = t.wallet.persona
        ? { id: t.wallet.persona.id, name: t.wallet.persona.name, type: 'PERSONA' as const }
        : t.wallet.host
        ? { id: t.wallet.host.id, name: t.wallet.host.name, type: 'HOST' as const }
        : { id: t.wallet.id, name: null, type: 'UNKNOWN' as const };

      // Resolve "from" (sender)
      let fromEntity: { id: string; name: string | null; type: string } | null = null;
      if (m.fromPersonaId) {
        const p = personaMap.get(m.fromPersonaId);
        fromEntity = { id: m.fromPersonaId, name: p?.name ?? null, type: 'PERSONA' };
      } else if (m.fromWalletId) {
        const w = walletMap.get(m.fromWalletId);
        if (w) {
          fromEntity = w.persona
            ? { id: w.persona.id, name: w.persona.name, type: 'PERSONA' }
            : w.host
            ? { id: w.host.id, name: w.host.name, type: 'HOST' }
            : { id: w.id, name: null, type: 'WALLET' };
        }
      }

      return {
        id: t.id,
        amount: t.amount,
        status: t.status,
        isTheft: t.isTheft,
        isAdmin: !!(m.adminTransfer),
        purpose: m.purpose ?? null,
        createdAt: t.createdAt,
        from: fromEntity,
        to: toEntity,
      };
    });

    // Optional search filter (by name) — applied after enrichment
    const finalItems = filters.search
      ? enriched.filter((t) => {
          const q = filters.search!.toLowerCase();
          return (
            t.from?.name?.toLowerCase().includes(q) ||
            t.to.name?.toLowerCase().includes(q) ||
            t.purpose?.toLowerCase().includes(q)
          );
        })
      : enriched;

    return { items: finalItems, total, page, limit };
  }

  async getWalletTransactions(walletId: string, filters: {
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { walletId };
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
