import { MigrationInterface, QueryRunner } from 'typeorm';

export class Registry1790624635828 implements MigrationInterface {
  name = 'Registry1790624635828';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "registry_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "application_id" uuid NOT NULL, "number" character varying(100) NOT NULL, "registered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "parent_id" uuid, "package_id" uuid NOT NULL, "notes" text, CONSTRAINT "PK_6a5b6dbbb7ded79810b7d86e097" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7b58bad01724dab7cbaecbcfe3" ON "registry_entries"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a77ce18ddf0a25f70e1bbaf50e" ON "registry_entries"  ("application_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9653bbd0ba6c6829417128dd2d" ON "registry_entries"  ("package_id") `,
    );
    await queryRunner.query(`ALTER TABLE "package_documents" ADD "original_size" integer`);
    await queryRunner.query(
      `ALTER TABLE "registry_entries" ADD CONSTRAINT "FK_7b58bad01724dab7cbaecbcfe32" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" ADD CONSTRAINT "FK_a77ce18ddf0a25f70e1bbaf50e9" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" ADD CONSTRAINT "FK_a948cb25726864c3206f6e29fee" FOREIGN KEY ("parent_id") REFERENCES "registry_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" ADD CONSTRAINT "FK_9653bbd0ba6c6829417128dd2db" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registry_entries" DROP CONSTRAINT "FK_9653bbd0ba6c6829417128dd2db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" DROP CONSTRAINT "FK_a948cb25726864c3206f6e29fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" DROP CONSTRAINT "FK_a77ce18ddf0a25f70e1bbaf50e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registry_entries" DROP CONSTRAINT "FK_7b58bad01724dab7cbaecbcfe32"`,
    );
    await queryRunner.query(`ALTER TABLE "package_documents" DROP COLUMN "original_size"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9653bbd0ba6c6829417128dd2d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a77ce18ddf0a25f70e1bbaf50e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7b58bad01724dab7cbaecbcfe3"`);
    await queryRunner.query(`DROP TABLE "registry_entries"`);
  }
}
