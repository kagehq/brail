import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttler guard that tracks rate limits by email address
 * instead of IP address for magic link requests
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // For magic link requests, track by email address
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `email:${email.toLowerCase()}`;
    }
    
    // Fallback to IP-based tracking
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const email = request.body?.email;
    
    const message = email
      ? `Too many magic link requests for this email address. Please try again later.`
      : `Too many requests from this IP address. Please try again later.`;
    
    throw new ThrottlerException(message);
  }
}

