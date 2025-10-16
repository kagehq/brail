import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

// Add BigInt serialization support for JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parser
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // Enable CORS for local development
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      process.env.WEB_URL,
    ].filter((url): url is string => typeof url === 'string'),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-deploy-id',
      'x-relpath',
      'tus-resumable',
      'upload-length',
      'upload-offset',
      'upload-metadata',
      'upload-defer-length',
      'upload-concat',
    ],
    exposedHeaders: [
      'tus-resumable',
      'upload-offset',
      'upload-length',
      'location',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('v1', {
    exclude: ['public/:siteId/*'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📦 Public serving: http://localhost:${port}/public/:siteId/`);
}

bootstrap();

