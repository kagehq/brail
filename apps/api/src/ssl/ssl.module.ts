import { Module } from '@nestjs/common';
import { SslService } from './ssl.service';
import { AcmeService } from './acme.service';
import { SslController } from './ssl.controller';

@Module({
  controllers: [SslController],
  providers: [SslService, AcmeService],
  exports: [SslService, AcmeService],
})
export class SslModule {}

