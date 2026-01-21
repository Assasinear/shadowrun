import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class WalletTargetDto {
  @ApiProperty({ enum: ['PERSONA', 'HOST'], example: 'PERSONA' })
  @IsEnum(['PERSONA', 'HOST'])
  type: 'PERSONA' | 'HOST';

  @ApiProperty({ example: 'persona-id' })
  @IsString()
  id: string;
}

export class TransferDto {
  @ApiProperty({ type: WalletTargetDto })
  @ValidateNested()
  @Type(() => WalletTargetDto)
  to: WalletTargetDto;

  @ApiProperty({ example: 100.5 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class PaymentRequestDto {
  @ApiProperty({ type: WalletTargetDto })
  @ValidateNested()
  @Type(() => WalletTargetDto)
  to: WalletTargetDto;

  @ApiProperty({ example: 50.0 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ required: false, example: 'Payment for services' })
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class ScanQrDto {
  @ApiProperty({ example: 'qr-token-string' })
  @IsString()
  token: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ example: 'qr-token-string' })
  @IsString()
  token: string;
}

export class NewSubscriptionDto {
  @ApiProperty({ type: WalletTargetDto })
  @ValidateNested()
  @Type(() => WalletTargetDto)
  payer: WalletTargetDto;

  @ApiProperty({ type: WalletTargetDto })
  @ValidateNested()
  @Type(() => WalletTargetDto)
  payee: WalletTargetDto;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  itemAmount: number;

  @ApiProperty({ enum: ['subscription', 'salary'], example: 'subscription' })
  @IsEnum(['subscription', 'salary'])
  mode: 'subscription' | 'salary';
}
