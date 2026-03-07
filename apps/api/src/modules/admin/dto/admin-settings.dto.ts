import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingDto {
  @ApiProperty({ example: '3600' })
  @IsString()
  value: string;
}

export class SettingItemDto {
  @ApiProperty({ example: 'subscription_period_seconds' })
  @IsString()
  key: string;

  @ApiProperty({ example: '3600' })
  @IsString()
  value: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ type: [SettingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingItemDto)
  settings: SettingItemDto[];
}
