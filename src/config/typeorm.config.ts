import { DataSource } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { ClientPlanSubscription } from '../entities/client-plan-subscription.entity';
import { Billing } from '../entities/billing.entity';
import { ClientLimitsOverride } from '../entities/client-limits-override.entity';
import { ClientStatusLog } from '../entities/client-status-log.entity';
import { ClientUsageHistory } from '../entities/client-usage-history.entity';
import { EnrollmentInvite } from '../enrollments/enrollment_invite.entity';  
import 'dotenv/config';


export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
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
