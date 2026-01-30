import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSuperAdminServiceSchema1719000000000
  implements MigrationInterface
{
  name = 'InitSuperAdminServiceSchema1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* -----------------------------------------------------
       ENUMS
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TYPE billing_status_enum AS ENUM ('pending', 'paid', 'failed')
    `);

    await queryRunner.query(`
      CREATE TYPE client_plan_subscriptions_renew_type_enum
      AS ENUM ('monthly', 'yearly', 'manual')
    `);

    /* -----------------------------------------------------
       PLANS
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        price_monthly NUMERIC NOT NULL,
        price_yearly NUMERIC,
        storage_limit_mb INTEGER NOT NULL,
        student_limit INTEGER NOT NULL,
        course_limit INTEGER NOT NULL,
        video_limit INTEGER NOT NULL,
        assignments_limit INTEGER NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now(),
        feature_type VARCHAR,
        meaning VARCHAR,
        materials_per_course INTEGER,
        student_app_access VARCHAR,
        admin_logins INTEGER,
        certificates VARCHAR,
        analytics VARCHAR,
        branding VARCHAR,
        custom_domain VARCHAR,
        support_level VARCHAR,
        subdomain_included BOOLEAN DEFAULT true,
        save_percentage VARCHAR,
        best_pick BOOLEAN DEFAULT false
      )
    `);

    /* -----------------------------------------------------
       CLIENT PLAN SUBSCRIPTIONS
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE client_plan_subscriptions (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        active BOOLEAN DEFAULT true,
        upgraded_from INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        renew_type client_plan_subscriptions_renew_type_enum NOT NULL,
        CONSTRAINT fk_cps_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
      )
    `);

    /* -----------------------------------------------------
       BILLING
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE billing (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        subscription_id INTEGER NOT NULL,
        amount NUMERIC NOT NULL,
        transaction_id VARCHAR,
        invoice_url TEXT,
        paid_on TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        status billing_status_enum NOT NULL,
        CONSTRAINT fk_billing_subscription
          FOREIGN KEY (subscription_id)
          REFERENCES client_plan_subscriptions(id)
      )
    `);

    /* -----------------------------------------------------
       CLIENT INVOICES
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE client_invoices (
        invoice_id SERIAL PRIMARY KEY,
        tenant_id INTEGER,
        billing_id INTEGER,
        invoice_url TEXT,
        invoice_number VARCHAR,
        issue_date DATE,
        amount NUMERIC,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        client_id INTEGER,
        subscription_id INTEGER,
        currency VARCHAR(10),
        status VARCHAR(20)
      )
    `);

    /* -----------------------------------------------------
       CLIENT LIMITS OVERRIDE
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE client_limits_override (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        override_storage_mb INTEGER,
        override_students INTEGER,
        override_courses INTEGER,
        override_videos INTEGER,
        override_assignments INTEGER,
        reason TEXT,
        updated_at TIMESTAMP DEFAULT now()
      )
    `);

    /* -----------------------------------------------------
       CLIENT STATUS LOGS
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE client_status_logs (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        previous_status VARCHAR NOT NULL,
        new_status VARCHAR NOT NULL,
        changed_by INTEGER NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT now()
      )
    `);

    /* -----------------------------------------------------
       CLIENT USAGE HISTORY
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE client_usage_history (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        month VARCHAR NOT NULL,
        storage_used_mb INTEGER NOT NULL,
        students_used INTEGER NOT NULL,
        videos_used INTEGER NOT NULL,
        courses_used INTEGER NOT NULL,
        generated_at TIMESTAMP DEFAULT now()
      )
    `);

    /* -----------------------------------------------------
       ENROLLMENT INVITES
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE enrollment_invites (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR NOT NULL,
        email VARCHAR NOT NULL,
        whatsapp VARCHAR,
        plan_id INTEGER,
        token VARCHAR NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `);

    /* -----------------------------------------------------
       ENROLLMENTS
    ----------------------------------------------------- */

    await queryRunner.query(`
      CREATE TABLE enrollments (
        id SERIAL PRIMARY KEY,
        plan TEXT,
        billing_type TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        billing_name TEXT,
        address_line TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        gst_no TEXT,
        pan_no TEXT,
        amount NUMERIC(10,2),
        payment_mode TEXT,
        payment_status TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        client_id INTEGER,
        plan_id INTEGER,
        plan_name TEXT
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE enrollments`);
    await queryRunner.query(`DROP TABLE enrollment_invites`);
    await queryRunner.query(`DROP TABLE client_usage_history`);
    await queryRunner.query(`DROP TABLE client_status_logs`);
    await queryRunner.query(`DROP TABLE client_limits_override`);
    await queryRunner.query(`DROP TABLE client_invoices`);
    await queryRunner.query(`DROP TABLE billing`);
    await queryRunner.query(`DROP TABLE client_plan_subscriptions`);
    await queryRunner.query(`DROP TABLE plans`);
    await queryRunner.query(`DROP TYPE billing_status_enum`);
    await queryRunner.query(
      `DROP TYPE client_plan_subscriptions_renew_type_enum`,
    );
  }
}
