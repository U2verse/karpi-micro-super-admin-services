import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn()
  id: number;

  // Existing fields
  @Column()
  name: string;

  @Column('decimal')
  price_monthly: number;

  @Column('decimal', { nullable: true })
  price_yearly: number | null;

  @Column('int')
  storage_limit_mb: number;

  @Column('int')
  student_limit: number;

  @Column('int')
  course_limit: number;

  @Column('int')
  video_limit: number;

  @Column('int')
  assignments_limit: number;

  @Column('text', { nullable: true })
  notes: string | null;

  // NEW FIELDS

  @Column({ nullable: true })
  feature_type: string;  // Free Trial / Starter / Pro / Enterprise

  @Column({ nullable: true })
  meaning: string; // tagline or short description

  @Column('int', { nullable: true })
  materials_per_course: number;

  @Column({ nullable: true })
  student_app_access: string; // Full Access / Limited

  @Column('int', { nullable: true })
  admin_logins: number;

  @Column({ nullable: true })
  certificates: string; // Yes / No / Advanced

  @Column({ nullable: true })
  analytics: string; // Basic / Advanced

  @Column({ nullable: true })
  branding: string; // Basic / Themes / White-label

  @Column({ nullable: true })
  custom_domain: string; // Yes / No

  @Column({ nullable: true })
  support_level: string; // Basic / Business Hours / Priority

  @Column({ default: true })
  subdomain_included: boolean;

  @Column({ nullable: true })
  save_percentage: string; // optional string: "17%" 

  @Column({ default: false })
  best_pick: boolean;

  @CreateDateColumn()
  created_at: Date;
}
