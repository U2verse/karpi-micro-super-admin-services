import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class AddEnrollmentInvitesTable1765030613974 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "enrollment_invites",
        columns: [
          {
            name: "id",
            type: "serial",
            isPrimary: true,
          },
          {
            name: "client_name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "email",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "whatsapp",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "plan_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "token",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "completed",
            type: "boolean",
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("enrollment_invites");
  }
}
