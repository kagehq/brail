import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    // Get user's first org
    const orgMember = await this.prisma.orgMember.findFirst({
      where: { userId },
      include: { org: true },
    });

    if (!orgMember) {
      throw new NotFoundException('User has no organization');
    }

    const site = await this.prisma.site.create({
      data: {
        orgId: orgMember.orgId,
        name,
      },
    });

    return site;
  }

  async listByUser(userId: string) {
    const orgMembers = await this.prisma.orgMember.findMany({
      where: { userId },
      include: {
        org: {
          include: {
            sites: {
              include: {
                deploys: {
                  where: { status: 'active' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const sites = orgMembers.flatMap((om) => om.org.sites);
    return sites;
  }

  async getById(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: {
        deploys: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return {
      ...site,
      activeDeploy: site.deploys[0] || null,
    };
  }

  async listDeploys(siteId: string) {
    const deploys = await this.prisma.deploy.findMany({
      where: { siteId },
      orderBy: { createdAt: 'desc' },
    });

    return deploys;
  }

  async updateActiveDeploy(siteId: string, deployId: string) {
    return this.prisma.site.update({
      where: { id: siteId },
      data: { activeDeployId: deployId },
    });
  }

  async delete(siteId: string) {
    // Delete all deploys first (cascade should handle this, but being explicit)
    await this.prisma.deploy.deleteMany({
      where: { siteId },
    });

    // Delete the site
    await this.prisma.site.delete({
      where: { id: siteId },
    });

    return { success: true, message: 'Site deleted successfully' };
  }
}

