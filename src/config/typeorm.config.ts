import { DataSource } from 'typeorm';
import 'dotenv/config';

import { Plan } from '../entities/plan.entity';
import { ClientPlanSubscription } from '../entities/client-plan-subscription.entity';
import { Billing } from '../entities/billing.entity';
import { ClientLimitsOverride } from '../entities/client-limits-override.entity';
import { ClientStatusLog } from '../entities/client-status-log.entity';
import { ClientUsageHistory } from '../entities/client-usage-history.entity';
import { EnrollmentInvite } from '../enrollments/enrollment_invite.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT || 5432),
  username: String(process.env.POSTGRES_USER),
  password: String(process.env.POSTGRES_PASSWORD), // ✅ STRING GUARANTEED
  database: String(process.env.POSTGRES_DB),

  entities: [
    Plan,
    ClientPlanSubscription,
    Billing,
    ClientLimitsOverride,
    ClientStatusLog,
    ClientUsageHistory,
    EnrollmentInvite,
  ],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
});
