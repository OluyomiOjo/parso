import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// The intro shows once per phone, before the first sign-in.
const KEY = 'parso.introSeen';

type IntroState = { seen: boolean | null; markSeen: () => void }; // null while loading
const IntroContext = createContext<IntroState>({ seen: null, markSeen: () => undefined });

export function IntroProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((value) => setSeen(value === '1'))
      .catch(() => setSeen(true)); // if storage fails, go straight to sign-in rather than loop on the intro
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    AsyncStorage.setItem(KEY, '1').catch(() => undefined);
  }, []);

  return <IntroContext.Provider value={{ seen, markSeen }}>{children}</IntroContext.Provider>;
}

export const useIntro = () => useContext(IntroContext);
