import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EnrollmentInvite } from "./enrollment_invite.entity";
import { EnrollmentInvitesService } from "./enrollment_invites.service";
import { EnrollmentInvitesController } from "./enrollment_invites.controller";

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentInvite])],
  providers: [EnrollmentInvitesService],
  controllers: [EnrollmentInvitesController],
  exports: [EnrollmentInvitesService],
})
export class EnrollmentInvitesModule {}
