import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDto } from './create-plan.dto';
import {
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  feature_type?: string;

  @IsString()
  @IsOptional()
  meaning?: string;

  @IsString()
  @IsOptional()
  student_app_access?: string;

  // numeric fields = strings (UI sends "Unlimited" / "50" / "300")
  @IsString()
  @IsOptional()
  admin_logins?: string;

  @IsString()
  @IsOptional()
  storage_limit_mb?: string;

  @IsString()
  @IsOptional()
  student_limit?: string;

  @IsString()
  @IsOptional()
  course_limit?: string;

  @IsString()
  @IsOptional()
  video_limit?: string;

  @IsString()
  @IsOptional()
  assignments_limit?: string;

  @IsString()
  @IsOptional()
  materials_per_course?: string;

  @IsString()
  @IsOptional()
  certificates?: string;

  @IsString()
  @IsOptional()
  analytics?: string;

  @IsString()
  @IsOptional()
  branding?: string;

  @IsString()
  @IsOptional()
  custom_domain?: string;

  @IsString()
  @IsOptional()
  support_level?: string;

  @IsBoolean()
  @IsOptional()
  subdomain_included?: boolean;

  @IsString()
  @IsOptional()
  save_percentage?: string;

  @IsBoolean()
  @IsOptional()
  best_pick?: boolean;

  @IsString()
  @IsOptional()
  price_monthly?: string;

  @IsString()
  @IsOptional()
  price_yearly?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
