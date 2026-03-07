import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { DeviceType } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty({ example: 'DEV-2080-001' })
  @IsString()
  code: string;

  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType)
  type: DeviceType;

  @ApiPropertyOptional({ example: 'Hermes Ikon' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class BindDeviceDto {
  @ApiProperty({ example: 'cuid-of-persona' })
  @IsString()
  personaId: string;
}
