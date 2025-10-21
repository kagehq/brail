/**
 * CI/CD deployment example
 * 
 * This example shows a complete CI/CD deployment workflow with:
 * - Build verification
 * - Deployment
 * - Health checks
 * - Automatic rollback on failure
 */

import { Brail } from '@brailhq/sdk';
import { execSync } from 'child_process';

async function healthCheck(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  const brail = new Brail({
    apiKey: process.env.BRAIL_API_KEY!,
    baseUrl: process.env.BRAIL_BASE_URL || 'http://localhost:3000',
  });

  const siteId = process.env.SITE_ID!;
  const profileId = process.env.PROFILE_ID!;

  try {
    // Step 1: Build
    console.log('📦 Building application...');
    execSync('npm run build', { stdio: 'inherit' });

    // Step 2: Run tests
    console.log('🧪 Running tests...');
    execSync('npm test', { stdio: 'inherit' });

    // Step 3: Deploy
    console.log('🚀 Deploying to production...');
    const deployment = await brail.deploy({
      siteId,
      path: './dist',
      profileId,
      target: 'production',
      comment: `CI/CD Deploy - ${process.env.GITHUB_SHA?.slice(0, 7) || 'local'}`,
      onProgress: (progress) => {
        if (progress.stage === 'uploading' && progress.filesUploaded) {
          const percent = ((progress.bytesUploaded! / progress.totalBytes!) * 100).toFixed(1);
          console.log(`   Uploading: ${percent}% (${progress.filesUploaded}/${progress.totalFiles} files)`);
        } else if (progress.message) {
          console.log(`   ${progress.message}`);
        }
      }
    });

    console.log('✅ Deployed successfully!');
    console.log('   URL:', deployment.url);

    // Step 4: Health checks
    console.log('🏥 Running health checks...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for propagation

    const isHealthy = await healthCheck(deployment.url!);
    
    if (!isHealthy) {
      throw new Error('Health check failed');
    }

    console.log('✅ Health checks passed!');
    console.log('🎉 Deployment complete!');

  } catch (error) {
    console.error('❌ Deployment failed:', error);

    // Automatic rollback
    try {
      console.log('🔄 Rolling back to previous version...');
      
      const deployments = await brail.listDeployments(siteId);
      const activeDeployments = deployments.filter(d => d.status === 'active');
      
      if (activeDeployments.length > 1) {
        const previous = activeDeployments[1]; // Second most recent active
        
        await brail.rollback({
          siteId,
          toDeployId: previous.id,
          profileId,
        });

        console.log('✅ Rolled back successfully to:', previous.id);
      } else {
        console.log('⚠️  No previous deployment to rollback to');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }

    process.exit(1);
  }
}

main();

