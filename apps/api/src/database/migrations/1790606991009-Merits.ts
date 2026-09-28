import { MigrationInterface, QueryRunner } from 'typeorm';

export class Merits1790606991009 implements MigrationInterface {
  name = 'Merits1790606991009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "merits" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "data" jsonb NOT NULL, "schema_version" integer NOT NULL, "cv_section" character varying(16) NOT NULL, "sort_date" date, "notes" text, CONSTRAINT "PK_368e2733a7a11b1abffb83cf9e8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9fac81a446334eba1006ea437b" ON "merits"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "merit_documents" ("merit_id" uuid NOT NULL, "document_id" uuid NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_abe74bf68b4fc94a86e5b07a93c" PRIMARY KEY ("merit_id", "document_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e55e7b851d1340991eff7c65f2" ON "merit_documents"  ("document_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "merits" ADD CONSTRAINT "FK_9fac81a446334eba1006ea437bb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merit_documents" ADD CONSTRAINT "FK_f35f878db58528a9594a0102706" FOREIGN KEY ("merit_id") REFERENCES "merits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "merit_documents" ADD CONSTRAINT "FK_e55e7b851d1340991eff7c65f2c" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "merit_documents" DROP CONSTRAINT "FK_e55e7b851d1340991eff7c65f2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merit_documents" DROP CONSTRAINT "FK_f35f878db58528a9594a0102706"`,
    );
    await queryRunner.query(
      `ALTER TABLE "merits" DROP CONSTRAINT "FK_9fac81a446334eba1006ea437bb"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_e55e7b851d1340991eff7c65f2"`);
    await queryRunner.query(`DROP TABLE "merit_documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9fac81a446334eba1006ea437b"`);
    await queryRunner.query(`DROP TABLE "merits"`);
  }
}
