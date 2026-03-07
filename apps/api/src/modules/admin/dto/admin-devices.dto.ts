import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({ example: 'DEV-2080-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'COMMLINK', description: 'Произвольный тип: COMMLINK, DECK, оружие, имплант, транспорт и т.д.' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'Hermes Ikon' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'DEV-2080-002' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'DECK' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'Renraku Tsurugi' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class BindDeviceDto {
  @ApiProperty({ example: 'cuid-of-persona' })
  @IsString()
  personaId: string;
}
