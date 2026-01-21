import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLogsDto {
  @ApiProperty({ required: false, example: 'transfer' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, example: 'persona-id' })
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiProperty({ required: false, example: 'host-id' })
  @IsOptional()
  @IsString()
  hostId?: string;

  @ApiProperty({ required: false, example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  since?: string;
}

export class LicenseDto {
  @ApiProperty({ example: 'weapon' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Firearms License' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'License description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class IssueLicensesDto {
  @ApiProperty({ example: 'persona-id' })
  @IsString()
  personaId: string;

  @ApiProperty({ type: [LicenseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenseDto)
  licenses: LicenseDto[];
}
