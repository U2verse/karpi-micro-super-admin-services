import { 
  IsString,
  IsOptional,
  IsBoolean 
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  feature_type?: string;

  @IsString()
  @IsOptional()
  meaning?: string;

  @IsString()
  @IsOptional()
  student_app_access?: string;

  // Stored as number in DB, but UI sends string (Unlimited / 3 / 10)
  @IsString()
  admin_logins: string;

  @IsString()
  storage_limit_mb: string;

  @IsString()
  student_limit: string;

  @IsString()
  course_limit: string;

  @IsString()
  video_limit: string;

  @IsString()
  assignments_limit: string;

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
  subdomain_included: boolean;

  @IsString()
  @IsOptional()
  save_percentage?: string;

  @IsBoolean()
  best_pick: boolean;

  // prices also come as string (e.g. "499", "0", "Free")
  @IsString()
  price_monthly: string;

  @IsString()
  @IsOptional()
  price_yearly?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
