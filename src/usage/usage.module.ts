import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientUsageHistory } from '../entities/client-usage-history.entity';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { AdminBridgeModule } from '../admin-bridge/admin-bridge.module';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [TypeOrmModule.forFeature([ClientUsageHistory]), AdminBridgeModule, AuthModule],
  providers: [UsageService],
  controllers: [UsageController],
})
export class UsageModule {}
