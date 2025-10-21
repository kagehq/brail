/**
 * Sandbox creation example
 * 
 * This example shows how to create ephemeral sandboxes for testing and prototyping.
 */

import { Brail } from '@brailhq/sdk';

async function main() {
  const brail = new Brail({
    apiKey: process.env.BRAIL_API_KEY!,
    baseUrl: process.env.BRAIL_BASE_URL || 'http://localhost:3000',
  });

  try {
    console.log('🏖️  Creating Vercel Sandbox...');

    // Create a Node.js sandbox
    const sandbox = await brail.createSandbox({
      provider: 'vercel-sandbox',
      path: './my-app',
      config: {
        token: process.env.VERCEL_TOKEN!,
        runtime: 'node22',
        vcpus: 2,
        buildCommand: 'npm install',
        startCommand: 'npm start',
      },
      siteName: `demo-sandbox-${Date.now()}`
    });

    console.log('✅ Sandbox created!');
    console.log('   URL:', sandbox.url);
    console.log('   Sandbox ID:', sandbox.sandboxId);
    console.log('   Site ID:', sandbox.siteId);
    
    console.log('\n💡 Sandbox is ready for testing!');
    console.log('   Visit:', sandbox.url);
  } catch (error) {
    console.error('❌ Sandbox creation failed:', error);
    process.exit(1);
  }
}

main();

