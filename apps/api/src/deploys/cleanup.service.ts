import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DeploysService } from './deploys.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deploysService: DeploysService,
  ) {}

  /**
   * Run cleanup every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredDeployments() {
    this.logger.log('Running ephemeral deployment cleanup...');

    try {
      // Find expired deployments
      // Note: isEphemeral and expiresAt will be available after running: pnpm prisma generate
      const expiredDeploys = await this.prisma.deploy.findMany({
        where: {
          ...(({ isEphemeral: true, expiresAt: { lte: new Date() } }) as any),
          status: {
            not: 'deleted', // Don't re-delete
          },
        },
        include: {
          site: {
            select: {
              id: true,
              name: true,
              orgId: true,
            },
          },
          releases: true,
        },
      }) as any;

      if (expiredDeploys.length === 0) {
        this.logger.log('No expired deployments found');
        return;
      }

      this.logger.log(`Found ${expiredDeploys.length} expired deployments`);

      // Delete each deployment
      for (const deploy of expiredDeploys) {
        try {
          this.logger.log(
            `Cleaning up expired deployment ${deploy.id} (site: ${deploy.site.name})`,
          );

          // Delete via DeploysService to cleanup storage + platform resources
          await this.deploysService.delete(deploy.id, null);

          this.logger.log(`Successfully deleted deployment ${deploy.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to delete deployment ${deploy.id}: ${error.message}`,
          );
          // Continue with other deployments
        }
      }

      this.logger.log(
        `Cleanup complete: ${expiredDeploys.length} deployments processed`,
      );
    } catch (error: any) {
      this.logger.error(`Cleanup job failed: ${error.message}`);
    }
  }

  /**
   * Manual cleanup trigger (for testing/admin)
   */
  async triggerCleanup(): Promise<number> {
    await this.cleanupExpiredDeployments();

    // Return count of remaining ephemeral deployments
    const remaining = await this.prisma.deploy.count({
      where: {
        ...(({ isEphemeral: true }) as any),
        status: {
          not: 'deleted',
        },
      },
    });

    return remaining;
  }
}

