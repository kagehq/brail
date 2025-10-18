import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { encryptValue, decryptValue, getEncryptionKey } from '@br/shared/src/crypto.js';

const VALID_SCOPES = [
  'build',
  'runtime:preview',
  'runtime:production',
  'adapter:vercel',
  'adapter:cloudflare',
  'adapter:cloudflare-sandbox',
  'adapter:vercel-sandbox',
  'adapter:netlify',
  'adapter:railway',
  'adapter:fly',
  'adapter:render',
  'adapter:s3',
  'adapter:github-pages',
  'adapter:ftp',
  'adapter:ssh-rsync',
  'ssh-agent',
] as const;

type EnvVarScope = typeof VALID_SCOPES[number];

const KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/;
const MAX_KEY_LENGTH = 255;
const MAX_VALUE_LENGTH = 10000;

export interface SetEnvVarDto {
  scope: string;
  key: string;
  value: string;
  isSecret?: boolean;
}

export interface EnvVarResponse {
  id: string;
  scope: string;
  key: string;
  value: string; // Masked if secret
  isSecret: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EnvService {
  private readonly logger = new Logger(EnvService.name);
  private encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    try {
      this.encryptionKey = getEncryptionKey();
    } catch (error) {
      this.logger.warn('ENCRYPTION_KEY not set - env var encryption will fail');
    }
  }

