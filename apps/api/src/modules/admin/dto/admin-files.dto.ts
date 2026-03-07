import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';

export class CreateFileDto {
  @ApiProperty({ example: 'secret_data.json' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'application/json' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '{"key": "value"}' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceLevel?: number = 0;

  @ApiPropertyOptional({ example: 'REDEEM-XYZ' })
  @IsOptional()
  @IsString()
  redeemCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;
}

export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'renamed_file.json' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  iceLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redeemCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hostId?: string;
}
