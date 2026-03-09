import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { WalletOwnerType, SubscriptionType } from '@prisma/client';

export class SetBalanceDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  balance: number;
}

export class DepositDto {
  @ApiProperty({ example: 1000, description: 'Положительное — пополнение, отрицательное — списание' })
  @IsNumber()
  amount: number;
}

export class CreateSubscriptionDto {
  @ApiProperty({ enum: WalletOwnerType })
  @IsEnum(WalletOwnerType)
  payerType: WalletOwnerType;

  @ApiProperty({ example: 'cuid-of-payer' })
  @IsString()
  payerId: string;

  @ApiProperty({ enum: WalletOwnerType })
  @IsEnum(WalletOwnerType)
  payeeType: WalletOwnerType;

  @ApiProperty({ example: 'cuid-of-payee' })
  @IsString()
  payeeId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  amountPerTick: number;

  @ApiPropertyOptional({ example: 3600, default: 3600 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  periodSeconds?: number = 3600;

  @ApiProperty({ enum: SubscriptionType })
  @IsEnum(SubscriptionType)
  type: SubscriptionType;
}

export class GeneratePaymentQrDto {
  @ApiProperty({ enum: ['PERSONA', 'HOST'], example: 'PERSONA' })
  @IsEnum(['PERSONA', 'HOST'])
  targetType: 'PERSONA' | 'HOST';

  @ApiProperty({ example: 'cuid-of-target' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'Equipment purchase' })
  @IsOptional()
  @IsString()
  purpose?: string;
}
