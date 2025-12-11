import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StatusLogsService } from './status-logs.service';
import { ChangeStatusDto } from './dto/change-status.dto';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('status')
@UseGuards(SuperAdminGuard)
export class StatusLogsController {
  constructor(private readonly statusLogsService: StatusLogsService) {}

  @Post('change')
  change(
    @CurrentUser() admin: JwtPayload,
    @Body() dto: ChangeStatusDto,
  ) {
    return this.statusLogsService.changeStatus(admin.sub, dto);
  }

  @Get('logs/:clientId')
  logs(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.statusLogsService.findLogs(clientId);
  }
}
