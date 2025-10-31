import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { 
  userAtom, 
  tokenAtom, 
  isAuthenticatedAtom, 
  authActionAtom, 
  logoutAtom 
} from '../store/authAtoms';
import { AuthUser } from '../types';

/**
 * A custom hook to provide auth state and actions.
 * This is the Jotai equivalent of your old useAuthStore.
 */
export const useAuth = () => {
  const [user, setUser] = useAtom(userAtom);
  const [token] = useAtom(tokenAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const setAuth = useSetAtom(authActionAtom);
  const logout = useSetAtom(logoutAtom);

  return {
    user,
    token,
    isAuthenticated,
    setUser, // For profile updates
    setAuth: (user: AuthUser, token: string) => setAuth({ user, token }),
    logout,
  };
};
