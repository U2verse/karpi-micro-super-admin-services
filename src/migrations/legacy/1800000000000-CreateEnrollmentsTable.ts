import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEnrollmentsTable1800000000000 implements MigrationInterface {
  name = "CreateEnrollmentsTable1800000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
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
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS enrollments`);
  }
}
