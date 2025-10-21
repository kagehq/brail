import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SitesService } from '../sites/sites.service';
import { StorageService } from '../storage/storage.service';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  tech: string[];
  buildRequired: boolean;
  preview?: string;
  variables?: Array<{
    key: string;
    label: string;
    description: string;
    default: string;
    required: boolean;
  }>;
  adapters?: {
    recommended: string[];
    supported: string | string[];
  };
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);
  private templatesPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
    private readonly storageService: StorageService,
  ) {
    // Templates are stored in the project root/templates directory
    this.templatesPath = join(process.cwd(), '../../templates');
  }

  /**
   * List all available templates
   */
  async listTemplates(): Promise<TemplateMetadata[]> {
    try {
      const entries = await readdir(this.templatesPath, {
        withFileTypes: true,
      });

      const templates: TemplateMetadata[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const templatePath = join(this.templatesPath, entry.name);
            const metadataPath = join(templatePath, 'template.json');

            const metadataContent = await readFile(metadataPath, 'utf-8');
            const metadata: TemplateMetadata = JSON.parse(metadataContent);

            templates.push(metadata);
          } catch (error) {
            this.logger.warn(
              `Failed to load template metadata for ${entry.name}: ${error}`,
            );
          }
        }
      }

      return templates;
    } catch (error) {
      this.logger.error(`Failed to list templates: ${error}`);
      return [];
    }
  }

  /**
   * Get a specific template's metadata
   */
  async getTemplate(templateId: string): Promise<TemplateMetadata> {
    const templatePath = join(this.templatesPath, templateId);
    const metadataPath = join(templatePath, 'template.json');

    try {
      const metadataContent = await readFile(metadataPath, 'utf-8');
      return JSON.parse(metadataContent);
    } catch (error) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
  }

  /**
   * Clone a template to create a new site without deploying
   */
  async cloneTemplate(
    templateId: string,
    siteName: string,
    userId: string,
    variables?: Record<string, string>,
  ) {
    this.logger.log(
      `Cloning template ${templateId} to new site "${siteName}" for user ${userId}`,
    );

    // Get template metadata
    const template = await this.getTemplate(templateId);

    // Create the site
    const site = await this.sitesService.create(userId, siteName);

    // Create a deployment
    const deploy = await this.prisma.deploy.create({
      data: {
        siteId: site.id,
        status: 'uploading',
        fileCount: 0,
        byteSize: 0,
        deployedBy: userId,
      },
    });

    // Copy template files to storage
    const templatePath = join(this.templatesPath, templateId);
    const files = await this.collectTemplateFiles(templatePath, variables);

    // Upload files
    for (const file of files) {
      await this.storageService.putObject(
        `deploys/${deploy.id}/${file.path}`,
        file.content,
      );
    }

    // Finalize deployment
    await this.prisma.deploy.update({
      where: { id: deploy.id },
      data: {
        status: 'uploaded',
        fileCount: files.length,
        byteSize: files.reduce((sum, f) => sum + f.content.length, 0),
      },
    });

    this.logger.log(`Template ${templateId} cloned to site ${site.id}`);

    return {
      site,
      deploy,
      template: template.name,
    };
  }

  /**
   * Deploy a template directly (clone + activate)
   */
  async deployTemplate(
    templateId: string,
    siteName: string,
    userId: string,
    variables?: Record<string, string>,
    adapter?: string,
    config?: unknown,
    profileId?: string,
  ) {
    this.logger.log(
      `Deploying template ${templateId} to new site "${siteName}" for user ${userId}`,
    );

    // Clone the template
    const { site, deploy } = await this.cloneTemplate(
      templateId,
      siteName,
      userId,
      variables,
    );

    // If adapter is specified, we would trigger deployment here
    // For now, just activate the deployment
    await this.prisma.deploy.update({
      where: { id: deploy.id },
      data: { status: 'active' },
    });

    await this.prisma.site.update({
      where: { id: site.id },
      data: { activeDeployId: deploy.id },
    });

    const publicUrl = `/public/${site.id}/`;

    this.logger.log(`Template ${templateId} deployed to site ${site.id}`);

    return {
      site,
      deploy,
      publicUrl,
      template: templateId,
    };
  }

  /**
   * Collect all files from a template directory and apply variable substitution
   */
  private async collectTemplateFiles(
    templatePath: string,
    variables?: Record<string, string>,
  ): Promise<Array<{ path: string; content: Buffer }>> {
    const files: Array<{ path: string; content: Buffer }> = [];

    async function scanDirectory(
      currentPath: string,
      relativePath: string = '',
    ) {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        const entryRelativePath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;

        // Skip template metadata and preview files
        if (
          entry.name === 'template.json' ||
          entry.name === 'preview.png' ||
          entry.name === 'README.md'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath, entryRelativePath);
        } else if (entry.isFile()) {
          let content = await readFile(fullPath);

          // Apply variable substitution for text files
          if (
            variables &&
            (entry.name.endsWith('.html') ||
              entry.name.endsWith('.css') ||
              entry.name.endsWith('.js') ||
              entry.name.endsWith('.json'))
          ) {
            let textContent = content.toString('utf-8');
            for (const [key, value] of Object.entries(variables)) {
              textContent = textContent.replace(
                new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
                value,
              );
            }
            content = Buffer.from(textContent, 'utf-8');
          }

          files.push({ path: entryRelativePath, content });
        }
      }
    }

    await scanDirectory(templatePath);
    return files;
  }
}

