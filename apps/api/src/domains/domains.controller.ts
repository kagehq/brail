import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DomainsService } from './domains.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  /**
   * Add a custom domain to a site
   */
  @Post('sites/:siteId/domains')
  async addDomain(
    @Param('siteId') siteId: string,
    @Body('hostname') hostname: string,
  ) {
    return this.domainsService.addDomain(siteId, hostname);
  }

  /**
   * List all domains for a site
   */
  @Get('sites/:siteId/domains')
  async listDomains(@Param('siteId') siteId: string) {
    return this.domainsService.listDomains(siteId);
  }

  /**
   * Get a specific domain
   */
  @Get('sites/:siteId/domains/:id')
  async getDomain(@Param('id') domainId: string) {
    return this.domainsService.getDomain(domainId);
  }

  /**
   * Verify domain CNAME record
   */
  @Post('sites/:siteId/domains/:id/verify')
  async verifyDomain(@Param('id') domainId: string) {
    return this.domainsService.verifyDomain(domainId);
  }

  /**
   * Remove a domain
   */
  @Delete('sites/:siteId/domains/:id')
  async removeDomain(@Param('id') domainId: string) {
    return this.domainsService.removeDomain(domainId);
  }
}
