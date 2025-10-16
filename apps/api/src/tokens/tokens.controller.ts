import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TokensService } from './tokens.service';

@Controller('tokens')
@UseGuards(AuthGuard(['jwt', 'bearer']))
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  async create(
    @Body()
    body: {
      siteId?: string;
      name: string;
      scopes?: string[];
      expiresAt?: string;
    },
    @Req() req: any,
  ) {
    return this.tokensService.create(
      req.user.userId || req.user.id,
      body.name,
      body.siteId,
      body.scopes || ['deploy:write'],
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  @Get()
  async list(@Req() req: any) {
    return this.tokensService.listByUser(req.user.userId || req.user.id);
  }

  @Delete(':tokenId')
  async delete(@Param('tokenId') tokenId: string) {
    return this.tokensService.delete(tokenId);
  }
}

