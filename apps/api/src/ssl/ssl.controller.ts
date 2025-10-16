import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SslService } from './ssl.service';
import { AcmeService } from './acme.service';

@Controller()
export class SslController {
  constructor(
    private readonly sslService: SslService,
    private readonly acmeService: AcmeService,
  ) {}

  /**
   * HTTP-01 challenge endpoint (no auth required)
   * Let's Encrypt will call this to verify domain ownership
   */
  @Get('.well-known/acme-challenge/:token')
  async handleAcmeChallenge(@Param('token') token: string) {
    const response = this.acmeService.getChallengeResponse(token);

    if (!response) {
      throw new HttpException('Challenge not found', HttpStatus.NOT_FOUND);
    }

    // Return plain text response
    return response;
  }

  /**
   * Provision SSL certificate for a domain
   */
  @Post('v1/domains/:domainId/ssl/provision')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async provisionCertificate(@Param('domainId') domainId: string, @Req() req: any) {
    try {
      await this.sslService.provisionCertificate(domainId);
      
      return {
        success: true,
        message: 'SSL certificate provisioning started',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to provision certificate',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * List certificates for a site
   */
  @Get('v1/sites/:siteId/certificates')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async listCertificates(@Param('siteId') siteId: string) {
    return this.sslService.listCertificates(siteId);
  }

  /**
   * Renew a certificate
   */
  @Post('v1/certificates/:certificateId/renew')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async renewCertificate(@Param('certificateId') certificateId: string) {
    try {
      await this.sslService.renewCertificate(certificateId);
      
      return {
        success: true,
        message: 'Certificate renewal started',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to renew certificate',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Revoke a certificate
   */
  @Delete('v1/certificates/:certificateId')
  @UseGuards(AuthGuard(['jwt', 'bearer']))
  async revokeCertificate(@Param('certificateId') certificateId: string) {
    try {
      await this.sslService.revokeCertificate(certificateId);
      
      return {
        success: true,
        message: 'Certificate revoked',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to revoke certificate',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

