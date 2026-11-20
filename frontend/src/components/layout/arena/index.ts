import type { Sport } from '@/types/domain';
import type { ArenaSceneFactory } from './types';
import { createPingPongScene } from './pingpong';
import { createPadelScene } from './padel';
import { createBadmintonScene } from './badminton';
import { createSquashScene } from './squash';

/** Scena areny dla każdej dyscypliny. */
export const ARENA_SCENES: Record<Sport, ArenaSceneFactory> = {
  pingpong: createPingPongScene,
  squash: createSquashScene,
  badminton: createBadmintonScene,
  padel: createPadelScene,
};
