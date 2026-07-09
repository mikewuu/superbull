import { type DynamicModule, Module } from '@nestjs/common';
import { BoardFeatureModule } from './board-feature-module';
import { BoardRootModule } from './board-root-module';
import { boardQueuesToken } from './constants';
import type { BoardModuleAsyncOptions, BoardModuleOptions, BoardQueueOptions } from './types';

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules are decorated classes with static forRoot/forFeature entry points
export class BoardModule {
  static forFeature(...queues: BoardQueueOptions[]): DynamicModule {
    return {
      module: BoardFeatureModule,
      providers: [{ provide: boardQueuesToken, useValue: queues }],
    };
  }

  static forRoot(options: BoardModuleOptions): DynamicModule {
    return {
      module: BoardModule,
      imports: [BoardRootModule.forRoot(options)],
      exports: [BoardRootModule],
    };
  }

  static forRootAsync(options: BoardModuleAsyncOptions): DynamicModule {
    return {
      module: BoardModule,
      imports: [BoardRootModule.forRootAsync(options)],
      exports: [BoardRootModule],
    };
  }
}
