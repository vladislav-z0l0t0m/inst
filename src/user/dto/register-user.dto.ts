import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Username of the user (min 3 characters, max - 30)',
    example: 'Mikle_Jordan',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Email address of the user (min 5 characters, max - 255)',
    example: 'jordan@mail.ru',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(5)
  email: string;

  @ApiPropertyOptional({
    description: 'Phone number of the user (min 10 characters, max - 15)',
    example: '+1234567890',
  })
  @Matches(/^\+\d{10,15}$/, {
    message: 'Number must be in correct format',
  })
  @IsOptional()
  @MaxLength(15)
  @MinLength(10)
  phone?: string;

  @ApiProperty({
    description: 'User password (min 6 characters, max - 255)',
    example: 'password4444',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(6)
  password: string;
}
