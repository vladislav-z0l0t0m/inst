import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UserResponseDto } from 'src/user/dto/user-response.dto';
import { ParamsIdDto } from 'src/common/dto/params-id.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Admin')
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Delete('users/all')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'All users deleted',
  })
  async removeAllUsers(): Promise<void> {
    await this.adminService.removeAllUsers();
  }

  @Delete('users/:id')
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiOkResponse({
    description: 'User deleted',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async remove(@Param() { id }: ParamsIdDto): Promise<void> {
    await this.adminService.removeUser(id);
  }
}
