import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class OpenArchiveDto {
  @ApiProperty({ required: false, example: 'persona-id' })
  @IsOptional()
  @IsString()
  personaId?: string;

  @ApiProperty({ required: false, example: 'Research purpose' })
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class UpdateHostDto {
  @ApiProperty({ required: false, example: 'New description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiProperty({ required: false, example: 'persona-id', nullable: true })
  @IsOptional()
  @IsString()
  spiderPersonaId?: string | null;
}

export class HostBlogPostDto {
  @ApiProperty({ example: 'Update from the host', maxLength: 70 })
  @IsString()
  @MaxLength(70)
  text: string;
}
