import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientStatusLog } from '../entities/client-status-log.entity';
import { StatusLogsService } from './status-logs.service';
import { StatusLogsController } from './status-logs.controller';
import { AdminBridgeModule } from '../admin-bridge/admin-bridge.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [TypeOrmModule.forFeature([ClientStatusLog]), AdminBridgeModule, AuthModule],
  providers: [StatusLogsService],
  controllers: [StatusLogsController],
})
export class StatusLogsModule {}
