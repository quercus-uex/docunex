import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentsAndProfile1790605530003 implements MigrationInterface {
  name = 'DocumentsAndProfile1790605530003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "kind" character varying(32) NOT NULL DEFAULT 'other', "original_filename" character varying(255) NOT NULL, "original_mime" character varying(100) NOT NULL, "original_size" integer NOT NULL, "original_key" character varying(500) NOT NULL, "sha256" character(64) NOT NULL, "pdf_key" character varying(500), "pdf_size" integer, "page_count" integer, "issued_at" date, "status" character varying(16) NOT NULL DEFAULT 'processing', "error_message" text, CONSTRAINT "UQ_f1d220eaf8cce5905f97bc3e5aa" UNIQUE ("user_id", "sha256"), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7481daf5059307842edef74d7" ON "documents"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "degree_verifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "degree_name" character varying(255) NOT NULL, "code" text NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_ae4fa056d860f0469b5862f08d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ddbc011735fc2778af67d43b5" ON "degree_verifications"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "profiles" ("user_id" uuid NOT NULL, "last_names" character varying(150), "first_name" character varying(100), "dni" character varying(9), "birth_date" date, "address" character varying(255), "postal_code" character varying(5), "city" character varying(100), "province" character varying(100), "email" character varying(320), "phone" character varying(20), "degree" character varying(255), "id_document_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9e432b7df0d182f8d292902d1a2" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "FK_c7481daf5059307842edef74d73" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "degree_verifications" ADD CONSTRAINT "FK_6ddbc011735fc2778af67d43b54" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" ADD CONSTRAINT "FK_647a2bc248f485f24ff8a7a3dd9" FOREIGN KEY ("id_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_647a2bc248f485f24ff8a7a3dd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profiles" DROP CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "degree_verifications" DROP CONSTRAINT "FK_6ddbc011735fc2778af67d43b54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_c7481daf5059307842edef74d73"`,
    );
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ddbc011735fc2778af67d43b5"`);
    await queryRunner.query(`DROP TABLE "degree_verifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c7481daf5059307842edef74d7"`);
    await queryRunner.query(`DROP TABLE "documents"`);
  }
}
