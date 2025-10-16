import { Module } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { LogsGateway } from './logs.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LogsService, LogsGateway],
  controllers: [LogsController],
  exports: [LogsService, LogsGateway],
})
export class LogsModule {}

