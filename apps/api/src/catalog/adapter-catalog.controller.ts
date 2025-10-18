import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdapterCatalogService } from './adapter-catalog.service';

@Controller()
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class AdapterCatalogController {
  constructor(private readonly catalog: AdapterCatalogService) {}

  @Get('catalog/adapters')
  async list() {
    return this.catalog.listAdapters();
  }
}

