// useAppState: listen to React Native AppState changes (foreground/background)
import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useAppState = () => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => setAppState(nextState));
    return () => sub.remove();
  }, []);

  return { appState, isActive: appState === 'active', isBackground: appState === 'background' };
};
