import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', mounted: false, toggleTheme: () => {} });

const STORAGE_KEY = 'fcm-theme';

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Class "dark" ishyirwa na script iri muri _document.js mbere yo gushushanya (nta flash).
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const applyTheme = useCallback((next) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage ishobora kuba itaboneka
    }
    setTheme(next);
  }, []);

  const toggleTheme = useCallback(
    () => applyTheme(theme === 'dark' ? 'light' : 'dark'),
    [theme, applyTheme]
  );

  const value = useMemo(() => ({ theme, mounted, toggleTheme }), [theme, mounted, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
