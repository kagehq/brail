import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcmeService } from './acme.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly acme: AcmeService,
  ) {}

  /**
   * Provision SSL certificate for a domain
   */
  async provisionCertificate(domainId: string): Promise<void> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    if (domain.status !== 'verified') {
      throw new Error('Domain must be verified before provisioning SSL');
    }

    this.logger.log(`Provisioning SSL certificate for ${domain.hostname}`);

    try {
      await this.acme.requestCertificate(domainId);
    } catch (error) {
      this.logger.error(`Failed to provision certificate for ${domain.hostname}:`, error);
      throw error;
    }
  }

  /**
   * Get certificate for a domain
   */
  async getCertificate(hostname: string) {
    return this.prisma.sslCertificate.findFirst({
      where: {
        hostname,
        status: 'active',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * List all certificates for a site
   */
  async listCertificates(siteId: string) {
    return this.prisma.sslCertificate.findMany({
      where: {
        domain: {
          siteId,
        },
      },
      include: {
        domain: {
          select: {
            hostname: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Auto-renew expiring certificates (cron job)
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCertificateRenewal() {
    this.logger.log('Running certificate renewal check...');
    
    try {
      await this.acme.checkAndRenewExpiringCertificates();
    } catch (error) {
      this.logger.error('Certificate renewal check failed:', error);
    }
  }

  /**
   * Force renewal of a certificate
   */
  async renewCertificate(certificateId: string): Promise<void> {
    this.logger.log(`Manually renewing certificate ${certificateId}`);
    
    try {
      await this.acme.renewCertificate(certificateId);
    } catch (error) {
      this.logger.error(`Failed to renew certificate:`, error);
      throw error;
    }
  }

  /**
   * Revoke a certificate
   */
  async revokeCertificate(certificateId: string): Promise<void> {
    this.logger.log(`Revoking certificate ${certificateId}`);
    
    const cert = await this.prisma.sslCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!cert) {
      throw new Error('Certificate not found');
    }

    await this.prisma.sslCertificate.update({
      where: { id: certificateId },
      data: { 
        status: 'expired',
        autoRenew: false,
      },
    });

    this.logger.log(`Certificate revoked: ${certificateId}`);
  }
}

