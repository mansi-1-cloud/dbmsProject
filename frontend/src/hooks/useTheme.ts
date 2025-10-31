import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { themeAtom } from '../store/atom';

export type Theme = 'light' | 'dark';

/**
 * Custom hook to manage theme state with localStorage persistence.
 */
export const useTheme = () => {
  const [theme, setTheme] = useAtom(themeAtom);

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement;
    console.log('[useTheme] Applying theme:', theme);
    console.log('[useTheme] Current classes before:', root.className);
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    console.log('[useTheme] Current classes after:', root.className);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('[useTheme] Toggling from', prev, 'to', newTheme);
      return newTheme;
    });
  };

  return { theme, setTheme, toggleTheme };
};
