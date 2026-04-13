import { createContext, useContext } from 'react';

export type TransitionSpeed = 'normal' | 'fast' | 'none';

export const TransitionContext = createContext({
  startWaveTransition: (_path: string, _state?: Record<string, unknown>) => { /* do nothing */ },
  wavePhase: 'none' as 'none' | 'rising' | 'falling',
  transitionSpeed: 'normal' as TransitionSpeed,
  setTransitionSpeed: (_v: TransitionSpeed) => { /* do nothing */ },
});

export const useWaveTransition = () => useContext(TransitionContext);