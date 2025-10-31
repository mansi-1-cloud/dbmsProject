import { atomWithStorage } from 'jotai/utils';

/**
 * Theme atom that persists to localStorage.
 * Values: 'light' | 'dark'
 */
export const themeAtom = atomWithStorage<'light' | 'dark'>(
  'theme',
  'light'
);
