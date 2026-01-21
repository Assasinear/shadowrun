import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePersonaDto {
  @ApiProperty({ required: false, example: 'Seattle, Downtown' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: 'Decker' })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiProperty({ required: false, example: 'Additional info' })
  @IsOptional()
  @IsString()
  extraInfo?: string;
}

export class TogglePublicDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPublic: boolean;
}

export class BlogPostDto {
  @ApiProperty({ example: 'My blog post text', maxLength: 70 })
  @IsString()
  @MaxLength(70)
  text: string;
}

export class RedeemFileDto {
  @ApiProperty({ example: 'REDEEM-CODE-123' })
  @IsString()
  redeemCode: string;
}
