import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToData } from '../firebase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [appData, setAppData] = useState({
    summary: {},
    players: [],
    playerNames: [],
    defaultMultiPlayers: [],
    deletedPlayers: [],
    history: [],
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToData((data) => {
      setAppData(data);
      setIsConnected(true);
      setIsLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    appData,
    isConnected,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppData must be used within AppProvider');
  }
  return context;
}
