import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

export class StartCounterDto {
  @ApiProperty({ example: 'host-id' })
  @IsString()
  hostId: string;

  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  hackSessionId: string;
}

export class CompleteCounterDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  success: boolean;
}
