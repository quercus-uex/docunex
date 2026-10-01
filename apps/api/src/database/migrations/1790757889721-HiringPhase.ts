import { MigrationInterface, QueryRunner } from 'typeorm';

export class HiringPhase1790757889721 implements MigrationInterface {
  name = 'HiringPhase1790757889721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "application_hiring_documents" ("application_id" uuid NOT NULL, "requirement" character varying(64) NOT NULL, "document_id" uuid NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_0a3e53b05505cb4035fd1ef1932" PRIMARY KEY ("application_id", "requirement", "document_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_85e5ed08ee91a0bf1e8d77f656" ON "application_hiring_documents"  ("document_id") `,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ADD "iban" character varying(34)`);
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD "social_security_number" character varying(12)`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" ADD "nationality" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "birth_place" character varying(150)`);
    await queryRunner.query(
      `ALTER TABLE "application_hiring_documents" ADD CONSTRAINT "FK_de4a1905a22cfc56232ab29f9b8" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_hiring_documents" ADD CONSTRAINT "FK_85e5ed08ee91a0bf1e8d77f6563" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "application_hiring_documents" DROP CONSTRAINT "FK_85e5ed08ee91a0bf1e8d77f6563"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_hiring_documents" DROP CONSTRAINT "FK_de4a1905a22cfc56232ab29f9b8"`,
    );
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "birth_place"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "nationality"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "social_security_number"`);
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "iban"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_85e5ed08ee91a0bf1e8d77f656"`);
    await queryRunner.query(`DROP TABLE "application_hiring_documents"`);
  }
}
