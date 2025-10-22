import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Generate magic link token
   */
  async generateMagicToken(email: string): Promise<string> {
    return this.jwtService.sign(
      { email, type: 'magic' },
      { expiresIn: '15m' },
    );
  }

  /**
   * Verify magic token and get/create user
   */
  async verifyMagicToken(token: string) {
    const payload = this.jwtService.verify(token);

    if (payload.type !== 'magic') {
      throw new Error('Invalid token type');
    }

    // Get or create user
    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
        },
      });

      // Create default org for user
      const org = await this.prisma.org.create({
        data: {
          name: `${payload.email}'s Org`,
        },
      });

      // Add user to org as owner
      await this.prisma.orgMember.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'owner',
        },
      });
    }

    await this.acceptPendingInvites(user);

    return user;
  }

  /**
   * Generate session token
   */
  async generateSessionToken(userId: string): Promise<string> {
    // Session tokens last 30 days (much longer than cookie for flexibility)
    return this.jwtService.sign(
      { userId, type: 'session' },
      { expiresIn: '30d' }
    );
  }

  /**
   * Verify session token
   */
  async verifySessionToken(token: string): Promise<string> {
    const payload = this.jwtService.verify(token);

    if (payload.type !== 'session') {
      throw new Error('Invalid token type');
    }

    return payload.userId;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
  }

  /**
   * Verify Personal Access Token
   */
  async verifyPAT(token: string): Promise<{ userId: string; siteId?: string }> {
    const tokenRecord = await this.prisma.token.findUnique({
      where: { hash: await this.hashToken(token) },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new Error('Invalid token');
    }

    // Check expiration
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      throw new Error('Token expired');
    }

    return {
      userId: tokenRecord.userId,
      siteId: tokenRecord.siteId || undefined,
    };
  }

  /**
   * Hash token for storage
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * Generate random token
   */
  generateToken(): string {
    // Generate a random token (64 characters)
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'br_';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Attach user to any pending organization invites matching their email
   */
  private async acceptPendingInvites(user: { id: string; email: string }) {
    const invites = await this.prisma.orgInvite.findMany({
      where: {
        email: user.email,
        status: 'pending',
      },
    });

    if (invites.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const invite of invites) {
        const membership = await tx.orgMember.findFirst({
          where: {
            orgId: invite.orgId,
            userId: user.id,
          },
        });

        if (!membership) {
          await tx.orgMember.create({
            data: {
              orgId: invite.orgId,
              userId: user.id,
              role: invite.role,
            },
          });
        }

        await tx.orgInvite.update({
          where: { id: invite.id },
          data: {
            status: 'accepted',
            respondedAt: new Date(),
          },
        });
      }
    });
  }
}
