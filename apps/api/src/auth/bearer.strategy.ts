import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from './auth.service';

@Injectable()
export class BearerStrategy extends PassportStrategy(Strategy, 'bearer') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(token: string) {
    try {
      const { userId, siteId } = await this.authService.verifyPAT(token);
      return { userId, siteId };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

