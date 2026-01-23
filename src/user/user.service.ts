import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { HashingService } from 'src/common/services/hashing.service';
import { AuthApiService } from 'src/common/services/auth-api.service';
import { IdentifierType } from 'src/common/constants/identifier-type.enum';
import { SetPasswordDto } from './dto/set-password.dto';
import { AuthenticateUserDto } from './dto/authenticate-user.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { ERROR_MESSAGES } from '../common/constants/error-messages.constants';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    private readonly authApiService: AuthApiService,
  ) {}

  async create(
    createUserDto: CreateUserDto | RegisterUserDto,
  ): Promise<UserResponseDto> {
    const { email, phone, username, password } = createUserDto;
    const hashedPassword = await this.hashingService.hash(password);

    await this.validateUniqueFields(email, phone, username);

    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    const savedUser = await this.userRepository.save(newUser);
    return this.mapToDto(savedUser);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find();
    return this.mapToDtos(users);
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.findUserById(id);
    return this.mapToDto(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findUserById(id);

    const { email, phone, username } = updateUserDto;
    await this.validateUniqueFields(email, phone, username, user);

    const updatedUser = this.userRepository.merge(user, updateUserDto);
    const savedUser = await this.userRepository.save(updatedUser);
    return this.mapToDto(savedUser);
  }

  async updatePassword(
    id: number,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.findUserById(id);

    if (!user.password)
      throw new ForbiddenException(ERROR_MESSAGES.USER_NO_PASSWORD);

    const isOldPasswordCorrect = await this.hashingService.compare(
      updatePasswordDto.oldPassword,
      user.password,
    );

    if (!isOldPasswordCorrect) {
      throw new ForbiddenException(ERROR_MESSAGES.USER_INVALID_OLD_PASSWORD);
    }

    if (updatePasswordDto.oldPassword === updatePasswordDto.newPassword) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NEW_PASSWORD_SAME);
    }

    user.password = await this.hashingService.hash(
      updatePasswordDto.newPassword,
    );
    await this.userRepository.save(user);
    await this.authApiService.revokeUserTokens(id);
  }

  async setPassword(id: number, setPasswordDto: SetPasswordDto): Promise<void> {
    const user = await this.findUserById(id);

    if (user.password) {
      throw new BadRequestException(ERROR_MESSAGES.USER_ALREADY_HAS_PASSWORD);
    }

    user.password = await this.hashingService.hash(setPasswordDto.password);

    await this.userRepository.save(user);
    await this.authApiService.revokeUserTokens(id);
  }

  async remove(id: number): Promise<UserResponseDto> {
    const user = await this.findUserById(id);
    const removedUser = await this.userRepository.remove(user);
    await this.authApiService.revokeUserTokens(id);
    return this.mapToDto(removedUser);
  }

  private async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user)
      throw new NotFoundException(ERROR_MESSAGES.USER_WITH_ID_NOT_FOUND(id));

    return user;
  }

  private async checkUnique(
    field: IdentifierType,
    value: string,
    excludeId?: number,
  ): Promise<void> {
    const where = excludeId
      ? { [field]: value, id: Not(excludeId) }
      : { [field]: value };

    const existing = await this.userRepository.findOneBy(where);

    if (existing) {
      throw new ConflictException(
        ERROR_MESSAGES.USER_ALREADY_EXISTS(field, value),
      );
    }
  }

  private async validateUniqueFields(
    email?: string,
    phone?: string,
    username?: string,
    currentUser?: User,
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    if (email) {
      const excludeId = currentUser ? currentUser.id : undefined;
      checks.push(this.checkUnique(IdentifierType.EMAIL, email, excludeId));
    }
    if (phone) {
      const excludeId = currentUser ? currentUser.id : undefined;
      checks.push(this.checkUnique(IdentifierType.PHONE, phone, excludeId));
    }
    if (username) {
      const excludeId = currentUser ? currentUser.id : undefined;
      checks.push(
        this.checkUnique(IdentifierType.USERNAME, username, excludeId),
      );
    }

    await Promise.all(checks);
  }

  private mapToDto(entity: User): UserResponseDto {
    return plainToInstance(UserResponseDto, entity, {
      excludeExtraneousValues: true,
    });
  }

  private mapToDtos(entities: User[]): UserResponseDto[] {
    return entities.map((entity) => this.mapToDto(entity));
  }

  async findByField(field: IdentifierType, value: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ [field]: value });

    if (!user) {
      throw new NotFoundException(
        ERROR_MESSAGES.USER_WITH_FIELD_NOT_FOUND(field, value),
      );
    }

    return user;
  }

  async generateUniqueUsernameByEmail(email: string): Promise<string> {
    let baseUsername = email.split('@')[0].toLowerCase();

    baseUsername = baseUsername.replace(/[^a-z0-9]/g, '');

    if (baseUsername.length < 3) {
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      baseUsername = `user${randomNumber}`;
    }

    const MAX_BASE_LENGTH = 25;
    if (baseUsername.length > MAX_BASE_LENGTH) {
      baseUsername = baseUsername.substring(0, MAX_BASE_LENGTH);
    }

    let username = baseUsername;
    let counter = 0;

    while (await this.userRepository.findOne({ where: { username } })) {
      counter++;
      username = `${baseUsername}${counter}`;
      if (username.length > 30) {
        const availableBaseLength = MAX_BASE_LENGTH - counter.toString().length;
        username = `${baseUsername.substring(0, availableBaseLength)}${counter}`;
      }
    }

    return username;
  }

  async findOrCreateUserByOauth(
    oauthLoginDto: OAuthLoginDto,
  ): Promise<UserResponseDto> {
    const user: User | null = await this.userRepository.findOneBy({
      email: oauthLoginDto.email,
    });

    if (user) {
      return this.mapToDto(user);
    }

    const username: string = await this.generateUniqueUsernameByEmail(
      oauthLoginDto.email,
    );

    const newUser: User = this.userRepository.create({
      email: oauthLoginDto.email,
      username: username,
      provider: oauthLoginDto.provider,
      password: null,
      phone: null,
    });

    await this.userRepository.save(newUser);

    return this.mapToDto(newUser);
  }

  async authenticateUser(
    authenticateUserDto: AuthenticateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findByField(
      authenticateUserDto.identifierType,
      authenticateUserDto.identifier,
    );
    if (!user.password) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NO_PASSWORD);
    }

    const isPasswordValid = await this.hashingService.compare(
      authenticateUserDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_INVALID_PASSWORD);
    }

    return this.mapToDto(user);
  }
}
