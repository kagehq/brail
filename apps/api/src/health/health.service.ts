import { Injectable, Logger } from '@nestjs/common';

/**
 * Health check service for validating deployments before activation
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  /**
   * Check URL health endpoint
   */
  async checkUrl(
    url: string,
    options: {
      timeoutMs?: number;
      retries?: number;
    } = {},
  ): Promise<void> {
    const timeout = options.timeoutMs || 8000;
    const retries = options.retries || 5;

    this.logger.log(`Health check: ${url} (timeout: ${timeout}ms, retries: ${retries})`);

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.logger.log(`Health check passed: ${url}`);
          return;
        }

        this.logger.warn(
          `Health check attempt ${i + 1}/${retries}: ${response.status}`,
        );
      } catch (error) {
        this.logger.warn(
          `Health check attempt ${i + 1}/${retries} failed: ${error}`,
        );
      }

      if (i < retries - 1) {
        const backoff = 1000 * (i + 1); // Exponential backoff
        await this.sleep(backoff);
      }
    }

    throw new Error(`Health check failed after ${retries} retries: ${url}`);
  }

  /**
   * Check canary file contains expected deployId
   */
  async checkCanary(
    canaryPath: string,
    expectedDeployId: string,
    options: {
      timeoutMs?: number;
      retries?: number;
    } = {},
  ): Promise<void> {
    const timeout = options.timeoutMs || 8000;
    const retries = options.retries || 5;

    this.logger.log(
      `Canary check: ${canaryPath} (expecting: ${expectedDeployId})`,
    );

    for (let i = 0; i < retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(canaryPath, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const body = await response.text();
          if (body.trim() === expectedDeployId) {
            this.logger.log(`Canary check passed: ${canaryPath}`);
            return;
          }

          this.logger.warn(
            `Canary check attempt ${i + 1}/${retries}: body mismatch (got: ${body.trim()})`,
          );
        } else {
          this.logger.warn(
            `Canary check attempt ${i + 1}/${retries}: ${response.status}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Canary check attempt ${i + 1}/${retries} failed: ${error}`,
        );
      }

      if (i < retries - 1) {
        const backoff = 1000 * (i + 1);
        await this.sleep(backoff);
      }
    }

    throw new Error(
      `Canary check failed after ${retries} retries: ${canaryPath}`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

