import { Module } from '@nestjs/common';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SslModule } from '../ssl/ssl.module';

@Module({
  imports: [PrismaModule, SslModule],
  controllers: [DomainsController],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}
