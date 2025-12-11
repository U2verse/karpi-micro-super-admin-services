import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePlansTable1764847101006 implements MigrationInterface {
    name = 'UpdatePlansTable1764847101006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove old foreign keys
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" DROP CONSTRAINT "fk_sub_plan"`);
        await queryRunner.query(`ALTER TABLE "billing" DROP CONSTRAINT "fk_billing_subscription"`);

        // Add new Plan columns
        await queryRunner.query(`ALTER TABLE "plans" ADD "feature_type" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "meaning" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "materials_per_course" integer`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "student_app_access" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "admin_logins" integer`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "certificates" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "analytics" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "branding" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "custom_domain" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "support_level" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "subdomain_included" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "save_percentage" character varying`);
        await queryRunner.query(`ALTER TABLE "plans" ADD "best_pick" boolean NOT NULL DEFAULT false`);

        /**
         * FIX renew_type ENUM (prevent NOT NULL error)
         */
        // Drop old column
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" DROP COLUMN "renew_type"`);

        // Create new ENUM type
        await queryRunner.query(`CREATE TYPE "public"."client_plan_subscriptions_renew_type_enum" AS ENUM('monthly', 'yearly')`);

        // Add column allowing NULL first
        await queryRunner.query(
            `ALTER TABLE "client_plan_subscriptions" ADD "renew_type" "public"."client_plan_subscriptions_renew_type_enum"`
        );

        // Populate existing rows with default value
        await queryRunner.query(
            `UPDATE "client_plan_subscriptions" SET "renew_type" = 'monthly' WHERE "renew_type" IS NULL`
        );

        // Now enforce NOT NULL
        await queryRunner.query(
            `ALTER TABLE "client_plan_subscriptions" ALTER COLUMN "renew_type" SET NOT NULL`
        );

        /**
         * FIX billing.status ENUM
         */
        await queryRunner.query(`ALTER TABLE "billing" DROP COLUMN "status"`);

        await queryRunner.query(`CREATE TYPE "public"."billing_status_enum" AS ENUM('paid', 'pending', 'failed')`);

        // Add nullable first
        await queryRunner.query(
            `ALTER TABLE "billing" ADD "status" "public"."billing_status_enum"`
        );

        // Populate with default
        await queryRunner.query(
            `UPDATE "billing" SET "status" = 'pending' WHERE "status" IS NULL`
        );

        // Enforce NOT NULL
        await queryRunner.query(
            `ALTER TABLE "billing" ALTER COLUMN "status" SET NOT NULL`
        );

        // Recreate foreign keys
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" ADD CONSTRAINT "FK_22e3184f3b422b516f34cc24511" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing" ADD CONSTRAINT "FK_8b9c9afe4a9be7063f580f006de" FOREIGN KEY ("subscription_id") REFERENCES "client_plan_subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse FKs
        await queryRunner.query(`ALTER TABLE "billing" DROP CONSTRAINT "FK_8b9c9afe4a9be7063f580f006de"`);
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" DROP CONSTRAINT "FK_22e3184f3b422b516f34cc24511"`);

        // Reverse billing.status ENUM
        await queryRunner.query(`ALTER TABLE "billing" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."billing_status_enum"`);
        await queryRunner.query(`ALTER TABLE "billing" ADD "status" character varying NOT NULL`);

        // Reverse renew_type ENUM
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" DROP COLUMN "renew_type"`);
        await queryRunner.query(`DROP TYPE "public"."client_plan_subscriptions_renew_type_enum"`);
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" ADD "renew_type" character varying NOT NULL`);

        // Reverse Plan Columns
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "best_pick"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "save_percentage"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "subdomain_included"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "support_level"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "custom_domain"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "branding"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "analytics"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "certificates"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "admin_logins"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "student_app_access"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "materials_per_course"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "meaning"`);
        await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "feature_type"`);

        // Re-add old foreign keys
        await queryRunner.query(`ALTER TABLE "billing" ADD CONSTRAINT "fk_billing_subscription" FOREIGN KEY ("subscription_id") REFERENCES "client_plan_subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "client_plan_subscriptions" ADD CONSTRAINT "fk_sub_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
}
