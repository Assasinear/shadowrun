import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateHostDto {
  @ApiProperty({ example: 'Corp Server Alpha' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Main corporate host' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ example: 'cuid-of-owner-persona' })
  @IsOptional()
  @IsString()
  ownerPersonaId?: string;

  @ApiPropertyOptional({ example: 'cuid-of-spider-persona' })
  @IsOptional()
  @IsString()
  spiderPersonaId?: string;

  @ApiPropertyOptional({ example: 3, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceLevel?: number = 0;
}

export class UpdateHostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerPersonaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spiderPersonaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceLevel?: number;
}

export class CreateHostFileDto {
  @ApiProperty({ example: 'secret-data.txt' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'text/plain' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'File content here' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceLevel?: number = 0;

  @ApiPropertyOptional({ example: 'REDEEM-CODE-123' })
  @IsOptional()
  @IsString()
  redeemCode?: string;
}

export class CreateAccessTokenDto {
  @ApiProperty({ example: 'cuid-of-persona' })
  @IsString()
  personaId: string;

  @ApiPropertyOptional({ example: 'Spider maintenance access' })
  @IsOptional()
  @IsString()
  purpose?: string;
}
