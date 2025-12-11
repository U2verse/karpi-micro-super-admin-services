import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppDataSource  } from './config/typeorm.config';

import { AuthModule } from './auth/auth.module';
import { AdminBridgeModule } from './admin-bridge/admin-bridge.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BillingModule } from './billing/billing.module';
import { OverridesModule } from './overrides/overrides.module';
import { StatusLogsModule } from './status-logs/status-logs.module';
import { UsageModule } from './usage/usage.module';
import { EnrollmentInvitesModule } from "./enrollments/enrollment_invites.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => AppDataSource.options,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    AdminBridgeModule,
    PlansModule,
    SubscriptionsModule,
    BillingModule,
    OverridesModule,
    StatusLogsModule,
    UsageModule,
    EnrollmentInvitesModule,
  ],
})
export class AppModule {}
