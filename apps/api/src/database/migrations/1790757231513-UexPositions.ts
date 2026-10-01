import { MigrationInterface, QueryRunner } from 'typeorm';

export class UexPositions1790757231513 implements MigrationInterface {
  name = 'UexPositions1790757231513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "positions" ADD "department" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "positions" ADD "center" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "positions" ADD "uex_status" jsonb`);
    await queryRunner.query(`ALTER TABLE "profiles" ADD "department" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profiles" DROP COLUMN "department"`);
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "uex_status"`);
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "center"`);
    await queryRunner.query(`ALTER TABLE "positions" DROP COLUMN "department"`);
  }
}
