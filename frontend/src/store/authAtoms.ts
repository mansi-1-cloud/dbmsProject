import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { AuthUser } from '../types'; // Make sure this type is in your types/index.ts

// These atoms store the core auth data, persisting to localStorage
export const tokenAtom = atomWithStorage<string | null>('auth-token', null);
export const userAtom = atomWithStorage<AuthUser | null>('auth-user', null);

// This is a derived atom. It checks if both a user and token exist.
export const isAuthenticatedAtom = atom(
  (get) => !!get(tokenAtom) && !!get(userAtom)
);

// This "write-only" atom provides helper functions to update auth state
export const authActionAtom = atom(
  null, // This atom has no "read" value
  (_get, set, { user, token }: { user: AuthUser; token: string }) => {
    // This is the "login" function
    set(userAtom, user);
    set(tokenAtom, token);
  }
);

// This "write-only" atom provides the logout function
export const logoutAtom = atom(
  null,
  (_get, set) => {
    // This is the "logout" function
    set(userAtom, null);
    set(tokenAtom, null);
  }
);
