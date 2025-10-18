import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isFQDN, verifyCNAME, buildCnameInstruction } from '@br/domain-utils';
import { SslService } from '../ssl/ssl.service';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sslService: SslService,
  ) {}

  /**
   * Add a custom domain to a site
   */
  async addDomain(siteId: string, hostname: string) {
    // Validate FQDN
    if (!isFQDN(hostname)) {
      throw new BadRequestException('Invalid domain name');
    }

    // Check if site exists
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Generate CNAME target
    const publicHost = process.env.PUBLIC_HOST || 'brail.local';
    const cnameTarget = `${siteId}.${publicHost}`;

    // Check if domain already exists
    const existing = await this.prisma.domain.findUnique({
      where: { hostname },
    });

    if (existing) {
      throw new BadRequestException('Domain already exists');
    }

    // Create domain
    const domain = await this.prisma.domain.create({
      data: {
        siteId,
        hostname,
        cnameTarget,
        status: 'pending',
      },
    });

    // Build DNS instructions
    const dnsInstruction = buildCnameInstruction(hostname, cnameTarget);

    return {
      domain,
      dnsInstruction,
    };
  }

  /**
   * List all domains for a site
   */
  async listDomains(siteId: string) {
    return this.prisma.domain.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single domain
   */
  async getDomain(domainId: string) {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain;
  }

  /**
   * Verify domain CNAME record
   */
  async verifyDomain(domainId: string) {
    const domain = await this.getDomain(domainId);

    this.logger.log(`Verifying CNAME for ${domain.hostname}`);

    // Check CNAME record
    const verification = await verifyCNAME(domain.hostname, domain.cnameTarget);

    // Update domain status
    const newStatus = verification.ok ? 'verified' : 'pending';
    
    const updated = await this.prisma.domain.update({
      where: { id: domainId },
      data: {
        status: newStatus,
        lastCheckedAt: new Date(),
      },
    });

    // If verified and ACME is enabled, kick off SSL provisioning
    if (verification.ok && process.env.ACME_AUTO_SSL === 'true') {
      this.logger.log(`Domain verified, queuing SSL certificate for ${domain.hostname}`);
      await this.requestCertificate(domainId);
    }

    return {
      domain: updated,
      verification,
    };
  }

  /**
   * Remove a domain
   */
  async removeDomain(domainId: string) {
    const domain = await this.getDomain(domainId);

    await this.prisma.domain.delete({
      where: { id: domainId },
    });

    return { success: true, hostname: domain.hostname };
  }

  /**
   * Request SSL certificate for a verified domain (stub for future ACME)
   */
  private async requestCertificate(domainId: string) {
    const domain = await this.getDomain(domainId);

    if (domain.status !== 'verified') {
      throw new BadRequestException('Domain must be verified before requesting SSL');
    }

    this.logger.log(`Scheduling SSL provisioning for ${domain.hostname}`);

    this.sslService
      .provisionCertificate(domainId)
      .then(() => {
        this.logger.log(`SSL provisioning completed for ${domain.hostname}`);
      })
      .catch((error: any) => {
        const message = error?.message || String(error);
        this.logger.error(`Failed to provision certificate for ${domain.hostname}: ${message}`);
      });

    return { queued: true };
  }
}
