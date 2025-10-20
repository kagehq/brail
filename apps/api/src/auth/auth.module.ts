import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtStrategy } from './jwt.strategy';
import { BearerStrategy } from './bearer.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '15m' }, // Magic links expire in 15 minutes
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy, BearerStrategy],
  exports: [AuthService],
})
export class AuthModule {}

