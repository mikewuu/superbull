import { getQueueToken } from '@nestjs/bullmq';
import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Queue } from 'bullmq';
import { boardInstanceToken, boardQueuesToken } from './constants';
import type { BoardInstance, BoardQueueOptions } from './types';

@Module({})
export class BoardFeatureModule implements OnModuleInit {
  constructor(
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
    @Inject(boardQueuesToken) private readonly queues: BoardQueueOptions[],
    @Inject(boardInstanceToken) private readonly board: BoardInstance,
  ) {}

  public onModuleInit(): void {
    for (const queueOption of this.queues) {
      const queue = this.resolveQueue(queueOption);
      const queueAdapter = new queueOption.adapter(queue, queueOption.options);
      this.board.addQueue(queueAdapter);
    }
  }

  private resolveQueue(queueOption: BoardQueueOptions): Queue {
    if (queueOption.queue) {
      return queueOption.queue;
    }
    return this.moduleRef.get<Queue>(getQueueToken(queueOption.name), { strict: false });
  }
}
