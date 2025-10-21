/**
 * Basic deployment example
 * 
 * This example shows how to deploy a static site to Brail's built-in hosting.
 */

import { Brail } from '@brailhq/sdk';

async function main() {
  // Initialize SDK
  const brail = new Brail({
    apiKey: process.env.BRAIL_API_KEY || 'your-api-key',
    baseUrl: process.env.BRAIL_BASE_URL || 'http://localhost:3000',
  });

  try {
    // Create a site (one-time)
    console.log('📦 Creating site...');
    const site = await brail.createSite('my-awesome-site');
    console.log('✅ Site created:', site.id);

    // Deploy
    console.log('🚀 Deploying...');
    const deployment = await brail.deploy({
      siteId: site.id,
      path: './dist', // your build output directory
      autoActivate: true,
      onProgress: (progress) => {
        if (progress.stage === 'uploading' && progress.filesUploaded) {
          console.log(`   Uploading: ${progress.filesUploaded}/${progress.totalFiles} files`);
        }
      }
    });

    console.log('✅ Deployment complete!');
    console.log('   Deploy ID:', deployment.deployId);
    console.log('   Status:', deployment.status);
    console.log('   URL:', deployment.url);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();

