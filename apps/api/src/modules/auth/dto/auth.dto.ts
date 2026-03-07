import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'newuser' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'New Persona' })
  @IsString()
  @MinLength(1)
  personaName: string;
}

export class Verify2faDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyLogin2faDto {
  @ApiProperty({ description: 'User ID from login response' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}
