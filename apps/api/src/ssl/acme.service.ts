import { Injectable, Logger } from '@nestjs/common';
import * as acme from 'acme-client';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AcmeService {
  private readonly logger = new Logger(AcmeService.name);
  private readonly challenges = new Map<string, string>(); // Store HTTP-01 challenges temporarily

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create ACME client for a domain
   */
  private async getAcmeClient(domainId: string): Promise<acme.Client> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { certificates: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    // Use staging for development, production for live
    const directoryUrl = process.env.ACME_DIRECTORY_URL || acme.directory.letsencrypt.staging;

    let accountPrivateKey: Buffer;

    // Check if we have an existing account key
    const existingCert = domain.certificates[0];
    if (existingCert?.accountKey) {
      // Decrypt the stored account key
      accountPrivateKey = Buffer.from(this.decrypt(existingCert.accountKey), 'utf8');
    } else {
      // Generate new account key
      accountPrivateKey = await acme.crypto.createPrivateKey();
    }

    const client = new acme.Client({
      directoryUrl,
      accountKey: accountPrivateKey,
    });

    return client;
  }

  /**
   * Request SSL certificate for a domain
   */
  async requestCertificate(domainId: string): Promise<void> {
    this.logger.log(`Starting certificate request for domain ${domainId}`);

    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { certificates: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!domain) {
      throw new Error('Domain not found');
    }

    if (domain.status !== 'verified') {
      throw new Error('Domain must be verified before requesting certificate');
    }

    // Store the account private key so we can save it later
    let accountPrivateKey: Buffer;
    const existingCert = domain.certificates[0];
    
    if (existingCert?.accountKey) {
      // Reuse existing account key
      accountPrivateKey = Buffer.from(this.decrypt(existingCert.accountKey), 'utf8');
    } else {
      // Generate new account key
      accountPrivateKey = await acme.crypto.createPrivateKey();
    }

    try {
      // Update domain status
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { 
          status: 'securing', 
          certStatus: 'pending',
          certProvider: 'acme',
        },
      });

      const client = await this.getAcmeClient(domainId);

      // Create certificate signing request
      const [privateKey, csr] = await acme.crypto.createCsr({
        commonName: domain.hostname,
      });

      // Create order
      const order = await client.createOrder({
        identifiers: [
          { type: 'dns', value: domain.hostname },
        ],
      });

      this.logger.log(`Created ACME order for ${domain.hostname}`);

      // Get authorizations
      const authorizations = await client.getAuthorizations(order);

      for (const authz of authorizations) {
        // Find HTTP-01 challenge
        const challenge = authz.challenges.find(c => c.type === 'http-01');
        
        if (!challenge) {
          throw new Error('No HTTP-01 challenge available');
        }

        // Get key authorization
        const keyAuthorization = await client.getChallengeKeyAuthorization(challenge);
        
        // Store challenge for HTTP verification
        const challengeToken = challenge.token;
        this.challenges.set(challengeToken, keyAuthorization);

        this.logger.log(`HTTP-01 challenge ready: ${challengeToken}`);

        // Notify ACME server we're ready
        await client.completeChallenge(challenge);
        
        // Wait for validation
        await client.waitForValidStatus(challenge);

        this.logger.log(`Challenge validated for ${domain.hostname}`);
      }

      // Finalize order
      await client.finalizeOrder(order, csr);
      
      // Get certificate
      const cert = await client.getCertificate(order);

      this.logger.log(`Certificate issued for ${domain.hostname}`);

      // Parse certificate to get expiration
      const x509 = await acme.crypto.readCertificateInfo(cert);
      
      // Store certificate in database
      await this.prisma.sslCertificate.create({
        data: {
          domainId,
          hostname: domain.hostname,
          certPem: cert,
          keyPem: this.encrypt(privateKey.toString()),
          accountKey: this.encrypt(accountPrivateKey.toString()),
          orderUrl: order.url,
          issuer: x509.issuer.commonName || 'Let\'s Encrypt',
          issuedAt: x509.notBefore,
          expiresAt: x509.notAfter,
          status: 'active',
          autoRenew: true,
        },
      });

      // Update domain status
      await this.prisma.domain.update({
        where: { id: domainId },
        data: { 
          status: 'active', 
          certStatus: 'issued',
        },
      });

      this.logger.log(`Certificate stored and activated for ${domain.hostname}`);

    } catch (error) {
      this.logger.error(`Failed to request certificate for ${domain.hostname}:`, error);

      await this.prisma.domain.update({
        where: { id: domainId },
        data: { 
          status: 'failed', 
          certStatus: 'failed',
        },
      });

      throw error;
    }
  }

  /**
   * Get HTTP-01 challenge response
   */
  getChallengeResponse(token: string): string | undefined {
    return this.challenges.get(token);
  }

  /**
   * Clear challenge after use
   */
  clearChallenge(token: string): void {
    this.challenges.delete(token);
  }

  /**
   * Renew certificate before expiration
   */
  async renewCertificate(certificateId: string): Promise<void> {
    this.logger.log(`Renewing certificate ${certificateId}`);

    const cert = await this.prisma.sslCertificate.findUnique({
      where: { id: certificateId },
      include: { domain: true },
    });

    if (!cert) {
      throw new Error('Certificate not found');
    }

    try {
      // Mark old certificate as expiring
      await this.prisma.sslCertificate.update({
        where: { id: certificateId },
        data: { status: 'expiring' },
      });

      // Request new certificate
      await this.requestCertificate(cert.domainId);

      this.logger.log(`Certificate renewed for ${cert.hostname}`);

    } catch (error) {
      this.logger.error(`Failed to renew certificate:`, error);
      
      await this.prisma.sslCertificate.update({
        where: { id: certificateId },
        data: { 
          status: 'failed',
          lastError: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Check for expiring certificates and renew them
   * Should be called by a cron job
   */
  async checkAndRenewExpiringCertificates(): Promise<void> {
    this.logger.log('Checking for expiring certificates...');

    // Find certificates expiring in the next 30 days
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);

    const expiringCerts = await this.prisma.sslCertificate.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        expiresAt: {
          lte: expiringDate,
        },
      },
    });

    this.logger.log(`Found ${expiringCerts.length} certificates to renew`);

    for (const cert of expiringCerts) {
      try {
        await this.renewCertificate(cert.id);
      } catch (error) {
        this.logger.error(`Failed to renew certificate ${cert.id}:`, error);
        // Continue with next certificate
      }
    }
  }

  /**
   * Simple encryption for storing keys (you should use a proper KMS in production)
   */
  private encrypt(text: string): string {
    const secret = process.env.ENCRYPTION_KEY || 'changeme-use-real-encryption-key';
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Simple decryption for retrieving keys
   */
  private decrypt(text: string): string {
    const secret = process.env.ENCRYPTION_KEY || 'changeme-use-real-encryption-key';
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

