import { MigrationInterface, QueryRunner } from 'typeorm';

export class Applications1790622595798 implements MigrationInterface {
  name = 'Applications1790622595798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "positions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "code" character varying(8) NOT NULL, "resolution_date" date, "title" character varying(255), "area" character varying(255), "deadline" date, "notes" text, CONSTRAINT "UQ_19292bd68cefaf79de24e585b97" UNIQUE ("user_id", "code"), CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4960bf74ea7fea6db05e53989d" ON "positions"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "application_requirement_documents" ("application_id" uuid NOT NULL, "document_id" uuid NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_c324ca1218b60b6740f92ab4c10" PRIMARY KEY ("application_id", "document_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c2aa0c9f1f741c22f8507b01a" ON "application_requirement_documents"  ("document_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "position_id" uuid NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'draft', "application_date" date, "expone" text NOT NULL, "solicita" text NOT NULL, CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e7594d5b474d9cbebba15c1ae" ON "applications"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d50e3eb557c28a4692e5ce3415" ON "applications"  ("position_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "application_merits" ("application_id" uuid NOT NULL, "merit_id" uuid NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_ff4a7fce9cea96fc5f9310357e8" PRIMARY KEY ("application_id", "merit_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca52141023fcd808ecd3d209a5" ON "application_merits"  ("merit_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "packages" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "application_id" uuid NOT NULL, "version" integer NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'queued', "progress" character varying(255), "storage_key" character varying(500), "size" integer, "page_count" integer, "layout" jsonb NOT NULL DEFAULT '[]', "errors" jsonb NOT NULL DEFAULT '[]', "warnings" jsonb NOT NULL DEFAULT '[]', "snapshot" jsonb, "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_f6e8eed931a67452e38a1839573" UNIQUE ("application_id", "version"), CONSTRAINT "PK_020801f620e21f943ead9311c98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de60df8c371a4c6774de6460c7" ON "packages"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b1e43f353f0a7ff1d8e70ffe4" ON "packages"  ("application_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "package_documents" ("package_id" uuid NOT NULL, "code" integer NOT NULL, "document_id" uuid, "block" smallint NOT NULL, "name" character varying(255) NOT NULL, "detail" text, "start_page" integer NOT NULL, "page_count" integer NOT NULL, "size" integer NOT NULL, CONSTRAINT "PK_692efbb39c94ec5325b10d173ad" PRIMARY KEY ("package_id", "code"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_14df660ad78a632804f04c43c4" ON "package_documents"  ("document_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" ADD CONSTRAINT "FK_4960bf74ea7fea6db05e53989da" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_requirement_documents" ADD CONSTRAINT "FK_71e8918152ff26ae12f0ca8a613" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_requirement_documents" ADD CONSTRAINT "FK_7c2aa0c9f1f741c22f8507b01a6" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_9e7594d5b474d9cbebba15c1ae7" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_d50e3eb557c28a4692e5ce3415f" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_merits" ADD CONSTRAINT "FK_8d5cd0b13657eb231e933c7e467" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_merits" ADD CONSTRAINT "FK_ca52141023fcd808ecd3d209a53" FOREIGN KEY ("merit_id") REFERENCES "merits"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "packages" ADD CONSTRAINT "FK_de60df8c371a4c6774de6460c76" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "packages" ADD CONSTRAINT "FK_3b1e43f353f0a7ff1d8e70ffe47" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_documents" ADD CONSTRAINT "FK_4db649ab8a2cb6848f075a785c6" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_documents" ADD CONSTRAINT "FK_14df660ad78a632804f04c43c40" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "package_documents" DROP CONSTRAINT "FK_14df660ad78a632804f04c43c40"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_documents" DROP CONSTRAINT "FK_4db649ab8a2cb6848f075a785c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "packages" DROP CONSTRAINT "FK_3b1e43f353f0a7ff1d8e70ffe47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "packages" DROP CONSTRAINT "FK_de60df8c371a4c6774de6460c76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_merits" DROP CONSTRAINT "FK_ca52141023fcd808ecd3d209a53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_merits" DROP CONSTRAINT "FK_8d5cd0b13657eb231e933c7e467"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_d50e3eb557c28a4692e5ce3415f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_9e7594d5b474d9cbebba15c1ae7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_requirement_documents" DROP CONSTRAINT "FK_7c2aa0c9f1f741c22f8507b01a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "application_requirement_documents" DROP CONSTRAINT "FK_71e8918152ff26ae12f0ca8a613"`,
    );
    await queryRunner.query(
      `ALTER TABLE "positions" DROP CONSTRAINT "FK_4960bf74ea7fea6db05e53989da"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_14df660ad78a632804f04c43c4"`);
    await queryRunner.query(`DROP TABLE "package_documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3b1e43f353f0a7ff1d8e70ffe4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_de60df8c371a4c6774de6460c7"`);
    await queryRunner.query(`DROP TABLE "packages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ca52141023fcd808ecd3d209a5"`);
    await queryRunner.query(`DROP TABLE "application_merits"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d50e3eb557c28a4692e5ce3415"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9e7594d5b474d9cbebba15c1ae"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7c2aa0c9f1f741c22f8507b01a"`);
    await queryRunner.query(`DROP TABLE "application_requirement_documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4960bf74ea7fea6db05e53989d"`);
    await queryRunner.query(`DROP TABLE "positions"`);
  }
}
