import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminBridgeService } from './admin-bridge.service';

@Module({
  imports: [HttpModule],
  providers: [AdminBridgeService],
  exports: [AdminBridgeService],
})
export class AdminBridgeModule {}
