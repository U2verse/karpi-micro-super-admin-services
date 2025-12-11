import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateClientInvoicesTable1900000000000 implements MigrationInterface {
  name = "CreateClientInvoicesTable1900000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS client_invoices (
        invoice_id SERIAL PRIMARY KEY,
        tenant_id INT,
        billing_id INT,
        invoice_url TEXT,
        invoice_number VARCHAR,
        issue_date DATE,
        amount DECIMAL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_invoices`);
  }
}
