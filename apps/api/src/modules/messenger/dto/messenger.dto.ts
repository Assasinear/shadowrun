import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ enum: ['PERSONA', 'HOST'], example: 'PERSONA' })
  @IsEnum(['PERSONA', 'HOST'])
  targetType: 'PERSONA' | 'HOST';

  @ApiProperty({ example: 'target-id' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 'Hello!', maxLength: 280 })
  @IsString()
  @MaxLength(280)
  text: string;
}
