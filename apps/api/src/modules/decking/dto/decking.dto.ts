import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional } from 'class-validator';

export class AddTargetDto {
  @ApiProperty({ enum: ['PERSONA', 'HOST'], example: 'PERSONA' })
  @IsEnum(['PERSONA', 'HOST'])
  targetType: 'PERSONA' | 'HOST';

  @ApiProperty({ example: 'target-id' })
  @IsString()
  targetId: string;
}

export class StartHackDto {
  @ApiProperty({ enum: ['PERSONA', 'HOST'], example: 'PERSONA' })
  @IsEnum(['PERSONA', 'HOST'])
  targetType: 'PERSONA' | 'HOST';

  @ApiProperty({ example: 'target-id' })
  @IsString()
  targetId: string;

  @ApiProperty({ example: 'LLS' })
  @IsString()
  elementType: string;

  @ApiProperty({ required: false, example: 'element-id' })
  @IsOptional()
  @IsString()
  elementId?: string;
}

export class CompleteHackDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  success: boolean;
}

export class StealSinDto {
  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  sessionId: string;
}

export class TransferFundsDto {
  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  sessionId: string;
}

export class BrickDeviceOpDto {
  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'device-id' })
  @IsString()
  deviceId: string;
}

export class DownloadFileDto {
  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'file-id' })
  @IsString()
  fileId: string;
}
