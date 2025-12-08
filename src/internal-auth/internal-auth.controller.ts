import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { AuthenticateUserDto } from '../user/dto/authenticate-user.dto';
import { OAuthLoginDto } from '../user/dto/oauth-login.dto';
import { RegisterUserDto } from '../user/dto/register-user.dto';
import { UserService } from '../user/user.service';
import { InternalAuthGuard } from './internal-auth.guard';

@ApiTags('Internal Auth')
@Controller('internal/auth')
@UseGuards(InternalAuthGuard)
export class InternalAuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiCreatedResponse({
    description: 'User registered successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'User already exists' })
  @HttpCode(HttpStatus.CREATED)
  async registerUser(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.create(registerUserDto);
  }

  @Post('authenticate')
  @ApiOkResponse({
    description: 'User authenticated',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async authenticateUser(
    @Body() authenticateUserDto: AuthenticateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.authenticateUser(authenticateUserDto);
  }

  @Post('oauth')
  @ApiOkResponse({
    description: 'User found or created via OAuth',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid OAuth data' })
  @HttpCode(HttpStatus.OK)
  async handleOAuthLogin(
    @Body() oauthLoginDto: OAuthLoginDto,
  ): Promise<UserResponseDto> {
    return this.userService.findOrCreateUserByOauth(oauthLoginDto);
  }
}
