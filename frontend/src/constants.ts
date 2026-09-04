// src/constants.ts
import type { Community, Member } from './types';

export const AVATAR_COLORS = [
  '#9F9DF3', '#FF9BB3', '#C9EBCA', '#FFD6A5', '#A5C8FF', '#F8B4D9', '#B5EAD7', '#FFDAC1',
];

// Empty list - real data loaded dynamically from backend & on-chain
export const DEMO_MEMBERS: Member[] = [];
export const DEMO_COMMUNITIES: Community[] = [];

// MIST per SUI (1 SUI = 1e9 MIST)
export const MIST_PER_SUI = 1_000_000_000n;

// Minimum split amount in MIST (0.001 SUI)
export const MIN_SPLIT_AMOUNT = 1_000_000n;
