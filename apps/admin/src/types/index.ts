export type Role = 'USER' | 'DECKER' | 'SPIDER' | 'GRIDGOD';

export type DeviceType = 'COMMLINK' | 'DECK' | 'OTHER';

export type DeviceStatus = 'ACTIVE' | 'BRICKED';

export type TransactionType = 'TRANSFER' | 'SUBSCRIPTION' | 'SALARY' | 'PAYMENT_REQUEST';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type WalletOwnerType = 'PERSONA' | 'HOST';

export type SubscriptionType = 'SUBSCRIPTION' | 'SALARY';

export type HackTargetType = 'PERSONA' | 'HOST';

export type HackSessionStatus = 'ACTIVE' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface User {
  id: string;
  username: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Persona {
  id: string;
  userId: string;
  name: string;
  avatar?: string | null;
  address?: string | null;
  profession?: string | null;
  extraInfo?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  lls?: Lls | null;
  wallet?: Wallet | null;
  devices?: Device[];
  licenses?: License[];
}

export interface Lls {
  id: string;
  personaId: string;
  sin: string;
  isPublic: boolean;
  iceLevel: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  id: string;
  code: string;
  type: DeviceType;
  name?: string | null;
  ownerPersonaId?: string | null;
  status: DeviceStatus;
  brickUntil?: string | null;
  createdAt: string;
  updatedAt?: string;
  owner?: Persona | null;
}

export interface License {
  id: string;
  personaId: string;
  type: string;
  name: string;
  description?: string | null;
  issuedAt: string;
  issuedBy?: string | null;
}

export interface Host {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  ownerPersonaId?: string | null;
  spiderPersonaId?: string | null;
  iceLevel: number;
  createdAt: string;
  updatedAt?: string;
  owner?: Persona | null;
  spider?: Persona | null;
  wallet?: Wallet | null;
  files?: FileRecord[];
  accessTokens?: AccessToken[];
}

export interface FileRecord {
  id: string;
  name: string;
  type?: string | null;
  size?: number | null;
  content?: string | null;
  isPublic: boolean;
  redeemCode?: string | null;
  iceLevel: number;
  personaId?: string | null;
  hostId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Wallet {
  id: string;
  balance: number | string;
  personaId?: string | null;
  hostId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  persona?: Persona | null;
  host?: Host | null;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number | string;
  isTheft: boolean;
  subscriptionId?: string | null;
  paymentRequestId?: string | null;
  metaJson?: Record<string, unknown> | null;
  createdAt: string;
  wallet?: Wallet;
}

export interface Subscription {
  id: string;
  payerType: WalletOwnerType;
  payerId: string;
  payeeType: WalletOwnerType;
  payeeId: string;
  amountPerTick: number | string;
  periodSeconds: number;
  lastChargedAt?: string | null;
  type: SubscriptionType;
  createdAt: string;
  updatedAt?: string;
}

export interface GridLog {
  id: string;
  type: string;
  actorPersonaId?: string | null;
  targetPersonaId?: string | null;
  targetHostId?: string | null;
  metaJson?: Record<string, unknown> | null;
  createdAt: string;
  actor?: Persona | null;
  targetPersona?: Persona | null;
  targetHost?: Host | null;
}

export interface AdminLog {
  id: string;
  action: string;
  adminUserId: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
}

export interface HackSession {
  id: string;
  attackerPersonaId: string;
  targetType: HackTargetType;
  targetPersonaId?: string | null;
  targetHostId?: string | null;
  elementType: string;
  elementId?: string | null;
  status: HackSessionStatus;
  iceLevel: number;
  expiresAt: string;
  consumedOperationAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AccessToken {
  id: string;
  token: string;
  personaId: string;
  hostId: string;
  purpose?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  persona?: Persona;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
