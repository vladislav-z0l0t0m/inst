import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

interface JwtPayload {
  userId: number;
  iat?: number;
  exp?: number;
}

const cookieExtractor = (req: Request): string | null => {
  let token: string | null = null;

  if (
    req?.cookies?.accessToken &&
    typeof req.cookies.accessToken === 'string'
  ) {
    token = req.cookies.accessToken;
  }

  if (!token && req?.headers?.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  validate(payload: JwtPayload): { userId: number } {
    if (!payload.userId) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }

    return { userId: payload.userId };
  }
}
