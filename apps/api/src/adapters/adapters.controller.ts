import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdapterRegistry } from './adapter.registry';

@Controller('adapters')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class AdaptersController {
  constructor(private readonly registry: AdapterRegistry) {}

  @Get()
  async listAdapters() {
    return this.registry.listAdapters();
  }
}
