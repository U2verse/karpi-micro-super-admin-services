import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSuperadmin1700000000000 implements MigrationInterface {
    name = 'InitSuperadmin1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {

        // 1️⃣ plans table
        await queryRunner.query(`
            CREATE TABLE "plans" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR NOT NULL,
                "price_monthly" DECIMAL NOT NULL,
                "price_yearly" DECIMAL,
                "storage_limit_mb" INT NOT NULL,
                "student_limit" INT NOT NULL,
                "course_limit" INT NOT NULL,
                "video_limit" INT NOT NULL,
                "assignments_limit" INT NOT NULL,
                "notes" TEXT,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

        // 2️⃣ client_plan_subscriptions
        await queryRunner.query(`
            CREATE TABLE "client_plan_subscriptions" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INT NOT NULL,
                "plan_id" INT NOT NULL,
                "start_date" DATE NOT NULL,
                "end_date" DATE NOT NULL,
                "renew_type" VARCHAR NOT NULL,
                "active" BOOLEAN NOT NULL DEFAULT true,
                "upgraded_from" INT,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_sub_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE
            );
        `);

        // 3️⃣ billing
        await queryRunner.query(`
            CREATE TABLE "billing" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INT NOT NULL,
                "subscription_id" INT NOT NULL,
                "amount" DECIMAL NOT NULL,
                "status" VARCHAR NOT NULL,
                "transaction_id" VARCHAR,
                "invoice_url" TEXT,
                "paid_on" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_billing_subscription" FOREIGN KEY ("subscription_id") REFERENCES "client_plan_subscriptions"("id")
            );
        `);

        // 4️⃣ client_limits_override
        await queryRunner.query(`
            CREATE TABLE "client_limits_override" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INT NOT NULL,
                "override_storage_mb" INT,
                "override_students" INT,
                "override_courses" INT,
                "override_videos" INT,
                "override_assignments" INT,
                "reason" TEXT,
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

        // 5️⃣ client_status_logs
        await queryRunner.query(`
            CREATE TABLE "client_status_logs" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INT NOT NULL,
                "previous_status" VARCHAR NOT NULL,
                "new_status" VARCHAR NOT NULL,
                "changed_by" INT NOT NULL,
                "reason" TEXT,
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

        // 6️⃣ client_usage_history
        await queryRunner.query(`
            CREATE TABLE "client_usage_history" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INT NOT NULL,
                "month" VARCHAR NOT NULL,
                "storage_used_mb" INT NOT NULL,
                "students_used" INT NOT NULL,
                "videos_used" INT NOT NULL,
                "courses_used" INT NOT NULL,
                "generated_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`DROP TABLE "client_usage_history";`);
        await queryRunner.query(`DROP TABLE "client_status_logs";`);
        await queryRunner.query(`DROP TABLE "client_limits_override";`);
        await queryRunner.query(`DROP TABLE "billing";`);
        await queryRunner.query(`DROP TABLE "client_plan_subscriptions";`);
        await queryRunner.query(`DROP TABLE "plans";`);
    }
}