  /**
   * Validate environment variable key
   */
  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Key is required');
    }

    if (key.length > MAX_KEY_LENGTH) {
      throw new BadRequestException(`Key must be ${MAX_KEY_LENGTH} characters or less`);
    }

    if (!KEY_PATTERN.test(key)) {
      throw new BadRequestException(
        'Key must start with A-Z or _, and contain only A-Z, 0-9, and _',
      );
    }
  }

  /**
   * Validate environment variable value
   */
  private validateValue(value: string): void {
    if (value === undefined || value === null) {
      throw new BadRequestException('Value is required');
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Value must be a string');
    }

    if (value.length > MAX_VALUE_LENGTH) {
      throw new BadRequestException(`Value must be ${MAX_VALUE_LENGTH} characters or less`);
    }
  }

  /**
   * Validate scope
   */
  private validateScope(scope: string): void {
    if (!VALID_SCOPES.includes(scope as EnvVarScope)) {
      throw new BadRequestException(
        `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}`,
      );
    }
  }

  /**
   * List environment variables for a site and scope
   */
  async list(siteId: string, scope?: string): Promise<EnvVarResponse[]> {
    if (scope) {
      this.validateScope(scope);
    }

    const envVars = await this.prisma.envVar.findMany({
      where: {
        siteId,
        ...(scope && { scope }),
      },
      orderBy: [
        { scope: 'asc' },
        { key: 'asc' },
      ],
    });

    return envVars.map(envVar => ({
      id: envVar.id,
      scope: envVar.scope,
      key: envVar.key,
      value: envVar.isSecret ? '••••••••' : decryptValue(envVar.valueEnc, this.encryptionKey),
      isSecret: envVar.isSecret,
      createdBy: envVar.createdBy || undefined,
      updatedBy: envVar.updatedBy || undefined,
      createdAt: envVar.createdAt,
      updatedAt: envVar.updatedAt,
    }));
  }

  /**
   * Get a single environment variable (with decrypted value)
   */
  async get(siteId: string, scope: string, key: string): Promise<EnvVarResponse> {
    this.validateScope(scope);
    this.validateKey(key);

    const envVar = await this.prisma.envVar.findUnique({
      where: {
        siteId_scope_key: {
          siteId,
          scope,
          key,
        },
      },
    });

    if (!envVar) {
      throw new NotFoundException('Environment variable not found');
    }

    return {
      id: envVar.id,
      scope: envVar.scope,
      key: envVar.key,
      value: envVar.isSecret ? '••••••••' : decryptValue(envVar.valueEnc, this.encryptionKey),
      isSecret: envVar.isSecret,
      createdBy: envVar.createdBy || undefined,
      updatedBy: envVar.updatedBy || undefined,
      createdAt: envVar.createdAt,
      updatedAt: envVar.updatedAt,
    };
  }

  /**
   * Reveal the actual value of a secret environment variable
   */
  async reveal(siteId: string, scope: string, key: string): Promise<string> {
    this.validateScope(scope);
    this.validateKey(key);

    const envVar = await this.prisma.envVar.findUnique({
      where: {
        siteId_scope_key: {
          siteId,
          scope,
          key,
        },
      },
    });

    if (!envVar) {
      throw new NotFoundException('Environment variable not found');
    }

    return decryptValue(envVar.valueEnc, this.encryptionKey);
  }

  /**
   * Set (create or update) an environment variable
   */
  async set(
    siteId: string,
    dto: SetEnvVarDto,
    userId?: string,
    userEmail?: string,
    req?: any,
  ): Promise<EnvVarResponse> {
    this.validateScope(dto.scope);
    this.validateKey(dto.key);
    this.validateValue(dto.value);

    // Get site to fetch orgId
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Encrypt value
    const valueEnc = encryptValue(dto.value, this.encryptionKey);

    // Upsert
    const envVar = await this.prisma.envVar.upsert({
      where: {
        siteId_scope_key: {
          siteId,
          scope: dto.scope,
          key: dto.key,
        },
      },
      create: {
        orgId: site.orgId,
        siteId,
        scope: dto.scope,
        key: dto.key,
        valueEnc,
        isSecret: dto.isSecret !== false, // Default to true
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        valueEnc,
        isSecret: dto.isSecret !== false,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.audit.record('env.set', {
      orgId: site.orgId,
      siteId,
      userId,
      userEmail,
      req,
      meta: {
        scope: dto.scope,
        key: dto.key,
        isSecret: envVar.isSecret,
      },
    });

    this.logger.log(`Set env var: ${dto.scope}:${dto.key} for site ${siteId}`);

    return {
      id: envVar.id,
      scope: envVar.scope,
      key: envVar.key,
      value: envVar.isSecret ? '••••••••' : dto.value,
      isSecret: envVar.isSecret,
      createdBy: envVar.createdBy || undefined,
      updatedBy: envVar.updatedBy || undefined,
      createdAt: envVar.createdAt,
      updatedAt: envVar.updatedAt,
    };
  }

  /**
   * Delete an environment variable
   */
  async delete(
    siteId: string,
    scope: string,
    key: string,
    userId?: string,
    userEmail?: string,
    req?: any,
  ): Promise<void> {
    this.validateScope(scope);
    this.validateKey(key);

    // Get site to fetch orgId
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const envVar = await this.prisma.envVar.findUnique({
      where: {
        siteId_scope_key: {
          siteId,
          scope,
          key,
        },
      },
    });

    if (!envVar) {
      throw new NotFoundException('Environment variable not found');
    }

    await this.prisma.envVar.delete({
      where: {
        siteId_scope_key: {
          siteId,
          scope,
          key,
        },
      },
    });

    // Audit log
    await this.audit.record('env.deleted', {
      orgId: site.orgId,
      siteId,
      userId,
      userEmail,
      req,
      meta: {
        scope,
        key,
      },
    });

    this.logger.log(`Deleted env var: ${scope}:${key} for site ${siteId}`);
  }

  /**
   * Export environment variables for a specific scope (for injection into builds/adapters)
   * Returns decrypted key-value pairs
   */
  async exportForScope(siteId: string, scope: string): Promise<Record<string, string>> {
    this.validateScope(scope);

    const envVars = await this.prisma.envVar.findMany({
      where: {
        siteId,
        scope,
      },
    });

    const result: Record<string, string> = {};

    for (const envVar of envVars) {
      try {
        result[envVar.key] = decryptValue(envVar.valueEnc, this.encryptionKey);
      } catch (error) {
        this.logger.error(`Failed to decrypt env var ${envVar.key}: ${error.message}`);
        // Skip this variable
      }
    }

    return result;
  }

  /**
   * Bulk set environment variables
   */
  async bulkSet(
    siteId: string,
    scope: string,
    vars: Record<string, string>,
    isSecret: boolean = true,
    userId?: string,
    userEmail?: string,
    req?: any,
  ): Promise<number> {
    this.validateScope(scope);

    let count = 0;

    for (const [key, value] of Object.entries(vars)) {
      try {
        await this.set(
          siteId,
          { scope, key, value, isSecret },
          userId,
          userEmail,
          req,
        );
        count++;
      } catch (error) {
        this.logger.error(`Failed to set ${key}: ${error.message}`);
        // Continue with next variable
      }
    }

    return count;
  }

  /**
   * Delete all environment variables for a scope
   */
  async deleteScope(
    siteId: string,
    scope: string,
    userId?: string,
    userEmail?: string,
    req?: any,
  ): Promise<number> {
    this.validateScope(scope);

    // Get site to fetch orgId
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const result = await this.prisma.envVar.deleteMany({
      where: {
        siteId,
        scope,
      },
    });

    // Audit log
    if (result.count > 0) {
      await this.audit.record('env.scope_deleted', {
        orgId: site.orgId,
        siteId,
        userId,
        userEmail,
        req,
        meta: {
          scope,
          count: result.count,
        },
      });
    }

    this.logger.log(`Deleted ${result.count} env vars for scope ${scope} in site ${siteId}`);

    return result.count;
  }
}
