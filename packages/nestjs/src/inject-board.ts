import { Inject } from '@nestjs/common';
import { boardInstanceToken } from './constants';

export const InjectBoard = (): ParameterDecorator => Inject(boardInstanceToken);
