import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class BindDeviceDto {
  @ApiProperty({ example: 'DEVICE-CODE-123' })
  @IsString()
  code: string;
}

export class UnbindDeviceDto {
  @ApiProperty({ example: 'device-id' })
  @IsString()
  deviceId: string;
}

export class BrickDeviceDto {
  @ApiProperty({ example: 'hack-session-id' })
  @IsString()
  hackSessionId: string;
}
