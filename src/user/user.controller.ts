import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ParamsIdDto } from 'src/common/dto/params-id.dto';
import {
  ApiTags,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-response.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import {
  CurrentUser,
  AuthUser,
} from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Users')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post()
  @ApiCreatedResponse({
    description: 'User created.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Public()
  @Get()
  @ApiOkResponse({
    description: 'Users returned',
    type: [UserResponseDto],
  })
  findAll(): Promise<UserResponseDto[]> {
    return this.userService.findAll();
  }

  @Get('me')
  @ApiOkResponse({
    description: 'Current user returned',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  getCurrentUser(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.userService.findOne(user.userId);
  }

  @Patch('me')
  @ApiOkResponse({
    description: 'Current user updated',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  updateCurrentUser(
    @CurrentUser() user: AuthUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(user.userId, updateUserDto);
  }

  @Patch('me/password')
  @ApiOkResponse({
    description: 'Current user password updated',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiForbiddenResponse({ description: 'Invalid old password' })
  updateCurrentUserPassword(
    @CurrentUser() user: AuthUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    return this.userService.updatePassword(user.userId, updatePasswordDto);
  }

  @Patch('me/password/set')
  @ApiOkResponse({
    description: 'Current user password setted',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiForbiddenResponse({ description: 'This account already has a password' })
  setCurrentUserPassword(
    @CurrentUser() user: AuthUser,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<void> {
    return this.userService.setPassword(user.userId, setPasswordDto);
  }

  @Delete('me')
  @ApiOkResponse({
    description: 'Current user deleted',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  removeCurrentUser(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.userService.remove(user.userId);
  }
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOkResponse({
    description: 'User returned',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  findOne(@Param() { id }: ParamsIdDto): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }
}
