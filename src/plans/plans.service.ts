import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { ClientPlanSubscription } from '../entities/client-plan-subscription.entity';
import { BadRequestException } from '@nestjs/common/exceptions';
import { toUIValue, toDBValue } from "./utils/plan-mapper";
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { DeepPartial } from 'typeorm/common/DeepPartial';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,

    @InjectRepository(ClientPlanSubscription)
    private subscriptionRepo: Repository<ClientPlanSubscription>,
  ) {}

  // -----------------------------
  // CREATE PLAN
  // -----------------------------
  async create(dto: CreatePlanDto) {
    const plan = this.planRepo.create({
      name: dto.name,

      feature_type: dto.feature_type ?? null,
      meaning: dto.meaning ?? null,

      student_app_access: dto.student_app_access ?? null,
      admin_logins: toDBValue(dto.admin_logins ?? null),

      storage_limit_mb: toDBValue(dto.storage_limit_mb),
      student_limit: toDBValue(dto.student_limit),
      course_limit: toDBValue(dto.course_limit),
      video_limit: toDBValue(dto.video_limit),
      assignments_limit: toDBValue(dto.assignments_limit),
      materials_per_course: toDBValue(dto.materials_per_course ?? null),

      certificates: dto.certificates ?? null,
      analytics: dto.analytics ?? null,
      branding: dto.branding ?? null,
      custom_domain: dto.custom_domain ?? null,
      support_level: dto.support_level ?? null,

      subdomain_included: dto.subdomain_included ?? true,
      save_percentage: dto.save_percentage ?? null,
      best_pick: dto.best_pick ?? false,

      price_monthly: toDBValue(dto.price_monthly),
      price_yearly: toDBValue(dto.price_yearly) ?? null,

      notes: dto.notes ?? null,
    }as DeepPartial<Plan>);

    return this.planRepo.save(plan);
  }

  // -----------------------------
  // GET ALL PLANS
  // -----------------------------
  async findAll() {
    const plans = await this.planRepo.find();

    return Promise.all(
      plans.map(async (p) => {
        const clientCount = await this.subscriptionRepo.count({
          where: { plan_id: p.id },
        });

        return {
          id: p.id,
          name: p.name,
          price_monthly: p.price_monthly,
          price_yearly: p.price_yearly,
          storage_limit_mb: p.storage_limit_mb,

          student_limit: toUIValue(p.student_limit),
          course_limit: toUIValue(p.course_limit),
          video_limit: p.video_limit,
          assignments_limit: toUIValue(p.assignments_limit),
          materials_per_course: toUIValue(p.materials_per_course),

          admin_logins: toUIValue(p.admin_logins),
          certificates: p.certificates,
          analytics: p.analytics,
          branding: p.branding,
          custom_domain: p.custom_domain,
          support_level: p.support_level,
          subdomain_included: p.subdomain_included,
          save_percentage: p.save_percentage,
          feature_type: p.feature_type,
          meaning: p.meaning,
          notes: p.notes,
          created_at: p.created_at,

          clientCount, // 👈 UI wants this
          best_pick: p.best_pick,
        };
      }),
    );
  }



  // -----------------------------
  // GET SINGLE PLAN
  // -----------------------------
  async findOne(id: number) {
    const p = await this.planRepo.findOne({ where: { id } });
    if (!p) throw new BadRequestException("Plan not found");

    const clientCount = await this.subscriptionRepo.count({
      where: { plan_id: id },
    });

    return {
      id: p.id,
      name: p.name,
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      storage_limit_mb: p.storage_limit_mb,

      student_limit: toUIValue(p.student_limit),
      course_limit: toUIValue(p.course_limit),
      video_limit: p.video_limit,
      assignments_limit: toUIValue(p.assignments_limit),
      materials_per_course: toUIValue(p.materials_per_course),

      admin_logins: toUIValue(p.admin_logins),
      certificates: p.certificates,
      analytics: p.analytics,
      branding: p.branding,
      custom_domain: p.custom_domain,
      support_level: p.support_level,
      subdomain_included: p.subdomain_included,
      save_percentage: p.save_percentage,
      feature_type: p.feature_type,
      meaning: p.meaning,
      notes: p.notes,
      created_at: p.created_at,

      clientCount,
      best_pick: p.best_pick,
    };
  }


  // -----------------------------
  // UPDATE PLAN
  // -----------------------------
  async update(id: number, dto: UpdatePlanDto) {
    const existing = await this.planRepo.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Plan not found");
    }

    // Merge safely
    const updated = this.planRepo.merge(existing, {
      ...dto,

      price_monthly:
        dto.price_monthly !== undefined
          ? toDBValue(dto.price_monthly)
          : existing.price_monthly,

      price_yearly:
        dto.price_yearly !== undefined && dto.price_yearly !== null
          ? toDBValue(dto.price_yearly)
          : existing.price_yearly,

      storage_limit_mb:
        dto.storage_limit_mb !== undefined
          ? toDBValue(dto.storage_limit_mb)
          : existing.storage_limit_mb,

      student_limit:
        dto.student_limit !== undefined
          ? toDBValue(dto.student_limit)
          : existing.student_limit,

      course_limit:
        dto.course_limit !== undefined
          ? toDBValue(dto.course_limit)
          : existing.course_limit,

      video_limit:
        dto.video_limit !== undefined
          ? toDBValue(dto.video_limit)
          : existing.video_limit,

      assignments_limit:
        dto.assignments_limit !== undefined
          ? toDBValue(dto.assignments_limit)
          : existing.assignments_limit,

      materials_per_course:
        dto.materials_per_course !== undefined
          ? toDBValue(dto.materials_per_course)
          : existing.materials_per_course,

      admin_logins:
        dto.admin_logins !== undefined
          ? toDBValue(dto.admin_logins)
          : existing.admin_logins,
    });

    return this.planRepo.save(updated);
  }

  // -----------------------------
  // DELETE PLAN
  // -----------------------------
  async remove(id: number) {
    // Check if plan exists
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    // Check if plan is linked to subscriptions
    const subscriptionCount = await this.subscriptionRepo.count({
      where: { plan_id: id },
    });

    if (subscriptionCount > 0) {
      throw new BadRequestException(
        "Cannot delete this plan because it is currently assigned to clients."
      );
    }

    // Safe delete
    await this.planRepo.delete(id);
    return { message: "Plan deleted successfully" };
  }

}
