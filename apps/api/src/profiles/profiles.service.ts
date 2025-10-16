import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdapterRegistry } from '../adapters/adapter.registry';
import { encryptJSON, decryptJSON, maskSecrets } from '@br/shared/src/crypto.js';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapterRegistry: AdapterRegistry,
  ) {
    // Load encryption key from environment
    const keyHex = process.env.SECRET_KEY_256;
    if (!keyHex) {
      throw new Error(
        'SECRET_KEY_256 environment variable is required (32-byte hex string)',
      );
    }

    this.encryptionKey = Buffer.from(keyHex, 'hex');

    if (this.encryptionKey.length !== 32) {
      throw new Error('SECRET_KEY_256 must be exactly 32 bytes (64 hex chars)');
    }
  }

  async create(
    siteId: string,
    name: string,
    adapterName: string,
    config: unknown,
  ) {
    // Validate adapter exists
    const adapter = this.adapterRegistry.getAdapter(adapterName);

    // Validate config
    const validation = adapter.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.reason}`);
    }

    // Encrypt config
    const configEnc = encryptJSON(config, this.encryptionKey);

    // Create profile
    const profile = await this.prisma.connectionProfile.create({
      data: {
        siteId,
        name,
        adapter: adapterName,
        configEnc: configEnc as any,
      },
    });

    this.logger.log(
      `Created profile ${profile.id} for site ${siteId} (adapter: ${adapterName})`,
    );

    return this.maskProfile(profile);
  }

  async list(siteId: string) {
    const profiles = await this.prisma.connectionProfile.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.map((p) => this.maskProfile(p));
  }

  async getById(profileId: string) {
    const profile = await this.prisma.connectionProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.maskProfile(profile);
  }

  async update(profileId: string, name?: string, config?: unknown) {
    const profile = await this.getById(profileId);

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (config) {
      // Validate new config
      const adapter = this.adapterRegistry.getAdapter(profile.adapter);
      const validation = adapter.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid config: ${validation.reason}`);
      }

      // Encrypt new config
      updateData.configEnc = encryptJSON(config, this.encryptionKey);
    }

    const updated = await this.prisma.connectionProfile.update({
      where: { id: profileId },
      data: updateData,
    });

    this.logger.log(`Updated profile ${profileId}`);

    return this.maskProfile(updated);
  }

  async delete(profileId: string) {
    await this.prisma.connectionProfile.delete({
      where: { id: profileId },
    });

    this.logger.log(`Deleted profile ${profileId}`);

    return { success: true };
  }

  async setDefault(siteId: string, profileId: string) {
    // Unset all defaults for this site
    await this.prisma.connectionProfile.updateMany({
      where: { siteId },
      data: { isDefault: false },
    });

    // Set this one as default
    const profile = await this.prisma.connectionProfile.update({
      where: { id: profileId },
      data: { isDefault: true },
    });

    this.logger.log(`Set profile ${profileId} as default for site ${siteId}`);

    return this.maskProfile(profile);
  }

  /**
   * Get decrypted config for internal use
   */
  async getDecryptedConfig(profileId: string): Promise<any> {
    const profile = await this.prisma.connectionProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return decryptJSON(profile.configEnc as any, this.encryptionKey);
  }

  /**
   * Get default profile for a site
   */
  async getDefault(siteId: string) {
    const profile = await this.prisma.connectionProfile.findFirst({
      where: { siteId, isDefault: true },
    });

    if (!profile) {
      throw new NotFoundException('No default profile set for this site');
    }

    return profile;
  }

  /**
   * Mask sensitive fields in profile for API responses
   */
  private maskProfile(profile: any) {
    const { configEnc, ...rest } = profile;

    // Decrypt and mask config for display
    const decrypted = decryptJSON(configEnc, this.encryptionKey);
    const masked = maskSecrets(decrypted);

    return {
      ...rest,
      config: masked,
    };
  }
}

