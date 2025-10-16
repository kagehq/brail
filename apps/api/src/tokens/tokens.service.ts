import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async create(
    userId: string,
    name: string,
    siteId?: string,
    scopes: string[] = ['deploy:write'],
    expiresAt?: Date,
  ) {
    // Generate plain token
    const tokenPlain = this.auth.generateToken();

    // Hash for storage
    const hash = await this.auth.hashToken(tokenPlain);

    // Create token record
    const token = await this.prisma.token.create({
      data: {
        userId,
        siteId: siteId || null,
        name,
        hash,
        scopes,
        expiresAt,
      },
    });

    return {
      token,
      tokenPlain,
    };
  }

  async listByUser(userId: string) {
    return this.prisma.token.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(tokenId: string) {
    await this.prisma.token.delete({
      where: { id: tokenId },
    });

    return { success: true };
  }
}

