import { Module } from '@nestjs/common';
import { EnvService } from './env.service';
import { EnvController } from './env.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [EnvController],
  providers: [EnvService],
  exports: [EnvService],
})
export class EnvModule {}

