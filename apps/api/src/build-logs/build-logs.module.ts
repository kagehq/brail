import { Module } from '@nestjs/common';
import { BuildLogsService } from './build-logs.service';
import { BuildLogsController } from './build-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BuildLogsService],
  controllers: [BuildLogsController],
  exports: [BuildLogsService],
})
export class BuildLogsModule {}

