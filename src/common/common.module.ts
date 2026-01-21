import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { HashingService } from './services/hashing.service';
import { AuthApiService } from './services/auth-api.service';
import { MinioService } from './services/minio.service';
import { FileService } from './services/file.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [PassportModule],
  providers: [
    HashingService,
    AuthApiService,
    MinioService,
    FileService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [HashingService, AuthApiService, MinioService, FileService],
  controllers: [],
})
export class CommonModule {}
