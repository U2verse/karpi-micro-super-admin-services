import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../entities/plan.entity';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { AuthModule } from '../auth/auth.module'; // <-- ADD THIS
import { ClientPlanSubscription } from "../entities/client-plan-subscription.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Plan, ClientPlanSubscription]),AuthModule, ],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
