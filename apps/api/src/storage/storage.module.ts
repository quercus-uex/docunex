import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  providers: [{ provide: StorageService, useClass: LocalStorageService }],
  exports: [StorageService],
})
export class StorageModule {}
