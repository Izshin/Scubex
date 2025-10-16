import React, { createContext, useContext } from 'react';
import RootStore from './RootStore';

const StoreContext = createContext<RootStore | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const rootStore = React.useMemo(() => new RootStore(), []);
  
  return (
    <StoreContext.Provider value={rootStore}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): RootStore => {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return store;
};

// Convenience hooks for individual stores
export const useSpeciesStore = () => useStore().speciesStore;
export const useMapStore = () => useStore().mapStore;