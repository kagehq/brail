import { requireConfig } from '../config.js';
import { Command } from 'commander';

const templatesCommand = new Command('templates')
  .description('Manage deployment templates');

// List templates
templatesCommand
  .command('list')
  .alias('ls')
  .description('List available templates')
  .action(async () => {
    try {
      const config = await requireConfig();
      const { apiUrl, token } = config;

      const response = await fetch(`${apiUrl}/v1/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const templates = (await response.json()) as any[];

      if (templates.length === 0) {
        console.log('No templates available.');
        return;
      }

      console.log('\nAvailable Templates:\n');
      templates.forEach((template) => {
        console.log(`  ${template.id.padEnd(20)} - ${template.name}`);
        console.log(`  ${' '.repeat(20)}   ${template.description}`);
        console.log(`  ${' '.repeat(20)}   Category: ${template.category}`);
        console.log(`  ${' '.repeat(20)}   Tech: ${template.tech.join(', ')}`);
        console.log();
      });

      console.log(`Total: ${templates.length} template(s)\n`);
    } catch (error) {
      console.error('Error listing templates:', error);
      process.exit(1);
    }
  });

// Get template details
templatesCommand
  .command('info <template>')
  .description('Show detailed information about a template')
  .action(async (templateId: string) => {
    try {
      const config = await requireConfig();
      const { apiUrl, token } = config;

      const response = await fetch(`${apiUrl}/v1/templates/${templateId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const template = (await response.json()) as any;

      console.log(`\n${template.name} (${template.id})`);
      console.log('─'.repeat(50));
      console.log(`\nDescription: ${template.description}`);
      console.log(`Category: ${template.category}`);
      console.log(`Author: ${template.author}`);
      console.log(`Version: ${template.version}`);
      console.log(`Technologies: ${template.tech.join(', ')}`);
      console.log(`Build Required: ${template.buildRequired ? 'Yes' : 'No'}`);

      if (template.tags && template.tags.length > 0) {
        console.log(`Tags: ${template.tags.join(', ')}`);
      }

      if (template.variables && template.variables.length > 0) {
        console.log('\nCustomizable Variables:');
        template.variables.forEach((v: any) => {
          console.log(`  - ${v.key}: ${v.label}`);
          console.log(`    ${v.description}`);
          console.log(`    Default: "${v.default}"`);
          console.log(`    Required: ${v.required ? 'Yes' : 'No'}`);
        });
      }

      if (template.adapters) {
        console.log('\nRecommended Adapters:');
        console.log(`  ${template.adapters.recommended.join(', ')}`);
      }

      console.log();
    } catch (error) {
      console.error('Error fetching template info:', error);
      process.exit(1);
    }
  });

// Use/deploy a template
templatesCommand
  .command('use <template>')
  .description('Deploy a template to create a new site')
  .option('-n, --name <name>', 'Site name (required)')
  .option('-s, --site <siteId>', 'Deploy to existing site')
  .option('-a, --adapter <adapter>', 'Adapter to use for deployment')
  .option('-p, --profile <profileId>', 'Profile to use for deployment')
  .option('--var <key=value...>', 'Template variables (e.g., --var TITLE="My Site")')
  .action(
    async (
      templateId: string,
      options: {
        name?: string;
        site?: string;
        adapter?: string;
        profile?: string;
        var?: string[];
      },
    ) => {
      try {
        if (!options.name && !options.site) {
          console.error('Error: --name or --site is required');
          process.exit(1);
        }

        const config = await requireConfig();
      const { apiUrl, token } = config;

        // Parse variables
        const variables: Record<string, string> = {};
        if (options.var) {
          for (const varString of options.var) {
            const [key, ...valueParts] = varString.split('=');
            if (!key || valueParts.length === 0) {
              console.error(`Invalid variable format: ${varString}`);
              console.error('Use: --var KEY=VALUE');
              process.exit(1);
            }
            variables[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
          }
        }

        console.log(`\n🚀 Deploying template "${templateId}"...`);

        const response = await fetch(
          `${apiUrl}/v1/templates/${templateId}/deploy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              siteName: options.name || `site-${Date.now()}`,
              variables,
              adapter: options.adapter,
              profileId: options.profile,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`HTTP ${response.status}: ${error}`);
        }

        const result = (await response.json()) as any;

        console.log('\n✅ Template deployed successfully!\n');
        console.log(`Site ID: ${result.site.id}`);
        console.log(`Site Name: ${result.site.name}`);
        console.log(`Deploy ID: ${result.deploy.id}`);
        if (result.publicUrl) {
          console.log(`URL: ${result.publicUrl}`);
        }
        console.log();
      } catch (error) {
        console.error('Error deploying template:', error);
        process.exit(1);
      }
    },
  );

// Clone template locally
templatesCommand
  .command('clone <template> <destination>')
  .description('Clone a template to a local directory for customization')
  .action(async (templateId: string, destination: string) => {
    console.log('Template cloning to local directory is not yet supported.');
    console.log('For now, templates can only be deployed directly via:');
    console.log(`  br templates use ${templateId} --name "My Site"`);
    console.log('\nOr download from the repository:');
    console.log(
      `  https://github.com/kagehq/brail/tree/main/templates/${templateId}`,
    );
  });

export { templatesCommand };

