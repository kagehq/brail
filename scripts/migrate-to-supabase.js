#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  Migrating Brail to Supabase Database\n');

// Check if DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable not set');
  console.log('Please set your Supabase database URL:');
  console.log('export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"');
  process.exit(1);
}

if (!databaseUrl.includes('supabase.co')) {
  console.error('❌ DATABASE_URL does not appear to be a Supabase URL');
  console.log('Expected format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
  process.exit(1);
}

console.log('✅ DATABASE_URL is set and appears to be Supabase');

// Update .env file
const envPath = path.join(__dirname, '../apps/api/.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Update or add DATABASE_URL
if (envContent.includes('DATABASE_URL=')) {
  envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${databaseUrl}`);
} else {
  envContent += `\nDATABASE_URL=${databaseUrl}\n`;
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Updated apps/api/.env with Supabase DATABASE_URL');

// Run Prisma migrations
console.log('\n🔄 Running database migrations...');
try {
  execSync('cd apps/api && pnpm prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Database migrations completed');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

// Generate Prisma client
console.log('\n🔄 Generating Prisma client...');
try {
  execSync('cd apps/api && pnpm prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
} catch (error) {
  console.error('❌ Prisma generate failed:', error.message);
  process.exit(1);
}

// Test database connection
console.log('\n🔄 Testing database connection...');
try {
  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✅ Database connection successful');
  
  // Test a simple query
  const userCount = await prisma.user.count();
  console.log(`✅ Found ${userCount} users in database`);
  
  await prisma.$disconnect();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Supabase migration completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Test your API endpoints');
console.log('2. Verify all functionality works');
console.log('3. Deploy to production');
console.log('4. Set up monitoring and backups');

console.log('\n🔗 Useful links:');
console.log('- Supabase Dashboard: https://supabase.com/dashboard');
console.log('- Database: https://supabase.com/dashboard/project/[PROJECT_ID]/settings/database');
console.log('- API Docs: https://supabase.com/dashboard/project/[PROJECT_ID]/api');
