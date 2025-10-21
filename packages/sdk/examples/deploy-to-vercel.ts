/**
 * Deploy to Vercel example
 * 
 * This example shows how to deploy a site to Vercel using the SDK.
 */

import { Brail } from '@brailhq/sdk';

async function main() {
  const brail = new Brail({
    apiKey: process.env.BRAIL_API_KEY!,
    baseUrl: process.env.BRAIL_BASE_URL || 'http://localhost:3000',
  });

  try {
    console.log('🚀 Deploying to Vercel...');

    const deployment = await brail.deploy({
      siteId: 'my-site',
      path: './dist',
      adapter: 'vercel',
      config: {
        token: process.env.VERCEL_TOKEN!,
        projectId: process.env.VERCEL_PROJECT_ID!,
        teamId: process.env.VERCEL_TEAM_ID, // optional
      },
      target: 'preview',
      comment: 'Deployed via SDK',
      onProgress: (progress) => {
        console.log(`[${progress.stage}] ${progress.message || ''}`);
      }
    });

    console.log('✅ Deployed to Vercel!');
    console.log('   Preview URL:', deployment.previewUrl);
    console.log('   Platform ID:', deployment.platformDeploymentId);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();

