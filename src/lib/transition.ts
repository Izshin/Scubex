import { createContext, useContext } from 'react';

export const TransitionContext = createContext({
  startWaveTransition: (_path: string) => { /* do nothing */ },
  wavePhase: 'none' as 'none' | 'rising' | 'falling',
});

export const useWaveTransition = () => useContext(TransitionContext);