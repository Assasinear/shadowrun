import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreatePersonaDto {
  @ApiProperty({ example: 'runner42' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'secureP@ss' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'Shadow Runner' })
  @IsString()
  personaName: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role = Role.USER;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Redmond Barrens, Block 42' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Street Samurai' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({ example: 'Known for precision work' })
  @IsOptional()
  @IsString()
  extraInfo?: string;

  @ApiPropertyOptional({ example: 1000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number = 0;

  @ApiPropertyOptional({ example: 'SIN-2080-XXXX-XXXX' })
  @IsOptional()
  @IsString()
  sinNumber?: string;
}

export class UpdatePersonaDto {
  @ApiPropertyOptional({ example: 'New Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  extraInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}

export class LicenseItemDto {
  @ApiProperty({ example: 'weapon' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Firearms License' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Heavy weapons included' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class IssueLicensesDto {
  @ApiProperty({ type: [LicenseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LicenseItemDto)
  licenses: LicenseItemDto[];
}

export class BlockPersonaDto {}
