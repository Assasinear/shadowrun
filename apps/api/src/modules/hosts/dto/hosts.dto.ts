import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

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
