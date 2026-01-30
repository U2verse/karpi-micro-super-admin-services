import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableSuperAdminRLS1719000000100
  implements MigrationInterface
{
  name = 'EnableSuperAdminRLS1719000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* -----------------------------------------------------
       Helper function: current user role
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION current_user_role()
      RETURNS text AS $$
      BEGIN
        RETURN current_setting('my.role', true);
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    /* -----------------------------------------------------
       Enable RLS on tables
    ----------------------------------------------------- */

    const tables = [
      'plans',
      'client_plan_subscriptions',
      'billing',
      'client_invoices',
      'client_limits_override',
      'client_status_logs',
      'client_usage_history',
      'enrollment_invites',
      'enrollments',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;
      `);
    }

    /* -----------------------------------------------------
       Super Admin Full Access Policy
    ----------------------------------------------------- */

    for (const table of tables) {
      await queryRunner.query(`
        CREATE POLICY super_admin_full_access_${table}
        ON ${table}
        FOR ALL
        USING (current_user_role() IN ('super_admin', 'system'))
        WITH CHECK (current_user_role() IN ('super_admin', 'system'));
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'plans',
      'client_plan_subscriptions',
      'billing',
      'client_invoices',
      'client_limits_override',
      'client_status_logs',
      'client_usage_history',
      'enrollment_invites',
      'enrollments',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        DROP POLICY IF EXISTS super_admin_full_access_${table} ON ${table};
      `);
      await queryRunner.query(`
        ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;
      `);
    }

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS current_user_role();
    `);
  }
}
