import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientLimitsOverride } from '../entities/client-limits-override.entity';
import { OverridesService } from './overrides.service';
import { OverridesController } from './overrides.controller';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [TypeOrmModule.forFeature([ClientLimitsOverride]), AuthModule],
  providers: [OverridesService],
  controllers: [OverridesController],
  exports: [OverridesService],
})
export class OverridesModule {}
