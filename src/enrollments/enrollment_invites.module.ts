import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnrollmentInvite } from "./enrollment_invite.entity";
import { EnrollmentInvitesService } from "./enrollment_invites.service";
import { EnrollmentInvitesController } from "./enrollment_invites.controller";
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentInvite]), WhatsappModule],
  providers: [EnrollmentInvitesService],
  controllers: [EnrollmentInvitesController],
  exports: [EnrollmentInvitesService],
})
export class EnrollmentInvitesModule {}
