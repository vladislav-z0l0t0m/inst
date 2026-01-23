import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      return !!(await super.canActivate(context));
    } catch (error) {
      if (isPublic) {
        return true;
      }
      throw error;
    }
  }

  handleRequest<TUser = AuthUser>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser | null {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token expired');
    }

    if (info instanceof JsonWebTokenError) {
      if (isPublic) return null;
      throw new UnauthorizedException('Invalid token');
    }

    if (isPublic) {
      return user || null;
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
