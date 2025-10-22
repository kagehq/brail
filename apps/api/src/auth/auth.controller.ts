import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Request a magic link
   */
  @Post('magic')
  async requestMagicLink(@Body() body: { email: string }) {
    const { email } = body;

    // Generate JWT token for magic link
    const token = await this.authService.generateMagicToken(email);
    const magicLink = `${process.env.DEV_PUBLIC_BASE || 'http://localhost:3000'}/v1/auth/callback?token=${token}`;

    // Send magic link via email
    await this.emailService.sendMagicLink(email, magicLink);

    return {
      message: 'Magic link sent! Check your email.',
    };
  }

  /**
   * Magic link callback - sets session cookie
   */
  @Get('callback')
  async callback(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Verify token and get/create user
      const user = await this.authService.processVerifiedToken(token);

      // Create session token
      const sessionToken = await this.authService.generateSessionToken(
        user.id,
      );

      // Set cookie
      const isProduction = process.env.NODE_ENV === 'production';
      
      // In production, set domain to parent domain to work across subdomains
      // (e.g., .brailhq.com works for both api.brailhq.com and app.brailhq.com)
      const cookieDomain = isProduction 
        ? `.${process.env.PUBLIC_HOST?.replace(/^api\./, '') || 'brailhq.com'}`
        : 'localhost';
      
      res.cookie('br_session', sessionToken, {
        httpOnly: false,
        secure: isProduction, // HTTPS only in production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: 'lax',
        domain: cookieDomain,
        path: '/',
      });

      // Redirect to web app
      const webUrl = process.env.WEB_URL || 'http://localhost:3001';
      res.redirect(`${webUrl}/sites`);
    } catch (error) {
      console.error('Magic link callback error:', error);
      
      // Redirect to login page with error message instead of returning JSON
      const webUrl = process.env.WEB_URL || 'http://localhost:3001';
      const errorMessage = encodeURIComponent(
        error.message === 'jwt expired' 
          ? 'This magic link has expired. Please request a new one.'
          : 'This magic link is invalid or has already been used. Please request a new one.'
      );
      
      res.redirect(`${webUrl}/login?error=${errorMessage}`);
    }
  }

  /**
   * Get current user info
   */
  @Get('me')
  async me(@Res() res: Response): Promise<void> {
    const token = (res.req as any).cookies?.br_session;

    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Not authenticated',
      });
      return;
    }

    try {
      const userId = await this.authService.verifySessionToken(token);
      const user = await this.authService.getUserById(userId);

      res.json(user);
    } catch (error) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid session',
      });
    }
  }

  /**
   * Logout - clear session cookie
   */
  @Post('logout')
  async logout(@Res() res: Response): Promise<void> {
    res.clearCookie('br_session', {
      domain: 'localhost',
      path: '/',
    });

    res.json({
      message: 'Logged out successfully',
    });
  }
}

